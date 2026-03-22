import React from 'react';
import PropTypes from 'prop-types';
import VerseJump from '../navigation/VerseJump';
import CommentaryToggleDropdown from '../commentary/CommentaryToggleDropdown';

/**
 * ReaderControls - Toolbar for the Torah/Talmud reader
 *
 * Provides controls for:
 * - Translation toggles (English, French)
 * - Hebrew text options (vowels, trope/cantillation)
 * - Word lookup toggle
 * - Commentary dropdown
 * - Study mode button
 * - Font size controls
 * - Verse jump navigation
 */
const ReaderControls = ({
  // Translation toggles
  showTranslation,
  setShowTranslation,
  showFrench,
  onToggleFrench,

  // Hebrew options
  showVowels,
  toggleVowels,
  showCantillation,
  toggleCantillation,

  // Word lookup
  enableClickableText,
  setEnableClickableText,

  // Commentary toggles
  showOnkelos,
  onToggleOnkelos,
  showRashi,
  onToggleRashi,
  showRamban,
  onToggleRamban,
  showIbnEzra,
  onToggleIbnEzra,
  showSforno,
  onToggleSforno,
  showTosafot,
  onToggleTosafot,
  showMaharsha,
  onToggleMaharsha,
  showSoncino,
  onToggleSoncino,
  hasSoncinoAvailable,

  // Study mode
  studyPanelIsOpen,
  onToggleStudyMode,
  selectedVersesCount,

  // Font controls
  fontSize,
  setFontSize,

  // Verse jump
  verses,
  onJumpToVerse,
  selectedBook,
  selectedChapter,

  // Book type flags
  isTorahBook,
  isTalmud
}) => {
  return (
    <div className="reader-controls" role="toolbar" aria-label="Reading controls">
      <div className="control-group">
        {/* Translation toggles - pill segment */}
        <div className="control-segment" role="group" aria-label="Translation options">
          <button
            onClick={() => setShowTranslation(!showTranslation)}
            className={`control-button ${showTranslation ? 'active' : ''}`}
            aria-pressed={showTranslation}
            title={showTranslation ? 'Hide English translation' : 'Show English translation'}
          >
            EN
          </button>

          {onToggleFrench && (
            <button
              onClick={onToggleFrench}
              className={`control-button ${showFrench ? 'active' : ''}`}
              aria-pressed={showFrench}
              title={showFrench ? 'Hide French translation' : 'Show French translation'}
            >
              FR
            </button>
          )}
        </div>

        <span className="control-divider" aria-hidden="true" />

        {/* Hebrew display options - pill segment */}
        <div className="control-segment" role="group" aria-label="Hebrew text options">
          <button
            onClick={toggleVowels}
            className={`control-button ${showVowels ? 'active' : ''}`}
            aria-pressed={showVowels}
            title={showVowels ? 'Hide vowels (נקודות)' : 'Show vowels (נקודות)'}
          >
            Vowels
          </button>

          <button
            onClick={toggleCantillation}
            className={`control-button ${showCantillation ? 'active' : ''}`}
            aria-pressed={showCantillation}
            title={showCantillation ? 'Hide trope (טעמים)' : 'Show trope (טעמים)'}
          >
            Trope
          </button>
        </div>

        <span className="control-divider" aria-hidden="true" />

        {/* Word lookup */}
        <button
          onClick={() => setEnableClickableText(!enableClickableText)}
          className={`control-button ${enableClickableText ? 'active' : ''}`}
          aria-pressed={enableClickableText}
          title={enableClickableText ? 'Disable word lookup' : 'Enable word lookup'}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="button-icon">
            <path d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
          </svg>
          Lookup
        </button>

        {/* Commentaries dropdown */}
        <CommentaryToggleDropdown
          showOnkelos={showOnkelos}
          onToggleOnkelos={onToggleOnkelos}
          showRashi={showRashi}
          onToggleRashi={onToggleRashi}
          showRamban={showRamban}
          onToggleRamban={onToggleRamban}
          showIbnEzra={showIbnEzra}
          onToggleIbnEzra={onToggleIbnEzra}
          showSforno={showSforno}
          onToggleSforno={onToggleSforno}
          showTosafot={showTosafot}
          onToggleTosafot={onToggleTosafot}
          showMaharsha={showMaharsha}
          onToggleMaharsha={onToggleMaharsha}
          showSoncino={showSoncino}
          onToggleSoncino={onToggleSoncino}
          hasSoncinoAvailable={hasSoncinoAvailable}
          isTorahBook={isTorahBook}
          isTalmud={isTalmud}
        />

        {/* Unified Study Button */}
        <button
          onClick={onToggleStudyMode}
          className={`control-button study-btn ${studyPanelIsOpen ? 'active' : ''}`}
          aria-label={selectedVersesCount > 0 ? `Study ${selectedVersesCount} selected verses` : `Study all ${verses.length} verses`}
          title={`Study ${selectedVersesCount > 0 ? selectedVersesCount + ' selected' : 'all'} ${isTalmud ? 'passages' : 'verses'} (Ctrl+Shift+S)`}
          aria-pressed={studyPanelIsOpen}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="button-icon" aria-hidden="true">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
          Study
          {selectedVersesCount > 0 && (
            <span className="badge study-badge">{selectedVersesCount}</span>
          )}
        </button>
      </div>

      <div className="font-controls" role="group" aria-label="Font size controls">
        <button
          onClick={() => setFontSize(s => Math.max(s - 2, 12))}
          className="control-button font-btn"
          aria-label="Decrease font size"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M20 12H4" />
          </svg>
        </button>
        <span className="font-size-display" aria-live="polite">{fontSize}px</span>
        <button
          onClick={() => setFontSize(s => Math.min(s + 2, 28))}
          className="control-button font-btn"
          aria-label="Increase font size"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      <VerseJump
        verses={verses}
        onJumpToVerse={onJumpToVerse}
        currentBook={selectedBook}
        currentChapter={selectedChapter}
      />
    </div>
  );
};

