import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './MishnahLayout.css';
import { ClickableHebrewText } from './ClickableText';
import { getBartenuraForMishnah, getTosafotYomTovForMishnah } from '../services/sefariaApi';
import { removeHtmlTags } from '../utils/sanitize';

/**
 * MishnahLayout - Traditional Mishnah Page Layout
 *
 * Displays like a REAL printed Mishnah with commentaries:
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                     משנה ברכות                                  │
 * │                      פרק א                                      │
 * ├─────────────────────────────────────────────────────────────────┤
 * │  ┌─────────────────────────────────────────────────────────┐   │
 * │  │              MISHNAH TEXT (CENTER)                      │   │
 * │  │         All mishnayot of the chapter                    │   │
 * │  └─────────────────────────────────────────────────────────┘   │
 * │  ┌──────────────────────┐   ┌──────────────────────┐          │
 * │  │      ברטנורא         │   │    תוספות יום טוב     │          │
 * │  │    (Bartenura)       │   │  (Tosfot Yom Tov)    │          │
 * │  └──────────────────────┘   └──────────────────────┘          │
 * └─────────────────────────────────────────────────────────────────┘
 */

// Hebrew seder names
const SEDER_NAMES = {
  'Berakhot': { seder: 'זרעים', tractate: 'ברכות' },
  'Peah': { seder: 'זרעים', tractate: 'פאה' },
  'Demai': { seder: 'זרעים', tractate: 'דמאי' },
  'Kilayim': { seder: 'זרעים', tractate: 'כלאים' },
  'Sheviit': { seder: 'זרעים', tractate: 'שביעית' },
  'Terumot': { seder: 'זרעים', tractate: 'תרומות' },
  'Maasrot': { seder: 'זרעים', tractate: 'מעשרות' },
  'Maaser Sheni': { seder: 'זרעים', tractate: 'מעשר שני' },
  'Challah': { seder: 'זרעים', tractate: 'חלה' },
  'Orlah': { seder: 'זרעים', tractate: 'ערלה' },
  'Bikkurim': { seder: 'זרעים', tractate: 'בכורים' },
  'Shabbat': { seder: 'מועד', tractate: 'שבת' },
  'Eruvin': { seder: 'מועד', tractate: 'עירובין' },
  'Pesachim': { seder: 'מועד', tractate: 'פסחים' },
  'Shekalim': { seder: 'מועד', tractate: 'שקלים' },
  'Yoma': { seder: 'מועד', tractate: 'יומא' },
  'Sukkah': { seder: 'מועד', tractate: 'סוכה' },
  'Beitzah': { seder: 'מועד', tractate: 'ביצה' },
  'Rosh Hashanah': { seder: 'מועד', tractate: 'ראש השנה' },
  'Taanit': { seder: 'מועד', tractate: 'תענית' },
  'Megillah': { seder: 'מועד', tractate: 'מגילה' },
  'Moed Katan': { seder: 'מועד', tractate: 'מועד קטן' },
  'Chagigah': { seder: 'מועד', tractate: 'חגיגה' },
  'Yevamot': { seder: 'נשים', tractate: 'יבמות' },
  'Ketubot': { seder: 'נשים', tractate: 'כתובות' },
  'Nedarim': { seder: 'נשים', tractate: 'נדרים' },
  'Nazir': { seder: 'נשים', tractate: 'נזיר' },
  'Sotah': { seder: 'נשים', tractate: 'סוטה' },
  'Gittin': { seder: 'נשים', tractate: 'גיטין' },
  'Kiddushin': { seder: 'נשים', tractate: 'קידושין' },
  'Bava Kamma': { seder: 'נזיקין', tractate: 'בבא קמא' },
  'Bava Metzia': { seder: 'נזיקין', tractate: 'בבא מציעא' },
  'Bava Batra': { seder: 'נזיקין', tractate: 'בבא בתרא' },
  'Sanhedrin': { seder: 'נזיקין', tractate: 'סנהדרין' },
  'Makkot': { seder: 'נזיקין', tractate: 'מכות' },
  'Shevuot': { seder: 'נזיקין', tractate: 'שבועות' },
  'Eduyot': { seder: 'נזיקין', tractate: 'עדויות' },
  'Avodah Zarah': { seder: 'נזיקין', tractate: 'עבודה זרה' },
  'Avot': { seder: 'נזיקין', tractate: 'אבות' },
  'Horayot': { seder: 'נזיקין', tractate: 'הוריות' },
  'Zevachim': { seder: 'קדשים', tractate: 'זבחים' },
  'Menachot': { seder: 'קדשים', tractate: 'מנחות' },
  'Chullin': { seder: 'קדשים', tractate: 'חולין' },
  'Bekhorot': { seder: 'קדשים', tractate: 'בכורות' },
  'Arakhin': { seder: 'קדשים', tractate: 'ערכין' },
  'Temurah': { seder: 'קדשים', tractate: 'תמורה' },
  'Keritot': { seder: 'קדשים', tractate: 'כריתות' },
  'Meilah': { seder: 'קדשים', tractate: 'מעילה' },
  'Tamid': { seder: 'קדשים', tractate: 'תמיד' },
  'Middot': { seder: 'קדשים', tractate: 'מדות' },
  'Kinnim': { seder: 'קדשים', tractate: 'קינים' },
  'Kelim': { seder: 'טהרות', tractate: 'כלים' },
  'Oholot': { seder: 'טהרות', tractate: 'אהלות' },
  'Negaim': { seder: 'טהרות', tractate: 'נגעים' },
  'Parah': { seder: 'טהרות', tractate: 'פרה' },
  'Tahorot': { seder: 'טהרות', tractate: 'טהרות' },
  'Mikvaot': { seder: 'טהרות', tractate: 'מקואות' },
  'Niddah': { seder: 'טהרות', tractate: 'נדה' },
  'Makhshirin': { seder: 'טהרות', tractate: 'מכשירין' },
  'Zavim': { seder: 'טהרות', tractate: 'זבים' },
  'Tevul Yom': { seder: 'טהרות', tractate: 'טבול יום' },
  'Yadayim': { seder: 'טהרות', tractate: 'ידים' },
  'Oktzin': { seder: 'טהרות', tractate: 'עוקצין' }
};

