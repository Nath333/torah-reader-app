import React from 'react';
import PropTypes from 'prop-types';
import VerseJump from '../navigation/VerseJump';
import CommentaryToggleDropdown from '../commentary/CommentaryToggleDropdown';
import { useSettings } from '../../context';

/**
 * ReaderControls - Toolbar for the Torah/Talmud reader
 *
 * PRO SCHOLAR V8: Refactored to use useSettings() directly
 * This eliminates 15+ props that were being drilled through TorahReader.
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
  // Local UI state (not in settings context)
  showTranslation,
  setShowTranslation,
  enableClickableText,
  setEnableClickableText,

  // Study mode state
  studyPanelIsOpen,
  onToggleStudyMode,
  selectedVersesCount,

  // Font controls (localStorage)
  fontSize,
  setFontSize,

  // Verse jump
  verses,
  onJumpToVerse,
  selectedBook,
  selectedChapter,

  // Book type flags
  isTorahBook,
  isTalmud,
  hasSoncinoAvailable
}) => {
  // PRO SCHOLAR V8: Get settings from context (commentary toggles handled by CommentaryToggleDropdown)
  const {
    showFrench,
    toggleFrench: onToggleFrench,
    showVowels,
    toggleVowels,
    showCantillation,
    toggleCantillation
  } = useSettings();
  return (
    <div className="reader-controls" role="toolbar" aria-label="Contrôles de lecture">
      <div className="control-group">
        {/* Translation toggles - pill segment */}
        <div className="control-segment" role="group" aria-label="Options de traduction">
          <button
            onClick={() => setShowTranslation(!showTranslation)}
            className={`control-button ${showTranslation ? 'active' : ''}`}
            aria-pressed={showTranslation}
            title={showTranslation ? 'Masquer la traduction anglaise' : 'Afficher la traduction anglaise (Sefaria)'}
          >
            EN
          </button>

          {onToggleFrench && (
            <button
              onClick={onToggleFrench}
              className={`control-button ${showFrench ? 'active' : ''}`}
              aria-pressed={showFrench}
              title={showFrench ? 'Masquer la traduction française' : 'Afficher la traduction française (IA)'}
            >
              FR
            </button>
          )}
        </div>

        <span className="control-divider" aria-hidden="true" />

        {/* Hebrew display options - pill segment */}
        <div className="control-segment" role="group" aria-label="Options du texte hébreu">
          <button
            onClick={toggleVowels}
            className={`control-button ${showVowels ? 'active' : ''}`}
            aria-pressed={showVowels}
            title={showVowels ? 'Masquer les voyelles (נקודות)' : 'Afficher les voyelles (נקודות)'}
          >
            Vowels
          </button>

          <button
            onClick={toggleCantillation}
            className={`control-button ${showCantillation ? 'active' : ''}`}
            aria-pressed={showCantillation}
            title={showCantillation ? 'Masquer les tropes (טעמים — cantillation)' : 'Afficher les tropes (טעמים — cantillation)'}
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
          title={enableClickableText ? 'Désactiver le clic-mot (dictionnaire au clic)' : 'Activer le clic-mot : chaque mot hébreu ouvre son dictionnaire'}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="button-icon">
            <path d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
          </svg>
          Dico
        </button>

        {/* Commentaries dropdown - PRO SCHOLAR V8: Uses useSettings() directly */}
        <CommentaryToggleDropdown
          hasSoncinoAvailable={hasSoncinoAvailable}
          isTorahBook={isTorahBook}
          isTalmud={isTalmud}
        />

        {/* Unified Study Button */}
        <button
          onClick={onToggleStudyMode}
          className={`control-button study-btn ${studyPanelIsOpen ? 'active' : ''}`}
          aria-label={selectedVersesCount > 0 ? `Étudier les ${selectedVersesCount} versets sélectionnés` : `Étudier les ${verses.length} versets`}
          title={`Ouvre les commentaires ${selectedVersesCount > 0 ? 'des ' + selectedVersesCount + ' versets sélectionnés' : 'du chapitre'} (Ctrl+Shift+S)`}
          aria-pressed={studyPanelIsOpen}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="button-icon" aria-hidden="true">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
          Étude
          {selectedVersesCount > 0 && (
            <span className="badge study-badge">{selectedVersesCount}</span>
          )}
        </button>
      </div>

      <div className="font-controls" role="group" aria-label="Taille du texte">
        <button
          onClick={() => setFontSize(s => Math.max(s - 2, 12))}
          className="control-button font-btn"
          aria-label="Réduire la taille du texte"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M20 12H4" />
          </svg>
        </button>
        <span className="font-size-display" aria-live="polite">{fontSize}px</span>
        <button
          onClick={() => setFontSize(s => Math.min(s + 2, 28))}
          className="control-button font-btn"
          aria-label="Agrandir la taille du texte"
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
  // Local UI state (not in settings context)
  showTranslation: PropTypes.bool.isRequired,
  setShowTranslation: PropTypes.func.isRequired,
  enableClickableText: PropTypes.bool,
  setEnableClickableText: PropTypes.func,

  // Study mode state
  studyPanelIsOpen: PropTypes.bool,
  onToggleStudyMode: PropTypes.func,
  selectedVersesCount: PropTypes.number,

  // Font controls (localStorage)
  fontSize: PropTypes.number,
  setFontSize: PropTypes.func,

  // Verse jump
  verses: PropTypes.array,
  onJumpToVerse: PropTypes.func,
  selectedBook: PropTypes.string,
  selectedChapter: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),

  // Book type flags
  isTorahBook: PropTypes.bool,
  isTalmud: PropTypes.bool,
  hasSoncinoAvailable: PropTypes.bool
};

ReaderControls.defaultProps = {
  enableClickableText: true,
  studyPanelIsOpen: false,
  selectedVersesCount: 0,
  fontSize: 18,
  verses: [],
  isTorahBook: false,
  isTalmud: false,
  hasSoncinoAvailable: false
};

export default React.memo(ReaderControls);
