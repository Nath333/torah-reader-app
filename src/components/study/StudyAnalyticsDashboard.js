/**
 * Study Analytics Dashboard - PRO SCHOLAR v3
 *
 * Comprehensive visualization of learning progress, vocabulary mastery,
 * study patterns, and achievement tracking.
 *
 * Features:
 * - Progress overview with key metrics
 * - Vocabulary mastery heatmap
 * - Study streak calendar
 * - Root family completion tracking
 * - Weak area identification
 * - Time-of-day performance analysis
 * - Achievement/milestone display
 */

import React, { useState, useEffect, useMemo } from 'react';
import './StudyAnalyticsDashboard.css';

// Safe imports with fallbacks
let learningRecommendationService = {};
let wordRelationshipService = {};
let srsService = {};

try {
  learningRecommendationService = require('../../services/learningRecommendationService');
} catch (e) {
  console.warn('Learning recommendation service not available');
}

try {
  wordRelationshipService = require('../../services/wordRelationshipService');
} catch (e) {
  console.warn('Word relationship service not available');
}

try {
  srsService = require('../../services/srsService');
} catch (e) {
  console.warn('SRS service not available');
}

// =============================================================================
// CONSTANTS
// =============================================================================

const TIME_RANGES = {
  WEEK: { value: 'week', label: 'This Week', days: 7 },
  MONTH: { value: 'month', label: 'This Month', days: 30 },
  YEAR: { value: 'year', label: 'This Year', days: 365 },
  ALL: { value: 'all', label: 'All Time', days: Infinity },
};

