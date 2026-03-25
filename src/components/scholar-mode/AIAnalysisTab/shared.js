/**
 * AIAnalysisTab/shared.js - Shared Components & Utilities (DRY)
 *
 * PRO SCHOLAR V32: Single source of truth for:
 * - Common UI components (Header, Error, EmptyState, ActionButton, WaitingState)
 * - Shared PropTypes
 * - Mode configuration lookup
 * - Shared hooks (useAIAnalysis)
 *
 * Used by: AIIyunMode, AIBekiusMode, AIChazaraMode
 */
import React, { memo, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { STUDY_MODES } from '../../../constants/talmudStudy';
import { analyzeCommentary } from '../../../services/groqService';

// =============================================================================
// MODE CONFIGURATION - UI properties for each study mode
// =============================================================================

export const MODE_UI_CONFIG = {
  iyun: {
    ...STUDY_MODES.iyun,
    subtitle: 'לימוד מעמיק - הסברי סברא והקשרים',
    shortcut: '1',
    emptyText: 'בחר טקסט לניתוח עיון עם AI'
  },
  bekius: {
    ...STUDY_MODES.bekius,
    subtitle: 'סקירה כללית - סיכום ונקודות מפתח',
    shortcut: '2',
    emptyText: 'בחר טקסט לסיכום בקיאות עם AI'
  },
  chazara: {
    ...STUDY_MODES.chazara,
    subtitle: 'בחינה עצמית - שאלות מותאמות אישית',
    shortcut: '3',
    emptyText: 'בחר טקסט ליצירת שאלות חזרה עם AI'
  }
};

// =============================================================================
// ModeHeader - Shared header component for all AI modes
// =============================================================================

export const ModeHeader = memo(function ModeHeader({ mode, children }) {
  const config = MODE_UI_CONFIG[mode];
  if (!config) return null;

  return (
    <div className={`${mode}-header mode-header`}>
      <span className="header-icon">{config.icon}</span>
      <div className="header-text">
        <span className="header-title">{config.hebrew} עם AI</span>
        <span className="header-subtitle">{config.subtitle}</span>
      </div>
      {children}
    </div>
  );
});

ModeHeader.propTypes = {
  mode: PropTypes.oneOf(['iyun', 'bekius', 'chazara']).isRequired,
  children: PropTypes.node
};

// =============================================================================
// ModeError - Shared error display component
// =============================================================================

export const ModeError = memo(function ModeError({ error, className = '' }) {
  if (!error) return null;

  return (
    <div className={`mode-error ${className}`}>
      <span className="error-icon">⚠️</span>
      <span>{error}</span>
    </div>
  );
});

ModeError.propTypes = {
  error: PropTypes.string,
  className: PropTypes.string
};

// =============================================================================
// ModeEmptyState - Shared empty state when no text selected
// =============================================================================

export const ModeEmptyState = memo(function ModeEmptyState({ mode }) {
  const config = MODE_UI_CONFIG[mode];
  if (!config) return null;

  return (
    <div className={`${mode}-empty mode-empty`}>
      <span className="empty-icon">📜</span>
      <span>{config.emptyText}</span>
    </div>
  );
});

ModeEmptyState.propTypes = {
  mode: PropTypes.oneOf(['iyun', 'bekius', 'chazara']).isRequired
};

// =============================================================================
// ModeResultText - Shared text rendering for AI results
// =============================================================================

export const ModeResultText = memo(function ModeResultText({ text }) {
  if (!text) return null;

  return (
    <div className="result-text">
      {text.split('\n').map((line, i) => (
        <p key={i}>{line || '\u00A0'}</p>
      ))}
    </div>
  );
});

ModeResultText.propTypes = {
  text: PropTypes.string
};

// =============================================================================
// Shared PropTypes - Common prop definitions for all mode components
// =============================================================================

export const modePropTypes = {
  text: PropTypes.string,
  reference: PropTypes.string,
  onResult: PropTypes.func,
  loading: PropTypes.bool,
  setLoading: PropTypes.func
};

// =============================================================================
// ActionButton - Shared button component for AI actions
// =============================================================================

export const ActionButton = memo(function ActionButton({
  onClick,
  disabled,
  loading,
  icon,
  loadingText,
  children,
  variant = 'primary', // 'primary' | 'secondary'
  className = ''
}) {
  return (
    <button
      className={`ai-action-btn ${variant} ${loading ? 'loading' : ''} ${className}`}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? (
        <>
          <span className="btn-spinner" />
          <span>{loadingText || 'מעבד...'}</span>
        </>
      ) : (
        <>
          {icon && <span className="btn-icon">{icon}</span>}
          <span>{children}</span>
        </>
      )}
    </button>
  );
});

ActionButton.propTypes = {
  onClick: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  loading: PropTypes.bool,
  icon: PropTypes.string,
  loadingText: PropTypes.string,
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(['primary', 'secondary']),
  className: PropTypes.string
};

// =============================================================================
// WaitingState - Shown when ready to analyze but not started
// =============================================================================

export const WaitingState = memo(function WaitingState({ actionText = 'לחץ להתחיל' }) {
  return (
    <div className="mode-waiting">
      <span className="waiting-icon">👆</span>
      <span>{actionText}</span>
    </div>
  );
});

