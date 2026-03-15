import React, { useState, useEffect, useMemo, useCallback } from 'react';
import './MikraotGedolotPro.css';
import { ClickableHebrewText } from './ClickableText';
import {
  getRashiForVerse,
  getRambanForVerse,
  getIbnEzraForVerse,
  getSfornoForVerse
} from '../services/sefariaApi';
import { removeHtmlTags } from '../utils/sanitize';

/**
 * MikraotGedolotPro - Authentic Traditional Torah Page Layout
 *
 * Displays like a REAL printed Mikraot Gedolot:
 * ┌─────────────────────────────────────────────────────────────┐
 * │                      ספר בראשית                             │
 * │                       פרק א                                 │
 * ├─────────────────────────────────────────────────────────────┤
 * │  ┌─────────────────────────────────────────────────────┐   │
 * │  │           TORAH TEXT (CENTER, LARGER)               │   │
 * │  │    בראשית ברא אלהים את השמים ואת הארץ               │   │
 * │  └─────────────────────────────────────────────────────┘   │
 * │  ┌──────────────┐                    ┌──────────────┐      │
 * │  │   תרגום      │                    │    רש״י      │      │
 * │  │   אונקלוס    │                    │  (Rashi)     │      │
 * │  │   (Onkelos)  │                    │              │      │
 * │  └──────────────┘                    └──────────────┘      │
 * │  ┌──────────────┐   ┌──────────────┐  ┌──────────────┐     │
 * │  │   רמב״ן      │   │  אבן עזרא    │  │   ספורנו    │     │
 * │  │   (Ramban)   │   │  (Ibn Ezra)  │  │  (Sforno)   │     │
 * │  └──────────────┘   └──────────────┘  └──────────────┘     │
 * └─────────────────────────────────────────────────────────────┘
 */

// Hebrew numerals for page numbers
const hebrewNumerals = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י',
  'יא', 'יב', 'יג', 'יד', 'טו', 'טז', 'יז', 'יח', 'יט', 'כ',
  'כא', 'כב', 'כג', 'כד', 'כה', 'כו', 'כז', 'כח', 'כט', 'ל',
  'לא', 'לב', 'לג', 'לד', 'לה', 'לו', 'לז', 'לח', 'לט', 'מ',
  'מא', 'מב', 'מג', 'מד', 'מה', 'מו', 'מז', 'מח', 'מט', 'נ'];