// Hebrew numerals
const hebrewNumerals = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י',
  'יא', 'יב', 'יג', 'יד', 'טו', 'טז', 'יז', 'יח', 'יט', 'כ',
  'כא', 'כב', 'כג', 'כד', 'כה', 'כו', 'כז', 'כח', 'כט', 'ל'];

const MishnahLayout = ({
  verses = [],
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
  const [bartenuraData, setBartenuraData] = useState([]);
  const [tosafotYomTovData, setTosafotYomTovData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Get tractate info from book name
  const getTractateInfo = (bookName) => {
    // Handle both "Mishnah Berakhot" and "Berakhot" formats
    const cleanName = bookName.replace(/^Mishnah\s+/i, '');
    const info = SEDER_NAMES[cleanName];
    return info || { seder: 'משנה', tractate: cleanName };
  };

  const tractateInfo = useMemo(() => getTractateInfo(selectedBook), [selectedBook]);
  const hebrewChapter = hebrewNumerals[parseInt(selectedChapter)] || selectedChapter;

  // Load commentaries
  useEffect(() => {
    const loadCommentaries = async () => {
      if (verses.length === 0) return;

      setLoading(true);
      setLoadingProgress(0);

      try {
        const tractate = selectedBook.startsWith('Mishnah ')
          ? selectedBook
          : `Mishnah ${selectedBook}`;

        // Load Bartenura for each mishnah
        setLoadingProgress(20);
        const bartenuraPromises = verses.map((verse, idx) =>
          getBartenuraForMishnah(tractate, selectedChapter, idx + 1)
            .then(data => ({ mishnah: idx + 1, data: data || [] }))
            .catch(() => ({ mishnah: idx + 1, data: [] }))
        );
        const bartenuraResults = await Promise.all(bartenuraPromises);

        const allBartenura = [];
        bartenuraResults.forEach(r => {
          r.data.forEach(comment => {
            allBartenura.push({ ...comment, mishnahNum: r.mishnah });
          });
        });
        setBartenuraData(allBartenura);

        setLoadingProgress(60);

        // Load Tosafot Yom Tov for each mishnah
        const tosafotPromises = verses.map((verse, idx) =>
          getTosafotYomTovForMishnah(tractate, selectedChapter, idx + 1)
            .then(data => ({ mishnah: idx + 1, data: data || [] }))
            .catch(() => ({ mishnah: idx + 1, data: [] }))
        );
        const tosafotResults = await Promise.all(tosafotPromises);

        const allTosafot = [];
        tosafotResults.forEach(r => {
          r.data.forEach(comment => {
            allTosafot.push({ ...comment, mishnahNum: r.mishnah });
          });
        });
        setTosafotYomTovData(allTosafot);

        setLoadingProgress(100);
      } catch (error) {
        console.error('Failed to load commentaries:', error);
      }

      setLoading(false);
    };

    loadCommentaries();
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
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: 'smooth' });
          break;
        case 'End':
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

  // Combine Mishnah text with mishnah numbers
  const mishnayot = useMemo(() =>
    verses.map((v, idx) => ({
      num: idx + 1,
      numHebrew: hebrewNumerals[idx + 1] || String(idx + 1),
      hebrew: v.hebrewText,
      english: v.englishText
    })),
    [verses]
  );

  // Commentary Box Component
  const CommentaryBox = useCallback(({ title, hebrewTitle, data, colorClass, icon }) => (
    <div className={`ml-commentary-box ${colorClass}`}>
      <div className="ml-box-header">
        <span className="ml-box-icon">{icon}</span>
        <span className="ml-box-title">{hebrewTitle}</span>
        <span className="ml-box-subtitle">{title}</span>
      </div>
      <div className="ml-box-content" dir="rtl">
        {data.length > 0 ? (
          data.map((item, idx) => (
            <div key={idx} className="ml-entry">
              <span className="ml-mishnah-marker">({hebrewNumerals[item.mishnahNum]})</span>
              {item.dibbur && (
                <span className="ml-dibbur">{item.dibbur} — </span>
              )}
              {enableClickableText ? (
                <ClickableHebrewText
                  text={removeHtmlTags(item.hebrew)}
                  className="ml-commentary-text"
                  onSaveWord={onSaveWord}
                  hasWord={hasWord}
                />
              ) : (
                <span className="ml-commentary-text">{removeHtmlTags(item.hebrew)}</span>
              )}
            </div>
          ))
        ) : (
          <div className="ml-empty">אין {hebrewTitle} לפרק זה</div>
        )}
      </div>
    </div>
  ), [enableClickableText, onSaveWord, hasWord]);

  if (loading) {
    return (
      <div className="mishnah-layout loading-state">
        <div className="ml-loading">
          <div className="ml-loading-header">
            <span className="ml-loading-icon">📖</span>
            <span className="ml-loading-title">משנה</span>
          </div>
          <div className="ml-loading-tractate">{tractateInfo.tractate}</div>
          <div className="ml-loading-seder">סדר {tractateInfo.seder}</div>
          <div className="ml-loading-bar">
            <div
              className="ml-loading-progress"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
          <div className="ml-loading-text">
            טוען פרק {hebrewChapter}... {loadingProgress}%
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mishnah-layout">
      {/* Page Frame */}
      <div className="ml-frame">
        {/* Decorative corners */}
        <div className="ml-corner ml-corner-tl">✡</div>
        <div className="ml-corner ml-corner-tr">✡</div>
        <div className="ml-corner ml-corner-bl">✡</div>
        <div className="ml-corner ml-corner-br">✡</div>

        {/* Page Header */}
        <header className="ml-header">
          {onPrevChapter && (
            <button
              className="ml-nav-btn ml-nav-prev"
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
          <div className="ml-header-seder">סדר {tractateInfo.seder}</div>
          <div className="ml-header-center">
            <h1 className="ml-tractate" dir="rtl">מסכת {tractateInfo.tractate}</h1>
            <div className="ml-chapter-info">
              <span className="ml-perek-label">פרק</span>
              <span className="ml-perek-num">{hebrewChapter}</span>
            </div>
          </div>
          <div className="ml-header-badge">משנה</div>
          {onNextChapter && (
            <button
              className="ml-nav-btn ml-nav-next"
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

        {/* Mishnah Text Section */}
        <section className="ml-mishnah-section">
          <div className="ml-section-header">
            <span className="ml-section-title">מִשְׁנָיוֹת</span>
          </div>
          <div className="ml-mishnah-content" dir="rtl">
            {mishnayot.map((m, idx) => (
              <div key={m.num} className="ml-mishnah-item">
                <span className="ml-mishnah-num">[{m.numHebrew}]</span>
                {enableClickableText ? (
                  <ClickableHebrewText
                    text={m.hebrew}
                    className="ml-mishnah-text"
                    onSaveWord={onSaveWord}
                    hasWord={hasWord}
                  />
                ) : (
                  <span className="ml-mishnah-text">{m.hebrew}</span>
                )}
              </div>
            ))}
          </div>
          {showTranslation && (
            <div className="ml-mishnah-english">
              {mishnayot.map((m, idx) => (
                <div key={m.num} className="ml-english-item">
                  <span className="ml-eng-num">[{m.num}]</span>
                  <span>{m.english}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Two-Column Commentary Section */}
        <section className="ml-commentary-row">
          <CommentaryBox
            title="Bartenura"
            hebrewTitle="רע״ב (ברטנורא)"
            data={bartenuraData}
            colorClass="bartenura-box"
            icon="📜"
          />
          <CommentaryBox
            title="Tosafot Yom Tov"
            hebrewTitle="תוספות יום טוב"
            data={tosafotYomTovData}
            colorClass="tosafot-yom-tov-box"
            icon="📚"
          />
        </section>

        {/* Page Footer */}
        <footer className="ml-footer">
          <span className="ml-footer-left">{selectedBook} • פרק {selectedChapter}</span>
          <span className="ml-footer-center">❦</span>
          <span className="ml-footer-right">מסכת {tractateInfo.tractate} • פרק {hebrewChapter}</span>
        </footer>
      </div>
    </div>
  );
};

export default React.memo(MishnahLayout);
