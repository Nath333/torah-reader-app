import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './CommentaryViewer.css';
import { getCommentary } from '../services/sefariaApi';
import { removeHtmlTags } from '../utils/sanitize';
import { ClickableHebrewText } from './ClickableText';
import CommentarySummary from './CommentarySummary';
import { getStoredApiKey } from '../services/groqService';

// Commentary metadata
const COMMENTARY_SOURCES = {
  'Rashi': {
    hebrewName: 'רש״י',
    fullName: 'Rabbi Shlomo Yitzchaki',
    dates: '1040-1105',
    era: 'Rishonim',
    color: '#4f46e5',
    icon: '📖',
    textTypes: ['torah', 'talmud', 'tanach'],
    importance: 'primary'
  },
  'Ramban': {
    hebrewName: 'רמב״ן',
    fullName: 'Nachmanides',
    dates: '1194-1270',
    era: 'Rishonim',
    color: '#7c3aed',
    icon: '🔮',
    textTypes: ['torah'],
    importance: 'primary'
  },
  'Ibn Ezra': {
    hebrewName: 'אבן עזרא',
    fullName: 'Rabbi Avraham ibn Ezra',
    dates: '1089-1167',
    era: 'Rishonim',
    color: '#2563eb',
    icon: '🔤',
    textTypes: ['torah', 'tanach'],
    importance: 'primary'
  },
  'Sforno': {
    hebrewName: 'ספורנו',
    fullName: 'Rabbi Ovadia Sforno',
    dates: '1475-1550',
    era: 'Acharonim',
    color: '#0891b2',
    icon: '💡',
    textTypes: ['torah'],
    importance: 'secondary'
  },
  'Onkelos': {
    hebrewName: 'אונקלוס',
    fullName: 'Onkelos the Convert',
    dates: '~35-120 CE',
    era: 'Targum',
    color: '#059669',
    icon: '📜',
    textTypes: ['torah'],
    importance: 'primary'
  },
  'Or HaChaim': {
    hebrewName: 'אור החיים',
    fullName: 'Rabbi Chaim ibn Attar',
    dates: '1696-1743',
    era: 'Acharonim',
    color: '#f59e0b',
    icon: '✨',
    textTypes: ['torah'],
    importance: 'secondary'
  },
  'Kli Yakar': {
    hebrewName: 'כלי יקר',
    fullName: 'Rabbi Shlomo Ephraim',
    dates: '1550-1619',
    era: 'Acharonim',
    color: '#8b5cf6',
    icon: '💎',
    textTypes: ['torah'],
    importance: 'secondary'
  },
  'Tosafot': {
    hebrewName: 'תוספות',
    fullName: 'Tosafists',
    dates: '12-14th cent.',
    era: 'Rishonim',
    color: '#dc2626',
    icon: '📚',
    textTypes: ['talmud'],
    importance: 'primary'
  },
  'Maharsha': {
    hebrewName: 'מהרש״א',
    fullName: 'Rabbi Shmuel Eidels',
    dates: '1555-1631',
    era: 'Acharonim',
    color: '#d97706',
    icon: '🎓',
    textTypes: ['talmud'],
    importance: 'secondary'
  },
  'Bartenura': {
    hebrewName: 'ברטנורא',
    fullName: 'Rabbi Ovadia of Bartenura',
    dates: '1445-1515',
    era: 'Acharonim',
    color: '#16a34a',
    icon: '📗',
    textTypes: ['mishnah'],
    importance: 'primary'
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

// Commentary Display Card
const CommentaryDisplay = ({ source, commentaries, showTranslation, enableClickableText, verse, onClose }) => {
  const [showSummary, setShowSummary] = useState(false);
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

  return (
    <div className="commentary-display" style={{ '--display-color': info.color }}>
      <div className="display-header">
        <div className="source-info">
          <span className="source-icon">{info.icon}</span>
          <span className="source-hebrew">{info.hebrewName}</span>
          <span className="source-english">{source}</span>
          <span className="source-era">{info.era}</span>
        </div>
        <div className="display-actions">
          {hasApiKey && (
            <button
              className={`ai-btn ${showSummary ? 'active' : ''}`}
              onClick={() => setShowSummary(!showSummary)}
              title="AI Analysis"
            >
              🤖
            </button>
          )}
          {onClose && (
            <button className="close-btn" onClick={onClose}>×</button>
          )}
        </div>
      </div>

      {showSummary && (
        <CommentarySummary
          commentaryText={getCommentaryText()}
          source={source}
          verse={verse}
          onClose={() => setShowSummary(false)}
        />
      )}

      <div className="commentary-text-container">
        {hebrewCommentaries.map((commentary, idx) => (
          <div key={`he-${idx}`} className="text-block hebrew">
            {enableClickableText ? (
              <ClickableHebrewText
                text={removeHtmlTags(commentary.text, ['i', 'sup'])}
                className="commentary-text"
              />
            ) : (
              <div className="commentary-text" dir="rtl" lang="he">
                {removeHtmlTags(commentary.text, ['i', 'sup'])}
              </div>
            )}
          </div>
        ))}

        {showTranslation && englishCommentaries.length > 0 && (
          <>
            <div className="translation-divider"><span>Translation</span></div>
            {englishCommentaries.map((commentary, idx) => (
              <div key={`en-${idx}`} className="text-block english">
                <div className="commentary-text" lang="en">
                  {removeHtmlTags(commentary.text)}
                </div>
              </div>
            ))}
          </>
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
  const [viewMode, setViewMode] = useState('single');

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
            <div className="view-toggle">
              <button className={viewMode === 'single' ? 'active' : ''} onClick={() => setViewMode('single')} title="Single">
                ▣
              </button>
              <button className={viewMode === 'compare' ? 'active' : ''} onClick={() => setViewMode('compare')} title="Compare">
                ▤
              </button>
            </div>
            <button
              className={`translate-btn ${showTranslation ? 'active' : ''}`}
              onClick={() => setShowTranslation(!showTranslation)}
              title="Toggle translation"
            >
              🌐
            </button>
            <button className="close-viewer" onClick={onClose}>✕</button>
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
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading commentary...</p>
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
