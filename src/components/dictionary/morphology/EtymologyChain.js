// =============================================================================
// Etymology Chain Component
// Visualizes the etymological progression of Hebrew/Aramaic words
// Shows Proto-Semitic roots through Biblical Hebrew to Modern forms
//
// ENHANCED: Now supports etymologyData from lookupAllEtymology service
// =============================================================================

import React, { useState, useMemo, memo } from 'react';
import { getRootInfo } from '../../../data/rootDatabase';
import { buildEtymologyChainFromData } from '../../../services/scholarly/wordRelationshipService';
import './EtymologyChain.css';

/**
 * Etymology stages for Hebrew/Aramaic words
 */
const ETYMOLOGY_STAGES = {
  protoSemitic: {
    id: 'proto-semitic',
    label: 'Proto-Semitic',
    shortLabel: 'PS',
    color: '#8b5cf6',
    description: 'Reconstructed ancestral Semitic root'
  },
  akkadian: {
    id: 'akkadian',
    label: 'Akkadian',
    shortLabel: 'Akk',
    color: '#6366f1',
    description: 'Ancient Mesopotamian cognate'
  },
  ugaritic: {
    id: 'ugaritic',
    label: 'Ugaritic',
    shortLabel: 'Ug',
    color: '#3b82f6',
    description: 'Bronze Age Canaanite cognate'
  },
  biblicalHebrew: {
    id: 'biblical-hebrew',
    label: 'Biblical Hebrew',
    shortLabel: 'BH',
    color: '#10b981',
    description: 'Hebrew Bible attestation'
  },
  biblicalAramaic: {
    id: 'biblical-aramaic',
    label: 'Biblical Aramaic',
    shortLabel: 'BA',
    color: '#f59e0b',
    description: 'Aramaic portions of Bible'
  },
  rabbinic: {
    id: 'rabbinic',
    label: 'Rabbinic',
    shortLabel: 'Rab',
    color: '#ef4444',
    description: 'Mishnaic/Talmudic usage'
  },
  arabic: {
    id: 'arabic',
    label: 'Arabic',
    shortLabel: 'Ar',
    color: '#ec4899',
    description: 'Arabic cognate form'
  },
  syriac: {
    id: 'syriac',
    label: 'Syriac',
    shortLabel: 'Syr',
    color: '#f97316',
    description: 'Syriac Aramaic cognate'
  }
};

/**
 * Build etymology chain from root info
 */
const buildEtymologyChain = (root, rootInfo) => {
  if (!rootInfo) return [];

  const chain = [];

  // Add Proto-Semitic reconstruction if available
  if (rootInfo.protoSemitic) {
    chain.push({
      stage: ETYMOLOGY_STAGES.protoSemitic,
      form: rootInfo.protoSemitic,
      notes: 'Reconstructed root'
    });
  }

  // Add cognates from other Semitic languages
  const cognates = rootInfo.cognates || {};

  if (cognates.akkadian) {
    chain.push({
      stage: ETYMOLOGY_STAGES.akkadian,
      form: cognates.akkadian,
      notes: 'Akkadian cognate'
    });
  }

  if (cognates.ugaritic) {
    chain.push({
      stage: ETYMOLOGY_STAGES.ugaritic,
      form: cognates.ugaritic,
      notes: 'Ugaritic cognate'
    });
  }

  // Add the Biblical Hebrew form (the main root)
  chain.push({
    stage: ETYMOLOGY_STAGES.biblicalHebrew,
    form: root,
    meaning: rootInfo.base,
    notes: rootInfo.notes || 'Biblical attestation',
    isPrimary: true
  });

  // Add Arabic cognate if available
  if (cognates.arabic) {
    chain.push({
      stage: ETYMOLOGY_STAGES.arabic,
      form: cognates.arabic,
      notes: 'Arabic cognate'
    });
  }

  // Add Syriac cognate if available
  if (cognates.syriac) {
    chain.push({
      stage: ETYMOLOGY_STAGES.syriac,
      form: cognates.syriac,
      notes: 'Syriac cognate'
    });
  }

  return chain;
};

/**
 * Single etymology node in the chain
 */
