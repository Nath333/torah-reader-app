// PRO SCHOLAR V6 — 1. BINYAN CONFIDENCE SCORING (split 03/10/2026)
import { stripVowels } from '../../../utils/hebrewUtils';

// =============================================================================
// 1. BINYAN CONFIDENCE SCORING
// Scholarly verb pattern analysis with morphological precision
// =============================================================================

/**
 * Complete Binyan definitions with diagnostic patterns
 */
export const BINYAN_ANALYSIS = {
  // Hebrew Binyanim
  QAL: {
    name: 'Qal',
    hebrew: 'קל',
    meaning: 'simple active',
    diagnostics: {
      perfect3ms: /^[א-ת]{3}$/, // CCC
      imperfect3ms: /^י[א-ת]{3}$/, // יCCC
      participle: /^[א-ת]ו[א-ת][א-ת]$/, // CוCC
      infinitive: /^ל[א-ת]{3}$/, // לCCC
    },
    confidence: 85,
    frequency: 'very common'
  },
  NIFAL: {
    name: "Nif'al",
    hebrew: 'נפעל',
    meaning: 'passive/reflexive of Qal',
    diagnostics: {
      perfect3ms: /^נ[א-ת]{3}$/, // נCCC
      imperfect3ms: /^י[א-ת]{3}$/, // יCCC (same as Qal but with dagesh)
      participle: /^נ[א-ת]{3}$/, // נCCC
      infinitive: /^ה[א-ת]{3}$/, // הCCC (infinitive construct)
    },
    prefixMarker: 'נ',
    confidence: 82,
    frequency: 'common'
  },
  PIEL: {
    name: "Pi'el",
    hebrew: 'פיעל',
    meaning: 'intensive active',
    diagnostics: {
      perfect3ms: /^[א-ת][א-ת][א-ת]$/, // CCC with dagesh in middle
      imperfect3ms: /^י[א-ת]{3}$/, // יCCC
      participle: /^מ[א-ת]{3}$/, // מCCC
    },
    middleDagesh: true,
    confidence: 80,
    frequency: 'common'
  },
  PUAL: {
    name: "Pu'al",
    hebrew: 'פועל',
    meaning: 'intensive passive',
    diagnostics: {
      perfect3ms: /^[א-ת]ו[א-ת][א-ת]$/, // CuCC
      participle: /^מ[א-ת]ו[א-ת][א-ת]$/, // מCוCC
    },
    qubbutzMarker: true,
    confidence: 78,
    frequency: 'less common'
  },
  HIFIL: {
    name: "Hif'il",
    hebrew: 'הפעיל',
    meaning: 'causative active',
    diagnostics: {
      perfect3ms: /^ה[א-ת]{4}$/, // הCCCC or הCCיC
      imperfect3ms: /^י[א-ת]{4}$/, // יCCיC
      participle: /^מ[א-ת]{4}$/, // מCCיC
      infinitive: /^לה[א-ת]{3}$/, // להCCC
    },
    prefixMarker: 'ה',
    yodInfix: true,
    confidence: 83,
    frequency: 'common'
  },
  HUFAL: {
    name: "Huf'al",
    hebrew: 'הופעל',
    meaning: 'causative passive',
    diagnostics: {
      perfect3ms: /^הו[א-ת]{3}$/, // הוCCC
      participle: /^מו[א-ת]{3}$/, // מוCCC
    },
    prefixMarker: 'הו',
    confidence: 75,
    frequency: 'rare'
  },
  HITPAEL: {
    name: "Hitpa'el",
    hebrew: 'התפעל',
    meaning: 'reflexive/reciprocal',
    diagnostics: {
      perfect3ms: /^הת[א-ת]{3}$/, // התCCC
      imperfect3ms: /^ית[א-ת]{3}$/, // יתCCC
      participle: /^מת[א-ת]{3}$/, // מתCCC
      infinitive: /^להת[א-ת]{3}$/, // להתCCC
    },
    prefixMarker: 'הת',
    confidence: 85,
    frequency: 'common'
  },

  // Aramaic Binyanim (Talmudic)
  PEAL: {
    name: "Pe'al",
    hebrew: 'פעל',
    meaning: 'Aramaic simple (= Qal)',
    language: 'aramaic',
    diagnostics: {
      perfect3ms: /^[א-ת]{3}$/, // CCC
      participle: /^[א-ת][א-ת]י[א-ת]$/, // CCיC (active)
    },
    confidence: 82,
    frequency: 'very common in Talmud'
  },
  PAEL: {
    name: "Pa'el",
    hebrew: 'פעל',
    meaning: 'Aramaic intensive (= Piel)',
    language: 'aramaic',
    diagnostics: {
      perfect3ms: /^[א-ת]{3}$/, // CCC with dagesh
      participle: /^מ[א-ת]{3}$/, // מCCC
    },
    confidence: 78,
    frequency: 'common in Talmud'
  },
  APHEL: {
    name: "Af'el",
    hebrew: 'אפעל',
    meaning: 'Aramaic causative (= Hifil)',
    language: 'aramaic',
    diagnostics: {
      perfect3ms: /^א[א-ת]{3}$/, // אCCC
      imperfect3ms: /^י[א-ת]{3}$/, // יCCC
      participle: /^מ[א-ת]{3}$/, // מCCC
    },
    prefixMarker: 'א',
    confidence: 80,
    frequency: 'common in Talmud'
  },
  ITHPEEL: {
    name: "Ithpe'el",
    hebrew: 'אתפעל',
    meaning: 'Aramaic reflexive (= Hitpael)',
    language: 'aramaic',
    diagnostics: {
      perfect3ms: /^את[א-ת]{3}$/, // אתCCC
      perfect3msAlt: /^אית[א-ת]{3}$/, // איתCCC
      participle: /^מת[א-ת]{3}$/, // מתCCC
    },
    prefixMarker: 'את',
    confidence: 82,
    frequency: 'common in Talmud'
  },
  ITHPAAL: {
    name: "Ithpa'al",
    hebrew: 'אתפעל',
    meaning: 'Aramaic intensive reflexive',
    language: 'aramaic',
    diagnostics: {
      perfect3ms: /^את[א-ת]{3}$/, // אתCCC
    },
    prefixMarker: 'את',
    confidence: 75,
    frequency: 'less common'
  },
  SHAFEL: {
    name: "Shaf'el",
    hebrew: 'שפעל',
    meaning: 'Aramaic causative (alternative)',
    language: 'aramaic',
    diagnostics: {
      perfect3ms: /^ש[א-ת]{3}$/, // שCCC
    },
    prefixMarker: 'ש',
    confidence: 72,
    frequency: 'rare'
  }
};

