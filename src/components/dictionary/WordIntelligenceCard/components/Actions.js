/**
 * WordIntelligenceCard - Actions & SRS
 * Audio pronunciation, quick export, SRS section, definitions, lookup path
 */

import React, { memo, useState, useEffect, useCallback, useMemo } from 'react';
import { SOURCE_CATEGORIES, HEBREW_DIALECTS } from '../constants';
import { getCard, createCard, getStats, getMasteryLevel } from '../../../../services/srsService';
import { QuickReviewButtons } from '../../ProScholarFeatures';
import { cleanHebrewWord } from '../../../../utils/hebrewUtils';

// =============================================================================
// LOOKUP PATH DISPLAY
// =============================================================================

export const LookupPathDisplay = memo(function LookupPathDisplay({ lookupPath, sourceCategory }) {
  if (!lookupPath) return null;

  const category = SOURCE_CATEGORIES[sourceCategory] || SOURCE_CATEGORIES.dictionary;
  const isDictionaryHit = lookupPath.includes('dictionary-hit');

  return (
    <div className={`wic-lookup-path ${isDictionaryHit ? 'dictionary-hit' : 'pattern-analysis'}`}>
      <div className="lookup-path-header">
        <span className="lookup-path-icon">{category.icon}</span>
        <span className="lookup-path-title">Source: {category.label}</span>
      </div>
      <div className="lookup-path-steps">
        {isDictionaryHit ? (
          <span className="path-step success">
            <span className="path-step-icon">✓</span>
            Dictionary Hit
          </span>
        ) : (
          <>
            <span className="path-step">Dictionary</span>
            <span className="path-arrow">→</span>
            <span className="path-step fallback">
              <span className="path-step-icon">🔬</span>
              Pattern Analysis
            </span>
          </>
        )}
      </div>
    </div>
  );
});

// =============================================================================
// AUDIO PRONUNCIATION
// =============================================================================

export const AudioPronunciation = memo(function AudioPronunciation({ word }) {
  const [playing, setPlaying] = useState(false);
  const [dialect, setDialect] = useState(HEBREW_DIALECTS[0].key);
  const [showHint, setShowHint] = useState(false);

  const dialectSettings = useMemo(() => ({
    modern: { rate: 0.85, pitch: 1.0, hint: 'Modern Israeli pronunciation' },
    sephardi: { rate: 0.75, pitch: 0.95, hint: 'Sephardi: Emphasize gutturals (ח, ע)' },
    ashkenazi: { rate: 0.7, pitch: 1.05, hint: 'Ashkenazi: "ת" as "s", "ע" silent' },
  }), []);

  const handlePlay = useCallback(() => {
    if (playing || !word) return;

    if ('speechSynthesis' in window) {
      setPlaying(true);
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'he-IL';

      const settings = dialectSettings[dialect] || dialectSettings.modern;
      utterance.rate = settings.rate;
      utterance.pitch = settings.pitch;

      const voices = speechSynthesis.getVoices();
      const hebrewVoice = voices.find(v => v.lang.startsWith('he'));
      if (hebrewVoice) {
        utterance.voice = hebrewVoice;
      }

      utterance.onend = () => setPlaying(false);
      utterance.onerror = () => setPlaying(false);

      speechSynthesis.speak(utterance);
    }
  }, [word, playing, dialect, dialectSettings]);

  const currentDialect = HEBREW_DIALECTS.find(d => d.key === dialect);
  const currentHint = dialectSettings[dialect]?.hint;

  return (
    <div className="wic-audio">
      <button
        className={`audio-play-btn ${playing ? 'playing' : ''}`}
        onClick={handlePlay}
        disabled={playing}
        title={`Hear pronunciation (${currentDialect?.label || 'Modern'})`}
      >
        <span className="audio-icon">{playing ? '🔊' : '🔈'}</span>
        <span className="audio-text">{playing ? 'Playing...' : 'Listen'}</span>
      </button>
      <div className="dialect-selector">
        {HEBREW_DIALECTS.map(({ key, label, icon }) => (
          <button
            key={key}
            className={`dialect-btn ${dialect === key ? 'active' : ''}`}
            onClick={() => {
              setDialect(key);
              setShowHint(true);
              setTimeout(() => setShowHint(false), 2000);
            }}
            title={`${label} pronunciation`}
          >
            {icon}
          </button>
        ))}
      </div>
      {showHint && currentHint && (
        <div className="dialect-hint">{currentHint}</div>
      )}
    </div>
  );
});

// =============================================================================
// QUICK EXPORT
// =============================================================================

