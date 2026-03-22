/**
 * Root Forms Service
 * Generates and retrieves all derived forms from a Hebrew/Aramaic root
 *
 * Features:
 * - Generates verb conjugations across all binyanim/tenses
 * - Identifies common noun forms derived from roots
 * - Cross-references with dictionary data for attested forms
 * - Provides frequency data where available
 */

import { BINYANIM, ARAMAIC_BINYANIM } from '../constants/morphology/verbPatterns';

// Try to import root database
let ROOT_MEANINGS = {};
try {
  ROOT_MEANINGS = require('../data/rootDatabase').ROOT_MEANINGS;
} catch (e) {
  // Root database not available
}

// Try to import frequency service
let getWordFrequency;
try {
  getWordFrequency = require('./wordFrequencyService').getWordFrequency;
} catch (e) {
  getWordFrequency = () => null;
}

// =============================================================================
// FORM GENERATION PATTERNS
// =============================================================================

/**
 * Hebrew binyan patterns for 3-letter roots
 * Each pattern shows how to build forms from root letters (פ-ע-ל)
 */
const HEBREW_FORM_PATTERNS = {
  // Qal forms
  QAL_PERFECT_3MS: (r) => r, // פָּעַל
  QAL_PERFECT_3FS: (r) => r + 'ה', // פָּעְלָה
  QAL_PERFECT_1CS: (r) => r + 'תי', // פָּעַלְתִּי
  QAL_IMPERFECT_3MS: (r) => 'י' + r, // יִפְעֹל
  QAL_IMPERFECT_1CS: (r) => 'א' + r, // אֶפְעֹל
  QAL_PARTICIPLE_MS: (r) => r[0] + 'ו' + r.slice(1), // פּוֹעֵל
  QAL_INFINITIVE: (r) => 'ל' + r, // לִפְעֹל

  // Nifal forms
  NIFAL_PERFECT: (r) => 'נ' + r, // נִפְעַל
  NIFAL_IMPERFECT: (r) => 'י' + r, // יִפָּעֵל
  NIFAL_PARTICIPLE: (r) => 'נ' + r, // נִפְעָל

  // Piel forms
  PIEL_PERFECT: (r) => r, // פִּעֵל (with dagesh)
  PIEL_IMPERFECT: (r) => 'י' + r, // יְפַעֵל
  PIEL_PARTICIPLE: (r) => 'מ' + r, // מְפַעֵל
  PIEL_INFINITIVE: (r) => 'ל' + r, // לְפַעֵל

  // Hifil forms
  HIFIL_PERFECT: (r) => 'ה' + r, // הִפְעִיל
  HIFIL_IMPERFECT: (r) => 'י' + r, // יַפְעִיל
  HIFIL_PARTICIPLE: (r) => 'מ' + r, // מַפְעִיל
  HIFIL_INFINITIVE: (r) => 'לה' + r, // לְהַפְעִיל

  // Hitpael forms
  HITPAEL_PERFECT: (r) => 'הת' + r, // הִתְפַּעֵל
  HITPAEL_IMPERFECT: (r) => 'ית' + r, // יִתְפַּעֵל
  HITPAEL_PARTICIPLE: (r) => 'מת' + r, // מִתְפַּעֵל
};

/**
 * Aramaic form patterns
 */
const ARAMAIC_FORM_PATTERNS = {
  // Peal (simple active)
  PEAL_PERFECT: (r) => r,
  PEAL_PARTICIPLE: (r) => r,
  PEAL_IMPERFECT: (r) => 'י' + r,

  // Pael (intensive)
  PAEL_PERFECT: (r) => r,
  PAEL_PARTICIPLE: (r) => 'מ' + r,

  // Afel (causative)
  AFEL_PERFECT: (r) => 'א' + r,
  AFEL_PARTICIPLE: (r) => 'מ' + r,
  AFEL_IMPERFECT: (r) => 'י' + r,

  // Itpeel (reflexive)
  ITPEEL_PERFECT: (r) => 'את' + r,
  ITPEEL_PARTICIPLE: (r) => 'מת' + r,
};

/**
 * Common noun patterns derived from roots
 */
const NOUN_PATTERNS = {
  // Segolate patterns
  SEGOL_MASC: (r) => r[0] + 'ֶ' + r[1] + 'ֶ' + r[2], // מֶלֶךְ pattern
  SEGOL_FEM: (r) => r + 'ת', // מַלְכָּה pattern

  // Agent nouns
  AGENT_MASC: (r) => r[0] + 'ַ' + r.slice(1) + 'ן', // פַּעְלָן
  AGENT_FEM: (r) => r + 'נית', // פַּעְלָנִית

  // Abstract nouns
  ABSTRACT_FEM: (r) => r + 'ה', // פְּעֻלָּה pattern
  ABSTRACT_UT: (r) => r + 'ות', // פְּעֻלּוֹת

  // Action/process nouns
  MIQTAL: (r) => 'מ' + r, // מִפְעָל
  TAQTIL: (r) => 'ת' + r, // תַּפְעִיל
};

