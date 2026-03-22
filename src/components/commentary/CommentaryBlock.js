import React, { useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { removeHtmlTags } from '../../utils/sanitize';
import { getStoredApiKey } from '../../services/groqService';
import { getCommentaryIcon } from '../../config/commentaryConfig';
import { getSourceCredibility, getCredibilityBadge } from '../../services/sourceCredibilityService';
import ClickableText from '../core/ClickableText';
import CommentarySummary from './CommentarySummary';
import WordGlossary from '../dictionary/WordGlossary';
import InterlinearText from '../dictionary/InterlinearText';
import './CommentaryBlock.css';

// PRO SCHOLAR V6: Lazy-loaded rabbi biographical info panel
const RabbiInfoPanel = lazy(() => import('../scholar-mode/RabbiInfoPanel'));

/**
 * CommentaryGroup - Displays a group of commentaries from a single source
 */
export const CommentaryGroup = React.memo(({
  commentaries,
  source,
  showClickableText = true,
  verse = '',
  reference = null // PRO SCHOLAR V3: For context-aware lookups
}) => {
  const [showTranslation, setShowTranslation] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showGlossary, setShowGlossary] = useState(false);
  const [showInterlinear, setShowInterlinear] = useState(false);
  const [showRabbiInfo, setShowRabbiInfo] = useState(false);
  // PRO SCHOLAR V6: Track which rabbi to display (allows navigation to teachers/students)
  const [displayedRabbi, setDisplayedRabbi] = useState(source);
  const hebrewCommentaries = commentaries.filter(c => c.language === 'hebrew');
  const englishCommentaries = commentaries.filter(c => c.language === 'english');

  // Check if we have Hebrew but no English (need glossary/interlinear option)
  const hasHebrewOnly = hebrewCommentaries.length > 0 && englishCommentaries.length === 0;
  const icon = getCommentaryIcon(source);
  const hasApiKey = !!getStoredApiKey();

  // Get source credibility for trust badge (with null check)
  const credibility = useMemo(() => getSourceCredibility(source), [source]);
  const badge = useMemo(() => {
    if (!credibility || credibility.overallScore === undefined) {
      return { label: 'Unknown', color: '#6b7280', icon: '❓' };
    }
    return getCredibilityBadge(credibility.overallScore);
  }, [credibility]);

  // Get combined text for summarization
  const getCommentaryText = useCallback(() => {
    const hebrewText = hebrewCommentaries.map(c => removeHtmlTags(c.text)).join('\n\n');
    const englishText = englishCommentaries.map(c => removeHtmlTags(c.text)).join('\n\n');
    return englishText || hebrewText; // Prefer English for summarization
  }, [hebrewCommentaries, englishCommentaries]);

  return (
    <div className="commentary-source-group">
      <div className="commentary-header">
        <div className="commentary-source">
          <span className="source-icon">{icon}</span>
          <button
            className={`source-name source-name-btn ${showRabbiInfo ? 'active' : ''}`}
            onClick={() => setShowRabbiInfo(!showRabbiInfo)}
            title={`Click to learn about ${source}`}
          >
            {source}
            <span className="source-info-icon">ℹ️</span>
          </button>
          {credibility.overallScore >= 75 && (
            <span
              className="credibility-badge"
              style={{ color: badge.color }}
              title={`${badge.label} - ${credibility.categoryInfo?.description || ''} (${credibility.dates || ''})`}
            >
              {badge.icon}
            </span>
          )}
        </div>
        <div className="commentary-actions">
          {hasApiKey && hebrewCommentaries.length + englishCommentaries.length > 0 && (
            <button
              className={`ai-summary-toggle ${showSummary ? 'active' : ''}`}
              onClick={() => setShowSummary(!showSummary)}
              title={showSummary ? 'Hide AI summary' : 'Generate AI summary with diagram'}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              {showSummary ? 'Hide AI' : 'Summarize'}
            </button>
          )}
          {/* Only show Translate button if English translations exist from Sefaria */}
          {hebrewCommentaries.length > 0 && englishCommentaries.length > 0 && (
            <button
              className={`translate-toggle ${showTranslation ? 'active' : ''}`}
              onClick={() => setShowTranslation(!showTranslation)}
              title={showTranslation ? 'Hide translation' : 'Show translation'}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
              </svg>
              {showTranslation ? 'Hide' : 'Translate'}
            </button>
          )}
          {/* Show Glossary button when Hebrew exists but no English translation */}
          {hasHebrewOnly && (
            <button
              className={`glossary-toggle ${showGlossary ? 'active' : ''}`}
              onClick={() => { setShowGlossary(!showGlossary); setShowInterlinear(false); }}
              title={showGlossary ? 'Hide word definitions' : 'Show word definitions'}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              {showGlossary ? 'Hide' : 'Glossary'}
            </button>
          )}
          {/* Show Interlinear button when Hebrew exists but no English translation */}
          {hasHebrewOnly && (
            <button
              className={`interlinear-toggle ${showInterlinear ? 'active' : ''}`}
              onClick={() => { setShowInterlinear(!showInterlinear); setShowGlossary(false); }}
              title={showInterlinear ? 'Hide interlinear view' : 'Show word-by-word translation'}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              {showInterlinear ? 'Hide' : 'Interlinear'}
            </button>
          )}
        </div>
      </div>

      {/* PRO SCHOLAR V6: Rabbi Biographical Info Panel */}
      {showRabbiInfo && (
        <div className="rabbi-info-section">
          <Suspense fallback={<div className="rabbi-loading">Loading biographical info...</div>}>
            <RabbiInfoPanel
              rabbiName={displayedRabbi}
              onClose={() => {
                setShowRabbiInfo(false);
                setDisplayedRabbi(source); // Reset to original source
              }}
              onNavigate={(name) => {
                // PRO SCHOLAR V6: Navigate to teacher/student biography
                setDisplayedRabbi(name);
              }}
              compact={true}
            />
            {/* Back button when viewing a different rabbi */}
            {displayedRabbi !== source && (
              <button
                className="rabbi-back-btn"
                onClick={() => setDisplayedRabbi(source)}
                type="button"
              >
                ← Back to {source}
              </button>
            )}
          </Suspense>
        </div>
      )}

      {/* AI Summary Section */}
      {showSummary && (
        <CommentarySummary
          commentaryText={getCommentaryText()}
          source={source}
          verse={verse}
          onClose={() => setShowSummary(false)}
        />
      )}

      {/* Word Glossary Section - shows word definitions when no English translation */}
      {showGlossary && hasHebrewOnly && (
        <div className="glossary-section">
          <WordGlossary
            text={hebrewCommentaries.map(c => removeHtmlTags(c.text)).join(' ')}
            onClose={() => setShowGlossary(false)}
          />
        </div>
      )}

      {/* Interlinear Section - shows word-by-word translation with mastery tracking */}
      {showInterlinear && hasHebrewOnly && (
        <div className="interlinear-section">
          <InterlinearText
            text={hebrewCommentaries.map(c => removeHtmlTags(c.text)).join(' ')}
          />
        </div>
      )}

      <div className="commentary-body">
        {hebrewCommentaries.map((commentary, index) => (
          <div key={`he-${index}`} className="commentary-entry">
            {showClickableText ? (
              <ClickableText
                language="hebrew"
                text={removeHtmlTags(commentary.text, ['i', 'sup'])}
                className="commentary-text hebrew-commentary"
                reference={reference || `${source} on ${verse}`}
              />
            ) : (
              <div className="commentary-text hebrew-commentary" dir="rtl" lang="he">
                {removeHtmlTags(commentary.text, ['i', 'sup'])}
              </div>
            )}
            {showTranslation && englishCommentaries[index]?.text && (
              <div className="commentary-text english-translation slide-down">
                {removeHtmlTags(englishCommentaries[index].text)}
              </div>
            )}
          </div>
        ))}
        {englishCommentaries.map((commentary, index) => (
          <div key={`en-${index}`} className="commentary-entry">
            <div className="commentary-text english-text" lang="en">
              {removeHtmlTags(commentary.text)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

/**
 * CommentaryContent - Container that groups commentaries by source
 */
export const CommentaryContent = React.memo(({ commentaries, verse = '', reference = null }) => {
  const groupedSources = useMemo(() => {
    const grouped = {};
    commentaries.forEach(c => {
      if (!grouped[c.source]) grouped[c.source] = [];
      grouped[c.source].push(c);
    });
    return Object.keys(grouped).sort().map(source => ({
      source,
      commentaries: grouped[source]
    }));
  }, [commentaries]);

  return (
    <div className="commentary-content">
      {groupedSources.map(({ source, commentaries }) => (
        <CommentaryGroup
          key={source}
          source={source}
          commentaries={commentaries}
          verse={verse}
          reference={reference}
        />
      ))}
    </div>
  );
});

export default CommentaryContent;
