import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './CommentaryViewer.css';
import { getCommentary } from '../../services/sefariaApi';
import { removeHtmlTags } from '../../utils/sanitize';
import { ClickableHebrewText } from '../core/ClickableText';
import CommentarySummary from './CommentarySummary';
import { getStoredApiKey } from '../../services/groqService';
import { EnhancedText } from '../../utils/textEnhancer';
import { SourceBadge } from '../shared/SourceBadge';

// Commentary metadata with scholarly details
const COMMENTARY_SOURCES = {
  'Rashi': {
    hebrewName: 'רש״י',
    fullName: 'Rabbi Shlomo Yitzchaki',
    dates: '1040-1105',
    era: 'Rishonim',
    location: 'Troyes, France',
    color: '#4f46e5',
    icon: '📖',
    textTypes: ['torah', 'talmud', 'tanach'],
    importance: 'primary',
    methodology: 'Peshat (plain meaning)',
    keyContribution: 'Essential first commentary for understanding Torah & Talmud'
  },
  'Ramban': {
    hebrewName: 'רמב״ן',
    fullName: 'Rabbi Moshe ben Nachman (Nachmanides)',
    dates: '1194-1270',
    era: 'Rishonim',
    location: 'Girona, Spain → Israel',
    color: '#7c3aed',
    icon: '🔮',
    textTypes: ['torah'],
    importance: 'primary',
    methodology: 'Kabbalah & Peshat synthesis',
    keyContribution: 'Mystical interpretations, critiques of Rashi & Ibn Ezra'
  },
  'Ibn Ezra': {
    hebrewName: 'אבן עזרא',
    fullName: 'Rabbi Avraham ibn Ezra',
    dates: '1089-1167',
    era: 'Rishonim',
    location: 'Spain (wandering scholar)',
    color: '#2563eb',
    icon: '🔤',
    textTypes: ['torah', 'tanach'],
    importance: 'primary',
    methodology: 'Grammar & linguistic analysis',
    keyContribution: 'Scientific approach, Hebrew grammar insights'
  },
  'Sforno': {
    hebrewName: 'ספורנו',
    fullName: 'Rabbi Ovadia ben Yaakov Sforno',
    dates: '1475-1550',
    era: 'Acharonim',
    location: 'Bologna, Italy',
    color: '#0891b2',
    icon: '💡',
    textTypes: ['torah'],
    importance: 'secondary',
    methodology: 'Philosophical & ethical',
    keyContribution: 'Renaissance humanist perspective, moral lessons'
  },
  'Onkelos': {
    hebrewName: 'אונקלוס',
    fullName: 'Onkelos the Convert',
    dates: '~35-120 CE',
    era: 'Targum',
    location: 'Rome → Israel',
    color: '#059669',
    icon: '📜',
    textTypes: ['torah'],
    importance: 'primary',
    methodology: 'Aramaic translation',
    keyContribution: 'Authoritative Aramaic rendering, removes anthropomorphisms'
  },
  'Or HaChaim': {
    hebrewName: 'אור החיים',
    fullName: 'Rabbi Chaim ben Moshe ibn Attar',
    dates: '1696-1743',
    era: 'Acharonim',
    location: 'Morocco → Israel',
    color: '#f59e0b',
    icon: '✨',
    textTypes: ['torah'],
    importance: 'secondary',
    methodology: 'Kabbalistic & Chassidic',
    keyContribution: 'Multiple interpretations per verse, spiritual depth'
  },
  'Kli Yakar': {
    hebrewName: 'כלי יקר',
    fullName: 'Rabbi Shlomo Ephraim Luntschitz',
    dates: '1550-1619',
    era: 'Acharonim',
    location: 'Prague, Bohemia',
    color: '#8b5cf6',
    icon: '💎',
    textTypes: ['torah'],
    importance: 'secondary',
    methodology: 'Homiletical & ethical',
    keyContribution: 'Moral teachings, social critique'
  },
  'Tosafot': {
    hebrewName: 'תוספות',
    fullName: 'Tosafists (Franco-German School)',
    dates: '12-14th cent.',
    era: 'Rishonim',
    location: 'France & Germany',
    color: '#dc2626',
    icon: '📚',
    textTypes: ['talmud'],
    importance: 'primary',
    methodology: 'Dialectical analysis',
    keyContribution: 'Resolves contradictions, debates with Rashi'
  },
  'Maharsha': {
    hebrewName: 'מהרש״א',
    fullName: 'Rabbi Shmuel Eliezer Eidels',
    dates: '1555-1631',
    era: 'Acharonim',
    location: 'Poland',
    color: '#d97706',
    icon: '🎓',
    textTypes: ['talmud'],
    importance: 'secondary',
    methodology: 'Chiddushei Halachot & Aggadot',
    keyContribution: 'Deep analysis of both legal and narrative passages'
  },
  'Bartenura': {
    hebrewName: 'ברטנורא',
    fullName: 'Rabbi Ovadia ben Avraham of Bartenura',
    dates: '1445-1515',
    era: 'Acharonim',
    location: 'Italy → Jerusalem',
    color: '#16a34a',
    icon: '📗',
    textTypes: ['mishnah'],
    importance: 'primary',
    methodology: 'Clear Mishnah explanation',
    keyContribution: 'Standard Mishnah commentary, based on Rashi & Rambam'
  }
};

