// =============================================================================
// PRO SCHOLAR V6 PANEL - Advanced Linguistic Analysis Display
// Displays: Semantic Fields, Root Families, Binyan Analysis, Dialect Markers
// =============================================================================

import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import PropTypes from 'prop-types';
import './ProScholarPanel.css';
// PRO SCHOLAR V6.2: Import advanced analysis functions
import {
  analyzeBinyan,
  detectDialect,
  getSemanticField,
  getRootFamily,
  getTelemetry,
  // V6.1: Scholarly features
  getHistoricalLayer,
  getGrammaticalAnomaly,
  getCognates
  // V6.2: getLoanwordInfo available for future loanword display
} from '../../services/unifiedRootService';

// PRO SCHOLAR V6: Full telemetry dashboard (lazy loaded for development use)
const V6TelemetryDashboard = lazy(() => import('./V6TelemetryDashboard'));

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Semantic Field Badge - Shows word's semantic category
 */
const SemanticFieldBadge = ({ field, fieldName, relatedConcepts }) => {
  const [expanded, setExpanded] = useState(false);

  const fieldColors = {
    LEGAL: '#8B5CF6',      // Purple for Halacha
    DIALECTIC: '#F59E0B',  // Amber for argumentation
    TEMPORAL: '#10B981',   // Green for time
    SPATIAL: '#3B82F6',    // Blue for location
    CITATION: '#EC4899',   // Pink for sources
    TUMAH_TAHARAH: '#EF4444', // Red for purity
    KODASHIM: '#F97316',   // Orange for sacrifices
    SHABBAT: '#6366F1',    // Indigo for Shabbat
    NEZIKIN: '#DC2626',    // Dark red for damages
    NASHIM: '#D946EF',     // Fuchsia for family law
    BERAKHOT: '#14B8A6',   // Teal for prayer
    MOADIM: '#84CC16',     // Lime for festivals
  };

  const color = fieldColors[field] || '#6B7280';

  if (!field) return null;

  return (
    <div className="semantic-field-badge" style={{ '--field-color': color }}>
      <button
        className="field-header"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <span className="field-icon">◈</span>
        <span className="field-name">{fieldName || field}</span>
        <span className="field-chevron">{expanded ? '▼' : '▶'}</span>
      </button>
      {expanded && relatedConcepts?.length > 0 && (
        <div className="field-concepts">
          <span className="concepts-label">Related:</span>
          {relatedConcepts.slice(0, 5).map((concept, i) => (
            <span key={i} className="concept-chip">{concept}</span>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Root Family Panel - Shows words derived from same root
 */
const RootFamilyPanel = ({ root, family, onWordClick }) => {
  const [expanded, setExpanded] = useState(false);

  if (!root || !family?.length) return null;

  return (
    <div className="root-family-panel">
      <button
        className="family-header"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <span className="family-icon">🌳</span>
        <span className="family-title">Root Family: {root}</span>
        <span className="family-count">({family.length} words)</span>
        <span className="family-chevron">{expanded ? '▼' : '▶'}</span>
      </button>
      {expanded && (
        <div className="family-grid">
          {family.slice(0, 12).map((item, i) => (
            <button
              key={i}
              className="family-word"
              onClick={() => onWordClick?.(item.word || item)}
              title={item.meaning || item.definition}
            >
              <span className="word-hebrew">{item.word || item}</span>
              {item.pattern && (
                <span className="word-pattern">{item.pattern}</span>
              )}
              {item.meaning && (
                <span className="word-meaning">{item.meaning}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Binyan Analysis Badge - Shows verb pattern with confidence
 */
const BinyanAnalysisBadge = ({ binyan, binyanInfo, confidence, matchedPattern }) => {
  const [showDetails, setShowDetails] = useState(false);

  if (!binyan) return null;

  const binyanColors = {
    QAL: '#22C55E',     // Green - simple
    NIFAL: '#3B82F6',   // Blue - passive
    PIEL: '#F59E0B',    // Amber - intensive
    PUAL: '#A855F7',    // Purple - intensive passive
    HIFIL: '#EF4444',   // Red - causative
    HUFAL: '#EC4899',   // Pink - causative passive
    HITPAEL: '#6366F1', // Indigo - reflexive
    // Aramaic
    PEAL: '#22C55E',
    PAEL: '#F59E0B',
    APHEL: '#EF4444',
    ITHPEEL: '#6366F1',
    ITHPAAL: '#A855F7',
    SHAFEL: '#14B8A6',
  };

  const color = binyanColors[binyan] || '#6B7280';

  return (
    <div className="binyan-analysis-badge" style={{ '--binyan-color': color }}>
      <button
        className="binyan-header"
        onClick={() => setShowDetails(!showDetails)}
        aria-expanded={showDetails}
      >
        <span className="binyan-hebrew">{binyanInfo?.hebrew || binyan}</span>
        <span className="binyan-name">{binyanInfo?.name || binyan}</span>
        {confidence && (
          <span className="binyan-confidence">{confidence}%</span>
        )}
      </button>
      {showDetails && (
        <div className="binyan-details">
          {binyanInfo?.meaning && (
            <div className="detail-row">
              <span className="detail-label">Meaning:</span>
              <span className="detail-value">{binyanInfo.meaning}</span>
            </div>
          )}
          {matchedPattern && (
            <div className="detail-row">
              <span className="detail-label">Pattern:</span>
              <span className="detail-value pattern">{matchedPattern}</span>
            </div>
          )}
          {binyanInfo?.frequency && (
            <div className="detail-row">
              <span className="detail-label">Frequency:</span>
              <span className="detail-value">{binyanInfo.frequency}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Dialect Marker - Shows Aramaic dialect (Babylonian/Palestinian/Targumic)
 */
const DialectMarker = ({ dialect, confidence, markers }) => {
  const [showMarkers, setShowMarkers] = useState(false);

  if (!dialect || dialect === 'unknown') return null;

  const dialectInfo = {
    babylonian: { name: 'Babylonian', abbr: 'BA', color: '#8B5CF6', flag: '🏛️' },
    palestinian: { name: 'Palestinian', abbr: 'PA', color: '#10B981', flag: '🏔️' },
    targumic: { name: 'Targumic', abbr: 'Tg', color: '#F59E0B', flag: '📜' },
  };

  const info = dialectInfo[dialect] || { name: dialect, abbr: '?', color: '#6B7280', flag: '📖' };

  return (
    <div className="dialect-marker" style={{ '--dialect-color': info.color }}>
      <button
        className="dialect-badge"
        onClick={() => setShowMarkers(!showMarkers)}
        title={`${info.name} Aramaic${confidence ? ` (${confidence}% confidence)` : ''}`}
      >
        <span className="dialect-flag">{info.flag}</span>
        <span className="dialect-name">{info.name}</span>
        {confidence && <span className="dialect-confidence">{confidence}%</span>}
      </button>
      {showMarkers && markers?.length > 0 && (
        <div className="dialect-markers-list">
          <span className="markers-title">Diagnostic markers:</span>
          {markers.slice(0, 5).map((m, i) => (
            <span key={i} className="marker-chip">{m.marker || m}</span>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Source Tier Badge - Shows dictionary quality tier
 */
const SourceTierBadge = ({ source, tier }) => {
  const tierInfo = {
    gold: { label: 'Gold', icon: '🥇', color: '#F59E0B' },
    silver: { label: 'Silver', icon: '🥈', color: '#9CA3AF' },
    bronze: { label: 'Bronze', icon: '🥉', color: '#CD7F32' },
  };

  const info = tierInfo[tier] || tierInfo.bronze;

  return (
    <span
      className="source-tier-badge"
      style={{ '--tier-color': info.color }}
      title={`${info.label} tier source: ${source}`}
    >
      <span className="tier-icon">{info.icon}</span>
      <span className="tier-source">{source}</span>
    </span>
  );
};

// =============================================================================
// PRO SCHOLAR V6.1: NEW SCHOLARLY COMPONENTS
// =============================================================================

/**
 * Historical Layer Badge - Shows word's historical period
 * V6.2: Now includes loanword etymology details
 */
const HistoricalLayerBadge = ({ layer, evolution, loanwordOrigin, loanwordDetails }) => {
  const [showEvolution, setShowEvolution] = useState(false);

  const layerConfig = {
    biblical: { name: 'Biblical', icon: '📜', color: '#1d4ed8', period: 'c. 1200-200 BCE' },
    latebiblical: { name: 'Late Biblical', icon: '📖', color: '#4338ca', period: 'c. 500-200 BCE' },
    mishnaic: { name: 'Mishnaic', icon: '📚', color: '#7c3aed', period: 'c. 70-200 CE' },
    amoraic: { name: 'Amoraic', icon: '📝', color: '#9333ea', period: 'c. 200-500 CE' },
    talmudic: { name: 'Talmudic', icon: '📝', color: '#9333ea', period: 'c. 200-500 CE' },
    geonic: { name: 'Geonic', icon: '🏛️', color: '#a855f7', period: 'c. 600-1000 CE' },
  };

  // V6.2: Loanword origin icons
  const loanwordIcons = {
    Greek: '🏛️',
    Latin: '🏟️',
    Persian: '🌙',
    Arabic: '🕌',
  };

  if (!layer) return null;

  const config = layerConfig[layer] || { name: layer, icon: '📅', color: '#6B7280', period: '' };
  const hasDetails = evolution || (loanwordDetails && loanwordDetails.source);

  return (
    <div className="historical-layer-badge" style={{ '--layer-color': config.color }}>
      <button
        className="layer-header"
        onClick={() => setShowEvolution(!showEvolution)}
        aria-expanded={showEvolution}
      >
        <span className="layer-icon">{config.icon}</span>
        <span className="layer-name">{config.name}</span>
        <span className="layer-period">{config.period}</span>
        {loanwordOrigin && (
          <span className="loanword-tag" title={loanwordDetails ? `${loanwordDetails.source} → "${loanwordDetails.meaning}"` : `Loanword from ${loanwordOrigin}`}>
            {loanwordIcons[loanwordOrigin] || '📤'} {loanwordOrigin}
          </span>
        )}
        {hasDetails && <span className="layer-chevron">{showEvolution ? '▼' : '▶'}</span>}
      </button>
      {showEvolution && (
        <div className="evolution-timeline">
          {/* V6.2: Loanword etymology details */}
          {loanwordDetails && loanwordDetails.source && (
            <div className="loanword-etymology">
              <span className="etymology-label">Etymology:</span>
              <span className="etymology-source">{loanwordDetails.source}</span>
              <span className="etymology-arrow">→</span>
              <span className="etymology-meaning">"{loanwordDetails.meaning}"</span>
            </div>
          )}
          {/* Semantic evolution */}
          {evolution && (
            <>
              <span className="evolution-title">Semantic Evolution:</span>
              {Object.entries(evolution).map(([period, data]) => (
                <div key={period} className="evolution-step">
                  <span className="evo-period">{period}:</span>
                  <span className="evo-meaning">"{data.meaning}"</span>
                  {data.context && <span className="evo-context">({data.context})</span>}
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Grammatical Anomaly Badge - Shows irregular forms
 */
const GrammaticalAnomalyBadge = ({ anomaly }) => {
  const [showDetails, setShowDetails] = useState(false);

  if (!anomaly || !anomaly.hasAnomaly) return null;

  const typeIcons = {
    irregular_plural: '🔢',
    assimilating_nun: '🔀',
    pseudo_pe_nun: '🔄',
    irregular_verb: '⚠️',
    irregular_construct: '🔗',
    // V6.2: New anomaly types
    pe_yod: '🔸',           // PE-YOD weak verbs
    hollow_verb: '🔹',      // AYIN-WAW/YOD hollow verbs
    lamed_he: '🔻',         // LAMED-HE verbs
    dual_only: '👥',        // Dual-only nouns
    irregular_vowel: '🔶',  // Irregular vowel patterns
    double_ayin: '♊',       // Geminate verbs (AYIN-AYIN)
    defective_spelling: '📝', // Ketiv/Qere variants
    segolate: '⬡',          // Segolate nouns
  };

  return (
    <div className="anomaly-badge">
      <button
        className="anomaly-header"
        onClick={() => setShowDetails(!showDetails)}
        aria-expanded={showDetails}
      >
        <span className="anomaly-icon">{typeIcons[anomaly.type] || '📌'}</span>
        <span className="anomaly-type">Grammatical Note</span>
        <span className="anomaly-chevron">{showDetails ? '▼' : '▶'}</span>
      </button>
      {showDetails && (
        <div className="anomaly-details">
          <div className="anomaly-row">
            <span className="anomaly-label">Type:</span>
            <span className="anomaly-value">{anomaly.type.replace(/_/g, ' ')}</span>
          </div>
          {anomaly.phenomenon && (
            <div className="anomaly-row">
              <span className="anomaly-label">Pattern:</span>
              <span className="anomaly-value">{anomaly.phenomenon}</span>
            </div>
          )}
          {anomaly.note && (
            <div className="anomaly-row">
              <span className="anomaly-label">Note:</span>
              <span className="anomaly-value note">{anomaly.note}</span>
            </div>
          )}
          {anomaly.scholarly && (
            <div className="anomaly-row scholarly">
              <span className="scholarly-ref">📖 {anomaly.scholarly}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Cognate Languages Panel - Shows related words in sister languages
 */
const CognatePanel = ({ cognateData }) => {
  const [expanded, setExpanded] = useState(false);

  if (!cognateData || !cognateData.hasCognates) return null;

  const languageFlags = {
    akkadian: '🏺',
    ugaritic: '⚱️',
    phoenician: '🚢',
    arabic: '🕌',
    syriac: '✝️',
    ethiopic: '☦️',
  };

  return (
    <div className="cognate-panel">
      <button
        className="cognate-header"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <span className="cognate-icon">🌍</span>
        <span className="cognate-title">Semitic Cognates</span>
        <span className="cognate-count">({cognateData.cognates?.length || 0})</span>
        <span className="cognate-chevron">{expanded ? '▼' : '▶'}</span>
      </button>
      {expanded && (
        <div className="cognate-content">
          {cognateData.cognates?.map((cog, idx) => (
            <div key={idx} className="cognate-item">
              <span className="cog-flag">{languageFlags[cog.language] || '📜'}</span>
              <span className="cog-lang">{cog.language}</span>
              <span className="cog-word">{cog.word}</span>
              <span className="cog-meaning">"{cog.meaning}"</span>
            </div>
          ))}
          {cognateData.note && (
            <div className="cognate-note">
              <span className="note-icon">💡</span>
              <span className="note-text">{cognateData.note}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Hypothesis Ranking Panel - PRO SCHOLAR V5: Shows all root hypotheses with confidence
 * Displays multi-hypothesis results from extractRootsWithDirectValidation
 */
const HypothesisRankingPanel = ({ hypotheses, onHypothesisClick }) => {
  const [expanded, setExpanded] = useState(false);

  if (!hypotheses?.length) return null;

  // Only show panel if we have multiple hypotheses
  if (hypotheses.length < 2) return null;

  const tierColors = {
    gold: { bg: 'rgba(234, 179, 8, 0.15)', border: '#f59e0b', icon: '🥇' },
    silver: { bg: 'rgba(156, 163, 175, 0.15)', border: '#9ca3af', icon: '🥈' },
    bronze: { bg: 'rgba(205, 127, 50, 0.15)', border: '#cd7f32', icon: '🥉' },
  };

  const getConfidenceClass = (conf) => {
    if (conf >= 85) return 'high';
    if (conf >= 70) return 'medium';
    return 'low';
  };

  return (
    <div className="hypothesis-ranking-panel">
      <button
        className="hypothesis-header"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <span className="hypothesis-icon">🔬</span>
        <span className="hypothesis-title">Root Hypotheses</span>
        <span className="hypothesis-count">({hypotheses.length})</span>
        <span className="hypothesis-chevron">{expanded ? '▼' : '▶'}</span>
      </button>
      {expanded && (
        <div className="hypothesis-list">
          {hypotheses.slice(0, 6).map((hyp, idx) => {
            const tierInfo = tierColors[hyp.tier] || tierColors.bronze;
            return (
              <button
                key={`${hyp.root}-${idx}`}
                className={`hypothesis-item ${idx === 0 ? 'primary' : ''}`}
                onClick={() => onHypothesisClick?.(hyp)}
                style={{
                  '--hyp-bg': tierInfo.bg,
                  '--hyp-border': tierInfo.border,
                }}
              >
                <div className="hyp-rank-badge">
                  <span className="hyp-rank">{idx + 1}</span>
                  <span className="hyp-tier-icon">{tierInfo.icon}</span>
                </div>
                <div className="hyp-content">
                  <div className="hyp-root-row">
                    <span className="hyp-root" dir="rtl">{hyp.root}</span>
                    {hyp.weakVerb && (
                      <span className="hyp-weak-tag">{hyp.weakVerb}</span>
                    )}
                    {hyp.pattern && (
                      <span className="hyp-pattern-tag">{hyp.pattern}</span>
                    )}
                  </div>
                  <div className="hyp-def-row">
                    <span className="hyp-definition">{hyp.definition || 'No definition'}</span>
                  </div>
                  <div className="hyp-meta-row">
                    <span className={`hyp-confidence ${getConfidenceClass(hyp.confidence)}`}>
                      {hyp.confidence}%
                    </span>
                    <span className="hyp-source">{hyp.source}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

/**
 * Telemetry Mini Display - Shows cache performance
 */
const TelemetryMini = () => {
  const [telemetry, setTelemetry] = useState(null);
  const [visible, setVisible] = useState(false);

  const refresh = useCallback(() => {
    try {
      const data = getTelemetry();
      setTelemetry(data);
    } catch (e) {
      // V6 not available
    }
  }, []);

  if (!visible) {
    return (
      <button
        className="telemetry-toggle"
        onClick={() => { setVisible(true); refresh(); }}
        title="Show performance stats"
      >
        📊
      </button>
    );
  }

  return (
    <div className="telemetry-mini">
      <div className="telemetry-header">
        <span>Performance</span>
        <button onClick={() => setVisible(false)}>×</button>
      </div>
      {telemetry ? (
        <div className="telemetry-stats">
          <div className="stat">
            <span className="stat-label">Cache Hit Rate:</span>
            <span className="stat-value">{telemetry.hitRate}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Avg Lookup:</span>
            <span className="stat-value">{telemetry.avgLookupMs}ms</span>
          </div>
          <div className="stat">
            <span className="stat-label">Total Lookups:</span>
            <span className="stat-value">{telemetry.lookups}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Weak Verbs:</span>
            <span className="stat-value">{telemetry.weakVerbsDetected}</span>
          </div>
        </div>
      ) : (
        <div className="telemetry-loading">Loading...</div>
      )}
      <button className="telemetry-refresh" onClick={refresh}>Refresh</button>
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * ProScholarPanel - Advanced linguistic analysis panel
 * Integrates V6.1 features: semantic fields, root families, binyan, dialect,
 * historical layers, grammatical anomalies, and cognate languages
 */
const ProScholarPanel = ({
  word,
  root,
  translationData,
  isAramaic = false,
  contextType = 'unknown',
  onWordClick,
  onHypothesisSelect,
  showTelemetry = false,
  compact = false,
}) => {
  // Compute V6.1 analysis
  const v6Analysis = useMemo(() => {
    if (!word) return null;

    const analysis = {
      semanticField: null,
      rootFamily: null,
      binyanAnalysis: null,
      dialectAnalysis: null,
      // V6.1: New scholarly features
      historicalLayer: null,
      grammaticalAnomaly: null,
      cognates: null,
    };

    try {
      // V6.2: Pass contextType to enhance analysis accuracy
      const analysisContext = { contextType, isAramaic };

      // Semantic field - contextType helps identify Talmudic vs Biblical semantic domains
      const semanticResult = getSemanticField(word, analysisContext);
      if (semanticResult?.field) {
        analysis.semanticField = semanticResult;
      }

      // Root family (if root is known)
      const effectiveRoot = root || translationData?.root;
      if (effectiveRoot) {
        const familyResult = getRootFamily(effectiveRoot, analysisContext);
        if (familyResult?.family?.length > 0) {
          analysis.rootFamily = familyResult;
        }

        // V6.1: Cognate information (requires root)
        const cognateResult = getCognates(effectiveRoot);
        if (cognateResult?.hasCognates) {
          analysis.cognates = cognateResult;
        }
      }

      // Binyan analysis (for verbs) - contextType affects Aramaic binyan detection
      const binyanResult = analyzeBinyan(word, {
        language: isAramaic ? 'aramaic' : 'hebrew',
        contextType
      });
      if (binyanResult?.binyan) {
        analysis.binyanAnalysis = binyanResult;
      }

      // Dialect detection (for Aramaic) - contextType helps identify BH vs BA vs JBA
      if (isAramaic) {
        const dialectResult = detectDialect(word, { contextType });
        if (dialectResult?.dialect && dialectResult.dialect !== 'unknown') {
          analysis.dialectAnalysis = dialectResult;
        }
      }

      // V6.1: Historical layer detection - contextType informs expected period
      const historicalResult = getHistoricalLayer(word, { contextType });
      if (historicalResult?.primaryLayer) {
        analysis.historicalLayer = historicalResult;
      }

      // V6.1: Grammatical anomaly check
      const anomalyResult = getGrammaticalAnomaly(word);
      if (anomalyResult?.hasAnomaly) {
        analysis.grammaticalAnomaly = anomalyResult;
      }
    } catch (e) {
      // V6/V6.1 features not available - graceful degradation
      console.debug('[ProScholarPanel] V6.1 analysis error:', e.message);
    }

    return analysis;
  }, [word, root, translationData?.root, isAramaic, contextType]);

  // Check for multi-hypothesis data from PRO SCHOLAR V5
  const allHypotheses = translationData?.allHypotheses;
  const hasHypotheses = allHypotheses?.length > 1;

  // Don't render if no V6 data available
  const hasV6Data = v6Analysis && (
    v6Analysis.semanticField ||
    v6Analysis.rootFamily ||
    v6Analysis.binyanAnalysis ||
    v6Analysis.dialectAnalysis ||
    v6Analysis.historicalLayer ||
    v6Analysis.grammaticalAnomaly ||
    v6Analysis.cognates
  );

  if (!hasV6Data && !hasHypotheses && !showTelemetry) {
    return null;
  }

  return (
    <div className={`pro-scholar-panel ${compact ? 'compact' : ''}`}>
      <div className="panel-header">
        <span className="panel-icon">🎓</span>
        <span className="panel-title">Pro Scholar Analysis</span>
        <span className="panel-version">V6.1</span>
        {showTelemetry && <TelemetryMini />}
      </div>

      <div className="panel-content">
        {/* Semantic Field */}
        {v6Analysis?.semanticField && (
          <SemanticFieldBadge
            field={v6Analysis.semanticField.field}
            fieldName={v6Analysis.semanticField.fieldName}
            relatedConcepts={v6Analysis.semanticField.relatedConcepts}
          />
        )}

        {/* Dialect Marker (Aramaic only) */}
        {v6Analysis?.dialectAnalysis && (
          <DialectMarker
            dialect={v6Analysis.dialectAnalysis.dialect}
            confidence={v6Analysis.dialectAnalysis.confidence}
            markers={v6Analysis.dialectAnalysis.markers}
          />
        )}

        {/* Binyan Analysis */}
        {v6Analysis?.binyanAnalysis && (
          <BinyanAnalysisBadge
            binyan={v6Analysis.binyanAnalysis.binyan}
            binyanInfo={v6Analysis.binyanAnalysis.binyanInfo}
            confidence={v6Analysis.binyanAnalysis.confidence}
            matchedPattern={v6Analysis.binyanAnalysis.matchedPattern}
          />
        )}

        {/* Root Family */}
        {v6Analysis?.rootFamily && (
          <RootFamilyPanel
            root={v6Analysis.rootFamily.root}
            family={v6Analysis.rootFamily.family}
            onWordClick={onWordClick}
          />
        )}

        {/* V6.1: Historical Layer */}
        {v6Analysis?.historicalLayer && (
          <HistoricalLayerBadge
            layer={v6Analysis.historicalLayer.primaryLayer}
            evolution={v6Analysis.historicalLayer.evolution}
            loanwordOrigin={v6Analysis.historicalLayer.loanwordOrigin}
            loanwordDetails={v6Analysis.historicalLayer.loanwordDetails}
          />
        )}

        {/* V6.1: Grammatical Anomaly */}
        {v6Analysis?.grammaticalAnomaly && (
          <GrammaticalAnomalyBadge
            anomaly={v6Analysis.grammaticalAnomaly}
          />
        )}

        {/* V6.1: Cognate Languages */}
        {v6Analysis?.cognates && (
          <CognatePanel
            cognateData={v6Analysis.cognates}
          />
        )}

        {/* PRO SCHOLAR V5: Multi-Hypothesis Ranking */}
        {hasHypotheses && (
          <HypothesisRankingPanel
            hypotheses={allHypotheses}
            onHypothesisClick={onHypothesisSelect}
          />
        )}

        {/* Source Tiers (from translation data) */}
        {translationData?.sources?.length > 0 && !compact && (
          <div className="source-tiers">
            <span className="tiers-label">Sources:</span>
            {translationData.sources.slice(0, 3).map((src, i) => (
              <SourceTierBadge
                key={i}
                source={src.name || src.shortName || 'Unknown'}
                tier={src.tier || 'bronze'}
              />
            ))}
          </div>
        )}

        {/* PRO SCHOLAR V6: Full Telemetry Dashboard (development only) */}
        {showTelemetry && !compact && (
          <details className="telemetry-details">
            <summary className="telemetry-summary">
              <span className="summary-icon">📊</span>
              <span className="summary-text">Performance Dashboard</span>
            </summary>
            <Suspense fallback={<div className="telemetry-loading">Loading telemetry...</div>}>
              <V6TelemetryDashboard
                autoRefresh={true}
                refreshInterval={5000}
                compact={true}
              />
            </Suspense>
          </details>
        )}
      </div>
    </div>
  );
};

ProScholarPanel.propTypes = {
  word: PropTypes.string.isRequired,
  root: PropTypes.string,
  translationData: PropTypes.object,
  isAramaic: PropTypes.bool,
  contextType: PropTypes.string,
  onWordClick: PropTypes.func,
  onHypothesisSelect: PropTypes.func,
  showTelemetry: PropTypes.bool,
  compact: PropTypes.bool,
};

// Export sub-components for standalone use
export {
  SemanticFieldBadge,
  RootFamilyPanel,
  BinyanAnalysisBadge,
  DialectMarker,
  SourceTierBadge,
  TelemetryMini,
  HypothesisRankingPanel,
  // V6.1: New scholarly components
  HistoricalLayerBadge,
  GrammaticalAnomalyBadge,
  CognatePanel,
};

export default React.memo(ProScholarPanel);