const EtymologyNode = ({ item, isFirst, isLast, isPrimary }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`etymology-node ${isPrimary ? 'primary' : ''}`}>
      {/* Connector line */}
      {!isFirst && (
        <div className="etymology-connector">
          <div className="connector-line" />
          <span className="connector-arrow">→</span>
        </div>
      )}

      {/* Node content */}
      <button
        className="etymology-stage"
        style={{ '--stage-color': item.stage.color }}
        onClick={() => setExpanded(!expanded)}
      >
        <span className="stage-badge">{item.stage.shortLabel}</span>
        <span className="stage-form" dir="rtl">{item.form}</span>
        {item.meaning && (
          <span className="stage-meaning">"{item.meaning}"</span>
        )}
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="etymology-details">
          <div className="detail-header">{item.stage.label}</div>
          <div className="detail-desc">{item.stage.description}</div>
          {item.notes && <div className="detail-notes">{item.notes}</div>}
        </div>
      )}
    </div>
  );
};

/**
 * Etymology Chain Component
 * Displays the etymological history of a Hebrew/Aramaic word
 *
 * Now supports two data sources:
 * 1. etymologyData - from lookupAllEtymology (new, preferred)
 * 2. rootInfo - from rootDatabase (legacy fallback)
 *
 * @param {string} root - The Hebrew root
 * @param {Object} rootInfo - Legacy root info from rootDatabase
 * @param {Object} etymologyData - New etymology data from lookupAllEtymology
 * @param {boolean} compact - Use compact inline layout
 */
const EtymologyChain = memo(function EtymologyChain({
  root,
  rootInfo: providedRootInfo,
  etymologyData,
  compact = false
}) {
  const [expanded, setExpanded] = useState(false);

// Use new etymologyData if provided
  const chainFromNewData = useMemo(() => {
    if (!etymologyData?.hasEtymology) return null;
    const result = buildEtymologyChainFromData(etymologyData);
    return result.hasChain ? result : null;
  }, [etymologyData]);

  // Legacy: Get root info if not provided
  const rootInfo = useMemo(() => {
    return providedRootInfo || getRootInfo?.(root);
  }, [root, providedRootInfo]);

  // Build the etymology chain - prefer new data, fallback to legacy
  const chain = useMemo(() => {
    // Use new data if available
    if (chainFromNewData?.layers?.length > 0) {
      // Convert new format to legacy display format
      return chainFromNewData.layers.map(layer => ({
        stage: {
          id: layer.id,
          label: layer.label,
          shortLabel: layer.label.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 3),
          color: layer.color,
          description: `${layer.hebrew || layer.label} (${layer.era > 0 ? layer.era + ' CE' : Math.abs(layer.era) + ' BCE'})`
        },
        form: layer.form || layer.forms?.[0]?.word || '',
        meaning: layer.meaning || '',
        notes: layer.source || '',
        isPrimary: layer.id === 'biblical_hebrew'
      }));
    }

    // Fallback to legacy
    return buildEtymologyChain(root, rootInfo);
  }, [chainFromNewData, root, rootInfo]);

  // Don't render if no etymology data
  if (!chain.length || chain.length < 2) {
    return null;
  }

  if (compact) {
    // Compact inline view
    return (
      <div className="etymology-chain compact">
        <span className="etymology-label">Etymology:</span>
        <div className="etymology-inline">
          {chain.map((item, i) => (
            <span key={i} className="inline-stage">
              <span
                className="inline-badge"
                style={{ background: item.stage.color }}
              >
                {item.stage.shortLabel}
              </span>
              <span className="inline-form" dir="rtl">{item.form}</span>
              {i < chain.length - 1 && <span className="inline-arrow">→</span>}
            </span>
          ))}
        </div>
      </div>
    );
  }

  // Full expandable view
  return (
    <div className="etymology-chain">
      <button
        className="etymology-header"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="etymology-icon">🌳</span>
        <span className="etymology-title">Etymology Chain</span>
        <span className="etymology-count">{chain.length} stages</span>
        <span className={`etymology-arrow ${expanded ? 'expanded' : ''}`}>▼</span>
      </button>

      {expanded && (
        <div className="etymology-content">
          <div className="etymology-chain-visual">
            {chain.map((item, i) => (
              <EtymologyNode
                key={i}
                item={item}
                isFirst={i === 0}
                isLast={i === chain.length - 1}
                isPrimary={item.isPrimary}
              />
            ))}
          </div>

          {/* Etymology summary */}
          <div className="etymology-summary">
            <span className="summary-icon">📖</span>
            <span className="summary-text">
              // From {chain[0]?.stage.label} *{chain[0]?.form} →
              {chain.find(c => c.isPrimary)?.meaning &&
                ` "${chain.find(c => c.isPrimary)?.meaning}"`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
});

export default EtymologyChain;
