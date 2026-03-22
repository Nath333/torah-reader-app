/**
 * CommentarySummary - Modular Component Architecture
 *
 * This folder contains the refactored CommentarySummary component
 * split into smaller, reusable pieces with lazy loading support.
 *
 * Structure:
 * ├── index.js              (this file - orchestrator)
 * ├── MermaidDiagram.js     (diagram rendering with fallback)
 * ├── ModeSelector.js       (analysis mode selection)
 * ├── SharedComponents.js   (InfoCard, TopicTag, SefariaLink, etc)
 * └── views/
 *     ├── SummaryView.js    (default overview)
 *     ├── DeepStudyView.js  (iyun analysis)
 *     ├── CompareView.js    (machloket analysis)
 *     ├── PardesView.js     (four levels)
 *     └── HalachaView.js    (practical law)
 */

import React, { useState, useEffect, useCallback, useRef, useMemo, Suspense, lazy, memo } from 'react';
import { analyzeCommentary, ANALYSIS_MODES } from '../../../services/groqService';
import '../CommentarySummary.css';

// Eager-loaded components (used on initial render)
import ModeSelector from './ModeSelector';

// Lazy-loaded view components (code splitting for bundle size)
const SummaryView = lazy(() => import('./views/SummaryView'));
const DeepStudyView = lazy(() => import('./views/DeepStudyView'));
const CompareView = lazy(() => import('./views/CompareView'));
const PardesView = lazy(() => import('./views/PardesView'));
const HalachaView = lazy(() => import('./views/HalachaView'));

// Loading fallback for lazy views
const ViewLoader = () => (
  <div className="view-loading">
    <div className="loading-spinner"></div>
    <span>Loading view...</span>
  </div>
);

