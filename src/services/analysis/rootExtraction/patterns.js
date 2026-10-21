// =============================================================================
// Patterns et configuration — tiers de dictionnaires, binyanim fusionnés,
// patterns préfixe/suffixe/nom, sources par contexte.
// (extrait de rootExtraction.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

import { SOURCE_CONFIG } from '../../../constants/sourceConfig';
import {
  WEAK_VERB_RULES,
  BINYANIM as SHARED_BINYANIM,
  ARAMAIC_BINYANIM
} from '../../../constants/morphologyPatterns';

// =============================================================================
// DICTIONARY TIER CONFIGURATION - Derived from unified SOURCE_CONFIG
// =============================================================================

// Derive from SOURCE_CONFIG (single source of truth)
// Add context-specific info for this service's needs
export const DICTIONARY_TIERS = {
  jastrow: {
    name: SOURCE_CONFIG.jastrow.shortName,
    ...SOURCE_CONFIG.jastrow,
    contexts: ['talmudic', 'midrashic', 'aramaic']
  },
  bdb: {
    name: SOURCE_CONFIG.bdb.shortName,
    ...SOURCE_CONFIG.bdb,
    contexts: ['biblical', 'mishnaic']
  },
  strongs: {
    name: SOURCE_CONFIG.strongs.shortName,
    ...SOURCE_CONFIG.strongs,
    contexts: ['biblical'] // NOT for Talmudic!
  }
};

// =============================================================================
// WEAK VERB CLASSIFICATION - Re-exported from morphologyPatterns.js
// =============================================================================

// Use single source of truth
export const WEAK_VERB_TYPES = WEAK_VERB_RULES;

// =============================================================================
// BINYAN (VERB PATTERN) DEFINITIONS - Re-exported from morphologyPatterns.js
// =============================================================================

// Merge Hebrew and Aramaic binyanim for backwards compatibility
export const BINYANIM = { ...SHARED_BINYANIM, ...ARAMAIC_BINYANIM };

// =============================================================================
// COMPREHENSIVE PREFIX PATTERNS
// =============================================================================

/**
 * Hebrew/Aramaic prefix patterns with linguistic metadata
 * Order matters: longer patterns first to prevent partial matches
 */
export const PREFIX_PATTERNS = [
  // === COMPOUND PREFIXES (3+ letters) ===
  { pattern: 'וכש', meaning: 'and when/as', type: 'compound', components: ['ו', 'כ', 'ש'] },
  { pattern: 'וכה', meaning: 'and like the', type: 'compound', components: ['ו', 'כ', 'ה'] },
  { pattern: 'ובה', meaning: 'and in the', type: 'compound', components: ['ו', 'ב', 'ה'] },
  { pattern: 'ולה', meaning: 'and to the', type: 'compound', components: ['ו', 'ל', 'ה'] },
  { pattern: 'ומה', meaning: 'and from the', type: 'compound', components: ['ו', 'מ', 'ה'] },
  { pattern: 'משה', meaning: 'that from the', type: 'compound', components: ['מ', 'ש', 'ה'] },

  // === BINYAN MARKERS ===
  { pattern: 'הת', meaning: 'Hitpael marker', type: 'binyan', binyan: 'HITPAEL' },
  { pattern: 'מת', meaning: 'Hitpael participle', type: 'binyan', binyan: 'HITPAEL' },
  { pattern: 'נת', meaning: 'Nitpael marker', type: 'binyan', binyan: 'NITPAEL' },
  { pattern: 'אית', meaning: 'Ithpeel (Aramaic)', type: 'binyan', binyan: 'ITHPEEL', language: 'aramaic' },
  { pattern: 'את', meaning: 'Ithpeel (Aramaic)', type: 'binyan', binyan: 'ITHPEEL', language: 'aramaic' },

  // === COMPOUND PREFIXES (2 letters) ===
  { pattern: 'וה', meaning: 'and the', type: 'compound', components: ['ו', 'ה'] },
  { pattern: 'וב', meaning: 'and in', type: 'compound', components: ['ו', 'ב'] },
  { pattern: 'ול', meaning: 'and to', type: 'compound', components: ['ו', 'ל'] },
  { pattern: 'ומ', meaning: 'and from', type: 'compound', components: ['ו', 'מ'] },
  { pattern: 'וכ', meaning: 'and like', type: 'compound', components: ['ו', 'כ'] },
  { pattern: 'כש', meaning: 'when/as', type: 'compound', components: ['כ', 'ש'] },
  { pattern: 'מש', meaning: 'from that', type: 'compound', components: ['מ', 'ש'] },
  { pattern: 'בש', meaning: 'in that', type: 'compound', components: ['ב', 'ש'] },
  { pattern: 'לש', meaning: 'to that', type: 'compound', components: ['ל', 'ש'] },

  // === SINGLE PREFIXES ===
  { pattern: 'ו', meaning: 'and', type: 'conjunction', hebrew: 'וַ/וְ' },
  { pattern: 'ה', meaning: 'the', type: 'article', hebrew: 'הַ' },
  { pattern: 'ב', meaning: 'in/with', type: 'preposition', hebrew: 'בְּ' },
  { pattern: 'ל', meaning: 'to/for', type: 'preposition', hebrew: 'לְ' },
  { pattern: 'מ', meaning: 'from', type: 'preposition', hebrew: 'מִ' },
  { pattern: 'כ', meaning: 'like/as', type: 'preposition', hebrew: 'כְּ' },
  { pattern: 'ש', meaning: 'that/who', type: 'relative', hebrew: 'שֶׁ' },

  // === ARAMAIC PREFIXES ===
  { pattern: 'ד', meaning: 'of/that (Aramaic)', type: 'aramaic', hebrew: 'דְּ', language: 'aramaic' },
  { pattern: 'א', meaning: 'Aphel causative', type: 'binyan', binyan: 'APHEL', language: 'aramaic' },
];

