// =============================================================================
// Données du traitement des commentaires — abréviations talmudiques,
// HALACHIC_OVERRIDE (noms propres + termes techniques) et RASHI_VOCABULARY
// (locutions composées). Pures, zéro dépendance.
// (extrait de commentaryUtils.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

export const TALMUDIC_ABBREVIATIONS = {
  // === PROVIDE ENGLISH DIRECTLY for common terms (avoids wrong dictionary sense) ===
  "גמ'": '[Gemara]',
  "מתני'": '[Mishnah:]',
  "ר'": '[Rabbi]',
  "רש\"י": '[Rashi]',
  "ד\"ה": '[on the words:]',  // דיבור המתחיל - opening words of commentary
  "א\"כ": '[if so]',
  "כ\"ש": '[all the more so]',
  "מ\"מ": '[in any case]',
  "ה\"ה": '[the same law applies]',
  "וכו'": '[etc.]',
  "ת\"ל": '[the verse teaches]',

  // === DOMAIN ABBREVIATIONS (Shabbat context) ===
  "רה\"י": '[private domain]',  // רשות היחיד
  "רה\"ר": '[public domain]',   // רשות הרבים
  "ר\"ה": '[public domain]',    // Also רשות הרבים in Shabbat context
  "מרה\"י": '[from private domain]',
  "לרה\"י": '[to private domain]',
  "לר\"ה": '[to public domain]',
  "מר\"ה": '[from public domain]',

  // === SCHOOLS ===
  "ב\"ה": '[Beit Hillel]',
  "ב\"ש": '[Beit Shammai]',

  // === PEOPLE ===
  "בע\"ה": '[homeowner]',  // בעל הבית
  "דבע\"ה": '[of the homeowner]',

  // === WITH VAV PREFIX (ו) - common combinations ===
  "ובגמ'": '[and the Gemara]',
  "וגמ'": '[and Gemara]',
  "ומתני'": '[and Mishnah]',
  "ור'": '[and Rabbi]',
  "וד\"ה": '[and on the words:]',

  // === WITH DALET PREFIX (ד) - Aramaic relative ===
  "דר\"ה": '[that is public domain]',
  "דרה\"י": '[that is private domain]',

  // === Keep Hebrew expansion for honorifics/names ===
  "ע\"ה": 'עליו השלום',
  "ז\"ל": 'זכרונו לברכה',
  "וגו'": '[and so on]',
  "פ'": '[chapter]',
  "ובפ'": '[and in chapter]',
  "בפ'": '[in chapter]',
  "מה\"ת": '[from the Torah]',
  "דאורייתא": '[from the Torah]',
  "דרבנן": '[from the Rabbis]',

  // === NUMBERS ===
  "ד'": '[four]',  // ארבע
  "ג'": '[three]',
  "ב'": '[two]',

  // === TALMUD STRUCTURE ===
  "לקמן": '[below]',
  "לעיל": '[above]',
  "דף": '[page]',
};

// Dynamic glossary cache - stores API lookups for reuse
const glossaryCache = new Map();


// =============================================================================
// PROPER_NOUN_HINTS - MINIMAL overrides for proper nouns ONLY
// =============================================================================
// SCHOLARLY PRINCIPLE: Your dictionaries (Jastrow, BDB, Klein, Strong's) are
// the PRIMARY sources. We only add hints for PROPER NOUNS that are commonly
// used as text/day names rather than their dictionary meaning.
//
// For ALL other words: USE THE DICTIONARIES! No hardcoding needed.
// =============================================================================
export const HALACHIC_OVERRIDE = {
  // ==========================================================================
  // PROPER NOUNS ONLY - Names of texts/days/concepts
  // These override dictionary because they're TITLES not vocabulary
  // ==========================================================================
  'משנה': 'Mishnah (tannaitic legal code)',
  'גמרא': 'Gemara (amoraic discussion)',
  'תורה': 'Torah',
  'שבת': 'Shabbat',

  // ==========================================================================
  // TECHNICAL HALACHIC TERMS - Only where dictionary sense is WRONG
  // Use these sparingly - prefer Jastrow/BDB for scholarly definitions
  // ==========================================================================
  // אב/תולדה: In melacha context, NOT "father/birth" - technical classification
  'אב': 'אב מלאכה (primary labor category)',
  'אבות': 'אבות מלאכות (primary labor categories)',
  'תולדה': 'תולדה (derivative labor)',
  'תולדות': 'תולדות (derivative labors)',
};

