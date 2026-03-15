// =============================================================================
// Scholarly Lexicon Service
// Academic-grade Hebrew/Aramaic dictionary with multiple scholarly sources
// Integrates: BDB, Jastrow, Strong's, Klein Etymology, Gesenius, HALOT refs
// =============================================================================

import { createCache } from '../utils/cache';
import { cleanHtml } from '../utils/sanitize';

const SEFARIA_BASE = 'https://www.sefaria.org/api';

/**
 * Clean definition text - removes HTML, scholarly notation, and normalizes
 * Enhanced to handle Jastrow and other scholarly dictionary notation
 * @param {string} text - Raw definition text
 * @returns {string} - Cleaned text
 */
const cleanDefinitionText = (text) => {
  if (!text || typeof text !== 'string') return '';

  // First strip HTML tags
  let cleaned = cleanHtml(text);

  // Remove Talmudic/Targum references (Jastrow-specific patterns)
  cleaned = cleaned
    // Remove Talmudic tractate references (Y. Shebi. VII, 37ᶜ top, Targ. Ex. I, 16, etc.)
    .replace(/\bY\.\s*[A-Za-z]+\.?\s*[IVXLCDM\d]+,?\s*\d*[a-dᵃᵇᶜᵈ]?\s*(top|bot|mid)?/gi, '')
    .replace(/\bTarg\.\s*[A-Za-z.]+\s*[IVXLCDM\d,\s]+/gi, '')
    .replace(/\bGen\.\s*R\.\s*[IVXLCDM\d,\s]+/gi, '')
    .replace(/\bEx\.\s*R\.\s*[IVXLCDM\d,\s]+/gi, '')
    .replace(/\bLev\.\s*R\.\s*[IVXLCDM\d,\s]+/gi, '')
    .replace(/\bNum\.\s*R\.\s*[IVXLCDM\d,\s]+/gi, '')
    .replace(/\bDeut\.\s*R\.\s*[IVXLCDM\d,\s]+/gi, '')
    .replace(/\bPes\.\s*[IVXLCDM\d,\s]+/gi, '')
    .replace(/\bBer\.\s*[IVXLCDM\d,\s]+/gi, '')
    .replace(/\bShab\.\s*[IVXLCDM\d,\s]+/gi, '')
    .replace(/\bSanh\.\s*[IVXLCDM\d,\s]+/gi, '')
    // Remove cross-references (v. דָּא, a. v. fr., etc.)
    .replace(/\bv\.\s*[\u0590-\u05FF]+/g, '')
    .replace(/\ba\.\s*v\.\s*fr\.?/gi, '')
    .replace(/\bch\.\s*same\.?/gi, '')
    .replace(/\bs\.\s*v\.?/gi, '')
    .replace(/\bib\.?/gi, '')
    .replace(/\bib\s*\d+/gi, '')
    // Remove manuscript references
    .replace(/\bMs\.\s*[A-Z]?\.?/gi, '')
    .replace(/\bVar\.\s*\w+/gi, '')
    .replace(/\bArukh\s*\w*/gi, '')
    // Remove "fr." and other frequency markers
    .replace(/\ba\.\s*fr\./gi, '')
    .replace(/\bfreq\./gi, '')
    .replace(/\b&c\.?/gi, '')
    // Remove em-dashes with Hebrew text after (cross-refs)
    .replace(/—[\u0590-\u05FF\s,]+/g, '')
    .replace(/—\s*v\.\s*[\u0590-\u05FF]+/g, '');

  // Remove common scholarly notation patterns
  cleaned = cleaned
    .replace(/\(a hapax legomenon[^)]*\)/gi, '')
    .replace(/\(occurring[^)]*\)/gi, '')
    .replace(/\(in the c\. st\.[^)]*\)/gi, '')
    .replace(/\(from[^)]*\)/gi, '')
    .replace(/\(cf\.[^)]*\)/gi, '')
    .replace(/\(see[^)]*\)/gi, '')
    .replace(/\(lit\.[^)]*\)/gi, '')
    .replace(/\(fig\.[^)]*\)/gi, '')
    .replace(/\(pl\.[^)]*\)/gi, '')
    .replace(/\(comp\.[^)]*\)/gi, '')
    .replace(/\(cmp\.[^)]*\)/gi, '')
    .replace(/\[[^\]]*\]/g, '') // Remove bracketed references
    // Clean up punctuation issues
    .replace(/,\s*,/g, ',')
    .replace(/;\s*;/g, ';')
    .replace(/^\s*[,;.—-]+\s*/g, '') // Remove leading punctuation
    .replace(/\s*[,;—-]+\s*$/g, '') // Remove trailing punctuation
    .replace(/\s+/g, ' ')
    .trim();

  // If result is mostly Hebrew text or references, return empty
  const englishChars = (cleaned.match(/[a-zA-Z]/g) || []).length;
  const totalChars = cleaned.replace(/\s/g, '').length;
  if (totalChars > 0 && englishChars / totalChars < 0.3 && totalChars > 5) {
    // Mostly non-English, likely just references
    return '';
  }

  return cleaned;
};

/**
 * Extract the actual English meaning from Jastrow/scholarly definition
 * Handles complex scholarly notation to find the real definition
 * @param {string} text - Raw Jastrow definition text
 * @returns {string|null} - Extracted meaning or null
 */
const extractJastrowMeaning = (text) => {
  if (!text || typeof text !== 'string') return null;

  // First clean HTML
  let cleaned = cleanHtml(text);

  // Jastrow often starts with grammatical info then meaning
  // Pattern: "m. (= ...) meaning" or "f. meaning" or "ch. same, meaning"

  // Try to extract meaning after common patterns
  const patterns = [
    // After grammatical markers: "m. meaning" or "f. meaning"
    /^(?:[mfn]\.|ch\.|cmp\.|comp\.|adj\.|v\.|subst\.)\s*(?:\([^)]*\)\s*)*(.+)/i,
    // After "same as" or "=" patterns
    /(?:same\s+as|=)\s*[\u0590-\u05FF]+[,.]?\s*(.+)/i,
    // After numbered sense: "1) meaning"
    /^\d+[.)]\s*(.+)/,
    // Just get first substantial English phrase
    /([a-zA-Z][a-zA-Z\s,'-]{5,})/
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match && match[1]) {
      const extracted = cleanDefinitionText(match[1]);
      if (extracted && extracted.length >= 3) {
        return extracted;
      }
    }
  }

  // Fallback: clean the whole text
  return cleanDefinitionText(cleaned) || null;
};

// Cache for scholarly lookups (longer TTL for academic data)
const scholarlyCache = createCache({ ttl: 48 * 60 * 60 * 1000, maxSize: 1000 }); // 48 hours

// =============================================================================
// SCHOLARLY SOURCES CONFIGURATION
// =============================================================================

