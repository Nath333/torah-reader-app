/**
 * MermaidDiagram Component
 * Renders Mermaid diagrams with error handling, timeout, and fallback display
 */

import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
import mermaid from 'mermaid';

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

const DIAGRAM_TIMEOUT = 5000; // 5 second timeout

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
        // Clean the chart syntax
        let cleanChart = chart
          .replace(/\\n/g, '\n')
          .replace(/\\"/g, '"')
          .trim();

        // Ensure it starts with a valid graph declaration
        if (!cleanChart.match(/^(graph|flowchart|sequenceDiagram|classDiagram|mindmap)/i)) {
          cleanChart = 'graph TD\n' + cleanChart;
        }

        // Generate unique ID to avoid conflicts
        const uniqueId = `mermaid-${id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const { svg: renderedSvg } = await mermaid.render(uniqueId, cleanChart);

        if (!isCancelled) {
          clearTimeout(timeoutId);
          setSvg(renderedSvg);
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
}

export default memo(MermaidDiagram);
