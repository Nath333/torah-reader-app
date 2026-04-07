/**
 * MermaidDiagram Component
 * Renders Mermaid diagrams with error handling, timeout, and fallback display
 *
 * BUNDLE OPTIMIZATION: mermaid library (~500KB) is now lazy-loaded
 * on first use instead of bundled with the main chunk.
 */

import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
import { sanitizeSvgContent, sanitizeMermaidChart } from '../../../utils/safeHtml';

const DIAGRAM_TIMEOUT = 5000; // 5 second timeout

// Mermaid instance cache (lazy-loaded)
let mermaidInstance = null;
let mermaidLoadPromise = null;

/**
 * Lazy-load and initialize mermaid
 * @returns {Promise<Object>} Mermaid instance
 */
async function getMermaid() {
  if (mermaidInstance) return mermaidInstance;

  if (!mermaidLoadPromise) {
    mermaidLoadPromise = import('mermaid').then(({ default: mermaid }) => {
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
    });
  }

  return mermaidLoadPromise;
}

/**
 * Renders a Mermaid diagram with error handling and fallback
 * @param {Object} props
 * @param {string} props.chart - Mermaid chart syntax
 * @param {string} props.id - Unique identifier for the diagram
 * @param {string} [props.explanation] - Optional explanation text
 */
function MermaidDiagram({ chart, id, explanation }) {
  const containerRef = useRef(null);
  const [svg, setSvg] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Parse the chart to extract node labels for fallback display
  const extractedNodes = useMemo(() => {
    if (!chart) return [];
    // Match content inside brackets/quotes: ["text"], ("text"), {{"text"}}, etc.
    const nodePattern = /[\[({]["']?([^\]"')}]+)["']?[\])}]/g;
    const seen = new Set();
    const nodes = [];
    let match;
    while ((match = nodePattern.exec(chart)) !== null) {
      let label = match[1].trim()
        .replace(/\\n/g, ' ')  // Replace newlines with spaces
        .replace(/^[📊🔄👥📚📋📖📜📐📝📍👤⚖️⚔️🧠🔴🟢🟡✅🚫⭐❓⚡✓💬📅]\s*/g, '')  // Remove leading emojis
        .trim();
      // Skip short fragments, IDs, and duplicates
      if (label && label.length >= 3 && !seen.has(label) && !/^[a-z]+\d+$/.test(label)) {
        seen.add(label);
        nodes.push(label);
      }
    }
    return nodes.slice(0, 12);  // Limit to prevent overflow
  }, [chart]);

  // Group nodes by type for organized fallback display
  const groupedNodes = useMemo(() => {
    const groups = { concepts: [], rulings: [], sages: [], other: [] };
    extractedNodes.forEach(node => {
      if (/חייב|פטור|מותר|אסור|ספק/.test(node)) {
        groups.rulings.push(node);
      } else if (/רב|רבי|מר|אמר/.test(node)) {
        groups.sages.push(node);
      } else if (node.length > 5) {
        groups.concepts.push(node);
      } else {
        groups.other.push(node);
      }
    });
    return groups;
  }, [extractedNodes]);

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
        // Lazy-load mermaid
        const mermaid = await getMermaid();

        if (isCancelled) return;

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
        const uniqueId = `mermaid-${id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

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
          // Enhanced error logging for debugging
          console.error('Mermaid rendering error:', err);
          console.error('Chart that failed:', chart?.substring(0, 500));

          // Provide user-friendly error message
          const errorMsg = err.message || 'Failed to render diagram';
          // Extract line/column info if available
          const lineMatch = errorMsg.match(/line (\d+)/i);
          const syntaxMatch = errorMsg.match(/Parse error|Syntax error|Unexpected/i);

          if (syntaxMatch && lineMatch) {
            setError(`Diagram syntax error at line ${lineMatch[1]}`);
          } else if (errorMsg.includes('Maximum call stack')) {
            setError('Diagram too complex to render');
          } else {
            setError(errorMsg);
          }
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
    // Show a user-friendly visual fallback with extracted content
    return (
      <div className="mermaid-fallback scholarly">
        {explanation && (
          <div className="fallback-title">{explanation}</div>
        )}
        {extractedNodes.length > 0 ? (
          <div className="fallback-grid">
            {groupedNodes.concepts.length > 0 && (
              <div className="fallback-section">
                <div className="section-label">מושגים</div>
                <div className="concept-tags">
                  {groupedNodes.concepts.slice(0, 4).map((node, i) => (
                    <span key={i} className="concept-tag">{node}</span>
                  ))}
                </div>
              </div>
            )}
            {groupedNodes.rulings.length > 0 && (
              <div className="fallback-section">
                <div className="section-label">דינים</div>
                <div className="ruling-tags">
                  {groupedNodes.rulings.slice(0, 4).map((node, i) => (
                    <span key={i} className={`ruling-tag ${/חייב|אסור/.test(node) ? 'strict' : 'lenient'}`}>
                      {node}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {groupedNodes.sages.length > 0 && (
              <div className="fallback-section">
                <div className="section-label">חכמים</div>
                <div className="sage-tags">
                  {groupedNodes.sages.slice(0, 3).map((node, i) => (
                    <span key={i} className="sage-tag">{node}</span>
                  ))}
                </div>
              </div>
            )}
            {groupedNodes.other.length > 0 && groupedNodes.concepts.length === 0 && (
              <div className="fallback-section">
                <div className="concept-tags">
                  {groupedNodes.other.slice(0, 6).map((node, i) => (
                    <span key={i} className="concept-tag">{node}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="fallback-empty">
            <span className="empty-icon">📜</span>
            <span>לא נמצא תוכן לתצוגה</span>
          </div>
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
}

export default memo(MermaidDiagram);
