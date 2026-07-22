/**
 * TzuratHaDafTab - Enhanced Traditional Talmud Page Layout
 *
 * Designed for serious Talmud study (Kollel/Yeshiva methodology):
 * - 3-column view: Rashi | Gemara | Tosafot
 * - AI-powered Sugya analysis (מבנה הסוגיא)
 * - Key terms extraction with definitions (מילים מפתח)
 * - Cross-references and mareh mekomot (מראה מקומות)
 * - Study questions for chavruta (שאלות לעיון)
 * - Word-level interactivity with dictionary lookup
 * - Vocabulary tracking for mastery
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getRashiOnTalmud } from '../../../services/commentary/rashiService';
import { getTosafotOnTalmud } from '../../../services/commentary/tosafotService';
import { useVocabulary } from '../../../hooks';
import StudyPanel from './components/StudyPanel';
import WordPreviewPopup from './components/WordPreviewPopup';
import { InteractiveText } from './components/InteractiveWord';
import { getNextDaf, getPrevDaf } from './helpers/dafNavigation';

const TzuratHaDafTab = React.memo(({ text, reference, rashiText, tosafotText, onNavigate, onWordLookup }) => {
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [rashiData, setRashiData] = useState(rashiText || '');
  const [tosafotData, setTosafotData] = useState(tosafotText || '');
  const [hoveredSection, setHoveredSection] = useState(null);
  const [selectedWord, setSelectedWord] = useState(null);
  const [recentWords, setRecentWords] = useState([]);
  const { addWord, hasWord } = useVocabulary();

  // Popup state
  const [popupWord, setPopupWord] = useState(null);
  const [popupPosition, setPopupPosition] = useState(null);

  // Study Panel state (Kollel-style learning tools)
  const [studyPanelOpen, setStudyPanelOpen] = useState(false);

  const handleShowPreview = useCallback((word, position) => {
    setPopupWord(word);
    setPopupPosition(position);
    setSelectedWord(word);

    // Track recent words (last 5)
    setRecentWords(prev => {
      const filtered = prev.filter(w => w !== word);
      return [word, ...filtered].slice(0, 5);
    });
  }, []);

  const handleClosePopup = useCallback(() => {
    setPopupWord(null);
    setPopupPosition(null);
  }, []);

  const handleWordClick = useCallback((cleanedWord) => {
    if (!cleanedWord) return;
    setSelectedWord(cleanedWord);
    handleClosePopup();
    // Trigger lookup - switches to Words tab and auto-looks up
    onWordLookup?.(cleanedWord);
  }, [onWordLookup, handleClosePopup]);

  const handleSaveWord = useCallback((word) => {
    if (word && !hasWord(word)) {
      addWord(word, '', '');
    }
  }, [addWord, hasWord]);

  const handleWordHover = useCallback(() => {
    // Grammar info shown in tooltip via InteractiveWord
  }, []);

  const parsedRef = useMemo(() => {
    if (!reference) return { masechet: '', dafNumber: '' };
    const parts = reference.split(/[._]/);
    return {
      masechet: parts[0] || '',
      dafNumber: parts[1] || ''
    };
  }, [reference]);

  const nextDaf = useMemo(() => getNextDaf(parsedRef.dafNumber), [parsedRef.dafNumber]);
  const prevDaf = useMemo(() => getPrevDaf(parsedRef.dafNumber), [parsedRef.dafNumber]);

  const handlePrevDaf = useCallback(() => {
    if (prevDaf && onNavigate) {
      onNavigate(`${parsedRef.masechet}.${prevDaf}`);
    }
  }, [prevDaf, parsedRef.masechet, onNavigate]);

  const handleNextDaf = useCallback(() => {
    if (nextDaf && onNavigate) {
      onNavigate(`${parsedRef.masechet}.${nextDaf}`);
    }
  }, [nextDaf, parsedRef.masechet, onNavigate]);

  // Fetch commentaries if not provided
  useEffect(() => {
    if (!reference || rashiText || tosafotText) return;

    const fetchCommentaries = async () => {
      setLoading(true);
      setFetchError(null);
      try {
        const [rashi, tosafot] = await Promise.all([
          getRashiOnTalmud(parsedRef.masechet, parsedRef.dafNumber).catch(() => null),
          getTosafotOnTalmud(parsedRef.masechet, parsedRef.dafNumber).catch(() => null)
        ]);

        if (rashi?.he) {
          const heText = Array.isArray(rashi.he)
            ? rashi.he.filter(Boolean).join(' ')
            : rashi.he;
          setRashiData(heText);
        }
        if (tosafot?.he) {
          const heText = Array.isArray(tosafot.he)
            ? tosafot.he.filter(Boolean).join(' ')
            : tosafot.he;
          setTosafotData(heText);
        }

        if (!rashi?.he && !tosafot?.he) {
          setFetchError('Commentary not available for this daf');
        }
      } catch (error) {
        console.error('Failed to fetch commentaries:', error);
        setFetchError('Failed to load commentaries');
      } finally {
        setLoading(false);
      }
    };

    fetchCommentaries();
  }, [reference, rashiText, tosafotText, parsedRef]);

  if (!text) {
    return (
      <div className="tab-empty">
        <span className="empty-icon">📜</span>
        <span className="empty-text">No text available</span>
      </div>
    );
  }

  return (
    <div className="tzurat-hadaf-tab">
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <span>Loading...</span>
        </div>
      )}

      {fetchError && !loading && (
        <div className="fetch-error-banner" style={{
          padding: '8px 12px',
          margin: '8px',
          background: '#fef3cd',
          border: '1px solid #ffc107',
          borderRadius: '6px',
          color: '#856404',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>⚠️</span>
          <span>{fetchError}</span>
          <button
            onClick={() => setFetchError(null)}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }}
          >
            ×
          </button>
        </div>
      )}

      {/* Traditional Page Layout */}
      <div className="tzurat-hadaf-container">
        {/* Header with Navigation */}
        <div className="tzurat-hadaf-header">
          {onNavigate && prevDaf && (
            <button
              className="daf-nav-btn prev"
              onClick={handlePrevDaf}
              title={`Previous: ${prevDaf}`}
            >
              ←
            </button>
          )}

          <div className="header-center">
            <span className="masechet-name">{parsedRef.masechet}</span>
            {parsedRef.dafNumber && (
              <span className="daf-number">דף {parsedRef.dafNumber}</span>
            )}
          </div>

          {onNavigate && nextDaf && (
            <button
              className="daf-nav-btn next"
              onClick={handleNextDaf}
              title={`Next: ${nextDaf}`}
            >
              →
            </button>
          )}
        </div>

        {/* Enhanced word bar with recent words */}
        <div className="tzurat-word-toolbar">
          {recentWords.length > 0 && (
            <div className="recent-words">
              <span className="recent-label">Recent:</span>
              {recentWords.map((word, idx) => (
                <button
                  key={idx}
                  className={`recent-word-chip ${word === selectedWord ? 'active' : ''}`}
                  onClick={() => handleShowPreview(word, null)}
                  dir="rtl"
                >
                  {word}
                </button>
              ))}
            </div>
          )}

          {selectedWord && (
            <div className="selected-word-actions">
              <span className="selected-word" dir="rtl">{selectedWord}</span>
              <button
                className="action-btn lookup"
                onClick={() => handleWordClick(selectedWord)}
                title="Full dictionary lookup"
              >
                🔍 Lookup
              </button>
              <button
                className="action-btn save"
                onClick={() => handleSaveWord(selectedWord)}
                disabled={hasWord(selectedWord)}
                title={hasWord(selectedWord) ? 'Already saved' : 'Save to vocabulary'}
              >
                {hasWord(selectedWord) ? '✓' : '💾'}
              </button>
              <button
                className="action-btn copy"
                onClick={() => navigator.clipboard.writeText(selectedWord)}
                title="Copy to clipboard"
              >
                📋
              </button>
            </div>
          )}

          {!selectedWord && recentWords.length === 0 && (
            <div className="toolbar-hint">
              <span>👆 Click any word for quick preview • Double-click for full lookup</span>
            </div>
          )}

          {/* Study Tools Button */}
          <button
            className={`study-tools-btn ${studyPanelOpen ? 'active' : ''}`}
            onClick={() => setStudyPanelOpen(!studyPanelOpen)}
            title="כלי לימוד - Study Tools"
          >
            📚 {studyPanelOpen ? 'סגור לימוד' : 'כלי לימוד'}
          </button>
        </div>

        {/* Three-Column Layout */}
        <div className="tzurat-hadaf-columns">
          {/* Rashi Column (Right in RTL) */}
          <div
            className={`tzurat-column rashi-column ${hoveredSection === 'rashi' ? 'hovered' : ''}`}
            onMouseEnter={() => setHoveredSection('rashi')}
            onMouseLeave={() => setHoveredSection(null)}
          >
            <div className="column-header">
              <span className="commentator-name">רש״י</span>
              <span className="column-badge">פירוש</span>
            </div>
            <div className="column-content" dir="rtl" lang="he">
              {rashiData ? (
                <InteractiveText
                  text={rashiData}
                  onWordClick={handleWordClick}
                  onWordHover={handleWordHover}
                  onShowPreview={handleShowPreview}
                />
              ) : (
                <em className="no-commentary">אין רש״י</em>
              )}
            </div>
          </div>

          {/* Main Gemara Column (Center) */}
          <div
            className={`tzurat-column main-column ${hoveredSection === 'gemara' ? 'hovered' : ''}`}
            onMouseEnter={() => setHoveredSection('gemara')}
            onMouseLeave={() => setHoveredSection(null)}
          >
            <div className="column-header">
              <span className="section-label">גמרא</span>
              <span className="column-badge main">תלמוד</span>
            </div>
            <div className="column-content main-text" dir="rtl" lang="he">
              <InteractiveText
                text={text}
                onWordClick={handleWordClick}
                onWordHover={handleWordHover}
                onShowPreview={handleShowPreview}
              />
            </div>
          </div>

          {/* Tosafot Column (Left in RTL) */}
          <div
            className={`tzurat-column tosafot-column ${hoveredSection === 'tosafot' ? 'hovered' : ''}`}
            onMouseEnter={() => setHoveredSection('tosafot')}
            onMouseLeave={() => setHoveredSection(null)}
          >
            <div className="column-header">
              <span className="commentator-name">תוספות</span>
              <span className="column-badge">חידושים</span>
            </div>
            <div className="column-content" dir="rtl" lang="he">
              {tosafotData ? (
                <InteractiveText
                  text={tosafotData}
                  onWordClick={handleWordClick}
                  onWordHover={handleWordHover}
                  onShowPreview={handleShowPreview}
                />
              ) : (
                <em className="no-commentary">אין תוספות</em>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Word Preview Popup */}
      {popupWord && (
        <WordPreviewPopup
          word={popupWord}
          position={popupPosition}
          onClose={handleClosePopup}
          onFullLookup={handleWordClick}
          onSaveWord={handleSaveWord}
          isSaved={hasWord(popupWord)}
        />
      )}

      {/* Study Panel - Kollel/Yeshiva Learning Tools */}
      <StudyPanel
        text={text}
        reference={reference}
        rashiText={rashiData}
        tosafotText={tosafotData}
        isOpen={studyPanelOpen}
        onClose={() => setStudyPanelOpen(false)}
      />
    </div>
  );
});

export default TzuratHaDafTab;
