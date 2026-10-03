// PRO SCHOLAR V6 — 9-11. Couches historiques, emprunts, anomalies grammaticales (split 03/10/2026)
import { stripVowels } from '../../../utils/hebrewUtils';

export const HISTORICAL_LAYERS = {
  biblical: {
    name: 'Biblical Hebrew',
    hebrew: 'עברית מקראית',
    period: 'c. 1200-200 BCE',
    sources: ['Torah', 'Prophets', 'Writings'],
    characteristics: ['archaic forms', 'poetic vocabulary', 'limited Aramaic influence']
  },
  latebiblical: {
    name: 'Late Biblical Hebrew',
    hebrew: 'עברית מקראית מאוחרת',
    period: 'c. 500-200 BCE',
    sources: ['Daniel', 'Ezra', 'Nehemiah', 'Chronicles', 'Esther'],
    characteristics: ['Persian loanwords', 'increased Aramaisms', 'new verb forms']
  },
  mishnaic: {
    name: 'Mishnaic Hebrew',
    hebrew: 'עברית משנאית',
    period: 'c. 70-200 CE',
    sources: ['Mishnah', 'Tosefta', 'Tannaitic Midrash'],
    characteristics: ['Greek/Latin loanwords', 'simplified syntax', 'new noun patterns']
  },
  amoraic: {
    name: 'Amoraic Period',
    hebrew: 'תקופת האמוראים',
    period: 'c. 200-500 CE',
    sources: ['Babylonian Talmud', 'Jerusalem Talmud', 'Amoraic Midrash'],
    characteristics: ['extensive Aramaic', 'technical halakhic terms', 'dialectal variation']
  },
  geonic: {
    name: 'Geonic Period',
    hebrew: 'תקופת הגאונים',
    period: 'c. 600-1000 CE',
    sources: ['Geonic Responsa', 'Halakhot Gedolot'],
    characteristics: ['Arabic influence', 'standardization', 'new technical terms']
  }
};

/**
 * Words with documented historical development - PRO SCHOLAR V6.2
 * Tracks semantic evolution through Biblical → Mishnaic → Talmudic → Geonic periods
 */
