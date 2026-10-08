/**
 * StudyDashboard - Compact study progress and quick actions panel
 *
 * Features:
 * - Study timer with session tracking
 * - Daily progress towards goals
 * - Study streak display
 * - Quick actions for common tasks
 * - Daily learning schedule
 */

import React, { useState, useEffect, useCallback } from 'react';
import useStudySession from '../../hooks/useStudySession';
import { getTodayStats, getLevelProgress, STATS_EVENT } from '../../services/studyTracker';
import { getStats as getSRSStats } from '../../services/srsService';
import { getDailyLearning, getRandomInspiration } from '../../services/scholarlyApiService';
// 2026 Smart Features - Learning Recommendations
import {
  generateRecommendations,
  syncProgress,
  trackStudyActivity,
  LEARNING_LEVELS
} from '../../services/scholarly/learningRecommendationService';
import './StudyDashboard.css';

// =============================================================================
// TIMER DISPLAY
// =============================================================================

const TimerDisplay = ({ time, isActive, onStart, onPause, onStop }) => {
  return (
    <div className="timer-display">
      <div className="timer-time">{time}</div>
      <div className="timer-controls">
        {!isActive ? (
          <button className="timer-btn start" onClick={onStart} title="Démarrer la session">
            ▶
          </button>
        ) : (
          <button className="timer-btn pause" onClick={onPause} title="Pause">
            ⏸
          </button>
        )}
        {isActive && (
          <button className="timer-btn stop" onClick={onStop} title="Terminer la session">
            ⏹
          </button>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// PROGRESS RING
// =============================================================================

const ProgressRing = ({ progress, size = 60, strokeWidth = 6, color = '#3B82F6' }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <svg width={size} height={size} className="progress-ring">
      <circle
        className="progress-ring-bg"
        stroke="#e5e7eb"
        fill="transparent"
        strokeWidth={strokeWidth}
        r={radius}
        cx={size / 2}
        cy={size / 2}
      />
      <circle
        className="progress-ring-progress"
        stroke={color}
        fill="transparent"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        r={radius}
        cx={size / 2}
        cy={size / 2}
        style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dy=".3em"
        className="progress-ring-text"
      >
        {progress}%
      </text>
    </svg>
  );
};

// =============================================================================
// STREAK DISPLAY
// =============================================================================

const StreakDisplay = ({ current, longest }) => {
  return (
    <div className="streak-display">
      <div className="streak-flame">🔥</div>
      <div className="streak-info">
        <span className="streak-current">{current}</span>
        <span className="streak-label">jour{current > 1 ? 's' : ''} d'affilée</span>
      </div>
      {longest > current && (
        <span className="streak-best" title="Record personnel">
          Record : {longest}
        </span>
      )}
    </div>
  );
};

// =============================================================================
// DAILY LEARNING ITEM
// =============================================================================

const DailyLearningItem = ({ item, onSelect }) => {
  if (!item) return null;

  return (
    <button
      className="daily-learning-item"
      onClick={() => onSelect(item)}
      title={item.displayValue?.en || item.ref}
    >
      <span className="daily-item-title">
        {item.title?.en || 'Daily Learning'}
      </span>
      <span className="daily-item-value">
        {item.displayValue?.en || item.ref}
      </span>
    </button>
  );
};

// =============================================================================
// QUICK ACTION BUTTON
// =============================================================================

const QuickAction = ({ icon, label, onClick, badge }) => {
  return (
    <button className="quick-action" onClick={onClick} title={label}>
      <span className="quick-action-icon">{icon}</span>
      {badge > 0 && <span className="quick-action-badge">{badge}</span>}
    </button>
  );
};

// =============================================================================
// LEARNING LEVEL BADGE (2026 Smart Feature)
// =============================================================================

const LevelBadge = ({ level, progress }) => {
  const levelConfig = LEARNING_LEVELS[level] || LEARNING_LEVELS.BEGINNER;

  return (
    <div className="level-badge">
      <div className="level-info">
        <span className="level-icon">🎓</span>
        <span className="level-name">{levelConfig.label}</span>
        <span className="level-hebrew">{levelConfig.hebrewLabel}</span>
      </div>
      {progress && (
        <div className="level-progress">
          <div className="level-progress-bar">
            <div
              className="level-progress-fill"
              style={{ width: `${progress.progressToNextLevel || 0}%` }}
            />
          </div>
          <span className="level-progress-text">
            {Math.round(progress.progressToNextLevel || 0)} % vers le niveau suivant
          </span>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// RECOMMENDATIONS PANEL (2026 Smart Feature)
// =============================================================================

const RecommendationsPanel = ({ recommendations, onSelect }) => {
  if (!recommendations || recommendations.length === 0) return null;

  const typeIcons = {
    verse: '📖',
    topic: '💡',
    review: '🔄',
    challenge: '🎯',
    commentary: '📜'
  };

  return (
    <div className="recommendations-panel">
      <h4>
        <span className="rec-icon">✨</span>
        Suggestions pour toi
      </h4>
      <div className="recommendations-list">
        {recommendations.slice(0, 3).map((rec, i) => (
          <button
            key={i}
            className={`recommendation-item priority-${rec.priority || 'medium'}`}
            onClick={() => onSelect(rec)}
          >
            <span className="rec-type-icon">{typeIcons[rec.type] || '📚'}</span>
            <div className="rec-content">
              <span className="rec-title">{rec.title}</span>
              <span className="rec-reason">{rec.reason}</span>
            </div>
            {rec.count > 0 && (
              <span className="rec-score">{rec.count} à réviser</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const StudyDashboard = ({
  onNavigateToText,
  onOpenVocabulary,
  onOpenBookmarks,
  onOpenNotes,
  compact = false
}) => {
  const {
    isActive,
    formattedTime,
    startSession,
    pauseSession,
    endSession,
    streaks,
    getTodayProgress,
    currentSession
  } = useStudySession();

  const [dailyLearning, setDailyLearning] = useState(null);
  const [inspiration, setInspiration] = useState(null);
  const [showInspiration, setShowInspiration] = useState(false);

  // 2026 Smart Features - Recommendations
  const [recommendations, setRecommendations] = useState([]);

  // Refonte learning : versets lus + niveau en DIRECT (studyTracker, événement)
  const [liveStats, setLiveStats] = useState(getTodayStats);
  const [levelProgress, setLevelProgress] = useState(getLevelProgress);
  useEffect(() => {
    const refresh = () => {
      setLiveStats(getTodayStats());
      setLevelProgress(getLevelProgress());
    };
    refresh();
    window.addEventListener(STATS_EVENT, refresh);
    return () => window.removeEventListener(STATS_EVENT, refresh);
  }, []);

  // Fetch daily learning and recommendations on mount
  useEffect(() => {
    let cancelled = false;

    const buildRecommendations = (learning) => {
      // Aligne les compteurs du moteur de suggestions sur les vraies sources
      // (lecture cumulée + maîtrise SRS) : sans ce pont, niveaux et
      // « Presque … ! » restaient figés sur les valeurs d'origine.
      syncProgress({
        versesStudied: getLevelProgress().versesStudied,
        vocabularyMastered: getSRSStats().mastered
      });
      let recs = generateRecommendations();
      // La parasha de la semaine RÉELLE (ref navigable) remplace la carte
      // systématique « Continuer avec la parasha X » figée à Bereishit.
      const weekly = learning?.parashat;
      if (weekly?.ref) {
        recs = recs.filter(r => r.id !== 'next-parsha');
        recs.unshift({
          id: 'weekly-parasha',
          type: 'parsha',
          priority: 1,
          title: `Parasha de la semaine — ${weekly.displayValue?.en || weekly.ref}`,
          description: 'Ouvrir le début de la parasha courante',
          ref: weekly.ref,
          action: { type: 'navigate' },
          reason: 'Cycle annuel de la lecture'
        });
      }
      return recs;
    };

    const fetchDaily = async () => {
      const learning = await getDailyLearning();
      if (cancelled) return;
      setDailyLearning(learning);
      setRecommendations(buildRecommendations(learning));
    };
    fetchDaily();

    // Suggestions affichées sans attendre le réseau (repli si offline)
    setRecommendations(buildRecommendations(null));

    return () => { cancelled = true; };
  }, []);

  // Handle recommendation selection
  const handleRecommendationSelect = useCallback((rec) => {
    // Track this activity
    trackStudyActivity({
      type: 'recommendation_followed',
      recommendation: rec,
      timestamp: Date.now()
    });

    // 1. Carte avec une référence → navigation dans le lecteur
    //    (« Genesis 1:1-6:8 » passe : onNavigateToText parse book + 1ᵉʳ chapitre)
    if (rec.ref && onNavigateToText) {
      onNavigateToText(rec.ref);
      return;
    }

    // 2. Révisions SRS → la vue Vocabulaire héberge la session de révision
    const actionType = rec.action?.type;
    if ((actionType === 'review' || actionType === 'difficult') && onOpenVocabulary) {
      onOpenVocabulary();
    }
  }, [onNavigateToText, onOpenVocabulary]);

  // Get fresh inspiration
  const refreshInspiration = useCallback(async () => {
    const text = await getRandomInspiration();
    setInspiration(text);
    setShowInspiration(true);
  }, []);

  const todayProgress = getTodayProgress();
  // Minutes totales du jour : lecture automatique (tracker) + sessions chronométrées
  const minutesTotal = {
    value: (liveStats.minutesAuto || 0) + (todayProgress.minutesStudied || 0),
    progress: Math.min(100, Math.round(
      (((liveStats.minutesAuto || 0) + (todayProgress.minutesStudied || 0)) / (todayProgress.goals.dailyMinutes || 30)) * 100
    ))
  };

  const handleEndSession = useCallback(() => {
    endSession();
    // Session data available if needed for summary modal
  }, [endSession]);

  const handleDailySelect = useCallback((item) => {
    if (onNavigateToText && item.ref) {
      onNavigateToText(item.ref);
    }
  }, [onNavigateToText]);

  // Compact view for sidebar
  if (compact) {
    return (
      <div className="study-dashboard compact">
        <div className="dashboard-row">
          <TimerDisplay
            time={formattedTime}
            isActive={isActive}
            onStart={startSession}
            onPause={pauseSession}
            onStop={handleEndSession}
          />
          <StreakDisplay current={streaks.current} longest={streaks.longest} />
        </div>

        <div className="progress-row">
          <div className="progress-item" title={`${minutesTotal.value} / ${todayProgress.goals.dailyMinutes} minutes`}>
            <ProgressRing progress={minutesTotal.progress} size={40} strokeWidth={4} />
            <span className="progress-label">Minutes</span>
          </div>
          <div className="progress-item" title={`${liveStats.versesRead} / ${todayProgress.goals.dailyVerses} versets`}>
            <ProgressRing progress={liveStats.versesProgress} size={40} strokeWidth={4} color="#10B981" />
            <span className="progress-label">Versets</span>
          </div>
          <div className="progress-item" title={`${liveStats.wordsLearned} / ${todayProgress.goals.dailyVocabulary} mots`}>
            <ProgressRing progress={liveStats.wordsProgress} size={40} strokeWidth={4} color="#F59E0B" />
            <span className="progress-label">Mots</span>
          </div>
        </div>
      </div>
    );
  }

  // Full view
  return (
    <div className="study-dashboard">
      {/* Header with timer and streak */}
      <div className="dashboard-header">
        <TimerDisplay
          time={formattedTime}
          isActive={isActive}
          onStart={startSession}
          onPause={pauseSession}
          onStop={handleEndSession}
        />
        <StreakDisplay current={streaks.current} longest={streaks.longest} />
      </div>

      {/* Current session stats (when active) */}
      {isActive && (
        <div className="session-stats">
          <span>📖 {currentSession.versesRead} versets</span>
          <span>📝 {currentSession.wordsLearned} mots</span>
          <span>🔖 {currentSession.bookmarksAdded} favoris</span>
        </div>
      )}

      {/* Progress towards daily goals */}
      <div className="daily-progress">
        <h4>Progrès du jour</h4>
        <div className="progress-grid">
          <div className="progress-item" title="Temps d'étude : lecture + sessions chronométrées">
            <ProgressRing progress={minutesTotal.progress} />
            <div className="progress-details">
              <span className="progress-value">
                {minutesTotal.value} / {todayProgress.goals.dailyMinutes}
              </span>
              <span className="progress-label">Minutes</span>
            </div>
          </div>

          <div className="progress-item" title="Versets uniques lus aujourd'hui (1,5 s de lecture)">
            <ProgressRing progress={liveStats.versesProgress} color="#10B981" />
            <div className="progress-details">
              <span className="progress-value">
                {liveStats.versesRead} / 20
              </span>
              <span className="progress-label">Versets</span>
            </div>
          </div>

          <div className="progress-item" title="Mots appris aujourd'hui (sauvegardés depuis le lecteur)">
            <ProgressRing progress={liveStats.wordsProgress} color="#F59E0B" />
            <div className="progress-details">
              <span className="progress-value">
                {liveStats.wordsLearned} / {todayProgress.goals.dailyVocabulary}
              </span>
              <span className="progress-label">Mots</span>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Learning Schedule */}
      {dailyLearning && (
        <div className="daily-learning">
          <h4>Programme du jour</h4>
          <div className="daily-items">
            {dailyLearning.parashat && (
              <DailyLearningItem
                item={{ ...dailyLearning.parashat, title: { en: 'Parasha' } }}
                onSelect={handleDailySelect}
              />
            )}
            {dailyLearning.dafYomi && (
              <DailyLearningItem
                item={{ ...dailyLearning.dafYomi, title: { en: 'Daf Yomi' } }}
                onSelect={handleDailySelect}
              />
            )}
            {dailyLearning.mishnahYomit && (
              <DailyLearningItem
                item={{ ...dailyLearning.mishnahYomit, title: { en: 'Mishnah' } }}
                onSelect={handleDailySelect}
              />
            )}
          </div>
        </div>
      )}

      {/* Learning Level Badge — progression cumulée réelle (studyTracker) */}
      <LevelBadge
        level={levelProgress.level}
        progress={levelProgress}
      />

      {/* Personalized Recommendations - 2026 Smart Feature */}
      <RecommendationsPanel
        recommendations={recommendations}
        onSelect={handleRecommendationSelect}
      />

      {/* Quick Actions */}
      <div className="quick-actions">
        <QuickAction icon="📚" label="Vocabulaire" onClick={onOpenVocabulary} />
        <QuickAction icon="🔖" label="Favoris" onClick={onOpenBookmarks} />
        <QuickAction icon="📝" label="Notes" onClick={onOpenNotes} />
        <QuickAction icon="✨" label="Inspiration" onClick={refreshInspiration} />
      </div>

      {/* Inspiration Modal */}
      {showInspiration && inspiration && (
        <div className="inspiration-overlay" onClick={() => setShowInspiration(false)}>
          <div className="inspiration-card" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setShowInspiration(false)}>×</button>
            <div className="inspiration-text" dir="rtl" lang="he">
              {inspiration.he}
            </div>
            <div className="inspiration-translation">
              {inspiration.text}
            </div>
            <div className="inspiration-source">
              — {inspiration.heRef || inspiration.ref}
            </div>
            <button className="refresh-btn" onClick={refreshInspiration}>
              Une autre ✨
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudyDashboard;
