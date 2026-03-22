/**
 * ProScholarV6Panel - PRO SCHOLAR V6 Analysis Display Panel
 *
 * Displays comprehensive V6 analysis results:
 * - Multi-hypothesis root extraction with confidence
 * - Binyan analysis (Hebrew & Aramaic)
 * - Weak verb type visualization (8 types)
 * - Dialect detection (Biblical Hebrew, Mishnaic, Talmudic Aramaic)
 * - Semantic field categorization
 * - Root family expansion
 * - Dictionary source tier badges
 * - Telemetry stats (dev mode)
 *
 * @module ProScholarV6Panel
 */

import React, { useState, memo, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useProScholarV6, useProScholarTelemetry } from '../../hooks/useProScholarV6';
import './ProScholarV6Panel.css';

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Confidence meter with visual bar
 */
const ConfidenceMeter = memo(function ConfidenceMeter({ score, label = 'Confidence' }) {
  const level = score >= 80 ? 'high' : score >= 50 ? 'medium' : 'low';

  return (
    <div className={`confidence-meter confidence-${level}`}>
      <div className="confidence-header">
        <span className="confidence-label">{label}</span>
        <span className="confidence-score">{score}%</span>
      </div>
      <div className="confidence-bar">
        <div
          className="confidence-fill"
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
});

/**
 * Binyan display badge with Hebrew name and meaning
 */
const BinyanBadge = memo(function BinyanBadge({ binyan }) {
  if (!binyan) return null;

  const isAramaic = binyan.isAramaic;

  return (
    <div className={`binyan-badge ${isAramaic ? 'aramaic' : 'hebrew'}`}>
      <div className="binyan-header">
        <span className="binyan-icon">
          {isAramaic ? '📜' : '✡️'}
        </span>
        <span className="binyan-title">
          {isAramaic ? 'Aramaic Pattern' : 'Hebrew Binyan'}
        </span>
      </div>
      <div className="binyan-content">
        <span className="binyan-name">{binyan.name}</span>
        {binyan.hebrew && (
          <span className="binyan-hebrew" dir="rtl">{binyan.hebrew}</span>
        )}
        {binyan.meaning && (
          <span className="binyan-meaning">{binyan.meaning}</span>
        )}
      </div>
    </div>
  );
});

/**
 * Weak verb type badge with color coding
 */
const WeakVerbBadge = memo(function WeakVerbBadge({ weakType, display }) {
  if (!weakType || !display) return null;

  return (
    <div
      className="weak-verb-badge"
      style={{
        backgroundColor: display.bg,
        borderColor: display.color
      }}
    >
      <div className="weak-header">
        <span className="weak-icon">{display.icon}</span>
        <span className="weak-title">Weak Verb</span>
      </div>
      <div className="weak-content">
        <span className="weak-hebrew" dir="rtl">{display.hebrew}</span>
        <span className="weak-name">{display.name}</span>
      </div>
      <p className="weak-description">{display.description}</p>
    </div>
  );
});

/**
 * Dialect indicator badge
 */
const DialectBadge = memo(function DialectBadge({ dialect, display, confidence }) {
  if (!display) return null;

  return (
    <div
      className="dialect-badge"
      style={{ borderColor: display.color }}
    >
      <div className="dialect-header">
        <span className="dialect-icon">{display.icon}</span>
        <span className="dialect-name">{display.name}</span>
        {confidence && confidence > 0 && (
          <span className="dialect-confidence">{confidence}%</span>
        )}
      </div>
      <span className="dialect-hebrew" dir="rtl">{display.hebrew}</span>
    </div>
  );
});

/**
 * Semantic field badge
 */
const SemanticFieldBadge = memo(function SemanticFieldBadge({ field, display }) {
  if (!field || !display) return null;

  return (
    <span
      className="semantic-field-badge"
      style={{ color: display.color }}
      title={`Semantic field: ${display.name}`}
    >
      <span className="field-icon">{display.icon}</span>
      <span className="field-name">{display.name}</span>
    </span>
  );
});

/**
 * Root hypothesis display with confidence
 */
const RootHypothesis = memo(function RootHypothesis({ root, confidence, sources, isTop }) {
  return (
    <div className={`root-hypothesis ${isTop ? 'top-hypothesis' : ''}`}>
      <span className="hypothesis-root" dir="rtl">{root}</span>
      <div className="hypothesis-meta">
        <span className="hypothesis-confidence">{confidence}%</span>
        {sources && sources.length > 0 && (
          <span className="hypothesis-sources">
            {sources.map((src, i) => (
              <span key={i} className="source-tag">{src}</span>
            ))}
          </span>
        )}
      </div>
      {isTop && <span className="top-badge">Best Match</span>}
    </div>
  );
});

/**
 * Root family tree display
 */
const RootFamilySection = memo(function RootFamilySection({ family, onWordClick }) {
  const [expanded, setExpanded] = useState(false);

  if (!family || family.length === 0) return null;

  const displayItems = expanded ? family : family.slice(0, 5);
  const hasMore = family.length > 5;

  return (
    <div className="root-family-section">
      <div className="family-header">
        <span className="family-icon">🌳</span>
        <span className="family-title">Root Family</span>
        <span className="family-count">{family.length} forms</span>
      </div>
      <div className="family-list">
        {displayItems.map((item, i) => (
          <button
            key={i}
            className="family-item"
            onClick={() => onWordClick?.(item.word || item)}
            dir="rtl"
          >
            <span className="family-word">{item.word || item}</span>
            {item.meaning && (
              <span className="family-meaning">{item.meaning}</span>
            )}
          </button>
        ))}
      </div>
      {hasMore && (
        <button
          className="family-toggle"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Show less' : `Show ${family.length - 5} more`}
        </button>
      )}
    </div>
  );
});

/**
 * Dictionary source tier display
 */
const SourceTierList = memo(function SourceTierList({ tiers }) {
  if (!tiers || tiers.length === 0) return null;

  return (
    <div className="source-tier-section">
      <div className="tier-header">
        <span className="tier-icon">📚</span>
        <span className="tier-title">Validated Sources</span>
      </div>
      <div className="tier-list">
        {tiers.map((tier, i) => (
          <span
            key={i}
            className={`tier-item tier-${tier.tier}`}
            style={{
              backgroundColor: tier.display?.bg || '#f3f4f6',
              borderColor: tier.display?.color || '#9ca3af'
            }}
          >
            <span className="tier-badge-icon">{tier.display?.icon || '📖'}</span>
            <span className="tier-name">{tier.name}</span>
          </span>
        ))}
      </div>
    </div>
  );
});

/**
 * Telemetry stats display (dev mode)
 */
const TelemetryDisplay = memo(function TelemetryDisplay({ telemetry, cacheStats, onReset, onClearCache }) {
  if (!telemetry) return null;

  const hitRate = cacheStats.hits + cacheStats.misses > 0
    ? Math.round((cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100)
    : 0;

  return (
    <div className="telemetry-section">
      <div className="telemetry-header">
        <span className="telemetry-icon">📊</span>
        <span className="telemetry-title">Performance Stats</span>
        <span className="telemetry-version">V6</span>
      </div>
      <div className="telemetry-grid">
        <div className="telemetry-item">
          <span className="stat-label">Lookups</span>
          <span className="stat-value">{telemetry.lookups || 0}</span>
        </div>
        <div className="telemetry-item">
          <span className="stat-label">Cache Hits</span>
          <span className="stat-value">{cacheStats.hits || 0}</span>
        </div>
        <div className="telemetry-item">
          <span className="stat-label">Hit Rate</span>
          <span className="stat-value">{hitRate}%</span>
        </div>
        <div className="telemetry-item">
          <span className="stat-label">Cache Size</span>
          <span className="stat-value">{cacheStats.size || 0}</span>
        </div>
      </div>
      <div className="telemetry-actions">
        <button className="telemetry-btn" onClick={onReset} title="Reset telemetry">
          Reset Stats
        </button>
        <button className="telemetry-btn" onClick={onClearCache} title="Clear cache">
          Clear Cache
        </button>
      </div>
    </div>
  );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * ProScholarV6Panel - Main V6 analysis display panel
 *
 * @param {Object} props
 * @param {string} props.word - Hebrew/Aramaic word to analyze
 * @param {string} [props.contextType='general'] - Context type (talmudic, biblical)
 * @param {Function} [props.onWordClick] - Callback when clicking related words
 * @param {boolean} [props.showTelemetry=false] - Show telemetry stats (dev mode)
 * @param {boolean} [props.compact=false] - Use compact layout
 * @param {string} [props.className=''] - Additional CSS classes
 */
function ProScholarV6Panel({
  word,
  contextType = 'general',
  onWordClick,
  showTelemetry = false,
  compact = false,
  className = ''
}) {
  // V6 analysis hook
  const {
    analysis,
    isLoading,
    error
  } = useProScholarV6(word, { contextType });

  // Telemetry hook (only if showTelemetry is true)
  const {
    telemetry,
    cacheStats,
    reset: resetTelemetry,
    clearCache
  } = useProScholarTelemetry();

  // Panel class names
  const panelClassName = useMemo(
    () => `pro-scholar-v6-panel ${compact ? 'compact' : ''} ${className}`.trim(),
    [compact, className]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  if (!word) return null;

  // Loading state
  if (isLoading) {
    return (
      <div className={`${panelClassName} loading`}>
        <div className="v6-loading">
          <div className="v6-spinner" />
          <span>Analyzing with PRO SCHOLAR V6...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`${panelClassName} error`}>
        <div className="v6-error">
          <span className="error-icon">!</span>
          <span className="error-text">{error}</span>
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <div className={panelClassName}>
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* HEADER */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="v6-header">
        <div className="v6-title-section">
          <span className="v6-badge">PRO SCHOLAR V6</span>
          <span className="v6-word" dir="rtl">{word}</span>
        </div>
        {analysis.bestRoot && (
          <div className="v6-root-display">
            <span className="root-label">Root:</span>
            <span className="root-value" dir="rtl">{analysis.bestRoot}</span>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* CONFIDENCE METER */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {analysis.confidence > 0 && (
        <ConfidenceMeter score={analysis.confidence} />
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* BADGES ROW */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="v6-badges-row">
        {/* Semantic Field */}
        {analysis.semanticFieldDisplay && (
          <SemanticFieldBadge
            field={analysis.semanticField}
            display={analysis.semanticFieldDisplay}
          />
        )}

        {/* Dialect */}
        {analysis.dialectDisplay && (
          <DialectBadge
            dialect={analysis.dialect?.dialect}
            display={analysis.dialectDisplay}
            confidence={analysis.dialect?.confidence}
          />
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* BINYAN ANALYSIS */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {!compact && analysis.binyanDisplay && (
        <BinyanBadge binyan={analysis.binyanDisplay} />
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* WEAK VERB TYPE */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {!compact && analysis.isWeakVerb && (
        <WeakVerbBadge
          weakType={analysis.weakVerbType?.type}
          display={analysis.weakVerbType?.display}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ROOT HYPOTHESES */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {!compact && analysis.roots && analysis.roots.length > 0 && (
        <div className="v6-hypotheses">
          <div className="hypotheses-header">
            <span className="hypotheses-icon">🔍</span>
            <span className="hypotheses-title">Root Hypotheses</span>
            <span className="hypotheses-count">{analysis.roots.length}</span>
          </div>
          <div className="hypotheses-list">
            {analysis.roots.slice(0, 3).map((hyp, i) => (
              <RootHypothesis
                key={i}
                root={hyp.root}
                confidence={hyp.confidence || hyp.score || 0}
                sources={hyp.sources}
                isTop={i === 0}
              />
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SOURCE TIERS */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {!compact && analysis.sourceTiers && analysis.sourceTiers.length > 0 && (
        <SourceTierList tiers={analysis.sourceTiers} />
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ROOT FAMILY */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {!compact && analysis.hasFamily && (
        <RootFamilySection
          family={analysis.rootFamily}
          onWordClick={onWordClick}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TELEMETRY (Dev Mode) */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {showTelemetry && (
        <TelemetryDisplay
          telemetry={telemetry}
          cacheStats={cacheStats}
          onReset={resetTelemetry}
          onClearCache={clearCache}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* FOOTER */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="v6-footer">
        <span className="v6-version">v{analysis.version || '6.0.0'}</span>
        {analysis.fromCache && (
          <span className="v6-cache-indicator" title="Result from cache">
            ⚡ Cached
          </span>
        )}
      </div>
    </div>
  );
}

ProScholarV6Panel.propTypes = {
  word: PropTypes.string.isRequired,
  contextType: PropTypes.oneOf(['general', 'talmudic', 'biblical', 'mishnaic']),
  onWordClick: PropTypes.func,
  showTelemetry: PropTypes.bool,
  compact: PropTypes.bool,
  className: PropTypes.string
};

ProScholarV6Panel.defaultProps = {
  contextType: 'general',
  onWordClick: null,
  showTelemetry: false,
  compact: false,
  className: ''
};

export default memo(ProScholarV6Panel);