// =============================================================================
// COMPREHENSIVE SUFFIX PATTERNS
// =============================================================================

/**
 * Hebrew/Aramaic suffix patterns with morphological metadata
 * Order matters: longer patterns first
 */
export const SUFFIX_PATTERNS = [
  // === LONG COMPOUND SUFFIXES ===
  { pattern: 'ותיהם', meaning: 'their (f.pl)', type: 'possessive', gender: 'f', number: 'pl', person: 3 },
  { pattern: 'ותיהן', meaning: 'their (f.pl)', type: 'possessive', gender: 'f', number: 'pl', person: 3 },
  { pattern: 'יהם', meaning: 'their (m)', type: 'possessive', gender: 'm', number: 'pl', person: 3 },
  { pattern: 'יהן', meaning: 'their (f)', type: 'possessive', gender: 'f', number: 'pl', person: 3 },

  // === CONSTRUCT + POSSESSIVE ===
  { pattern: 'תנו', meaning: 'construct+our', type: 'construct_poss', restoreHe: true, person: 1 },
  { pattern: 'תכם', meaning: 'construct+your(pl)', type: 'construct_poss', restoreHe: true, person: 2 },
  { pattern: 'תם', meaning: 'construct+their(m)', type: 'construct_poss', restoreHe: true, person: 3 },
  { pattern: 'תן', meaning: 'construct+their(f)', type: 'construct_poss', restoreHe: true, person: 3 },
  { pattern: 'תו', meaning: 'construct+his', type: 'construct_poss', restoreHe: true, person: 3 },
  { pattern: 'תי', meaning: 'construct+my', type: 'construct_poss', restoreHe: true, person: 1 },
  { pattern: 'תך', meaning: 'construct+your(s)', type: 'construct_poss', restoreHe: true, person: 2 },

  // === PLURAL SUFFIXES ===
  { pattern: 'ים', meaning: 'plural (m)', type: 'plural', gender: 'm', hebrew: 'ים' },
  { pattern: 'ות', meaning: 'plural (f)', type: 'plural', gender: 'f', restoreHe: true, hebrew: 'וֹת' },
  { pattern: 'ין', meaning: 'plural (Aramaic)', type: 'plural', language: 'aramaic', hebrew: 'ין' },
  { pattern: 'יא', meaning: 'plural emphatic (Aramaic)', type: 'plural', language: 'aramaic' },

  // === DUAL SUFFIX ===
  { pattern: 'יים', meaning: 'dual', type: 'dual', hebrew: 'יִם' },

  // === STANDARD POSSESSIVES ===
  { pattern: 'נו', meaning: 'our/we', type: 'possessive', person: 1, number: 'pl' },
  { pattern: 'הם', meaning: 'them (m)', type: 'possessive', person: 3, number: 'pl', gender: 'm' },
  { pattern: 'הן', meaning: 'them (f)', type: 'possessive', person: 3, number: 'pl', gender: 'f' },
  { pattern: 'יו', meaning: 'his', type: 'possessive', person: 3, number: 's', gender: 'm' },
  { pattern: 'יה', meaning: 'her', type: 'possessive', person: 3, number: 's', gender: 'f' },
  { pattern: 'כם', meaning: 'your (m.pl)', type: 'possessive', person: 2, number: 'pl', gender: 'm' },
  { pattern: 'כן', meaning: 'your (f.pl)', type: 'possessive', person: 2, number: 'pl', gender: 'f' },

  // === VERB ENDINGS ===
  { pattern: 'תי', meaning: 'I (past)', type: 'verb', tense: 'past', person: 1, number: 's' },
  { pattern: 'ת', meaning: 'you (past)', type: 'verb', tense: 'past', person: 2 },
  { pattern: 'תם', meaning: 'you (m.pl past)', type: 'verb', tense: 'past', person: 2, number: 'pl' },
  { pattern: 'תן', meaning: 'you (f.pl past)', type: 'verb', tense: 'past', person: 2, number: 'pl', gender: 'f' },

  // === SINGLE LETTER ===
  { pattern: 'ו', meaning: 'his/they', type: 'suffix', person: 3 },
  { pattern: 'י', meaning: 'my', type: 'possessive', person: 1, number: 's' },
  { pattern: 'ך', meaning: 'your (ms)', type: 'possessive', person: 2, number: 's', gender: 'm' },
  { pattern: 'ה', meaning: 'her/direction', type: 'suffix', ambiguous: true },

  // === ARAMAIC EMPHATIC STATE ===
  { pattern: 'תא', meaning: 'emphatic (Aramaic f)', type: 'emphatic', language: 'aramaic' },
  { pattern: 'יא', meaning: 'emphatic (Aramaic m)', type: 'emphatic', language: 'aramaic' },
  { pattern: 'א', meaning: 'emphatic (Aramaic)', type: 'emphatic', language: 'aramaic' },
];

