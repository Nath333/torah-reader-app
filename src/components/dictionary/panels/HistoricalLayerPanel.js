/**
 * HistoricalLayerPanel Historical Analysis Display
 *
 * Shows the historical period and semantic evolution of Hebrew/Aramaic words:
 * - Historical layer (Biblical, Mishnaic, Amoraic, etc.)
 * - Period characteristics
 * - Semantic evolution timeline
 *
 * Enhanced with dictionary-based fallback
 * When curated data isn't available, extracts historical information from BDB/Jastrow
 *
 * @module HistoricalLayerPanel
 */

import React, { memo, useMemo, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { stripVowels } from '../../../utils/hebrewUtils';
import './HistoricalLayerPanel.css';

// =============================================================================
// SAFE IMPORTS
// =============================================================================

// Renamed from proScholarV6 to linguisticAnalysis
let HISTORICAL_LAYERS, HISTORICAL_EVOLUTION, detectHistoricalLayer;
try {
  const linguisticAnalysis = require('../../../services/analysis/linguisticAnalysis');
  HISTORICAL_LAYERS = linguisticAnalysis.HISTORICAL_LAYERS;
  HISTORICAL_EVOLUTION = linguisticAnalysis.HISTORICAL_EVOLUTION;
  detectHistoricalLayer = linguisticAnalysis.detectHistoricalLayer;
} catch (e) {
  console.debug('[HistoricalLayerPanel] linguisticAnalysis not available:', e.message);
  HISTORICAL_LAYERS = {};
  HISTORICAL_EVOLUTION = {};
  detectHistoricalLayer = () => null;
}

// Dictionary imports for fallback
let lookupBDBByWord, lookupJastrowByWord;
try {
  const dictionaryLoader = require('../../../services/dictionaries/dictionaryLoader');
  lookupBDBByWord = dictionaryLoader.lookupBDBByWord;
  lookupJastrowByWord = dictionaryLoader.lookupJastrowByWord;
} catch (e) {
  console.debug('[HistoricalLayerPanel] dictionaryLoader not available:', e.message);
  lookupBDBByWord = () => Promise.resolve(null);
  lookupJastrowByWord = () => Promise.resolve(null);
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
// DICTIONARY-BASED HISTORICAL LAYER EXTRACTION
// =============================================================================

/**
 * Patterns to detect historical periods in dictionary definitions
 */
const PERIOD_DETECTION_PATTERNS = {
  biblical: [
    /\bBH\b/i,                        // Biblical Hebrew
    /\bbiblical\b/i,
    /\bOT\b/,                         // Old Testament
    /\b(?:Gen|Exod|Lev|Num|Deut|Josh|Judg|Ruth|1?\s?Sam|2?\s?Sam|1?\s?Kin|2?\s?Kin|Isa|Jer|Ezek|Hos|Joel|Amos|Obad|Jon|Mic|Nah|Hab|Zeph|Hag|Zech|Mal|Psa|Prov|Job|Song|Eccl|Lam|Esth|Dan|Ezra|Neh|1?\s?Chr|2?\s?Chr)\b\.?\s*\d/i,
    /\bPentateuch\b/i,
    /\bTorah\b/i,
    /\bProphets\b/i,
    /\bWritings\b/i,
  ],
  latebiblical: [
    /\bLBH\b/i,                       // Late Biblical Hebrew
    /\blate\s?biblical\b/i,
    /\bpost-exilic\b/i,
    /\bSecond\s?Temple\b/i,
    /\b(?:Ezra|Neh|Dan|1?\s?Chr|2?\s?Chr|Esth)\b/i,
    /\bQumran\b/i,
    /\bDead\s?Sea\b/i,
  ],
  mishnaic: [
    /\bMH\b/i,                        // Mishnaic Hebrew
    /\bMishna(?:ic|h)?\b/i,
    /\bTannaitic\b/i,
    /\bRabbinic\b/i,
    /\bTosefta\b/i,
    /\bM\.\s*[A-Z]/,                  // e.g., M. Shabbat
    /\bBaraita\b/i,
  ],
  talmudic: [
    /\bTalmud(?:ic)?\b/i,
    /\bGemara\b/i,
    /\bBabylonian\b/i,
    /\bPalestinian\b/i,
    /\bYerushalmi\b/i,
    /\bBavli\b/i,
    /\b[YB]\.\s*[A-Z]/,               // e.g., Y. Berakhot, B. Shabbat
    /\bSanh\.\b/i,
    /\bShab\.\b/i,
    /\bBer\.\b/i,
  ],
  amoraic: [
    /\bAmora(?:ic)?\b/i,
    /\bGemara\b/i,                    // Overlaps with talmudic
    /\b(?:Rav|R\.)\s+[A-Z]/,          // Rabbi citations
  ],
  aramaic: [
    /\bAramaic\b/i,
    /\bTargum(?:ic)?\b/i,
    /\bSyriac\b/i,
    /\bch(?:aldee)?\b/i,
    /\bJBA\b/,                        // Jewish Babylonian Aramaic
    /\bJPA\b/,                        // Jewish Palestinian Aramaic
  ]
};

/**
 * Extract historical layer information from a BDB/Jastrow definition
 * @param {string} definition - The definition text
 * @param {string} fullDef - The full definition text (BDB only)
 * @returns {Object|null} Historical layer data
 */
const extractHistoricalLayerFromDefinition = (definition, fullDef) => {
  const text = (fullDef || definition || '').toString();
  if (!text || text.length < 10) return null;

  const detectedPeriods = [];
  const attestations = [];

  // Check each period's patterns
  for (const [period, patterns] of Object.entries(PERIOD_DETECTION_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        if (!detectedPeriods.includes(period)) {
          detectedPeriods.push(period);
        }
        // Extract the matched context
        const match = text.match(pattern);
        if (match && match[0]) {
          attestations.push({ period, reference: match[0].trim() });
        }
        break; // Found one match for this period, move on
      }
    }
  }

  if (detectedPeriods.length === 0) return null;

  // Determine primary period (earliest attested)
  const primaryPeriod = PERIOD_ORDER.find(p => detectedPeriods.includes(p))
    || detectedPeriods[0];

  // Build evolution data from attestations
  const evolution = {};
  for (const period of PERIOD_ORDER) {
    if (detectedPeriods.includes(period)) {
      const periodAttestations = attestations.filter(a => a.period === period);
      evolution[period] = {
        meaning: '(attested)',
        context: periodAttestations.map(a => a.reference).join(', ')
      };
    }
  }

  return {
    primaryPeriod,
    detectedPeriods,
    attestations,
    evolution: Object.keys(evolution).length > 0 ? evolution : null,
    source: 'dictionary'
  };
};

/**
 * Check if a word is primarily Aramaic based on dictionary data
 */
const checkAramaicStatus = (bdbEntry, jastrowEntry) => {
  // Jastrow entries with isAramaic flag
  if (jastrowEntry?.isAramaic) return true;

  // BDB entries often mark Aramaic with "Aramaic" or "aram."
  const bdbDef = bdbEntry?.definition || bdbEntry?.fullDef || '';
  if (/\bAramaic\b/i.test(bdbDef) || /\bch\.\b/i.test(bdbDef)) return true;

  return false;
};

// =============================================================================
// SEMANTIC-BASED PERIOD INFERENCE
// =============================================================================

/**
 * Map semantic fields to likely historical periods
 * Based on when certain semantic domains became prominent
 */
const SEMANTIC_TO_PERIOD = {
  // Biblical-era semantics
  religious: 'biblical',
  kinship: 'biblical',
  nature: 'biblical',
  animal: 'biblical',
  agriculture: 'biblical',
  warfare: 'biblical',

  // Could be any period
  body: 'biblical',
  emotion: 'biblical',
  motion: 'biblical',
  speech: 'biblical',
  time: 'biblical',

  // More likely Mishnaic/Talmudic
  legal: 'mishnaic',
  social: 'mishnaic',
  commerce: 'mishnaic',
  work: 'mishnaic',

  // Generic - default to biblical for Hebrew
  building: 'biblical',
  food: 'biblical',
  clothing: 'biblical',
  location: 'biblical',
  cognition: 'biblical',
};

/**
 * Infer historical period from semantic field
 * Uses enriched dictionary semanticField data
 */
const inferPeriodFromSemantic = (semanticField, isAramaic) => {
  if (!semanticField) return null;

  const field = semanticField.toLowerCase();

  // Aramaic words default to talmudic period
  if (isAramaic) {
    return 'talmudic';
  }

  return SEMANTIC_TO_PERIOD[field] || 'biblical';
};

/**
 * Helper to extract root from derived words
 */
const extractRootFromWord = (w) => {
  if (!w || w.length < 3) return null;
  if (w.length === 3) return w;

  // Try פְּעִילוֹת pattern: יציאות → יצא
  if (w.length >= 5 && w.endsWith('ות')) {
    const stem = w.slice(0, -2);
    if (stem.length === 4 && stem[2] === 'י') {
      return stem[0] + stem[1] + stem[3];
    }
    if (stem.length === 3) return stem;
  }
  // Try פְּעִילָה pattern: יציאה → יצא
  if (w.length >= 4 && w.endsWith('ה')) {
    const stem = w.slice(0, -1);
    if (stem.length === 4 && stem[2] === 'י') {
      return stem[0] + stem[1] + stem[3];
    }
    if (stem.length === 3) return stem;
  }
  // Try construct: יציאת → יצא
  if (w.length >= 4 && w.endsWith('ת') && !w.endsWith('ות')) {
    const stem = w.slice(0, -1);
    if (stem.length === 4 && stem[2] === 'י') {
      return stem[0] + stem[1] + stem[3];
    }
    if (stem.length === 3) return stem;
  }
  // Try masc plural: מלכים → מלך
  if (w.length >= 4 && w.endsWith('ים')) {
    const stem = w.slice(0, -2);
    if (stem.length === 3) return stem;
  }
  return null;
};

/**
 * Async function to load dictionary fallback data
 */
const loadDictionaryFallback = async (word, root) => {
  if (!lookupBDBByWord || !lookupJastrowByWord) return null;

  const normalized = stripVowels(root || word || '');
  if (!normalized) return null;

  try {
    let [bdbEntry, jastrowEntry] = await Promise.all([
      lookupBDBByWord(normalized),
      lookupJastrowByWord(normalized)
    ]);

// If no results, try extracting root from the word
    if (!bdbEntry && !jastrowEntry && normalized.length > 3) {
      const extractedRoot = extractRootFromWord(normalized);
      if (extractedRoot && extractedRoot !== normalized) {
        [bdbEntry, jastrowEntry] = await Promise.all([
          lookupBDBByWord(extractedRoot),
          lookupJastrowByWord(extractedRoot)
        ]);
      }
    }

    if (!bdbEntry && !jastrowEntry) return null;

    // Extract historical info from BDB (has more detailed citations)
    const bdbHistorical = bdbEntry
      ? extractHistoricalLayerFromDefinition(bdbEntry.definition, bdbEntry.fullDef)
      : null;

    // Extract from Jastrow (good for Mishnaic/Talmudic)
    const jastrowHistorical = jastrowEntry
      ? extractHistoricalLayerFromDefinition(jastrowEntry.definition, null)
      : null;

    // Combine results
    const isAramaic = checkAramaicStatus(bdbEntry, jastrowEntry);

    // Merge detected periods
    const allPeriods = new Set([
      ...(bdbHistorical?.detectedPeriods || []),
      ...(jastrowHistorical?.detectedPeriods || [])
    ]);

// Use semantic field for period inference when no explicit periods found
    const semanticField = bdbEntry?.semanticField || jastrowEntry?.semanticField;

    // If Aramaic and no specific period detected, default to talmudic
    if (isAramaic && allPeriods.size === 0) {
      allPeriods.add('talmudic');
    }
    // If has semantic field but no explicit period, infer from semantic
    else if (semanticField && allPeriods.size === 0) {
      const inferredPeriod = inferPeriodFromSemantic(semanticField, isAramaic);
      if (inferredPeriod) {
        allPeriods.add(inferredPeriod);
      }
    }

    // Even without period data, we can show semantic info
    const hasUsefulData = allPeriods.size > 0 || semanticField;

    // Return null only if we truly have no useful data
    if (!hasUsefulData) return null;

    const primaryPeriod = PERIOD_ORDER.find(p => allPeriods.has(p))
      || Array.from(allPeriods)[0];

    // Build combined evolution
    const evolution = {};
    const mergedEvolution = {
      ...(bdbHistorical?.evolution || {}),
      ...(jastrowHistorical?.evolution || {})
    };

    for (const period of PERIOD_ORDER) {
      if (mergedEvolution[period]) {
        evolution[period] = mergedEvolution[period];
      } else if (allPeriods.has(period)) {
        evolution[period] = {
          meaning: isAramaic ? '(Aramaic attested)' : '(attested)',
          context: ''
        };
      }
    }

    // Get brief definition for display
    const briefMeaning = (bdbEntry?.definition || jastrowEntry?.definition || '')
      .split(/[;,.]/)[0]
      .trim()
      .slice(0, 50);

// Build characteristics from semantic field
    const characteristics = [];
    if (isAramaic) characteristics.push('Aramaic term');
    if (semanticField) {
      const formattedField = semanticField.charAt(0).toUpperCase() + semanticField.slice(1);
      characteristics.push(`${formattedField} vocabulary`);
    }

    return {
      primaryPeriod,
      primaryLayer: HISTORICAL_LAYERS?.[primaryPeriod] || {
        name: PERIOD_LABELS[primaryPeriod] || primaryPeriod || 'Hebrew',
        hebrew: '',
        period: PERIOD_LABELS[primaryPeriod] || primaryPeriod || '',
        characteristics
      },
      evolution: Object.keys(evolution).length > 0 ? evolution : null,
      isAramaic,
      semanticField, // Include for display
      briefMeaning,
      source: 'dictionary',
      hasData: true
    };
  } catch (err) {
    console.debug('[HistoricalLayerPanel] Dictionary fallback failed:', err.message);
    return null;
  }
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
 * Enhanced with dictionary-based fallback
 * When curated data isn't available, extracts historical information from BDB/Jastrow
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
// State for dictionary fallback data
  const [fallbackData, setFallbackData] = useState(null);
  const [isLoadingFallback, setIsLoadingFallback] = useState(false);

  // Analyze historical layer (curated data first)
  const curatedAnalysis = useMemo(() => {
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
// Smart root extraction for derived words like יציאות → יצא
    let wordToLookup = root || stripVowels(word || '');
    let extractedRootCandidate = null;

    // If the lookup word is not found in evolution data, try to extract root
    if (wordToLookup && wordToLookup.length > 3 && !HISTORICAL_EVOLUTION?.[wordToLookup]) {
      extractedRootCandidate = extractRootFromWord(wordToLookup);
      if (extractedRootCandidate && HISTORICAL_EVOLUTION?.[extractedRootCandidate]) {
        wordToLookup = extractedRootCandidate;
      } else if (extractedRootCandidate && extractedRootCandidate.length === 3) {
        // Use the extracted root even if not in evolution data (for fallback lookup)
        wordToLookup = extractedRootCandidate;
      }
    }

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
      extractedRoot: extractedRootCandidate,
      primaryLayerKey,
      primaryLayer,
      evolution,
      hasData: !!(primaryLayer || evolution),
      source: 'curated'
    };
  }, [word, root]);

// Load dictionary fallback if curated data not available
  useEffect(() => {
    // Only load fallback if curated data is not available
    if (curatedAnalysis?.hasData) {
      setFallbackData(null);
      return;
    }

// Use extracted root from curated analysis if available
    const lookupRoot = curatedAnalysis?.extractedRoot || root;
    const lookupWord = lookupRoot || word;
    if (!lookupWord) return;

    let cancelled = false;
    setIsLoadingFallback(true);

    loadDictionaryFallback(word, lookupRoot || root)
      .then(data => {
        if (!cancelled) setFallbackData(data);
      })
      .catch(err => {
        if (!cancelled) {
          console.debug('[HistoricalLayerPanel] Fallback error:', err.message);
          setFallbackData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingFallback(false);
      });

    return () => { cancelled = true; };
  }, [word, root, curatedAnalysis?.hasData, curatedAnalysis?.extractedRoot]);

  // Use curated data if available, otherwise fallback
  const analysis = useMemo(() => {
    if (curatedAnalysis?.hasData) return curatedAnalysis;
    if (fallbackData?.hasData) return fallbackData;
    return curatedAnalysis; // Return even without data for consistent structure
  }, [curatedAnalysis, fallbackData]);

  // Panel class names
  const panelClassName = useMemo(
    () => `historical-layer-panel ${compact ? 'compact' : ''} ${dark ? 'dark' : ''} ${className}`.trim(),
    [compact, dark, className]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  // Show loading state while fetching fallback
  if (isLoadingFallback && !curatedAnalysis?.hasData) {
    return (
      <div className={panelClassName}>
        <div className="hlp-loading">
          <span className="hlp-loading-icon">⏳</span>
          <span>Loading historical data...</span>
        </div>
      </div>
    );
  }

  if (!analysis?.hasData) {
    return (
      <div className={panelClassName}>
        <div className="hlp-no-data">
          <div className="hlp-no-data-icon">📜</div>
          <div className="hlp-no-data-text">
            // No historical data available for this word
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
          {analysis.source === 'dictionary' && (
            <span className="hlp-source-badge" title="Data extracted from BDB/Jastrow">
              📖
            </span>
          )}
        </div>
        {(analysis.primaryLayerKey || analysis.primaryPeriod) && (
          <span className="hlp-period-badge">
            {PERIOD_ICONS[analysis.primaryLayerKey || analysis.primaryPeriod]}{' '}
            {PERIOD_LABELS[analysis.primaryLayerKey || analysis.primaryPeriod]}
            {analysis.isAramaic && <span className="hlp-aramaic-badge">ארמית</span>}
          </span>
        )}
      </div>

      {/* Layer Info */}
      {analysis.primaryLayer && (
        <LayerInfoCard layer={analysis.primaryLayer} />
      )}

      {/* Brief meaning from dictionary (if from fallback) */}
      {analysis.source === 'dictionary' && analysis.briefMeaning && (
        <div className="hlp-brief-meaning">
          <span className="hlp-meaning-label">Meaning:</span>
          <span className="hlp-meaning-text">{analysis.briefMeaning}</span>
        </div>
      )}

      {/* Semantic field display */}
      {analysis.semanticField && (
        <div className="hlp-semantic-field">
          <span className="hlp-semantic-label">📊 Semantic Domain:</span>
          <span className="hlp-semantic-value">
            {analysis.semanticField.charAt(0).toUpperCase() + analysis.semanticField.slice(1)}
          </span>
        </div>
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