export const SCHOLARLY_SOURCES = {
  BDB: {
    id: 'bdb',
    name: 'Brown-Driver-Briggs',
    fullName: 'Brown-Driver-Briggs Hebrew and English Lexicon',
    abbreviation: 'BDB',
    year: 1906,
    description: 'Standard academic Hebrew lexicon for Biblical Hebrew',
    type: 'biblical',
    language: 'Hebrew'
  },
  JASTROW: {
    id: 'jastrow',
    name: 'Jastrow',
    fullName: "Jastrow's Dictionary of Targumim, Talmud and Midrashic Literature",
    abbreviation: 'Jastrow',
    year: 1903,
    description: 'Comprehensive Aramaic and Rabbinic Hebrew dictionary',
    type: 'rabbinic',
    language: 'Aramaic'
  },
  STRONG: {
    id: 'strong',
    name: "Strong's",
    fullName: "Strong's Exhaustive Concordance",
    abbreviation: 'Strong',
    year: 1890,
    description: 'Biblical concordance with Hebrew/Greek numbering system',
    type: 'concordance',
    language: 'Hebrew'
  },
  KLEIN: {
    id: 'klein',
    name: 'Klein Etymology',
    fullName: "Klein's Comprehensive Etymological Dictionary of the Hebrew Language",
    abbreviation: 'Klein',
    year: 1987,
    description: 'Etymological roots and cognate language connections',
    type: 'etymology',
    language: 'Hebrew'
  },
  GESENIUS: {
    id: 'gesenius',
    name: 'Gesenius',
    fullName: "Gesenius' Hebrew Grammar",
    abbreviation: 'GKC',
    year: 1910,
    description: 'Classical Hebrew grammar reference',
    type: 'grammar',
    language: 'Hebrew'
  },
  HALOT: {
    id: 'halot',
    name: 'HALOT',
    fullName: 'Hebrew and Aramaic Lexicon of the Old Testament',
    abbreviation: 'HALOT',
    year: 2000,
    description: 'Modern scholarly lexicon with cognate analysis',
    type: 'biblical',
    language: 'Hebrew'
  },
  EVEN_SHOSHAN: {
    id: 'even_shoshan',
    name: 'Even-Shoshan',
    fullName: 'Even-Shoshan Dictionary',
    abbreviation: 'E-S',
    year: 1969,
    description: 'Comprehensive Modern Hebrew dictionary',
    type: 'modern',
    language: 'Hebrew'
  },
  SEFARIA: {
    id: 'sefaria',
    name: 'Sefaria',
    fullName: 'Sefaria.org Digital Library',
    abbreviation: 'Sefaria',
    year: 2011,
    description: 'Comprehensive Jewish text library and lexicon',
    type: 'digital',
    language: 'Hebrew'
  },
  STEINSALTZ: {
    id: 'steinsaltz',
    name: 'Steinsaltz',
    fullName: 'Steinsaltz Talmud Translation',
    abbreviation: 'Steinsaltz',
    year: 1989,
    description: 'Rabbi Adin Steinsaltz modern Talmud translation and commentary',
    type: 'translation',
    language: 'Aramaic'
  },
  TWOT: {
    id: 'twot',
    name: 'TWOT',
    fullName: 'Theological Wordbook of the Old Testament',
    abbreviation: 'TWOT',
    year: 1980,
    description: 'Theological analysis of Hebrew vocabulary with theological significance',
    type: 'theological',
    language: 'Hebrew'
  },
  BOLLS: {
    id: 'bolls',
    name: 'Bolls.life',
    fullName: 'Bolls.life Bible Dictionary (BDB/Thayer)',
    abbreviation: 'Bolls',
    year: 2020,
    description: 'Online BDB and Thayer\'s dictionary API',
    type: 'digital',
    language: 'Hebrew'
  },
  STEP: {
    id: 'step',
    name: 'STEP Bible',
    fullName: 'Scripture Tools for Every Person',
    abbreviation: 'STEP',
    year: 2021,
    description: 'Open source Bible study tools with Strong\'s definitions',
    type: 'digital',
    language: 'Hebrew'
  }
  // NOTE: Modern Hebrew sources (Morfix, Pealim, Wiktionary, Milog, OpenScriptures) removed
  // Focus on scholarly Biblical/Talmudic sources only
};

// =============================================================================
// COGNATE LANGUAGES DATA
// =============================================================================

const COGNATE_LANGUAGES = {
  akkadian: { name: 'Akkadian', script: 'cuneiform', region: 'Mesopotamia' },
  ugaritic: { name: 'Ugaritic', script: 'cuneiform', region: 'Syria' },
  arabic: { name: 'Arabic', script: 'arabic', region: 'Arabia' },
  aramaic: { name: 'Aramaic', script: 'hebrew', region: 'Levant' },
  syriac: { name: 'Syriac', script: 'syriac', region: 'Mesopotamia' },
  ethiopic: { name: 'Ethiopic (Ge\'ez)', script: 'ethiopic', region: 'Ethiopia' },
  phoenician: { name: 'Phoenician', script: 'phoenician', region: 'Lebanon' }
};

