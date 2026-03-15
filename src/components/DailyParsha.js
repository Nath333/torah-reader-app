import React, { useState, useEffect } from 'react';
import { getWeeklyParsha, getDafYomi, parshaToReference } from '../services/hebcalService';
import { getCalendars } from '../services/sefariaApi';
import { getParshaName, TRADITIONS } from '../services/pronunciationService';
import './DailyParsha.css';

const DailyParsha = ({ onNavigate, tradition = TRADITIONS.SEPHARDIC }) => {
  const [parshaData, setParshaData] = useState(null);
  const [dafYomi, setDafYomi] = useState(null);
  const [calendars, setCalendars] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch parsha, daf yomi, and Sefaria calendars in parallel
        const [parshaResult, dafResult, calendarResult] = await Promise.all([
          getWeeklyParsha(),
          getDafYomi(),
          getCalendars()
        ]);

        setParshaData(parshaResult);
        setDafYomi(dafResult);
        setCalendars(calendarResult);
      } catch (err) {
        console.error('Error fetching daily data:', err);
        setError('Failed to load daily learning');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleParshaClick = () => {
    if (!parshaData?.parsha) return;

    // Get the book and chapter from the parsha name
    const ref = parshaToReference(parshaData.parsha);
    if (ref) {
      onNavigate(ref.book, ref.chapter);
    }
  };

  const handleDafClick = () => {
    if (!dafYomi?.tractate) return;
    // Navigate to the daf - format: "Tractate 42a" -> tractate, "42a"
    onNavigate(dafYomi.tractate, `${dafYomi.daf}a`);
  };

  // Navigate to a calendar item
  const handleCalendarItemClick = (item) => {
    if (!item?.ref) return;

    // Parse the reference to extract book and chapter
    const ref = item.ref.replace(/_/g, ' ');
    const parts = ref.split(/[.\s:]/);

    if (parts.length >= 2) {
      let bookName = parts[0];
      let chapterIdx = 1;

      // Handle multi-word book names
      if (['I', 'II', 'Mishnah', 'Rambam', 'Shulchan'].includes(parts[0])) {
        bookName = `${parts[0]} ${parts[1]}`;
        chapterIdx = 2;
      }

      const chapter = parts[chapterIdx] || '1';
      onNavigate(bookName, chapter);
    }
  };

  // Format the parsha name based on tradition
  const getDisplayParshaName = () => {
    if (!parshaData?.parsha) return 'Loading...';

    // Clean up the parsha name
    const cleanName = parshaData.parsha.replace(/^Parashat\s+/i, '');
    return getParshaName(cleanName, tradition) || cleanName;
  };

  if (loading) {
    return (
      <div className="daily-parsha loading">
        <div className="daily-parsha-skeleton">
          <div className="skeleton-line"></div>
          <div className="skeleton-line short"></div>
        </div>
      </div>
    );
  }

  // Show component even with fallback data (when API fails)
  if (error && !parshaData) {
    return null; // Only hide if we have no data at all
  }

  return (
    <div className={`daily-parsha ${expanded ? 'expanded' : ''} ${parshaData?.isFallback ? 'offline-mode' : ''}`}>
      <div className="daily-parsha-header">
        <div className="daily-parsha-label">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          Daily Learning
          {parshaData?.isFallback && (
            <span className="offline-badge" title="Using offline estimate">
              ~
            </span>
          )}
        </div>
        <button
          className="expand-toggle"
          onClick={() => setExpanded(!expanded)}
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d={expanded ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"} />
          </svg>
        </button>
      </div>

      <div className="daily-parsha-content">
        {/* This Week's Parsha */}
        {parshaData?.parsha && (
          <button
            className="daily-item parsha-item"
            onClick={handleParshaClick}
          >
            <div className="item-icon parsha-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div className="item-content">
              <span className="item-label">Parashat HaShavua</span>
              <span className="item-name">{getDisplayParshaName()}</span>
              {parshaData.parshaHebrew && (
                <span className="item-hebrew">{parshaData.parshaHebrew}</span>
              )}
            </div>
            <div className="item-arrow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
          </button>
        )}

        {/* Daf Yomi - only show when expanded */}
        {expanded && dafYomi && (
          <button
            className="daily-item daf-item"
            onClick={handleDafClick}
          >
            <div className="item-icon daf-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18M9 21V9" />
              </svg>
            </div>
            <div className="item-content">
              <span className="item-label">Daf Yomi</span>
              <span className="item-name">{dafYomi.title}</span>
              {dafYomi.hebrew && (
                <span className="item-hebrew">{dafYomi.hebrew}</span>
              )}
            </div>
            <div className="item-arrow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
          </button>
        )}

        {/* Mishnah Yomit - from Sefaria Calendars */}
        {expanded && calendars?.mishnahYomit && (
          <button
            className="daily-item mishnah-item"
            onClick={() => handleCalendarItemClick(calendars.mishnahYomit)}
          >
            <div className="item-icon mishnah-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
                <path d="M8 7h8M8 11h8M8 15h4" />
              </svg>
            </div>
            <div className="item-content">
              <span className="item-label">Mishnah Yomit</span>
              <span className="item-name">{calendars.mishnahYomit.displayValue?.en || calendars.mishnahYomit.ref}</span>
              {calendars.mishnahYomit.displayValue?.he && (
                <span className="item-hebrew">{calendars.mishnahYomit.displayValue.he}</span>
              )}
            </div>
            <div className="item-arrow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
          </button>
        )}

        {/* Daily Rambam */}
        {expanded && calendars?.dailyRambam && (
          <button
            className="daily-item rambam-item"
            onClick={() => handleCalendarItemClick(calendars.dailyRambam)}
          >
            <div className="item-icon rambam-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <div className="item-content">
              <span className="item-label">Daily Rambam</span>
              <span className="item-name">{calendars.dailyRambam.displayValue?.en || calendars.dailyRambam.ref}</span>
              {calendars.dailyRambam.displayValue?.he && (
                <span className="item-hebrew">{calendars.dailyRambam.displayValue.he}</span>
              )}
            </div>
            <div className="item-arrow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
          </button>
        )}

        {/* Tanakh Yomi / 929 */}
        {expanded && calendars?.tanakhYomi && (
          <button
            className="daily-item tanakh-item"
            onClick={() => handleCalendarItemClick(calendars.tanakhYomi)}
          >
            <div className="item-icon tanakh-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div className="item-content">
              <span className="item-label">Tanakh Yomi (929)</span>
              <span className="item-name">{calendars.tanakhYomi.displayValue?.en || calendars.tanakhYomi.ref}</span>
              {calendars.tanakhYomi.displayValue?.he && (
                <span className="item-hebrew">{calendars.tanakhYomi.displayValue.he}</span>
              )}
            </div>
            <div className="item-arrow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
          </button>
        )}

        {/* Yerushalmi Yomi */}
        {expanded && calendars?.yerushalmiYomi && (
          <button
            className="daily-item yerushalmi-item"
            onClick={() => handleCalendarItemClick(calendars.yerushalmiYomi)}
          >
            <div className="item-icon yerushalmi-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="12" cy="12" r="4" />
              </svg>
            </div>
            <div className="item-content">
              <span className="item-label">Yerushalmi Yomi</span>
              <span className="item-name">{calendars.yerushalmiYomi.displayValue?.en || calendars.yerushalmiYomi.ref}</span>
              {calendars.yerushalmiYomi.displayValue?.he && (
                <span className="item-hebrew">{calendars.yerushalmiYomi.displayValue.he}</span>
              )}
            </div>
            <div className="item-arrow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
          </button>
        )}

        {/* Aliyot info - only show when expanded */}
        {expanded && parshaData?.leyning && (
          <div className="aliyot-info">
            <h4>Torah Reading</h4>
            {parshaData.leyning.torah && (
              <div className="aliyah-item">
                <span className="aliyah-label">Full Reading:</span>
                <span className="aliyah-ref">{parshaData.leyning.torah}</span>
              </div>
            )}
            {parshaData.leyning.maftir && (
              <div className="aliyah-item">
                <span className="aliyah-label">Maftir:</span>
                <span className="aliyah-ref">{parshaData.leyning.maftir}</span>
              </div>
            )}
            {parshaData.leyning.haftarah && (
              <div className="aliyah-item">
                <span className="aliyah-label">Haftarah:</span>
                <span className="aliyah-ref">{parshaData.leyning.haftarah}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(DailyParsha);