const getSourcesForTextType = (textType) => {
  return Object.entries(COMMENTARY_SOURCES)
    .filter(([_, info]) => info.textTypes.includes(textType))
    .map(([name, info]) => ({ name, ...info }));
};

// Commentary Chip for quick selection
const CommentaryChip = ({ source, isSelected, onClick, disabled }) => {
  const info = COMMENTARY_SOURCES[source] || { hebrewName: source, color: '#6b7280' };

  return (
    <button
      className={`commentary-chip ${isSelected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
      onClick={() => !disabled && onClick(source)}
      style={{ '--chip-color': info.color }}
      disabled={disabled}
      title={`${info.fullName || source} (${info.dates || ''})`}
    >
      <span className="chip-icon">{info.icon || '📖'}</span>
      <span className="chip-hebrew">{info.hebrewName}</span>
      {isSelected && <span className="chip-check">✓</span>}
    </button>
  );
};

/**
 * Extract Dibur HaMatchil (ד״ה) from Rashi commentary text
 * The ד״ה is the Torah phrase being commented on, usually at the beginning
 * followed by a period, colon, or em-dash
 */
const extractDiburHaMatchil = (text) => {
  if (!text) return { diburHaMatchil: null, commentary: text };

  // Common patterns for ד״ה separator: period followed by space, colon, em-dash
  // Also handle bold tags that often wrap the ד״ה
  const cleanText = removeHtmlTags(text, ['i', 'sup']);

  // Pattern 1: Text ending with period followed by more text
  const periodMatch = cleanText.match(/^(.{2,50})\.\s+(.+)$/s);
  if (periodMatch) {
    return {
      diburHaMatchil: periodMatch[1].trim(),
      commentary: periodMatch[2].trim()
    };
  }

  // Pattern 2: Text with em-dash separator
  const dashMatch = cleanText.match(/^(.{2,50})\s*[—–-]\s*(.+)$/s);
  if (dashMatch) {
    return {
      diburHaMatchil: dashMatch[1].trim(),
      commentary: dashMatch[2].trim()
    };
  }

  // Pattern 3: Text with colon separator
  const colonMatch = cleanText.match(/^(.{2,50}):\s*(.+)$/s);
  if (colonMatch) {
    return {
      diburHaMatchil: colonMatch[1].trim(),
      commentary: colonMatch[2].trim()
    };
  }

  return { diburHaMatchil: null, commentary: cleanText };
};

/**
 * Extract ד״ה from English translation (usually in ALL CAPS or bold at start)
 */
const extractEnglishDiburHaMatchil = (text) => {
  if (!text) return { diburHaMatchil: null, commentary: text };

  const cleanText = removeHtmlTags(text);

  // Pattern 1: ALL CAPS phrase at start followed by em-dash or hyphen
  const capsMatch = cleanText.match(/^([A-Z][A-Z\s']{2,50})\s*[—–-]\s*(.+)$/s);
  if (capsMatch) {
    return {
      diburHaMatchil: capsMatch[1].trim(),
      commentary: capsMatch[2].trim()
    };
  }

  // Pattern 2: Phrase in quotes at start
  const quoteMatch = cleanText.match(/^[""](.{2,50})[""][:\s]*(.+)$/s);
  if (quoteMatch) {
    return {
      diburHaMatchil: quoteMatch[1].trim(),
      commentary: quoteMatch[2].trim()
    };
  }

  return { diburHaMatchil: null, commentary: cleanText };
};

// Commentary Display Card
const CommentaryDisplay = ({ source, commentaries, showTranslation, enableClickableText, verse, onClose }) => {
  const [showSummary, setShowSummary] = useState(false);
  const [showMetadata, setShowMetadata] = useState(false);
  const [showDictTest, setShowDictTest] = useState(false); // NEW: Dict test toggle
  const info = COMMENTARY_SOURCES[source] || { hebrewName: source, color: '#6b7280' };
  const hasApiKey = !!getStoredApiKey();

  const hebrewCommentaries = commentaries.filter(c => c.language === 'hebrew');
  const englishCommentaries = commentaries.filter(c => c.language === 'english');

  const getCommentaryText = useCallback(() => {
    const hebrewText = hebrewCommentaries.map(c => removeHtmlTags(c.text)).join('\n\n');
    const englishText = englishCommentaries.map(c => removeHtmlTags(c.text)).join('\n\n');
    return englishText || hebrewText;
  }, [hebrewCommentaries, englishCommentaries]);

  if (hebrewCommentaries.length === 0 && englishCommentaries.length === 0) {
    return (
      <div className="commentary-display empty">
        <div className="empty-icon">📭</div>
        <p>No {source} commentary for this verse</p>
      </div>
    );
  }

  // Determine if this source uses Rashi script
  const usesRashiScript = source === 'Rashi' || source === 'Tosafot';
  const isRashi = source === 'Rashi';

  // Build Sefaria link for attribution
  const sefariaLink = verse ? `https://www.sefaria.org/${encodeURIComponent(source + ' on ' + verse)}` : null;

  return (
    <div
      className={`commentary-display ${usesRashiScript ? 'rashi-script-source' : ''} ${isRashi ? 'rashi-enhanced' : ''}`}
      style={{ '--display-color': info.color }}
      data-source={source}
    >
      {/* Enhanced Header for Rashi */}
      <div className={`display-header ${isRashi ? 'rashi-header' : ''}`}>
        <div className="source-info">
          <span className="source-icon">{info.icon}</span>
          <span className="source-hebrew">{info.hebrewName}</span>
          {isRashi && <span className="rashi-subtitle">Rashi on Torah</span>}
          {!isRashi && <span className="source-english">{source}</span>}
          <span className="source-era">{info.era}</span>
          <button
            className={`info-toggle ${showMetadata ? 'active' : ''}`}
            onClick={() => setShowMetadata(!showMetadata)}
            title="Show commentator info"
            aria-expanded={showMetadata}
            aria-label={showMetadata ? 'Hide commentator info' : 'Show commentator info'}
          >
            ℹ️
          </button>
        </div>
        <div className="display-actions">
          {sefariaLink && (
            <a
              href={sefariaLink}
              target="_blank"
              rel="noopener noreferrer"
              className="sefaria-link-btn"
              title="View on Sefaria"
            >
              ↗
            </a>
          )}
          {/* Dict Test toggle - for testing dictionary lookups */}
          <button
            className={`dict-test-btn ${showDictTest ? 'active' : ''}`}
            onClick={() => setShowDictTest(!showDictTest)}
            title="Toggle Dictionary Test Card"
            aria-expanded={showDictTest}
            aria-label={showDictTest ? 'Hide dictionary test' : 'Show dictionary test'}
            style={{
              background: showDictTest ? '#f59e0b' : 'transparent',
              border: '1px solid #f59e0b',
              borderRadius: '4px',
              padding: '4px 8px',
              cursor: 'pointer',
              fontSize: '12px',
              color: showDictTest ? 'white' : '#f59e0b'
            }}
          >
            🧪
          </button>
          {hasApiKey && (
            <button
              className={`ai-btn ${showSummary ? 'active' : ''}`}
              onClick={() => setShowSummary(!showSummary)}
              title="AI Analysis"
              aria-expanded={showSummary}
              aria-label={showSummary ? 'Hide AI analysis' : 'Show AI analysis'}
            >
              🤖
            </button>
          )}
          {onClose && (
            <button className="close-btn" onClick={onClose}>×</button>
          )}
        </div>
      </div>

      {showMetadata && (
        <div className="commentator-metadata">
          <div className="metadata-row">
            <span className="metadata-label">Full Name:</span>
            <span className="metadata-value">{info.fullName}</span>
          </div>
          <div className="metadata-row">
            <span className="metadata-label">Period:</span>
            <span className="metadata-value">{info.dates}</span>
          </div>
          {info.location && (
            <div className="metadata-row">
              <span className="metadata-label">Location:</span>
              <span className="metadata-value">{info.location}</span>
            </div>
          )}
          {info.methodology && (
            <div className="metadata-row">
              <span className="metadata-label">Approach:</span>
              <span className="metadata-value methodology">{info.methodology}</span>
            </div>
          )}
          {info.keyContribution && (
            <div className="metadata-contribution">
              <span className="contribution-label">Key Contribution:</span>
              <span className="contribution-text">{info.keyContribution}</span>
            </div>
          )}
        </div>
      )}

      {showSummary && (
        <CommentarySummary
          commentaryText={getCommentaryText()}
          source={source}
          verse={verse}
          onClose={() => setShowSummary(false)}
        />
      )}

      <div className={`commentary-text-container ${isRashi ? 'rashi-container' : ''}`}>
        {hebrewCommentaries.map((commentary, idx) => {
          const { diburHaMatchil, commentary: mainText } = isRashi
            ? extractDiburHaMatchil(commentary.text)
            : { diburHaMatchil: null, commentary: removeHtmlTags(commentary.text, ['i', 'sup']) };

          return (
            <div
              key={`he-${idx}`}
              className={`text-block hebrew ${usesRashiScript ? 'rashi-script' : ''} ${isRashi ? 'rashi-block' : ''}`}
            >
              {/* ד״ה Badge for Rashi */}
              {isRashi && diburHaMatchil && (
                <div className="dibur-hamatchil-section">
                  <span className="dh-badge">ד״ה</span>
                  <span className="dh-text" dir="rtl">{diburHaMatchil}</span>
                </div>
              )}

              {/* Main Rashi Commentary Text */}
              <div className={`rashi-main-text ${isRashi ? 'enhanced' : ''}`}>
                {enableClickableText ? (
                  <ClickableHebrewText
                    text={isRashi ? mainText : removeHtmlTags(commentary.text, ['i', 'sup'])}
                    className={`commentary-text ${usesRashiScript ? 'rashi-script' : ''}`}
                    isRashiScript={usesRashiScript}
                    showDictTest={showDictTest}
                  />
                ) : (
                  <div
                    className={`commentary-text ${usesRashiScript ? 'rashi-script' : ''}`}
                    dir="rtl"
                    lang="he"
                  >
                    <EnhancedText text={isRashi ? mainText : removeHtmlTags(commentary.text, ['i', 'sup'])} />
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {showTranslation && englishCommentaries.length > 0 && (
          <>
            <div className={`translation-divider ${isRashi ? 'rashi-divider' : ''}`}>
              <span className="en-badge">EN</span>
              <span>Translation</span>
              <span className="translation-source-badges">
                {englishCommentaries.some(c => c.isTranslated) ? (
                  <SourceBadge source="AI" accuracy="auto" compact />
                ) : (
                  <SourceBadge source="Sefaria" accuracy="high" compact />
                )}
              </span>
            </div>
            {englishCommentaries.map((commentary, idx) => {
              const { diburHaMatchil: enDH, commentary: enText } = isRashi
                ? extractEnglishDiburHaMatchil(commentary.text)
                : { diburHaMatchil: null, commentary: removeHtmlTags(commentary.text) };

              return (
                <div key={`en-${idx}`} className={`text-block english ${isRashi ? 'rashi-english' : ''} ${commentary.isTranslated ? 'auto-translated' : ''}`}>
                  {/* English ד״ה if extracted */}
                  {isRashi && enDH && (
                    <div className="en-dibur-hamatchil">
                      <span className="en-dh-text">{enDH}</span>
                    </div>
                  )}
                  <div className="commentary-text" lang="en">
                    <EnhancedText text={isRashi ? enText : removeHtmlTags(commentary.text)} />
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* Sefaria Attribution */}
        {sefariaLink && (
          <div className="sefaria-attribution">
            <a href={sefariaLink} target="_blank" rel="noopener noreferrer">
              <span className="sefaria-icon">📖</span>
              <span>Sefaria.org</span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

// Main CommentaryViewer Component
const CommentaryViewer = ({
  isOpen,
  onClose,
  verse,
  verseText,
  selectedBook,
  selectedChapter,
  isTalmud = false,
  isMishnah = false,
  enableClickableText = true,
  initialSource = null
}) => {
  const [selectedSources, setSelectedSources] = useState(initialSource ? [initialSource] : []);
  const [commentaryData, setCommentaryData] = useState({});
  const [loading, setLoading] = useState(false);
  const [showTranslation, setShowTranslation] = useState(true);
  // Default to 'compare' mode to enable multi-select by default
  const [viewMode, setViewMode] = useState('compare');

  const textType = isTalmud ? 'talmud' : isMishnah ? 'mishnah' : 'torah';

  const availableSources = useMemo(() => getSourcesForTextType(textType), [textType]);

  useEffect(() => {
    const fetchCommentaries = async () => {
      if (!verse || selectedSources.length === 0) {
        setCommentaryData({});
        return;
      }

      setLoading(true);
      try {
        const data = await getCommentary(selectedBook, selectedChapter, verse.verse || verse);
        const grouped = {};
        selectedSources.forEach(source => {
          grouped[source] = data?.filter(c => c.source === source) || [];
        });
        setCommentaryData(grouped);
      } catch (error) {
        console.error('Failed to fetch commentary:', error);
        setCommentaryData({});
      }
      setLoading(false);
    };

    fetchCommentaries();
  }, [verse, selectedSources, selectedBook, selectedChapter]);

  const toggleSource = useCallback((source) => {
    setSelectedSources(prev => {
      if (prev.includes(source)) {
        return prev.filter(s => s !== source);
      }
      if (viewMode === 'single') {
        return [source];
      }
      return [...prev, source];
    });
  }, [viewMode]);

  const selectAllSources = useCallback(() => {
    setSelectedSources(availableSources.map(s => s.name));
    setViewMode('compare');
  }, [availableSources]);

  if (!isOpen) return null;

  const verseRef = `${selectedBook} ${selectedChapter}:${verse?.verse || verse}`;

  return (
    <div className="commentary-viewer-overlay" onClick={onClose}>
      <div className="commentary-viewer" onClick={e => e.stopPropagation()}>
        <div className="viewer-header">
          <div className="header-title">
            <h3>📚 Commentary</h3>
            <span className="verse-ref">{verseRef}</span>
          </div>
          <div className="header-controls">
            <div className="view-toggle" role="group" aria-label="View mode">
              <button
                className={viewMode === 'single' ? 'active' : ''}
                onClick={() => setViewMode('single')}
                title="Single view"
                aria-pressed={viewMode === 'single'}
              >
                ▣
              </button>
              <button
                className={viewMode === 'compare' ? 'active' : ''}
                onClick={() => setViewMode('compare')}
                title="Compare view"
                aria-pressed={viewMode === 'compare'}
              >
                ▤
              </button>
            </div>
            <button
              className={`translate-btn ${showTranslation ? 'active' : ''}`}
              onClick={() => setShowTranslation(!showTranslation)}
              title="Toggle translation"
              aria-pressed={showTranslation}
              aria-label={showTranslation ? 'Hide translation' : 'Show translation'}
            >
              🌐
            </button>
            <button className="close-viewer" onClick={onClose} aria-label="Close commentary viewer">✕</button>
          </div>
        </div>

        <div className="source-selector">
          <div className="selector-header">
            <span>Select Commentary:</span>
            <button onClick={selectAllSources} className="compare-all">Compare All</button>
          </div>
          <div className="source-chips">
            {availableSources.map(source => (
              <CommentaryChip
                key={source.name}
                source={source.name}
                isSelected={selectedSources.includes(source.name)}
                onClick={toggleSource}
              />
            ))}
          </div>
        </div>

        {verseText && (
          <div className="verse-preview">
            <span className="preview-label">Verse:</span>
            <span className="preview-text" dir="rtl">{typeof verseText === 'string' ? verseText : verseText.hebrew}</span>
          </div>
        )}

        <div className={`viewer-content ${viewMode === 'compare' ? 'compare-mode' : ''}`}>
          {loading ? (
            <div className="loading-state-with-skeleton">
              <div className="loading-skeleton">
                {(selectedSources.length > 0 ? selectedSources : ['default']).map((source, idx) => (
                  <div key={idx} className="skeleton-card">
                    <div className="skeleton-header">
                      <div className="skeleton-icon" />
                      <div className="skeleton-title" />
                    </div>
                    <div className="skeleton-content">
                      <div className="skeleton-line" />
                      <div className="skeleton-line" />
                      <div className="skeleton-line" />
                      <div className="skeleton-line" />
                      <div className="skeleton-line" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="loading-text">
                <span className="spinner-small" />
                Loading commentary...
              </div>
            </div>
          ) : selectedSources.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">👆</div>
              <p>Select a commentary above</p>
            </div>
          ) : (
            <div className={`commentary-grid ${selectedSources.length > 1 ? 'multi' : ''}`}>
              {selectedSources.map(source => (
                <CommentaryDisplay
                  key={source}
                  source={source}
                  commentaries={commentaryData[source] || []}
                  showTranslation={showTranslation}
                  enableClickableText={enableClickableText}
                  verse={verseRef}
                  onClose={selectedSources.length > 1 ? () => toggleSource(source) : null}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommentaryViewer;
export { CommentaryChip, CommentaryDisplay, COMMENTARY_SOURCES, getSourcesForTextType };
