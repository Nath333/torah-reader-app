/**
 * AIAnalysisTab - Comprehensive AI-powered Torah/Talmud study
 * Supports 25+ analysis modes including PaRDeS, Mussar, Gematria, etc.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { analyzeCommentary, ANALYSIS_MODES, hasApiKey as checkHasApiKey } from '../../../services/groqService';
import { clearConversation } from '../../../services/aiService';
import {
  AI_PROVIDERS,
  getSelectedProvider,
  checkProviderAvailability
} from '../../../services/providers/aiProviderFactory';
import { checkOllamaConnection, analyzeWithOllama, getOllamaSettings } from '../../../services/providers/ollamaProvider';
import ModeGrid, { ALL_MODES } from './ModeGrid';
import APIKeySetup from '../APIKeySetup';
import OllamaSettings from '../../settings/OllamaSettings';
import RAGSourcesPanel from '../RAGSourcesPanel';
import { useStudy } from '../../../context/StudyContext';
import useAnalysisHistory from '../../../hooks/useAnalysisHistory';
import { AIResult, LoadingSkeleton } from './AIResultRenderers';
import { formatResultAsText, CONTENT_TYPES } from './formatUtils';
import FollowUpQuestion from './FollowUpQuestion';

import './AIAnalysisTab.css';
import '../RAGSourcesPanel.css';

// First 3 modes are "core" modes for batch analysis
const CORE_MODES = ALL_MODES.slice(0, 3);

// ============================================================================
// Contextual Study Suggestions - Based on text type and content
// ============================================================================
const getContextualSuggestions = (textType, selectedBook, hebrewText) => {
  const suggestions = [];

  // Book-specific suggestions
  const bookLower = (selectedBook || '').toLowerCase();

  if (bookLower.includes('genesis') || bookLower.includes('bereshit')) {
    suggestions.push({
      mode: ANALYSIS_MODES.SUMMARY,
      reason: 'Genesis narratives benefit from thematic summaries',
      icon: '🌍'
    });
    suggestions.push({
      mode: ANALYSIS_MODES.MUSSAR,
      reason: 'Rich in moral lessons from the Avot',
      icon: '💎'
    });
  } else if (bookLower.includes('exodus') || bookLower.includes('shemot')) {
    suggestions.push({
      mode: ANALYSIS_MODES.HALACHA,
      reason: 'Contains foundational mitzvot',
      icon: '⚖️'
    });
  } else if (bookLower.includes('leviticus') || bookLower.includes('vayikra')) {
    suggestions.push({
      mode: ANALYSIS_MODES.HALACHA,
      reason: 'Core source for halachic derivations',
      icon: '⚖️'
    });
  } else if (bookLower.includes('psalms') || bookLower.includes('tehillim')) {
    suggestions.push({
      mode: ANALYSIS_MODES.MUSSAR,
      reason: 'Deep emotional and spiritual content',
      icon: '💎'
    });
    suggestions.push({
      mode: ANALYSIS_MODES.TAAMIM,
      reason: 'Rich cantillation patterns',
      icon: '🎵'
    });
  }

  // Text type suggestions
  if (textType === 'talmud') {
    suggestions.push({
      mode: ANALYSIS_MODES.MACHLOKET,
      reason: 'Analyze Talmudic disputes',
      icon: '⚔️'
    });
    suggestions.push({
      mode: ANALYSIS_MODES.IYUN,
      reason: 'Deep analytical study',
      icon: '🔬'
    });
  }

  // If Hebrew text has specific patterns
  if (hebrewText) {
    if (hebrewText.includes('וַיֹּאמֶר') || hebrewText.includes('וידבר')) {
      suggestions.push({
        mode: ANALYSIS_MODES.CHAVRUTA,
        reason: 'Dialogue passage - explore with chavruta',
        icon: '👥'
      });
    }
  }

  // Default suggestions if none specific
  if (suggestions.length === 0) {
    suggestions.push({
      mode: ANALYSIS_MODES.SUMMARY,
      reason: 'Start with a comprehensive overview',
      icon: '📋'
    });
    suggestions.push({
      mode: ANALYSIS_MODES.SHORESH,
      reason: 'Explore Hebrew roots',
      icon: '🌱'
    });
  }

  return suggestions.slice(0, 3); // Max 3 suggestions
};

// ============================================================================
// Study Session Stats Component
// ============================================================================
const StudyStats = ({ completedModes, reference, sessionStart }) => {
  const elapsedMinutes = sessionStart
    ? Math.floor((Date.now() - sessionStart) / 60000)
    : 0;

  return (
    <div className="study-stats-bar">
      <div className="stat-item">
        <span className="stat-icon">📖</span>
        <span className="stat-value">{reference || '—'}</span>
      </div>
      <div className="stat-item">
        <span className="stat-icon">✅</span>
        <span className="stat-value">{completedModes.size}</span>
        <span className="stat-label">modes</span>
      </div>
      {elapsedMinutes > 0 && (
        <div className="stat-item">
          <span className="stat-icon">⏱️</span>
          <span className="stat-value">{elapsedMinutes}</span>
          <span className="stat-label">min</span>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// STUDY APPROACH SELECTOR - Bekius vs Iyun
// ============================================================================
const STUDY_APPROACHES = {
  BEKIUS: 'bekius',   // Breadth - cover more ground quickly
  IYUN: 'iyun'        // Depth - deep analysis of single text
};

// ============================================================================
// STUDY PATH - Structured learning like in Kollel
// Based on traditional Yeshiva methodology
// ============================================================================
const STUDY_STEPS = [
  {
    id: 'kriah',
    hebrewName: 'קריאה',
    englishName: 'Reading',
    icon: '📖',
    description: 'Read and understand the plain text',
    mode: ANALYSIS_MODES.SUMMARY,
    question: 'What is the pasuk telling us?'
  },
  {
    id: 'rashi',
    hebrewName: 'רש״י',
    englishName: 'Rashi',
    icon: '📜',
    description: 'What difficulty is Rashi addressing?',
    mode: ANALYSIS_MODES.IYUN,
    question: 'Why does Rashi comment here?'
  },
  {
    id: 'milim',
    hebrewName: 'מילים',
    englishName: 'Words',
    icon: '🔤',
    description: 'Key vocabulary and roots',
    mode: ANALYSIS_MODES.SHORESH,
    question: 'What are the key words and their meanings?'
  },
  {
    id: 'heksher',
    hebrewName: 'הקשר',
    englishName: 'Context',
    icon: '🔗',
    description: 'Connection to surrounding text',
    mode: ANALYSIS_MODES.MAREI_MEKOMOT,
    question: 'How does this connect to what comes before/after?'
  },
  {
    id: 'lemaaseh',
    hebrewName: 'למעשה',
    englishName: 'Application',
    icon: '💡',
    description: 'Practical lessons for life',
    mode: ANALYSIS_MODES.MUSSAR,
    question: 'What do we learn from this for our lives?'
  }
];

// Talmud-specific study path
const TALMUD_STUDY_STEPS = [
  {
    id: 'sugya',
    hebrewName: 'סוגיא',
    englishName: 'Sugya Overview',
    icon: '📊',
    description: 'Understand the flow of the Gemara',
    mode: ANALYSIS_MODES.SUMMARY,
    question: 'What is the Gemara discussing?'
  },
  {
    id: 'kushya',
    hebrewName: 'קושיא',
    englishName: 'Questions',
    icon: '❓',
    description: 'Identify the difficulties and questions',
    mode: ANALYSIS_MODES.CHAVRUTA,
    question: 'What questions does the Gemara raise?'
  },
  {
    id: 'machloket',
    hebrewName: 'מחלוקת',
    englishName: 'Disputes',
    icon: '⚖️',
    description: 'Understand the different opinions',
    mode: ANALYSIS_MODES.MACHLOKET,
    question: 'Who disagrees and why?'
  },
  {
    id: 'maskana',
    hebrewName: 'מסקנא',
    englishName: 'Conclusion',
    icon: '✓',
    description: 'What is the halachic conclusion?',
    mode: ANALYSIS_MODES.HALACHA,
    question: 'What do we pasken?'
  }
];

// RashiInsightPanel moved inline to EmptyState's clean-style

// ============================================================================
// STUDY QUESTIONS PANEL - מה קשה - Auto-generated learning questions
// ============================================================================
const getStudyQuestions = (textType, selectedBook, hebrewText) => {
  const questions = [];
  const bookLower = (selectedBook || '').toLowerCase();

  // Universal questions
  questions.push({
    question: 'What is the main message of this text?',
    hebrewQuestion: 'מהו המסר העיקרי?',
    type: 'comprehension'
  });

  // Book-specific questions
  if (bookLower.includes('genesis') || bookLower.includes('bereshit')) {
    questions.push({
      question: 'What does this teach about Hashem\'s relationship with mankind?',
      hebrewQuestion: 'מה זה מלמד על יחס ה׳ לאדם?',
      type: 'hashkafa'
    });
    questions.push({
      question: 'What middah (character trait) do we learn from the people in this story?',
      hebrewQuestion: 'איזו מידה נלמד מהאנשים בסיפור?',
      type: 'mussar'
    });
  } else if (textType === 'talmud') {
    questions.push({
      question: 'What is the underlying principle (klal) being discussed?',
      hebrewQuestion: 'מהו הכלל היסודי?',
      type: 'lomdus'
    });
    questions.push({
      question: 'How would Tosafot challenge this?',
      hebrewQuestion: 'מה היה תוספות מקשה?',
      type: 'iyun'
    });
  }

  // Pattern-based questions
  if (hebrewText) {
    if (hebrewText.includes('וַיֹּאמֶר') || hebrewText.includes('ויאמר')) {
      questions.push({
        question: 'Why does the Torah record this specific dialogue?',
        hebrewQuestion: 'למה התורה מביאה דיאלוג זה?',
        type: 'parshanut'
      });
    }
    if (hebrewText.includes('לֹא') || hebrewText.includes('אל')) {
      questions.push({
        question: 'What is being prohibited and why?',
        hebrewQuestion: 'מה נאסר ולמה?',
        type: 'halacha'
      });
    }
  }

  return questions.slice(0, 4);
};

// StudyQuestionsPanel moved inline to EmptyState's clean-style collapsible section

// ============================================================================
// LEARNING OBJECTIVES - What you should know after studying this
// ============================================================================
const getLearningObjectives = (textType, selectedBook, hebrewText, studyApproach) => {
  const objectives = [];
  const bookLower = (selectedBook || '').toLowerCase();
  const isIyun = studyApproach === STUDY_APPROACHES.IYUN;

  // Core objective based on text type
  if (textType === 'talmud') {
    objectives.push({
      icon: '📜',
      objective: 'Understand the flow and structure of the sugya',
      level: 'core'
    });
    if (isIyun) {
      objectives.push({
        icon: '🔍',
        objective: 'Identify the underlying sevara (logical reasoning)',
        level: 'iyun'
      });
      objectives.push({
        icon: '⚖️',
        objective: 'Explain the positions of each opinion in the machloket',
        level: 'iyun'
      });
    }
  } else {
    objectives.push({
      icon: '📖',
      objective: 'Read and understand the pasuk in its plain meaning (pshat)',
      level: 'core'
    });

    if (isIyun) {
      objectives.push({
        icon: '📜',
        objective: 'Explain what difficulty Rashi is addressing',
        level: 'iyun'
      });
    }
  }

  // Book-specific objectives
  if (bookLower.includes('genesis') || bookLower.includes('bereshit')) {
    objectives.push({
      icon: '💎',
      objective: 'Extract a practical middah lesson from the narrative',
      level: 'mussar'
    });
  } else if (bookLower.includes('exodus') || bookLower.includes('shemot')) {
    objectives.push({
      icon: '⚖️',
      objective: 'Identify any mitzvot mentioned and their practical applications',
      level: 'halacha'
    });
  } else if (bookLower.includes('leviticus') || bookLower.includes('vayikra')) {
    objectives.push({
      icon: '🔗',
      objective: 'Connect the source to its halachic applications',
      level: 'halacha'
    });
  }

  // Pattern-based objectives
  if (hebrewText) {
    if (hebrewText.includes('וַיֹּאמֶר') || hebrewText.includes('ויאמר')) {
      objectives.push({
        icon: '💬',
        objective: 'Understand why this dialogue is recorded',
        level: 'drash'
      });
    }
  }

  return objectives.slice(0, isIyun ? 4 : 2);
};

const LearningObjectivesPanel = ({ objectives, studyApproach }) => {
  if (!objectives || objectives.length === 0) return null;

  return (
    <div className="learning-objectives-panel">
      <div className="objectives-header">
        <span className="objectives-icon">🎯</span>
        <span className="objectives-title">Learning Objectives</span>
        <span className="objectives-approach">
          {studyApproach === STUDY_APPROACHES.IYUN ? 'עיון' : 'בקיאות'}
        </span>
      </div>
      <div className="objectives-list">
        {objectives.map((obj, i) => (
          <div key={i} className={`objective-item objective-${obj.level}`}>
            <span className="objective-icon">{obj.icon}</span>
            <span className="objective-text">{obj.objective}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// STUDY PATH PANEL - Guided learning steps
// ============================================================================
const StudyPathPanel = ({
  steps,
  currentStep,
  completedSteps,
  onStepClick,
  studyApproach,
  onApproachChange
}) => {
  return (
    <div className="study-path-panel">
      {/* Approach Toggle */}
      <div className="approach-toggle">
        <button
          className={`approach-btn ${studyApproach === STUDY_APPROACHES.BEKIUS ? 'active' : ''}`}
          onClick={() => onApproachChange(STUDY_APPROACHES.BEKIUS)}
          title="Bekius - Cover more ground, lighter analysis"
        >
          <span className="approach-icon">📚</span>
          <span className="approach-label">בקיאות</span>
          <span className="approach-sublabel">Breadth</span>
        </button>
        <button
          className={`approach-btn ${studyApproach === STUDY_APPROACHES.IYUN ? 'active' : ''}`}
          onClick={() => onApproachChange(STUDY_APPROACHES.IYUN)}
          title="Iyun - Deep analysis, take your time"
        >
          <span className="approach-icon">🔬</span>
          <span className="approach-label">עיון</span>
          <span className="approach-sublabel">Depth</span>
        </button>
      </div>

      {/* Study Path Steps */}
      <div className="path-header">
        <span className="path-icon">📍</span>
        <span className="path-title">Study Path</span>
        <span className="path-progress">
          {completedSteps.size}/{steps.length}
        </span>
      </div>

      <div className="path-steps">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.has(step.id);
          const isCurrent = currentStep === step.id;
          const isNext = !isCurrent && !isCompleted &&
            (completedSteps.size === index || (completedSteps.size === 0 && index === 0));

          return (
            <button
              key={step.id}
              className={`path-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''} ${isNext ? 'next' : ''}`}
              onClick={() => onStepClick(step)}
            >
              <div className="step-indicator">
                {isCompleted ? '✓' : index + 1}
              </div>
              <div className="step-content">
                <div className="step-names">
                  <span className="step-hebrew">{step.hebrewName}</span>
                  <span className="step-english">{step.englishName}</span>
                </div>
                <div className="step-desc">{step.description}</div>
              </div>
              <span className="step-icon">{step.icon}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// ENHANCED EMPTY STATE - Clean, focused learning interface
// ============================================================================
const EmptyState = ({
  suggestions,
  onSelectMode,
  textType,
  reference,
  rashiText,
  onStartStudyPath,
  studyQuestions,
  onAskQuestion
}) => {
  const steps = textType === 'talmud' ? TALMUD_STUDY_STEPS : STUDY_STEPS;
  const [showQuestions, setShowQuestions] = useState(false);

  return (
    <div className="ai-empty-state clean-style">
      {/* Compact Header */}
      <div className="empty-header-compact">
        <span className="empty-icon-small">📖</span>
        <div className="empty-header-text">
          <h3 className="empty-title-compact">{reference || 'Select a Verse'}</h3>
          <p className="empty-subtitle-compact">
            {textType === 'talmud' ? 'Let\'s learn this sugya together' : 'Ready to analyze'}
          </p>
        </div>
      </div>

      {/* Rashi Preview - Compact */}
      {rashiText && (
        <div className="rashi-preview-compact">
          <div className="rashi-preview-header">
            <span className="rashi-badge">📜 רש״י</span>
            <span className="rashi-ref-small">{reference}</span>
          </div>
          <p className="rashi-text-preview" dir="rtl">
            {rashiText.length > 120 ? rashiText.substring(0, 120) + '...' : rashiText}
          </p>
          <button className="rashi-analyze-link" onClick={() => onSelectMode(ANALYSIS_MODES.IYUN)}>
            🔍 Why does Rashi say this?
          </button>
        </div>
      )}

      {/* Primary Action - Start Learning */}
      <div className="primary-action-section">
        <button
          className="start-learning-btn"
          onClick={() => onStartStudyPath(steps[0])}
        >
          <span className="btn-play">▶️</span>
          <span className="btn-label">Begin Guided Study</span>
          <span className="btn-steps">{steps[0].hebrewName} → {steps[1].hebrewName} → ...</span>
        </button>

        {/* Quick Suggested Modes */}
        <div className="suggested-modes-row">
          {suggestions.slice(0, 3).map((sug, i) => {
            const modeInfo = ALL_MODES.find(m => m.id === sug.mode);
            return (
              <button
                key={i}
                className="suggested-mode-chip"
                onClick={() => onSelectMode(sug.mode)}
                title={sug.reason}
              >
                <span className="chip-icon">{sug.icon}</span>
                <span className="chip-label">{modeInfo?.hebrew || modeInfo?.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Collapsible Study Questions */}
      <div className="questions-section-collapsible">
        <button
          className={`questions-toggle-btn ${showQuestions ? 'expanded' : ''}`}
          onClick={() => setShowQuestions(!showQuestions)}
        >
          <span className="toggle-icon">❓</span>
          <span className="toggle-label">מה קשה? Questions to Consider</span>
          <span className="toggle-arrow">{showQuestions ? '▼' : '▶'}</span>
        </button>

        {showQuestions && studyQuestions && studyQuestions.length > 0 && (
          <div className="questions-list-compact">
            {studyQuestions.slice(0, 3).map((q, i) => (
              <button
                key={i}
                className="question-chip"
                onClick={() => onAskQuestion(q.question)}
              >
                <span className="q-text">{q.question}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Subtle Keyboard Hints */}
      <div className="keyboard-hints-subtle">
        <span className="hint"><kbd>1-9</kbd> modes</span>
        <span className="hint-divider">·</span>
        <span className="hint"><kbd>Tab</kbd> next</span>
        <span className="hint-divider">·</span>
        <span className="hint"><kbd>?</kbd> ask</span>
      </div>
    </div>
  );
};

/**
 * AIAnalysisTab - Main Component
 */
// Helper to get/set pinned mode per book from localStorage
const getPinnedModeForBook = (book) => {
  try {
    const pinned = JSON.parse(localStorage.getItem('torah-reader-pinned-modes') || '{}');
    return pinned[book] || null;
  } catch {
    return null;
  }
};

const setPinnedModeForBook = (book, mode) => {
  try {
    const pinned = JSON.parse(localStorage.getItem('torah-reader-pinned-modes') || '{}');
    pinned[book] = mode;
    localStorage.setItem('torah-reader-pinned-modes', JSON.stringify(pinned));
  } catch (e) {
    console.warn('Failed to save pinned mode:', e);
  }
};

const AIAnalysisTab = ({
  text,
  reference,
  textType = 'torah',
  selectedBook,
  selectedVerse,
  selectedVerses,
  isMultiVerse = false,
  rashiText,
  onkelosText,
  rambanText
}) => {
  const [hasKey, setHasKey] = useState(false);
  // Initialize with pinned mode for current book, or default to SUMMARY
  const [selectedMode, setSelectedMode] = useState(() => {
    const pinned = getPinnedModeForBook(selectedBook);
    return pinned || ANALYSIS_MODES.SUMMARY;
  });
  const [selectedContent, setSelectedContent] = useState(CONTENT_TYPES.VERSE);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [completedModes, setCompletedModes] = useState(new Set());
  const [saveSuccess, setSaveSuccess] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [ragPanelCollapsed, setRagPanelCollapsed] = useState(true); // Sources panel collapsed by default
  const [sessionStart] = useState(() => Date.now()); // Track session start time

  // Kollel-style Study Path state
  const [studyApproach, setStudyApproach] = useState(STUDY_APPROACHES.IYUN);
  const [currentStudyStep, setCurrentStudyStep] = useState(null);
  const [completedStudySteps, setCompletedStudySteps] = useState(new Set());

  // AI Provider state
  const [currentProvider, setCurrentProvider] = useState(getSelectedProvider());
  const [, setProviderReady] = useState(false);
  const [showProviderSettings, setShowProviderSettings] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState(null);

  // Auto-analyze preference (persisted in localStorage)
  const [autoAnalyze, setAutoAnalyze] = useState(() => {
    try {
      return localStorage.getItem('torah-reader-auto-analyze') === 'true';
    } catch {
      return false;
    }
  });

  // Favorite/pinned modes (persisted in localStorage)
  const [favoriteModes, setFavoriteModes] = useState(() => {
    try {
      const stored = localStorage.getItem('torah-reader-favorite-modes');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Get study context for saving notes
  const studyContext = useStudy();

  // Analysis history tracking
  const {
    addAnalysis,
    getCachedResult,
    getRecentAnalyses,
    removeAnalysis
  } = useAnalysisHistory();

  // Follow-up now handled by FollowUpQuestion component with RAG

  // Run all core modes state (reserved for future batch analysis UI)
  // eslint-disable-next-line no-unused-vars
  const [runningAllModes, setRunningAllModes] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [allModesProgress, setAllModesProgress] = useState({ current: 0, total: 0, currentMode: '' });
  // eslint-disable-next-line no-unused-vars
  const [allModesResults, setAllModesResults] = useState({});

  // Check for API key and provider availability on mount
  useEffect(() => {
    let isMounted = true;

    const checkProviders = async () => {
      const provider = getSelectedProvider();
      const hasGroqKey = checkHasApiKey();

      let ollamaStatusResult = null;
      if (provider === AI_PROVIDERS.OLLAMA || provider === AI_PROVIDERS.AUTO) {
        ollamaStatusResult = await checkOllamaConnection();
      }

      if (!isMounted) return;

      setCurrentProvider(provider);
      setHasKey(hasGroqKey);

      if (ollamaStatusResult) {
        setOllamaStatus(ollamaStatusResult);
      }

      if (provider === AI_PROVIDERS.GROQ) {
        setProviderReady(hasGroqKey);
      } else if (provider === AI_PROVIDERS.OLLAMA) {
        setProviderReady(ollamaStatusResult?.connected ?? false);
      } else if (provider === AI_PROVIDERS.AUTO) {
        setProviderReady(hasGroqKey || (ollamaStatusResult?.connected ?? false));
      }
    };

    checkProviders();

    return () => {
      isMounted = false;
    };
  }, []);

  // Handle provider change
  // eslint-disable-next-line no-unused-vars
  const handleProviderChange = useCallback((newProvider) => {
    setCurrentProvider(newProvider);
    checkProviderAvailability(newProvider).then(status => {
      setProviderReady(status.available);
    });
  }, []);

  // Persist auto-analyze preference
  useEffect(() => {
    try {
      localStorage.setItem('torah-reader-auto-analyze', autoAnalyze.toString());
    } catch (e) {
      console.warn('Failed to save auto-analyze preference:', e);
    }
  }, [autoAnalyze]);

  // Persist favorite modes
  useEffect(() => {
    try {
      localStorage.setItem('torah-reader-favorite-modes', JSON.stringify([...favoriteModes]));
    } catch (e) {
      console.warn('Failed to save favorite modes:', e);
    }
  }, [favoriteModes]);

  // Toggle favorite mode
  const toggleFavorite = useCallback((modeId) => {
    setFavoriteModes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(modeId)) {
        newSet.delete(modeId);
      } else {
        newSet.add(modeId);
      }
      return newSet;
    });
  }, []);

  // Restore pinned mode when book changes
  useEffect(() => {
    if (selectedBook) {
      const pinnedMode = getPinnedModeForBook(selectedBook);
      if (pinnedMode && pinnedMode !== selectedMode) {
        setSelectedMode(pinnedMode);
        setResult(null);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBook]);

  // Clear conversation when component unmounts or changes
  useEffect(() => {
    return () => {
      clearConversation();
    };
  }, [text, reference]);

  // Clear results when verse/reference changes (new verse selected)
  const prevReferenceRef = useRef(reference);
  useEffect(() => {
    if (reference !== prevReferenceRef.current) {
      // New verse selected - clear previous results
      setResult(null);
      setError(null);
      setCompletedModes(new Set());
      prevReferenceRef.current = reference;
    }
  }, [reference]);

  // Determine if Genesis for special modes
  const isGenesis = selectedBook?.toLowerCase().includes('genesis') ||
    selectedBook?.toLowerCase().includes('bereshit');

  // Get text to analyze based on content selection
  const getTextToAnalyze = useCallback(() => {
    switch (selectedContent) {
      case CONTENT_TYPES.RASHI:
        return rashiText || text;
      case CONTENT_TYPES.ONKELOS:
        return onkelosText || text;
      case CONTENT_TYPES.RAMBAN:
        return rambanText || text;
      case CONTENT_TYPES.ALL:
        return [text, rashiText, onkelosText, rambanText].filter(Boolean).join('\n\n');
      default:
        return text;
    }
  }, [text, rashiText, onkelosText, rambanText, selectedContent]);

  // Helper functions for Ollama prompts
  const getOllamaSystemPrompt = (source) => {
    return `You are an expert Torah scholar and Talmid Chacham serving as a study assistant. You have deep knowledge of:

PARSHANUT (Biblical Commentary):
- Rishonim: Rashi, Ramban, Ibn Ezra, Rashbam, Sforno, Radak, Rabbeinu Bachya
- Acharonim: Or HaChaim, Malbim, Netziv, Sefat Emet, Kli Yakar

TALMUD & HALACHA:
- Gemara commentaries: Tosafot, Maharsha, Ritva, Rashba, Ran, Rosh
- Poskim: Rambam, Shulchan Aruch, Mishnah Berurah

MACHSHAVA (Jewish Thought):
- Mussar: Ramchal, Orchot Tzaddikim, Chovot HaLevavot
- Chassidut: Tanya, Kedushat Levi, Sfat Emet

You understand the methodology of ${source || 'classical Jewish commentators'} and explain concepts with precision and depth.
Use proper transliteration for Hebrew terms. Respond with valid JSON only.`;
  };

  const getOllamaUserPrompt = (text, source, reference, mode) => {
    const modeInstructions = {
      [ANALYSIS_MODES.SUMMARY]: `Provide a structured summary in JSON:
{"summary": "2-3 sentence overview", "keyPoints": ["insight 1", "insight 2"], "topics": ["tags"], "practicalLesson": "takeaway"}`,
      [ANALYSIS_MODES.IYUN]: `Learn b'iyun (deep study) like a chavrusa. Ask hard questions. Respond in JSON:
{"summary": "overview", "chavrusaQuestions": [{"question": "sharp question", "resolution": "answer"}], "chiddush": "novel insight", "practicalLesson": "application"}`,
      [ANALYSIS_MODES.MUSSAR]: `Analyze from Mussar perspective. Respond in JSON:
{"summary": "ethical message", "middotIdentified": [{"middah": "trait", "practicalSteps": ["step 1", "step 2"]}], "dailyPractice": "action for today"}`,
      [ANALYSIS_MODES.MACHLOKET]: `Compare commentator positions and WHY they disagree. Respond in JSON:
{"summary": "overview", "mainMachloket": {"topic": "dispute", "positions": [{"commentator": "name", "position": "view"}], "rootCause": "why they disagree"}}`,
      [ANALYSIS_MODES.MAREI_MEKOMOT]: `Build cross-reference map. Respond in JSON:
{"summary": "overview", "directParallels": [{"reference": "verse", "significance": "connection"}], "talmudSources": [{"reference": "daf", "topic": "what"}]}`,
      [ANALYSIS_MODES.HALACHA]: `Trace halacha from source to practice. Respond in JSON:
{"summary": "overview", "chainOfTransmission": {"torahSource": "source", "shulchanAruch": {"location": "siman", "ruling": "law"}}, "practicalApplication": {"how": "observance"}}`,
      // Advanced modes
      [ANALYSIS_MODES.TAAMIM]: `Analyze cantillation marks (trop/ta'amim). Explain why each mark falls where it does. Respond in JSON:
{"summary": "cantillation overview", "verseStructure": {"primaryDivision": "where Atnach falls and why"}, "cantillationAnalysis": [{"word": "Hebrew", "mark": "mark name", "type": "Disjunctive/Conjunctive", "significance": "meaning"}], "syntacticParsing": "how to read this verse", "deeperMeaning": "what cantillation teaches"}`,
      [ANALYSIS_MODES.SHORESH]: `Analyze Hebrew roots (shoresh). Show occurrences across Tanakh. Respond in JSON:
{"summary": "root analysis overview", "rootAnalysis": [{"root": "3-letter root", "coreMeaning": "meaning", "wordInVerse": "actual word", "binyan": "verb pattern", "occurrences": {"total": "count", "firstOccurrence": "reference"}, "wordFamily": [{"word": "related word", "meaning": "definition"}]}], "studyNote": "insight from roots"}`,
      [ANALYSIS_MODES.CHAVRUTA]: `Act as a challenging study partner (chavruta). Challenge interpretations with opposing views. Respond in JSON:
{"standardView": {"interpretation": "common reading", "proponents": ["commentators"]}, "challenges": [{"challenger": "name", "challenge": "opposing view", "strength": "why compelling"}], "devilsAdvocate": {"hardQuestion": "difficult question", "possibleResolutions": [{"approach": "answer", "weakness": "problem"}]}, "chavrutaChallenge": "provocative question to ponder"}`
    };

    const instruction = modeInstructions[mode] || modeInstructions[ANALYSIS_MODES.SUMMARY];
    return `Analyze this ${source} on ${reference}:\n\n"${text}"\n\n${instruction}`;
  };

  const getTemperatureForMode = (mode) => {
    const temps = {
      [ANALYSIS_MODES.HALACHA]: 0.2,
      [ANALYSIS_MODES.MACHLOKET]: 0.2,
      [ANALYSIS_MODES.IYUN]: 0.25,
      [ANALYSIS_MODES.MAREI_MEKOMOT]: 0.25,
      [ANALYSIS_MODES.MUSSAR]: 0.35,
      [ANALYSIS_MODES.TAAMIM]: 0.25,    // Precise for cantillation
      [ANALYSIS_MODES.SHORESH]: 0.2,    // Precise for roots
      [ANALYSIS_MODES.CHAVRUTA]: 0.4    // Warmer for creative debate
    };
    return temps[mode] || 0.3;
  };

  const getMaxTokensForMode = (mode) => {
    const tokens = {
      [ANALYSIS_MODES.SUMMARY]: 1500,
      [ANALYSIS_MODES.IYUN]: 3200,       // Deep chavrusa analysis
      [ANALYSIS_MODES.MACHLOKET]: 2500,  // Multiple positions
      [ANALYSIS_MODES.MAREI_MEKOMOT]: 2800, // Many cross-references
      [ANALYSIS_MODES.MUSSAR]: 2000,     // Ethical development
      [ANALYSIS_MODES.HALACHA]: 2200,    // Chain of transmission
      [ANALYSIS_MODES.TAAMIM]: 2800,     // Cantillation analysis
      [ANALYSIS_MODES.SHORESH]: 3000,    // Root analysis
      [ANALYSIS_MODES.CHAVRUTA]: 3500    // Full debate mode
    };
    return tokens[mode] || 1500;
  };

  // Handle analysis - supports both Groq and Ollama providers
  const handleAnalyze = useCallback(async (useCache = true) => {
    const analysisText = getTextToAnalyze();
    if (!analysisText) return;

    // Check for cached result first
    if (useCache) {
      const cached = getCachedResult(reference, selectedMode);
      if (cached) {
        setResult(cached);
        setCompletedModes(prev => new Set([...prev, selectedMode]));
        setSaveSuccess('Loaded from cache');
        setTimeout(() => setSaveSuccess(null), 1500);
        return;
      }
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const sourceType = textType === 'talmud' ? 'Talmud' : 'Torah';
      let analysisResult;

      const activeProvider = currentProvider === AI_PROVIDERS.AUTO
        ? (ollamaStatus?.connected ? AI_PROVIDERS.OLLAMA : AI_PROVIDERS.GROQ)
        : currentProvider;

      if (activeProvider === AI_PROVIDERS.OLLAMA) {
        const systemPrompt = getOllamaSystemPrompt(sourceType);
        const userPrompt = getOllamaUserPrompt(analysisText, sourceType, reference, selectedMode);

        analysisResult = await analyzeWithOllama({
          systemPrompt,
          userPrompt,
          temperature: getTemperatureForMode(selectedMode),
          maxTokens: getMaxTokensForMode(selectedMode),
          mode: selectedMode
        });
      } else {
        // Pass context options for smart mode detection + RAG enhancement
        const isTalmud = textType === 'talmud';
        analysisResult = await analyzeCommentary(
          analysisText,
          sourceType,
          reference,
          selectedMode,
          {
            isTalmud,
            isMultiVerse,
            isGenesis,
            // RAG context: provide book/chapter/verse for source retrieval
            book: selectedBook,
            chapter: selectedVerse?.chapter,
            verseNum: selectedVerse?.verse,
            useRAG: true // Enable RAG by default
          }
        );
      }

      if (analysisResult.success) {
        setResult(analysisResult);
        setCompletedModes(prev => new Set([...prev, selectedMode]));

        const modeInfo = ALL_MODES.find(m => m.id === selectedMode) || {};
        addAnalysis({
          reference,
          book: selectedBook,
          chapter: selectedVerse?.chapter,
          verse: selectedVerse?.verse,
          mode: selectedMode,
          modeName: modeInfo.label || modeInfo.name || selectedMode,
          textType,
          result: analysisResult,
          summary: analysisResult.summary || analysisResult.oneLineSummary || '',
          provider: analysisResult.provider || 'groq'
        });
      } else {
        setError(analysisResult.error || 'Analysis failed');
      }
    } catch (err) {
      setError(err.message || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  }, [getTextToAnalyze, textType, reference, selectedMode, getCachedResult, addAnalysis, selectedBook, selectedVerse, currentProvider, ollamaStatus, isMultiVerse, isGenesis]);

  // Keyboard shortcut: Ctrl/Cmd + Enter to analyze
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !loading && text) {
        e.preventDefault();
        handleAnalyze();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loading, text, handleAnalyze]);

  // Keyboard shortcut: Tab to advance through study path steps
  useEffect(() => {
    const steps = textType === 'talmud' ? TALMUD_STUDY_STEPS : STUDY_STEPS;

    const handleTabKey = (e) => {
      // Only respond to Tab when not in input/textarea and study path is active
      if (e.key !== 'Tab' || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      // Only if we have an active study path (currentStudyStep set)
      if (!currentStudyStep && !result) return;

      e.preventDefault();

      const currentIndex = steps.findIndex(s => s.id === currentStudyStep);

      if (e.shiftKey) {
        // Shift+Tab: Go to previous step
        if (currentIndex > 0) {
          const prevStep = steps[currentIndex - 1];
          setCurrentStudyStep(prevStep.id);
          setSelectedMode(prevStep.mode);
          if (autoAnalyze) setTimeout(() => handleAnalyze(), 100);
        }
      } else {
        // Tab: Go to next step
        const nextIndex = currentIndex === -1 ? 0 : currentIndex + 1;
        if (nextIndex < steps.length) {
          // Mark current as completed
          if (currentStudyStep) {
            setCompletedStudySteps(prev => new Set([...prev, currentStudyStep]));
          }
          const nextStep = steps[nextIndex];
          setCurrentStudyStep(nextStep.id);
          setSelectedMode(nextStep.mode);
          if (autoAnalyze) setTimeout(() => handleAnalyze(), 100);
        }
      }
    };

    window.addEventListener('keydown', handleTabKey);
    return () => window.removeEventListener('keydown', handleTabKey);
  }, [textType, currentStudyStep, result, autoAnalyze, handleAnalyze]);

  // Handle mode selection - also pins the mode for current book
  const handleModeSelect = useCallback((mode) => {
    setSelectedMode(mode);
    setResult(null);
    // Pin this mode for the current book
    if (selectedBook) {
      setPinnedModeForBook(selectedBook, mode);
    }
  }, [selectedBook]);

  // Study Path: Start guided learning with a step
  const handleStartStudyPath = useCallback((step) => {
    setCurrentStudyStep(step.id);
    setSelectedMode(step.mode);
    setCompletedStudySteps(new Set()); // Reset on new path
    // Auto-analyze when starting study path
    setTimeout(() => {
      handleAnalyze();
    }, 100);
  }, [handleAnalyze]);

  // Study Path: Handle step click and track completion
  const handleStudyStepClick = useCallback((step) => {
    // Mark current step as completed before moving to next
    if (currentStudyStep) {
      setCompletedStudySteps(prev => new Set([...prev, currentStudyStep]));
    }
    setCurrentStudyStep(step.id);
    setSelectedMode(step.mode);
    if (autoAnalyze) {
      setTimeout(() => handleAnalyze(), 100);
    }
  }, [autoAnalyze, handleAnalyze, currentStudyStep]);

  // Study Questions: Handle asking a question via Chavruta mode
  const handleAskStudyQuestion = useCallback((question) => {
    // Set to Chavruta mode for Q&A-style analysis
    setSelectedMode(ANALYSIS_MODES.CHAVRUTA);
    setTimeout(() => handleAnalyze(), 100);
  }, [handleAnalyze]);

  // Run all core modes sequentially with rate limit protection (reserved for future batch UI)
  // eslint-disable-next-line no-unused-vars
  const handleRunAllCoreModes = useCallback(async () => {
    if (!text || runningAllModes) return;

    setRunningAllModes(true);
    setAllModesResults({});
    setError(null);

    const coreModeIds = CORE_MODES.map(m => m.id);
    const results = {};

    // Helper to delay between API calls to avoid rate limits
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    for (let i = 0; i < coreModeIds.length; i++) {
      const mode = coreModeIds[i];
      const modeInfo = CORE_MODES.find(m => m.id === mode);

      setAllModesProgress({
        current: i + 1,
        total: coreModeIds.length,
        currentMode: modeInfo?.label || mode
      });

      // Add delay between calls to avoid rate limits (not on first call)
      if (i > 0) {
        await delay(2000);
      }

      try {
        const analysisText = getTextToAnalyze();
        const sourceType = textType === 'talmud' ? 'Talmud' : 'Torah';

        const activeProvider = currentProvider === AI_PROVIDERS.AUTO
          ? (ollamaStatus?.connected ? AI_PROVIDERS.OLLAMA : AI_PROVIDERS.GROQ)
          : currentProvider;

        let analysisResult;
        if (activeProvider === AI_PROVIDERS.OLLAMA) {
          const systemPrompt = getOllamaSystemPrompt(sourceType);
          const userPrompt = getOllamaUserPrompt(analysisText, sourceType, reference, mode);
          analysisResult = await analyzeWithOllama({
            systemPrompt,
            userPrompt,
            temperature: getTemperatureForMode(mode),
            maxTokens: getMaxTokensForMode(mode),
            mode
          });
        } else {
          const isTalmud = textType === 'talmud';
          analysisResult = await analyzeCommentary(
            analysisText,
            sourceType,
            reference,
            mode,
            {
              isTalmud,
              isMultiVerse,
              isGenesis,
              // RAG context for enhanced source retrieval
              book: selectedBook,
              chapter: selectedVerse?.chapter,
              verseNum: selectedVerse?.verse,
              useRAG: true
            }
          );
        }

        if (analysisResult.success) {
          results[mode] = analysisResult;
          setCompletedModes(prev => new Set([...prev, mode]));

          // Save to history
          addAnalysis({
            reference,
            book: selectedBook,
            chapter: selectedVerse?.chapter,
            verse: selectedVerse?.verse,
            mode,
            modeName: modeInfo?.label || mode,
            textType,
            result: analysisResult,
            summary: analysisResult.summary || analysisResult.oneLineSummary || '',
            provider: analysisResult.provider || 'groq'
          });
        }
      } catch (err) {
        console.error(`Error running ${mode}:`, err);
        results[mode] = { success: false, error: err.message };
      }

      setAllModesResults({ ...results });
    }

    setRunningAllModes(false);
    setAllModesProgress({ current: 0, total: 0, currentMode: '' });

    // Show the last successful result
    const lastSuccessful = coreModeIds.reverse().find(m => results[m]?.success);
    if (lastSuccessful) {
      setSelectedMode(lastSuccessful);
      setResult(results[lastSuccessful]);
    }
  }, [text, runningAllModes, getTextToAnalyze, textType, currentProvider, ollamaStatus, reference, isMultiVerse, isGenesis, addAnalysis, selectedBook, selectedVerse]);

  // Auto-analyze effect
  const prevModeRef = useRef(selectedMode);
  useEffect(() => {
    if (autoAnalyze && text && hasKey && !loading && selectedMode !== prevModeRef.current) {
      prevModeRef.current = selectedMode;
      const timer = setTimeout(() => {
        handleAnalyze(true);
      }, 100);
      return () => clearTimeout(timer);
    }
    prevModeRef.current = selectedMode;
  }, [selectedMode, autoAnalyze, text, hasKey, loading, handleAnalyze]);

  // Handle API key setup
  const handleApiKeySet = useCallback(() => {
    setHasKey(true);
  }, []);

  // Handle export as text file
  const handleExport = useCallback(() => {
    if (!result) return;

    const textContent = formatResultAsText(result, selectedMode, reference);
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const modeInfo = ALL_MODES.find(m => m.id === selectedMode) || {};
    const modeName = (modeInfo.label || modeInfo.name || selectedMode).toLowerCase().replace(/\s+/g, '-');
    const filename = `torah-analysis-${modeName}-${new Date().toISOString().split('T')[0]}.txt`;

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setSaveSuccess('Exported!');
    setTimeout(() => setSaveSuccess(null), 2000);
  }, [result, selectedMode, reference]);

  // Handle copy to clipboard
  const handleCopy = useCallback(async () => {
    if (!result) return;

    const textContent = formatResultAsText(result, selectedMode, reference);

    try {
      await navigator.clipboard.writeText(textContent);
      setSaveSuccess('Copied!');
      setTimeout(() => setSaveSuccess(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      setError('Failed to copy to clipboard');
    }
  }, [result, selectedMode, reference]);

  // Handle save to notes
  const handleSaveToNotes = useCallback(() => {
    if (!result || !studyContext?.addNote) return;

    const modeInfo = ALL_MODES.find(m => m.id === selectedMode) || {};
    const modeName = modeInfo.label || modeInfo.name || selectedMode;
    const noteContent = formatResultAsText(result, selectedMode, reference);

    try {
      studyContext.addNote({
        reference: reference || 'AI Analysis',
        book: selectedBook,
        chapter: selectedVerse?.chapter,
        verse: selectedVerse?.verse,
        content: noteContent,
        type: 'ai-analysis',
        mode: selectedMode,
        modeName: modeName,
        createdAt: new Date().toISOString()
      });

      setSaveSuccess('Saved to notes!');
      setTimeout(() => setSaveSuccess(null), 2000);
    } catch (err) {
      console.error('Failed to save:', err);
      setError('Failed to save to notes');
    }
  }, [result, selectedMode, reference, studyContext, selectedBook, selectedVerse]);

  // Show API key setup if no provider available
  if (!hasKey && !ollamaStatus?.connected) {
    return <APIKeySetup onKeySet={handleApiKeySet} />;
  }

  // Get verse count for display
  const verseCount = isMultiVerse && selectedVerses ? selectedVerses.length : 1;

  // Get current provider display info
  const getProviderDisplay = () => {
    if (currentProvider === AI_PROVIDERS.OLLAMA) {
      const settings = getOllamaSettings();
      return { icon: '💻', name: 'Ollama', model: settings.model };
    } else if (currentProvider === AI_PROVIDERS.AUTO) {
      return { icon: '⚡', name: 'Auto', model: ollamaStatus?.connected ? 'Local' : 'Cloud' };
    }
    return { icon: '☁️', name: 'Groq', model: 'llama-3.3-70b' };
  };

  const providerInfo = getProviderDisplay();

  return (
    <div className="ai-analysis-tab">
      {/* Provider Settings Modal */}
      {showProviderSettings && (
        <div className="provider-settings-modal-overlay" onClick={() => setShowProviderSettings(false)}>
          <div className="provider-settings-modal" onClick={e => e.stopPropagation()}>
            <OllamaSettings
              onClose={() => setShowProviderSettings(false)}
              onProviderChange={handleProviderChange}
            />
          </div>
        </div>
      )}

      {/* Provider Indicator */}
      <div className="ai-provider-indicator">
        <button
          className="provider-toggle-btn"
          onClick={() => setShowProviderSettings(true)}
          title="AI Provider Settings"
        >
          <span className="provider-icon">{providerInfo.icon}</span>
          <span className="provider-name">{providerInfo.name}</span>
          <span className="provider-model">{providerInfo.model}</span>
          <span className="settings-icon">⚙️</span>
        </button>
      </div>

      {/* Study Stats Bar - Shows progress */}
      {(result || completedModes.size > 0) && (
        <StudyStats
          completedModes={completedModes}
          reference={reference}
          sessionStart={sessionStart}
        />
      )}

      {/* Verse count - minimal */}
      {isMultiVerse && verseCount > 1 && (
        <div className="verse-count-badge">
          {verseCount} verses
        </div>
      )}

      {/* Mode Selection */}
      <ModeGrid
        selectedMode={selectedMode}
        onSelect={handleModeSelect}
        loading={loading}
        showGenesisMode={isGenesis}
        isMultiVerse={isMultiVerse}
        completedModes={completedModes}
        textType={textType}
        favoriteModes={favoriteModes}
        onToggleFavorite={toggleFavorite}
      />

      {/* Learning Objectives - What you should learn */}
      {(result || currentStudyStep) && (
        <LearningObjectivesPanel
          objectives={getLearningObjectives(textType, selectedBook, text, studyApproach)}
          studyApproach={studyApproach}
        />
      )}

      {/* Study Path Panel - Guided Kollel-style learning */}
      {(result || currentStudyStep) && (
        <StudyPathPanel
          steps={textType === 'talmud' ? TALMUD_STUDY_STEPS : STUDY_STEPS}
          currentStep={currentStudyStep}
          completedSteps={completedStudySteps}
          onStepClick={handleStudyStepClick}
          studyApproach={studyApproach}
          onApproachChange={setStudyApproach}
        />
      )}

      {/* Analyze Controls - Simplified */}
      <div className="analyze-controls-simple">
        {/* Source dropdown - only show if commentaries available */}
        {(rashiText || rambanText) && (
          <select
            className="source-select"
            value={selectedContent}
            onChange={(e) => setSelectedContent(e.target.value)}
          >
            <option value={CONTENT_TYPES.VERSE}>Verse only</option>
            {rashiText && <option value={CONTENT_TYPES.RASHI}>+ Rashi</option>}
            {rambanText && <option value={CONTENT_TYPES.RAMBAN}>+ Ramban</option>}
            <option value={CONTENT_TYPES.ALL}>All sources</option>
          </select>
        )}

        {/* Main analyze button */}
        <button
          onClick={() => handleAnalyze()}
          disabled={loading || !text}
          className="btn-analyze-main"
        >
          {loading ? 'Analyzing...' : '🧠 Analyze'}
        </button>

        {/* Auto toggle */}
        <label className="auto-toggle" title="Auto-analyze on mode change">
          <input
            type="checkbox"
            checked={autoAnalyze}
            onChange={(e) => setAutoAnalyze(e.target.checked)}
          />
          <span>Auto</span>
        </label>
      </div>

      {/* Loading Skeleton */}
      {loading && <LoadingSkeleton />}

      {/* Error Display with Retry */}
      {error && (
        <div className="ai-error">
          <div className="error-content">
            <span className="error-icon">⚠️</span>
            <span className="error-message">{error}</span>
          </div>
          <div className="error-actions">
            <button
              onClick={() => handleAnalyze(false)}
              className="error-retry"
              disabled={loading}
            >
              🔄 Retry
            </button>
            <button onClick={() => setError(null)} className="error-dismiss">×</button>
          </div>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <>
          {/* Result Actions Bar */}
          <div className="result-actions">
            <button
              onClick={handleCopy}
              className="action-btn copy-btn"
              title="Copy to clipboard"
            >
              <span>📋</span> Copy
            </button>
            <button
              onClick={handleExport}
              className="action-btn export-btn"
              title="Download as text file"
            >
              <span>📥</span> Export
            </button>
            {studyContext?.addNote && (
              <button
                onClick={handleSaveToNotes}
                className="action-btn save-btn"
                title="Save to study notes"
              >
                <span>💾</span> Save to Notes
              </button>
            )}
            {saveSuccess && (
              <span className="save-success">{saveSuccess}</span>
            )}
          </div>

          <AIResult result={result} mode={selectedMode} />

          {/* RAG Sources Panel - View actual sources used */}
          {result?.ragEnhanced && result?.ragMetadata?.sources && (
            <RAGSourcesPanel
              ragMetadata={result.ragMetadata}
              isCollapsed={ragPanelCollapsed}
              onToggleCollapse={() => setRagPanelCollapsed(!ragPanelCollapsed)}
            />
          )}

          {/* Follow-up Question with RAG - Chavruta-style Q&A */}
          <FollowUpQuestion
            reference={reference}
            hebrewText={text}
            previousAnalysis={result}
            ragContext={result?.ragMetadata ? {
              totalSources: result.ragMetadata.sourcesCount,
              sources: result.ragMetadata.sourceNames || []
            } : null}
            textType={textType}
            isGenesis={selectedBook?.toLowerCase() === 'genesis' || selectedBook === 'בראשית'}
          />
        </>
      )}

      {/* Enhanced Empty State with Kollel-Style Learning */}
      {!result && !loading && !error && (
        <EmptyState
          suggestions={getContextualSuggestions(textType, selectedBook, text)}
          onSelectMode={(mode) => {
            setSelectedMode(mode);
            if (autoAnalyze) handleAnalyze();
          }}
          textType={textType}
          reference={reference}
          rashiText={rashiText}
          onStartStudyPath={handleStartStudyPath}
          studyQuestions={getStudyQuestions(textType, selectedBook, text)}
          onAskQuestion={handleAskStudyQuestion}
        />
      )}

      {/* Recent History Panel */}
      {!result && !loading && (
        <div className="history-section">
          <button
            className={`history-toggle ${showHistory ? 'active' : ''}`}
            onClick={() => setShowHistory(!showHistory)}
          >
            <span>📚</span> Recent Analyses ({getRecentAnalyses(10).length})
          </button>

          {showHistory && (
            <div className="history-list">
              {getRecentAnalyses(10).length === 0 ? (
                <p className="history-empty">No analyses yet. Run an analysis to build your history.</p>
              ) : (
                getRecentAnalyses(10).map(item => (
                  <div
                    key={item.id}
                    className="history-item clickable"
                    onClick={() => {
                      if (item.result) {
                        setResult(item.result);
                        setSelectedMode(item.mode);
                        setCompletedModes(prev => new Set([...prev, item.mode]));
                        setSaveSuccess('Loaded from history');
                        setTimeout(() => setSaveSuccess(null), 1500);
                        setShowHistory(false);
                      }
                    }}
                    title="Click to load this analysis"
                  >
                    <div className="history-item-header">
                      <span className="history-mode">{item.modeName || item.mode}</span>
                      <span className="history-ref">{item.reference}</span>
                      <button
                        className="history-delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeAnalysis(item.id);
                        }}
                        title="Remove from history"
                      >
                        ×
                      </button>
                    </div>
                    <p className="history-summary">
                      {item.summary?.slice(0, 100)}{item.summary?.length > 100 ? '...' : ''}
                    </p>
                    <span className="history-date">
                      {new Date(item.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default AIAnalysisTab;
