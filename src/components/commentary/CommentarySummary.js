import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { analyzeCommentary, ANALYSIS_MODES } from '../../services/groqService';
// 2026 Smart Features - AI Memory & Source Credibility
import {
  addMessage as addToMemory,
  trackStudy
} from '../../services/ai/aiMemoryService';
import {
  getSourceCredibility,
  getCredibilityBadge
} from '../../services/sourceCredibilityService';
// PRO SCHOLAR V8: Feature flags (renamed from proScholarV4)
import {
  prefetchWords,
  PRO_SCHOLAR_FEATURES
} from '../../services/featureFlags';
// PRO SCHOLAR V8: Use createManagedCache instead of deprecated getCached/setCached
import { createManagedCache } from '../../services/cacheOrchestrator';
import { useProScholarV4, useKnowledgeGraph } from '../../hooks/useProScholarV4';
import {
  DeepStudyView,
  CompareView,
  PardesView,
  HalachaView,
  SummaryView
} from './CommentarySummary/views';
import './CommentarySummary.css';

// Create managed cache for commentary analysis at module level
const commentaryAnalysisCache = createManagedCache('commentary', {
  maxSize: 200,
  ttl: 30 * 60 * 1000 // 30 minutes
});


// ============================================================================
// Knowledge Graph Panel - Pro Scholar v4 Rabbi Relationships
// ============================================================================
const KnowledgeGraphPanel = ({ entityName, onSourceClick }) => {
  const { data: graphData, findPath } = useKnowledgeGraph(entityName);
  const [showGraph, setShowGraph] = useState(false);
  const [pathTarget, setPathTarget] = useState('');
  const [pathResult, setPathResult] = useState(null);

  if (!graphData || !PRO_SCHOLAR_FEATURES?.KNOWLEDGE_GRAPH) return null;

  const handleFindPath = () => {
    if (pathTarget && findPath) {
      const result = findPath(pathTarget);
      setPathResult(result);
    }
  };

  return (
    <div className="knowledge-graph-panel">
      <button
        className="kg-toggle"
        onClick={() => setShowGraph(!showGraph)}
        aria-expanded={showGraph}
      >
        <span className="kg-icon">🔗</span>
        <span className="kg-label">
          {entityName} - Knowledge Graph
        </span>
        <span className={`kg-chevron ${showGraph ? 'expanded' : ''}`}>▼</span>
      </button>

      {showGraph && (
        <div className="kg-content">
          {/* Entity Info */}
          {graphData.period && (
            <div className="kg-meta">
              <span className="kg-period">{graphData.period}</span>
              {graphData.location && <span className="kg-location">📍 {graphData.location}</span>}
            </div>
          )}

          {/* Connections */}
          {graphData.connections && graphData.connections.length > 0 && (
            <div className="kg-connections">
              <h5>Connections</h5>
              <div className="kg-connection-list">
                {graphData.connections.map((conn, i) => (
                  <div
                    key={i}
                    className={`kg-connection ${conn.type}`}
                    onClick={() => onSourceClick?.(conn.name)}
                    role="button"
                    tabIndex={0}
                  >
                    <span className="kg-conn-type">
                      {conn.type === 'teacher' ? '👨‍🏫' : '📚'}
                    </span>
                    <span className="kg-conn-name">{conn.name}</span>
                    <span className="kg-conn-label">
                      {conn.type === 'teacher' ? 'Teacher' : 'Student'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Path Finder */}
          {findPath && (
            <div className="kg-path-finder">
              <input
                type="text"
                placeholder="Find path to..."
                value={pathTarget}
                onChange={(e) => setPathTarget(e.target.value)}
                className="kg-path-input"
              />
              <button className="kg-path-btn" onClick={handleFindPath}>
                Find Path
              </button>
              {pathResult && (
                <div className="kg-path-result">
                  {pathResult.map((node, i) => (
                    <React.Fragment key={i}>
                      <span
                        className="kg-path-node"
                        onClick={() => onSourceClick?.(node)}
                      >
                        {node}
                      </span>
                      {i < pathResult.length - 1 && <span className="kg-path-arrow">→</span>}
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// RAG Sources Panel - Shows grounding sources used by AI
// ============================================================================
const RAGSourcesPanel = ({ ragMetadata, onSourceClick }) => {
  const [expanded, setExpanded] = useState(false);

  if (!ragMetadata || !ragMetadata.sources || ragMetadata.sources.length === 0) {
    return null;
  }

  const { sources, sourcesCount, reference } = ragMetadata;

  return (
    <div className="rag-sources-panel">
      <button
        className="rag-toggle"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <span className="rag-icon">📚</span>
        <span className="rag-label">
          Grounded in {sourcesCount} sources
          {reference && <span className="rag-ref">({reference})</span>}
        </span>
        <span className={`rag-chevron ${expanded ? 'expanded' : ''}`}>▼</span>
      </button>

      {expanded && (
        <div className="rag-sources-list">
          {sources.slice(0, 8).map((src, i) => {
            // Get credibility for this source
            const credibility = getSourceCredibility(src.source);
            const badge = credibility ? getCredibilityBadge(credibility.authorityScore) : null;

            return (
              <div key={i} className="rag-source-item">
                <div className="rag-source-header">
                  <span
                    className="rag-source-name clickable"
                    onClick={() => onSourceClick?.(src.source)}
                    role="button"
                    tabIndex={0}
                  >
                    {src.source}
                  </span>
                  {badge && (
                    <span
                      className="rag-credibility-badge"
                      style={{ color: credibility?.category?.color }}
                      title={`Authority: ${credibility?.authorityScore}/100`}
                    >
                      {badge.emoji}
                    </span>
                  )}
                  <span className="rag-source-type">{src.type}</span>
                </div>
                {src.preview && (
                  <p className="rag-source-preview" dir={src.isHebrew ? 'rtl' : 'ltr'}>
                    {src.preview.length > 150 ? src.preview.slice(0, 150) + '...' : src.preview}
                  </p>
                )}
              </div>
            );
          })}
          {sources.length > 8 && (
            <p className="rag-more">+ {sources.length - 8} more sources</p>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Mode Selector - Professional Jewish Study Modes
// ============================================================================
const ModeSelector = ({ currentMode, onModeChange, loading }) => {
  const modes = [
    { id: ANALYSIS_MODES.SUMMARY, label: 'סיכום', icon: '📋', desc: 'Quick overview' },
    { id: ANALYSIS_MODES.IYUN, label: 'עיון', icon: '🔍', desc: 'Chavrusa study' },
    { id: ANALYSIS_MODES.MUSSAR, label: 'מוסר', icon: '💎', desc: 'Ethics' },
    { id: ANALYSIS_MODES.MACHLOKET, label: 'מחלוקת', icon: '⚔️', desc: 'Disputes' },
    { id: ANALYSIS_MODES.MAREI_MEKOMOT, label: 'מ״מ', icon: '🔗', desc: 'Sources' },
    { id: ANALYSIS_MODES.HALACHA, label: 'הלכה', icon: '⚖️', desc: 'Practical law' }
  ];

  return (
    <div className="mode-selector">
      {modes.map(mode => (
        <button
          key={mode.id}
          className={`mode-btn ${currentMode === mode.id ? 'active' : ''}`}
          onClick={() => onModeChange(mode.id)}
          disabled={loading}
          title={mode.desc}
        >
          <span className="mode-icon">{mode.icon}</span>
          <span className="mode-label">{mode.label}</span>
        </button>
      ))}
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================
const CommentarySummary = ({
  commentaryText,
  source = 'Commentary',
  verse = '',
  onClose,
  textType = 'torah',
  isMultiVerse = false,
  // Callback props for interactive elements
  onTopicClick,      // Called when a topic tag is clicked: (topic: string) => void
  onSourceClick,     // Called when a source/commentator is clicked: (source: string) => void
  onWordLookup,      // Called when a keyword is clicked for lookup: (word: string) => void
  onConceptClick,    // Called when a related concept is clicked: (concept: string) => void
}) => {
  const [mode, setMode] = useState(ANALYSIS_MODES.SUMMARY);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [showDiagram, setShowDiagram] = useState(true);
  const [selectedCommentator, setSelectedCommentator] = useState(null);
  // Follow-up question state for conversational AI analysis
  const [followUpQuestion, setFollowUpQuestion] = useState('');
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);

  // Pro Scholar v4 hooks
  const { features: v4Features } = useProScholarV4({
    preloadServices: false // Only load when needed
  });

  // PERFORMANCE: Cache results per mode using v4 unified cache
  const modeResultsCache = useRef(new Map());

  // Context detection for smart mode analysis
  const isTalmud = textType === 'talmud' ||
    source?.toLowerCase().includes('talmud') ||
    source?.toLowerCase().includes('gemara');
  const isGenesis = verse?.toLowerCase().includes('genesis') ||
    verse?.toLowerCase().includes('bereshit') ||
    verse?.toLowerCase().includes('בראשית');

  // Parse verse reference for RAG context (e.g., "Genesis 1:1" → book, chapter, verseNum)
  const parsedRef = useMemo(() => {
    if (!verse) return { book: null, chapter: null, verseNum: null };

    // Handle formats: "Genesis 1:1", "Genesis.1.1", "Berakhot 2a", etc.
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

    // PRO SCHOLAR v4: Check unified cache first (unless force refresh)
    const v4CacheKey = `${source}:${verse}:${selectedMode}`;
    if (!forceRefresh) {
      // Try v4 unified cache first
      const v4Cached = commentaryAnalysisCache.get(v4CacheKey);
      if (v4Cached) {
        setData({ ...v4Cached, fromCache: true, cacheType: 'v4-unified' });
        setError(null);
        // Prefetch keywords for anticipated lookups
        if (v4Cached.keyTerms && PRO_SCHOLAR_FEATURES?.PREFETCH) {
          prefetchWords(v4Cached.keyTerms.slice(0, 5));
        }
        return;
      }
      // Fallback to local cache
      if (modeResultsCache.current.has(selectedMode)) {
        const cached = modeResultsCache.current.get(selectedMode);
        setData({ ...cached, fromCache: true });
        setError(null);
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      // Pass context options for smart mode detection + RAG enhancement
      const result = await analyzeCommentary(
        commentaryText,
        source,
        verse,
        selectedMode,
        {
          isTalmud,
          isMultiVerse,
          isGenesis,
          // RAG context: provide book/chapter/verse for source retrieval
          book: parsedRef.book,
          chapter: parsedRef.chapter,
          verseNum: parsedRef.verseNum,
          useRAG: true // Enable RAG by default
        }
      );
      if (result.success) {
        // Cache successful results in both local and v4 unified cache
        modeResultsCache.current.set(selectedMode, result);
        commentaryAnalysisCache.set(v4CacheKey, result);
        setData(result);

        // PRO SCHOLAR v4: Prefetch keywords for word lookup
        if (result.keyTerms && PRO_SCHOLAR_FEATURES?.PREFETCH) {
          prefetchWords(result.keyTerms.slice(0, 5));
        }

        // Track analysis in AI memory for context building
        addToMemory({
          role: 'assistant',
          content: result.summary || 'AI analysis completed',
          metadata: {
            type: 'commentary_analysis',
            mode: selectedMode,
            source,
            verse,
            topics: result.topics || []
          }
        });

        // Track study activity
        trackStudy({
          type: 'ai_analysis',
          mode: selectedMode,
          reference: verse,
          source
        });
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
    // Don't clear data - cache will provide instant results if available
  };

  // Follow-up question handler for conversational AI
  const handleFollowUp = useCallback(async () => {
    if (!followUpQuestion.trim() || followUpLoading || !data) return;

    const question = followUpQuestion.trim();
    setFollowUpQuestion('');
    setFollowUpLoading(true);

    // Add user question to conversation history
    const userMessage = { role: 'user', content: question };
    setConversationHistory(prev => [...prev, userMessage]);

    // Track to AI memory
    addToMemory({
      role: 'user',
      content: question,
      metadata: {
        type: 'follow_up_question',
        context: mode,
        reference: verse
      }
    });

    try {
      // Build context from current analysis and conversation
      const contextPrompt = `Based on this ${mode} analysis of "${verse}":
${data.summary || ''}

Previous context: ${conversationHistory.slice(-4).map(m => `${m.role}: ${m.content}`).join('\n')}

User asks: ${question}

Provide a concise, scholarly response in the style of the current analysis mode.`;

      const result = await analyzeCommentary(contextPrompt, {
        mode: ANALYSIS_MODES.SUMMARY,
        maxTokens: 500
      });

      if (result && !result.error) {
        const aiResponse = {
          role: 'assistant',
          content: result.summary || result.answer || 'I could not generate a response.'
        };
        setConversationHistory(prev => [...prev, aiResponse]);

        // Track AI response
        addToMemory({
          role: 'assistant',
          content: aiResponse.content,
          metadata: {
            type: 'follow_up_response',
            reference: verse
          }
        });
      }
    } catch (err) {
      console.error('Follow-up question error:', err);
      setConversationHistory(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I could not process your question. Please try again.'
      }]);
    } finally {
      setFollowUpLoading(false);
    }
  }, [followUpQuestion, followUpLoading, data, mode, verse, conversationHistory]);

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

    switch (mode) {
      case ANALYSIS_MODES.IYUN:
        return <DeepStudyView {...commonProps} />;
      case ANALYSIS_MODES.MACHLOKET:
        return <CompareView {...commonProps} />;
      case ANALYSIS_MODES.MUSSAR:
        return <PardesView {...commonProps} />;
      case ANALYSIS_MODES.HALACHA:
        return <HalachaView {...commonProps} />;
      default:
        return <SummaryView {...commonProps} onTopicClick={onTopicClick} onConceptClick={onConceptClick} />;
    }
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
        {!loading && !error && data && (
          <>
            {/* RAG Sources Panel - Show grounding sources */}
            {data.ragMetadata && (
              <RAGSourcesPanel
                ragMetadata={data.ragMetadata}
                onSourceClick={(src) => {
                  setSelectedCommentator(src);
                  onSourceClick?.(src);
                }}
              />
            )}

            {/* PRO SCHOLAR v4: Knowledge Graph Panel */}
            {selectedCommentator && v4Features?.KNOWLEDGE_GRAPH && (
              <KnowledgeGraphPanel
                entityName={selectedCommentator}
                onSourceClick={(src) => {
                  setSelectedCommentator(src);
                  onSourceClick?.(src);
                }}
              />
            )}

            {renderContent()}

            {/* Follow-up Question Section */}
            {conversationHistory.length > 0 && (
              <div className="follow-up-conversation">
                {conversationHistory.map((msg, i) => (
                  <div key={i} className={`follow-up-message ${msg.role}`}>
                    <span className="message-icon">
                      {msg.role === 'user' ? '👤' : '🤖'}
                    </span>
                    <p className="message-content">{msg.content}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Follow-up Input */}
            <div className="follow-up-input-section">
              <div className="follow-up-input-wrapper">
                <input
                  type="text"
                  className="follow-up-input"
                  placeholder="Ask a follow-up question..."
                  value={followUpQuestion}
                  onChange={(e) => setFollowUpQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleFollowUp()}
                  disabled={followUpLoading}
                />
                <button
                  className="follow-up-send-btn"
                  onClick={handleFollowUp}
                  disabled={followUpLoading || !followUpQuestion.trim()}
                  title="Send follow-up question"
                >
                  {followUpLoading ? (
                    <span className="loading-spinner">⏳</span>
                  ) : (
                    <span>➤</span>
                  )}
                </button>
              </div>
              <p className="follow-up-hint">
                Press Enter to ask about this analysis
              </p>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      {data && !loading && (
        <div className="summary-footer">
          <span className="footer-info">
            {data.fromCache
              ? `⚡ ${data.cacheType === 'v4-unified' ? 'v4 Cache' : 'Cached'}`
              : `🤖 ${data.model || 'Llama 3.3'}`}
          </span>
          {v4Features && <span className="footer-v4-badge">Pro v4</span>}
          {data.usage && !data.fromCache && (
            <span className="footer-tokens">{data.usage.total_tokens} tokens</span>
          )}
        </div>
      )}
    </div>
  );
};

export default CommentarySummary;