// =============================================================================
// FORM CATEGORIES
// =============================================================================

/**
 * Categories for organizing forms in the family tree
 */
export const FORM_CATEGORIES = {
  VERBS: {
    id: 'verbs',
    label: 'Verbs',
    hebrewLabel: 'פעלים',
    icon: 'פ',
    color: '#2563eb',
    subcategories: {
      QAL: { label: 'Qal', hebrew: 'קַל', meaning: 'simple active' },
      NIFAL: { label: "Nif'al", hebrew: 'נִפְעַל', meaning: 'passive/reflexive' },
      PIEL: { label: "Pi'el", hebrew: 'פִּעֵל', meaning: 'intensive' },
      HIFIL: { label: "Hif'il", hebrew: 'הִפְעִיל', meaning: 'causative' },
      HITPAEL: { label: "Hitpa'el", hebrew: 'הִתְפַּעֵל', meaning: 'reflexive' },
    }
  },
  NOUNS: {
    id: 'nouns',
    label: 'Nouns',
    hebrewLabel: 'שמות',
    icon: 'ש',
    color: '#059669',
  },
  ADJECTIVES: {
    id: 'adjectives',
    label: 'Adjectives',
    hebrewLabel: 'שמות תואר',
    icon: 'ת',
    color: '#7c3aed',
  },
  RELATED: {
    id: 'related',
    label: 'Related',
    hebrewLabel: 'קשורים',
    icon: '~',
    color: '#6b7280',
  }
};

// =============================================================================
// MAIN SERVICE FUNCTIONS
// =============================================================================

/**
 * Generate all derived forms from a root
 * @param {string} root - The 3-letter Hebrew/Aramaic root
 * @param {Object} options - Generation options
 * @returns {Object} Categorized forms with metadata
 */
export function generateRootForms(root, options = {}) {
  const {
    language = 'hebrew',
    includeRare = false,
    maxFormsPerCategory = 10,
  } = options;

  if (!root || root.length < 2 || root.length > 4) {
    return { error: 'Invalid root', forms: {} };
  }

  const rootInfo = ROOT_MEANINGS[root] || null;
  const forms = {
    root,
    language,
    rootInfo,
    categories: {},
    totalForms: 0,
  };

  // Generate verb forms
  const verbForms = generateVerbForms(root, language, rootInfo, maxFormsPerCategory);
  if (verbForms.length > 0) {
    forms.categories.verbs = {
      ...FORM_CATEGORIES.VERBS,
      forms: verbForms,
    };
    forms.totalForms += verbForms.length;
  }

  // Generate noun forms
  const nounForms = generateNounForms(root, language, rootInfo, includeRare);
  if (nounForms.length > 0) {
    forms.categories.nouns = {
      ...FORM_CATEGORIES.NOUNS,
      forms: nounForms,
    };
    forms.totalForms += nounForms.length;
  }

  return forms;
}

/**
 * Generate verb conjugation forms
 */
function generateVerbForms(root, language, rootInfo, maxPerCategory) {
  const forms = [];
  const patterns = language === 'aramaic' ? ARAMAIC_FORM_PATTERNS : HEBREW_FORM_PATTERNS;
  const binyanim = language === 'aramaic' ? ARAMAIC_BINYANIM : BINYANIM;

  // Base meaning from root database
  const baseMeaning = rootInfo?.base || '';
  const causativeMeaning = rootInfo?.causative || '';

  // Generate forms for each binyan/tense combination
  Object.entries(patterns).forEach(([patternName, generator]) => {
    try {
      const form = generator(root);
      const [binyanKey, tense] = patternName.split('_');
      const binyanInfo = binyanim[binyanKey] || {};

      // Determine meaning based on binyan
      let meaning = baseMeaning;
      if (binyanKey.includes('HIFIL') || binyanKey.includes('AFEL')) {
        meaning = causativeMeaning || `cause to ${baseMeaning}`;
      } else if (binyanKey.includes('NIFAL') || binyanKey.includes('ITPEEL')) {
        meaning = `be ${baseMeaning}` || baseMeaning;
      } else if (binyanKey.includes('HITPAEL')) {
        meaning = `${baseMeaning} oneself` || baseMeaning;
      }

      // Get frequency if available
      const frequency = getWordFrequency?.(form);

      forms.push({
        form,
        pattern: patternName,
        binyan: binyanKey,
        binyanInfo,
        tense: tense?.toLowerCase() || 'base',
        meaning,
        frequency: frequency?.count || null,
        frequencyBand: frequency?.band?.label || null,
      });
    } catch (e) {
      // Skip invalid forms
    }
  });

  // Sort by frequency (most common first) and limit
  return forms
    .sort((a, b) => (b.frequency || 0) - (a.frequency || 0))
    .slice(0, maxPerCategory);
}

