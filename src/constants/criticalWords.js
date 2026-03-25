/**
 * Critical Word Fallbacks - High-Priority Translations
 *
 * Used as fallback when dictionary lookups fail (e.g., due to Unicode issues).
 * These are common words that MUST have correct translations.
 */

// === BIBLICAL NAMES ===
export const BIBLICAL_NAMES = {
  'משה': 'Moses',
  'אהרן': 'Aaron',
  'אברהם': 'Abraham',
  'יצחק': 'Isaac',
  'יעקב': 'Jacob',
  'דוד': 'David',
  'שלמה': 'Solomon',
  'שרה': 'Sarah',
  'רבקה': 'Rebecca',
  'רחל': 'Rachel',
  'לאה': 'Leah',
  'יוסף': 'Joseph',
  'בנימין': 'Benjamin',
};

// === SHABBAT VARIATIONS ===
// NOT page references - gematria 702 is out of range
export const SHABBAT_WORDS = {
  'שבת': 'Shabbat',
  'שבת:': 'Shabbat',      // With trailing colon (punctuation)
  'השבת': 'the Shabbat',
  'לשבת': 'for Shabbat',
  'בשבת': 'on Shabbat',
};

// === COMMON ABBREVIATIONS ===
export const COMMON_ABBREVIATIONS = {
  'וגו': 'etc.',
  "וגו'": 'etc.',
  'וגו׳': 'etc.',
  "וכו'": 'etc.',
  'וכו׳': 'etc.',
  "ע\"ה": "peace be upon him",
  "ז\"ל": 'of blessed memory',
  "ע\"ש": 'see there',
};

// === DOMAIN ABBREVIATIONS (Halachic) ===
export const DOMAIN_ABBREVIATIONS = {
  'לר"ה': 'to public domain',
  'לרה"י': 'to private domain',
  'מרה"י': 'from private domain',
  'לרה"ר': 'to public domain',
  'רה"ר': 'public domain',
  'רה"י': 'private domain',
};

// === ARAMAIC TERMS ===
export const ARAMAIC_TERMS = {
  // Discourse markers
  'להו': 'to them',
  'ברישיה': 'at its beginning',
  'מדבריהם': 'from their words',
  'אמר': 'said',
  'תנא': 'taught',
  'תנן': 'we learned',
  'מתני': 'our Mishnah',
  // Common Aramaic nouns
  'מלכא': 'king',
  'דינא': 'judgment/law',
  'ביתא': 'house',
  'ארעא': 'land',
  'יומא': 'day',
  'גברא': 'man',
  // PRO SCHOLAR V10.2: Extended Talmudic vocabulary
  'סברא': 'logical reasoning',
  'קושיא': 'difficulty/question',
  'תירוץ': 'answer/resolution',
  'תרץ': 'he resolved',
  'קשיא': 'it is difficult',
  'שמעתא': 'teaching/tradition',
  'סוגיא': 'passage/discussion',
  'מימרא': 'statement',
  'ברייתא': 'external teaching',
  'משנה': 'Mishnah',
  'גמרא': 'Gemara',
  'רבנן': 'the Rabbis',
  'מר': 'master/teacher',
  'רבא': 'Rava',
  'אביי': 'Abaye',
  'רב': 'Rav',
  'שמואל': 'Shmuel',
  'הלכה': 'law/ruling',
  'הלכתא': 'the law is',
  'פשיטא': 'obvious',
  'מאי': 'what',
  'היכי': 'how',
  'אמאי': 'why',
  'אלא': 'rather/but',
  'דילמא': 'perhaps',
  'איכא': 'there is',
  'ליכא': 'there is not',
  'בעי': 'he asked/needs',
  'איבעיא': 'it was asked',
};

// === DIVINE NAMES & VARIATIONS (PRO SCHOLAR V10.2) ===
export const DIVINE_NAMES = {
  'יהוה': 'LORD (YHVH)',
  'אלהים': 'God',
  'אלקים': 'God',
  'אדני': 'Lord',
  'שדי': 'Almighty',
  'צבאות': 'of Hosts',
  'השם': 'the Name',
  'הקדוש': 'the Holy One',
  'ברוך': 'blessed',
  'הקב"ה': 'the Holy One, blessed be He',
  'רבש"ע': 'Master of the Universe',
  'אבינו': 'our Father',
  'מלכנו': 'our King',
};

// === HALACHIC CONCEPTS (PRO SCHOLAR V10.2) ===
export const HALACHIC_TERMS = {
  // Purity/Impurity
  'טהור': 'pure/clean',
  'טמא': 'impure/unclean',
  'טהרה': 'purity',
  'טומאה': 'impurity',
  // Shabbat work categories
  'מלאכה': 'work (forbidden on Shabbat)',
  'אב': 'primary category',
  'תולדה': 'derivative category',
  'מוקצה': 'set aside (forbidden to move)',
  // Ownership/domains
  'רשות': 'domain/permission',
  'הפקר': 'ownerless',
  'חזקה': 'presumption/possession',
  // Legal categories
  'איסור': 'prohibition',
  'היתר': 'permission',
  'מותר': 'permitted',
  'אסור': 'forbidden',
  'חייב': 'obligated/liable',
  'פטור': 'exempt',
  'כשר': 'kosher/valid',
  'פסול': 'invalid/unfit',
  // Actions
  'מצוה': 'commandment',
  'עבירה': 'transgression',
  'תשובה': 'repentance',
  'כפרה': 'atonement',
};