// =============================================================================
// NOTE: COMMON_WORD_FIXES has been REMOVED
// =============================================================================
// The systematic scoring system in definitionCleaner.js now handles common words
// without hardcoding. It uses:
// 1. scoreDefinition() - Ranks ALL definitions by quality
// 2. pickBestFromCandidates() - Selects the BEST definition
//
// This replaces hardcoding hundreds of words with a SYSTEMATIC approach:
// - Rejects proper noun entries (e.g., "Israelite" for יד)
// - Boosts common semantic patterns (hand, house, master, etc.)
// - Uses source reliability (Jastrow/BDB > Strong's)
// - Filters garbage/transliteration-only definitions
//
// If a word is still returning wrong definitions, improve the scoring
// patterns in definitionCleaner.js rather than adding hardcoded entries.
// =============================================================================

// =============================================================================
// TALMUDIC_ABBREVIATIONS_EXPANDED - Only for compound/abbreviated phrases
// =============================================================================
// SCHOLARLY PRINCIPLE: Jastrow, BDB, Klein cover single words excellently.
// Only hardcode COMPOUND PHRASES that dictionaries don't parse correctly.
// =============================================================================
export const RASHI_VOCABULARY = {
  // === COMPOUND PHRASES (dictionaries can't parse these) ===
  'מנלן': 'from where do we know',
  'אף על פי': 'even though',
  'אע"פ': 'even though',
  'שמע מינה': 'we derive from this',
  'מרשות לרשות': 'from domain to domain',

  // === ABBREVIATED FORMS (not full words in dictionaries) ===
  'ובגמ': 'and in the Gemara',
  'דהכנסות': 'that bringing in',
  'דאורייתא': 'of the Torah',
  'דרבנן': 'of the Rabbis',

  // === COMMON ARAMAIC PARTICLES (dictionaries often miss these) ===
  'נמי': 'also, too',
  'הואיל': 'since, because',
  'קא': '(continuous action marker)',
  'קרי': 'calls, reads',
  'הכי': 'thus, so',
  'הכא': 'here',
  'התם': 'there',
  'מאי': 'what',
  'היינו': 'this is',
  'אלא': 'but, rather',
  'אמאי': 'why',
  'לאו': 'is it not, no',
  'הא': 'this, behold',
  'דאמר': 'who said, as said',
  'כגון': 'such as',
  'למימר': 'to say',
  'מיהא': 'however, but',
  'איכא': 'there is',
  'ליכא': 'there is not',
  'בעי': 'needs, asks',
  'אמרינן': 'we say',
  'סבר': 'holds, thinks',
  'מפרש': 'explains',
  'פירוש': 'meaning',
  'כלומר': 'that is to say',

  // === COMMON TALMUDIC TERMS (from Shabbat tractate) ===
  'יציאות': 'goings out, transfers',
  'הוצאות': 'carryings out, transfers',
  'הכנסות': 'bringings in, transfers',
  'האמורות': 'that are mentioned',
  'ומוציא': 'and one who carries out',
  'מתני': 'Mishnah teaches',
  'רשות': 'domain, authority',
  'רשויות': 'domains',
  'שתים': 'two',
  'ארבע': 'four',
  'פנים': 'inside',
  'חוץ': 'outside',

  // === LEGAL STATUS TERMS (critical for Talmud translation) ===
  'פטור': 'exempt',
  'חייב': 'liable, obligated',
  'מותר': 'permitted',
  'אסור': 'forbidden',
  'כשר': 'valid, kosher',
  'פסול': 'invalid, disqualified',
  'טמא': 'impure',
  'טהור': 'pure',
  'חולין': 'non-sacred',
  'קודש': 'sacred',
  'טרף': 'non-kosher',

  // === PUNISHMENT TERMS (Shabbat context) ===
  'כרת': 'excision (divine punishment)',
  'סקילה': 'stoning',
  'שריפה': 'burning',
  'הרג': 'execution by sword',
  'חנק': 'strangulation',
  'מלקות': 'lashes',
  'מיתה': 'death',
  'עונש': 'punishment',
  'התראה': 'warning',
  'זדון': 'intentional transgression',
  'שגגה': 'unintentional error',

  // === HALACHIC CATEGORIES ===
  'מלאכה': 'labor, work',
  'מלאכות': 'labors, works',
  'איסור': 'prohibition',
  'היתר': 'permission',
  'חטאת': 'sin offering',
  'עולה': 'burnt offering',
  'קרבן': 'sacrifice',
  'נדבה': 'voluntary offering',

  // === INFINITIVES (BDB often returns wrong homographs) ===
  'לאסור': 'to prohibit',
  'להתיר': 'to permit',
  'לחייב': 'to obligate',
  'לפטור': 'to exempt',
  'להביא': 'to bring',
  'להוציא': 'to take out',
  'להכניס': 'to bring in',
  'לעשות': 'to do, to make',
  'לתת': 'to give',
  'לקבל': 'to receive',
  'ללמוד': 'to learn',
  'ללמד': 'to teach',
  'לדרוש': 'to expound',
  'לכתחלה': 'ab initio, ideally',

  // === COMMON PRONOUNS/CONJUNCTIONS (Strong's gets these wrong) ===
  'שהן': 'that they (f)',
  'שהם': 'that they (m)',
  'שהיא': 'that she/it',
  'שהוא': 'that he/it',
  'וכן': 'and thus, so',
  'וכל': 'and all',
  'בכל': 'in all',

  // === BASIC HEBREW FUNCTION WORDS ===
  // Strong's returns wrong homographs for these EVERY time
  // These are grammar words, not content - essential for any translation
  'מן': 'from',
  'על': 'on, upon',
  'אל': 'to, toward',
  'את': '(object marker)',
  'כן': 'thus, so',
  'לא': 'not, no',
  'כי': 'because, that',
  'אשר': 'that, which',
  'זה': 'this',
  'הוא': 'he, it',
  'היא': 'she, it',
  'הם': 'they (m)',
  'הן': 'they (f)',
  'היה': 'was, existed',
  'יהיה': 'will be',
  'אותו': 'him, it',
  'אותה': 'her, it',
  'אותם': 'them (m)',
  'אותן': 'them (f)',
  'עליו': 'on him',
  'עליה': 'on her',
  'עליהם': 'on them',
  'אלו': 'these',
  'אלה': 'these',

  // === ADDITIONAL ARAMAIC PARTICLES (Talmud-specific) ===
  // These are CRITICAL for Talmud translation - Strong's doesn't handle Aramaic
  'דהוא': 'that is',
  'דהיא': 'that is (f)',
  'דהוי': 'that would be',
  'דהוה': 'that was',
  'דאיכא': 'that there is',
  'דליכא': 'that there is not',
  'דקאמר': 'who says',
  'דאמרי': 'that they say',
  'דתנן': 'that we learned (in Mishnah)',
  'דתניא': 'that it was taught (in Baraita)',
  'מתניתין': 'our Mishnah',
  'ברייתא': 'Baraita (external teaching)',
  'תנא': 'Tanna taught',
  'תנו': 'the Tannaim taught',
  'אמרי': 'they say',
  'אמרת': 'you said',
  'קאמר': 'he says',
  'קאמרת': 'you say',
  'למאי': 'for what',
  'היכי': 'how',
  'היכא': 'where',
  'אימת': 'when',
  'כמאן': 'like whom',
  'מאן': 'who',
  'ומאי': 'and what',
  'דמאי': 'of what',
  'לימא': 'let him say',
  'תימא': 'you might say',
  'אימא': 'say, perhaps',
  'שמא': 'perhaps, lest',
  'ודאי': 'certainly',
  'ספק': 'doubt, uncertain',

  // === TALMUDIC LOGICAL CONNECTORS ===
  'אלמא': 'therefore, hence',
  'משום': 'because of',
  'משמע': 'it implies',
  'מיהו': 'however, but',
  'מיהת': 'at any rate',
  'השתא': 'now',
  'אטו': 'is it that',
  'מהו': 'what is',
  'מהא': 'from this',
  'מנא': 'from where',
  // 'מנלן' already defined above in COMMON ARAMAIC PARTICLES
  'פשיטא': 'it is obvious',
  'קשיא': 'difficult, contradiction',
  'תיובתא': 'refutation',
  'שמע': 'hear, learn',
  'תנינא': 'we learned',
  'הדר': 'he returned, again',
  'אדרבה': 'on the contrary',
  'לעולם': 'always, in any case',
  'מכלל': 'from the principle',
  'דוקא': 'specifically',
  // 'לאו' already defined above in COMMON ARAMAIC PARTICLES
  'אין': 'yes, there is',
  'יש': 'there is',
  'אם': 'if',
  'כשהוא': 'when he',
  'כשהיא': 'when she/it',

  // === COMMON BODY PARTS (Strong's often wrong) ===
  'יד': 'hand',
  'רגל': 'foot, leg',
  'ראש': 'head',
  'עין': 'eye',
  'אזן': 'ear',
  'פה': 'mouth',
  'לב': 'heart',
  'נפש': 'soul',
  'גוף': 'body',
  'כף': 'palm, spoon',
  'אצבע': 'finger',
  'זרוע': 'arm',

  // === COMMON OBJECTS/PLACES ===
  'בית': 'house',
  'שדה': 'field',
  'דרך': 'way, road',
  'עיר': 'city',
  'מקום': 'place',
  'שער': 'gate',
  'חצר': 'courtyard',
  'גג': 'roof',
  'כותל': 'wall',
  'אמה': 'cubit',
  'טפח': 'handbreadth',

  // === TIME EXPRESSIONS ===
  'יום': 'day',
  'לילה': 'night',
  'בקר': 'morning',
  'ערב': 'evening',
  'שעה': 'hour',
  'עת': 'time',
  'זמן': 'time, season',
  'תמיד': 'always, continual',
  'לעתים': 'sometimes',
  'מיד': 'immediately',
  'תיכף': 'immediately',
  'אחר': 'after',
  'לפני': 'before',
  'עד': 'until',
  'מאז': 'since',

  // === PRO SCHOLAR V9: MISHKAN/TABERNACLE TERMS ===
  // Critical for Shabbat tractate (the 39 melachot derive from Mishkan work)
  'לויה': 'Levite',
  'לוי': 'Levite',
  'לויים': 'Levites',
  'מחנה': 'camp',
  'ישראל': 'Israel',
  'כהן': 'priest',
  'כהנים': 'priests',
  'משכן': 'Tabernacle',
  'אהל': 'tent',
  'מועד': 'meeting, appointed time',
  'קרש': 'board, plank',
  'קרשים': 'boards, planks',
  'יריעה': 'curtain',
  'יריעות': 'curtains',
  'אדן': 'socket, base',
  'אדנים': 'sockets, bases',
  'בריח': 'bar',
  'בריחים': 'bars',
  'עמוד': 'pillar',
  'עמודים': 'pillars',
  'וו': 'hook',
  'ווים': 'hooks',

  // === BIBLICAL COMMANDS/VERSES ===
  'ויצו': 'and He commanded',
  'ויעבירו': 'and they proclaimed',
  'תפיקו': 'you shall bring out',
  'תוציאו': 'you shall take out',
  'נדבות': 'voluntary offerings',
  'תרומה': 'contribution, offering',
  'תרומות': 'contributions, offerings',

  // === ADDITIONAL TALMUDIC TERMS ===
  'כדיליף': 'as is derived',
  'כדילפינן': 'as we derive',
  'נפקא לן': 'we derive',
  'שגגתו': 'his unintentional sin',
  'זדונו': 'his intentional sin',
  'התראתו': 'his warning',
};
