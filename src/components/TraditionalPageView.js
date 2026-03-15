import React, { useState, useMemo } from 'react';
import TzuratHaDaf from './TzuratHaDaf';
import MikraotGedolotPro from './MikraotGedolotPro';
import MishnahLayout from './MishnahLayout';
import StudyLayoutSelector from './StudyLayoutSelector';
import ScholarModePanel from './ScholarModePanel';
import { hasApiKey } from '../services/groqService';
import './TraditionalPageView.css';

/**
 * TraditionalPageView - Professional Book-Style Page Layouts
 *
 * Displays texts like real printed seforim:
 * - MikraotGedolotPro - Torah with Rashi, Ramban, Ibn Ezra, Sforno, Onkelos
 * - TzuratHaDaf - Talmud with multiple styles (Vilna, Oz VeHadar, etc.)
 * - MishnahLayout - Mishnah with Bartenura, Tosafot Yom Tov
 *
 * All content visible at once like a real book page (no click to expand).
 */
const TraditionalPageView = ({
  verses = [],
  onkelos = [],
  selectedBook,
  selectedChapter,
  isTorahBook = false,
  isTalmud = false,
  isMishnah = false,
  enableClickableText = true,
  showTranslation = false,
  onToggleTranslation,
  onSaveWord,
  hasWord,
  onClose,
  // Navigation props for page turning
  onPrevChapter,
  onNextChapter,
  hasPrevChapter = true,
  hasNextChapter = true,
}) => {
  const [showLayoutSelector, setShowLayoutSelector] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [currentLayout, setCurrentLayout] = useState(() => {
    if (isTalmud) return 'vilna-shas';
    if (isMishnah) return 'mishnah-layout';
    if (isTorahBook) return 'mikraot-gedolot';
    return 'reader';
  });

  // Handle layout change - 'reader' goes back to modern view
  const handleLayoutChange = (layoutId) => {
    if (layoutId === 'reader') {
      onClose?.();
    } else {
      setCurrentLayout(layoutId);
    }
  };

  // Prepare verses for AI analysis (all verses in chapter)
  const aiVerses = useMemo(() => {
    return verses.map(v => ({
      verse: v.verse,
      hebrewText: v.hebrewText,
      englishText: v.englishText
    }));
  }, [verses]);

  const hasAI = hasApiKey();

  // Determine text type for layout selector
  const getTextType = () => {
    if (isTalmud) return 'talmud';
    if (isMishnah) return 'mishnah';
    if (isTorahBook) return 'torah';
    return 'tanach';
  };

  // Get layout title and icon
  const getLayoutInfo = () => {
    if (isTalmud) {
      return {
        title: 'צורת הדף',
        subtitle: 'Traditional Talmud Layout',
        icon: '📚'
      };
    }
    if (isMishnah) {
      return {
        title: 'צורת המשנה',
        subtitle: 'Traditional Mishnah',
        icon: '📖'
      };
    }
    if (isTorahBook) {
      return {
        title: 'מקראות גדולות',
        subtitle: 'Mikraot Gedolot',
        icon: '📜'
      };
    }
    return {
      title: 'Traditional View',
      subtitle: 'Classic Layout',
      icon: '📕'
    };
  };

  const layoutInfo = getLayoutInfo();

  // If text type not supported for traditional layout
  if (!isTalmud && !isMishnah && !isTorahBook) {
    return (
      <div className="traditional-page-view">
        <div className="tpv-header">
          <h2>Traditional Page View</h2>
          <button className="tpv-close-btn" onClick={onClose} aria-label="Close traditional view">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="tpv-unsupported">
          <div className="tpv-unsupported-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h3>Traditional Layout Not Available</h3>
          <p>The authentic book-style layout is available for:</p>
          <ul>
            <li><strong>Torah (Chumash)</strong> - Mikraot Gedolot with Rashi, Ramban, Ibn Ezra, Sforno</li>
            <li><strong>Talmud (Gemara)</strong> - Tzurat HaDaf with Rashi, Tosafot, multiple styles</li>
            <li><strong>Mishnah</strong> - Traditional layout with Bartenura, Tosafot Yom Tov</li>
          </ul>
          <p>Please select a Torah, Talmud, or Mishnah text to use this view.</p>
          <button className="tpv-back-btn" onClick={onClose}>
            Return to Modern View
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="traditional-page-view">
      {/* Floating Header Bar */}
      <div className="tpv-header">
        <div className="tpv-title">
          <span className="tpv-icon">{layoutInfo.icon}</span>
          <h2>
            {layoutInfo.title}
            <span className="tpv-subtitle">{layoutInfo.subtitle}</span>
          </h2>
        </div>
        <div className="tpv-actions">
          <button
            className={`tpv-action-btn ai-btn ${hasAI ? 'has-ai' : ''}`}
            onClick={() => setShowAIPanel(true)}
            title="AI Study Assistant"
          >
            <span className="ai-emoji">🤖</span>
            <span>AI Study</span>
          </button>
          <button
            className="tpv-action-btn"
            onClick={() => setShowLayoutSelector(true)}
            title="Change layout"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            <span>Layout</span>
          </button>
          <button
            className={`tpv-action-btn ${showTranslation ? 'active' : ''}`}
            onClick={() => onToggleTranslation?.(!showTranslation)}
            title="Toggle English translation"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
            <span>English</span>
          </button>
          <button className="tpv-close-btn" onClick={onClose} aria-label="Close traditional view">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main Content - Full Page Book Layout */}
      <div className="tpv-content">
        {isTalmud && (
          <TzuratHaDaf
            verses={verses}
            selectedBook={selectedBook}
            selectedChapter={selectedChapter}
            enableClickableText={enableClickableText}
            showTranslation={showTranslation}
            onSaveWord={onSaveWord}
            hasWord={hasWord}
            onClose={onClose}
            onPrevChapter={onPrevChapter}
            onNextChapter={onNextChapter}
            hasPrevChapter={hasPrevChapter}
            hasNextChapter={hasNextChapter}
          />
        )}

        {isMishnah && (
          <MishnahLayout
            verses={verses}
            selectedBook={selectedBook}
            selectedChapter={selectedChapter}
            enableClickableText={enableClickableText}
            showTranslation={showTranslation}
            onSaveWord={onSaveWord}
            hasWord={hasWord}
            onPrevChapter={onPrevChapter}
            onNextChapter={onNextChapter}
            hasPrevChapter={hasPrevChapter}
            hasNextChapter={hasNextChapter}
          />
        )}

        {isTorahBook && (
          <MikraotGedolotPro
            verses={verses}
            onkelos={onkelos}
            selectedBook={selectedBook}
            selectedChapter={selectedChapter}
            enableClickableText={enableClickableText}
            showTranslation={showTranslation}
            onSaveWord={onSaveWord}
            hasWord={hasWord}
            onPrevChapter={onPrevChapter}
            onNextChapter={onNextChapter}
            hasPrevChapter={hasPrevChapter}
            hasNextChapter={hasNextChapter}
          />
        )}
      </div>

      {/* Layout Selector Modal */}
      <StudyLayoutSelector
        textType={getTextType()}
        currentLayout={currentLayout}
        onLayoutChange={handleLayoutChange}
        isOpen={showLayoutSelector}
        onClose={() => setShowLayoutSelector(false)}
        showTranslation={showTranslation}
        onToggleTranslation={onToggleTranslation}
      />

      {/* Study Center Panel - Full Chapter Analysis */}
      {showAIPanel && aiVerses.length > 0 && (
        <ScholarModePanel
          text={aiVerses.map(v => v.hebrewText).join(' ')}
          reference={`${selectedBook} ${selectedChapter}`}
          textType={isTalmud ? 'talmud' : isMishnah ? 'mishnah' : 'torah'}
          selectedBook={selectedBook}
          selectedVerses={aiVerses}
          isMultiVerse={true}
          isOpen={showAIPanel}
          onClose={() => setShowAIPanel(false)}
        />
      )}
    </div>
  );
};

export default React.memo(TraditionalPageView);
