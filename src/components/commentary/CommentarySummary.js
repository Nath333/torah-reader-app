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
import { sanitizeSvgContent, sanitizeMermaidChart } from '../../utils/safeHtml';
import './CommentarySummary.css';

// Create managed cache for commentary analysis at module level
const commentaryAnalysisCache = createManagedCache('commentary', {
  maxSize: 200,
  ttl: 30 * 60 * 1000 // 30 minutes
});

// PRO SCHOLAR V5: Lazy Mermaid loader with initialization
let mermaidInstance = null;
let mermaidLoadPromise = null;

const loadMermaid = async () => {
  if (mermaidInstance) return mermaidInstance;
  if (mermaidLoadPromise) return mermaidLoadPromise;

  mermaidLoadPromise = (async () => {
    const { default: mermaid } = await import('mermaid');

    // Initialize mermaid with better settings
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      securityLevel: 'strict',
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis',
        padding: 20
      },
      themeVariables: {
        primaryColor: '#667eea',
        primaryTextColor: '#fff',
        primaryBorderColor: '#5a67d8',
        lineColor: '#718096',
        secondaryColor: '#e0e7ff',
        tertiaryColor: '#f7fafc'
      }
    });

    mermaidInstance = mermaid;
    return mermaid;
  })();

  return mermaidLoadPromise;
};

// ============================================================================
// Mermaid Diagram Component with Enhanced Error Handling & Timeout
// ============================================================================
const DIAGRAM_TIMEOUT = 5000; // 5 second timeout