// =============================================================================
// NOUN PATTERNS (משקלים)
// =============================================================================

/**
 * Hebrew noun patterns for root extraction
 * Each pattern has: regex, name, meaning, and root extraction function
 */
export const NOUN_PATTERNS = [
  // === PLACE/INSTRUMENT NOUNS ===
  { pattern: /^מ([א-ת])([א-ת])([א-ת])$/, name: 'מַקְטֵל', meaning: 'place/instrument',
    extract: (w) => w.slice(1), example: 'מִשְׁכָּן (tabernacle) from שׁכן' },
  { pattern: /^מ([א-ת])([א-ת])([א-ת])ה$/, name: 'מַקְטְלָה', meaning: 'instrument (f)',
    extract: (w) => w.slice(1, -1), example: 'מַאֲכֶלֶת (knife) from אכל' },

  // === ABSTRACT NOUNS ===
  { pattern: /^ת([א-ת])([א-ת])([א-ת])ה$/, name: 'תַּקְטֵלָה', meaning: 'abstract noun',
    extract: (w) => w.slice(1, -1), example: 'תְּשׁוּבָה (repentance) from שׁוב' },
  { pattern: /^([א-ת])([א-ת])([א-ת])ות$/, name: 'קַטְלוּת', meaning: 'abstract quality',
    extract: (w) => w.slice(0, -2), example: 'מַלְכוּת (kingship) from מלך' },

  // === FEMININE NOUNS ===
  { pattern: /^([א-ת])([א-ת])([א-ת])ה$/, name: 'קְטֵלָה', meaning: 'feminine noun',
    extract: (w) => w.slice(0, -1), example: 'תּוֹרָה (Torah) from ירה' },

  // === DIMINUTIVE/AGENT NOUNS ===
  { pattern: /^([א-ת])([א-ת])([א-ת])ון$/, name: 'קִטָּלוֹן', meaning: 'diminutive',
    extract: (w) => w.slice(0, -2), example: 'אִשּׁוֹן (pupil of eye) from אישׁ' },
  { pattern: /^([א-ת])([א-ת])([א-ת])ן$/, name: 'קַטְלָן', meaning: 'agent/profession',
    extract: (w) => w.slice(0, -1), example: 'סַפְדָּן (eulogizer) from ספד' },
  { pattern: /^([א-ת])([א-ת])([א-ת])ני$/, name: 'קַטְלָנִי', meaning: 'adjective',
    extract: (w) => w.slice(0, -2), example: 'רוּחָנִי (spiritual) from רוח' },

  // === VERBAL NOUNS ===
  { pattern: /^([א-ת])ו([א-ת])([א-ת])$/, name: 'קוֹטֵל', meaning: 'active participle (Qal)',
    extract: (w) => w[0] + w.slice(2), example: 'שׁוֹמֵר (guard) from שׁמר' },
  { pattern: /^נ([א-ת])([א-ת])([א-ת])$/, name: 'נִקְטָל', meaning: 'passive participle (Nifal)',
    extract: (w) => w.slice(1), example: 'נִכְבָּד (honored) from כבד' },
  { pattern: /^מ([א-ת])([א-ת])([א-ת])$/, name: 'מְקַטֵּל', meaning: 'active participle (Piel)',
    extract: (w) => w.slice(1), example: 'מְדַבֵּר (speaking) from דבר' },

  // === ACTION NOUNS (פְּעִילָה pattern) ===
  // יְצִיאָה (yetsi'ah) pattern - action noun from ayin-yod/lamed-he verbs
  { pattern: /^([א-ת])([א-ת])י([א-ת])ות$/, name: 'פְּעִילוֹת', meaning: 'action noun (f.pl)',
    extract: (w) => w[0] + w[1] + w[3], example: 'יְצִיאוֹת (goings out) from יצא' },
  { pattern: /^([א-ת])([א-ת])י([א-ת])ה$/, name: 'פְּעִילָה', meaning: 'action noun (f.s)',
    extract: (w) => w[0] + w[1] + w[3], example: 'יְצִיאָה (going out) from יצא' },
  { pattern: /^([א-ת])([א-ת])י([א-ת])$/, name: 'פְּעִיל', meaning: 'action noun base',
    extract: (w) => w[0] + w[1] + w[3], example: 'יציא from יצא' },

  // === MISHKAL PATTERNS (additional common forms) ===
  { pattern: /^([א-ת])([א-ת])י([א-ת])ת$/, name: 'פְּעִילַת', meaning: 'construct state (f.s)',
    extract: (w) => w[0] + w[1] + w[3], example: 'יציאת (going out of) from יצא' },
  { pattern: /^([א-ת])([א-ת])ו([א-ת])ה$/, name: 'פְּעוּלָה', meaning: 'passive action noun',
    extract: (w) => w[0] + w[1] + w[3], example: 'תְּשׁוּבָה (answer) from שׁוב' },
];

