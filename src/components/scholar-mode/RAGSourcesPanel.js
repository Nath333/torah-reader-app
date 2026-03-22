/**
 * RAGSourcesPanel - Display actual sources fetched from Sefaria
 * Shows the real texts that AI analysis is based on, with Sefaria links
 *
 * Critical for Kollel-style study: Users can verify AI citations against actual sources
 */

import React, { useState, useMemo } from 'react';
import './RAGSourcesPanel.css';

// Convert reference to Sefaria URL
const toSefariaUrl = (ref) => {
  if (!ref) return null;
  const cleanRef = ref.replace(/\s+/g, '_');
  return `https://www.sefaria.org/${encodeURIComponent(cleanRef)}`;
};

// Source type icons and labels
const SOURCE_TYPE_CONFIG = {
  commentary: { icon: '📖', label: 'Commentaries', heLabel: 'מפרשים' },
  crossRef: { icon: '🔗', label: 'Cross-References', heLabel: 'מראי מקומות' },
  midrash: { icon: '📜', label: 'Midrash', heLabel: 'מדרש' },
  targum: { icon: '🔤', label: 'Targum', heLabel: 'תרגום' },
  halacha: { icon: '⚖️', label: 'Halacha', heLabel: 'הלכה' },
  parallel: { icon: '📑', label: 'Parallels', heLabel: 'מקבילות' },
  topics: { icon: '🏷️', label: 'Topics', heLabel: 'נושאים' },
  lexicon: { icon: '📚', label: 'Lexicon', heLabel: 'מילון' },
  other: { icon: '📝', label: 'Other', heLabel: 'אחר' }
};