// Common cognate patterns for etymological analysis - Enhanced Torah vocabulary
const COGNATE_PATTERNS = {
  // === Creation & Nature ===
  'ברא': { meaning: 'to create', cognates: ['Unique to Hebrew - divine creation', 'Arabic barāʾa (to create)'] },
  'אור': { arabic: 'nūr', meaning: 'light', cognates: ['Arabic nūr', 'Akkadian nūru', 'Aramaic נְהוֹר'] },
  'שמים': { arabic: 'samāʾ', meaning: 'sky/heaven', cognates: ['Arabic samāʾ', 'Akkadian šamû', 'Ugaritic šmm'] },
  'ארץ': { arabic: 'arḍ', meaning: 'earth/land', cognates: ['Arabic ʾarḍ', 'Akkadian erṣetu', 'Ugaritic ʾarṣ'] },
  'מים': { arabic: 'māʾ', meaning: 'water', cognates: ['Arabic māʾ', 'Akkadian mû', 'Ugaritic my'] },
  'יום': { arabic: 'yawm', meaning: 'day', cognates: ['Arabic yawm', 'Akkadian ūmu', 'Aramaic יוֹמָא'] },
  'לילה': { arabic: 'layl', meaning: 'night', cognates: ['Arabic layl', 'Akkadian līlītu', 'Aramaic לֵילְיָא'] },
  'חשך': { meaning: 'darkness', cognates: ['Arabic ẓulmah', 'Akkadian ekletu'] },
  'רקיע': { meaning: 'firmament', cognates: ['Related to רקע (to spread out)'] },
  'עשב': { arabic: 'ʿušb', meaning: 'herb/grass', cognates: ['Arabic ʿušb', 'Akkadian šammu'] },
  'עץ': { arabic: 'ʿūd', meaning: 'tree/wood', cognates: ['Arabic ʿūd', 'Akkadian iṣu'] },
  'פרי': { arabic: 'faraʾ', meaning: 'fruit/offspring', cognates: ['Arabic farʿ (branch)', 'Akkadian inbu'] },
  'זרע': { arabic: 'zarʿ', meaning: 'seed', cognates: ['Arabic zarʿ', 'Akkadian zēru', 'Aramaic זַרְעָא'] },

  // === Family & Relationships ===
  'אב': { arabic: 'ab', meaning: 'father', cognates: ['Arabic ʾab', 'Akkadian abu', 'Aramaic אַבָּא'] },
  'אם': { arabic: 'umm', meaning: 'mother', cognates: ['Arabic ʾumm', 'Akkadian ummu', 'Aramaic אִמָּא'] },
  'בן': { arabic: 'ibn', meaning: 'son', cognates: ['Arabic ibn', 'Aramaic בַּר', 'Akkadian māru'] },
  'בת': { arabic: 'bint', meaning: 'daughter', cognates: ['Arabic bint', 'Akkadian mārtu'] },
  'אח': { arabic: 'akh', meaning: 'brother', cognates: ['Arabic ʾakh', 'Akkadian aḫu', 'Aramaic אַחָא'] },
  'אחות': { arabic: 'ukht', meaning: 'sister', cognates: ['Arabic ʾukht', 'Akkadian aḫātu'] },
  'איש': { meaning: 'man', cognates: ['Ugaritic ʾiš', 'Akkadian awīlu'] },
  'אשה': { arabic: 'imraʾa', meaning: 'woman/wife', cognates: ['Arabic ʾunthā', 'Akkadian aššatu'] },
  'בית': { arabic: 'bayt', meaning: 'house', cognates: ['Arabic bayt', 'Akkadian bītu', 'Aramaic בֵּיתָא'] },

  // === Divine & Sacred ===
  'קדש': { arabic: 'quds', meaning: 'holy', cognates: ['Arabic quds', 'Ugaritic qdš', 'Akkadian qadištu'] },
  'ברך': { arabic: 'baraka', meaning: 'blessing', cognates: ['Arabic bāraka', 'Akkadian karābu'] },
  'שלם': { arabic: 'salām', meaning: 'peace/wholeness', cognates: ['Arabic salām', 'Akkadian šalāmu'] },
  'מלך': { arabic: 'malik', meaning: 'king', cognates: ['Arabic malik', 'Akkadian malku', 'Ugaritic mlk'] },
  'כהן': { arabic: 'kāhin', meaning: 'priest', cognates: ['Arabic kāhin', 'Akkadian kānu'] },
  'נביא': { meaning: 'prophet', cognates: ['Akkadian nabû (to call)', 'Arabic nabīy'] },
  'עבד': { arabic: 'ʿabd', meaning: 'servant/slave', cognates: ['Arabic ʿabd', 'Akkadian ardu'] },
  'צדק': { arabic: 'ṣadaqa', meaning: 'righteousness', cognates: ['Arabic ṣadaqa', 'Akkadian ṣidqu'] },
  'חסד': { meaning: 'lovingkindness', cognates: ['Unique Hebrew theological term'] },
  'תורה': { meaning: 'instruction/law', cognates: ['From ירה (to teach/throw)', 'Akkadian têrtu'] },
  'מצוה': { meaning: 'commandment', cognates: ['From צוה (to command)'] },
  'חטא': { arabic: 'khaṭaʾ', meaning: 'sin/miss', cognates: ['Arabic khaṭaʾ', 'Akkadian ḫaṭû'] },
  'כפר': { arabic: 'kafara', meaning: 'to atone/cover', cognates: ['Arabic kafara', 'Akkadian kapāru'] },

  // === Common Verbs ===
  'אמר': { arabic: 'amara', meaning: 'to say/command', cognates: ['Arabic ʾamara', 'Akkadian amāru'] },
  'שמע': { arabic: 'samiʿa', meaning: 'to hear', cognates: ['Arabic samiʿa', 'Akkadian šemû'] },
  'ראה': { arabic: 'raʾā', meaning: 'to see', cognates: ['Arabic raʾā', 'Akkadian amāru'] },
  'ידע': { arabic: 'wadaʿa', meaning: 'to know', cognates: ['Arabic wadaʿa', 'Akkadian idû'] },
  'עשה': { meaning: 'to do/make', cognates: ['Akkadian epēšu'] },
  'נתן': { meaning: 'to give', cognates: ['Akkadian nadānu', 'Ugaritic ytn'] },
  'לקח': { meaning: 'to take', cognates: ['Akkadian leqû'] },
  'הלך': { meaning: 'to go/walk', cognates: ['Akkadian alāku', 'Aramaic אֲזַל'] },
  'בוא': { meaning: 'to come/enter', cognates: ['Akkadian erēbu'] },
  'יצא': { meaning: 'to go out', cognates: ['Akkadian aṣû', 'Arabic kharaja'] },
  'שוב': { meaning: 'to return', cognates: ['Akkadian târu'] },
  'כתב': { arabic: 'kataba', meaning: 'to write', cognates: ['Arabic kataba', 'Ugaritic ktb'] },
  'שמר': { arabic: 'samar', meaning: 'to guard/keep', cognates: ['Arabic samara', 'Akkadian naṣāru'] },
  'אהב': { meaning: 'to love', cognates: ['Ugaritic ʾahb', 'Akkadian rāmu'] },
  'ירא': { meaning: 'to fear', cognates: ['Akkadian palāḫu'] },
  'חיה': { arabic: 'ḥayy', meaning: 'to live', cognates: ['Arabic ḥayy', 'Akkadian balāṭu'] },
  'מות': { arabic: 'māt', meaning: 'to die', cognates: ['Arabic māta', 'Akkadian mâtu', 'Ugaritic mwt'] },

  // === Body Parts ===
  'ראש': { arabic: 'raʾs', meaning: 'head', cognates: ['Arabic raʾs', 'Akkadian rēšu'] },
  'יד': { arabic: 'yad', meaning: 'hand', cognates: ['Arabic yad', 'Akkadian idu'] },
  'עין': { arabic: 'ʿayn', meaning: 'eye', cognates: ['Arabic ʿayn', 'Akkadian īnu'] },
  'אזן': { arabic: 'ʾudhun', meaning: 'ear', cognates: ['Arabic ʾudhun', 'Akkadian uznu'] },
  'פה': { arabic: 'fam', meaning: 'mouth', cognates: ['Arabic fam', 'Akkadian pû'] },
  'לב': { arabic: 'lubb', meaning: 'heart', cognates: ['Arabic lubb', 'Akkadian libbu'] },
  'נפש': { arabic: 'nafs', meaning: 'soul/breath', cognates: ['Arabic nafs', 'Akkadian napištu'] },
  'בשר': { arabic: 'basar', meaning: 'flesh/meat', cognates: ['Arabic basar', 'Akkadian bišru'] },
  'דם': { arabic: 'dam', meaning: 'blood', cognates: ['Arabic dam', 'Akkadian damu'] },

  // === Numbers ===
  'אחד': { arabic: 'ʾaḥad', meaning: 'one', cognates: ['Arabic ʾaḥad', 'Akkadian ištēn'] },
  'שנים': { meaning: 'two', cognates: ['Arabic ithnān', 'Akkadian šina'] },
  'שלש': { arabic: 'thalāth', meaning: 'three', cognates: ['Arabic thalātha', 'Akkadian šalāš'] },
  'שבע': { arabic: 'sabʿ', meaning: 'seven', cognates: ['Arabic sabʿa', 'Akkadian sebe'] },
  'עשר': { arabic: 'ʿashr', meaning: 'ten', cognates: ['Arabic ʿashr', 'Akkadian ešer'] },
  'מאה': { arabic: 'miʾa', meaning: 'hundred', cognates: ['Arabic miʾa', 'Akkadian mēʾatu'] },

  // === Food & Agriculture ===
  'לחם': { arabic: 'laḥm', meaning: 'bread/food', cognates: ['Arabic laḥm (meat)', 'Ugaritic lḥm'] },
  'יין': { meaning: 'wine', cognates: ['Greek oinos', 'Akkadian īnu'] },
  'שמן': { arabic: 'samn', meaning: 'oil', cognates: ['Arabic samn', 'Akkadian šamnu'] },
  'חלב': { arabic: 'ḥalīb', meaning: 'milk', cognates: ['Arabic ḥalīb', 'Akkadian ḫalābu'] },
  'דבש': { meaning: 'honey', cognates: ['Arabic dibs'] },
  'שדה': { meaning: 'field', cognates: ['Akkadian šadû (mountain)', 'Ugaritic šd'] },
  'כרם': { arabic: 'karm', meaning: 'vineyard', cognates: ['Arabic karm', 'Akkadian karmu'] },

  // === Animals ===
  'צאן': { arabic: 'ḍaʾn', meaning: 'sheep/flock', cognates: ['Arabic ḍaʾn', 'Akkadian ṣēnu'] },
  'בקר': { arabic: 'baqar', meaning: 'cattle', cognates: ['Arabic baqar', 'Akkadian alpu'] },
  'סוס': { meaning: 'horse', cognates: ['Akkadian sisû'] },
  'חמור': { arabic: 'ḥimār', meaning: 'donkey', cognates: ['Arabic ḥimār', 'Akkadian imēru'] },
  'כלב': { arabic: 'kalb', meaning: 'dog', cognates: ['Arabic kalb', 'Akkadian kalbu'] },

  // === Ritual & Temple ===
  'זבח': { arabic: 'dhabaḥa', meaning: 'sacrifice', cognates: ['Arabic dhabaḥa', 'Akkadian zibbu'] },
  'קרבן': { meaning: 'offering', cognates: ['From קרב (to draw near)'] },
  'מזבח': { meaning: 'altar', cognates: ['From זבח (sacrifice)'] },
  'משכן': { meaning: 'tabernacle', cognates: ['From שכן (to dwell)', 'Akkadian maškanu'] },
  'ארון': { meaning: 'ark/chest', cognates: ['Akkadian arānu'] },
};

// =============================================================================
// HEBREW GRAMMAR REFERENCE (Gesenius-based)
// =============================================================================

const BINYAN_INFO = {
  'קל': {
    name: 'Qal (Pa\'al)',
    latin: 'Qal',
    meaning: 'Simple active',
    description: 'Basic stem, simple action',
    example: 'שָׁמַר (he guarded)',
    frequency: 'Most common (~70%)'
  },
  'נפעל': {
    name: 'Nif\'al',
    latin: 'Niphal',
    meaning: 'Simple passive/reflexive',
    description: 'Passive or reflexive of Qal',
    example: 'נִשְׁמַר (he was guarded)',
    frequency: 'Common'
  },
  'פיעל': {
    name: 'Pi\'el',
    latin: 'Piel',
    meaning: 'Intensive active',
    description: 'Intensive, causative, or denominative',
    example: 'שִׁמֵּר (he guarded carefully)',
    frequency: 'Common'
  },
  'פועל': {
    name: 'Pu\'al',
    latin: 'Pual',
    meaning: 'Intensive passive',
    description: 'Passive of Pi\'el',
    example: 'שֻׁמַּר (he was guarded carefully)',
    frequency: 'Less common'
  },
  'הפעיל': {
    name: 'Hif\'il',
    latin: 'Hiphil',
    meaning: 'Causative active',
    description: 'Causative - making someone do action',
    example: 'הִשְׁמִיר (he caused to guard)',
    frequency: 'Common'
  },
  'הופעל': {
    name: 'Hof\'al',
    latin: 'Hophal',
    meaning: 'Causative passive',
    description: 'Passive of Hif\'il',
    example: 'הָשְׁמַר (he was made to guard)',
    frequency: 'Rare'
  },
  'התפעל': {
    name: 'Hitpa\'el',
    latin: 'Hitpael',
    meaning: 'Reflexive/reciprocal',
    description: 'Reflexive action or mutual action',
    example: 'הִשְׁתַּמֵּר (he guarded himself)',
    frequency: 'Fairly common'
  }
};

