import React, { useState } from 'react';
import useHebrewDate from '../../hooks/useHebrewDate';
import './WelcomeBanner.css';

const WelcomeBanner = ({
  parshaName,
  parshaHebrew,
  onNavigateToParsha,
  onNavigateToDaf,
  dafYomi,
  continueReading
}) => {
  const { hebrewDate, greeting } = useHebrewDate();
  const [isVisible, setIsVisible] = useState(true);
  const [isDismissing, setIsDismissing] = useState(false);

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
                {hebrewDate.formatted}
              </span>
              <span className="date-english">
                {hebrewDate.formattedEn}
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
