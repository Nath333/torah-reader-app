// =============================================================================
// STUDY INSIGHTS PANEL - PRO SCHOLAR V6
// Shows semantic field clustering, word frequency, and learning insights
// =============================================================================

import React, { useState, useMemo, useEffect } from 'react';
import PropTypes from 'prop-types';
import './StudyInsightsPanel.css';

// PRO SCHOLAR V6: Telemetry and semantic field detection
import { getTelemetry, getSemanticField } from '../../services/unifiedRootService';

// =============================================================================
// SEMANTIC FIELD DEFINITIONS (from proScholarV6)
// =============================================================================

const SEMANTIC_FIELDS = {
  TUMAH_TAHARAH: {
    name: 'Tumah/Taharah',
    hebrewName: 'טומאה וטהרה',
    description: 'Purity & Impurity laws',
    icon: '💧',
    color: '#EF4444',
    tractates: ['Kelim', 'Oholot', 'Negaim', 'Parah', 'Tohorot', 'Mikvaot', 'Niddah']
  },
  KODASHIM: {
    name: 'Kodashim',
    hebrewName: 'קודשים',
    description: 'Temple & Sacrifices',
    icon: '🔥',
    color: '#F97316',
    tractates: ['Zevachim', 'Menachot', 'Chullin', 'Bechorot', 'Arachin', 'Temurah']
  },
  SHABBAT: {
    name: 'Shabbat',
    hebrewName: 'שבת',
    description: 'Sabbath laws',
    icon: '🕯️',
    color: '#6366F1',
    tractates: ['Shabbat', 'Eruvin', 'Beitzah']
  },
  NEZIKIN: {
    name: 'Nezikin',
    hebrewName: 'נזיקין',
    description: 'Damages & Civil law',
    icon: '⚖️',
    color: '#DC2626',
    tractates: ['Bava Kamma', 'Bava Metzia', 'Bava Batra', 'Sanhedrin']
  },
  NASHIM: {
    name: 'Nashim',
    hebrewName: 'נשים',
    description: 'Family law',
    icon: '💍',
    color: '#D946EF',
    tractates: ['Yevamot', 'Ketubot', 'Gittin', 'Kiddushin', 'Sotah']
  },
  BERAKHOT: {
    name: 'Berakhot',
    hebrewName: 'ברכות',
    description: 'Prayer & Blessings',
    icon: '🙏',
    color: '#14B8A6',
    tractates: ['Berakhot']
  },
  MOADIM: {
    name: 'Moadim',
    hebrewName: 'מועדים',
    description: 'Festivals',
    icon: '🎉',
    color: '#84CC16',
    tractates: ['Pesachim', 'Sukkah', 'Rosh Hashanah', 'Yoma', 'Megillah', 'Taanit']
  },
  LEGAL: {
    name: 'Legal Terms',
    hebrewName: 'מושגי הלכה',
    description: 'Halachic terminology',
    icon: '📜',
    color: '#8B5CF6',
    tractates: []
  },
  DIALECTIC: {
    name: 'Dialectical',
    hebrewName: 'סגנון סוגיא',
    description: 'Talmudic argumentation',
    icon: '🔗',
    color: '#F59E0B',
    tractates: []
  }
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Semantic Field Card - Shows a single semantic field with word count
 */
const SemanticFieldCard = ({ field, fieldKey, words, onClick }) => {
  const info = SEMANTIC_FIELDS[fieldKey] || SEMANTIC_FIELDS.LEGAL;

  return (
    <button
      className="semantic-field-card"
      style={{ '--field-color': info.color }}
      onClick={() => onClick?.(fieldKey, words)}
    >
      <div className="field-icon">{info.icon}</div>
      <div className="field-content">
        <div className="field-name">{info.name}</div>
        <div className="field-hebrew">{info.hebrewName}</div>
        {words?.length > 0 && (
          <div className="field-words">
            {words.slice(0, 3).map((w, i) => (
              <span key={i} className="field-word">{w}</span>
            ))}
            {words.length > 3 && (
              <span className="field-more">+{words.length - 3}</span>
            )}
          </div>
        )}
      </div>
      <div className="field-count">{words?.length || 0}</div>
    </button>
  );
};

/**
 * Performance Stats Card - Shows telemetry data
 */
const PerformanceStats = ({ telemetry }) => {
  if (!telemetry) return null;

  return (
    <div className="performance-stats">
      <div className="stats-header">
        <span className="stats-icon">⚡</span>
        <span className="stats-title">Performance</span>
      </div>
      <div className="stats-grid">
        <div className="stat-item">
          <span className="stat-value">{telemetry.hitRate}</span>
          <span className="stat-label">Cache Hit Rate</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{telemetry.avgLookupMs}ms</span>
          <span className="stat-label">Avg Lookup</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{telemetry.lookups}</span>
          <span className="stat-label">Total Lookups</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{telemetry.weakVerbsDetected}</span>
          <span className="stat-label">Weak Verbs</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{telemetry.particlesFound}</span>
          <span className="stat-label">Particles</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{telemetry.cacheStats?.size || 0}</span>
          <span className="stat-label">Cached</span>
        </div>
      </div>
    </div>
  );
};

/**
 * Word Frequency Bar - Shows relative frequency
 */
const WordFrequencyBar = ({ word, frequency, maxFrequency }) => {
  const percentage = maxFrequency > 0 ? (frequency / maxFrequency) * 100 : 0;

  return (
    <div className="word-frequency-bar">
      <span className="freq-word">{word}</span>
      <div className="freq-bar-container">
        <div
          className="freq-bar-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="freq-count">{frequency}</span>
    </div>
  );
};

/**
 * Learning Progress Ring
 */
const LearningProgressRing = ({ learned, total, label }) => {
  const percentage = total > 0 ? Math.round((learned / total) * 100) : 0;
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="progress-ring-container">
      <svg className="progress-ring" width="100" height="100">
        <circle
          className="progress-ring-bg"
          cx="50"
          cy="50"
          r="40"
          fill="none"
          strokeWidth="8"
        />
        <circle
          className="progress-ring-fill"
          cx="50"
          cy="50"
          r="40"
          fill="none"
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform="rotate(-90 50 50)"
        />
        <text
          x="50"
          y="50"
          textAnchor="middle"
          dominantBaseline="middle"
          className="progress-text"
        >
          {percentage}%
        </text>
      </svg>
      <div className="progress-label">{label}</div>
      <div className="progress-detail">{learned} / {total}</div>
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * StudyInsightsPanel - Comprehensive study analytics and insights
 */
const StudyInsightsPanel = ({
  words = [],
  lookupHistory = [],
  vocabLearned = 0,
  vocabTotal = 0,
  onFieldClick,
  onWordClick,
  showPerformance = true,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState('semantic');
  const [telemetry, setTelemetry] = useState(null);

  // Refresh telemetry
  useEffect(() => {
    if (showPerformance) {
      try {
        setTelemetry(getTelemetry());
      } catch (e) {
        // V6 not available
      }
    }
  }, [showPerformance, lookupHistory.length]);

  // Analyze words by semantic field
  const semanticAnalysis = useMemo(() => {
    const fieldMap = {};

    for (const word of words) {
      try {
        const result = getSemanticField(word);
        if (result?.field) {
          if (!fieldMap[result.field]) {
            fieldMap[result.field] = [];
          }
          fieldMap[result.field].push(word);
        }
      } catch (e) {
        // Skip word
      }
    }

    return Object.entries(fieldMap)
      .map(([field, words]) => ({ field, words }))
      .sort((a, b) => b.words.length - a.words.length);
  }, [words]);

  // Analyze word frequency from lookup history
  const frequencyAnalysis = useMemo(() => {
    const freqMap = {};
    for (const item of lookupHistory) {
      const word = item.word || item;
      freqMap[word] = (freqMap[word] || 0) + 1;
    }

    return Object.entries(freqMap)
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [lookupHistory]);

  const maxFrequency = frequencyAnalysis.length > 0 ? frequencyAnalysis[0].count : 0;

  return (
    <div className={`study-insights-panel ${className}`}>
      <div className="insights-header">
        <span className="insights-icon">📊</span>
        <span className="insights-title">Study Insights</span>
        <span className="insights-badge">PRO SCHOLAR V6</span>
      </div>

      {/* Tab Navigation */}
      <div className="insights-tabs">
        <button
          className={`tab ${activeTab === 'semantic' ? 'active' : ''}`}
          onClick={() => setActiveTab('semantic')}
        >
          Semantic Fields
        </button>
        <button
          className={`tab ${activeTab === 'frequency' ? 'active' : ''}`}
          onClick={() => setActiveTab('frequency')}
        >
          Frequency
        </button>
        <button
          className={`tab ${activeTab === 'progress' ? 'active' : ''}`}
          onClick={() => setActiveTab('progress')}
        >
          Progress
        </button>
      </div>

      <div className="insights-content">
        {/* Semantic Fields Tab */}
        {activeTab === 'semantic' && (
          <div className="semantic-fields-grid">
            {semanticAnalysis.length > 0 ? (
              semanticAnalysis.map(({ field, words }) => (
                <SemanticFieldCard
                  key={field}
                  fieldKey={field}
                  words={words}
                  onClick={onFieldClick}
                />
              ))
            ) : (
              <div className="empty-state">
                <span className="empty-icon">📚</span>
                <span className="empty-text">
                  Look up words to see semantic field analysis
                </span>
              </div>
            )}
          </div>
        )}

        {/* Frequency Tab */}
        {activeTab === 'frequency' && (
          <div className="frequency-analysis">
            {frequencyAnalysis.length > 0 ? (
              <div className="frequency-list">
                {frequencyAnalysis.map(({ word, count }) => (
                  <WordFrequencyBar
                    key={word}
                    word={word}
                    frequency={count}
                    maxFrequency={maxFrequency}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <span className="empty-icon">🔍</span>
                <span className="empty-text">
                  Word frequency will appear as you study
                </span>
              </div>
            )}
          </div>
        )}

        {/* Progress Tab */}
        {activeTab === 'progress' && (
          <div className="progress-section">
            <div className="progress-rings">
              <LearningProgressRing
                learned={vocabLearned}
                total={vocabTotal || 100}
                label="Vocabulary"
              />
            </div>

            {showPerformance && telemetry && (
              <PerformanceStats telemetry={telemetry} />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

StudyInsightsPanel.propTypes = {
  words: PropTypes.arrayOf(PropTypes.string),
  lookupHistory: PropTypes.array,
  vocabLearned: PropTypes.number,
  vocabTotal: PropTypes.number,
  onFieldClick: PropTypes.func,
  onWordClick: PropTypes.func,
  showPerformance: PropTypes.bool,
  className: PropTypes.string,
};

// Export sub-components
export {
  SemanticFieldCard,
  PerformanceStats,
  WordFrequencyBar,
  LearningProgressRing,
  SEMANTIC_FIELDS
};

export default React.memo(StudyInsightsPanel);