/**
 * Generate noun forms derived from root
 */
function generateNounForms(root, language, rootInfo, includeRare) {
  const forms = [];

  Object.entries(NOUN_PATTERNS).forEach(([patternName, generator]) => {
    try {
      const form = generator(root);
      const frequency = getWordFrequency?.(form);

      // Skip rare forms unless requested
      if (!includeRare && (!frequency || frequency.count < 5)) {
        return;
      }

      forms.push({
        form,
        pattern: patternName,
        type: patternName.includes('AGENT') ? 'agent' :
              patternName.includes('ABSTRACT') ? 'abstract' :
              patternName.includes('FEM') ? 'feminine' : 'masculine',
        meaning: rootInfo?.base ? `one who ${rootInfo.base}s` : null,
        frequency: frequency?.count || null,
      });
    } catch (e) {
      // Skip invalid forms
    }
  });

  return forms.sort((a, b) => (b.frequency || 0) - (a.frequency || 0));
}

/**
 * Get forms that are actually attested in texts
 * Cross-references generated forms with dictionary data
 * @param {string} root - The root to search
 * @returns {Promise<Array>} Array of attested forms
 */
export async function getAttestedForms(root) {
  // Try to search dictionary data for attested forms
  const attested = [];

  try {
    // Search in Jastrow data
    const jastrow = await import('../data/jastrowComplete');
    const jastrowEntries = Object.entries(jastrow.JASTROW_DICTIONARY || {});

    jastrowEntries.forEach(([word, entry]) => {
      if (entry.root === root || (entry.hebrew && entry.hebrew.includes(root))) {
        attested.push({
          form: word,
          source: 'Jastrow',
          definition: entry.definition || entry.english,
          partOfSpeech: entry.pos,
        });
      }
    });
  } catch (e) {
    // Jastrow not available
  }

  try {
    // Search in BDB data
    const bdb = await import('../data/bdbComplete');
    const bdbEntries = Object.entries(bdb.BDB_DICTIONARY || {});

    bdbEntries.forEach(([word, entry]) => {
      if (entry.root === root) {
        attested.push({
          form: word,
          source: 'BDB',
          definition: entry.definition || entry.gloss,
          partOfSpeech: entry.pos,
        });
      }
    });
  } catch (e) {
    // BDB not available
  }

  // Deduplicate by form
  const seen = new Set();
  return attested.filter(item => {
    if (seen.has(item.form)) return false;
    seen.add(item.form);
    return true;
  });
}

/**
 * Get the complete family tree for a root
 * Combines generated forms with attested forms
 * @param {string} root - The root to analyze
 * @param {Object} options - Options
 * @returns {Promise<Object>} Complete family tree
 */
export async function getRootFamilyTree(root, options = {}) {
  const generated = generateRootForms(root, options);

  // Try to get attested forms
  let attested = [];
  try {
    attested = await getAttestedForms(root);
  } catch (e) {
    // Continue without attested forms
  }

  // Merge attested forms into categories
  const attestedByType = {
    verbs: attested.filter(f => f.partOfSpeech?.includes('verb') || f.partOfSpeech === 'v'),
    nouns: attested.filter(f => f.partOfSpeech?.includes('noun') || f.partOfSpeech === 'n'),
    adjectives: attested.filter(f => f.partOfSpeech?.includes('adj') || f.partOfSpeech === 'adj'),
  };

  // Mark generated forms that are attested
  Object.values(generated.categories).forEach(category => {
    category.forms?.forEach(form => {
      const match = attested.find(a => a.form === form.form);
      if (match) {
        form.attested = true;
        form.attestedSource = match.source;
        form.definition = match.definition || form.meaning;
      }
    });
  });

  return {
    ...generated,
    attestedForms: attested,
    attestedByType,
    hasAttestedData: attested.length > 0,
  };
}

/**
 * Search for all words sharing the same root in loaded dictionaries
 * @param {string} root - Root to search
 * @param {number} limit - Maximum results
 * @returns {Array} Words from same root family
 */
export function searchRootFamily(root, limit = 50) {
  const results = [];

  // Add root info if available
  const rootInfo = ROOT_MEANINGS[root];
  if (rootInfo) {
    results.push({
      form: root,
      type: 'root',
      meaning: rootInfo.base,
      isRoot: true,
      semanticField: rootInfo.semanticField,
      frequency: rootInfo.frequency,
    });
  }

  return results.slice(0, limit);
}

// Default export
const rootFormsService = {
  generateRootForms,
  getAttestedForms,
  getRootFamilyTree,
  searchRootFamily,
  FORM_CATEGORIES,
};

export default rootFormsService;
