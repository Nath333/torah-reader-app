import React, { useState, useCallback, useMemo, useEffect } from 'react';
import './StudyVerse.css';
import ClickableText from './ClickableText';
import { renderWithHebrewSpans, hasAnnotationMarkup } from '../utils/sanitize';
import { translateWithSource } from '../services/englishToFrenchService';
import { AnnotatedTranslationInline } from './AnnotatedTranslation';

// Safe text renderer that properly displays <span dir="rtl"> for Hebrew
const SafeText = ({ text, className, lang }) => {
  const parts = useMemo(() => renderWithHebrewSpans(text), [text]);

  return (
    <span className={className} lang={lang}>
      {parts.map((part, index) =>
        typeof part === 'object' && part.type === 'hebrew-span'
          ? <span key={part.key} dir="rtl" className="inline-hebrew">{part.content}</span>
          : <span key={index}>{part}</span>
      )}
    </span>
  );
};

// =============================================================================
// PROFESSIONAL JEWISH STUDY TOOL - StudyVerse Component
// Scholarly interface with source references and academic citations
// =============================================================================

// =============================================================================
// SOURCE INFO ICONS - Professional icons for different sources
// =============================================================================
const SourceIcons = {
  sefaria: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="source-icon">
      <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  dictionary: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="source-icon">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
      <path d="M8 7h8M8 11h8M8 15h4" />
    </svg>
  ),
  api: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="source-icon">
      <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  ),
  rashi: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="source-icon">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
      <path d="M9 12v2M15 12v2" />
    </svg>
  ),
  targum: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="source-icon">
      <path d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10" />
    </svg>
  ),
  verified: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="source-icon verified">
      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
};