const VERB_TENSES = {
  'עבר': { name: 'Perfect (Qatal)', description: 'Completed action', english: 'Past tense' },
  'עתיד': { name: 'Imperfect (Yiqtol)', description: 'Incomplete action', english: 'Future/Present' },
  'ציווי': { name: 'Imperative', description: 'Command', english: 'Command' },
  'שם הפועל': { name: 'Infinitive', description: 'Verbal noun', english: 'To + verb' },
  'בינוני': { name: 'Participle', description: 'Verbal adjective', english: '-ing form' }
};

// =============================================================================
// WORD CLEANING UTILITIES
// =============================================================================

const cleanWord = (word) => {
  if (!word || typeof word !== 'string') return '';
  return word
    .replace(/[\u0591-\u05AF]/g, '')  // Remove cantillation (te'amim)
    .replace(/[\u05B0-\u05BD\u05BF-\u05C7]/g, '') // Remove vowel points (nikud)
    .replace(/[^\u05D0-\u05EA]/g, '') // Keep only Hebrew letters
    .trim();
};

const extractRoot = (word) => {
  const cleaned = cleanWord(word);
  if (cleaned.length <= 3) return cleaned;

  // Simple root extraction - remove common prefixes/suffixes
  let root = cleaned;

  // Remove common prefixes
  const prefixes = ['וי', 'הת', 'ה', 'ו', 'ל', 'ב', 'מ', 'כ', 'ש'];
  for (const prefix of prefixes) {
    if (root.startsWith(prefix) && root.length > prefix.length + 2) {
      root = root.slice(prefix.length);
      break;
    }
  }

  // Remove common suffixes
  const suffixes = ['ים', 'ות', 'תי', 'נו', 'תם', 'ה', 'ו'];
  for (const suffix of suffixes) {
    if (root.endsWith(suffix) && root.length > suffix.length + 2) {
      root = root.slice(0, -suffix.length);
      break;
    }
  }

  return root.length >= 2 && root.length <= 4 ? root : cleaned.slice(0, 3);
};

// =============================================================================
// SEFARIA API INTEGRATION
// =============================================================================

/**
 * Fetch comprehensive lexicon data from Sefaria
 */
const fetchSefariaLexicon = async (word) => {
  const cleaned = cleanWord(word);
  if (!cleaned || cleaned.length < 2) return null;

  try {
    const response = await fetch(`${SEFARIA_BASE}/words/${encodeURIComponent(cleaned)}`);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.warn('Sefaria lexicon fetch failed:', error.message);
    return null;
  }
};

/**
 * Fetch word lookup from Sefaria's alternative API endpoint
 * Tries multiple endpoints for better coverage
 */