/**
 * Analyze a word's binyan with scholarly confidence
 * @param {string} word - Hebrew/Aramaic word
 * @param {Object} options - { language, context }
 * @returns {Object} - { binyan, confidence, analysis, alternatives }
 */
export function analyzeBinyan(word, options = {}) {
  // eslint-disable-next-line no-unused-vars
  const { language = 'unknown', context = null } = options; // context reserved for future use
  const cleaned = stripVowels(word);

  const matches = [];
  const binyanList = language === 'aramaic'
    ? ['PEAL', 'PAEL', 'APHEL', 'ITHPEEL', 'ITHPAAL', 'SHAFEL']
    : ['QAL', 'NIFAL', 'PIEL', 'PUAL', 'HIFIL', 'HUFAL', 'HITPAEL'];

  for (const binyanName of binyanList) {
    const binyan = BINYAN_ANALYSIS[binyanName];
    let matchScore = 0;
    let matchedPattern = null;

    // Check each diagnostic pattern
    for (const [patternName, regex] of Object.entries(binyan.diagnostics || {})) {
      if (regex.test(cleaned)) {
        matchScore += 20;
        matchedPattern = patternName;
      }
    }

    // Check prefix markers
    if (binyan.prefixMarker && cleaned.startsWith(binyan.prefixMarker)) {
      matchScore += 30;
    }

    if (matchScore > 0) {
      matches.push({
        binyan: binyanName,
        binyanInfo: binyan,
        score: matchScore,
        matchedPattern,
        confidence: Math.min(95, binyan.confidence + matchScore / 2)
      });
    }
  }

  // Sort by score
  matches.sort((a, b) => b.score - a.score);

  if (matches.length === 0) {
    return { binyan: null, confidence: 0, analysis: 'No binyan pattern detected' };
  }

  const best = matches[0];
  return {
    binyan: best.binyan,
    binyanInfo: best.binyanInfo,
    confidence: best.confidence,
    matchedPattern: best.matchedPattern,
    analysis: `${best.binyanInfo.name} (${best.binyanInfo.hebrew}): ${best.binyanInfo.meaning}`,
    alternatives: matches.slice(1, 3).map(m => ({
      binyan: m.binyan,
      confidence: m.confidence
    }))
  };
}