const MikraotGedolotPro = ({
  verses = [],
  onkelos = [],
  selectedBook,
  selectedChapter,
  enableClickableText = true,
  showTranslation = false,
  onSaveWord,
  hasWord,
  // Navigation props
  onPrevChapter,
  onNextChapter,
  hasPrevChapter = true,
  hasNextChapter = true,
}) => {
  const [commentaries, setCommentaries] = useState({
    rashi: [],
    ramban: [],
    ibnEzra: [],
    sforno: []
  });
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Hebrew book names with nikud
  const hebrewBooks = {
    'Genesis': { name: 'בְּרֵאשִׁית', short: 'בראשית' },
    'Exodus': { name: 'שְׁמוֹת', short: 'שמות' },
    'Leviticus': { name: 'וַיִּקְרָא', short: 'ויקרא' },
    'Numbers': { name: 'בְּמִדְבַּר', short: 'במדבר' },
    'Deuteronomy': { name: 'דְּבָרִים', short: 'דברים' },
  };

  // Onkelos lookup
  const onkelosMap = useMemo(() => {
    const map = {};
    onkelos.forEach(item => {
      map[item.verse] = item;
    });
    return map;
  }, [onkelos]);

  // Load all commentaries for the chapter
  useEffect(() => {
    const loadAllCommentaries = async () => {
      if (verses.length === 0) return;

      setLoading(true);
      setLoadingProgress(0);

      try {
        const total = verses.length * 4; // 4 commentators
        let completed = 0;

        const updateProgress = () => {
          completed++;
          setLoadingProgress(Math.round((completed / total) * 100));
        };

        // Load all commentaries in parallel
        const loadCommentary = async (versesArr, fetchFn, name) => {
          const results = [];
          for (const verse of versesArr) {
            try {
              const data = await fetchFn(selectedBook, selectedChapter, verse.verse);
              if (data) {
                const items = Array.isArray(data) ? data : (data.comments || []);
                items.forEach(item => {
                  results.push({ ...item, verseNum: verse.verse });
                });
              }
            } catch (e) {
              // Skip failed verse
            }
            updateProgress();
          }
          return results;
        };

        const [rashi, ramban, ibnEzra, sforno] = await Promise.all([
          loadCommentary(verses, getRashiForVerse, 'rashi'),
          loadCommentary(verses, getRambanForVerse, 'ramban'),
          loadCommentary(verses, getIbnEzraForVerse, 'ibnEzra'),
          loadCommentary(verses, getSfornoForVerse, 'sforno')
        ]);

        setCommentaries({ rashi, ramban, ibnEzra, sforno });
      } catch (error) {
        console.error('Failed to load commentaries:', error);
      }

      setLoading(false);
    };

    loadAllCommentaries();
  }, [verses, selectedBook, selectedChapter]);

  // Keyboard shortcuts for navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      switch (e.key) {
        case 'ArrowLeft':
          // In RTL context, left arrow goes to next chapter
          if (hasNextChapter && onNextChapter) {
            e.preventDefault();
            onNextChapter();
          }
          break;
        case 'ArrowRight':
          // In RTL context, right arrow goes to previous chapter
          if (hasPrevChapter && onPrevChapter) {
            e.preventDefault();
            onPrevChapter();
          }
          break;
        case 'Home':
          // Scroll to top
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: 'smooth' });
          break;
        case 'End':
          // Scroll to bottom
          e.preventDefault();
          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onPrevChapter, onNextChapter, hasPrevChapter, hasNextChapter]);

  const bookInfo = hebrewBooks[selectedBook] || { name: selectedBook, short: selectedBook };
  const hebrewChapter = hebrewNumerals[selectedChapter] || selectedChapter;

  // Combine Torah text
  const torahVerses = verses.map(v => ({
    num: v.verse,
    hebrew: v.hebrewText,
    english: v.englishText,
    onkelos: onkelosMap[v.verse]
  }));

  // Render commentary box
  const CommentaryBox = useCallback(({ title, hebrewTitle, data, colorClass, icon }) => (
    <div className={`mgp-commentary-box ${colorClass}`}>
      <div className="mgp-box-header">
        <span className="mgp-box-icon">{icon}</span>
        <span className="mgp-box-title">{hebrewTitle}</span>
        <span className="mgp-box-subtitle">{title}</span>
      </div>
      <div className="mgp-box-content" dir="rtl">
        {data.length > 0 ? (
          data.map((item, idx) => (
            <div key={idx} className="mgp-entry">
              <span className="mgp-verse-marker">({item.verseNum})</span>
              {item.dibbur && (
                <span className="mgp-dibbur">{item.dibbur} — </span>
              )}
              {enableClickableText ? (
                <ClickableHebrewText
                  text={removeHtmlTags(item.hebrew)}
                  className="mgp-text"
                  onSaveWord={onSaveWord}
                  hasWord={hasWord}
                />
              ) : (
                <span className="mgp-text">{removeHtmlTags(item.hebrew)}</span>
              )}
            </div>
          ))
        ) : (
          <div className="mgp-empty">אין פירוש לפרק זה</div>
        )}
      </div>
    </div>
  ), [enableClickableText, onSaveWord, hasWord]);

  if (loading) {
    return (
      <div className="mikraot-gedolot-pro loading-state">
        <div className="mgp-loading">
          <div className="mgp-loading-sefer">
            <span className="mgp-loading-icon">📜</span>
            <span className="mgp-loading-title">מקראות גדולות</span>
          </div>
          <div className="mgp-loading-bar">
            <div
              className="mgp-loading-progress"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
          <div className="mgp-loading-text">
            טוען פירושים... {loadingProgress}%
          </div>
          <div className="mgp-loading-sub">
            Loading {bookInfo.short} Chapter {selectedChapter}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mikraot-gedolot-pro">
      {/* Ornate Page Frame */}
      <div className="mgp-frame">
        {/* Decorative corners */}
        <div className="mgp-corner mgp-corner-tl">❧</div>
        <div className="mgp-corner mgp-corner-tr">❧</div>
        <div className="mgp-corner mgp-corner-bl">❧</div>
        <div className="mgp-corner mgp-corner-br">❧</div>

        {/* Page Header */}
        <header className="mgp-header">
          {onPrevChapter && (
            <button
              className="mgp-nav-btn mgp-nav-prev"
              onClick={onPrevChapter}
              disabled={!hasPrevChapter}
              title="Previous chapter"
              aria-label="Previous chapter"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          )}
          <div className="mgp-header-decoration">✡</div>
          <div className="mgp-header-main">
            <h1 className="mgp-sefer" dir="rtl">{bookInfo.name}</h1>
            <div className="mgp-chapter-info">
              <span className="mgp-perek-label">פרק</span>
              <span className="mgp-perek-num">{hebrewChapter}</span>
            </div>
          </div>
          <div className="mgp-header-badge">מקראות גדולות</div>
          {onNextChapter && (
            <button
              className="mgp-nav-btn mgp-nav-next"
              onClick={onNextChapter}
              disabled={!hasNextChapter}
              title="Next chapter"
              aria-label="Next chapter"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          )}
        </header>

        {/* Main Torah Text - Center Stage */}
        <section className="mgp-torah-section">
          <div className="mgp-torah-header">
            <div className="mgp-torah-title">פְּסוּקֵי הַתּוֹרָה</div>
          </div>
          <div className="mgp-torah-content" dir="rtl">
            {torahVerses.map((v, idx) => (
              <span key={v.num} className="mgp-pasuk">
                <span className="mgp-pasuk-num">{v.num}</span>
                {enableClickableText ? (
                  <ClickableHebrewText
                    text={v.hebrew}
                    className="mgp-pasuk-text"
                    onSaveWord={onSaveWord}
                    hasWord={hasWord}
                  />
                ) : (
                  <span className="mgp-pasuk-text">{v.hebrew}</span>
                )}
                {idx < torahVerses.length - 1 && <span className="mgp-pasuk-sep"> </span>}
              </span>
            ))}
          </div>
          {showTranslation && (
            <div className="mgp-torah-english">
              {torahVerses.map((v, idx) => (
                <span key={v.num}>
                  <sup className="mgp-eng-num">{v.num}</sup>
                  {v.english}
                  {idx < torahVerses.length - 1 && ' '}
                </span>
              ))}
            </div>
          )}
        </section>

        {/* Two-Column Upper Commentaries: Onkelos + Rashi */}
        <section className="mgp-upper-row">
          {/* Onkelos */}
          <div className="mgp-commentary-box onkelos-box">
            <div className="mgp-box-header">
              <span className="mgp-box-icon">🔤</span>
              <span className="mgp-box-title">תַּרְגּוּם אוּנְקְלוֹס</span>
              <span className="mgp-box-subtitle">Targum Onkelos</span>
            </div>
            <div className="mgp-box-content" dir="rtl">
              {torahVerses.filter(v => v.onkelos).length > 0 ? (
                torahVerses.filter(v => v.onkelos).map((v, idx) => (
                  <div key={idx} className="mgp-entry">
                    <span className="mgp-verse-marker">({v.num})</span>
                    <span className="mgp-aramaic">{v.onkelos.aramaic}</span>
                  </div>
                ))
              ) : (
                <div className="mgp-empty">אין תרגום</div>
              )}
            </div>
          </div>

          {/* Rashi */}
          <CommentaryBox
            title="Rashi"
            hebrewTitle="רַשִׁ״י"
            data={commentaries.rashi}
            colorClass="rashi-box"
            icon="📖"
          />
        </section>

        {/* Three-Column Lower Commentaries: Ramban, Ibn Ezra, Sforno */}
        <section className="mgp-lower-row">
          <CommentaryBox
            title="Ramban"
            hebrewTitle="רַמְבַּ״ן"
            data={commentaries.ramban}
            colorClass="ramban-box"
            icon="📿"
          />
          <CommentaryBox
            title="Ibn Ezra"
            hebrewTitle="אִבְּן עֶזְרָא"
            data={commentaries.ibnEzra}
            colorClass="ibnezra-box"
            icon="✨"
          />
          <CommentaryBox
            title="Sforno"
            hebrewTitle="סְפוֹרְנוֹ"
            data={commentaries.sforno}
            colorClass="sforno-box"
            icon="🌟"
          />
        </section>

        {/* Page Footer */}
        <footer className="mgp-footer">
          <span className="mgp-footer-left">{bookInfo.short} • פרק {hebrewChapter}</span>
          <span className="mgp-footer-center">❦</span>
          <span className="mgp-footer-right">{selectedBook} {selectedChapter}</span>
        </footer>
      </div>
    </div>
  );
};

export default React.memo(MikraotGedolotPro);
