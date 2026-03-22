import React from 'react';
import useHebrewDate from '../../hooks/useHebrewDate';
import './HeaderGreeting.css';

/**
 * Compact header greeting with Hebrew date
 * Shows greeting and Hebrew date in the toolbar
 * Note: "Continue Reading" is handled by WelcomeBanner to avoid duplication
 */
const HeaderGreeting = () => {
  const { hebrewDate, greeting } = useHebrewDate();

  return (
    <div className="header-greeting">
      <span className="greeting">{greeting.en}</span>
      {hebrewDate && (
        <span className="hebrew-date" dir="rtl" title={hebrewDate.formattedEn}>
          {hebrewDate.formatted}
        </span>
      )}
    </div>
  );
};

export default React.memo(HeaderGreeting);