WaitingState.propTypes = {
  actionText: PropTypes.string
};

// =============================================================================
// LoadingSpinner - Inline loading indicator
// =============================================================================

export const LoadingSpinner = memo(function LoadingSpinner({ size = 'medium' }) {
  return <span className={`btn-spinner ${size}`} />;
});

LoadingSpinner.propTypes = {
  size: PropTypes.oneOf(['small', 'medium', 'large'])
};

// =============================================================================
// useAIAnalysis - Shared hook for AI analysis logic (DRY)
// =============================================================================

export function useAIAnalysis({ text, reference, onResult, setLoading }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const runAnalysis = useCallback(async (prompt, analysisType = 'analysis') => {
    if (!text) return null;

    setLoading?.(true);
    setError(null);

    try {
      const analysisResult = await analyzeCommentary(text, reference || 'Text', '', analysisType, {
        customPrompt: prompt
      });

      setResult(analysisResult);
      onResult?.({ type: analysisType, result: analysisResult });
      return analysisResult;
    } catch (err) {
      console.error(`[useAIAnalysis] Error:`, err);
      setError(err.message || 'שגיאה בניתוח');
      return null;
    } finally {
      setLoading?.(false);
    }
  }, [text, reference, onResult, setLoading]);

  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    result,
    error,
    setError,
    runAnalysis,
    clearResult
  };
}

// =============================================================================
// useMultiAnalysis - Hook for modes with multiple analysis types (like Iyun)
// =============================================================================

export function useMultiAnalysis({ text, reference, onResult, setLoading }) {
  const [results, setResults] = useState({});
  const [activeAnalysis, setActiveAnalysis] = useState(null);
  const [error, setError] = useState(null);

  const runAnalysis = useCallback(async (type, prompt, analysisMode = 'iyun') => {
    if (!text) return null;

    setLoading?.(true);
    setActiveAnalysis(type);
    setError(null);

    try {
      const result = await analyzeCommentary(text, reference || 'Text', '', analysisMode, {
        customPrompt: prompt
      });

      setResults(prev => ({ ...prev, [type]: result }));
      onResult?.({ type, result });
      return result;
    } catch (err) {
      console.error(`[useMultiAnalysis] Error for ${type}:`, err);
      setError(err.message || 'שגיאה בניתוח');
      return null;
    } finally {
      setLoading?.(false);
      setActiveAnalysis(null);
    }
  }, [text, reference, onResult, setLoading]);

  const clearResults = useCallback(() => {
    setResults({});
    setError(null);
  }, []);

  return {
    results,
    activeAnalysis,
    error,
    setError,
    runAnalysis,
    clearResults,
    hasResult: (type) => !!results[type]
  };
}

// =============================================================================
// ANALYSIS_BUTTON_CONFIG - Shared button configurations
// =============================================================================

export const ANALYSIS_BUTTON_TYPES = {
  structure: { icon: '🏗️', label: 'מבנה הסוגיא', sublabel: 'Structure' },
  sevara: { icon: '🧠', label: 'הסבר הסברא', sublabel: 'Reasoning' },
  context: { icon: '📚', label: 'הקשר והרקע', sublabel: 'Context' },
  diagram: { icon: '📊', label: 'תרשים מושגי', sublabel: 'Diagram' },
  summary: { icon: '📋', label: 'סיכום', sublabel: 'Summary' },
  quiz: { icon: '🎯', label: 'שאלות', sublabel: 'Quiz' }
};

// =============================================================================
// AnalysisButton - Reusable analysis action button
// =============================================================================

export const AnalysisButton = memo(function AnalysisButton({
  type,
  onClick,
  disabled,
  isLoading,
  isCompleted,
  customConfig
}) {
  const config = customConfig || ANALYSIS_BUTTON_TYPES[type] || {};

  return (
    <button
      className={`analysis-btn ${isLoading ? 'loading' : ''} ${isCompleted ? 'completed' : ''}`}
      onClick={() => onClick(type)}
      disabled={disabled || isLoading}
    >
      <span className="btn-icon">{config.icon}</span>
      <div className="btn-labels">
        <span className="btn-label">{config.label}</span>
        <span className="btn-sublabel">{config.sublabel}</span>
      </div>
      {isCompleted && <span className="btn-check">✓</span>}
      {isLoading && <LoadingSpinner size="small" />}
    </button>
  );
});

AnalysisButton.propTypes = {
  type: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  isLoading: PropTypes.bool,
  isCompleted: PropTypes.bool,
  customConfig: PropTypes.shape({
    icon: PropTypes.string,
    label: PropTypes.string,
    sublabel: PropTypes.string
  })
};

// =============================================================================
// ResultCard - Shared result display card
// =============================================================================

export const ResultCard = memo(function ResultCard({ type, icon, title, children }) {
  return (
    <div className={`result-card result-card-${type}`}>
      <div className="result-header">
        <span className="result-icon">{icon}</span>
        <span className="result-title">{title}</span>
      </div>
      <div className="result-content">
        {children}
      </div>
    </div>
  );
});

ResultCard.propTypes = {
  type: PropTypes.string,
  icon: PropTypes.string,
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired
};