const fetchSefariaWordAlternative = async (word) => {
  const cleaned = cleanWord(word);
  if (!cleaned || cleaned.length < 2) return null;

  // Try the lexicon lookup API
  try {
    const response = await fetch(`${SEFARIA_BASE}/lexicon/${encodeURIComponent(cleaned)}`);
    if (response.ok) {
      const data = await response.json();
      if (data && (Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0)) {
        return Array.isArray(data) ? data : [data];
      }
    }
  } catch (error) {
    // Silent fallback
  }

  // Try Steinsaltz dictionary specifically for Aramaic
  try {
    const response = await fetch(`${SEFARIA_BASE}/words/${encodeURIComponent(cleaned)}?lookup_ref=Steinsaltz`);
    if (response.ok) {
      const data = await response.json();
      if (data && Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
  } catch (error) {
    // Silent fallback
  }

  return null;
};

/**
 * Fetch from Bolls.life Bible Dictionary API (BDB/Thayer's)
 * Additional online source for Hebrew-English translations
 * API: https://bolls.life/dictionary-definition/BDBT/{word}/
 */
const fetchBollsLifeDefinition = async (word) => {
  const cleaned = cleanWord(word);
  if (!cleaned || cleaned.length < 2) return null;

  try {
    const response = await fetch(
      `https://bolls.life/dictionary-definition/BDBT/${encodeURIComponent(cleaned)}/`,
      {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(8000)
      }
    );

    if (!response.ok) return null;

    const data = await response.json();

    // Bolls.life returns dictionary entries
    if (data && (data.definition || data.meaning || data.definitions)) {
      return {
        source: 'Bolls.life',
        fullName: 'Bolls.life BDB Dictionary',
        definition: cleanDefinitionText(data.definition || data.meaning || ''),
        definitions: Array.isArray(data.definitions)
          ? data.definitions.map(d => cleanDefinitionText(d)).filter(Boolean)
          : [],
        strongNumber: data.strong_number || data.strongNumber || null,
        partOfSpeech: data.pos || data.part_of_speech || null
      };
    }

    return null;
  } catch (error) {
    // Silent fallback - Bolls.life may not have all words
    return null;
  }
};

/**
 * Fetch from STEP Bible Lexicon API
 * Scripture Tools for Every Person - provides Strong's definitions
 * API: https://stepbibleguide.blogspot.com/p/api.html
 */
const fetchStepBibleDefinition = async (strongNumber) => {
  if (!strongNumber) return null;

  // Normalize Strong's number (H1234 format)
  const normalized = strongNumber.toString().toUpperCase().replace(/^H?/, 'H');

  try {
    const response = await fetch(
      `https://www.stepbible.org/rest/module/getAllStrongs/hebrewStrong_vocabulary/${normalized}`,
      {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(8000)
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    if (data && data.length > 0) {
      const entry = data[0];
      return {
        source: 'STEP Bible',
        fullName: 'Scripture Tools for Every Person',
        definition: cleanDefinitionText(entry.gloss || entry.stepGloss || ''),
        strongNumber: entry.strongNumber || normalized,
        transliteration: entry.stepTransliteration || entry.transliteration || null
      };
    }

    return null;
  } catch (error) {
    return null;
  }
};

// =============================================================================
// NOTE: Modern Hebrew sources (Morfix, Pealim, Wiktionary, Milog) removed
// This service focuses on scholarly Biblical/Talmudic sources:
// BDB, Jastrow, Strong's, HALOT, Klein, Gesenius, TWOT, Steinsaltz, STEP Bible
// =============================================================================

/**
 * Parse lexicon entries by source
 * Handles all Sefaria lexicon naming conventions
 */
const parseBySource = (data) => {
  if (!data || !Array.isArray(data)) {
    return { bdb: [], jastrow: [], strong: [], klein: [], steinsaltz: [], sefaria: [], halot: [], gesenius: [], twot: [], other: [] };
  }

  const bySource = {
    bdb: [],
    jastrow: [],
    strong: [],
    klein: [],
    steinsaltz: [],
    sefaria: [],
    halot: [],
    gesenius: [],
    twot: [],
    other: []
  };

  for (const entry of data) {
    const lexicon = (entry.parent_lexicon || '').toLowerCase();

    // BDB - Brown-Driver-Briggs (various naming formats)
    if (lexicon.includes('bdb') || lexicon.includes('brown') ||
        lexicon.includes('driver') || lexicon.includes('briggs') ||
        lexicon.includes('hebrew and english lexicon')) {
      bySource.bdb.push(entry);
    }
    // Jastrow - Aramaic/Talmudic dictionary
    else if (lexicon.includes('jastrow')) {
      bySource.jastrow.push(entry);
    }
    // Steinsaltz - Modern Talmud translation
    else if (lexicon.includes('steinsaltz') || lexicon.includes('koren')) {
      bySource.steinsaltz.push(entry);
    }
    // HALOT - Hebrew and Aramaic Lexicon of the Old Testament
    else if (lexicon.includes('halot') || lexicon.includes('hebrew and aramaic lexicon')) {
      bySource.halot.push(entry);
    }
    // Gesenius - Hebrew Grammar and Lexicon
    else if (lexicon.includes('gesenius') || lexicon.includes('gkc')) {
      bySource.gesenius.push(entry);
    }
    // TWOT - Theological Wordbook of the Old Testament
    else if (lexicon.includes('twot') || lexicon.includes('theological wordbook')) {
      bySource.twot.push(entry);
    }
    // Strong's Concordance (various formats including "BDB Augmented Strong")
    else if (lexicon.includes('strong')) {
      // If it's "BDB Augmented Strong", also add to BDB
      if (lexicon.includes('bdb') || lexicon.includes('augmented')) {
        bySource.bdb.push(entry);
      }
      bySource.strong.push(entry);
    }
    // Klein's Etymological Dictionary
    else if (lexicon.includes('klein') || lexicon.includes('etymolog')) {
      bySource.klein.push(entry);
    }
    // Sefaria's own lexicon
    else if (lexicon.includes('sefaria')) {
      bySource.sefaria.push(entry);
    }
    // Targum/Talmud/Midrash sources (likely Aramaic)
    else if (lexicon.includes('targum') || lexicon.includes('talmud') || lexicon.includes('midrash')) {
      bySource.jastrow.push(entry);
    }
    // Other sources
    else {
      bySource.other.push(entry);
    }
  }

  return bySource;
};

/**
 * Extract definitions from entry content
 * Handles all Sefaria lexicon entry formats
 * Cleans HTML and scholarly notation from all definitions
 * Uses special extraction for Jastrow entries
 * @param {object} entry - Lexicon entry
 * @param {boolean} isJastrow - Whether this is a Jastrow entry (requires special handling)
 */
const extractDefinitions = (entry, isJastrow = false) => {
  const definitions = [];

  if (!entry) return definitions;

  /**
   * Add a definition if it's valid and not a duplicate
   */
  const addDefinition = (text, extras = {}) => {
    // Use special Jastrow extraction for Jastrow entries
    const cleaned = isJastrow ? extractJastrowMeaning(text) : cleanDefinitionText(text);
    if (!cleaned || cleaned.length < 2) return;
    // Skip if it's just grammatical markers
    if (/^(?:[mfn]\.|ch\.|adj\.|v\.)$/i.test(cleaned)) return;
    // Skip if already exists (check first 40 chars for dedup)
    const normalized = cleaned.toLowerCase().slice(0, 40);
    if (definitions.find(d => d.text.toLowerCase().slice(0, 40) === normalized)) return;
    definitions.push({ text: cleaned, ...extras });
  };

  // First check for short_definition (quick summary) - often the cleanest
  if (entry.short_definition) {
    const shortDef = cleanDefinitionText(entry.short_definition);
    if (shortDef && shortDef.length >= 3) {
      definitions.push({ text: shortDef, isShort: true });
    }
  }

  // Handle structured content with senses (BDB Augmented Strong format)
  if (entry.content?.senses) {
    for (const sense of entry.content.senses) {
      if (sense.definition) {
        addDefinition(sense.definition, {
          grammar: sense.grammar || null,
          notes: sense.notes || null
        });
      }
      // Nested senses
      if (sense.senses) {
        for (const subSense of sense.senses) {
          if (subSense.definition) {
            addDefinition(subSense.definition, {
              grammar: subSense.grammar || null,
              notes: subSense.notes || null,
              isSubsense: true
            });
          }
        }
      }
    }
  }

  // Handle direct definition field
  if (entry.definition) {
    const defText = typeof entry.definition === 'string'
      ? entry.definition
      : JSON.stringify(entry.definition);
    addDefinition(defText);
  }

  // Handle string content (HTML) - common in Jastrow entries
  if (typeof entry.content === 'string') {
    addDefinition(entry.content, { raw: true });
  }

  // Handle 'definitions' array if present
  if (Array.isArray(entry.definitions)) {
    for (const def of entry.definitions) {
      const defText = typeof def === 'string' ? def : def?.text;
      addDefinition(defText);
    }
  }

  // Handle BDB/Jastrow specific fields
  if (entry.BDB) {
    addDefinition(entry.BDB, { source: 'BDB' });
  }
  if (entry.Jastrow) {
    const jastrowDef = extractJastrowMeaning(entry.Jastrow);
    if (jastrowDef) {
      definitions.push({ text: jastrowDef, source: 'Jastrow' });
    }
  }

  return definitions;
};

// =============================================================================
// MAIN SCHOLARLY LOOKUP FUNCTION
// =============================================================================

/**
 * Generate word form variants for lookup
 * Handles prefixes, suffixes, plural forms, construct states, verb conjugations
 * Enhanced for better Torah Hebrew matching
 */
const generateWordForms = (word) => {
  const forms = new Set([word]);

  // Common Hebrew prefixes (articles, prepositions, conjunctions)
  const prefixes = [
    'וה', 'ול', 'וב', 'ומ', 'וכ', 'וש', // Vav + other prefix
    'שה', 'של', 'שב', 'שמ', 'שכ',       // Shin (that) + prefix
    'מה', 'לה', 'בה', 'כה',              // Prefix + article
    'ה',   // Definite article
    'ו',   // Vav (and)
    'ל',   // Lamed (to/for)
    'ב',   // Bet (in/with)
    'מ',   // Mem (from)
    'כ',   // Kaf (like/as)
    'ש',   // Shin (that/which)
  ];

  // Common Hebrew/Aramaic suffixes
  const suffixes = [
    'ותיהם', 'ותיהן', 'יהם', 'יהן',     // Compound suffixes
    'ותיו', 'ותיך', 'ותינו',              // More compounds
    'ות',  // feminine plural
    'ים',  // masculine plural
    'ין',  // Aramaic masculine plural
    'יא',  // Aramaic definite plural
    'תא',  // Aramaic definite feminine
    'א',   // Aramaic definite
    'ה',   // feminine singular / directive he
    'ת',   // feminine construct
    'י',   // construct state / 1st person
    'יו',  // 3rd person masc singular suffix
    'יה',  // 3rd person fem singular suffix
    'נו',  // 1st person plural suffix
    'ך',   // 2nd person masc suffix
    'כם',  // 2nd person masc plural suffix
    'כן',  // 2nd person fem plural suffix
    'הם',  // 3rd person masc plural suffix
    'הן',  // 3rd person fem plural suffix
    'ני',  // me (object suffix)
    'ם',   // them (short form)
    'ן',   // them fem (short form)
  ];

  // Verb conjugation prefixes (future tense / vav-conversive)
  const verbPrefixes = [
    'וי', 'ות', 'וא', 'ונ',  // Vav-conversive patterns
    'י', 'ת', 'א', 'נ',      // Future tense prefixes
  ];

  // Verb conjugation suffixes (past tense / imperatives)
  const verbSuffixes = [
    'תי', 'ת', 'תם', 'תן', 'נו', 'ו', 'ה', 'י', 'ו', 'נה',
  ];

  // Step 1: Try removing prefixes
  for (const prefix of prefixes) {
    if (word.startsWith(prefix) && word.length > prefix.length + 2) {
      const stem = word.slice(prefix.length);
      forms.add(stem);
    }
  }

  // Step 2: Try removing suffixes
  for (const suffix of suffixes) {
    if (word.endsWith(suffix) && word.length > suffix.length + 2) {
      const stem = word.slice(0, -suffix.length);
      forms.add(stem);

      // For feminine plural (ות), try adding ה for singular
      if (suffix === 'ות') {
        forms.add(stem + 'ה');
      }
      // For masculine plural (ים), try base form
      if (suffix === 'ים') {
        forms.add(stem);
        // Also try with ה ending (some words drop ה before ים)
        forms.add(stem + 'ה');
      }
    }
  }

  // Step 3: Try verb patterns (remove prefix AND suffix)
  for (const vPrefix of verbPrefixes) {
    if (word.startsWith(vPrefix) && word.length > vPrefix.length + 2) {
      const withoutPrefix = word.slice(vPrefix.length);
      forms.add(withoutPrefix);

      for (const vSuffix of verbSuffixes) {
        if (withoutPrefix.endsWith(vSuffix) && withoutPrefix.length > vSuffix.length + 2) {
          forms.add(withoutPrefix.slice(0, -vSuffix.length));
        }
      }
    }
  }

  // Step 4: Binyan (verb stem) patterns
  // Hif'il: remove leading ה and possibly middle י
  if (word.length >= 4 && word.startsWith('ה')) {
    const withoutH = word.slice(1);
    forms.add(withoutH);
    // Handle הגדיל -> גדל pattern
    if (withoutH.length === 3) {
      forms.add(withoutH);
    } else if (withoutH.length === 4 && withoutH[1] === 'י') {
      forms.add(withoutH[0] + withoutH.slice(2));
    }
  }

  // Hitpa'el: remove leading הת
  if (word.length >= 5 && word.startsWith('הת')) {
    forms.add(word.slice(2));
  }

  // Nif'al: remove leading נ
  if (word.length >= 4 && word.startsWith('נ')) {
    forms.add(word.slice(1));
  }

  // Step 5: Extract 3-letter root
  const root = extractRoot(word);
  if (root && root.length >= 3) {
    forms.add(root);
  }

  // Step 6: Combination - prefix AND suffix removal
  for (const prefix of prefixes.slice(0, 7)) { // Try common prefixes
    if (word.startsWith(prefix) && word.length > prefix.length + 3) {
      const withoutPrefix = word.slice(prefix.length);
      for (const suffix of suffixes.slice(0, 8)) { // Try common suffixes
        if (withoutPrefix.endsWith(suffix) && withoutPrefix.length > suffix.length + 2) {
          forms.add(withoutPrefix.slice(0, -suffix.length));
        }
      }
    }
  }

  return Array.from(forms);
};

/**
 * Comprehensive scholarly word lookup
 * Tries multiple word forms if exact match not found
 * @param {string} word - Hebrew/Aramaic word
 * @returns {Promise<object>} Full scholarly analysis
 */
export const scholarlyLookup = async (word) => {
  const cleaned = cleanWord(word);
  if (!cleaned || cleaned.length < 2) return null;

  const cacheKey = `scholarly:${cleaned}`;
  const cached = scholarlyCache.get(cacheKey);
  if (cached) return cached;

  // Generate word forms to try
  const wordForms = generateWordForms(cleaned);

  // Try each form until we find results
  let sefariaData = null;
  let matchedForm = cleaned;

  for (const form of wordForms) {
    const data = await fetchSefariaLexicon(form);
    if (data && Array.isArray(data) && data.length > 0) {
      sefariaData = data;
      matchedForm = form;
      break;
    }
  }

  // If no results from main API, try alternative endpoints
  if (!sefariaData || sefariaData.length === 0) {
    for (const form of wordForms.slice(0, 3)) { // Try first 3 forms only
      const altData = await fetchSefariaWordAlternative(form);
      if (altData && altData.length > 0) {
        sefariaData = altData;
        matchedForm = form;
        break;
      }
    }
  }

  const bySource = parseBySource(sefariaData);

  // Try Bolls.life API as additional source (if no BDB results from Sefaria)
  let bollsResult = null;
  if (bySource.bdb.length === 0) {
    for (const form of wordForms.slice(0, 2)) { // Try first 2 forms
      bollsResult = await fetchBollsLifeDefinition(form);
      if (bollsResult && bollsResult.definition) {
        break;
      }
    }
  }

  // Try STEP Bible if we have a Strong's number (primary scholarly source)
  let stepBibleResult = null;
  const strongNumber = bySource.strong?.[0]?.strong_number || bollsResult?.strongNumber;
  if (strongNumber) {
    try {
      stepBibleResult = await fetchStepBibleDefinition(strongNumber);
    } catch (e) { /* silent */ }
  }

  // Check if we have scholarly results
  const hasResults = bySource.bdb.length > 0 || bySource.jastrow.length > 0 ||
                     bySource.strong.length > 0 || bySource.klein.length > 0 ||
                     bySource.steinsaltz?.length > 0 || bySource.sefaria?.length > 0 ||
                     bySource.halot?.length > 0 || bySource.gesenius?.length > 0 ||
                     bySource.twot?.length > 0 || (bollsResult && bollsResult.definition) ||
                     (stepBibleResult && stepBibleResult.definition);

  // Build comprehensive result
  const result = {
    word: word,
    cleaned: cleaned,
    matchedForm: hasResults || bySource.other?.length > 0 ? matchedForm : null,
    root: extractRoot(cleaned),
    timestamp: Date.now(),

    // Dictionary entries by source
    sources: {
      bdb: bySource.bdb.length > 0 ? {
        source: SCHOLARLY_SOURCES.BDB,
        headword: bySource.bdb[0]?.headword || cleaned,
        definitions: bySource.bdb.flatMap(extractDefinitions),
        morphology: bySource.bdb[0]?.content?.morphology || null,
        strongNumber: bySource.bdb[0]?.strong_number || null
      } : null,

      jastrow: bySource.jastrow.length > 0 ? {
        source: SCHOLARLY_SOURCES.JASTROW,
        headword: bySource.jastrow[0]?.headword || cleaned,
        definitions: bySource.jastrow.flatMap(entry => extractDefinitions(entry, true)), // true = isJastrow
        language: 'Aramaic'
      } : null,

      strong: bySource.strong.length > 0 ? {
        source: SCHOLARLY_SOURCES.STRONG,
        strongNumber: bySource.strong[0]?.strong_number || null,
        headword: bySource.strong[0]?.headword || cleaned,
        definitions: bySource.strong.flatMap(extractDefinitions)
      } : null,

      klein: bySource.klein.length > 0 ? {
        source: SCHOLARLY_SOURCES.KLEIN,
        definitions: bySource.klein.flatMap(extractDefinitions),
        etymology: bySource.klein[0]?.etymology || null
      } : null,

      steinsaltz: bySource.steinsaltz?.length > 0 ? {
        source: SCHOLARLY_SOURCES.STEINSALTZ,
        headword: bySource.steinsaltz[0]?.headword || cleaned,
        definitions: bySource.steinsaltz.flatMap(entry => extractDefinitions(entry, true)), // true = isJastrow (similar format)
        language: 'Aramaic'
      } : null,

      sefaria: bySource.sefaria?.length > 0 ? {
        source: SCHOLARLY_SOURCES.SEFARIA,
        headword: bySource.sefaria[0]?.headword || cleaned,
        definitions: bySource.sefaria.flatMap(extractDefinitions)
      } : null,

      // HALOT - Hebrew and Aramaic Lexicon of the Old Testament
      halot: bySource.halot?.length > 0 ? {
        source: SCHOLARLY_SOURCES.HALOT,
        headword: bySource.halot[0]?.headword || cleaned,
        definitions: bySource.halot.flatMap(extractDefinitions)
      } : null,

      // Gesenius - Classical Hebrew Grammar & Lexicon
      gesenius: bySource.gesenius?.length > 0 ? {
        source: SCHOLARLY_SOURCES.GESENIUS,
        headword: bySource.gesenius[0]?.headword || cleaned,
        definitions: bySource.gesenius.flatMap(extractDefinitions)
      } : null,

      // TWOT - Theological Wordbook of the Old Testament
      twot: bySource.twot?.length > 0 ? {
        source: SCHOLARLY_SOURCES.TWOT,
        headword: bySource.twot[0]?.headword || cleaned,
        definitions: bySource.twot.flatMap(extractDefinitions)
      } : null,

      // Bolls.life BDB API (additional online source)
      bolls: bollsResult ? {
        source: SCHOLARLY_SOURCES.BOLLS,
        headword: cleaned,
        definitions: [
          ...(bollsResult.definition ? [{ text: bollsResult.definition }] : []),
          ...(bollsResult.definitions || []).map(d => ({ text: d }))
        ].filter(d => d.text),
        strongNumber: bollsResult.strongNumber || null,
        partOfSpeech: bollsResult.partOfSpeech || null
      } : null,

      // STEP Bible - Scripture Tools for Every Person (Strong's definitions)
      step: stepBibleResult ? {
        source: SCHOLARLY_SOURCES.STEP,
        headword: cleaned,
        definitions: stepBibleResult.definition ? [{ text: stepBibleResult.definition }] : [],
        strongNumber: stepBibleResult.strongNumber || strongNumber || null,
        transliteration: stepBibleResult.transliteration || null
      } : null,

      // Include other sources (miscellaneous lexicons)
      other: bySource.other?.length > 0 ? bySource.other.map(entry => ({
        lexicon: entry.parent_lexicon || 'Unknown',
        headword: entry.headword || cleaned,
        definitions: extractDefinitions(entry)
      })) : null
    },

    // Cognate analysis
    cognates: getCognateInfo(cleaned),

    // Grammar info
    grammar: getGrammarInfo(cleaned, bySource),

    // Summary for display
    primaryDefinition: getPrimaryDefinition(bySource, bollsResult, {
      step: stepBibleResult
    }),

    // Detected language
    language: bySource.jastrow.length > 0 || bySource.steinsaltz?.length > 0 ? 'Aramaic' : 'Hebrew',

    // Raw data for debugging (can be removed in production)
    _rawEntryCount: sefariaData?.length || 0
  };

  scholarlyCache.set(cacheKey, result);
  return result;
};

/**
 * Get cognate information for a root
 */
const getCognateInfo = (word) => {
  const root = extractRoot(word);
  const pattern = COGNATE_PATTERNS[root];

  if (pattern) {
    return {
      root: root,
      cognates: pattern.cognates || [],
      arabicCognate: pattern.arabic || null,
      semanticField: pattern.meaning || null
    };
  }

  return null;
};

/**
 * Get grammar information - Enhanced binyan detection
 */
const getGrammarInfo = (word, bySource) => {
  const morphology = bySource.bdb?.[0]?.content?.morphology ||
                     bySource.strong?.[0]?.content?.morphology ||
                     bySource.other?.[0]?.content?.morphology;

  const info = {
    morphology: morphology || null,
    partOfSpeech: null,
    binyan: null,
    stem: null,
    gender: null,
    number: null,
    state: null,
    person: null,
    tense: null
  };

  // Detect binyan from word form patterns
  const cleaned = cleanWord(word);
  if (cleaned) {
    // Hitpa'el: התפעל pattern
    if (cleaned.startsWith('הת') && cleaned.length >= 5) {
      info.binyan = 'Hitpael';
      info.partOfSpeech = 'verb';
    }
    // Hif'il: הפעיל pattern
    else if (cleaned.startsWith('ה') && cleaned.length >= 4) {
      // Check for hif'il markers (often has י in middle)
      if (cleaned.length === 5 && cleaned[2] === 'י') {
        info.binyan = 'Hiphil';
        info.partOfSpeech = 'verb';
      }
    }
    // Nif'al: נפעל pattern
    else if (cleaned.startsWith('נ') && cleaned.length >= 4) {
      info.binyan = 'Niphal';
      info.partOfSpeech = 'verb';
    }
    // Pi'el/Pu'al: doubled middle letter
    else if (cleaned.length === 4 && cleaned[1] === cleaned[2]) {
      info.binyan = 'Piel';
      info.partOfSpeech = 'verb';
    }
  }

  // Parse morphology string if available
  if (morphology) {
    const morphLower = morphology.toLowerCase();

    // Part of speech
    if (morphLower.includes('verb')) info.partOfSpeech = 'verb';
    else if (morphLower.includes('noun')) info.partOfSpeech = 'noun';
    else if (morphLower.includes('adjective') || morphLower.includes('adj.')) info.partOfSpeech = 'adjective';
    else if (morphLower.includes('preposition') || morphLower.includes('prep.')) info.partOfSpeech = 'preposition';
    else if (morphLower.includes('adverb') || morphLower.includes('adv.')) info.partOfSpeech = 'adverb';
    else if (morphLower.includes('pronoun') || morphLower.includes('pron.')) info.partOfSpeech = 'pronoun';
    else if (morphLower.includes('particle')) info.partOfSpeech = 'particle';
    else if (morphLower.includes('conjunction') || morphLower.includes('conj.')) info.partOfSpeech = 'conjunction';
    else if (morphLower.includes('interjection')) info.partOfSpeech = 'interjection';
    else if (morphLower.includes('proper noun') || morphLower.includes('proper name')) info.partOfSpeech = 'proper noun';

    // Binyan detection from morphology text
    if (morphLower.includes('qal') || morphLower.includes('pa\'al')) info.binyan = 'Qal';
    else if (morphLower.includes('niphal') || morphLower.includes('nif\'al')) info.binyan = 'Niphal';
    else if (morphLower.includes('piel') || morphLower.includes('pi\'el')) info.binyan = 'Piel';
    else if (morphLower.includes('pual') || morphLower.includes('pu\'al')) info.binyan = 'Pual';
    else if (morphLower.includes('hiphil') || morphLower.includes('hif\'il') || morphLower.includes('hiph.')) info.binyan = 'Hiphil';
    else if (morphLower.includes('hophal') || morphLower.includes('hof\'al') || morphLower.includes('hoph.')) info.binyan = 'Hophal';
    else if (morphLower.includes('hitpael') || morphLower.includes('hitpa\'el') || morphLower.includes('hithp.')) info.binyan = 'Hitpael';
    // Aramaic stems
    else if (morphLower.includes('peal') || morphLower.includes('pe\'al')) info.binyan = 'Peal';
    else if (morphLower.includes('pael') || morphLower.includes('pa\'el')) info.binyan = 'Pael';
    else if (morphLower.includes('aphel') || morphLower.includes('af\'el')) info.binyan = 'Aphel';
    else if (morphLower.includes('ithpeel') || morphLower.includes('ithpe\'el')) info.binyan = 'Ithpeel';
    else if (morphLower.includes('ithpaal') || morphLower.includes('ithpa\'al')) info.binyan = 'Ithpaal';

    // Tense
    if (morphLower.includes('perfect') || morphLower.includes('perf.')) info.tense = 'Perfect';
    else if (morphLower.includes('imperfect') || morphLower.includes('impf.')) info.tense = 'Imperfect';
    else if (morphLower.includes('imperative') || morphLower.includes('imper.')) info.tense = 'Imperative';
    else if (morphLower.includes('infinitive') || morphLower.includes('inf.')) info.tense = 'Infinitive';
    else if (morphLower.includes('participle') || morphLower.includes('part.')) info.tense = 'Participle';
    else if (morphLower.includes('jussive')) info.tense = 'Jussive';
    else if (morphLower.includes('cohortative')) info.tense = 'Cohortative';

    // Gender
    if (morphLower.includes('masculine') || morphLower.includes('masc.') || morphLower.includes(' m.') || morphLower.includes(' m ')) {
      info.gender = 'masculine';
    } else if (morphLower.includes('feminine') || morphLower.includes('fem.') || morphLower.includes(' f.') || morphLower.includes(' f ')) {
      info.gender = 'feminine';
    }

    // Number
    if (morphLower.includes('plural') || morphLower.includes('plur.') || morphLower.includes(' pl.')) info.number = 'plural';
    else if (morphLower.includes('singular') || morphLower.includes('sing.') || morphLower.includes(' sg.')) info.number = 'singular';
    else if (morphLower.includes('dual')) info.number = 'dual';

    // State (construct vs absolute)
    if (morphLower.includes('construct') || morphLower.includes('const.') || morphLower.includes('cstr.')) info.state = 'construct';
    else if (morphLower.includes('absolute') || morphLower.includes('abs.')) info.state = 'absolute';

    // Person
    if (morphLower.includes('1st') || morphLower.includes('first')) info.person = '1st';
    else if (morphLower.includes('2nd') || morphLower.includes('second')) info.person = '2nd';
    else if (morphLower.includes('3rd') || morphLower.includes('third')) info.person = '3rd';
  }

  // Return null if no useful info found
  if (!info.partOfSpeech && !info.binyan && !info.morphology) return null;

  return info;
};

/**
 * Get primary definition for quick display
 * @param {object} bySource - Dictionary entries organized by source
 * @param {object} bollsResult - Optional Bolls.life API result
 * @param {object} additionalResults - Optional additional API results (wiktionary, morfix, pealim)
 */
const getPrimaryDefinition = (bySource, bollsResult = null, additionalResults = {}) => {
  // Prefer BDB for biblical Hebrew (most scholarly)
  if (bySource.bdb?.length > 0) {
    const defs = extractDefinitions(bySource.bdb[0]);
    if (defs.length > 0) {
      // Prefer non-short definitions if available
      const fullDef = defs.find(d => !d.isShort);
      return fullDef?.text || defs[0].text;
    }
  }

  // Then Strong's (widely used)
  if (bySource.strong?.length > 0) {
    const defs = extractDefinitions(bySource.strong[0]);
    if (defs.length > 0) {
      const fullDef = defs.find(d => !d.isShort);
      return fullDef?.text || defs[0].text;
    }
  }

  // Then Jastrow for Aramaic/Rabbinic (use isJastrow=true for proper cleaning)
  if (bySource.jastrow?.length > 0) {
    const defs = extractDefinitions(bySource.jastrow[0], true);
    if (defs.length > 0) {
      const fullDef = defs.find(d => !d.isShort);
      return fullDef?.text || defs[0].text;
    }
  }

  // Then Bolls.life (additional online BDB source)
  if (bollsResult?.definition) {
    return bollsResult.definition;
  }

  // Then STEP Bible (Strong's definitions)
  if (additionalResults.step?.definition) {
    return additionalResults.step.definition;
  }

  // Then Klein for etymology
  if (bySource.klein?.length > 0) {
    const defs = extractDefinitions(bySource.klein[0]);
    if (defs.length > 0) return defs[0].text;
  }

  // Then HALOT (modern scholarly)
  if (bySource.halot?.length > 0) {
    const defs = extractDefinitions(bySource.halot[0]);
    if (defs.length > 0) return defs[0].text;
  }

  // Then Gesenius (classical Hebrew grammar)
  if (bySource.gesenius?.length > 0) {
    const defs = extractDefinitions(bySource.gesenius[0]);
    if (defs.length > 0) return defs[0].text;
  }

  // Then TWOT (theological analysis)
  if (bySource.twot?.length > 0) {
    const defs = extractDefinitions(bySource.twot[0]);
    if (defs.length > 0) return defs[0].text;
  }

  // Finally any other source
  if (bySource.other?.length > 0) {
    const defs = extractDefinitions(bySource.other[0]);
    if (defs.length > 0) return defs[0].text;
  }

  return null;
};

// =============================================================================
// ADDITIONAL SCHOLARLY FUNCTIONS
// =============================================================================

/**
 * Get etymology and cognate analysis
 */
export const getEtymology = async (word) => {
  const root = extractRoot(cleanWord(word));
  const pattern = COGNATE_PATTERNS[root];

  return {
    root: root,
    pattern: pattern || null,
    cognateLanguages: COGNATE_LANGUAGES,
    analysis: pattern ? {
      arabicCognate: pattern.arabic,
      semanticCore: pattern.meaning,
      relatedWords: pattern.cognates
    } : null
  };
};

/**
 * Get Hebrew grammar reference (Gesenius-style)
 */
export const getGrammarReference = (binyan) => {
  return BINYAN_INFO[binyan] || null;
};

/**
 * Get all binyanim info
 */
export const getAllBinyanim = () => BINYAN_INFO;

/**
 * Get verb tense info
 */
export const getVerbTenses = () => VERB_TENSES;

/**
 * Search for word in biblical concordance
 */
export const searchConcordance = async (word, limit = 20) => {
  const cleaned = cleanWord(word);
  if (!cleaned || cleaned.length < 2) return { results: [], total: 0 };

  try {
    const response = await fetch(
      `${SEFARIA_BASE}/search-wrapper?q=${encodeURIComponent(cleaned)}&type=text&size=${limit}&filters[]=Tanakh`
    );

    if (!response.ok) return { results: [], total: 0 };

    const data = await response.json();

    return {
      word: cleaned,
      total: data.total || 0,
      results: (data.hits || []).map(hit => ({
        ref: hit.ref,
        heRef: hit.heRef,
        text: hit.text?.replace(/<[^>]*>/g, '').slice(0, 200) || '',
        book: hit.categories?.[1] || ''
      }))
    };
  } catch (error) {
    console.error('Concordance search failed:', error);
    return { results: [], total: 0 };
  }
};

/**
 * Get word frequency in Tanakh
 */
export const getWordFrequency = async (word) => {
  const concordance = await searchConcordance(word, 1);
  return {
    word: cleanWord(word),
    occurrences: concordance.total,
    isCommon: concordance.total > 50,
    isRare: concordance.total < 5
  };
};

/**
 * Format scholarly citation
 */
export const formatCitation = (source, entry) => {
  const sourceInfo = SCHOLARLY_SOURCES[source.toUpperCase()];
  if (!sourceInfo) return null;

  return {
    short: `${sourceInfo.abbreviation}`,
    full: `${sourceInfo.fullName} (${sourceInfo.year})`,
    academic: `${sourceInfo.abbreviation}, s.v. "${entry}"`,
    chicago: `"${entry}," in ${sourceInfo.fullName} (${sourceInfo.year})`
  };
};

// =============================================================================
// BATCH OPERATIONS
// =============================================================================

/**
 * Lookup multiple words with scholarly data
 */
export const batchScholarlyLookup = async (words) => {
  const results = new Map();
  const uniqueWords = [...new Set(words.map(cleanWord).filter(w => w.length >= 2))];

  // Process in batches
  const batchSize = 5;
  for (let i = 0; i < uniqueWords.length; i += batchSize) {
    const batch = uniqueWords.slice(i, i + batchSize);
    const promises = batch.map(async (word) => {
      const data = await scholarlyLookup(word);
      return { word, data };
    });

    const batchResults = await Promise.all(promises);
    for (const { word, data } of batchResults) {
      if (data) results.set(word, data);
    }

    // Rate limiting
    if (i + batchSize < uniqueWords.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return results;
};

// =============================================================================
// SIMPLE LOOKUP FUNCTIONS (for backward compatibility with sefariaLexiconService)
// =============================================================================

/**
 * Simple direct lookup - returns basic translation data
 * Compatible with sefariaLexiconService.lookupWordSefaria
 * @param {string} word - Hebrew/Aramaic word
 * @returns {Promise<object|null>} - Basic lookup result
 */
export const lookupWordSefaria = async (word) => {
  const cleaned = cleanWord(word);
  if (!cleaned || cleaned.length < 2) return null;

  try {
    const data = await fetchSefariaLexicon(cleaned);
    if (!data || !Array.isArray(data) || data.length === 0) return null;

    // Parse the first matching entry
    const entry = data[0];
    const definitions = [];
    let shortDefinition = null;

    // Extract definitions from content.senses
    if (entry.content?.senses) {
      for (const sense of entry.content.senses) {
        if (sense.definition) {
          definitions.push(cleanDefinitionText(sense.definition));
          if (!shortDefinition) {
            shortDefinition = cleanDefinitionText(sense.definition);
          }
        }
      }
    }

    // Fallback: use short_definition if available
    if (!shortDefinition && entry.short_definition) {
      shortDefinition = cleanDefinitionText(entry.short_definition);
    }

    // Determine language
    let language = 'Hebrew';
    if (entry.parent_lexicon?.toLowerCase().includes('jastrow') ||
        entry.parent_lexicon?.toLowerCase().includes('aramaic')) {
      language = 'Aramaic';
    }

    return {
      word: cleaned,
      headword: entry.headword || cleaned,
      definitions,
      shortDefinition,
      language,
      strongNumber: entry.strong_number || null,
      sources: entry.parent_lexicon ? [entry.parent_lexicon] : []
    };
  } catch (error) {
    console.warn('Simple Sefaria lookup failed:', error.message);
    return null;
  }
};

/**
 * Simple Jastrow-specific lookup
 * Compatible with sefariaLexiconService.lookupJastrow
 * @param {string} word - Aramaic word
 * @returns {Promise<object|null>} - Jastrow entry
 */
export const lookupJastrow = async (word) => {
  const cleaned = cleanWord(word);
  if (!cleaned || cleaned.length < 2) return null;

  try {
    // Use Jastrow-specific lookup
    const response = await fetch(`${SEFARIA_BASE}/words/${encodeURIComponent(cleaned)}?lookup_ref=Jastrow`);
    if (!response.ok) return null;

    const data = await response.json();
    if (!data || !Array.isArray(data) || data.length === 0) return null;

    // Filter for Jastrow entries
    const jastrowEntries = data.filter(e =>
      e.parent_lexicon?.toLowerCase().includes('jastrow')
    );

    if (jastrowEntries.length === 0) return null;

    const entry = jastrowEntries[0];
    const definitions = [];
    let shortDefinition = null;

    // Extract and clean definitions
    if (entry.content?.senses) {
      for (const sense of entry.content.senses) {
        if (sense.definition) {
          const cleaned = extractJastrowMeaning(sense.definition);
          if (cleaned) {
            definitions.push(cleaned);
            if (!shortDefinition) shortDefinition = cleaned;
          }
        }
      }
    }

    if (!shortDefinition && entry.short_definition) {
      shortDefinition = extractJastrowMeaning(entry.short_definition) ||
                        cleanDefinitionText(entry.short_definition);
    }

    return {
      word: cleaned,
      headword: entry.headword || cleaned,
      definitions,
      shortDefinition,
      language: 'Aramaic',
      source: 'Jastrow'
    };
  } catch (error) {
    console.warn('Jastrow lookup failed:', error.message);
    return null;
  }
};

/**
 * Get simple translation string
 * Compatible with sefariaLexiconService.getSimpleTranslation
 * @param {string} word - Hebrew/Aramaic word
 * @returns {Promise<string|null>} - Simple translation
 */
export const getSimpleTranslation = async (word) => {
  const result = await lookupWordSefaria(word);
  return result?.shortDefinition || result?.definitions?.[0] || null;
};

// =============================================================================
// EXPORT
// =============================================================================

const scholarlyLexiconService = {
  // Main lookup
  scholarlyLookup,
  batchScholarlyLookup,

  // Simple lookups (backward compatible with sefariaLexiconService)
  lookupWordSefaria,
  lookupJastrow,
  getSimpleTranslation,

  // Etymology & cognates
  getEtymology,

  // Grammar
  getGrammarReference,
  getAllBinyanim,
  getVerbTenses,

  // Concordance
  searchConcordance,
  getWordFrequency,

  // Citations
  formatCitation,

  // Reference data
  SCHOLARLY_SOURCES,
  COGNATE_LANGUAGES,
  BINYAN_INFO,
  VERB_TENSES,

  // Utils
  cleanWord,
  extractRoot
};

export default scholarlyLexiconService;