export const HISTORICAL_EVOLUTION = {
  // ============ CORE RELIGIOUS/LEGAL TERMS ============
  'תורה': {
    biblical: { meaning: 'instruction, teaching', context: 'general guidance from priest or sage' },
    mishnaic: { meaning: 'the Torah (Pentateuch)', context: 'specific reference to Five Books of Moses' },
    talmudic: { meaning: 'Torah study, halakhic tradition', context: 'entire body of Jewish law and learning' }
  },
  'הלכה': {
    biblical: { meaning: 'walking, way of life', context: 'from הלך (to walk)' },
    mishnaic: { meaning: 'legal ruling, accepted practice', context: 'technical halakhic term' },
    talmudic: { meaning: 'Jewish law as a system', context: 'comprehensive legal framework' }
  },
  'מדרש': {
    biblical: { meaning: 'inquiry, seeking', context: 'from דרש (to seek)' },
    mishnaic: { meaning: 'scriptural interpretation', context: 'method of exegesis' },
    talmudic: { meaning: 'collection of interpretations', context: 'genre of rabbinic literature' }
  },
  'משנה': {
    biblical: { meaning: 'repetition, second', context: 'from שנה (to repeat)' },
    mishnaic: { meaning: 'the Mishnah', context: 'Rabbi Judah HaNasi\'s legal compilation (~200 CE)' },
    talmudic: { meaning: 'a single teaching unit', context: 'paragraph of Mishnah = baraita contrast' }
  },
  'גמרא': {
    talmudic: { meaning: 'completion, study', context: 'Aramaic from גמר (to complete)' },
    geonic: { meaning: 'the Talmud itself', context: 'term for the entire work' }
  },
  'ברייתא': {
    mishnaic: { meaning: 'external teaching', context: 'Tannaitic material outside Mishnah' },
    talmudic: { meaning: 'authoritative source for argumentation', context: 'introduced by תניא or תנו רבנן' }
  },
  'אגדה': {
    biblical: { meaning: 'telling, narrative', context: 'from נגד (to tell)' },
    mishnaic: { meaning: 'non-legal teaching', context: 'ethical, homiletical material' },
    talmudic: { meaning: 'narrative/ethical sections', context: 'contrast with הלכה' }
  },

  // ============ INSTITUTIONAL TERMS ============
  'סנהדרין': {
    latebiblical: { meaning: 'council (Greek loan)', context: 'from Greek synedrion' },
    mishnaic: { meaning: 'Supreme Court of 71', context: 'specific halakhic institution' }
  },
  'בית דין': {
    biblical: { meaning: 'house of judgment', context: 'general court' },
    mishnaic: { meaning: 'rabbinic court', context: 'three judges for monetary, 23 for capital' },
    talmudic: { meaning: 'local rabbinic court', context: 'communal religious authority' }
  },
  'סנגור': {
    mishnaic: { meaning: 'defense attorney (Greek loan)', context: 'from Greek synegoros' }
  },
  'קטגור': {
    mishnaic: { meaning: 'prosecutor (Greek loan)', context: 'from Greek kategoros' }
  },

  // ============ LITURGICAL TERMS ============
  'תפילה': {
    biblical: { meaning: 'prayer, intercession', context: 'from פלל (to judge/intercede)' },
    mishnaic: { meaning: 'the Amidah (Shemoneh Esrei)', context: 'specific statutory prayer' },
    talmudic: { meaning: 'prayer generally', context: 'תפילת שחרית/מנחה/ערבית' }
  },
  'ברכה': {
    biblical: { meaning: 'blessing, gift', context: 'verbal blessing or material gift' },
    mishnaic: { meaning: 'liturgical formula', context: 'ברוך אתה ה\' format' },
    talmudic: { meaning: 'specific blessing types', context: 'ברכות הנהנין/המצוות/הודאה' }
  },
  'קדושה': {
    biblical: { meaning: 'holiness, sanctity', context: 'divine attribute' },
    mishnaic: { meaning: 'sanctification prayer', context: 'קדוש קדוש קדוש recitation' },
    talmudic: { meaning: 'liturgical section', context: 'part of Amidah repetition' }
  },

  // ============ LEGAL DOCUMENT TERMS ============
  'פרוזבול': {
    mishnaic: { meaning: 'legal document (Greek loan)', context: 'Hillel\'s enactment for debt collection' }
  },
  'גט': {
    biblical: { meaning: 'document', context: 'general written document' },
    mishnaic: { meaning: 'divorce document', context: 'specific halakhic instrument' },
    talmudic: { meaning: 'technical term for divorce', context: 'סדר גיטין' }
  },
  'כתובה': {
    biblical: { meaning: 'that which is written', context: 'from כתב (to write)' },
    mishnaic: { meaning: 'marriage contract', context: 'financial obligations document' },
    talmudic: { meaning: 'bride\'s financial rights', context: 'מנה מאתים or תוספת' }
  },
  'שטר': {
    biblical: { meaning: 'writing, document', context: 'general legal document' },
    mishnaic: { meaning: 'promissory note', context: 'legally binding financial instrument' },
    talmudic: { meaning: 'various legal documents', context: 'שטר חוב, שטר מכירה' }
  },

  // ============ PURITY TERMS ============
  'טמא': {
    biblical: { meaning: 'ritually impure', context: 'contact with death, bodily emissions' },
    mishnaic: { meaning: 'impurity status', context: 'detailed halakhic categories' },
    talmudic: { meaning: 'theoretical impurity', context: 'academic study after Temple destruction' }
  },
  'טהור': {
    biblical: { meaning: 'ritually pure', context: 'fit for sacred service' },
    mishnaic: { meaning: 'purity status', context: 'achieved through immersion/time' },
    talmudic: { meaning: 'theoretical category', context: 'applied to vessels, foods, persons' }
  },
  'מקוה': {
    biblical: { meaning: 'gathering (of water)', context: 'from קוה (to gather)' },
    mishnaic: { meaning: 'ritual bath', context: 'specific requirements: 40 seah, etc.' },
    talmudic: { meaning: 'purification facility', context: 'detailed halakhot in Miqvaot' }
  },

  // ============ SABBATH/FESTIVAL TERMS ============
  'מלאכה': {
    biblical: { meaning: 'work, craft', context: 'general labor or skilled work' },
    mishnaic: { meaning: '39 categories of work', context: 'prohibited Shabbat activities' },
    talmudic: { meaning: 'primary categories (אבות)', context: 'derivatives (תולדות) derived' }
  },
  'עירוב': {
    biblical: { meaning: 'mixing', context: 'from ערב (to mix)' },
    mishnaic: { meaning: 'Shabbat boundary merger', context: 'עירובי חצרות, תחומין' },
    talmudic: { meaning: 'legal fiction for Shabbat', context: 'detailed in Eruvin tractate' }
  },
  'מוקצה': {
    biblical: { meaning: 'set aside', context: 'from קצה (to cut off)' },
    mishnaic: { meaning: 'Shabbat-forbidden handling', context: 'items set aside from use' },
    talmudic: { meaning: 'categories of muktzeh', context: 'מחמת גופו, מחמת חסרון כיס' }
  },

  // ============ SACRIFICE TERMS ============
  'קרבן': {
    biblical: { meaning: 'offering, sacrifice', context: 'from קרב (to approach)' },
    mishnaic: { meaning: 'Temple sacrifice', context: 'detailed halakhic categories' },
    talmudic: { meaning: 'theoretical study', context: 'post-Temple academic discussion' }
  },
  'עולה': {
    biblical: { meaning: 'that which ascends', context: 'wholly burnt offering' },
    mishnaic: { meaning: 'whole burnt offering', context: 'completely consumed on altar' },
    talmudic: { meaning: 'atoning sacrifice type', context: 'voluntary or obligatory' }
  },
  'חטאת': {
    biblical: { meaning: 'sin offering', context: 'from חטא (to sin)' },
    mishnaic: { meaning: 'purification offering', context: 'for unintentional sins' },
    talmudic: { meaning: 'specific sacrifice category', context: 'blood applied differently from עולה' }
  },

  // ============ GREEK/LATIN LOANWORDS (additional) ============
  'פרקליט': {
    mishnaic: { meaning: 'advocate', context: 'Greek parakletos → Hebrew' }
  },
  'אפיקורס': {
    mishnaic: { meaning: 'heretic', context: 'from Greek Epikouros (Epicurus)' },
    talmudic: { meaning: 'disrespectful of Torah scholars', context: 'expanded meaning' }
  },
  'פרגוד': {
    talmudic: { meaning: 'curtain', context: 'Latin/Greek paragaudion; heavenly curtain' }
  },
  'טרקלין': {
    mishnaic: { meaning: 'dining hall', context: 'Latin triclinium → Hebrew' }
  },
  'פלטין': {
    mishnaic: { meaning: 'palace', context: 'Latin palatium → Hebrew' }
  },

  // ============ PERSIAN LOANWORDS (Late Biblical) ============
  'פרדס': {
    latebiblical: { meaning: 'orchard, park', context: 'Persian pairidaeza → Hebrew (→ English "paradise")' },
    talmudic: { meaning: 'mystical realm', context: 'ארבעה נכנסו לפרדס (mystical ascent)' }
  },
  'דת': {
    latebiblical: { meaning: 'law, decree', context: 'Persian dāta → Hebrew (Esther, Daniel)' },
    mishnaic: { meaning: 'religion', context: 'דת יהודית = Jewish law' }
  },
  'פתגם': {
    latebiblical: { meaning: 'decree, word', context: 'Persian patigāma → Hebrew (Esther)' }
  },
  'גנז': {
    latebiblical: { meaning: 'treasury', context: 'Persian ganza → Hebrew' },
    talmudic: { meaning: 'to store away', context: 'ספרים שנגנזו = hidden books' }
  },

  // ============ RABBINIC TECHNICAL TERMS ============
  'סברא': {
    talmudic: { meaning: 'logical reasoning', context: 'independent of textual source' }
  },
  'סוגיא': {
    talmudic: { meaning: 'Talmudic discussion unit', context: 'literary/thematic unit' }
  },
  'שקלא וטריא': {
    talmudic: { meaning: 'dialectical argumentation', context: 'give and take of debate' }
  },
  'הוה אמינא': {
    talmudic: { meaning: 'I would have said', context: 'rejected preliminary reasoning' }
  },
  'קא משמע לן': {
    talmudic: { meaning: 'it teaches us', context: 'lesson derived from statement' }
  }
};

