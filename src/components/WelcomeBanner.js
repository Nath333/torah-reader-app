import React, { useState, useEffect } from 'react';
import './WelcomeBanner.css';

// Hebrew date conversion utilities
const hebrewMonths = [
  'Nisan', 'Iyar', 'Sivan', 'Tammuz', 'Av', 'Elul',
  'Tishrei', 'Cheshvan', 'Kislev', 'Tevet', 'Shevat', 'Adar'
];

const hebrewMonthsHe = [
  'ניסן', 'אייר', 'סיון', 'תמוז', 'אב', 'אלול',
  'תשרי', 'חשון', 'כסלו', 'טבת', 'שבט', 'אדר'
];

const hebrewNumerals = (num) => {
  const ones = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];

  if (num <= 10) return ones[num] || num.toString();
  if (num < 20) return 'י' + ones[num - 10];
  if (num < 30) return 'כ' + ones[num - 20];
  if (num === 30) return 'ל';
  return num.toString();
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return { en: 'Good Morning', he: 'בוקר טוב' };
  if (hour < 17) return { en: 'Good Afternoon', he: 'צהריים טובים' };
  if (hour < 21) return { en: 'Good Evening', he: 'ערב טוב' };
  return { en: 'Good Night', he: 'לילה טוב' };
};

const WelcomeBanner = ({
  parshaName,
  parshaHebrew,
  onNavigateToParsha,
  onNavigateToDaf,
  dafYomi,
  continueReading
}) => {
  const [hebrewDate, setHebrewDate] = useState(null);
  const [greeting] = useState(getGreeting());
  const [isVisible, setIsVisible] = useState(true);
  const [isDismissing, setIsDismissing] = useState(false);

  useEffect(() => {
    // Fetch Hebrew date from Hebcal API
    const fetchHebrewDate = async () => {
      try {
        const today = new Date();
        const response = await fetch(
          `https://www.hebcal.com/converter?cfg=json&gy=${today.getFullYear()}&gm=${today.getMonth() + 1}&gd=${today.getDate()}&g2h=1`
        );
        const data = await response.json();
        setHebrewDate({
          day: data.hd,
          month: data.hm,
          monthHe: hebrewMonthsHe[hebrewMonths.indexOf(data.hm)] || data.hm,
          year: data.hy,
          dayHe: hebrewNumerals(data.hd)
        });
      } catch {
        // Fallback - just show greeting without Hebrew date
      }
    };
    fetchHebrewDate();
  }, []);

  const handleDismiss = () => {
    setIsDismissing(true);
    setTimeout(() => setIsVisible(false), 400);
  };

  if (!isVisible) return null;

  return (
    <div className={`welcome-banner ${isDismissing ? 'dismissing' : ''}`}>
      <button
        className="welcome-dismiss"
        onClick={handleDismiss}
        aria-label="Dismiss welcome banner"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>

      <div className="welcome-content">
        {/* Left side - Greeting and date */}
        <div className="welcome-greeting">
          <div className="greeting-text">
            <span className="greeting-hebrew">{greeting.he}</span>
            <span className="greeting-english">{greeting.en}</span>
          </div>

          {hebrewDate && (
            <div className="hebrew-date">
              <span className="date-hebrew" dir="rtl">
                {hebrewDate.dayHe} {hebrewDate.monthHe}
              </span>
              <span className="date-english">
                {hebrewDate.day} {hebrewDate.month} {hebrewDate.year}
              </span>
            </div>
          )}
        </div>

        {/* Right side - Quick actions */}
        <div className="welcome-actions">
          {continueReading && (
            <button
              className="quick-action continue-action"
              onClick={continueReading.onClick}
            >
              <div className="action-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </div>
              <div className="action-text">
                <span className="action-label">Continue Reading</span>
                <span className="action-detail">{continueReading.book} {continueReading.chapter}</span>
              </div>
            </button>
          )}

          {parshaName && (
            <button
              className="quick-action parsha-action"
              onClick={onNavigateToParsha}
            >
              <div className="action-icon parsha-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div className="action-text">
                <span className="action-label">This Week's Parsha</span>
                <span className="action-detail">
                  {parshaName}
                  {parshaHebrew && <span className="detail-hebrew">{parshaHebrew}</span>}
                </span>
              </div>
            </button>
          )}

          {dafYomi && (
            <button
              className="quick-action daf-action"
              onClick={onNavigateToDaf}
            >
              <div className="action-icon daf-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M3 9h18M9 21V9" />
                </svg>
              </div>
              <div className="action-text">
                <span className="action-label">Daf Yomi</span>
                <span className="action-detail">{dafYomi.title}</span>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Decorative elements */}
      <div className="welcome-decoration">
        <div className="decoration-circle circle-1"></div>
        <div className="decoration-circle circle-2"></div>
        <div className="decoration-circle circle-3"></div>
      </div>
    </div>
  );
};

export default React.memo(WelcomeBanner);