const CHART_COLORS = {
  primary: '#3b82f6',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#06b6d4',
  purple: '#8b5cf6',
  pink: '#ec4899',
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Stat Card - Individual metric display
 */
function StatCard({ icon, label, value, subValue, trend, color = 'primary' }) {
  const trendIcon = trend > 0 ? '↑' : trend < 0 ? '↓' : '→';
  const trendClass = trend > 0 ? 'positive' : trend < 0 ? 'negative' : 'neutral';

  return (
    <div className={`analytics-stat-card analytics-stat-${color}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-content">
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
        {subValue && <div className="stat-subvalue">{subValue}</div>}
      </div>
      {trend !== undefined && (
        <div className={`stat-trend ${trendClass}`}>
          {trendIcon} {Math.abs(trend)}%
        </div>
      )}
    </div>
  );
}

/**
 * Progress Ring - Circular progress indicator
 */
function ProgressRing({ progress, size = 80, strokeWidth = 8, color = CHART_COLORS.primary }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <svg className="progress-ring" width={size} height={size}>
      <circle
        className="progress-ring-bg"
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={strokeWidth}
      />
      <circle
        className="progress-ring-fill"
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        style={{ stroke: color }}
      />
      <text
        x={size / 2}
        y={size / 2}
        className="progress-ring-text"
        dominantBaseline="middle"
        textAnchor="middle"
      >
        {Math.round(progress)}%
      </text>
    </svg>
  );
}

/**
 * Mini Bar Chart
 */
function MiniBarChart({ data, maxValue, color = CHART_COLORS.primary }) {
  const max = maxValue || Math.max(...data.map(d => d.value), 1);

  return (
    <div className="mini-bar-chart">
      {data.map((item, i) => (
        <div key={i} className="bar-item">
          <div
            className="bar-fill"
            style={{
              height: `${(item.value / max) * 100}%`,
              backgroundColor: item.color || color,
            }}
            title={`${item.label}: ${item.value}`}
          />
          <span className="bar-label">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Streak Calendar - Visual calendar showing study days
 */
function StreakCalendar({ studyDays = [], weeks = 12 }) {
  const today = new Date();
  const days = [];

  for (let i = weeks * 7 - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const studied = studyDays.includes(dateStr);

    days.push({
      date: dateStr,
      studied,
      dayOfWeek: date.getDay(),
    });
  }

  // Group by week
  const weekGroups = [];
  for (let i = 0; i < days.length; i += 7) {
    weekGroups.push(days.slice(i, i + 7));
  }

  return (
    <div className="streak-calendar">
      <div className="calendar-labels">
        <span>Sun</span>
        <span>Mon</span>
        <span>Tue</span>
        <span>Wed</span>
        <span>Thu</span>
        <span>Fri</span>
        <span>Sat</span>
      </div>
      <div className="calendar-grid">
        {weekGroups.map((week, wi) => (
          <div key={wi} className="calendar-week">
            {week.map((day, di) => (
              <div
                key={di}
                className={`calendar-day ${day.studied ? 'studied' : ''}`}
                title={day.date}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Root Family Progress
 */
function RootFamilyProgress({ rootData }) {
  if (!rootData || !rootData.coverage) return null;

  const entries = Object.entries(rootData.coverage)
    .sort((a, b) => b[1].percentage - a[1].percentage)
    .slice(0, 8);

  return (
    <div className="root-family-progress">
      {entries.map(([root, data]) => (
        <div key={root} className="root-item">
          <div className="root-header">
            <span className="root-name">{root}</span>
            <span className="root-count">
              {data.mastered}/{data.total}
            </span>
          </div>
          <div className="root-bar">
            <div
              className="root-bar-fill"
              style={{ width: `${data.percentage}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Milestone Card
 */
function MilestoneCard({ milestone }) {
  const progressColor = milestone.completed
    ? CHART_COLORS.success
    : milestone.progress > 75
    ? CHART_COLORS.primary
    : milestone.progress > 50
    ? CHART_COLORS.warning
    : CHART_COLORS.danger;

  return (
    <div className={`milestone-card ${milestone.completed ? 'completed' : ''}`}>
      <div className="milestone-icon">
        {milestone.completed ? '✅' : milestone.reward?.split(' ')[0] || '🎯'}
      </div>
      <div className="milestone-content">
        <div className="milestone-title">{milestone.title}</div>
        <div className="milestone-hebrew">{milestone.hebrewTitle}</div>
        {!milestone.completed && (
          <div className="milestone-progress-bar">
            <div
              className="milestone-progress-fill"
              style={{
                width: `${milestone.progress}%`,
                backgroundColor: progressColor,
              }}
            />
          </div>
        )}
        <div className="milestone-status">
          {milestone.completed
            ? milestone.reward
            : `${milestone.remaining} remaining`}
        </div>
      </div>
    </div>
  );
}

/**
 * Weak Areas Panel
 */
function WeakAreasPanel({ weakAreas }) {
  if (!weakAreas || weakAreas.length === 0) {
    return (
      <div className="weak-areas-empty">
        <span className="empty-icon">✨</span>
        <span>No weak areas detected!</span>
      </div>
    );
  }

  return (
    <div className="weak-areas-list">
      {weakAreas.slice(0, 5).map((area, i) => (
        <div key={i} className={`weak-area-item severity-${area.severity}`}>
          <div className="weak-area-icon">
            {area.severity === 'high' ? '🔴' : '🟠'}
          </div>
          <div className="weak-area-content">
            <div className="weak-area-name">{area.area}</div>
            <div className="weak-area-recommendation">
              {area.recommendation}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Time Performance Chart
 */
function TimePerformanceChart({ timeStats }) {
  if (!timeStats) return null;

  const data = ['morning', 'afternoon', 'evening'].map(time => ({
    label: time.charAt(0).toUpperCase() + time.slice(1, 4),
    value: timeStats[time]?.avgPerformance * 100 || 0,
    sessions: timeStats[time]?.sessions || 0,
  }));

  const maxPerf = Math.max(...data.map(d => d.value), 1);

  return (
    <div className="time-performance-chart">
      {data.map((item, i) => (
        <div key={i} className="time-slot">
          <div className="time-bar-container">
            <div
              className="time-bar"
              style={{
                height: `${(item.value / maxPerf) * 100}%`,
                backgroundColor:
                  item.value >= 70
                    ? CHART_COLORS.success
                    : item.value >= 50
                    ? CHART_COLORS.warning
                    : CHART_COLORS.danger,
              }}
            />
          </div>
          <div className="time-label">{item.label}</div>
          <div className="time-sessions">{item.sessions} sessions</div>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function StudyAnalyticsDashboard({ onClose }) {
  const [timeRange, setTimeRange] = useState('month');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    progress: null,
    srsStats: null,
    milestones: [],
    weakAreas: [],
    rootAnalysis: null,
    studyFocus: null,
    studyDays: [],
    wordGraphStats: null,
  });

  // Load analytics data
  useEffect(() => {
    async function loadData() {
      setLoading(true);

      try {
        // Get progress summary
        const progress = learningRecommendationService.getProgressSummary?.() || {};

        // Get SRS stats
        const srsStats = srsService.getStats?.() || {};

        // Generate milestones
        const milestones = learningRecommendationService.generateMilestones?.(
          progress.stats || {}
        ) || [];

        // Identify weak areas
        const srsCards = srsService.exportCards?.() || [];
        const weakAnalysis = learningRecommendationService.identifyWeakAreas?.(
          [], // study history
          srsCards
        ) || { weakAreas: [], patterns: {} };

        // Root family analysis
        const masteredWords = srsService.getMasteredCards?.()?.map(c => c.word) || [];
        const rootAnalysis = learningRecommendationService.analyzeRootFamilyGaps?.(
          masteredWords
        ) || {};

        // Study focus
        const studyFocus = learningRecommendationService.getStudyFocus?.({
          srsCards,
          masteredWords,
        }) || {};

        // Word graph stats
        const wordGraphStats = wordRelationshipService.getWordGraphStats?.() || {};

        // Mock study days for calendar (would come from study history)
        const studyDays = generateMockStudyDays();

        setData({
          progress,
          srsStats,
          milestones,
          weakAreas: weakAnalysis.weakAreas || [],
          timeStats: weakAnalysis.patterns?.timeStats || {},
          rootAnalysis,
          studyFocus,
          studyDays,
          wordGraphStats,
        });
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [timeRange]);

  // Generate mock study days for demo
  function generateMockStudyDays() {
    const days = [];
    const today = new Date();

    for (let i = 0; i < 84; i++) {
      if (Math.random() > 0.4) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        days.push(date.toISOString().split('T')[0]);
      }
    }

    return days;
  }

  // Calculated metrics
  const metrics = useMemo(() => {
    const { progress, srsStats, wordGraphStats } = data;

    return {
      vocabularyMastered: progress?.stats?.vocabularyMastered || 0,
      totalReviews: srsStats?.totalReviews || 0,
      dueToday: srsStats?.dueNow || 0,
      studyStreak: progress?.stats?.studyStreak || 0,
      level: progress?.level?.label || 'Beginner',
      levelProgress: progress?.progressToNextLevel || 0,
      versesStudied: progress?.stats?.versesStudied || 0,
      rootFamiliesCovered: data.rootAnalysis?.overallCoverage || 0,
      totalRelationships: wordGraphStats?.totalRelationships || 0,
    };
  }, [data]);

  if (loading) {
    return (
      <div className="analytics-dashboard loading">
        <div className="loading-spinner" />
        <p>Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="analytics-dashboard">
      {/* Header */}
      <header className="analytics-header">
        <div className="header-content">
          <h2>Study Analytics</h2>
          <p className="header-subtitle">PRO SCHOLAR v3</p>
        </div>

        <div className="header-controls">
          <select
            value={timeRange}
            onChange={e => setTimeRange(e.target.value)}
            className="time-range-select"
          >
            {Object.values(TIME_RANGES).map(range => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>

          {onClose && (
            <button className="close-btn" onClick={onClose}>
              ×
            </button>
          )}
        </div>
      </header>

      {/* Main Stats Row */}
      <section className="stats-row">
        <StatCard
          icon="📚"
          label="Words Mastered"
          value={metrics.vocabularyMastered}
          color="primary"
        />
        <StatCard
          icon="🔥"
          label="Study Streak"
          value={`${metrics.studyStreak} days`}
          color="warning"
        />
        <StatCard
          icon="📖"
          label="Verses Studied"
          value={metrics.versesStudied}
          color="success"
        />
        <StatCard
          icon="⏰"
          label="Due Today"
          value={metrics.dueToday}
          subValue="words to review"
          color={metrics.dueToday > 20 ? 'danger' : 'info'}
        />
      </section>

      {/* Level Progress */}
      <section className="analytics-section level-section">
        <div className="level-card">
          <ProgressRing
            progress={metrics.levelProgress}
            size={100}
            color={CHART_COLORS.purple}
          />
          <div className="level-info">
            <div className="level-current">{metrics.level}</div>
            <div className="level-hebrew">
              {data.progress?.level?.hebrewLabel || 'מתחיל'}
            </div>
            {data.progress?.nextLevel && (
              <div className="level-next">
                Next: {data.progress.nextLevel.label}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Two Column Layout */}
      <div className="analytics-grid">
        {/* Left Column */}
        <div className="analytics-column">
          {/* Study Streak Calendar */}
          <section className="analytics-section">
            <h3>Study Activity</h3>
            <StreakCalendar studyDays={data.studyDays} weeks={12} />
          </section>

          {/* Root Family Progress */}
          <section className="analytics-section">
            <h3>Root Family Progress</h3>
            <div className="root-coverage-summary">
              <ProgressRing
                progress={metrics.rootFamiliesCovered}
                size={60}
                strokeWidth={6}
                color={CHART_COLORS.success}
              />
              <span>Overall Coverage</span>
            </div>
            <RootFamilyProgress rootData={data.rootAnalysis} />
          </section>

          {/* Time Performance */}
          <section className="analytics-section">
            <h3>Best Study Times</h3>
            <TimePerformanceChart timeStats={data.timeStats} />
            {data.studyFocus?.bestStudyTime && (
              <p className="best-time-tip">
                Tip: You perform best in the {data.studyFocus.bestStudyTime}!
              </p>
            )}
          </section>
        </div>

        {/* Right Column */}
        <div className="analytics-column">
          {/* Milestones */}
          <section className="analytics-section">
            <h3>Milestones</h3>
            <div className="milestones-grid">
              {data.milestones.slice(0, 6).map(m => (
                <MilestoneCard key={m.id} milestone={m} />
              ))}
            </div>
          </section>

          {/* Weak Areas */}
          <section className="analytics-section">
            <h3>Areas to Improve</h3>
            <WeakAreasPanel weakAreas={data.weakAreas} />
          </section>

          {/* Study Focus */}
          {data.studyFocus?.focus && (
            <section className="analytics-section focus-section">
              <h3>Recommended Focus</h3>
              <div className="focus-card">
                <div className="focus-area">{data.studyFocus.focus.area}</div>
                <div className="focus-reason">{data.studyFocus.focus.reason}</div>
                {data.studyFocus.focus.actions?.length > 0 && (
                  <ul className="focus-actions">
                    {data.studyFocus.focus.actions.map((action, i) => (
                      <li key={i}>{action}</li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          )}

          {/* Word Graph Stats */}
          <section className="analytics-section">
            <h3>Vocabulary Network</h3>
            <div className="network-stats">
              <div className="network-stat">
                <span className="network-value">
                  {data.wordGraphStats?.totalWords || 0}
                </span>
                <span className="network-label">Words</span>
              </div>
              <div className="network-stat">
                <span className="network-value">
                  {data.wordGraphStats?.totalRelationships || 0}
                </span>
                <span className="network-label">Connections</span>
              </div>
              <div className="network-stat">
                <span className="network-value">
                  {data.wordGraphStats?.learnedWords || 0}
                </span>
                <span className="network-label">Learned</span>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* SRS Stats Summary */}
      <section className="analytics-section srs-summary">
        <h3>Spaced Repetition Summary</h3>
        <div className="srs-stats-grid">
          <div className="srs-stat">
            <span className="srs-stat-icon">📊</span>
            <span className="srs-stat-value">{data.srsStats?.totalReviews || 0}</span>
            <span className="srs-stat-label">Total Reviews</span>
          </div>
          <div className="srs-stat">
            <span className="srs-stat-icon">✅</span>
            <span className="srs-stat-value">{data.srsStats?.totalCards || 0}</span>
            <span className="srs-stat-label">Total Cards</span>
          </div>
          <div className="srs-stat">
            <span className="srs-stat-icon">🎓</span>
            <span className="srs-stat-value">{data.srsStats?.mastered || 0}</span>
            <span className="srs-stat-label">Mastered</span>
          </div>
          <div className="srs-stat">
            <span className="srs-stat-icon">📅</span>
            <span className="srs-stat-value">{data.srsStats?.dueToday || 0}</span>
            <span className="srs-stat-label">Due Today</span>
          </div>
          <div className="srs-stat">
            <span className="srs-stat-icon">📆</span>
            <span className="srs-stat-value">{data.srsStats?.dueThisWeek || 0}</span>
            <span className="srs-stat-label">Due This Week</span>
          </div>
          <div className="srs-stat">
            <span className="srs-stat-icon">⚠️</span>
            <span className="srs-stat-value">{data.srsStats?.overdue || 0}</span>
            <span className="srs-stat-label">Overdue</span>
          </div>
        </div>
      </section>
    </div>
  );
}

// Named exports for individual components
export {
  StatCard,
  ProgressRing,
  MiniBarChart,
  StreakCalendar,
  RootFamilyProgress,
  MilestoneCard,
  WeakAreasPanel,
  TimePerformanceChart,
  TIME_RANGES,
  CHART_COLORS,
};