// =============================================================================
// 9b. LOANWORD DATABASE - PRO SCHOLAR V6.2
// Comprehensive database of Greek, Latin, Persian, Arabic loanwords
// =============================================================================

/**
 * Loanword database with etymology and historical period
 */
export const LOANWORD_DATABASE = {
  // ============ GREEK LOANWORDS ============
  'סנהדרין': { origin: 'Greek', source: 'synedrion', meaning: 'council, assembly', period: 'mishnaic', confidence: 98 },
  'סנגור': { origin: 'Greek', source: 'synegoros', meaning: 'advocate, defender', period: 'mishnaic', confidence: 98 },
  'קטגור': { origin: 'Greek', source: 'kategoros', meaning: 'accuser, prosecutor', period: 'mishnaic', confidence: 98 },
  'פרקליט': { origin: 'Greek', source: 'parakletos', meaning: 'advocate, helper', period: 'mishnaic', confidence: 98 },
  'אפיקורס': { origin: 'Greek', source: 'Epikouros', meaning: 'Epicurean, heretic', period: 'mishnaic', confidence: 98 },
  'פרוזבול': { origin: 'Greek', source: 'pros boulē', meaning: 'before the council', period: 'mishnaic', confidence: 95 },
  'אכסניא': { origin: 'Greek', source: 'xenia', meaning: 'hospitality, inn', period: 'mishnaic', confidence: 95 },
  'אפותיקי': { origin: 'Greek', source: 'apothēkē', meaning: 'storehouse, pledge', period: 'mishnaic', confidence: 95 },
  'בימה': { origin: 'Greek', source: 'bēma', meaning: 'platform, pulpit', period: 'mishnaic', confidence: 95 },
  'גימטריא': { origin: 'Greek', source: 'geometria', meaning: 'numerology', period: 'mishnaic', confidence: 90 },
  'דיפתרא': { origin: 'Greek', source: 'diphthera', meaning: 'leather document', period: 'mishnaic', confidence: 90 },
  'נומוס': { origin: 'Greek', source: 'nomos', meaning: 'law, custom', period: 'mishnaic', confidence: 95 },
  'סנדל': { origin: 'Greek', source: 'sandalion', meaning: 'sandal', period: 'mishnaic', confidence: 95 },
  'פרגוד': { origin: 'Greek', source: 'paragaudion', meaning: 'curtain', period: 'talmudic', confidence: 90 },
  'פתק': { origin: 'Greek', source: 'pittakion', meaning: 'note, ticket', period: 'mishnaic', confidence: 90 },

  // ============ LATIN LOANWORDS ============
  'לגיון': { origin: 'Latin', source: 'legio', meaning: 'legion', period: 'mishnaic', confidence: 98 },
  'פלטין': { origin: 'Latin', source: 'palatium', meaning: 'palace', period: 'mishnaic', confidence: 95 },
  'טרקלין': { origin: 'Latin', source: 'triclinium', meaning: 'dining room', period: 'mishnaic', confidence: 95 },
  'קיסר': { origin: 'Latin', source: 'Caesar', meaning: 'emperor', period: 'mishnaic', confidence: 98 },
  'מטרונה': { origin: 'Latin', source: 'matrona', meaning: 'noble woman', period: 'mishnaic', confidence: 95 },
  'ליטרא': { origin: 'Latin', source: 'libra', meaning: 'pound (weight)', period: 'mishnaic', confidence: 95 },
  'מיל': { origin: 'Latin', source: 'mille', meaning: 'mile', period: 'mishnaic', confidence: 95 },
  'קנס': { origin: 'Latin', source: 'census', meaning: 'fine, tax', period: 'mishnaic', confidence: 90 },
  'ספסל': { origin: 'Latin', source: 'subsellium', meaning: 'bench', period: 'mishnaic', confidence: 90 },

  // ============ PERSIAN LOANWORDS ============
  'פרדס': { origin: 'Persian', source: 'pairidaeza', meaning: 'enclosed garden, paradise', period: 'latebiblical', confidence: 98 },
  'דת': { origin: 'Persian', source: 'dāta', meaning: 'law, decree', period: 'latebiblical', confidence: 98 },
  'פתגם': { origin: 'Persian', source: 'patigāma', meaning: 'decree, word', period: 'latebiblical', confidence: 95 },
  'גנז': { origin: 'Persian', source: 'ganza', meaning: 'treasury', period: 'latebiblical', confidence: 95 },
  'גזבר': { origin: 'Persian', source: 'ganzabara', meaning: 'treasurer', period: 'latebiblical', confidence: 95 },
  'רז': { origin: 'Persian', source: 'rāz', meaning: 'secret, mystery', period: 'latebiblical', confidence: 95 },
  'נשתון': { origin: 'Persian', source: 'ništevan', meaning: 'letter, decree', period: 'latebiblical', confidence: 90 },

  // ============ ARABIC LOANWORDS ============
  'אלגברא': { origin: 'Arabic', source: 'al-jabr', meaning: 'algebra', period: 'geonic', confidence: 95 },
  'סוק': { origin: 'Arabic', source: 'sūq', meaning: 'market', period: 'geonic', confidence: 90 },
  'מחסן': { origin: 'Arabic', source: 'makhzan', meaning: 'storehouse', period: 'geonic', confidence: 90 },
};