// Detailed Source Info Card Component
const SourceInfoCard = React.memo(({
  source,
  method,
  accuracy,
  wordsMatched,
  showDetails = false,
  onToggleDetails
}) => {
  const getSourceIcon = () => {
    if (source?.toLowerCase().includes('sefaria')) return SourceIcons.sefaria;
    if (source?.toLowerCase().includes('dictionary')) return SourceIcons.dictionary;
    if (source?.toLowerCase().includes('api') || source?.toLowerCase().includes('mymemory')) return SourceIcons.api;
    return SourceIcons.dictionary;
  };

  const getAccuracyDetails = () => {
    switch (accuracy) {
      case 'high': return { icon: '✓', label: 'Précision Élevée', desc: 'Tous les mots trouvés dans le dictionnaire', color: 'green' };
      case 'medium': return { icon: '~', label: 'Précision Moyenne', desc: '70%+ des mots traduits', color: 'amber' };
      case 'auto': return { icon: '⚡', label: 'Traduction Auto', desc: 'API de traduction automatique', color: 'blue' };
      case 'partial': return { icon: '○', label: 'Partielle', desc: 'Traduction incomplète', color: 'gray' };
      default: return { icon: '•', label: 'Inconnu', desc: '', color: 'gray' };
    }
  };

  const accuracyInfo = getAccuracyDetails();

  return (
    <div className={`source-info-card ${showDetails ? 'expanded' : ''}`}>
      <div className="source-card-header" onClick={onToggleDetails}>
        <div className="source-card-icon">{getSourceIcon()}</div>
        <div className="source-card-main">
          <span className="source-card-name">{source}</span>
          {method && <span className="source-card-method">{method}</span>}
        </div>
        <div className={`source-card-accuracy ${accuracyInfo.color}`}>
          <span className="accuracy-icon">{accuracyInfo.icon}</span>
          <span className="accuracy-label">{accuracyInfo.label}</span>
        </div>
        {onToggleDetails && (
          <button className="source-card-toggle" aria-label="Toggle details">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d={showDetails ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"} />
            </svg>
          </button>
        )}
      </div>
      {showDetails && (
        <div className="source-card-details">
          <div className="detail-row">
            <span className="detail-label">Source:</span>
            <span className="detail-value">{source}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Direction:</span>
            <span className="detail-value">{method}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Précision:</span>
            <span className={`detail-value accuracy-${accuracyInfo.color}`}>
              {accuracyInfo.label}
            </span>
          </div>
          {wordsMatched && wordsMatched !== 'N/A' && (
            <div className="detail-row">
              <span className="detail-label">Mots traduits:</span>
              <span className="detail-value">{wordsMatched}</span>
            </div>
          )}
          <div className="detail-row description">
            <span className="detail-desc">{accuracyInfo.desc}</span>
          </div>
        </div>
      )}
    </div>
  );
});

// Language Badge with Flag
const LanguageBadge = React.memo(({ language, size = 'normal' }) => {
  const config = {
    hebrew: { code: 'HE', label: 'עברית', flag: '🇮🇱', color: 'purple' },
    english: { code: 'EN', label: 'English', flag: '🇬🇧', color: 'green' },
    french: { code: 'FR', label: 'Français', flag: '🇫🇷', color: 'blue' },
    aramaic: { code: 'AR', label: 'ארמית', flag: '📜', color: 'amber' }
  };

  const lang = config[language] || config.english;

  return (
    <div className={`language-badge ${lang.color} ${size}`}>
      <span className="lang-flag">{lang.flag}</span>
      <span className="lang-code">{lang.code}</span>
      <span className="lang-name">{lang.label}</span>
    </div>
  );
});

// Source Reference Badge Component (simplified version)
const SourceBadge = React.memo(({ source, method, accuracy, className = '' }) => {
  const getAccuracyIcon = () => {
    switch (accuracy) {
      case 'high': return '✓';
      case 'medium': return '~';
      case 'auto': return '⚡';
      case 'partial': return '○';
      default: return '•';
    }
  };

  const getAccuracyLabel = () => {
    switch (accuracy) {
      case 'high': return 'Précis';
      case 'medium': return 'Moyen';
      case 'auto': return 'Auto';
      case 'partial': return 'Partiel';
      default: return '';
    }
  };

  return (
    <div className={`source-reference ${className}`}>
      <span className="source-name">{source}</span>
      {method && <span className="source-method">({method})</span>}
      {accuracy && accuracy !== 'none' && (
        <span className={`accuracy-indicator ${accuracy}`}>
          {getAccuracyIcon()} {getAccuracyLabel()}
        </span>
      )}
    </div>
  );
});

// Scholarly Citation Component
const Citation = React.memo(({ book, chapter, verse, source, date }) => (
  <div className="scholarly-citation">
    <span className="citation-ref">{book} {chapter}:{verse}</span>
    <span className="citation-source">— {source}</span>
    {date && <span className="citation-date">[{date}]</span>}
  </div>
));

// Enhanced Translation Block with Source Reference and Expandable Details
// Bold text = direct translation of Hebrew/Aramaic words
const TranslationBlock = React.memo(({
  text,
  rawHtml,  // Raw HTML with <b>/<strong> tags for annotated display
  language,
  source,
  method,
  accuracy,
  wordsMatched,
  label,
  loading = false
}) => {
  const [showSourceDetails, setShowSourceDetails] = useState(false);
  const langCode = language === 'english' ? 'en' : language === 'french' ? 'fr' : 'he';

  // Check if we have annotated content to display
  const useAnnotated = rawHtml && hasAnnotationMarkup(rawHtml);

  return (
    <div className={`translation-block ${language} enhanced`}>
      <div className="translation-header enhanced">
        <div className="header-left">
          <LanguageBadge language={language} size="normal" />
          {label && <span className="translation-label">{label}</span>}
        </div>
        {source && (
          <div className="header-right">
            <button
              className="source-toggle-btn"
              onClick={() => setShowSourceDetails(!showSourceDetails)}
              title="Afficher les détails de la source"
            >
              <span className="source-preview">
                {SourceIcons[source?.toLowerCase().includes('sefaria') ? 'sefaria' :
                             source?.toLowerCase().includes('dictionary') ? 'dictionary' : 'api']}
                <span className="source-name-short">{source?.split(' ')[0]}</span>
              </span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="toggle-chevron">
                <path d={showSourceDetails ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"} />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Expandable Source Details */}
      {showSourceDetails && source && (
        <SourceInfoCard
          source={source}
          method={method}
          accuracy={accuracy}
          wordsMatched={wordsMatched}
          showDetails={true}
        />
      )}

      <div className="translation-content enhanced">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <span className="loading-text">Chargement de la traduction...</span>
          </div>
        ) : (
          <p className="translation-text" lang={langCode}>
            {useAnnotated ? (
              <AnnotatedTranslationInline text={rawHtml} language={langCode} />
            ) : (
              <SafeText text={text} lang={langCode} />
            )}
          </p>
        )}
      </div>

      {/* Quick accuracy indicator */}
      {accuracy && accuracy !== 'none' && !showSourceDetails && (
        <div className="translation-footer">
          <span className={`accuracy-pill ${accuracy}`}>
            {accuracy === 'high' ? '✓ Haute précision' :
             accuracy === 'medium' ? '~ Précision moyenne' :
             accuracy === 'auto' ? '⚡ Traduction automatique' : '○ Partielle'}
          </span>
          {method && <span className="method-indicator">{method}</span>}
        </div>
      )}
    </div>
  );
});

// Enhanced Dibbur Translation component with flags and source tracking
const DiburTranslation = React.memo(({ englishText, hebrewDibbur }) => {
  const [frenchData, setFrenchData] = useState({ translation: '', source: '', accuracy: '' });
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Extract English translation from the opening pattern
  const englishTrans = useMemo(() => {
    if (!englishText) return null;
    const capsMatch = englishText.match(/^[^\s]+ ([A-Z][A-Z\s]+)(?:\s*[-\u2013\u2014]|\s+[a-z])/);
    if (capsMatch) return capsMatch[1].trim();
    const beforeDash = englishText.split(/\s*[-\u2013\u2014]\s*/)[0];
    if (beforeDash && beforeDash.length < 50) {
      const englishOnly = beforeDash.replace(/[\u0590-\u05FF]/g, '').trim();
      if (englishOnly) return englishOnly.toUpperCase();
    }
    return null;
  }, [englishText]);

  useEffect(() => {
    if (englishTrans) {
      setLoading(true);
      translateWithSource(englishTrans).then(result => {
        if (result && result.translation) {
          setFrenchData({
            translation: result.translation.toUpperCase(),
            source: result.source,
            accuracy: result.accuracy,
            method: result.method,
            wordsMatched: result.wordsMatched
          });
        }
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [englishTrans]);

  if (!englishTrans) return null;

  return (
    <div className="dibbur-translations scholarly enhanced">
      <div className="dibbur-trans-header">
        <span className="dibbur-trans-title">Traductions du Dibbur</span>
        <button
          className="details-toggle-mini"
          onClick={() => setShowDetails(!showDetails)}
          title="Afficher les sources"
        >
          {showDetails ? '−' : '+'}
        </button>
      </div>

      {/* English Translation */}
      <div className="dibbur-trans-row enhanced">
        <div className="trans-lang-container">
          <span className="trans-flag">🇬🇧</span>
          <span className="trans-lang-badge en">EN</span>
        </div>
        <span className="trans-text enhanced">{englishTrans}</span>
        <div className="trans-source-container">
          {SourceIcons.sefaria}
          <span className="trans-source">Sefaria</span>
          <span className="trans-verified">✓</span>
        </div>
      </div>

      {/* French Translation */}
      {(frenchData.translation || loading) && (
        <div className="dibbur-trans-row enhanced">
          <div className="trans-lang-container">
            <span className="trans-flag">🇫🇷</span>
            <span className="trans-lang-badge fr">FR</span>
          </div>
          {loading ? (
            <div className="trans-loading">
              <div className="mini-spinner"></div>
              <span className="trans-text loading">Traduction en cours...</span>
            </div>
          ) : (
            <>
              <span className="trans-text enhanced">
                <SafeText text={frenchData.translation} lang="fr" />
              </span>
              <div className="trans-source-container">
                {frenchData.source?.includes('Dictionary') ? SourceIcons.dictionary : SourceIcons.api}
                <span className="trans-source">{frenchData.source?.split(' ')[0]}</span>
                {frenchData.accuracy && (
                  <span className={`trans-accuracy-badge ${frenchData.accuracy}`}>
                    {frenchData.accuracy === 'high' ? '✓' :
                     frenchData.accuracy === 'medium' ? '~' :
                     frenchData.accuracy === 'auto' ? '⚡' : '○'}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Expandable Source Details */}
      {showDetails && frenchData.source && (
        <div className="dibbur-source-details">
          <div className="source-detail-row">
            <span className="detail-icon">📚</span>
            <span className="detail-label">Source EN:</span>
            <span className="detail-value">Sefaria.org - Academic Translation</span>
          </div>
          <div className="source-detail-row">
            <span className="detail-icon">🔄</span>
            <span className="detail-label">Source FR:</span>
            <span className="detail-value">{frenchData.source}</span>
          </div>
          {frenchData.method && (
            <div className="source-detail-row">
              <span className="detail-icon">➡️</span>
              <span className="detail-label">Direction:</span>
              <span className="detail-value">{frenchData.method}</span>
            </div>
          )}
          <div className="source-detail-row">
            <span className="detail-icon">📊</span>
            <span className="detail-label">Précision:</span>
            <span className={`detail-value accuracy-${frenchData.accuracy}`}>
              {frenchData.accuracy === 'high' ? 'Élevée (Dictionnaire)' :
               frenchData.accuracy === 'medium' ? 'Moyenne (Mixte)' :
               frenchData.accuracy === 'auto' ? 'Automatique (API)' : 'Partielle'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
});

// Rashi Comment Block with dual font display and scholarly references
const RashiComment = React.memo(({
  comment,
  commentIndex = 1,
  verseNumber,
  book,
  chapter,
  enableClickableText = true,
  showTranslation = true
}) => {
  const [expanded] = useState(true);
  const [frenchData, setFrenchData] = useState(null);
  const [loadingFrench, setLoadingFrench] = useState(false);

  // Load French translation for English commentary
  useEffect(() => {
    if (showTranslation && comment.english) {
      setLoadingFrench(true);
      translateWithSource(comment.english).then(result => {
        if (result && result.translation) {
          setFrenchData(result);
        }
        setLoadingFrench(false);
      }).catch(() => setLoadingFrench(false));
    }
  }, [comment.english, showTranslation]);

  return (
    <div className={`rashi-comment-block scholarly ${expanded ? 'expanded' : 'collapsed'}`}>
      {/* Comment Header with Reference */}
      <div className="comment-scholarly-header">
        <span className="comment-index">פירוש {commentIndex}</span>
        <span className="comment-ref">Rashi on {book} {chapter}:{verseNumber}</span>
      </div>

      {/* Dibbur HaMatchil - Opening Words */}
      {comment.dibbur && (
        <div className="dibbur-hamatchil-section scholarly">
          <div className="dibbur-header">
            <span className="dibbur-label-he">דיבור המתחיל</span>
            <span className="dibbur-label-en">Opening Words (Incipit)</span>
          </div>

          {/* Rashi Script Version */}
          <div className="dibbur-script-row">
            <span className="script-badge rashi-script-badge">כתב רש״י</span>
            <span className="dibbur-text rashi-font" dir="rtl" lang="he">
              {comment.dibbur}
            </span>
          </div>

          {/* Block/Square Script Version */}
          <div className="dibbur-script-row">
            <span className="script-badge block-script-badge">כתב מרובע</span>
            <span className="dibbur-text block-font" dir="rtl" lang="he">
              {comment.dibbur}
            </span>
          </div>

          {/* Translations with Sources */}
          <DiburTranslation
            englishText={comment.english}
            hebrewDibbur={comment.dibbur}
          />
        </div>
      )}

      {/* Main Commentary Text */}
      <div className="rashi-body scholarly">
        {/* Rashi Script */}
        <div className="rashi-text-block">
          <div className="script-header">
            <span className="script-label">כתב רש״י</span>
            <span className="script-info">Rashi Script (11th c. France)</span>
          </div>
          {enableClickableText ? (
            <ClickableText
              text={comment.hebrew}
              language="hebrew"
              className="rashi-text rashi-font"
            />
          ) : (
            <div className="rashi-text rashi-font" dir="rtl" lang="he">
              {comment.hebrew}
            </div>
          )}
        </div>

        {/* Block Script */}
        <div className="rashi-text-block">
          <div className="script-header">
            <span className="script-label standard">כתב מרובע</span>
            <span className="script-info">Square Script (Ktav Ashuri)</span>
          </div>
          {enableClickableText ? (
            <ClickableText
              text={comment.hebrew}
              language="hebrew"
              className="rashi-text block-font"
            />
          ) : (
            <div className="rashi-text block-font" dir="rtl" lang="he">
              {comment.hebrew}
            </div>
          )}
        </div>

        {/* English Translation with Source */}
        {showTranslation && comment.english && (
          <TranslationBlock
            text={comment.english}
            language="english"
            source="Sefaria.org"
            method="HE → EN"
            label="English Translation"
          />
        )}

        {/* French Translation with Source */}
        {showTranslation && (frenchData || loadingFrench) && (
          <TranslationBlock
            text={frenchData?.translation || ''}
            language="french"
            source={frenchData?.source}
            method={frenchData?.method}
            accuracy={frenchData?.accuracy}
            label="Traduction Française"
            loading={loadingFrench}
          />
        )}
      </div>

      {/* Scholarly Footer */}
      <div className="comment-footer">
        <span className="source-attribution">
          Source: Rashi (Rabbi Shlomo Yitzchaki, 1040-1105 CE)
        </span>
      </div>
    </div>
  );
});

// Targum Section with scholarly references
const TargumSection = React.memo(({ onkelos, showFrench = false, verseNumber, book, chapter }) => {
  const [frenchData, setFrenchData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (showFrench && onkelos.english) {
      setLoading(true);
      translateWithSource(onkelos.english).then(result => {
        if (result && result.translation) {
          setFrenchData(result);
        }
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [showFrench, onkelos.english]);

  return (
    <div className="targum-section scholarly">
      <div className="section-header targum-header">
        <div className="section-title-group">
          <span className="section-badge targum">תרגום</span>
          <span className="section-title">Targum Onkelos</span>
        </div>
        <span className="section-ref">{book} {chapter}:{verseNumber}</span>
      </div>

      <div className="targum-content">
        {/* Aramaic Text with Source - Now Clickable for Word Lookup */}
        <div className="targum-aramaic-block">
          <div className="text-header">
            <span className="lang-badge arc">ארמית</span>
            <span className="text-source">Aramaic Translation (2nd c. CE)</span>
            <span className="clickable-hint">Click words for Jastrow lookup</span>
          </div>
          <ClickableText
            text={onkelos.aramaic}
            language="aramaic"
            className="targum-aramaic"
          />
        </div>

        {/* English Translation with Source */}
        {onkelos.english && (
          <TranslationBlock
            text={onkelos.english}
            language="english"
            source="Sefaria.org"
            method="ARC → EN"
            label="English Translation"
          />
        )}

        {/* French Translation with Source */}
        {showFrench && (frenchData || loading) && (
          <TranslationBlock
            text={frenchData?.translation || ''}
            language="french"
            source={frenchData?.source}
            method={frenchData?.method}
            accuracy={frenchData?.accuracy}
            label="Traduction Française"
            loading={loading}
          />
        )}
      </div>

      {/* Scholarly Footer */}
      <div className="section-footer">
        <span className="source-attribution">
          Onkelos (Aquila of Sinope, c. 35-120 CE) — Official Aramaic Targum
        </span>
      </div>
    </div>
  );
});

// Main StudyVerse Component - Professional Jewish Study Tool
const StudyVerse = React.memo(({
  verse,
  verseNumber,
  book,
  chapter,
  // Display options
  showTranslation = true,
  showOnkelos = false,
  showRashi = false,
  showFrench = false,
  enableClickableText = true,
  // Data
  onkelosData = null,
  rashiComments = [],
  // Callbacks
  onBookmark,
  onToggleCommentary,
  isHighlighted = false,
  onSaveWord,
  hasWord
}) => {
  const [showCommentaryPanel, setShowCommentaryPanel] = useState(false);
  const [frenchVerseData, setFrenchVerseData] = useState(null);
  const [loadingFrench, setLoadingFrench] = useState(false);

  // Load French translation for verse
  useEffect(() => {
    if (showFrench && verse?.englishText) {
      setLoadingFrench(true);
      translateWithSource(verse.englishText).then(result => {
        if (result && result.translation) {
          setFrenchVerseData(result);
        }
        setLoadingFrench(false);
      }).catch(() => setLoadingFrench(false));
    }
  }, [showFrench, verse?.englishText]);

  // Extract first letter for enlarged display
  const hebrewText = verse?.hebrewText || '';
  const firstLetter = hebrewText.charAt(0);
  const restOfText = hebrewText.slice(1);

  const handleCommentaryToggle = useCallback(() => {
    setShowCommentaryPanel(prev => !prev);
    onToggleCommentary?.(verseNumber);
  }, [verseNumber, onToggleCommentary]);

  return (
    <article className={`study-verse scholarly ${isHighlighted ? 'highlighted' : ''}`}>
      {/* Scholarly Header */}
      <header className="verse-scholarly-header">
        <div className="verse-reference">
          <span className="ref-book">{book}</span>
          <span className="ref-chapter">{chapter}</span>
          <span className="ref-verse">:{verseNumber}</span>
        </div>
        <div className="verse-meta">
          <span className="meta-source">Torah Text via Sefaria.org</span>
          <span className="meta-manuscript">Masoretic Text (MT)</span>
        </div>
      </header>

      {/* Verse Toolbar with Actions */}
      <div className="verse-toolbar scholarly">
        <div className="toolbar-left">
          <span className="verse-type-badge">פסוק</span>
        </div>
        <div className="verse-actions">
          <button
            className={`action-btn scholarly ${showCommentaryPanel ? 'active' : ''}`}
            onClick={handleCommentaryToggle}
            title="View Commentary"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
            <span>מפרשים</span>
          </button>
          {onBookmark && (
            <button
              className="action-btn scholarly bookmark-btn"
              onClick={() => onBookmark(verse)}
              title="Bookmark Verse"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
              </svg>
              <span>סימניה</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Hebrew Text */}
      <div className="verse-main-text scholarly">
        <div className="text-header">
          <span className="lang-badge he">עברית</span>
          <span className="text-source">Hebrew Original (Ktav Ashuri)</span>
        </div>
        {enableClickableText ? (
          <ClickableText
            text={hebrewText}
            language="hebrew"
            className="hebrew-text-study"
            enlargeFirstLetter={true}
            onSaveWord={onSaveWord}
            hasWord={hasWord}
            showFrench={showFrench}
          />
        ) : (
          <p className="hebrew-text-study" dir="rtl" lang="he">
            <span className="first-letter">{firstLetter}</span>
            {restOfText}
          </p>
        )}
      </div>

      {/* English Translation with Source */}
      {/* Uses annotated display when rawEnglishHtml is available - shows bold for direct translations */}
      {showTranslation && verse?.englishText && (
        <TranslationBlock
          text={verse.englishText}
          rawHtml={verse.rawEnglishHtml}
          language="english"
          source="Sefaria.org"
          method="HE → EN"
          label="English Translation"
        />
      )}

      {/* French Translation with Source */}
      {showFrench && showTranslation && (frenchVerseData || loadingFrench) && (
        <TranslationBlock
          text={frenchVerseData?.translation || ''}
          language="french"
          source={frenchVerseData?.source}
          method={frenchVerseData?.method}
          accuracy={frenchVerseData?.accuracy}
          label="Traduction Française"
          loading={loadingFrench}
        />
      )}

      {/* Targum Onkelos */}
      {showOnkelos && onkelosData && (
        <TargumSection
          onkelos={onkelosData}
          showFrench={showFrench}
          verseNumber={verseNumber}
          book={book}
          chapter={chapter}
        />
      )}

      {/* Rashi Commentary */}
      {showRashi && rashiComments.length > 0 && (
        <div className="rashi-section scholarly">
          <div className="section-header rashi-header">
            <div className="section-title-group">
              <span className="section-badge rashi">רש״י</span>
              <span className="section-title">Rashi Commentary</span>
            </div>
            <span className="section-info">
              {rashiComments.length} comment{rashiComments.length > 1 ? 's' : ''}
            </span>
          </div>

          <div className="rashi-comments">
            {rashiComments.map((comment, idx) => (
              <RashiComment
                key={idx}
                comment={comment}
                commentIndex={idx + 1}
                verseNumber={verseNumber}
                book={book}
                chapter={chapter}
                enableClickableText={enableClickableText}
                showTranslation={showTranslation}
              />
            ))}
          </div>

          <div className="section-footer">
            <span className="source-attribution">
              Rabbi Shlomo Yitzchaki (Rashi), Troyes, France, 1040-1105 CE
            </span>
          </div>
        </div>
      )}

      {/* Scholarly Citation Footer */}
      <footer className="verse-scholarly-footer">
        <Citation
          book={book}
          chapter={chapter}
          verse={verseNumber}
          source="Sefaria Library"
          date={new Date().getFullYear()}
        />
      </footer>
    </article>
  );
});

export default StudyVerse;
export { RashiComment, TargumSection, DiburTranslation, TranslationBlock, SourceBadge, Citation };