// Individual source card component
const SourceCard = ({ source, isExpanded, onToggle }) => {
  const config = SOURCE_TYPE_CONFIG[source.type] || SOURCE_TYPE_CONFIG.other;

  const renderSourceContent = () => {
    switch (source.type) {
      case 'commentary':
        return (
          <div className="rag-source-texts">
            {source.texts?.map((text, idx) => (
              <div key={idx} className="rag-commentary-item">
                {text.dibbur && (
                  <div className="rag-dibbur">
                    <span className="dibbur-label">ד״ה</span>
                    <span className="dibbur-text">{text.dibbur}</span>
                  </div>
                )}
                {text.hebrew && (
                  <div className="rag-text-hebrew" dir="rtl">{text.hebrew}</div>
                )}
                {text.english && (
                  <div className="rag-text-english">{text.english}</div>
                )}
              </div>
            ))}
          </div>
        );

      case 'crossRef':
        return (
          <div className="rag-refs-list">
            {source.refs?.map((ref, idx) => (
              <a
                key={idx}
                href={toSefariaUrl(ref.ref)}
                target="_blank"
                rel="noopener noreferrer"
                className="rag-ref-link"
              >
                <span className="ref-name">{ref.ref}</span>
                {ref.heRef && <span className="ref-hebrew">{ref.heRef}</span>}
                {ref.text && <span className="ref-preview">{ref.text}</span>}
              </a>
            ))}
          </div>
        );

      case 'midrash':
        return (
          <div className="rag-midrash-list">
            {source.texts?.map((text, idx) => (
              <div key={idx} className="rag-midrash-item">
                <a
                  href={toSefariaUrl(text.ref)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="midrash-ref"
                >
                  {text.ref}
                </a>
                {text.hebrew && <div className="rag-text-hebrew" dir="rtl">{text.hebrew}</div>}
                {text.english && <div className="rag-text-english">{text.english}</div>}
              </div>
            ))}
          </div>
        );

      case 'targum':
        return (
          <div className="rag-targum-list">
            {source.texts?.map((text, idx) => (
              <div key={idx} className="rag-targum-item">
                <a
                  href={toSefariaUrl(text.ref)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="targum-ref"
                >
                  {text.ref}
                </a>
                {text.aramaic && (
                  <div className="rag-text-aramaic" dir="rtl">
                    <span className="lang-label">Aramaic:</span> {text.aramaic}
                  </div>
                )}
                {text.english && <div className="rag-text-english">{text.english}</div>}
              </div>
            ))}
          </div>
        );

      case 'halacha':
        return (
          <div className="rag-halacha-list">
            {source.refs?.map((ref, idx) => (
              <a
                key={idx}
                href={toSefariaUrl(ref.ref)}
                target="_blank"
                rel="noopener noreferrer"
                className="rag-ref-link halacha-link"
              >
                <span className="ref-name">{ref.ref}</span>
                {ref.text && <span className="ref-preview">{ref.text}</span>}
              </a>
            ))}
          </div>
        );

      case 'parallel':
        return (
          <div className="rag-parallels-list">
            {source.refs?.map((ref, idx) => (
              <a
                key={idx}
                href={toSefariaUrl(ref.ref)}
                target="_blank"
                rel="noopener noreferrer"
                className="rag-ref-link parallel-link"
              >
                <span className="ref-name">{ref.ref}</span>
                {ref.heRef && <span className="ref-hebrew">{ref.heRef}</span>}
                {ref.text && <span className="ref-preview">{ref.text}</span>}
              </a>
            ))}
          </div>
        );

      case 'topics':
        return (
          <div className="rag-topics-grid">
            {source.topics?.map((topic, idx) => (
              <div key={idx} className="rag-topic-chip">
                <span className="topic-title">{topic.title}</span>
                {topic.heTitle && <span className="topic-hebrew">{topic.heTitle}</span>}
                {topic.category && <span className="topic-category">{topic.category}</span>}
              </div>
            ))}
          </div>
        );

      default:
        return <div className="rag-source-unknown">Source data available</div>;
    }
  };

  return (
    <div className={`rag-source-card ${isExpanded ? 'expanded' : ''}`}>
      <button
        className="rag-source-header"
        onClick={onToggle}
        aria-expanded={isExpanded}
      >
        <span className="source-icon">{config.icon}</span>
        <span className="source-name">{source.source}</span>
        <span className="source-type-label">{config.heLabel}</span>
        <span className={`expand-icon ${isExpanded ? 'open' : ''}`}>
          {isExpanded ? '▼' : '▶'}
        </span>
      </button>

      {isExpanded && (
        <div className="rag-source-content">
          {renderSourceContent()}

          {/* Link to full source on Sefaria */}
          {source.source && source.source !== 'Topics' && (
            <a
              href={`https://www.sefaria.org/search?q=${encodeURIComponent(source.source)}&tab=text`}
              target="_blank"
              rel="noopener noreferrer"
              className="rag-see-more-link"
            >
              See more from {source.source} on Sefaria →
            </a>
          )}
        </div>
      )}
    </div>
  );
};

// Main panel component
const RAGSourcesPanel = ({ ragMetadata, isCollapsed = false, onToggleCollapse }) => {
  const [expandedSources, setExpandedSources] = useState(new Set(['0'])); // First source expanded by default

  // Group sources by type for organized display (available for future grouped view)
  // eslint-disable-next-line no-unused-vars
  const groupedSources = useMemo(() => {
    if (!ragMetadata?.sources) return {};

    const groups = {};
    ragMetadata.sources.forEach((source, idx) => {
      const type = source.type || 'other';
      if (!groups[type]) groups[type] = [];
      groups[type].push({ ...source, _idx: idx });
    });
    return groups;
  }, [ragMetadata?.sources]);

  const toggleSource = (idx) => {
    setExpandedSources(prev => {
      const next = new Set(prev);
      if (next.has(String(idx))) {
        next.delete(String(idx));
      } else {
        next.add(String(idx));
      }
      return next;
    });
  };

  const expandAll = () => {
    const allIndices = ragMetadata?.sources?.map((_, idx) => String(idx)) || [];
    setExpandedSources(new Set(allIndices));
  };

  const collapseAll = () => {
    setExpandedSources(new Set());
  };

  if (!ragMetadata?.sources?.length) {
    return null; // No sources to display
  }

  return (
    <div className={`rag-sources-panel ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="rag-panel-header">
        <button
          className="rag-panel-toggle"
          onClick={onToggleCollapse}
          aria-expanded={!isCollapsed}
        >
          <span className="panel-icon">📚</span>
          <span className="panel-title">Source Texts</span>
          <span className="panel-title-hebrew">מקורות</span>
          <span className="source-count">{ragMetadata.sources.length}</span>
          <span className={`collapse-icon ${isCollapsed ? '' : 'open'}`}>
            {isCollapsed ? '▶' : '▼'}
          </span>
        </button>

        {!isCollapsed && (
          <div className="rag-panel-actions">
            <button onClick={expandAll} className="rag-action-btn" title="Expand all">
              ⊕ All
            </button>
            <button onClick={collapseAll} className="rag-action-btn" title="Collapse all">
              ⊖ All
            </button>
          </div>
        )}
      </div>

      {!isCollapsed && (
        <>
          <div className="rag-panel-info">
            <span className="info-badge verified">
              ✓ Real sources from Sefaria
            </span>
            {ragMetadata.reference && (
              <a
                href={toSefariaUrl(ragMetadata.reference)}
                target="_blank"
                rel="noopener noreferrer"
                className="ref-link"
              >
                {ragMetadata.reference}
              </a>
            )}
          </div>

          <div className="rag-sources-list">
            {ragMetadata.sources.map((source, idx) => (
              <SourceCard
                key={idx}
                source={source}
                isExpanded={expandedSources.has(String(idx))}
                onToggle={() => toggleSource(idx)}
              />
            ))}
          </div>

          <div className="rag-panel-footer">
            <span className="footer-note">
              💡 AI analysis is based on these actual sources. Verify claims against the texts above.
            </span>
          </div>
        </>
      )}
    </div>
  );
};

// Export both named and default
export { RAGSourcesPanel };
export default RAGSourcesPanel;