ReaderControls.propTypes = {
  // Translation toggles
  showTranslation: PropTypes.bool.isRequired,
  setShowTranslation: PropTypes.func.isRequired,
  showFrench: PropTypes.bool,
  onToggleFrench: PropTypes.func,

  // Hebrew options
  showVowels: PropTypes.bool,
  toggleVowels: PropTypes.func,
  showCantillation: PropTypes.bool,
  toggleCantillation: PropTypes.func,

  // Word lookup
  enableClickableText: PropTypes.bool,
  setEnableClickableText: PropTypes.func,

  // Commentary toggles
  showOnkelos: PropTypes.bool,
  onToggleOnkelos: PropTypes.func,
  showRashi: PropTypes.bool,
  onToggleRashi: PropTypes.func,
  showRamban: PropTypes.bool,
  onToggleRamban: PropTypes.func,
  showIbnEzra: PropTypes.bool,
  onToggleIbnEzra: PropTypes.func,
  showSforno: PropTypes.bool,
  onToggleSforno: PropTypes.func,
  showTosafot: PropTypes.bool,
  onToggleTosafot: PropTypes.func,
  showMaharsha: PropTypes.bool,
  onToggleMaharsha: PropTypes.func,
  showSoncino: PropTypes.bool,
  onToggleSoncino: PropTypes.func,
  hasSoncinoAvailable: PropTypes.bool,

  // Study mode
  studyPanelIsOpen: PropTypes.bool,
  onToggleStudyMode: PropTypes.func,
  selectedVersesCount: PropTypes.number,

  // Font controls
  fontSize: PropTypes.number,
  setFontSize: PropTypes.func,

  // Verse jump
  verses: PropTypes.array,
  onJumpToVerse: PropTypes.func,
  selectedBook: PropTypes.string,
  selectedChapter: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),

  // Book type flags
  isTorahBook: PropTypes.bool,
  isTalmud: PropTypes.bool
};

ReaderControls.defaultProps = {
  showFrench: false,
  showVowels: true,
  showCantillation: true,
  enableClickableText: true,
  showOnkelos: false,
  showRashi: false,
  showRamban: false,
  showIbnEzra: false,
  showSforno: false,
  showTosafot: false,
  showMaharsha: false,
  showSoncino: false,
  hasSoncinoAvailable: false,
  studyPanelIsOpen: false,
  selectedVersesCount: 0,
  fontSize: 18,
  verses: [],
  isTorahBook: false,
  isTalmud: false
};

export default React.memo(ReaderControls);