const MermaidDiagram = ({ chart, id, explanation }) => {
  const containerRef = useRef(null);
  const [svg, setSvg] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Parse the chart to extract node labels for fallback display
  const extractedNodes = useMemo(() => {
    if (!chart) return [];
    const nodePattern = /\[([^\]]+)\]/g;
    const nodes = [];
    let match;
    while ((match = nodePattern.exec(chart)) !== null) {
      const label = match[1].trim();
      if (label && !nodes.includes(label)) {
        nodes.push(label);
      }
    }
    return nodes;
  }, [chart]);

  useEffect(() => {
    let timeoutId;
    let isCancelled = false;

    const renderDiagram = async () => {
      if (!chart) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setSvg('');
      setError(null);

      // Set timeout for rendering
      timeoutId = setTimeout(() => {
        if (!isCancelled) {
          setLoading(false);
          setError('Diagram rendering timed out');
        }
      }, DIAGRAM_TIMEOUT);

      try {
        // PRO SCHOLAR V5: Lazy load mermaid on first diagram render
        const mermaid = await loadMermaid();

        // Clean and sanitize the chart syntax
        let cleanChart = sanitizeMermaidChart(chart);
        if (!cleanChart) {
          throw new Error('Invalid chart syntax');
        }

        // Ensure it starts with a valid graph declaration
        if (!cleanChart.match(/^(graph|flowchart|sequenceDiagram|classDiagram|mindmap)/i)) {
          cleanChart = 'graph TD\n' + cleanChart;
        }

        // Generate unique ID to avoid conflicts
        const uniqueId = `mermaid-${id}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

        const { svg: renderedSvg } = await mermaid.render(uniqueId, cleanChart);

        if (!isCancelled) {
          clearTimeout(timeoutId);
          // Sanitize SVG before storing to prevent XSS
          const sanitizedSvg = sanitizeSvgContent(renderedSvg);
          setSvg(sanitizedSvg);
        }
      } catch (err) {
        if (!isCancelled) {
          clearTimeout(timeoutId);
          console.error('Mermaid rendering error:', err);
          setError(err.message || 'Failed to render diagram');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    renderDiagram();

    return () => {
      isCancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [chart, id]);

  if (loading) {
    return (
      <div className="mermaid-loading">
        <div className="diagram-spinner"></div>
        <span>Rendering diagram...</span>
      </div>
    );
  }

  if (error || !svg) {
    // Show a user-friendly visual fallback instead of raw code
    return (
      <div className="mermaid-fallback">
        <div className="fallback-header">
          <span className="fallback-icon">🗺️</span>
          <span>Concept Flow</span>
        </div>
        {explanation && (
          <p className="fallback-explanation">{explanation}</p>
        )}
        {extractedNodes.length > 0 ? (
          <div className="fallback-flow">
            {extractedNodes.map((node, i) => (
              <React.Fragment key={i}>
                <div className="fallback-node">
                  <span className="fallback-node-text">{node}</span>
                </div>
                {i < extractedNodes.length - 1 && (
                  <div className="fallback-arrow">→</div>
                )}
              </React.Fragment>
            ))}
          </div>
        ) : (
          <p className="fallback-message">
            Visual diagram could not be rendered. The key concepts are shown in the summary above.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mermaid-wrapper">
      <div
        ref={containerRef}
        className="mermaid-container"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      {explanation && (
        <p className="diagram-explanation">{explanation}</p>
      )}
    </div>
  );
};

// ============================================================================
// Visual Concept Cards - Alternative to Diagrams
// ============================================================================
const ConceptFlow = ({ concepts }) => {
  if (!concepts || concepts.length === 0) return null;

  return (
    <div className="concept-flow">
      {concepts.map((concept, i) => (
        <React.Fragment key={i}>
          <div className="concept-node">
            <span className="concept-text">{concept}</span>
          </div>
          {i < concepts.length - 1 && <div className="concept-arrow">→</div>}
        </React.Fragment>
      ))}
    </div>
  );
};

// ============================================================================
// Clickable Element Wrapper - Handles keyboard accessibility
// ============================================================================
const ClickableElement = ({ children, onClick, className = '', title = '', as: Component = 'span' }) => {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.(e);
    }
  };

  return (
    <Component
      className={`clickable-element ${className}`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      title={title}
    >
      {children}
    </Component>
  );
};

// ============================================================================
// Sefaria Link - Deep linking to Sefaria.org
// ============================================================================
const SefariaLink = ({ reference, children, className = '' }) => {
  if (!reference) return <span className={className}>{children}</span>;

  // Clean and encode the reference for Sefaria URL
  const cleanRef = reference
    .replace(/\s+/g, '_')
    .replace(/:/g, '.')
    .replace(/[()]/g, '');

  return (
    <a
      href={`https://www.sefaria.org/${encodeURIComponent(cleanRef)}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`sefaria-link ${className}`}
      title={`Open "${reference}" on Sefaria`}
    >
      {children}
    </a>
  );
};

// ============================================================================
// Topic Tag with Icon - Now Clickable
// ============================================================================
const TopicTag = ({ topic, onClick }) => {
  const icons = {
    'Teshuvah': '🔄', 'Mitzvot': '📜', 'Mussar': '💡', 'Halacha': '⚖️',
    'Aggadah': '📖', 'Kabbalah': '✨', 'Torah': '📕', 'Prayer': '🙏',
    'Shabbat': '🕯️', 'Ethics': '🤝', 'Creation': '🌍', 'Prophecy': '👁️',
    'History': '📚', 'Language': '🔤', 'Emunah': '❤️', 'Middot': '🌟',
    'Chesed': '💝', 'Justice': '⚖️', 'Faith': '🌟', 'Wisdom': '🧠'
  };

  const getIcon = (t) => {
    const normalized = t.toLowerCase();
    for (const [key, icon] of Object.entries(icons)) {
      if (normalized.includes(key.toLowerCase())) return icon;
    }
    return '🏷️';
  };

  const handleClick = () => onClick?.(topic);
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.(topic);
    }
  };

  return (
    <span
      className={`topic-tag ${onClick ? 'clickable' : ''}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      title={onClick ? `Search for "${topic}" topics` : undefined}
    >
      <span className="topic-icon">{getIcon(topic)}</span>
      {topic}
    </span>
  );
};

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
// Info Card Component
// ============================================================================
const InfoCard = ({ icon, title, children, className = '', highlight = false }) => (
  <div className={`info-card ${className} ${highlight ? 'highlight' : ''}`}>
    <div className="info-card-header">
      <span className="info-card-icon">{icon}</span>
      <h4 className="info-card-title">{title}</h4>
    </div>
    <div className="info-card-content">
      {children}
    </div>
  </div>
);

// ============================================================================
// Commentator Badge - Shows credibility info for rabbinical sources
// ============================================================================
const CommentatorBadge = ({ name, onClick, showDetails = false }) => {
  const credibility = useMemo(() => getSourceCredibility(name), [name]);
  const badge = useMemo(() => credibility ? getCredibilityBadge(credibility.authorityScore) : null, [credibility]);

  if (!credibility) {
    return (
      <span className="commentator-name" onClick={onClick}>{name}</span>
    );
  }

  const periodLabels = {
    'tannaim': 'Tanna',
    'amoraim': 'Amora',
    'geonim': 'Gaon',
    'rishonim': 'Rishon',
    'acharonim': 'Acharon'
  };

  return (
    <span
      className={`commentator-badge ${onClick ? 'clickable' : ''}`}
      onClick={onClick}
      title={`${credibility.fullName || name} | ${periodLabels[credibility.period] || credibility.period} | Authority: ${credibility.authorityScore}/100`}
    >
      <span className="commentator-name">{name}</span>
      {badge && (
        <span
          className="credibility-indicator"
          style={{ color: credibility.category?.color }}
        >
          {badge.emoji}
        </span>
      )}
      {showDetails && credibility.period && (
        <span className="commentator-period">{periodLabels[credibility.period] || credibility.period}</span>
      )}
    </span>
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
// Clickable Hebrew Keywords
// ============================================================================
const KeywordChips = ({ keywords, onWordLookup }) => {
  if (!keywords || keywords.length === 0 || !onWordLookup) return null;

  return (
    <div className="keyword-chips">
      {keywords.map((word, i) => (
        <button
          key={i}
          className="keyword-chip clickable"
          onClick={() => onWordLookup(word)}
          title={`Look up "${word}"`}
          dir="rtl"
        >
          {word}
        </button>
      ))}
    </div>
  );
};

// ============================================================================
// Deep Study Display
// ============================================================================
const DeepStudyView = ({ data, showDiagram, diagramId, onSourceClick, onWordLookup }) => {
  return (
    <div className="deep-study-view">
      {data.summary && (
        <InfoCard icon="📜" title="Main Thesis" className="thesis-card">
          <p className="thesis-text">{data.summary}</p>
        </InfoCard>
      )}

      <div className="deep-study-grid">
        {data.methodology && (
          <InfoCard icon="🔍" title="Methodology">
            <p>{data.methodology}</p>
          </InfoCard>
        )}

        {data.novelInsight && (
          <InfoCard icon="✨" title="חידוש (Novel Insight)" highlight>
            <p>{data.novelInsight}</p>
          </InfoCard>
        )}
      </div>

      {/* Key Hebrew Terms - clickable for word lookup */}
      {data.keyTerms && data.keyTerms.length > 0 && (
        <InfoCard icon="🔤" title="Key Terms">
          <KeywordChips keywords={data.keyTerms} onWordLookup={onWordLookup} />
        </InfoCard>
      )}

      {data.difficulties && data.difficulties.length > 0 && (
        <InfoCard icon="❓" title="Questions Addressed">
          <ul className="bullet-list">
            {data.difficulties.map((d, i) => <li key={i}>{d}</li>)}
          </ul>
        </InfoCard>
      )}

      {data.keyPoints && data.keyPoints.length > 0 && (
        <InfoCard icon="🎯" title="Key Points">
          <div className="key-points-grid">
            {data.keyPoints.map((p, i) => (
              <div key={i} className="key-point-item">
                <span className="point-num">{i + 1}</span>
                <span className="point-content">{p}</span>
              </div>
            ))}
          </div>
        </InfoCard>
      )}

      {data.textualBasis && data.textualBasis.length > 0 && (
        <InfoCard icon="📚" title="Textual Sources">
          <div className="sources-list">
            {data.textualBasis.map((s, i) => (
              <ClickableElement
                key={i}
                className="source-chip"
                onClick={() => onSourceClick?.(s)}
                title={`View ${s}`}
              >
                <SefariaLink reference={s}>
                  {s}
                </SefariaLink>
              </ClickableElement>
            ))}
          </div>
        </InfoCard>
      )}

      {showDiagram && data.diagram && (
        <div className="diagram-section">
          <h4>🗺️ Analysis Flow</h4>
          <MermaidDiagram chart={data.diagram} id={diagramId} explanation={data.diagramExplanation} />
        </div>
      )}

      {data.furtherStudy && data.furtherStudy.length > 0 && (
        <InfoCard icon="📖" title="Further Study">
          <ul className="further-study-list">
            {data.furtherStudy.map((s, i) => (
              <li key={i}>
                <SefariaLink reference={s} className="further-study-link">
                  {s}
                </SefariaLink>
              </li>
            ))}
          </ul>
        </InfoCard>
      )}
    </div>
  );
};

// ============================================================================
// Compare View
// ============================================================================
const CompareView = ({ data, showDiagram, diagramId, onSourceClick }) => {
  const colors = ['#667eea', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const handleRepresentativeClick = (representative) => {
    onSourceClick?.(representative);
  };

  const handleRepresentativeKeyDown = (e, representative) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSourceClick?.(representative);
    }
  };

  return (
    <div className="compare-view">
      {data.summary && (
        <div className="context-banner">
          <p>{data.summary}</p>
        </div>
      )}

      {data.approaches && data.approaches.length > 0 && (
        <div className="approaches-section">
          <h4>📊 Interpretive Approaches</h4>
          <div className="approaches-grid">
            {data.approaches.map((approach, i) => (
              <div
                key={i}
                className="approach-card"
                style={{ borderLeftColor: colors[i % colors.length] }}
              >
                <h5 style={{ color: colors[i % colors.length] }}>{approach.school}</h5>
                <p>{approach.interpretation}</p>
                {approach.representative && (
                  <span
                    className={`representative ${onSourceClick ? 'clickable' : ''}`}
                    role={onSourceClick ? 'button' : undefined}
                    tabIndex={onSourceClick ? 0 : undefined}
                    onKeyDown={(e) => handleRepresentativeKeyDown(e, approach.representative)}
                  >
                    — <CommentatorBadge
                      name={approach.representative}
                      onClick={onSourceClick ? () => handleRepresentativeClick(approach.representative) : undefined}
                      showDetails
                    />
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {data.tensions && data.tensions.length > 0 && (
        <InfoCard icon="⚡" title="Points of Tension">
          <ul className="tension-list">
            {data.tensions.map((t, i) => <li key={i}>{t}</li>)}
          </ul>
        </InfoCard>
      )}

      {data.synthesis && (
        <InfoCard icon="🤝" title="Synthesis" highlight>
          <p>{data.synthesis}</p>
        </InfoCard>
      )}

      {showDiagram && data.diagram && (
        <div className="diagram-section">
          <h4>🗺️ Approaches Map</h4>
          <MermaidDiagram chart={data.diagram} id={diagramId} explanation={data.diagramExplanation} />
        </div>
      )}
    </div>
  );
};

// ============================================================================
// PaRDeS View - Four Levels of Interpretation
// ============================================================================
const PardesView = ({ data, showDiagram, diagramId, onWordLookup, onSourceClick }) => {
  const levels = [
    { key: 'pshat', hebrew: 'פְּשָׁט', color: '#3b82f6', icon: '📖' },
    { key: 'remez', hebrew: 'רֶמֶז', color: '#8b5cf6', icon: '🔮' },
    { key: 'drash', hebrew: 'דְּרָשׁ', color: '#10b981', icon: '📜' },
    { key: 'sod', hebrew: 'סוֹד', color: '#f59e0b', icon: '✨' }
  ];

  const handleKeywordClick = (word) => {
    onWordLookup?.(word);
  };

  const handleKeywordKeyDown = (e, word) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onWordLookup?.(word);
    }
  };

  return (
    <div className="pardes-view">
      {data.summary && (
        <div className="context-banner pardes-banner">
          <span className="pardes-title">🌳 פַּרְדֵּס - The Four Levels</span>
          <p>{data.summary}</p>
        </div>
      )}

      <div className="pardes-levels">
        {levels.map(({ key, hebrew, color, icon }) => {
          const levelData = data[key];
          if (!levelData) return null;

          return (
            <div key={key} className="pardes-level" style={{ '--level-color': color }}>
              <div className="level-header">
                <span className="level-icon">{icon}</span>
                <span className="level-hebrew">{hebrew}</span>
                <span className="level-name">{levelData.level}</span>
              </div>
              <div className="level-content">
                <p className="level-interpretation">{levelData.interpretation}</p>

                {levelData.keyWords && levelData.keyWords.length > 0 && (
                  <div className="level-keywords">
                    {levelData.keyWords.map((word, i) => (
                      <span
                        key={i}
                        className={`keyword-chip ${onWordLookup ? 'clickable' : ''}`}
                        onClick={() => handleKeywordClick(word)}
                        onKeyDown={(e) => handleKeywordKeyDown(e, word)}
                        role={onWordLookup ? 'button' : undefined}
                        tabIndex={onWordLookup ? 0 : undefined}
                        title={onWordLookup ? `Look up "${word}"` : undefined}
                      >
                        {word}
                      </span>
                    ))}
                  </div>
                )}

                {levelData.hints && levelData.hints.length > 0 && (
                  <div className="level-hints">
                    <strong>Hints:</strong> {levelData.hints.join(', ')}
                  </div>
                )}

                {levelData.midrash && (
                  <div className="level-midrash">
                    <strong>Midrash:</strong> {levelData.midrash}
                  </div>
                )}

                {levelData.lesson && (
                  <div className="level-lesson">
                    <strong>Lesson:</strong> {levelData.lesson}
                  </div>
                )}

                {levelData.concept && (
                  <div className="level-concept">
                    <strong>Mystical Concept:</strong> {levelData.concept}
                  </div>
                )}

                {levelData.commentator && (
                  <div className="level-source">
                    <span className="source-badge">
                      📚 <CommentatorBadge
                        name={levelData.commentator}
                        onClick={onSourceClick ? () => onSourceClick(levelData.commentator) : undefined}
                        showDetails
                      />
                    </span>
                  </div>
                )}

                {levelData.source && (
                  <div className="level-source">
                    <SefariaLink reference={levelData.source} className="source-badge">
                      📚 {levelData.source}
                    </SefariaLink>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {data.synthesis && (
        <InfoCard icon="🔗" title="Synthesis - How the Levels Connect" highlight>
          <p>{data.synthesis}</p>
        </InfoCard>
      )}

      {showDiagram && data.diagram && (
        <div className="diagram-section">
          <h4>🗺️ PaRDeS Structure</h4>
          <MermaidDiagram chart={data.diagram} id={diagramId} explanation={data.diagramExplanation} />
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Halacha View - Practical Law Derivation
// ============================================================================
const HalachaView = ({ data, onSourceClick, onWordLookup }) => {
  return (
    <div className="halacha-view">
      {/* Summary */}
      {data.summary && (
        <div className="context-banner halacha-banner">
          <span className="halacha-title">⚖️ הֲלָכָה - Practical Law</span>
          <p>{data.summary}</p>
        </div>
      )}

      {/* Key Halachic Terms - clickable for word lookup */}
      {data.keyTerms && data.keyTerms.length > 0 && (
        <InfoCard icon="🔤" title="Key Halachic Terms">
          <KeywordChips keywords={data.keyTerms} onWordLookup={onWordLookup} />
        </InfoCard>
      )}

      {/* Mitzvot Section */}
      {data.mitzvot && data.mitzvot.length > 0 && (
        <div className="mitzvot-section">
          <h4>📜 Mitzvot Derived</h4>
          <div className="mitzvot-grid">
            {data.mitzvot.map((m, i) => (
              <div key={i} className={`mitzvah-card ${m.type?.includes('Positive') ? 'aseh' : 'lo-taaseh'}`}>
                <div className="mitzvah-header">
                  <span className="mitzvah-type">{m.type?.includes('Positive') ? '✓' : '✗'}</span>
                  <span className="mitzvah-name">{m.mitzvah || m.name}</span>
                </div>
                {m.source && (
                  <p className="mitzvah-source">
                    <strong>Source:</strong>{' '}
                    <SefariaLink reference={m.source} className="inline-source-link">
                      {m.source}
                    </SefariaLink>
                  </p>
                )}
                {m.rambamReference && (
                  <p className="mitzvah-rambam">
                    <strong>Rambam:</strong>{' '}
                    <SefariaLink reference={`Mishneh Torah, ${m.rambamReference}`} className="inline-source-link">
                      {m.rambamReference}
                    </SefariaLink>
                  </p>
                )}
                {m.category && <span className="mitzvah-category">{m.category}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Talmud Sources */}
      {data.talmudSources && data.talmudSources.length > 0 && (
        <InfoCard icon="📚" title="Talmudic Sources">
          <div className="talmud-sources">
            {data.talmudSources.map((s, i) => (
              <div key={i} className="talmud-source-item">
                <SefariaLink reference={s.reference} className="source-ref clickable">
                  {s.reference}
                </SefariaLink>
                <span className="source-topic">{s.topic}</span>
                {s.relevance && <p className="source-relevance">{s.relevance}</p>}
              </div>
            ))}
          </div>
        </InfoCard>
      )}

      {/* Halachic Principles */}
      {data.halachicPrinciples && data.halachicPrinciples.length > 0 && (
        <InfoCard icon="📋" title="Halachic Principles">
          <ul className="principles-list">
            {data.halachicPrinciples.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </InfoCard>
      )}

      {/* Modern Application */}
      {data.modernApplication && (
        <InfoCard icon="🏠" title="Modern Application" className="modern-app-card">
          <p>{data.modernApplication}</p>
        </InfoCard>
      )}

      {/* Practical Guidance */}
      {data.practicalGuidance && (
        <div className="practical-guidance">
          <h4>✅ Practical Guidance</h4>
          <p>{data.practicalGuidance}</p>
        </div>
      )}

      {/* Machloket (Disputes) */}
      {data.machloket && (
        <InfoCard icon="⚔️" title="Disputes" className="machloket-card">
          <p>{data.machloket}</p>
        </InfoCard>
      )}
    </div>
  );
};

// ============================================================================
// Summary View (Default) - Enhanced
// ============================================================================
const SummaryView = ({ data, showDiagram, diagramId, onTopicClick, onConceptClick }) => {
  // Extract key concepts for visual flow if no diagram
  const keyConceptsFlow = useMemo(() => {
    if (data.relatedConcepts && data.relatedConcepts.length >= 2) {
      return data.relatedConcepts.slice(0, 4);
    }
    return null;
  }, [data.relatedConcepts]);

  const handleConceptClick = (concept) => {
    onConceptClick?.(concept);
  };

  const handleConceptKeyDown = (e, concept) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onConceptClick?.(concept);
    }
  };

  return (
    <div className="summary-view">
      {/* Topics Bar */}
      {data.topics && data.topics.length > 0 && (
        <div className="topics-bar">
          {data.topics.map((topic, i) => (
            <TopicTag key={i} topic={topic} onClick={onTopicClick} />
          ))}
        </div>
      )}

      {/* Main Summary Card */}
      {data.summary && (
        <InfoCard icon="📝" title="Summary" className="summary-main-card">
          <p className="summary-text">{data.summary}</p>
        </InfoCard>
      )}

      {/* Key Points - Visual List */}
      {data.keyPoints && data.keyPoints.length > 0 && (
        <div className="key-points-section">
          <h4>🎯 Key Points</h4>
          <div className="key-points-visual">
            {data.keyPoints.map((point, i) => (
              <div key={i} className="key-point-card">
                <div className="point-number">{i + 1}</div>
                <div className="point-text">{point}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Diagram or Concept Flow */}
      {showDiagram && data.diagram && (
        <div className="diagram-section">
          <h4>🗺️ Concept Map</h4>
          <MermaidDiagram chart={data.diagram} id={diagramId} explanation={data.diagramExplanation} />
        </div>
      )}

      {/* Concept Flow as Alternative */}
      {(!data.diagram || !showDiagram) && keyConceptsFlow && (
        <div className="concept-flow-section">
          <h4>🔗 Concept Flow</h4>
          <ConceptFlow concepts={keyConceptsFlow} />
        </div>
      )}

      {/* Practical Lesson - Highlighted */}
      {data.practicalLesson && (
        <InfoCard icon="💡" title="Practical Takeaway" highlight>
          <p className="practical-text">{data.practicalLesson}</p>
        </InfoCard>
      )}

      {/* Related Concepts */}
      {data.relatedConcepts && data.relatedConcepts.length > 0 && (
        <div className="related-section">
          <h4>🔗 Related Concepts</h4>
          <div className="related-chips">
            {data.relatedConcepts.map((c, i) => (
              <span
                key={i}
                className={`related-chip ${onConceptClick ? 'clickable' : ''}`}
                onClick={() => handleConceptClick(c)}
                onKeyDown={(e) => handleConceptKeyDown(e, c)}
                role={onConceptClick ? 'button' : undefined}
                tabIndex={onConceptClick ? 0 : undefined}
                title={onConceptClick ? `Explore "${c}"` : undefined}
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      )}
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
