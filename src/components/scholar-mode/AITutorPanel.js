/**
 * AITutorPanel - AI-Enhanced Talmud Study Interface
 *
 * PRO SCHOLAR V31: Interactive AI tutor for guided Talmud learning
 *
 * Features:
 * - Contextual questions based on current sugya
 * - Study mode awareness (Iyun/Bekius/Chazara)
 * - Progressive learning prompts
 * - Explanation requests with depth control
 * - Integration with study notes
 *
 * INTEGRATION: This component is exported from scholar-mode/index.js
 * Can be integrated into TalmudToolsTab or ChavrutaTab for AI-powered tutoring.
 *
 * Usage:
 *   import { AITutorPanel } from '../scholar-mode';
 *   <AITutorPanel
 *     text={talmudText}
 *     reference="Shabbat 2a"
 *     studyMode="iyun"
 *     onAskQuestion={(q, ctx) => handleAIQuestion(q, ctx)}
 *   />
 */
import React, { useState, useMemo, useCallback, memo } from 'react';
import PropTypes from 'prop-types';
import './AITutorPanel.css';

// =============================================================================
// TUTOR PROMPT CATEGORIES
// =============================================================================

const TUTOR_CATEGORIES = {
  understanding: {
    icon: '🤔',
    label: 'הבנה',
    prompts: [
      'הסבר את עיקר הסוגיא בשפה פשוטה',
      'מהי השאלה המרכזית?',
      'מה הקשר בין המשנה לגמרא?'
    ]
  },
  sevara: {
    icon: '💡',
    label: 'סברא',
    prompts: [
      'מהי הסברא מאחורי הדין?',
      'מדוע הגמרא שואלת דווקא כאן?',
      'מה ההגיון בתירוץ?'
    ]
  },
  practical: {
    icon: '⚖️',
    label: 'הלכה למעשה',
    prompts: [
      'מה ההלכה למעשה?',
      'האם יש נפקא מינה?',
      'איך פוסקים?'
    ]
  },
  connections: {
    icon: '🔗',
    label: 'קשרים',
    prompts: [
      'היכן יש סוגיא מקבילה?',
      'מה הקשר לסוגיות אחרות?',
      'האם יש מחלוקת ראשונים?'
    ]
  }
};

// Study mode specific prompts
const STUDY_MODE_PROMPTS = {
  iyun: [
    'נתח את השקלא וטריא שלב אחר שלב',
    'מהן ההנחות הסמויות?',
    'היכן נקודת המחלוקת?'
  ],
  bekius: [
    'סכם את הסוגיא בשלוש נקודות',
    'מהו עיקר הדין?',
    'מה חידשנו כאן?'
  ],
  chazara: [
    'בחן אותי על הסוגיא',
    'מה צריך לזכור?',
    'תן לי שאלות חזרה'
  ]
};

// =============================================================================
// TUTOR QUESTION CARD
// =============================================================================