// ============================================================================
// Main Component
// ============================================================================
function CommentarySummary({
  commentaryText,
  source = 'Commentary',
  verse = '',
  onClose,
  textType = 'torah',
  isMultiVerse = false,
  // Callback props for interactive elements
  onTopicClick,
  onSourceClick,
  onWordLookup,
  onConceptClick,
}) {
  const [mode, setMode] = useState(ANALYSIS_MODES.SUMMARY);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [showDiagram, setShowDiagram] = useState(true);

  // PERFORMANCE: Cache results per mode to avoid re-fetching when switching
  const modeResultsCache = useRef(new Map());

  // Context detection for smart mode analysis
  const isTalmud = textType === 'talmud' ||
    source?.toLowerCase().includes('talmud') ||
    source?.toLowerCase().includes('gemara');
  const isGenesis = verse?.toLowerCase().includes('genesis') ||
    verse?.toLowerCase().includes('bereshit') ||
    verse?.toLowerCase().includes('בראשית');

  // Parse verse reference for RAG context
  const parsedRef = useMemo(() => {
    if (!verse) return { book: null, chapter: null, verseNum: null };

    const match = verse.match(/^([A-Za-z\u0590-\u05FF]+)\s*\.?\s*(\d+)[:.]?(\d+)?/);
    if (match) {
      return {
        book: match[1],
        chapter: match[2],
        verseNum: match[3] || null
      };
    }
    return { book: null, chapter: null, verseNum: null };
  }, [verse]);

  // Clear cache when commentary text changes
  useEffect(() => {
    modeResultsCache.current.clear();
  }, [commentaryText, source, verse]);

  const analyze = useCallback(async (selectedMode, forceRefresh = false) => {
    if (!commentaryText || commentaryText.trim().length < 20) {
      setError('Commentary text is too short to analyze');
      return;
    }

    // Check cache first (unless force refresh)
    const cacheKey = selectedMode;
    if (!forceRefresh && modeResultsCache.current.has(cacheKey)) {
      const cached = modeResultsCache.current.get(cacheKey);
      setData({ ...cached, fromCache: true });
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await analyzeCommentary(
        commentaryText,
        source,
        verse,
        selectedMode,
        {
          isTalmud,
          isMultiVerse,
          isGenesis,
          book: parsedRef.book,
          chapter: parsedRef.chapter,
          verseNum: parsedRef.verseNum,
          useRAG: true
        }
      );
      if (result.success) {
        modeResultsCache.current.set(cacheKey, result);
        setData(result);
      } else {
        setError(result.error || 'Analysis failed');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [commentaryText, source, verse, isTalmud, isMultiVerse, isGenesis, parsedRef]);

  useEffect(() => {
    analyze(mode);
  }, [mode, analyze]);

  const handleModeChange = (newMode) => {
    setMode(newMode);
  };

  const diagramId = useMemo(() =>
    `${source}-${verse}-${mode}`.replace(/[^a-zA-Z0-9]/g, '-'),
    [source, verse, mode]
  );

  const renderContent = () => {
    if (!data) return null;

    // Common props for all view components
    const commonProps = {
      data,
      showDiagram,
      diagramId,
      onSourceClick,
      onWordLookup,
    };

    return (
      <Suspense fallback={<ViewLoader />}>
        {mode === ANALYSIS_MODES.IYUN && <DeepStudyView {...commonProps} />}
        {mode === ANALYSIS_MODES.MACHLOKET && <CompareView {...commonProps} />}
        {mode === ANALYSIS_MODES.MUSSAR && <PardesView {...commonProps} />}
        {mode === ANALYSIS_MODES.HALACHA && <HalachaView {...commonProps} />}
        {(mode === ANALYSIS_MODES.SUMMARY || mode === ANALYSIS_MODES.MAREI_MEKOMOT) && (
          <SummaryView {...commonProps} onTopicClick={onTopicClick} onConceptClick={onConceptClick} />
        )}
      </Suspense>
    );
  };

  return (
    <div className="commentary-summary">
      {/* Header */}
      <div className="summary-header">
        <div className="header-left">
          <span className="summary-icon">🤖</span>
          <span className="header-title">AI Study Assistant</span>
          <span className="header-source">{source}</span>
        </div>
        <div className="header-actions">
          {data?.diagram && (
            <button
              className={`header-btn ${showDiagram ? 'active' : ''}`}
              onClick={() => setShowDiagram(!showDiagram)}
              title={showDiagram ? 'Hide diagram' : 'Show diagram'}
            >
              📊
            </button>
          )}
          <button
            className="header-btn"
            onClick={() => analyze(mode, true)}
            title="Regenerate (bypass cache)"
            disabled={loading}
          >
            🔄
          </button>
          {onClose && (
            <button className="header-btn close" onClick={onClose}>×</button>
          )}
        </div>
      </div>

      {/* Mode Selector */}
      <ModeSelector currentMode={mode} onModeChange={handleModeChange} loading={loading} />

      {/* Content Area */}
      <div className="summary-content">
        {/* Loading State */}
        {loading && (
          <div className="loading-content">
            <div className="loading-spinner"></div>
            <p className="loading-text">Analyzing with AI...</p>
            <p className="loading-sub">
              {mode === ANALYSIS_MODES.IYUN ? 'Learning b\'iyun like a chavrusa...' :
               mode === ANALYSIS_MODES.MACHLOKET ? 'Analyzing disputes...' :
               mode === ANALYSIS_MODES.MUSSAR ? 'Extracting ethical lessons...' :
               mode === ANALYSIS_MODES.HALACHA ? 'Tracing halachic chain...' :
               mode === ANALYSIS_MODES.MAREI_MEKOMOT ? 'Mapping cross-references...' :
               'Creating summary...'}
            </p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="error-content">
            <div className="error-icon">❌</div>
            <p className="error-message">{error}</p>
            <button className="retry-btn" onClick={() => analyze(mode)}>
              🔄 Try Again
            </button>
          </div>
        )}

        {/* Main Content */}
        {!loading && !error && data && renderContent()}
      </div>

      {/* Footer */}
      {data && !loading && (
        <div className="summary-footer">
          <span className="footer-info">
            {data.fromCache ? '⚡ Cached' : `🤖 ${data.model || 'Llama 3.3'}`}
          </span>
          {data.usage && !data.fromCache && (
            <span className="footer-tokens">{data.usage.total_tokens} tokens</span>
          )}
        </div>
      )}
    </div>
  );
}

// Export sub-components for reuse
export { default as MermaidDiagram } from './MermaidDiagram';
export { default as ModeSelector, MODES } from './ModeSelector';
export * from './SharedComponents';
export * from './views';

export default memo(CommentarySummary);
