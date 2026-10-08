import React, { useMemo } from 'react';
import { useStudyMode, STUDY_MODE_CONFIG } from '../../../../context/StudyModeContext';
import useLocalStorage from '../../../../hooks/useLocalStorage';

// =============================================================================
// Today Section (with StudyModeSelector)
// =============================================================================
export const TodaySection = ({ currentBook, currentChapter }) => {
  const [learningLog] = useLocalStorage('limmudLog', {
    entries: [],
    chiddushim: []
  });

  const {
    kushyot = [],
    getOpenKushyot,
    currentMode,
    switchMode,
    features,
    currentSession
  } = useStudyMode();

  const todayStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();

    const todayInsights = learningLog.chiddushim.filter(c => c.timestamp >= todayTimestamp);
    const todayQuestions = kushyot.filter(k => k.createdAt >= todayTimestamp);
    const todayResolved = kushyot.filter(k =>
      k.status === 'resolved' && k.resolvedAt >= todayTimestamp
    );

    // Calculate streak (simple version)
    let streak = 0;
    const dates = learningLog.chiddushim.map(c => {
      const d = new Date(c.timestamp);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    });
    const uniqueDates = [...new Set(dates)].sort((a, b) => b - a);

    if (uniqueDates.length > 0 && uniqueDates[0] === todayTimestamp) {
      streak = 1;
      for (let i = 1; i < uniqueDates.length; i++) {
        const diff = uniqueDates[i - 1] - uniqueDates[i];
        if (diff <= 86400000) { // 1 day in ms
          streak++;
        } else {
          break;
        }
      }
    }

    return {
      insights: todayInsights.length,
      questions: todayQuestions.length,
      resolved: todayResolved.length,
      streak,
      openQuestions: getOpenKushyot?.()?.length || 0
    };
  }, [learningLog, kushyot, getOpenKushyot]);

  const getDayGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: 'בוקר טוב', english: 'Bonjour' };
    if (hour < 17) return { text: 'צהריים טובים', english: 'Bon après-midi' };
    if (hour < 21) return { text: 'ערב טוב', english: 'Bonne soirée' };
    return { text: 'לילה טוב', english: 'Bonne nuit' };
  };

  const greeting = getDayGreeting();

  // Get current mode config
  const modeConfig = STUDY_MODE_CONFIG?.[currentMode] || {
    name: 'עיון',
    englishName: 'In-depth Study',
    icon: '📖',
    description: 'Deep analytical study'
  };

  return (
    <div className="today-section">
      {/* Greeting */}
      <div className="greeting-card">
        <span className="greeting-hebrew">{greeting.text}</span>
        <span className="greeting-english">{greeting.english}</span>
        {todayStats.streak > 1 && (
          <div className="streak-badge">
            🔥 {todayStats.streak} day streak!
          </div>
        )}
      </div>

      {/* Study Mode Selector (from YeshivaTab) */}
      <div className="study-mode-selector-card">
        <div className="mode-header">
          <h4>לימוד Mode</h4>
          {currentSession && (
            <span className="session-active">Session Active</span>
          )}
        </div>
        <div className="mode-buttons">
          {STUDY_MODE_CONFIG && Object.entries(STUDY_MODE_CONFIG).map(([mode, config]) => (
            <button
              key={mode}
              className={`mode-btn ${mode === currentMode ? 'active' : ''}`}
              onClick={() => switchMode?.(mode)}
            >
              <span className="mode-icon">{config.icon}</span>
              <span className="mode-name">{config.name}</span>
              <span className="mode-english">{config.englishName?.split(' ')[0]}</span>
            </button>
          ))}
        </div>
        <p className="mode-description">{modeConfig.description}</p>
        <div className="mode-features">
          <FeatureIndicator label="Commentaries" enabled={features?.showAllCommentaries} />
          <FeatureIndicator label="AI" enabled={features?.enableAI} />
          <FeatureIndicator label="Cross-refs" enabled={features?.showCrossRefs} />
          {features?.enableSRS && <FeatureIndicator label="SRS" enabled={true} highlight />}
        </div>
      </div>

      {/* Today's Stats */}
      <div className="today-stats">
        <div className="today-stat">
          <span className="stat-icon">✨</span>
          <span className="stat-value">{todayStats.insights}</span>
          <span className="stat-label">Insights</span>
        </div>
        <div className="today-stat">
          <span className="stat-icon">❓</span>
          <span className="stat-value">{todayStats.questions}</span>
          <span className="stat-label">Questions</span>
        </div>
        <div className="today-stat">
          <span className="stat-icon">✅</span>
          <span className="stat-value">{todayStats.resolved}</span>
          <span className="stat-label">Resolved</span>
        </div>
      </div>

      {/* Open Questions Reminder */}
      {todayStats.openQuestions > 0 && (
        <div className="reminder-card">
          <span className="reminder-icon">📋</span>
          <div className="reminder-content">
            <strong>{todayStats.openQuestions} open questions</strong>
            <p>Consider reviewing and resolving your kushyot</p>
          </div>
        </div>
      )}

      {/* Motivational Quote */}
      <div className="quote-card">
        <p className="quote-text">
          "הלומד תורה מקיים את העולם"
        </p>
        <p className="quote-translation">
          "One who studies Torah sustains the world"
        </p>
      </div>

      {/* Current Context */}
      {currentBook && currentChapter && (
        <div className="context-card">
          <span className="context-label">Currently Studying:</span>
          <span className="context-ref">{currentBook} {currentChapter}</span>
        </div>
      )}
    </div>
  );

// Feature indicator component for study mode
};

const FeatureIndicator = ({ label, enabled, highlight = false }) => (
  <span className={`feature-indicator ${enabled ? 'enabled' : 'disabled'} ${highlight ? 'highlight' : ''}`}>
    <span className="feature-dot">{enabled ? '●' : '○'}</span>
    <span className="feature-label">{label}</span>
  </span>
);