/**
 * Detect historical layer of a word
 * @param {string} word - Hebrew word
 * @param {Object} options - { checkEvolution: boolean }
 * @returns {Object} - Historical layer analysis
 */
export function detectHistoricalLayer(word, options = {}) {
  const { checkEvolution = true } = options;
  const cleaned = stripVowels(word);

  const result = {
    word: cleaned,
    primaryLayer: null,
    evolution: null,
    loanwordOrigin: null,
    loanwordDetails: null,
    confidence: 0
  };

  // Check historical evolution database
  if (checkEvolution && HISTORICAL_EVOLUTION[cleaned]) {
    const evolution = HISTORICAL_EVOLUTION[cleaned];
    const periods = Object.keys(evolution);

    result.evolution = evolution;
    result.primaryLayer = periods[0]; // Earliest attested
    result.confidence = 90;

    return result;
  }

  // Check loanword database (high confidence)
  if (LOANWORD_DATABASE[cleaned]) {
    const loanword = LOANWORD_DATABASE[cleaned];
    result.primaryLayer = loanword.period;
    result.loanwordOrigin = loanword.origin;
    result.loanwordDetails = {
      source: loanword.source,
      meaning: loanword.meaning
    };
    result.confidence = loanword.confidence;
    return result;
  }

  // Pattern-based loanword detection (lower confidence)
  // Greek/Latin patterns → Mishnaic or later
  const greekLatinPatterns = /^(פרו|סנ|אפ[יו]|פרק|דיק|נומ|קט[גר]|טרק|לג[יו]|פלט|קיס)/;
  if (greekLatinPatterns.test(cleaned)) {
    result.primaryLayer = 'mishnaic';
    result.loanwordOrigin = 'Greek/Latin';
    result.confidence = 70;
    return result;
  }

  // Persian patterns → Late Biblical
  const persianPatterns = /^(פרד|גנז|דת|פת[גם]|רז|נשת)/;
  if (persianPatterns.test(cleaned)) {
    result.primaryLayer = 'latebiblical';
    result.loanwordOrigin = 'Persian';
    result.confidence = 65;
    return result;
  }

  // Arabic patterns → Geonic
  const arabicPatterns = /^(אל[גא]|מח[סז]|סוק)/;
  if (arabicPatterns.test(cleaned)) {
    result.primaryLayer = 'geonic';
    result.loanwordOrigin = 'Arabic';
    result.confidence = 60;
    return result;
  }

  return result;
}