export const QuickExport = memo(function QuickExport({ data }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    if (!data) return;

    const markdown = `## ${data.word}
**Root:** ${data.root || 'Unknown'}
**Language:** ${data.language || 'Hebrew'}

### Definition
${data.primaryDefinition || 'No definition'}

${data.rootAnalysis?.pattern ? `### Grammar
- **Pattern:** ${data.rootAnalysis.pattern}
- **Confidence:** ${data.rootAnalysis.confidence || '?'}%
` : ''}
${data.rootData?.etymology ? `### Etymology
- **Proto-Semitic:** ${data.rootData.etymology}
${data.rootData.cognates ? Object.entries(data.rootData.cognates).map(([lang, word]) => `- **${lang}:** ${word}`).join('\n') : ''}
` : ''}
---
*Exported from Torah Reader Pro Scholar*`;

    navigator.clipboard.writeText(markdown).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [data]);

  return (
    <button
      className={`wic-export-btn ${copied ? 'copied' : ''}`}
      onClick={handleCopy}
      title="Copy as markdown"
    >
      <span className="export-icon">{copied ? '✓' : '📋'}</span>
      <span className="export-text">{copied ? 'Copied!' : 'Export'}</span>
    </button>
  );
});

// =============================================================================
// SRS SECTION
// =============================================================================

const getCardId = (word) => `vocab-${cleanHebrewWord(word)}`;

export const SRSSection = memo(function SRSSection({ word, definition, root, onUpdate }) {
  const [srsCard, setSrsCard] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [showRatings, setShowRatings] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    const existing = getCard?.(getCardId(word));
    setSrsCard(existing);
    setShowRatings(false);
    setFeedback(null);
  }, [word]);

  const handleAddToSRS = useCallback(() => {
    if (isAdding || !createCard) return;
    setIsAdding(true);

    const newCard = createCard(getCardId(word), word, definition || 'Unknown', {
      type: 'vocabulary',
      hebrewRoot: root,
      source: 'WordIntelligenceCard'
    });

    setSrsCard(newCard);
    setIsAdding(false);
    onUpdate?.();
  }, [word, definition, root, isAdding, onUpdate]);

  const handleQuickReview = useCallback((quality) => {
    if (!srsCard) return;
    try {
      const srsService = require('../../../../services/srsService');
      const updated = srsService.processReview?.(getCardId(word), quality);
      if (updated) {
        setSrsCard(updated);
        setShowRatings(false);
        setFeedback(`✓ Next in ${updated.interval}d`);
        setTimeout(() => setFeedback(null), 2500);
        onUpdate?.();
      }
    } catch (e) {
      console.debug('[SRSSection] Review failed:', e);
    }
  }, [word, srsCard, onUpdate]);

  const stats = getStats?.() || { total: 0, retention: 0 };

  if (srsCard) {
    const mastery = getMasteryLevel(srsCard);
    const nextReviewDate = srsCard.nextReview
      ? new Date(srsCard.nextReview).toLocaleDateString()
      : 'Now';
    const isDue = !srsCard.nextReview || new Date(srsCard.nextReview) <= new Date();

    return (
      <div className={`wic-srs in-srs ${mastery.level}`}>
        <div className="srs-header">
          <div className="srs-status">
            <span className="srs-icon">{mastery.icon}</span>
            <span className="srs-level">{mastery.level}</span>
          </div>
          {isDue && !feedback && (
            <button className="srs-review-btn" onClick={() => setShowRatings(!showRatings)}>
              {showRatings ? '✕' : '📝'}
            </button>
          )}
        </div>
        {showRatings && (
          <QuickReviewButtons
            onReview={handleQuickReview}
            compact={true}
            showLabels={false}
          />
        )}
        {feedback && <div className="srs-feedback">{feedback}</div>}
        <div className="srs-meta">
          <span>Interval: {srsCard.interval}d</span>
          <span>Next: {nextReviewDate}</span>
        </div>
        <div className="srs-stats">
          <span>{srsCard.repetitions} reviews</span>
          <span>Ease: {Math.round(srsCard.easeFactor * 100)}%</span>
        </div>
      </div>
    );
  }

  return (
    <div className="wic-srs not-in-srs">
      <button className="srs-add-btn" onClick={handleAddToSRS} disabled={isAdding}>
        <span className="srs-icon">➕</span>
        <span className="srs-text">Add to SRS</span>
      </button>
      <span className="srs-hint">{stats.total} words • {stats.retention}% retention</span>
    </div>
  );
});
