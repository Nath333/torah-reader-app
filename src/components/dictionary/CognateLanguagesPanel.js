/**
 * CognateLanguagesPanel - PRO SCHOLAR V12 Comparative Semitic Display
 *
 * Shows cognate words in related Semitic languages:
 * - Akkadian (Ancient Mesopotamia)
 * - Ugaritic (Ancient Canaan)
 * - Arabic (Modern Semitic)
 * - Ethiopic/Ge'ez (Horn of Africa)
 * - Syriac (Aramaic branch)
 * - Phoenician (Northwest Semitic)
 * - South Arabian (Sabaean)
 * - Moabite (from Mesha Stele)
 *
 * MULTI-SOURCE DATA:
 * - Tier 1: Curated high-quality cognate database (~50 roots)
 * - Tier 2: Extracted BDB etymologies (~2,300 roots)
 * - Tier 3: Enriched root data
 *
 * Based on: BDB, HALOT, Jastrow, CAD, DUL, and comparative Semitic scholarship.
 *
 * @module CognateLanguagesPanel
 */

import React, { memo, useMemo, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { stripVowels } from '../../utils/hebrewUtils';
import './CognateLanguagesPanel.css';

// =============================================================================
// SAFE IMPORTS - Use new comparativeSemiticService
// =============================================================================

let getCognates, getCognatesAsync;
try {
  const comparativeSemitic = require('../../services/comparativeSemiticService');
  getCognates = comparativeSemitic.getCognates;
  getCognatesAsync = comparativeSemitic.getCognatesAsync;
} catch (e) {
  console.debug('[CognateLanguagesPanel] comparativeSemiticService not available:', e.message);
  getCognates = () => null;
  getCognatesAsync = async () => null;
}

// PRO SCHOLAR: Wiktionary fallback for cognates
let fetchWiktionaryEtymology;
try {
  const wiktionaryService = require('../../services/wiktionaryService');
  fetchWiktionaryEtymology = wiktionaryService.fetchWiktionaryEtymology;
} catch (e) {
  console.debug('[CognateLanguagesPanel] wiktionaryService not available:', e.message);
  fetchWiktionaryEtymology = async () => null;
}

// PRO SCHOLAR V12: Comprehensive etymology from ALL databases (78,000+ entries)
let getComprehensiveEtymology;
try {
  const etymologyService = require('../../services/etymologyEnrichmentService');
  getComprehensiveEtymology = etymologyService.getComprehensiveEtymology;
} catch (e) {
  console.debug('[CognateLanguagesPanel] etymologyEnrichmentService not available:', e.message);
  getComprehensiveEtymology = async () => null;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const LANGUAGE_DISPLAY = {
  akkadian: {
    name: 'Akkadian',
    icon: '🏛️',
    description: 'Ancient Mesopotamian',
    script: 'Cuneiform',
    color: '#d97706'
  },
  ugaritic: {
    name: 'Ugaritic',
    icon: '🗿',
    description: 'Ancient Canaanite',
    script: 'Cuneiform',
    color: '#65a30d'
  },
  arabic: {
    name: 'Arabic',
    icon: '🕌',
    description: 'Classical Arabic',
    script: 'Arabic script',
    color: '#059669'
  },
  ethiopic: {
    name: 'Ethiopic',
    icon: '⛪',
    description: "Ge'ez",
    script: 'Fidäl',
    color: '#7c3aed'
  },
  syriac: {
    name: 'Syriac',
    icon: '✝️',
    description: 'Eastern Aramaic',
    script: 'Serto',
    color: '#dc2626'
  },
  phoenician: {
    name: 'Phoenician',
    icon: '⚓',
    description: 'Northwest Semitic',
    script: 'Phoenician alphabet',
    color: '#0284c7'
  },
  aramaic: {
    name: 'Aramaic',
    icon: '📜',
    description: 'Imperial/Official',
    script: 'Square script',
    color: '#6366f1'
  },
  // CAL Aramaic dialects
  babylonianAramaic: {
    name: 'Babylonian Aramaic',
    icon: '📚',
    description: 'JBA (Talmud Bavli)',
    script: 'Square script',
    color: '#4f46e5'
  },
  palestinianAramaic: {
    name: 'Palestinian Aramaic',
    icon: '🏛️',
    description: 'JPA (Yerushalmi)',
    script: 'Square script',
    color: '#7c3aed'
  },
  targumicAramaic: {
    name: 'Targumic',
    icon: '📖',
    description: 'Targum translations',
    script: 'Square script',
    color: '#8b5cf6'
  },
  mandaic: {
    name: 'Mandaic',
    icon: '☀️',
    description: 'Mandaean texts',
    script: 'Mandaic',
    color: '#a855f7'
  },
  moabite: {
    name: 'Moabite',
    icon: '🪨',
    description: 'Mesha Stele',
    script: 'Phoenician-type',
    color: '#78716c'
  },
  southArabian: {
    name: 'South Arabian',
    icon: '🏜️',
    description: 'Sabaean',
    script: 'Old South Arabian',
    color: '#ca8a04'
  },
  sabean: {
    name: 'Sabaean',
    icon: '🏜️',
    description: 'South Arabian',
    script: 'Old South Arabian',
    color: '#ca8a04'
  },
  egyptian: {
    name: 'Egyptian',
    icon: '🔺',
    description: 'Ancient Egyptian',
    script: 'Hieroglyphic',
    color: '#ea580c'
  },
  persian: {
    name: 'Persian',
    icon: '🦁',
    description: 'Old Persian',
    script: 'Cuneiform/Pahlavi',
    color: '#be185d'
  },
  greek: {
    name: 'Greek',
    icon: '🏛️',
    description: 'Ancient Greek',
    script: 'Greek alphabet',
    color: '#1d4ed8'
  }
};

// Source tier display configuration - PRO SCHOLAR multi-source
const SOURCE_TIER_DISPLAY = {
  // Tier 1: Gold (Academic)
  curated: { label: 'Gold', badge: '🥇', color: '#059669', description: 'Hand-verified scholarly data', tier: 1 },
  'Gold (Academic)': { label: 'Gold', badge: '🥇', color: '#059669', description: 'Academic quality data', tier: 1 },
  'Gold (CAL)': { label: 'CAL', badge: '🥇', color: '#0891b2', description: 'CAL Database (HUC)', tier: 1 },
  unified: { label: 'Gold', badge: '🥇', color: '#059669', description: 'Unified PRO database', tier: 1 },

  // Tier 2: Silver (Dictionary)
  'BDB-extracted': { label: 'BDB', badge: '🥈', color: '#0284c7', description: 'BDB Dictionary (1906)', tier: 2 },
  'Jastrow-extracted': { label: 'Jastrow', badge: '🥈', color: '#6366f1', description: 'Jastrow Dictionary', tier: 2 },
  'Silver (BDB)': { label: 'BDB', badge: '🥈', color: '#0284c7', description: 'BDB Dictionary', tier: 2 },
  'Silver (Jastrow)': { label: 'Jastrow', badge: '🥈', color: '#6366f1', description: 'Jastrow Dictionary', tier: 2 },

  // Tier 3: Bronze (Reference)
  enriched: { label: 'Enriched', badge: '🥉', color: '#78716c', description: 'Combined reference sources', tier: 3 },
  'Bronze (Enriched)': { label: 'Ref', badge: '🥉', color: '#78716c', description: 'Reference tier', tier: 3 },
  'Bronze (Wiktionary)': { label: 'Wiki', badge: '📖', color: '#3b82f6', description: 'Wiktionary (community)', tier: 3 },
  'Wiktionary': { label: 'Wiki', badge: '📖', color: '#3b82f6', description: 'Wiktionary etymology', tier: 3 },

  // Fallback
  default: { label: 'Data', badge: '○', color: '#6b7280', description: 'Cognate data', tier: 4 }
};

const FORM_LABELS = {
  verb: 'Verb',
  noun: 'Noun',
  adjective: 'Adjective',
  particle: 'Particle',
  adverb: 'Adverb'
};

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

/**
 * Source tier indicator badge
 */
const SourceTierBadge = memo(function SourceTierBadge({ source, tier, tierName }) {
  // Try to find by source, then tierName, then fallback to default
  const tierInfo = SOURCE_TIER_DISPLAY[source]
    || SOURCE_TIER_DISPLAY[tierName]
    || SOURCE_TIER_DISPLAY.default;

  return (
    <div
      className="clp-source-badge"
      style={{ '--tier-color': tierInfo.color }}
      title={tierInfo.description}
    >
      <span className="clp-source-dot">{tierInfo.badge}</span>
      <span className="clp-source-label">{tierInfo.label}</span>
    </div>
  );
});

/**
 * Single cognate card - clean, minimal design
 */
const CognateCard = memo(function CognateCard({ cognate, languageKey }) {
  const langInfo = LANGUAGE_DISPLAY[languageKey] || {
    name: languageKey,
    icon: '🔤',
    description: '',
    color: '#6b7280'
  };

  const hasNote = cognate.note || cognate.period;

  return (
    <div
      className="clp-cognate-card"
      data-language={languageKey}
      style={{ '--lang-color': langInfo.color }}
    >
      <div className="clp-cognate-header">
        <span className="clp-language-flag">{langInfo.icon}</span>
        <div className="clp-language-info">
          <span className="clp-language-name">{langInfo.name}</span>
          {langInfo.description && (
            <span className="clp-language-desc">{langInfo.description}</span>
          )}
        </div>
      </div>

      <div className="clp-cognate-word">{cognate.word}</div>

      {cognate.meaning && cognate.meaning !== '(cognate)' && cognate.meaning !== '(see BDB)' && (
        <div className="clp-cognate-meaning">"{cognate.meaning}"</div>
      )}

      {hasNote && (
        <div className="clp-cognate-note">
          {cognate.period && <span className="clp-period">{cognate.period}</span>}
          {cognate.note && <span className="clp-note-text">{cognate.note}</span>}
        </div>
      )}

      {cognate.form && (
        <div className="clp-cognate-form">
          {FORM_LABELS[cognate.form] || cognate.form}
        </div>
      )}
    </div>
  );
});

/**
 * Proto-Semitic reconstruction display
 */
const ProtoSemiticBadge = memo(function ProtoSemiticBadge({ form }) {
  if (!form) return null;

  return (
    <div className="clp-proto-semitic">
      <span className="clp-proto-label">Proto-Semitic</span>
      <span className="clp-proto-form">{form}</span>
    </div>
  );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Convert raw cognate data (from service) to display format
 */
const convertToDisplayFormat = (data) => {
  if (!data) return null;

  const cognates = [];

  // Process each language
  if (data.akkadian) {
    cognates.push({
      language: 'akkadian',
      word: data.akkadian.word,
      meaning: data.akkadian.meaning,
      period: data.akkadian.period,
      note: data.akkadian.note
    });
  }

  if (data.ugaritic) {
    cognates.push({
      language: 'ugaritic',
      word: data.ugaritic.word,
      meaning: data.ugaritic.meaning
    });
  }

  if (data.phoenician) {
    cognates.push({
      language: 'phoenician',
      word: data.phoenician.word,
      meaning: data.phoenician.meaning
    });
  }

  // Handle Aramaic (can have sub-dialects from CAL and curated data)
  if (data.aramaic) {
    // Imperial/Official Aramaic
    if (data.aramaic.official) {
      cognates.push({
        language: 'aramaic',
        word: data.aramaic.official.word,
        meaning: data.aramaic.official.meaning
      });
    }
    // Syriac
    if (data.aramaic.syriac) {
      cognates.push({
        language: 'syriac',
        word: data.aramaic.syriac.word,
        meaning: data.aramaic.syriac.meaning
      });
    }
    // Jewish Babylonian Aramaic (from CAL)
    if (data.aramaic.babylonian) {
      cognates.push({
        language: 'babylonianAramaic',
        word: data.aramaic.babylonian.word,
        meaning: data.aramaic.babylonian.meaning,
        period: 'Talmudic'
      });
    }
    // Jewish Palestinian Aramaic (from CAL)
    if (data.aramaic.palestinian) {
      cognates.push({
        language: 'palestinianAramaic',
        word: data.aramaic.palestinian.word,
        meaning: data.aramaic.palestinian.meaning,
        period: 'Talmudic'
      });
    }
    // Targumic Aramaic (from CAL)
    if (data.aramaic.targumic) {
      cognates.push({
        language: 'targumicAramaic',
        word: data.aramaic.targumic.word,
        meaning: data.aramaic.targumic.meaning
      });
    }
    // Mandaic (from CAL)
    if (data.aramaic.mandaic) {
      cognates.push({
        language: 'mandaic',
        word: data.aramaic.mandaic.word,
        meaning: data.aramaic.mandaic.meaning
      });
    }
  }

  if (data.arabic) {
    cognates.push({
      language: 'arabic',
      word: data.arabic.word,
      meaning: data.arabic.meaning,
      note: data.arabic.note
    });
  }

  if (data.ethiopic) {
    cognates.push({
      language: 'ethiopic',
      word: data.ethiopic.word,
      meaning: data.ethiopic.meaning
    });
  }

  if (data.southArabian || data.sabean) {
    const sa = data.southArabian || data.sabean;
    cognates.push({
      language: 'southArabian',
      word: sa.word,
      meaning: sa.meaning
    });
  }

  if (data.moabite) {
    cognates.push({
      language: 'moabite',
      word: data.moabite.word,
      meaning: data.moabite.meaning
    });
  }

  if (data.egyptian) {
    cognates.push({
      language: 'egyptian',
      word: data.egyptian.word,
      meaning: data.egyptian.meaning,
      note: data.egyptian.note
    });
  }

  if (data.persian) {
    cognates.push({
      language: 'persian',
      word: data.persian.word,
      meaning: data.persian.meaning
    });
  }

  return {
    cognates,
    protoSemitic: data.protoSemitic,
    meaning: data.meaning || data.coreMeaning,
    note: data.scholarlyNotes,
    semanticDevelopment: data.semanticDevelopment,
    source: data.source,
    tier: data.tier,
    tierName: data.tierName,
    isTheologicallySignificant: data.isTheologicallySignificant,
    isAramaic: data.isAramaic,
    hasCognates: cognates.length > 0
  };
};

/**
 * PRO SCHOLAR V12: Convert comprehensive etymology data to display format
 * Used as second-tier fallback when curated data unavailable
 * Sources: Sefaria (2,493), Root Pro (18,898), BDB (2,591), Jastrow (16,794), Wiktionary (168+)
 */
const convertComprehensiveToDisplayFormat = (etyData) => {
  if (!etyData) return null;

  const cognates = [];

  // PRO SCHOLAR V12: getComprehensiveEtymology returns cognates nested under etymology
  const cognateSource = etyData.etymology?.cognates || etyData.cognates;
  const protoSemiticSource = etyData.etymology?.protoSemitic || etyData.protoSemitic;

  // Process cognates from comprehensive etymology
  if (cognateSource && typeof cognateSource === 'object') {
    for (const [lang, data] of Object.entries(cognateSource)) {
      if (data) {
        // Handle format {words: [...], displayName: '...', count: N}
        if (data.words && Array.isArray(data.words)) {
          cognates.push({
            language: lang,
            word: data.words.join(', '),
            meaning: '',
            note: data.displayName || ''
          });
        }
        // Handle object format {word, meaning}
        else if (typeof data === 'object' && !Array.isArray(data)) {
          cognates.push({
            language: lang,
            word: data.word || data.form || String(data),
            meaning: data.meaning || data.translation || '',
            note: data.note || data.period || ''
          });
        } else if (Array.isArray(data) && data.length > 0) {
          cognates.push({
            language: lang,
            word: data[0],
            meaning: data.slice(1).join(', ') || ''
          });
        } else if (typeof data === 'string') {
          cognates.push({
            language: lang,
            word: data,
            meaning: ''
          });
        }
      }
    }
  }

  // Determine best source label from available data
  const sourceLabels = etyData.sources || [];

  const sourceName = sourceLabels.join(', ') || 'Comprehensive';

  // PRO SCHOLAR V12: Show extracted root info if root fallback was used
  const rootInfo = etyData.usedRootFallback && etyData.extractedRoot
    ? ` (via root ${etyData.extractedRoot})`
    : '';

  return {
    cognates,
    protoSemitic: protoSemiticSource,
    meaning: etyData.meaning || etyData.definition || etyData.coreMeaning,
    note: `Multi-source: ${sourceName}${rootInfo}`,
    source: 'comprehensive',
    tier: 2,
    tierName: sourceLabels.length > 0 ? `Gold (${sourceLabels[0]})` : 'Silver (Multi-DB)',
    isAramaic: etyData.isAramaic,
    dialects: etyData.dialects,
    hasCognates: cognates.length > 0 || !!protoSemiticSource,
    qualityScore: etyData.qualityScore || 0,
    extractedRoot: etyData.extractedRoot,
    usedRootFallback: etyData.usedRootFallback
  };
};

/**
 * PRO SCHOLAR: Convert Wiktionary etymology data to display format
 * Used as third-tier fallback when curated and BDB data unavailable
 */
const convertWiktionaryToDisplayFormat = (wikiData) => {
  if (!wikiData) return null;

  const cognates = [];

  // Convert Wiktionary cognates format to our standard format
  if (wikiData.cognates) {
    for (const [lang, words] of Object.entries(wikiData.cognates)) {
      if (Array.isArray(words) && words.length > 0) {
        cognates.push({
          language: lang,
          word: words[0],
          meaning: words.length > 1 ? `(${words.slice(1).join(', ')})` : ''
        });
      }
    }
  }

  return {
    cognates,
    protoSemitic: wikiData.protoSemitic,
    meaning: wikiData.etymologyText?.substring(0, 100),
    note: 'Data from Wiktionary (community source)',
    source: 'Wiktionary',
    tier: 3,
    tierName: 'Bronze (Wiktionary)',
    hasCognates: cognates.length > 0 || !!wikiData.protoSemitic
  };
};

/**
 * CognateLanguagesPanel - Comparative Semitic cognates display
 *
 * @param {Object} props
 * @param {string} props.root - Root to look up cognates for (3-letter Hebrew root)
 * @param {boolean} [props.compact=false] - Use compact layout
 * @param {boolean} [props.showNote=true] - Show scholarly note
 * @param {boolean} [props.showProtoSemitic=true] - Show Proto-Semitic reconstruction
 * @param {boolean} [props.showSource=true] - Show data source badge
 * @param {boolean} [props.dark=false] - Use dark mode
 * @param {string} [props.className=''] - Additional CSS classes
 */
function CognateLanguagesPanel({
  root,
  compact = false,
  showNote = true,
  showProtoSemitic = true,
  showSource = true,
  dark = false,
  className = ''
}) {
  // State for async cognate data
  const [cognateData, setCognateData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Clean the root and extract 3-letter shoresh if needed
  // PRO SCHOLAR V13: Smart root extraction for derived words like יציאות → יצא
  const cleanedRoot = useMemo(() => {
    if (!root) return null;
    // Remove nikud first
    const stripped = stripVowels(root);
    // If already 3 letters, return as-is
    if (stripped.length === 3) return stripped;
    // Try to extract 3-letter root from common noun patterns
    // יציאות → יצא (remove -ות plural and -י- infix)
    // מלאכות → מלאכ? (this is trickier, מלך root)
    // Common patterns: remove suffixes first, then check for known patterns
    const withoutSuffix = stripped
      .replace(/ות$/, '')   // plural feminine -ות
      .replace(/ים$/, '')   // plural masculine -ים
      .replace(/ה$/, '')    // feminine -ה
      .replace(/ן$/, '')    // final nun
      .replace(/ת$/, '');   // feminine/construct -ת
    // For יציאות: stripped = יציאות → יציא → check if יצא pattern
    // Pattern: word with yod-infix (יְצִיאָה pattern) extracts to consonants
    if (withoutSuffix.length >= 3) {
      // PRO SCHOLAR V12: Fixed regex for יְפִיעָה type pattern (action noun from ayin-yod verb)
      // יציא = י-צ-י-א → extract יצא (remove 3rd letter yod which is the infix)
      // Pattern: consonant + consonant + yod + consonant (4 letters with yod at position 2)
      const yodInfixPattern = withoutSuffix.match(/^([א-ת])([א-ת])י([א-ת])$/);
      if (yodInfixPattern) {
        return yodInfixPattern[1] + yodInfixPattern[2] + yodInfixPattern[3];
      }
      // If 3 consonants remain, use them
      if (withoutSuffix.length === 3) return withoutSuffix;
      // For longer forms, try taking first + middle + last consonant
      if (withoutSuffix.length === 4) {
        // Could be a 4-letter root or derived form
        // Try common 4→3 patterns (removing prefix מ, ת, etc.)
        if (/^[מתנה]/.test(withoutSuffix)) {
          return withoutSuffix.slice(1);
        }
      }
    }
    // Fall back to original stripped form
    return stripped;
  }, [root]);

  // Load cognates (sync first, then async for better coverage)
  // PRO SCHOLAR V12: Multi-tier fallback: Curated → Async → Comprehensive (78K) → Wiktionary
  useEffect(() => {
    if (!cleanedRoot) {
      setCognateData(null);
      return;
    }

    // Tier 1: Try sync first (curated data - instant, highest quality)
    const syncResult = getCognates(cleanedRoot);
    if (syncResult) {
      setCognateData(convertToDisplayFormat(syncResult));
      return;
    }

    // Fall back to async sources (Tier 2-4)
    setLoading(true);
    getCognatesAsync(cleanedRoot)
      .then(async (result) => {
        // Tier 2a: Async curated/BDB extracted data
        if (result) {
          setCognateData(convertToDisplayFormat(result));
          return;
        }

        // Tier 2b: PRO SCHOLAR V12 - Comprehensive etymology (ALL databases: 78,000+ entries)
        // Now with SMART root extraction - inflected forms like יציאות auto-resolve to root יצא
        try {
          const comprehensiveData = await getComprehensiveEtymology(cleanedRoot);
          // Check hasEtymology flag or nested etymology data
          if (comprehensiveData?.hasEtymology || comprehensiveData?.etymology?.cognates || comprehensiveData?.etymology?.protoSemitic) {
            const comprehensiveCognates = convertComprehensiveToDisplayFormat(comprehensiveData);
            if (comprehensiveCognates?.hasCognates) {
              setCognateData(comprehensiveCognates);
              return;
            }
          }
        } catch (compErr) {
          console.debug('[CognateLanguagesPanel] Comprehensive fallback failed:', compErr.message);
        }

        // Tier 3: Wiktionary fallback (community source, Proto-Semitic focus)
        try {
          const wiktionaryData = await fetchWiktionaryEtymology(cleanedRoot);
          if (wiktionaryData && (wiktionaryData.cognates || wiktionaryData.protoSemitic)) {
            const wikiCognates = convertWiktionaryToDisplayFormat(wiktionaryData);
            if (wikiCognates?.hasCognates) {
              setCognateData(wikiCognates);
              return;
            }
          }
        } catch (wikiErr) {
          console.debug('[CognateLanguagesPanel] Wiktionary fallback failed:', wikiErr.message);
        }

        setCognateData(null);
      })
      .catch(err => {
        console.debug('[CognateLanguagesPanel] Async lookup failed:', err.message);
        setCognateData(null);
      })
      .finally(() => setLoading(false));
  }, [cleanedRoot]);

  // Panel class names
  const panelClassName = useMemo(
    () => `cognate-languages-panel ${compact ? 'compact' : ''} ${dark ? 'dark' : ''} ${className}`.trim(),
    [compact, dark, className]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  // Loading state
  if (loading) {
    return (
      <div className={panelClassName}>
        <div className="clp-loading">
          <span className="clp-loading-spinner"></span>
          <span>Loading cognates...</span>
        </div>
      </div>
    );
  }

  // No data state
  if (!cognateData?.hasCognates) {
    return (
      <div className={panelClassName}>
        <div className="clp-no-data">
          <div className="clp-no-data-icon">🌍</div>
          <div className="clp-no-data-text">
            No cognate data for: <span dir="rtl">{root || '(none)'}</span>
          </div>
        </div>
      </div>
    );
  }

  const { cognates = [], meaning, note, protoSemitic, source, tier, tierName, isTheologicallySignificant, isAramaic } = cognateData;

  return (
    <div className={panelClassName}>
      {/* Header with source badge */}
      <div className="clp-header">
        <div className="clp-title">
          <span className="clp-icon">🌍</span>
          <span className="clp-title-text">Comparative Semitic</span>
          {isTheologicallySignificant && (
            <span className="clp-theological-badge" title="Theologically significant term">✡️</span>
          )}
          {isAramaic && (
            <span className="clp-theological-badge" title="Aramaic term">📜</span>
          )}
        </div>
        <div className="clp-header-right">
          {showSource && (source || tierName) && (
            <SourceTierBadge source={source} tier={tier} tierName={tierName} />
          )}
          <span className="clp-root-badge" dir="rtl">{root}</span>
        </div>
      </div>

      {/* Proto-Semitic reconstruction */}
      {showProtoSemitic && protoSemitic && (
        <ProtoSemiticBadge form={protoSemitic} />
      )}

      {/* Root Meaning */}
      {meaning && (
        <div className="clp-meaning">
          <div className="clp-meaning-label">Core Semantic</div>
          <div className="clp-meaning-text">{meaning}</div>
        </div>
      )}

      {/* Cognates Grid */}
      {cognates.length > 0 && (
        <div className="clp-cognates-grid">
          {cognates.map((cognate, idx) => (
            <CognateCard
              key={`${cognate.language}-${idx}`}
              cognate={cognate}
              languageKey={cognate.language}
            />
          ))}
        </div>
      )}

      {/* Language count summary */}
      <div className="clp-summary">
        <span className="clp-count">{cognates.length} language{cognates.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Scholarly Note */}
      {showNote && note && (
        <div className="clp-scholarly-note">
          <div className="clp-note-label">
            <span>📖</span>
            <span>Scholarly Note</span>
          </div>
          <div className="clp-note-content">{note}</div>
        </div>
      )}
    </div>
  );
}

CognateLanguagesPanel.propTypes = {
  root: PropTypes.string.isRequired,
  compact: PropTypes.bool,
  showNote: PropTypes.bool,
  showProtoSemitic: PropTypes.bool,
  showSource: PropTypes.bool,
  dark: PropTypes.bool,
  className: PropTypes.string
};

// Named exports for direct access
export { SourceTierBadge, CognateCard, ProtoSemiticBadge };

export default memo(CognateLanguagesPanel);