// =============================================================================
// 10. GRAMMATICAL ANOMALIES - Special forms that scholars discuss
// =============================================================================

/**
 * Database of grammatical anomalies and irregular forms - PRO SCHOLAR V6.2
 * Based on Gesenius-Kautzsch-Cowley, Joüon-Muraoka, and HALOT
 */
export const GRAMMATICAL_ANOMALIES = {
  // ============ IRREGULAR PLURALS ============
  'אשה': {
    type: 'irregular_plural',
    singular: 'אשה',
    plural: 'נשים',
    note: 'Suppletive plural from different root (possibly *ʾnš)',
    scholarly: 'BDB notes this as one of few Hebrew suppletive plurals; cf. English woman/women'
  },
  'עיר': {
    type: 'irregular_plural',
    singular: 'עיר',
    plural: 'ערים',
    note: 'Feminine noun with apparent masculine plural ending',
    scholarly: 'Joüon-Muraoka §89c discusses dual gender nouns'
  },
  'אב': {
    type: 'irregular_plural',
    singular: 'אב',
    plural: 'אבות',
    note: 'Segholate noun with unique plural pattern',
    scholarly: 'Common Semitic pattern, cf. Akkadian abu/abbūtu'
  },
  'איש': {
    type: 'irregular_plural',
    singular: 'איש',
    plural: 'אנשים',
    note: 'Suppletive plural from root *ʾnš (same as אשה related)',
    scholarly: 'GKC §96 discusses irregular noun plurals'
  },
  'בת': {
    type: 'irregular_plural',
    singular: 'בת',
    plural: 'בנות',
    note: 'Plural adds נ from different base form',
    scholarly: 'Cf. construct בַּת vs. plural בָּנוֹת; related to בן family'
  },
  'יום': {
    type: 'irregular_plural',
    singular: 'יום',
    plural: 'ימים',
    note: 'Segholate with internal vowel change in plural',
    scholarly: 'Common pattern for monosyllabic nouns; cf. Akkadian ūmu/ūmū'
  },
  'מים': {
    type: 'dual_only',
    singular: 'N/A',
    plural: 'מים',
    note: 'Always plural (plurale tantum); no attested singular form',
    scholarly: 'GKC §88d; cf. שמים (heavens), also always plural'
  },
  'שמים': {
    type: 'dual_only',
    singular: 'N/A',
    plural: 'שמים',
    note: 'Always dual/plural form; cosmological significance',
    scholarly: 'Joüon-Muraoka §90f discusses pluralia tantum'
  },
  'פנים': {
    type: 'dual_only',
    singular: 'N/A',
    plural: 'פנים',
    note: 'Face (always plural); construct פְּנֵי',
    scholarly: 'Dual form for paired body parts; לִפְנֵי = "before, in front of"'
  },
  'ראש': {
    type: 'irregular_plural',
    singular: 'ראש',
    plural: 'ראשים/ראשות',
    note: 'Has both masculine and feminine plural forms',
    scholarly: 'GKC §87p; semantic distinction between the forms'
  },

  // ============ DEFECTIVE/WEAK VERBS ============
  'נתן': {
    type: 'assimilating_nun',
    root: 'נתן',
    phenomenon: 'PE-NUN assimilation',
    note: 'First נ assimilates in certain forms: יִתֵּן instead of יִנְתֵּן',
    scholarly: 'Gesenius §66b discusses PE-NUN weak verbs'
  },
  'לקח': {
    type: 'pseudo_pe_nun',
    root: 'לקח',
    phenomenon: 'Behaves like PE-NUN despite having ל',
    note: 'Imperfect יִקַּח shows assimilation pattern',
    scholarly: 'Listed as PE-NUN verb in most grammars despite etymology'
  },
  'הלך': {
    type: 'irregular_verb',
    root: 'הלך',
    phenomenon: 'Mixed PE-YOD/PE-WAW patterns',
    note: 'Shows both weak patterns: יֵלֵךְ (PE-YOD) but הָלַךְ (regular)',
    scholarly: 'Possibly originally PE-WAW root, cf. Akkadian alāku'
  },
  'נגש': {
    type: 'assimilating_nun',
    root: 'נגש',
    phenomenon: 'PE-NUN assimilation',
    note: 'Imperfect יִגַּשׁ shows nun assimilation',
    scholarly: 'Regular PE-NUN pattern; Hifil הִגִּישׁ'
  },
  'נפל': {
    type: 'assimilating_nun',
    root: 'נפל',
    phenomenon: 'PE-NUN assimilation',
    note: 'Imperfect יִפֹּל (not יִנְפֹּל)',
    scholarly: 'GKC §66b; common PE-NUN verb'
  },
  'נשא': {
    type: 'assimilating_nun',
    root: 'נשא',
    phenomenon: 'PE-NUN with final aleph',
    note: 'Combines PE-NUN and LAMED-ALEPH weaknesses',
    scholarly: 'Doubly weak verb; imperfect יִשָּׂא'
  },
  'ישב': {
    type: 'pe_yod',
    root: 'ישב',
    phenomenon: 'PE-YOD apocopation',
    note: 'Imperfect יֵשֵׁב (yod quiesces); Hifil הוֹשִׁיב',
    scholarly: 'GKC §69; original *wšb (PE-WAW)'
  },
  'ירד': {
    type: 'pe_yod',
    root: 'ירד',
    phenomenon: 'PE-YOD apocopation',
    note: 'Imperfect יֵרֵד; opposite of עלה semantically',
    scholarly: 'Original *wrd; cf. Arabic warada'
  },
  'יצא': {
    type: 'pe_yod',
    root: 'יצא',
    phenomenon: 'PE-YOD with LAMED-ALEPH',
    note: 'Doubly weak: imperfect יֵצֵא',
    scholarly: 'Important exodus verb; יְצִיאַת מִצְרַיִם'
  },
  'בוא': {
    type: 'hollow_verb',
    root: 'בוא',
    phenomenon: 'AYIN-WAW hollow verb',
    note: 'Middle radical quiesces: perfect בָּא, imperfect יָבוֹא',
    scholarly: 'GKC §72; paired semantically with יצא'
  },
  'קום': {
    type: 'hollow_verb',
    root: 'קום',
    phenomenon: 'AYIN-WAW hollow verb',
    note: 'Middle radical quiesces: perfect קָם, imperfect יָקוּם',
    scholarly: 'Hifil הֵקִים "to establish"; key covenantal verb'
  },
  'שים': {
    type: 'hollow_verb',
    root: 'שים',
    phenomenon: 'AYIN-YOD hollow verb',
    note: 'Alternative root שׂום; imperfect יָשִׂים',
    scholarly: 'Variant spellings in MT; semantic "to place, put"'
  },
  'מות': {
    type: 'hollow_verb',
    root: 'מות',
    phenomenon: 'AYIN-WAW hollow verb',
    note: 'Perfect מֵת, imperfect יָמוּת; Hifil הֵמִית "to kill"',
    scholarly: 'מָוֶת (death) is personified in Ugaritic as deity Mot'
  },
  'היה': {
    type: 'lamed_he',
    root: 'היה',
    phenomenon: 'LAMED-HE verb (to be)',
    note: 'Unique stative verb; imperfect יִהְיֶה',
    scholarly: 'Related to divine name יהוה (GKC §75)'
  },
  'ראה': {
    type: 'lamed_he',
    root: 'ראה',
    phenomenon: 'LAMED-HE verb',
    note: 'Final ה drops in certain forms; imperfect יִרְאֶה',
    scholarly: 'Nifal נִרְאָה "to appear"; important revelation term'
  },
  'עשה': {
    type: 'lamed_he',
    root: 'עשה',
    phenomenon: 'LAMED-HE verb',
    note: 'Most frequent LAMED-HE verb (~2,600 occurrences)',
    scholarly: 'Basic action verb; imperfect יַעֲשֶׂה'
  },
  'בנה': {
    type: 'lamed_he',
    root: 'בנה',
    phenomenon: 'LAMED-HE verb',
    note: 'Perfect בָּנָה, imperfect יִבְנֶה',
    scholarly: 'Related to בֵּן (son), בַּיִת (house); family terminology'
  },
  'ידה': {
    type: 'lamed_he',
    root: 'ידה',
    phenomenon: 'LAMED-HE verb (to praise/confess)',
    note: 'Hifil הוֹדָה "to give thanks"; תּוֹדָה = thanksgiving',
    scholarly: 'Liturgical importance; Hallel psalms'
  },

  // ============ UNUSUAL CONSTRUCTS ============
  'בן': {
    type: 'irregular_construct',
    absolute: 'בֵּן',
    construct: 'בֶּן/בִּן',
    note: 'Construct changes vowel pattern; plural construct בְּנֵי',
    scholarly: 'Part of broader pattern in family terms (GKC §96)'
  },
  'בית': {
    type: 'irregular_construct',
    absolute: 'בַּיִת',
    construct: 'בֵּית',
    note: 'Construct form used in place names: בֵּית לֶחֶם',
    scholarly: 'Segholate with special construct; cf. Akkadian bītu'
  },
  'אח': {
    type: 'irregular_construct',
    absolute: 'אָח',
    construct: 'אֲחִי (with suffix)',
    note: 'Family term with irregular suffixed forms',
    scholarly: 'GKC §96; cf. אָחוֹת (sister)'
  },

  // ============ UNIQUE GRAMMATICAL FORMS ============
  'אין': {
    type: 'negative_particle',
    phenomenon: 'Negative existential',
    note: 'Takes pronominal suffixes: אֵינֶנִּי "I am not"',
    scholarly: 'Opposite of יֵשׁ; unique in Semitic (GKC §152)'
  },
  'יש': {
    type: 'existential_particle',
    phenomenon: 'Positive existential',
    note: 'Takes pronominal suffixes: יֶשְׁנוֹ "there is"',
    scholarly: 'Not found in other Semitic languages; cf. Aramaic אִית'
  },
  'את': {
    type: 'object_marker',
    phenomenon: 'Definite direct object marker',
    note: 'Precedes definite nouns as direct objects',
    scholarly: 'Unique to Hebrew and some Aramaic dialects; cf. Aramaic יָת'
  }
};

/**
 * Check if a word has known grammatical anomalies
 * @param {string} word - Hebrew word
 * @returns {Object|null} - Anomaly information if found
 */
export function checkGrammaticalAnomaly(word) {
  const cleaned = stripVowels(word);

  if (GRAMMATICAL_ANOMALIES[cleaned]) {
    return {
      word: cleaned,
      ...GRAMMATICAL_ANOMALIES[cleaned],
      hasAnomaly: true
    };
  }

  return null;
}

// =============================================================================
// 11. COGNATE LANGUAGES - Related words in sister languages
// =============================================================================

/**
 * Cognate data from related Semitic languages
 * Used for etymological analysis
 */
