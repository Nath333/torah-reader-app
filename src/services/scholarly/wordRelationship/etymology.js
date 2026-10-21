// =============================================================================
// Chaîne étymologique — couches (proto-sémitique → biblique → mishnaique…)
// construites depuis les données des dictionnaires.
// (extrait de wordRelationshipService.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

// =============================================================================
// ETYMOLOGY CHAIN (Proto-Semitic → Modern)
// =============================================================================

/**
 * Etymology layers in historical order
 */
const ETYMOLOGY_LAYERS = {
  PROTO_SEMITIC: { id: 'proto_semitic', label: 'Proto-Semitic', hebrew: 'פרוטו-שמית', era: -3000, color: '#8b5cf6' },
  AKKADIAN: { id: 'akkadian', label: 'Akkadian', hebrew: 'אכדית', era: -2500, color: '#6366f1' },
  UGARITIC: { id: 'ugaritic', label: 'Ugaritic', hebrew: 'אוגריתית', era: -1400, color: '#3b82f6' },
  PHOENICIAN: { id: 'phoenician', label: 'Phoenician', hebrew: 'פיניקית', era: -1200, color: '#0ea5e9' },
  BIBLICAL_HEBREW: { id: 'biblical_hebrew', label: 'Biblical Hebrew', hebrew: 'עברית מקראית', era: -1000, color: '#14b8a6' },
  BIBLICAL_ARAMAIC: { id: 'biblical_aramaic', label: 'Biblical Aramaic', hebrew: 'ארמית מקראית', era: -600, color: '#22c55e' },
  MISHNAIC_HEBREW: { id: 'mishnaic_hebrew', label: 'Mishnaic Hebrew', hebrew: 'עברית משנאית', era: 200, color: '#84cc16' },
  TALMUDIC_ARAMAIC: { id: 'talmudic_aramaic', label: 'Talmudic Aramaic', hebrew: 'ארמית תלמודית', era: 500, color: '#eab308' },
  MEDIEVAL_HEBREW: { id: 'medieval_hebrew', label: 'Medieval Hebrew', hebrew: 'עברית ימי הביניים', era: 1000, color: '#f97316' },
  MODERN_HEBREW: { id: 'modern_hebrew', label: 'Modern Hebrew', hebrew: 'עברית מודרנית', era: 1900, color: '#ef4444' }
};

/**
 * Build an etymology chain for a word from lookupAllEtymology data
 * Shows the historical development from earliest attestation to modern usage
 *
 * @param {Object} etymologyData - Etymology data from lookupAllEtymology
 * @returns {Object} Etymology chain with layers
 */
export function buildEtymologyChainFromData(etymologyData) {
  const chain = {
    word: etymologyData?.lookupWord || '',
    root: etymologyData?.extractedRoot || '',
    layers: [],
    cognates: {},
    protoSemitic: null,
    hasChain: false
  };

  if (!etymologyData?.hasEtymology) return chain;

  // Extract data from various sources
  const rootPro = etymologyData.rootMeaningsPro;
  const jastrowEty = etymologyData.etymologyJastrow;
  const wiktionary = etymologyData.wiktionary;

  // Check for Proto-Semitic reconstruction
  const protoSemitic =
    rootPro?.etymology?.protoSemitic ||
    wiktionary?.protoSemitic ||
    jastrowEty?.etymology?.protoSemitic;

  if (protoSemitic) {
    chain.protoSemitic = protoSemitic;
    chain.layers.push({
      ...ETYMOLOGY_LAYERS.PROTO_SEMITIC,
      form: protoSemitic.reconstruction || protoSemitic,
      meaning: protoSemitic.meaning || '',
      source: 'Wiktionary/Academic'
    });
  }

  // Collect cognates from all sources
  const allCognates = {};

  const mergeCognates = (cognates, sourceName) => {
    if (!cognates) return;

    Object.entries(cognates).forEach(([lang, data]) => {
      const langLower = lang.toLowerCase();
      if (!allCognates[langLower]) {
        allCognates[langLower] = [];
      }

      // Handle different data formats
      if (Array.isArray(data)) {
        data.forEach(item => {
          const word = typeof item === 'string' ? item : (item.word || item);
          if (word) {
            allCognates[langLower].push({ word, source: sourceName });
          }
        });
      } else if (data.words) {
        data.words.forEach(word => {
          allCognates[langLower].push({ word, source: sourceName });
        });
      } else if (typeof data === 'string') {
        allCognates[langLower].push({ word: data, source: sourceName });
      }
    });
  };

  // Merge cognates from all sources
  mergeCognates(rootPro?.etymology?.cognates, 'Root Meanings Pro');
  mergeCognates(jastrowEty?.etymology?.cognates, 'Jastrow');
  mergeCognates(wiktionary?.cognates, 'Wiktionary');

  chain.cognates = allCognates;

  // Add cognate layers (Akkadian, Phoenician, etc.)
  const cognateLayerMap = {
    akkadian: ETYMOLOGY_LAYERS.AKKADIAN,
    ugaritic: ETYMOLOGY_LAYERS.UGARITIC,
    phoenician: ETYMOLOGY_LAYERS.PHOENICIAN
  };

  Object.entries(cognateLayerMap).forEach(([langKey, layerConfig]) => {
    if (allCognates[langKey]?.length > 0) {
      chain.layers.push({
        ...layerConfig,
        forms: allCognates[langKey],
        cognateCount: allCognates[langKey].length
      });
    }
  });

  // Add Biblical Hebrew layer (primary)
  if (rootPro?.isBiblicalHebrew) {
    chain.layers.push({
      ...ETYMOLOGY_LAYERS.BIBLICAL_HEBREW,
      form: chain.root || chain.word,
      meaning: rootPro?.definition || '',
      source: 'Root Meanings'
    });
  }

  // Add Talmudic/Aramaic layer if applicable
  if (rootPro?.isAramaic || jastrowEty) {
    chain.layers.push({
      ...ETYMOLOGY_LAYERS.TALMUDIC_ARAMAIC,
      form: jastrowEty?.lemma || chain.word,
      meaning: jastrowEty?.definition || '',
      source: 'Jastrow'
    });
  }

  // Sort layers by era
  chain.layers.sort((a, b) => a.era - b.era);
  chain.hasChain = chain.layers.length > 0;

  return chain;
}

