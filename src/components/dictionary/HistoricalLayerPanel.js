/**
 * HistoricalLayerPanel - PRO SCHOLAR V6 Historical Analysis Display
 *
 * Shows the historical period and semantic evolution of Hebrew/Aramaic words:
 * - Historical layer (Biblical, Mishnaic, Amoraic, etc.)
 * - Period characteristics
 * - Semantic evolution timeline
 *
 * @module HistoricalLayerPanel
 */

import React, { memo, useMemo } from 'react';
import PropTypes from 'prop-types';
import './HistoricalLayerPanel.css';

// =============================================================================
// SAFE IMPORTS
// =============================================================================

let HISTORICAL_LAYERS, HISTORICAL_EVOLUTION, detectHistoricalLayer;
try {
  const proScholarV6 = require('../../services/proScholarV6');
  HISTORICAL_LAYERS = proScholarV6.HISTORICAL_LAYERS;
  HISTORICAL_EVOLUTION = proScholarV6.HISTORICAL_EVOLUTION;
  detectHistoricalLayer = proScholarV6.detectHistoricalLayer;
} catch (e) {
  console.debug('[HistoricalLayerPanel] V6 service not available:', e.message);
  HISTORICAL_LAYERS = {};
  HISTORICAL_EVOLUTION = {};
  detectHistoricalLayer = () => null;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const PERIOD_ORDER = ['biblical', 'latebiblical', 'mishnaic', 'talmudic', 'amoraic', 'geonic'];

const PERIOD_LABELS = {
  biblical: 'Biblical',
  latebiblical: 'Late Biblical',
  mishnaic: 'Mishnaic',
  talmudic: 'Talmudic',
  amoraic: 'Amoraic',
  geonic: 'Geonic'
};

const PERIOD_ICONS = {
  biblical: '📜',
  latebiblical: '📖',
  mishnaic: '📚',
  talmudic: '📑',
  amoraic: '🔖',
  geonic: '✍️'
};

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

/**
 * Layer information card
 */
const LayerInfoCard = memo(function LayerInfoCard({ layer }) {
  if (!layer) return null;

  return (
    <div className="hlp-layer-card">
      <div className="hlp-layer-header">
        <span className="hlp-layer-name">{layer.name}</span>
        <span className="hlp-layer-hebrew" dir="rtl">{layer.hebrew}</span>
      </div>
      <div className="hlp-layer-period">{layer.period}</div>
      {layer.characteristics && layer.characteristics.length > 0 && (
        <div className="hlp-characteristics">
          {layer.characteristics.map((char, idx) => (
            <span key={idx} className="hlp-characteristic">{char}</span>
          ))}
        </div>
      )}
    </div>
  );
});

/**
 * Evolution timeline
 */
const EvolutionTimeline = memo(function EvolutionTimeline({ evolution }) {
  if (!evolution) return null;

  // Get periods in order
  const periods = PERIOD_ORDER.filter(p => evolution[p]);

  if (periods.length === 0) return null;

  return (
    <div className="hlp-evolution">
      <div className="hlp-evolution-title">
        <span>📈</span>
        <span>Semantic Evolution</span>
      </div>
      <div className="hlp-timeline">
        {periods.map((period) => {
          const data = evolution[period];
          return (
            <div key={period} className="hlp-timeline-item">
              <div className="hlp-timeline-dot" />
              <div className="hlp-timeline-period">
                {PERIOD_ICONS[period]} {PERIOD_LABELS[period]}
              </div>
              <div className="hlp-timeline-meaning">"{data.meaning}"</div>
              {data.context && (
                <div className="hlp-timeline-context">{data.context}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * HistoricalLayerPanel - Historical period and evolution display
 *
 * @param {Object} props
 * @param {string} props.word - Word to analyze
 * @param {string} props.root - Root to look up in evolution database
 * @param {boolean} [props.compact=false] - Use compact layout
 * @param {boolean} [props.showEvolution=true] - Show semantic evolution
 * @param {boolean} [props.dark=false] - Use dark mode
 * @param {string} [props.className=''] - Additional CSS classes
 */
function HistoricalLayerPanel({
  word,
  root,
  compact = false,
  showEvolution = true,
  dark = false,
  className = ''
}) {
  // Analyze historical layer
  const analysis = useMemo(() => {
    if (!word && !root) return null;

    // Get historical layer from detection
    let layerResult = null;
    if (detectHistoricalLayer && word) {
      try {
        layerResult = detectHistoricalLayer(word);
      } catch (e) {
        console.debug('[HistoricalLayerPanel] detectHistoricalLayer failed:', e.message);
      }
    }

    // Look up evolution data
    const wordToLookup = root || word?.replace(/[\u05B0-\u05BD\u05BF-\u05C7]/g, '');
    const evolution = HISTORICAL_EVOLUTION?.[wordToLookup] || null;

    // Determine primary layer
    let primaryLayerKey = layerResult?.layer;
    if (!primaryLayerKey && evolution) {
      // Infer from evolution data
      primaryLayerKey = PERIOD_ORDER.find(p => evolution[p]) || null;
    }

    const primaryLayer = primaryLayerKey ? HISTORICAL_LAYERS?.[primaryLayerKey] : null;

    return {
      word: wordToLookup,
      primaryLayerKey,
      primaryLayer,
      evolution,
      hasData: !!(primaryLayer || evolution)
    };
  }, [word, root]);

  // Panel class names
  const panelClassName = useMemo(
    () => `historical-layer-panel ${compact ? 'compact' : ''} ${dark ? 'dark' : ''} ${className}`.trim(),
    [compact, dark, className]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  if (!analysis?.hasData) {
    return (
      <div className={panelClassName}>
        <div className="hlp-no-data">
          <div className="hlp-no-data-icon">📜</div>
          <div className="hlp-no-data-text">
            No historical data available for this word
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={panelClassName}>
      {/* Header */}
      <div className="hlp-header">
        <div className="hlp-title">
          <span className="hlp-icon">📜</span>
          <span className="hlp-title-text">Historical Analysis</span>
        </div>
        {analysis.primaryLayerKey && (
          <span className="hlp-period-badge">
            {PERIOD_ICONS[analysis.primaryLayerKey]} {PERIOD_LABELS[analysis.primaryLayerKey]}
          </span>
        )}
      </div>

      {/* Layer Info */}
      {analysis.primaryLayer && (
        <LayerInfoCard layer={analysis.primaryLayer} />
      )}

      {/* Evolution Timeline */}
      {showEvolution && analysis.evolution && (
        <EvolutionTimeline evolution={analysis.evolution} />
      )}
    </div>
  );
}

HistoricalLayerPanel.propTypes = {
  word: PropTypes.string,
  root: PropTypes.string,
  compact: PropTypes.bool,
  showEvolution: PropTypes.bool,
  dark: PropTypes.bool,
  className: PropTypes.string
};

// Note: Default values are set in function parameters (modern React pattern)

export default memo(HistoricalLayerPanel);