// === COMMON HEBREW NOUNS ===
export const COMMON_NOUNS = {
  'מלך': 'king',
  'ארץ': 'land/earth',
  'שמים': 'heaven/sky',
  'אדם': 'man/Adam',
  'אשה': 'woman/wife',
  'איש': 'man',
  'בית': 'house',
  'יום': 'day',
  'לילה': 'night',
  'עם': 'people/nation',
  'כל': 'all/every',
  'דבר': 'word/thing',
  'תורה': 'Torah/law',
  'נפש': 'soul/life',
  'לב': 'heart',
  'יד': 'hand',
  'עין': 'eye',
  'פנים': 'face',
};

// === PREFIXED COMMON WORDS ===
export const PREFIXED_COMMON = {
  // ה (the) + noun
  'המלך': 'the king',
  'הארץ': 'the land',
  'השמים': 'the heavens',
  'האדם': 'the man',
  'הבית': 'the house',
  'היום': 'the day',
  'העם': 'the people',
  'התורה': 'the Torah',
  // ו (and) + noun
  'ומלך': 'and a king',
  'וארץ': 'and land',
  // ב (in/with) + noun
  'בארץ': 'in the land',
  'בבית': 'in the house',
  'ביום': 'on the day',
  // ל (to/for) + noun
  'למלך': 'to the king',
  'לארץ': 'to the land',
  'לבית': 'to the house',
  // מ (from) + noun
  'מארץ': 'from the land',
  'מבית': 'from the house',
  // כ (like/as) + noun
  'כמלך': 'like a king',
};

// === VERB FORMS ===
export const VERB_FORMS = {
  'ויעבירו': 'and they proclaimed',
  'ויאמר': 'and he said',
  'ויהי': 'and it was',
};

// === COMMON PREFIXED WORDS ===
export const PREFIXED_WORDS = {
  'בכל': 'in all',
  'לכל': 'to all',
  'מכל': 'from all',
  'וכל': 'and all',
  'ככל': 'like all',
  'עכל': 'about all',
};

// === COMBINED CRITICAL_WORDS (for backward compatibility) ===
// PRO SCHOLAR V10.2: Added DIVINE_NAMES and HALACHIC_TERMS
export const CRITICAL_WORDS = {
  ...BIBLICAL_NAMES,
  ...SHABBAT_WORDS,
  ...COMMON_ABBREVIATIONS,
  ...DOMAIN_ABBREVIATIONS,
  ...ARAMAIC_TERMS,
  ...DIVINE_NAMES,
  ...HALACHIC_TERMS,
  ...COMMON_NOUNS,
  ...PREFIXED_COMMON,
  ...VERB_FORMS,
  ...PREFIXED_WORDS,
};

/**
 * Lookup a critical word translation
 * @param {string} word - Hebrew word to look up
 * @returns {string|null} Translation or null if not found
 */
export const lookupCriticalWord = (word) => {
  return CRITICAL_WORDS[word] || null;
};

/**
 * Check if word is a biblical name
 * @param {string} word - Hebrew word to check
 * @returns {boolean}
 */
export const isBiblicalName = (word) => {
  return word in BIBLICAL_NAMES;
};

// =============================================================================
// PRO SCHOLAR V12: ACADEMIC CRITICAL WORDS (Tier 1 - HALOT, DJBA, Jastrow)
// =============================================================================

let academicData = null;
let academicDataLoading = false;
let academicDataLoadPromise = null;

/**
 * Load academic critical words data from JSON
 * @returns {Promise<Object>} Academic data with full scholarly info
 */
export const loadAcademicCriticalWords = async () => {
  if (academicData) return academicData;
  if (academicDataLoading) return academicDataLoadPromise;

  academicDataLoading = true;
  academicDataLoadPromise = fetch('/data/critical_words_academic.json')
    .then(res => res.ok ? res.json() : null)
    .then(data => {
      if (data) {
        // Flatten all categories into a single lookup map
        academicData = {};
        const categories = ['biblicalNames', 'divineNames', 'talmudicTerms',
                          'halachicTerms', 'abbreviations', 'shabbatTerms', 'talmudicSages'];
        for (const cat of categories) {
          if (data[cat]) {
            for (const [key, entry] of Object.entries(data[cat])) {
              academicData[key] = { ...entry, _category: cat };
            }
          }
        }
      }
      academicDataLoading = false;
      return academicData;
    })
    .catch(() => {
      academicDataLoading = false;
      academicData = {};
      return academicData;
    });

  return academicDataLoadPromise;
};

/**
 * PRO SCHOLAR V12: Look up critical word with full academic data
 * @param {string} word - Hebrew word to look up
 * @returns {Object|null} Full scholarly entry with source, etymology, etc.
 */
export const lookupAcademicCriticalWord = (word) => {
  if (!academicData) return null;
  return academicData[word] || null;
};

/**
 * PRO SCHOLAR V12: Async lookup with auto-loading
 * @param {string} word - Hebrew word
 * @returns {Promise<Object|null>} Full scholarly entry
 */
export const lookupAcademicCriticalWordAsync = async (word) => {
  await loadAcademicCriticalWords();
  return lookupAcademicCriticalWord(word);
};

/**
 * PRO SCHOLAR V12: Get category-specific entries
 * @param {string} category - Category name
 * @returns {Object} Entries for that category
 */
export const getAcademicCategory = (category) => {
  if (!academicData) return {};
  return Object.fromEntries(
    Object.entries(academicData).filter(([_, v]) => v._category === category)
  );
};

export default CRITICAL_WORDS;