// =============================================================================
// CONTEXT-AWARE SOURCE PRIORITY
// =============================================================================

/**
 * Get recommended dictionary sources based on text context
 * @param {string} contextType - 'talmudic', 'biblical', 'mishnaic', etc.
 * @returns {Object} { primary: [], secondary: [], skip: [], reason: string }
 */
export function getSourcesForContext(contextType) {
  switch (contextType) {
    case 'talmudic':
      return {
        primary: ['jastrow', 'cal'],
        secondary: ['bdb'],
        skip: ['strongs'], // Strong's is Biblical Hebrew only
        reason: "Talmudic Aramaic - Strong's excluded"
      };
    case 'biblical':
      return {
        primary: ['bdb', 'strongs'],
        secondary: ['halot', 'gesenius'],
        skip: [],
        reason: 'Biblical Hebrew'
      };
    case 'mishnaic':
      return {
        primary: ['jastrow', 'bdb'],
        secondary: ['klein'],
        skip: ['strongs'],
        reason: "Mishnaic Hebrew - Strong's excluded"
      };
    case 'midrashic':
      return {
        primary: ['jastrow'],
        secondary: ['bdb', 'klein'],
        skip: ['strongs'],
        reason: "Midrashic text - Strong's excluded"
      };
    case 'commentary':
      return {
        primary: ['jastrow', 'bdb'],
        secondary: ['klein'],
        skip: [],
        reason: 'Commentary (mixed sources)'
      };
    default:
      return {
        primary: ['jastrow', 'bdb'],
        secondary: ['klein', 'strongs'],
        skip: [],
        reason: 'Unknown context (all sources)'
      };
  }
}

