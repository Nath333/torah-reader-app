import React from 'react';
import PropTypes from 'prop-types';
import ClickableText from './ClickableText';
import DictionaryTranslation from '../dictionary/DictionaryTranslation';
import { WordDefinitionCard } from '../dictionary';
import SafeText from './SafeText';
import RashiFrenchTranslation from '../commentary/RashiFrenchTranslation';
import NoteEditor from '../shared/NoteEditor';
import { AnnotatedTranslationInline } from '../dictionary/AnnotatedTranslation';
import { hasAnnotationMarkup } from '../../utils/sanitize';
import { processHebrewText } from '../../utils/hebrewUtils';
import MasoreticIndicator from '../analysis/MasoreticIndicator';
import { TranslationSourceHeader, CommentarySourceBadge } from '../shared/SourceBadge';
import { MASTERY_LEVELS } from '../../hooks/useMastery';
import { FEATURES } from '../../services/featureFlags';

/**
 * VerseRow - Single verse display with all commentaries
 *
 * Renders:
 * - Verse header (number, actions)
 * - Main column (Hebrew text, English/French translations)
 * - Commentary column (Onkelos, Rashi, Tosafot, Maharsha, Ramban, Ibn Ezra, Sforno)
 * - Notes section
 */
const VerseRow = ({
  verse,
  index,
  selectedBook,
  selectedChapter,

  // Display options
  showTranslation,
  showFrench,
  showVowels,
  showCantillation,
  enableClickableText,

  // Commentary data
  commentaryData,

  // Translation data
  translationData,

  // Commentary toggles
  showOnkelos,
  showRashi,
  showTosafot,
  showMaharsha,
  showSoncino,
  showRamban,
  showIbnEzra,
  showSforno,

  // Book type flags
  isTorahBook,
  isTalmud,

  // Onkelos data
  onkelosItem,

  // Selection state
  isSelected,
  selectionOrder,
  selectionMode,
  hasRipple,
  inDragRange,
  isHighlighted,
  selectedVersesLength,

  // Selection handlers
  onToggleSelection,
  onDragStart,
  onDragMove,

  // Verse actions
  onCopy,
  onShare,
  onSpeak,
  onBookmark,
  copiedVerse,
  speakingVerse,
  speaking,
  speechSupported,
  hebrewVoiceAvailable,

  // Note handling
  hasNote,
  noteText,
  editingNote,
  setEditingNote,
  onSaveNote,

  // Mastery
  getVerseMastery,
  incrementMastery,

  // Word lookup
  onSaveWord,
  hasWord,
  onWordSelect,
  selectedWordData,

  // Commentary toggle handlers (for Soncino close button)
  onToggleSoncino,

  // Rashi view controls
  showSquareScript,
  setShowSquareScript,
  showRashiEnglish,
  setShowRashiEnglish,

  // Has Soncino available
  hasSoncinoAvailable
}) => {
  const verseKey = `${selectedBook}:${selectedChapter}:${verse.verse}`;
  const dafKey = `${selectedBook}:${selectedChapter}`;

  // Get commentary data for this verse
  // PRO SCHOLAR: For Talmud, Rashi is stored at daf level (all comments for entire daf)
  // For Torah, Rashi is stored at verse level
  // Also check if rashiData is an object with the right structure
  const rashiData = commentaryData.rashiData || {};
  const rashiComments = isTalmud
    ? (rashiData[dafKey] || rashiData[verseKey] || [])
    : (rashiData[verseKey] || []);

  // PRO SCHOLAR: Loading state is a boolean, not an object
  // Also consider "loading" if rashiData hasn't been populated yet
  const rashiLoading = commentaryData.rashiLoading ||
    (showRashi && Object.keys(rashiData).length === 0);
  const tosafotComments = commentaryData.tosafotData?.[`${selectedBook}:${selectedChapter}`] || [];
  const tosafotLoading = commentaryData.tosafotLoading;
  const maharshaComments = commentaryData.maharshaData?.[`${selectedBook}:${selectedChapter}`];
  const maharshaLoading = commentaryData.maharshaLoading;
  const soncinoComments = commentaryData.soncinoData?.[`${selectedBook}:${selectedChapter}`] || [];
  const soncinoLoading = commentaryData.soncinoLoading;
  const soncinoError = commentaryData.soncinoData?._error;
  const rambanComments = commentaryData.rambanData?.[verseKey]?.comments || [];
  const rambanLoading = commentaryData.rambanLoading; // Boolean, not per-verse
  const ibnEzraComments = commentaryData.ibnEzraData?.[verseKey]?.comments || [];
  const ibnEzraLoading = commentaryData.ibnEzraLoading; // Boolean, not per-verse
  const sfornoComments = commentaryData.sfornoData?.[verseKey]?.comments || [];
  const sfornoLoading = commentaryData.sfornoLoading; // Boolean, not per-verse

  // Get French translation for this verse
  const verseFrenchData = translationData.verseFrench?.[verseKey];
  const onkelosFrenchData = translationData.onkelosFrench?.[verse.verse];

  // Process Hebrew text
  const processedHebrewText = processHebrewText(verse.hebrewText, { showVowels, showCantillation });

  // Determine if we have any commentary to show
  const hasCommentaryToShow = (showOnkelos && isTorahBook && onkelosItem) ||
    showRashi ||
    (showTosafot && isTalmud) ||
    (showMaharsha && isTalmud) ||
    (showSoncino && hasSoncinoAvailable) ||
    (showRamban && isTorahBook) ||
    (showIbnEzra && isTorahBook) ||
    (showSforno && isTorahBook);

  return (
    <article
      data-verse={verse.verse}
      className={`verse ${isHighlighted ? 'highlighted' : ''} ${hasNote ? 'has-note' : ''} ${isSelected ? 'verse-selected' : ''} ${selectionMode ? 'selectable' : ''} ${hasRipple ? 'ripple' : ''} ${inDragRange ? 'in-drag-range' : ''} fade-in`}
      aria-label={`${selectedBook} ${selectedChapter}:${verse.verse}`}
      onClick={selectionMode ? (e) => onToggleSelection(verse, e) : undefined}
      onMouseDown={selectionMode ? (e) => onDragStart(verse.verse, e) : undefined}
      onMouseEnter={selectionMode ? () => onDragMove(verse.verse) : undefined}
    >
      {/* Selection order badge */}
      {isSelected && selectionOrder && selectedVersesLength > 1 && (
        <span className="selection-order">{selectionOrder}</span>
      )}

      <div className="verse-header">
        {/* Selection checkbox in selection mode */}
        {selectionMode && (
          <span className={`verse-checkbox ${isSelected ? 'checked' : ''}`}>
            {isSelected ? (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
              </svg>
            )}
          </span>
        )}

        <span className="verse-number" aria-label={`Verse ${verse.verse}`}>
          {verse.verse}
        </span>

        {/* Masoretic/Textual Variant Indicator */}
        {!isTalmud && FEATURES.MASORETIC_NOTES && (
          <MasoreticIndicator
            book={selectedBook}
            chapter={selectedChapter}
            verse={verse.verse}
            compact={true}
          />
        )}

        <div className="verse-actions" role="toolbar" aria-label="Verse actions">
          <div className="compact-actions">
            <button
              className={`icon-btn ${copiedVerse === verse.verse ? 'success' : ''}`}
              onClick={() => onCopy(verse)}
              aria-label={copiedVerse === verse.verse ? 'Copied!' : 'Copy verse'}
              title="Copy verse"
            >
              {copiedVerse === verse.verse ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 13l4 4L19 7" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
              )}
            </button>

            <button
              className="icon-btn"
              onClick={() => onShare(verse)}
              aria-label="Share verse"
              title="Share verse"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" /></svg>
            </button>

            {speechSupported && (
              <button
                className={`icon-btn ${speakingVerse === verse.verse && speaking ? 'active' : ''}`}
                onClick={() => onSpeak(verse)}
                aria-label={speakingVerse === verse.verse && speaking ? 'Stop reading' : 'Read aloud'}
                title={hebrewVoiceAvailable ? 'Read verse aloud' : 'Read verse (fallback voice)'}
              >
                {speakingVerse === verse.verse && speaking ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 010 7.07" /></svg>
                )}
              </button>
            )}

            <button
              className={`icon-btn ${hasNote ? 'has-note' : ''}`}
              onClick={() => setEditingNote(editingNote === verse.verse ? null : verse.verse)}
              aria-label={hasNote ? 'Edit note' : 'Add note'}
              title={hasNote ? 'Edit note' : 'Add note'}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
              {hasNote && <span className="note-indicator" />}
            </button>

            {/* Mastery Level */}
            <button
              className="icon-btn mastery-btn"
              onClick={() => incrementMastery(selectedBook, selectedChapter, verse.verse)}
              aria-label={`Mastery: ${MASTERY_LEVELS[getVerseMastery(selectedBook, selectedChapter, verse.verse)].name}`}
              title={`${MASTERY_LEVELS[getVerseMastery(selectedBook, selectedChapter, verse.verse)].name}: ${MASTERY_LEVELS[getVerseMastery(selectedBook, selectedChapter, verse.verse)].description}`}
              style={{ color: MASTERY_LEVELS[getVerseMastery(selectedBook, selectedChapter, verse.verse)].color }}
            >
              <span className="mastery-icon">{MASTERY_LEVELS[getVerseMastery(selectedBook, selectedChapter, verse.verse)].icon}</span>
            </button>

            {onBookmark && (
              <button
                className="icon-btn"
                onClick={() => onBookmark(verse)}
                aria-label="Bookmark"
                title="Bookmark verse"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Side-by-side layout: Verse + Commentaries */}
      <div className={`verse-layout ${hasCommentaryToShow ? 'has-commentary' : ''}`}>
        {/* Main Column: Verse Text + Translations */}
        <div className={`verse-main ${isTalmud ? 'talmud-content' : ''}`}>
          {enableClickableText ? (
            <ClickableText
              language={isTalmud ? "aramaic" : "hebrew"}
              text={processedHebrewText || 'טעות בטעינת הפסוק'}
              className={`hebrew-text ${isTalmud ? 'talmud-aramaic' : ''}`}
              onSaveWord={onSaveWord}
              hasWord={hasWord}
              showFrench={showFrench}
              externalCard={true}
              onWordSelect={onWordSelect}
            />
          ) : (
            <div className={`hebrew-text ${isTalmud ? 'talmud-aramaic' : ''}`} lang={isTalmud ? "arc" : "he"} dir="rtl">
              {processedHebrewText || 'טעות בטעינת הפסוק'}
            </div>
          )}

          {/* Word Lookup Card - External card above translations */}
          {selectedWordData?.word && (
            <WordDefinitionCard
              word={selectedWordData.word}
              translationData={selectedWordData.translationData}
              isLoading={selectedWordData.isLoading}
              isAramaic={selectedWordData.isAramaic}
              isRashiScript={selectedWordData.isRashiScript}
              isInVocabulary={selectedWordData.isInVocabulary}
              onSave={selectedWordData.onSave}
              onClose={selectedWordData.onClose}
            />
          )}

          {/* English Translation */}
          {showTranslation && (
            <div className="english-translation" lang="en">
              <div className="translation-header">
                <TranslationSourceHeader
                  language="en"
                  source="Sefaria.org"
                  method="HE → EN"
                  accuracy="high"
                />
              </div>
              <div className="translation-text">
                {verse.rawEnglishHtml && hasAnnotationMarkup(verse.rawEnglishHtml) ? (
                  <AnnotatedTranslationInline text={verse.rawEnglishHtml} language="en" />
                ) : (
                  <SafeText text={verse.englishText || 'Error loading translation'} lang="en" />
                )}
              </div>
            </div>
          )}

          {/* French Translation */}
          {showFrench && showTranslation && (
            <div className="french-translation" lang="fr">
              <div className="translation-header">
                <TranslationSourceHeader
                  language="fr"
                  source={verseFrenchData?.source || 'Dictionary'}
                  method={verseFrenchData?.method || 'EN → FR'}
                  accuracy={verseFrenchData?.accuracy}
                  isLoading={!verseFrenchData}
                />
              </div>
              {verseFrenchData && (
                <div className="translation-text">
                  {verseFrenchData.rawHtml && hasAnnotationMarkup(verseFrenchData.rawHtml) ? (
                    <AnnotatedTranslationInline text={verseFrenchData.rawHtml} language="fr" />
                  ) : (
                    <SafeText text={verseFrenchData.translation} lang="fr" />
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Commentary Column */}
        <div className="verse-commentaries">
          {/* Onkelos Translation */}
          {showOnkelos && isTorahBook && onkelosItem && (
            <div className="onkelos-section">
              <div className="onkelos-header">
                <div className="onkelos-label">
                  <span className="onkelos-badge">תרגום</span>
                  <span className="onkelos-title">Targum Onkelos</span>
                </div>
                <CommentarySourceBadge source="Onkelos" accuracy="high" />
              </div>
              <div className="onkelos-content">
                {onkelosItem.aramaic && (
                  <div className="onkelos-aramaic" lang="arc" dir="rtl">
                    {enableClickableText ? (
                      <ClickableText
                        language="aramaic"
                        text={processHebrewText(onkelosItem.aramaic, { showVowels, showCantillation })}
                        className="aramaic-text"
                        onSaveWord={onSaveWord}
                        hasWord={hasWord}
                        showFrench={showFrench}
                        externalCard={true}
                        onWordSelect={onWordSelect}
                      />
                    ) : (
                      processHebrewText(onkelosItem.aramaic, { showVowels, showCantillation })
                    )}
                  </div>
                )}
                {onkelosItem.english ? (
                  <div className="onkelos-english" lang="en">
                    <span className="translation-label">EN:</span> {onkelosItem.english}
                  </div>
                ) : (
                  <div className="onkelos-english onkelos-no-translation" lang="en">
                    <span className="translation-label">Translation not available</span>
                  </div>
                )}
                {showFrench && onkelosFrenchData && (
                  <div className="onkelos-french" lang="fr">
                    <span className="translation-label">FR:</span> {onkelosFrenchData}
                  </div>
                )}
                {showFrench && !onkelosFrenchData && onkelosItem.english && (
                  <div className="onkelos-french onkelos-loading-french" lang="fr">
                    <span className="translation-label">FR:</span> <span className="loading-text">Chargement...</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Rashi Commentary */}
          {showRashi && (
            <div className="rashi-section">
              <div className="rashi-header">
                <div className="rashi-label">
                  <span className="rashi-badge">רש״י</span>
                  <span className="rashi-title">{isTalmud ? 'Rashi on Gemara' : 'Rashi on Torah'}</span>
                </div>
                <div className="rashi-actions">
                  <CommentarySourceBadge source="Rashi" accuracy="high" />
                </div>
              </div>
              <div className="rashi-content">
                {rashiLoading ? (
                  <div className="rashi-loading">
                    <svg className="loading-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeLinecap="round" />
                    </svg>
                    Loading Rashi...
                  </div>
                ) : rashiComments.length > 0 ? (
                  rashiComments.map((comment, idx) => (
                    <div key={idx} className="rashi-comment" onClick={(e) => e.stopPropagation()}>
                      {comment.dibbur && (
                        <div className="commentary-dibbur rashi-script" dir="rtl" lang="he" style={{ fontFamily: "'Noto Rashi Hebrew', 'Frank Ruhl Libre', serif" }} onClick={(e) => e.stopPropagation()}>
                          <span className="dibbur-marker">ד״ה</span>
                          <strong style={{ fontFamily: "'Noto Rashi Hebrew', 'Frank Ruhl Libre', serif" }}>{processHebrewText(comment.dibbur, { showVowels, showCantillation })}</strong>
                        </div>
                      )}
                      <div className="rashi-view-controls" onClick={(e) => e.stopPropagation()}>
                        <button
                          className={`view-pill ${showSquareScript ? 'active' : ''}`}
                          onClick={() => setShowSquareScript(!showSquareScript)}
                          title="Hebrew square script"
                        >עב</button>
                        {comment.english && (
                          <button
                            className={`view-pill ${showRashiEnglish ? 'active' : ''}`}
                            onClick={() => setShowRashiEnglish(!showRashiEnglish)}
                            title="English translation"
                          >EN</button>
                        )}
                      </div>
                      <div className="rashi-unified-view" onClick={(e) => e.stopPropagation()}>
                        {showSquareScript && (
                          <div className="rashi-layer square-layer" dir="rtl">
                            <span className="layer-tag">עב</span>
                            <span className="layer-text">{processHebrewText(comment.hebrew, { showVowels, showCantillation })}</span>
                          </div>
                        )}
                        <div className="rashi-layer rashi-primary" dir="rtl">
                          <span className="layer-tag">רש״י</span>
                          <span className="layer-text">
                            {enableClickableText ? (
                              <ClickableText
                                language="hebrew"
                                text={processHebrewText(comment.hebrew, { showVowels, showCantillation })}
                                className="rashi-text rashi-script"
                                isRashiScript={true}
                              />
                            ) : processHebrewText(comment.hebrew, { showVowels, showCantillation })}
                          </span>
                        </div>
                        {showRashiEnglish && comment.english ? (
                          <div className={`rashi-layer english-layer ${comment.isTranslated ? 'machine-translated' : ''}`}>
                            <span className="layer-tag">EN{comment.isTranslated ? '*' : ''}</span>
                            <span className="layer-text">{comment.english}</span>
                            {comment.isTranslated && <span className="translation-note" title="Machine translated (not Sefaria)">MT</span>}
                          </div>
                        ) : showRashiEnglish && !comment.english && (
                          <div className="rashi-layer dictionary-layer">
                            <span className="layer-tag">EN (Dict)</span>
                            <DictionaryTranslation text={comment.hebrew} className="rashi-dict-translation" />
                          </div>
                        )}
                      </div>
                      {showFrench && comment.english && (
                        <RashiFrenchTranslation englishText={comment.english} />
                      )}
                    </div>
                  ))
                ) : (
                  <div className="rashi-empty">
                    {isTalmud
                      ? `No Rashi commentary available for ${selectedBook} ${selectedChapter}`
                      : 'No Rashi commentary available for this verse'}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Soncino Footnotes - Talmud */}
          {showSoncino && hasSoncinoAvailable && (
            <div className="soncino-section">
              <div className="soncino-header">
                <div className="soncino-label">
                  <span className="soncino-badge">📚</span>
                  <span className="soncino-title">Soncino English Footnotes</span>
                  <span className="soncino-subtitle">(Scholarly annotations)</span>
                </div>
                <div className="soncino-source">
                  <a href="https://halakhah.com" target="_blank" rel="noopener noreferrer" className="soncino-link">halakhah.com</a>
                  {onToggleSoncino && (
                    <button className="soncino-toggle active" onClick={onToggleSoncino} title="Hide Soncino">✕</button>
                  )}
                </div>
              </div>
              <div className="soncino-content">
                {soncinoLoading ? (
                  <div className="soncino-loading">
                    <svg className="loading-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeLinecap="round" />
                    </svg>
                    Loading Soncino footnotes...
                  </div>
                ) : soncinoComments.length > 0 ? (
                  <div className="soncino-footnotes">
                    {soncinoComments.map((footnote, idx) => (
                      <div key={idx} className={`soncino-footnote ${footnote.mentionsRashi ? 'mentions-rashi' : ''} ${footnote.mentionsTosafot ? 'mentions-tosafot' : ''}`}>
                        <div className="footnote-header">
                          <span className="footnote-number">({footnote.number})</span>
                          {footnote.mentionsRashi && <span className="rashi-tag">רש״י</span>}
                          {footnote.mentionsTosafot && <span className="tosafot-tag">תוס׳</span>}
                        </div>
                        <span className="footnote-text">{footnote.text}</span>
                      </div>
                    ))}
                    <div className="soncino-stats">
                      <span className="stat-total">📊 {soncinoComments.length} footnotes</span>
                      <span className="stat-rashi">רש״י {soncinoComments.filter(f => f.mentionsRashi).length}</span>
                      <span className="stat-tosafot">תוס׳ {soncinoComments.filter(f => f.mentionsTosafot).length}</span>
                    </div>
                  </div>
                ) : (
                  <div className="soncino-empty">
                    {soncinoError ? (
                      <>
                        <span>⚠️ Error loading footnotes</span>
                        <small style={{ display: 'block', marginTop: '4px', opacity: 0.7 }}>{soncinoError}</small>
                      </>
                    ) : (
                      `No Soncino footnotes available for daf ${selectedChapter}`
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tosafot - Talmud */}
          {showTosafot && isTalmud && (
            <div className="tosafot-section">
              <div className="tosafot-header">
                <div className="tosafot-label">
                  <span className="tosafot-badge">תוספות</span>
                  <span className="tosafot-title">Tosafot on Gemara</span>
                </div>
                <CommentarySourceBadge source="Tosafot" accuracy="high" />
              </div>
              <div className="tosafot-content">
                {tosafotLoading ? (
                  <div className="tosafot-loading">
                    <svg className="loading-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeLinecap="round" />
                    </svg>
                    Loading Tosafot...
                  </div>
                ) : tosafotComments.length > 0 ? (
                  tosafotComments.map((comment, idx) => (
                    <div key={idx} className="tosafot-comment">
                      {comment.dibbur && (
                        <div className="tosafot-dibbur" dir="rtl" lang="he">
                          <strong>{processHebrewText(comment.dibbur, { showVowels, showCantillation })}</strong>
                        </div>
                      )}
                      <div className="tosafot-hebrew" dir="rtl" lang="he">
                        {enableClickableText ? (
                          <ClickableText language="hebrew" text={processHebrewText(comment.hebrew, { showVowels, showCantillation })} className="tosafot-text" />
                        ) : (
                          processHebrewText(comment.hebrew, { showVowels, showCantillation })
                        )}
                      </div>
                      {comment.english && (
                        <div className="tosafot-english" lang="en">
                          <span className="translation-label">EN:</span> {comment.english}
                        </div>
                      )}
                      {showFrench && comment.english && (
                        <RashiFrenchTranslation englishText={comment.english} />
                      )}
                    </div>
                  ))
                ) : (
                  <div className="tosafot-empty">No Tosafot commentary available for this daf</div>
                )}
              </div>
            </div>
          )}

          {/* Maharsha - Talmud */}
          {showMaharsha && isTalmud && (
            <div className="maharsha-section">
              <div className="maharsha-header">
                <div className="maharsha-label">
                  <span className="maharsha-badge">מהרש״א</span>
                  <span className="maharsha-title">Maharsha on Gemara</span>
                </div>
                <CommentarySourceBadge source="Maharsha" accuracy="high" />
              </div>
              <div className="maharsha-content">
                {maharshaLoading ? (
                  <div className="maharsha-loading">
                    <svg className="loading-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeLinecap="round" />
                    </svg>
                    Loading Maharsha...
                  </div>
                ) : maharshaComments?.comments?.length > 0 ? (
                  <>
                    {maharshaComments.halachot?.length > 0 && (
                      <div className="maharsha-subsection">
                        <div className="maharsha-subsection-title">חידושי הלכות</div>
                        {maharshaComments.halachot.map((comment, idx) => (
                          <div key={`halachot-${idx}`} className="maharsha-comment">
                            {comment.dibbur && (
                              <div className="maharsha-dibbur" dir="rtl" lang="he">
                                <strong>{processHebrewText(comment.dibbur, { showVowels, showCantillation })}</strong>
                              </div>
                            )}
                            <div className="maharsha-hebrew" dir="rtl" lang="he">
                              {enableClickableText ? (
                                <ClickableText language="hebrew" text={processHebrewText(comment.hebrew, { showVowels, showCantillation })} className="maharsha-text" />
                              ) : (
                                processHebrewText(comment.hebrew, { showVowels, showCantillation })
                              )}
                            </div>
                            {comment.english && (
                              <div className="maharsha-english" lang="en">
                                <span className="translation-label">EN:</span> {comment.english}
                              </div>
                            )}
                            {showFrench && comment.english && (
                              <RashiFrenchTranslation englishText={comment.english} />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {maharshaComments.aggadot?.length > 0 && (
                      <div className="maharsha-subsection">
                        <div className="maharsha-subsection-title">חידושי אגדות</div>
                        {maharshaComments.aggadot.map((comment, idx) => (
                          <div key={`aggadot-${idx}`} className="maharsha-comment">
                            {comment.dibbur && (
                              <div className="maharsha-dibbur" dir="rtl" lang="he">
                                <strong>{processHebrewText(comment.dibbur, { showVowels, showCantillation })}</strong>
                              </div>
                            )}
                            <div className="maharsha-hebrew" dir="rtl" lang="he">
                              {enableClickableText ? (
                                <ClickableText language="hebrew" text={processHebrewText(comment.hebrew, { showVowels, showCantillation })} className="maharsha-text" />
                              ) : (
                                processHebrewText(comment.hebrew, { showVowels, showCantillation })
                              )}
                            </div>
                            {comment.english && (
                              <div className="maharsha-english" lang="en">
                                <span className="translation-label">EN:</span> {comment.english}
                              </div>
                            )}
                            {showFrench && comment.english && (
                              <RashiFrenchTranslation englishText={comment.english} />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="maharsha-empty">No Maharsha commentary available for this daf</div>
                )}
              </div>
            </div>
          )}

          {/* Ramban - Torah */}
          {showRamban && isTorahBook && (
            <div className="ramban-section">
              <div className="ramban-header">
                <div className="ramban-label">
                  <span className="ramban-badge">רמב״ן</span>
                  <span className="ramban-title">Ramban on Torah</span>
                </div>
                <CommentarySourceBadge source="Ramban" accuracy="high" />
              </div>
              <div className="ramban-content">
                {rambanLoading ? (
                  <div className="ramban-loading">
                    <svg className="loading-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeLinecap="round" />
                    </svg>
                    Loading Ramban...
                  </div>
                ) : rambanComments.length > 0 ? (
                  rambanComments.map((comment, idx) => (
                    <div key={idx} className="ramban-comment">
                      {comment.dibbur && (
                        <div className="ramban-dibbur" dir="rtl" lang="he">
                          <strong>{processHebrewText(comment.dibbur, { showVowels, showCantillation })}</strong>
                        </div>
                      )}
                      <div className="ramban-hebrew" dir="rtl" lang="he">
                        {enableClickableText ? (
                          <ClickableText language="hebrew" text={processHebrewText(comment.hebrew, { showVowels, showCantillation })} className="ramban-text" />
                        ) : (
                          processHebrewText(comment.hebrew, { showVowels, showCantillation })
                        )}
                      </div>
                      {comment.english && (
                        <div className="ramban-english" lang="en">
                          <span className="translation-label">EN:</span> {comment.english}
                        </div>
                      )}
                      {showFrench && comment.english && (
                        <RashiFrenchTranslation englishText={comment.english} />
                      )}
                    </div>
                  ))
                ) : (
                  <div className="ramban-empty">No Ramban commentary available for this verse</div>
                )}
              </div>
            </div>
          )}

          {/* Ibn Ezra - Torah */}
          {showIbnEzra && isTorahBook && (
            <div className="ibn-ezra-section">
              <div className="ibn-ezra-header">
                <div className="ibn-ezra-label">
                  <span className="ibn-ezra-badge">אבן עזרא</span>
                  <span className="ibn-ezra-title">Ibn Ezra on Torah</span>
                </div>
                <CommentarySourceBadge source="Ibn Ezra" accuracy="high" />
              </div>
              <div className="ibn-ezra-content">
                {ibnEzraLoading ? (
                  <div className="ibn-ezra-loading">
                    <svg className="loading-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeLinecap="round" />
                    </svg>
                    Loading Ibn Ezra...
                  </div>
                ) : ibnEzraComments.length > 0 ? (
                  ibnEzraComments.map((comment, idx) => (
                    <div key={idx} className="ibn-ezra-comment">
                      {comment.dibbur && (
                        <div className="ibn-ezra-dibbur" dir="rtl" lang="he">
                          <strong>{processHebrewText(comment.dibbur, { showVowels, showCantillation })}</strong>
                        </div>
                      )}
                      <div className="ibn-ezra-hebrew" dir="rtl" lang="he">
                        {enableClickableText ? (
                          <ClickableText language="hebrew" text={processHebrewText(comment.hebrew, { showVowels, showCantillation })} className="ibn-ezra-text" />
                        ) : (
                          processHebrewText(comment.hebrew, { showVowels, showCantillation })
                        )}
                      </div>
                      {comment.english && (
                        <div className="ibn-ezra-english" lang="en">
                          <span className="translation-label">EN:</span> {comment.english}
                        </div>
                      )}
                      {showFrench && comment.english && (
                        <RashiFrenchTranslation englishText={comment.english} />
                      )}
                    </div>
                  ))
                ) : (
                  <div className="ibn-ezra-empty">No Ibn Ezra commentary available for this verse</div>
                )}
              </div>
            </div>
          )}

          {/* Sforno - Torah */}
          {showSforno && isTorahBook && (
            <div className="sforno-section">
              <div className="sforno-header">
                <div className="sforno-label">
                  <span className="sforno-badge">ספורנו</span>
                  <span className="sforno-title">Sforno on Torah</span>
                </div>
                <CommentarySourceBadge source="Sforno" accuracy="high" />
              </div>
              <div className="sforno-content">
                {sfornoLoading ? (
                  <div className="sforno-loading">
                    <svg className="loading-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeLinecap="round" />
                    </svg>
                    Loading Sforno...
                  </div>
                ) : sfornoComments.length > 0 ? (
                  sfornoComments.map((comment, idx) => (
                    <div key={idx} className="sforno-comment">
                      {comment.dibbur && (
                        <div className="sforno-dibbur" dir="rtl" lang="he">
                          <strong>{processHebrewText(comment.dibbur, { showVowels, showCantillation })}</strong>
                        </div>
                      )}
                      <div className="sforno-hebrew" dir="rtl" lang="he">
                        {enableClickableText ? (
                          <ClickableText language="hebrew" text={processHebrewText(comment.hebrew, { showVowels, showCantillation })} className="sforno-text" />
                        ) : (
                          processHebrewText(comment.hebrew, { showVowels, showCantillation })
                        )}
                      </div>
                      {comment.english && (
                        <div className="sforno-english" lang="en">
                          <span className="translation-label">EN:</span> {comment.english}
                        </div>
                      )}
                      {showFrench && comment.english && (
                        <RashiFrenchTranslation englishText={comment.english} />
                      )}
                    </div>
                  ))
                ) : (
                  <div className="sforno-empty">No Sforno commentary available for this verse</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notes section */}
      {hasNote && editingNote !== verse.verse && (
        <div className="verse-note">
          <strong>Note:</strong> {noteText}
        </div>
      )}

      {editingNote === verse.verse && (
        <NoteEditor
          note={noteText || ''}
          onSave={(text) => onSaveNote(verse.verse, text)}
          onClose={() => setEditingNote(null)}
        />
      )}
    </article>
  );
};

VerseRow.propTypes = {
  verse: PropTypes.shape({
    verse: PropTypes.number.isRequired,
    hebrewText: PropTypes.string,
    englishText: PropTypes.string,
    rawEnglishHtml: PropTypes.string
  }).isRequired,
  index: PropTypes.number,
  selectedBook: PropTypes.string.isRequired,
  selectedChapter: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,

  // Display options
  showTranslation: PropTypes.bool,
  showFrench: PropTypes.bool,
  showVowels: PropTypes.bool,
  showCantillation: PropTypes.bool,
  enableClickableText: PropTypes.bool,

  // Commentary data
  commentaryData: PropTypes.object,
  translationData: PropTypes.object,

  // Commentary toggles
  showOnkelos: PropTypes.bool,
  showRashi: PropTypes.bool,
  showTosafot: PropTypes.bool,
  showMaharsha: PropTypes.bool,
  showSoncino: PropTypes.bool,
  showRamban: PropTypes.bool,
  showIbnEzra: PropTypes.bool,
  showSforno: PropTypes.bool,

  // Book type flags
  isTorahBook: PropTypes.bool,
  isTalmud: PropTypes.bool,

  // Onkelos data
  onkelosItem: PropTypes.object,

  // Selection state
  isSelected: PropTypes.bool,
  selectionOrder: PropTypes.number,
  selectionMode: PropTypes.bool,
  hasRipple: PropTypes.bool,
  inDragRange: PropTypes.bool,
  isHighlighted: PropTypes.bool,
  selectedVersesLength: PropTypes.number,

  // Selection handlers
  onToggleSelection: PropTypes.func,
  onDragStart: PropTypes.func,
  onDragMove: PropTypes.func,

  // Verse actions
  onCopy: PropTypes.func,
  onShare: PropTypes.func,
  onSpeak: PropTypes.func,
  onBookmark: PropTypes.func,
  copiedVerse: PropTypes.number,
  speakingVerse: PropTypes.number,
  speaking: PropTypes.bool,
  speechSupported: PropTypes.bool,
  hebrewVoiceAvailable: PropTypes.bool,

  // Note handling
  hasNote: PropTypes.bool,
  noteText: PropTypes.string,
  editingNote: PropTypes.number,
  setEditingNote: PropTypes.func,
  onSaveNote: PropTypes.func,

  // Mastery
  getVerseMastery: PropTypes.func,
  incrementMastery: PropTypes.func,

  // Word lookup
  onSaveWord: PropTypes.func,
  hasWord: PropTypes.func,
  onWordSelect: PropTypes.func,
  selectedWordData: PropTypes.object,

  // Commentary toggle handlers
  onToggleSoncino: PropTypes.func,

  // Rashi view controls
  showSquareScript: PropTypes.bool,
  setShowSquareScript: PropTypes.func,
  showRashiEnglish: PropTypes.bool,
  setShowRashiEnglish: PropTypes.func,

  hasSoncinoAvailable: PropTypes.bool
};

VerseRow.defaultProps = {
  showTranslation: true,
  showFrench: false,
  showVowels: true,
  showCantillation: true,
  enableClickableText: true,
  commentaryData: {},
  translationData: {},
  showOnkelos: false,
  showRashi: false,
  showTosafot: false,
  showMaharsha: false,
  showSoncino: false,
  showRamban: false,
  showIbnEzra: false,
  showSforno: false,
  isTorahBook: false,
  isTalmud: false,
  isSelected: false,
  selectionMode: false,
  hasRipple: false,
  inDragRange: false,
  isHighlighted: false,
  selectedVersesLength: 0,
  showSquareScript: false,
  showRashiEnglish: true,
  hasSoncinoAvailable: false
};

/**
 * PRO SCHOLAR V8: Custom comparator for VerseRow memoization
 *
 * Reduces re-renders by doing smart comparison:
 * - Primitive props: strict equality
 * - Object props: shallow comparison of keys
 * - Function props: always equal (assumed stable via useCallback)
 *
 * This prevents re-renders when parent re-renders with same values.
 */
const arePropsEqual = (prevProps, nextProps) => {
  // Quick bail: different verse numbers always need re-render
  if (prevProps.verse?.verse !== nextProps.verse?.verse) return false;

  // Key props that should trigger re-render
  const keyProps = [
    'isSelected', 'selectionOrder', 'isHighlighted', 'inDragRange', 'hasRipple',
    'showTranslation', 'showFrench', 'showVowels', 'showCantillation',
    'showOnkelos', 'showRashi', 'showTosafot', 'showMaharsha',
    'showSoncino', 'showRamban', 'showIbnEzra', 'showSforno',
    'copiedVerse', 'speakingVerse', 'editingNote', 'mastery'
  ];

  for (const prop of keyProps) {
    if (prevProps[prop] !== nextProps[prop]) return false;
  }

  // Check verse text changes (rare but important)
  if (prevProps.verse?.hebrewText !== nextProps.verse?.hebrewText) return false;
  if (prevProps.verse?.englishText !== nextProps.verse?.englishText) return false;

  // Check onkelos item (object comparison)
  const prevOnkelos = prevProps.onkelosItem;
  const nextOnkelos = nextProps.onkelosItem;
  if ((prevOnkelos == null) !== (nextOnkelos == null)) return false;
  if (prevOnkelos && nextOnkelos && prevOnkelos.text !== nextOnkelos.text) return false;

  // Translation data comparison (check key content)
  const prevTrans = prevProps.translationData || {};
  const nextTrans = nextProps.translationData || {};
  const verseKey = `${nextProps.selectedBook}:${nextProps.selectedChapter}:${nextProps.verse?.verse}`;
  if (prevTrans.frenchTranslations?.[verseKey] !== nextTrans.frenchTranslations?.[verseKey]) return false;

  // All checks passed - props are equal
  return true;
};

export default React.memo(VerseRow, arePropsEqual);