const TutorQuestionCard = memo(function TutorQuestionCard({
  category,
  onAsk,
  disabled
}) {
  const config = TUTOR_CATEGORIES[category];
  if (!config) return null;

  return (
    <div className="tutor-category-card" dir="rtl">
      <div className="category-header">
        <span className="category-icon">{config.icon}</span>
        <span className="category-label">{config.label}</span>
      </div>
      <div className="category-prompts">
        {config.prompts.map((prompt, i) => (
          <button
            key={i}
            className="prompt-btn"
            onClick={() => onAsk(prompt, category)}
            disabled={disabled}
            type="button"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
});

TutorQuestionCard.propTypes = {
  category: PropTypes.string.isRequired,
  onAsk: PropTypes.func.isRequired,
  disabled: PropTypes.bool
};

// =============================================================================
// CUSTOM QUESTION INPUT
// =============================================================================

const CustomQuestionInput = memo(function CustomQuestionInput({
  onSubmit,
  disabled
}) {
  const [question, setQuestion] = useState('');

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    if (question.trim()) {
      onSubmit(question.trim());
      setQuestion('');
    }
  }, [question, onSubmit]);

  return (
    <form className="custom-question-form" onSubmit={handleSubmit} dir="rtl">
      <input
        type="text"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="שאל שאלה משלך..."
        className="custom-question-input"
        disabled={disabled}
      />
      <button
        type="submit"
        className="custom-question-submit"
        disabled={disabled || !question.trim()}
      >
        שאל
      </button>
    </form>
  );
});

CustomQuestionInput.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  disabled: PropTypes.bool
};

// =============================================================================
// MAIN COMPONENT: AITutorPanel
// =============================================================================

const AITutorPanel = memo(function AITutorPanel({
  text,
  reference,
  sugyaKey,
  studyMode = 'iyun',
  onAskQuestion,
  isLoading = false
}) {
  const [activeCategory, setActiveCategory] = useState('understanding');
  const [recentQuestions, setRecentQuestions] = useState([]);

  // Get study mode specific prompts
  const modePrompts = useMemo(() => {
    return STUDY_MODE_PROMPTS[studyMode] || STUDY_MODE_PROMPTS.iyun;
  }, [studyMode]);

  // Handle asking a question
  const handleAsk = useCallback((question, category = 'custom') => {
    // Add to recent questions
    setRecentQuestions(prev => [
      { question, category, timestamp: Date.now() },
      ...prev.slice(0, 4) // Keep last 5
    ]);

    // Call external handler if provided
    if (onAskQuestion) {
      onAskQuestion(question, {
        category,
        studyMode,
        reference,
        sugyaKey
      });
    }
  }, [onAskQuestion, studyMode, reference, sugyaKey]);

  if (!text) {
    return (
      <div className="ai-tutor-panel empty" dir="rtl">
        <div className="tutor-empty-state">
          <span className="empty-icon">🎓</span>
          <span className="empty-title">מורה AI</span>
          <p className="empty-text">
            נווט לטקסט כדי להתחיל ללמוד עם המורה
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="ai-tutor-panel" dir="rtl">
      {/* Header */}
      <div className="tutor-header">
        <div className="tutor-title">
          <span className="tutor-icon">🎓</span>
          <span className="tutor-label">מורה AI</span>
        </div>
        {reference && (
          <span className="tutor-reference">{reference}</span>
        )}
      </div>

      {/* Study Mode Quick Prompts */}
      <div className="study-mode-prompts">
        <div className="mode-prompts-header">
          <span className="mode-icon">
            {studyMode === 'iyun' ? '🔬' : studyMode === 'bekius' ? '📖' : '🔄'}
          </span>
          <span className="mode-label">
            {studyMode === 'iyun' ? 'עיון' : studyMode === 'bekius' ? 'בקיאות' : 'חזרה'}
          </span>
        </div>
        <div className="mode-prompts-list">
          {modePrompts.map((prompt, i) => (
            <button
              key={i}
              className="mode-prompt-btn"
              onClick={() => handleAsk(prompt, studyMode)}
              disabled={isLoading}
              type="button"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="tutor-category-tabs">
        {Object.entries(TUTOR_CATEGORIES).map(([key, config]) => (
          <button
            key={key}
            className={`category-tab ${activeCategory === key ? 'active' : ''}`}
            onClick={() => setActiveCategory(key)}
            type="button"
          >
            <span className="tab-icon">{config.icon}</span>
            <span className="tab-label">{config.label}</span>
          </button>
        ))}
      </div>

      {/* Active Category Card */}
      <TutorQuestionCard
        category={activeCategory}
        onAsk={handleAsk}
        disabled={isLoading}
      />

      {/* Custom Question */}
      <div className="custom-question-section">
        <div className="section-divider">
          <span>או שאל שאלה משלך</span>
        </div>
        <CustomQuestionInput
          onSubmit={(q) => handleAsk(q, 'custom')}
          disabled={isLoading}
        />
      </div>

      {/* Recent Questions */}
      {recentQuestions.length > 0 && (
        <div className="recent-questions">
          <div className="recent-header">
            <span className="recent-icon">📝</span>
            <span className="recent-label">שאלות אחרונות</span>
          </div>
          <div className="recent-list">
            {recentQuestions.map((item, i) => (
              <button
                key={i}
                className="recent-item"
                onClick={() => handleAsk(item.question, item.category)}
                disabled={isLoading}
                type="button"
              >
                <span className="recent-category-icon">
                  {TUTOR_CATEGORIES[item.category]?.icon || '💬'}
                </span>
                <span className="recent-text">{item.question}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <div className="tutor-loading">
          <div className="loading-spinner" />
          <span className="loading-text">המורה חושב...</span>
        </div>
      )}
    </div>
  );
});

AITutorPanel.propTypes = {
  text: PropTypes.string,
  reference: PropTypes.string,
  sugyaKey: PropTypes.string,
  studyMode: PropTypes.oneOf(['iyun', 'bekius', 'chazara']),
  onAskQuestion: PropTypes.func,
  isLoading: PropTypes.bool
};

export default AITutorPanel;
