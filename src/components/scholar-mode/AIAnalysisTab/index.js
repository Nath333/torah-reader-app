/**
 * AIAnalysisTab - AI-Powered Torah/Talmud Study Tools
 *
 * Parallel to TalmudToolsTab but with AI enhancement:
 *
 * 📚 STUDY MODES (AI-Enhanced):
 * 1. עיון (Iyun) - Deep analysis with AI: explains sevara, generates diagrams, provides context
 * 2. בקיאות (Bekius) - Overview with AI: natural language summary, key points extraction
 * 3. חזרה (Chazara) - Review with AI: custom quiz questions, adaptive difficulty, explanations
 *
 * =============================================================================
 * ARCHITECTURE (PRO SCHOLAR V32)
 * =============================================================================
 *
 * THIS FILE: Main container + Provider management
 * - ModeGrid: 3 mode selection buttons (matches Talmud tab structure)
 * - AIIyunMode: Deep analysis with AI (structure, sevara, context, diagrams)
 * - AIBekiusMode: Overview/summary with AI (auto-run, key points, full result)
 * - AIChazaraMode: Quiz/review with AI (questions, scoring, feedback)
 *
 * PROVIDERS:
 * - Groq (cloud): Fast inference with llama-3.3-70b
 * - Ollama (local): Privacy-first local models
 * - Auto: Prefers local, falls back to cloud
 *
 * CSS:
 * - AIAnalysisTab.css: Main container styles
 * - AIModes.css: Mode-specific component styles
 * =============================================================================
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { safeGet, safeSet } from '../../../utils/safeLocalStorage';
import { hasApiKey as checkHasApiKey } from '../../../services/groqService';
import {
  AI_PROVIDERS,
  getSelectedProvider,
  checkProviderAvailability
} from '../../../services/providers/aiProviderFactory';
import { checkOllamaConnection, getOllamaSettings } from '../../../services/providers/ollamaProvider';

// =============================================================================
// Shared Constants (DRY - Single Source of Truth)
// =============================================================================
import { TEXT_TYPE_LABELS, STUDY_MODES as STUDY_MODE_CONFIG } from '../../../constants/talmudStudy';

// =============================================================================
// Mode Components
// =============================================================================
import ModeGrid, { STUDY_MODES } from './ModeGrid';
import AIIyunMode from './AIIyunMode';
import AIBekiusMode from './AIBekiusMode';
import AIChazaraMode from './AIChazaraMode';

// =============================================================================
// Supporting Components
// =============================================================================
import APIKeySetup from '../APIKeySetup';
import OllamaSettings from '../../settings/OllamaSettings';

// =============================================================================
// PRO Features: History & Study Context
// =============================================================================
import useAnalysisHistory from '../../../hooks/useAnalysisHistory';
import { useStudy } from '../../../context/StudyContext';

// =============================================================================
// Styles
// =============================================================================
import './AIAnalysisTab.css';
import './AIModes.css';

// =============================================================================
// Constants
// =============================================================================
const PINNED_MODE_KEY = 'torah-reader-ai-pinned-mode';

// Mode Component Map (DRY - single source for rendering)
const MODE_COMPONENTS = {
  [STUDY_MODES.IYUN]: AIIyunMode,
  [STUDY_MODES.BEKIUS]: AIBekiusMode,
  [STUDY_MODES.CHAZARA]: AIChazaraMode
};

// =============================================================================
// Helper Functions
// =============================================================================
const getPinnedMode = (book) => {
  const pinned = safeGet(PINNED_MODE_KEY, {});
  return pinned[book] || STUDY_MODES.IYUN;
};

const setPinnedMode = (book, mode) => {
  const pinned = safeGet(PINNED_MODE_KEY, {});
  pinned[book] = mode;
  safeSet(PINNED_MODE_KEY, pinned);
};

// =============================================================================
// Study Stats Component - Shows session progress
// =============================================================================
const StudyStats = React.memo(function StudyStats({ completedModes, reference, sessionStart }) {
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
});

StudyStats.propTypes = {
  completedModes: PropTypes.instanceOf(Set),
  reference: PropTypes.string,
  sessionStart: PropTypes.number
};

// =============================================================================
// Empty State Component - When no mode is active
// =============================================================================
const EmptyState = React.memo(function EmptyState({ reference, textType }) {
  return (
    <div className="ai-empty-state">
      <div className="empty-header">
        <span className="empty-icon">🤖</span>
        <div className="empty-text">
          <h3 className="empty-title">{reference || 'Select a Verse'}</h3>
          <p className="empty-subtitle">
            {textType === 'talmud'
              ? 'Choose a study mode to analyze this sugya with AI'
              : 'Choose a study mode to analyze this text with AI'
            }
          </p>
        </div>
      </div>
      <div className="empty-hint">
        <span className="hint-icon">💡</span>
        <span className="hint-text">לניתוח ללא AI השתמש בלשונית גמרא</span>
      </div>
    </div>
  );
});

EmptyState.propTypes = {
  reference: PropTypes.string,
  textType: PropTypes.string
};

// =============================================================================
// Main AIAnalysisTab Component
// =============================================================================
const AIAnalysisTab = ({
  text,
  reference,
  textType = 'torah',
  selectedBook,
  selectedVerses,
  isMultiVerse = false
}) => {
  // ---------------------------------------------------------------------------
  // State: AI Provider
  // ---------------------------------------------------------------------------
  const [hasKey, setHasKey] = useState(false);
  const [currentProvider, setCurrentProvider] = useState(getSelectedProvider());
  const [ollamaStatus, setOllamaStatus] = useState(null);
  const [showProviderSettings, setShowProviderSettings] = useState(false);

  // ---------------------------------------------------------------------------
  // State: Study Mode
  // ---------------------------------------------------------------------------
  const [selectedMode, setSelectedMode] = useState(() => getPinnedMode(selectedBook));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [completedModes, setCompletedModes] = useState(new Set());
  const [sessionStart] = useState(() => Date.now());
  const [showHistory, setShowHistory] = useState(false);

  // ---------------------------------------------------------------------------
  // PRO: Analysis History & Study Context
  // ---------------------------------------------------------------------------
  const {
    addAnalysis,
    getRecentAnalyses,
    removeAnalysis
  } = useAnalysisHistory();

  // Study context for tracking progress and session data
  const studyContext = useStudy();

  // ---------------------------------------------------------------------------
  // Effect: Check AI Provider availability on mount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let isMounted = true;

    const checkProviders = async () => {
      const provider = getSelectedProvider();
      const hasGroqKey = checkHasApiKey();

      let ollamaResult = null;
      if (provider === AI_PROVIDERS.OLLAMA || provider === AI_PROVIDERS.AUTO) {
        ollamaResult = await checkOllamaConnection();
      }

      if (!isMounted) return;

      setCurrentProvider(provider);
      setHasKey(hasGroqKey);
      if (ollamaResult) {
        setOllamaStatus(ollamaResult);
      }
    };

    checkProviders();
    return () => { isMounted = false; };
  }, []);

  // ---------------------------------------------------------------------------
  // Effect: Reset state when reference changes
  // ---------------------------------------------------------------------------
  const prevReferenceRef = useRef(reference);
  useEffect(() => {
    if (reference !== prevReferenceRef.current) {
      setError(null);
      setCompletedModes(new Set());
      prevReferenceRef.current = reference;
    }
  }, [reference]);

  // ---------------------------------------------------------------------------
  // Effect: Restore pinned mode when book changes
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (selectedBook) {
      const pinnedMode = getPinnedMode(selectedBook);
      if (pinnedMode !== selectedMode) {
        setSelectedMode(pinnedMode);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBook]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleModeSelect = useCallback((mode) => {
    setSelectedMode(mode);
    setError(null);
    if (selectedBook) {
      setPinnedMode(selectedBook, mode);
    }
  }, [selectedBook]);

  const handleProviderChange = useCallback((newProvider) => {
    setCurrentProvider(newProvider);
    checkProviderAvailability(newProvider);
  }, []);

  const handleModeComplete = useCallback((mode, result) => {
    setCompletedModes(prev => new Set([...prev, mode]));

    // PRO: Save to analysis history
    if (result && reference) {
      // Use shared STUDY_MODE_CONFIG for Hebrew labels (DRY)
      const modeConfig = STUDY_MODE_CONFIG[mode];
      addAnalysis({
        reference,
        book: selectedBook,
        mode,
        modeName: modeConfig?.hebrew || mode,
        textType,
        result,
        summary: result?.summary || result?.rawText?.slice(0, 100) || '',
        provider: currentProvider
      });

      // PRO: Update study context with completed analysis
      if (studyContext?.logStudyEvent) {
        studyContext.logStudyEvent({
          type: 'ai_analysis',
          mode,
          reference,
          book: selectedBook,
          timestamp: Date.now()
        });
      }
    }
  }, [reference, selectedBook, textType, currentProvider, addAnalysis, studyContext]);

  // ---------------------------------------------------------------------------
  // Provider Display
  // ---------------------------------------------------------------------------
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

  // ---------------------------------------------------------------------------
  // Render: API Key Setup if no provider available
  // ---------------------------------------------------------------------------
  if (!hasKey && !ollamaStatus?.connected) {
    return <APIKeySetup onKeySet={() => setHasKey(true)} />;
  }

  // ---------------------------------------------------------------------------
  // Render: Main Component
  // ---------------------------------------------------------------------------
  const verseCount = isMultiVerse && selectedVerses ? selectedVerses.length : 1;

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

      {/* Compact AI Header: Text type + Provider */}
      <div className="ai-header-compact">
        {/* Text type badge - uses shared .text-type-badge class (DRY) */}
        {(() => {
          const normalizedType = (textType || 'torah').toLowerCase();
          const label = TEXT_TYPE_LABELS[normalizedType] || TEXT_TYPE_LABELS.torah;
          return (
            <div className={`text-type-badge ${normalizedType}`}>
              <span>{label.icon}</span>
              <span>{label.hebrew}</span>
            </div>
          );
        })()}
        {/* Provider badge */}
        <button
          className="provider-badge-compact"
          onClick={() => setShowProviderSettings(true)}
          title="AI Provider Settings"
        >
          <span>{providerInfo.icon}</span>
          <span>{providerInfo.name}</span>
          <span className="provider-gear">⚙</span>
        </button>
      </div>

      {/* Mode Selection Grid */}
      <ModeGrid
        selectedMode={selectedMode}
        onSelect={handleModeSelect}
        loading={loading}
        completedModes={completedModes}
        textType={textType}
      />

      {/* Error Display */}
      {error && (
        <div className="ai-error">
          <div className="error-content">
            <span className="error-icon">⚠️</span>
            <span className="error-message">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="error-dismiss">×</button>
        </div>
      )}

      {/* Study Stats Bar - PRO */}
      {completedModes.size > 0 && (
        <StudyStats
          completedModes={completedModes}
          reference={reference}
          sessionStart={sessionStart}
        />
      )}

      {/* Verse Count Badge */}
      {isMultiVerse && verseCount > 1 && (
        <div className="verse-count-badge">
          {verseCount} verses
        </div>
      )}

      {/* Mode-Specific Content Panels (DRY - component map) */}
      <div className="mode-content-area">
        {(() => {
          const ModeComponent = MODE_COMPONENTS[selectedMode];
          if (!ModeComponent) return null;
          return (
            <ModeComponent
              text={text}
              reference={reference}
              onResult={(data) => handleModeComplete(selectedMode, data?.result || data)}
              loading={loading}
              setLoading={setLoading}
            />
          );
        })()}
      </div>

      {/* Empty State - when no text selected */}
      {!text && (
        <EmptyState reference={reference} textType={textType} />
      )}

      {/* PRO: Recent Analysis History Panel */}
      {!loading && (
        <div className="history-section">
          <button
            className={`history-toggle ${showHistory ? 'active' : ''}`}
            onClick={() => setShowHistory(!showHistory)}
          >
            <span>📚</span>
            <span>Recent Analyses ({getRecentAnalyses(10).length})</span>
          </button>

          {showHistory && (
            <div className="history-list">
              {getRecentAnalyses(10).length === 0 ? (
                <p className="history-empty">No analyses yet. Run an analysis to build your history.</p>
              ) : (
                getRecentAnalyses(10).map(item => (
                  <div key={item.id} className="history-item">
                    <div className="history-item-header">
                      <span className="history-mode">{item.modeName || item.mode}</span>
                      <span className="history-ref">{item.reference}</span>
                      <button
                        className="history-delete"
                        onClick={() => removeAnalysis(item.id)}
                        title="Remove from history"
                      >
                        ×
                      </button>
                    </div>
                    <p className="history-summary">
                      {item.summary?.slice(0, 80)}{item.summary?.length > 80 ? '...' : ''}
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

AIAnalysisTab.propTypes = {
  text: PropTypes.string,
  reference: PropTypes.string,
  textType: PropTypes.oneOf(['torah', 'talmud', 'gemara', 'mishna', 'mishnah', 'neviim', 'ketuvim']),
  selectedBook: PropTypes.string,
  selectedVerses: PropTypes.array,
  isMultiVerse: PropTypes.bool
};

export default AIAnalysisTab;
