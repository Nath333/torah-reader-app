/**
 * rabbinicReferencesService.js - Torah-to-Rabbinic Literature Cross-References
 *
 * Comprehensive service linking Torah verses to:
 * - Talmud Bavli and Yerushalmi
 * - Midrash Rabbah
 * - Midrash Tanchuma
 * - Sifra, Sifrei
 * - Mechilta
 * - Targumim interpretations
 * - Rashi's Talmudic sources
 * - Zohar and Kabbalistic references
 */

// Reference categories
export const REFERENCE_CATEGORIES = {
  TALMUD_BAVLI: {
    name: 'Talmud Bavli',
    hebrewName: 'תלמוד בבלי',
    icon: '📚',
    description: 'Babylonian Talmud discussions'
  },
  TALMUD_YERUSHALMI: {
    name: 'Talmud Yerushalmi',
    hebrewName: 'תלמוד ירושלמי',
    icon: '📖',
    description: 'Jerusalem Talmud discussions'
  },
  MIDRASH_RABBAH: {
    name: 'Midrash Rabbah',
    hebrewName: 'מדרש רבה',
    icon: '📜',
    description: 'Homiletical expositions'
  },
  MIDRASH_TANCHUMA: {
    name: 'Midrash Tanchuma',
    hebrewName: 'מדרש תנחומא',
    icon: '🎓',
    description: 'Aggadic midrash'
  },
  MECHILTA: {
    name: 'Mechilta',
    hebrewName: 'מכילתא',
    icon: '⚖️',
    description: 'Halakhic midrash on Exodus'
  },
  SIFRA: {
    name: 'Sifra',
    hebrewName: 'ספרא',
    icon: '📋',
    description: 'Halakhic midrash on Leviticus'
  },
  SIFREI: {
    name: 'Sifrei',
    hebrewName: 'ספרי',
    icon: '📋',
    description: 'Halakhic midrash on Numbers/Deuteronomy'
  },
  ZOHAR: {
    name: 'Zohar',
    hebrewName: 'זוהר',
    icon: '✨',
    description: 'Kabbalistic commentary'
  },
  RASHI_SOURCE: {
    name: "Rashi's Sources",
    hebrewName: 'מקורות רש"י',
    icon: '🔍',
    description: 'Talmudic basis for Rashi commentary'
  }
};

// Topic categories for references
export const TOPIC_CATEGORIES = {
  HALAKHA: { name: 'Halakha', icon: '⚖️', description: 'Legal discussions' },
  AGGADAH: { name: 'Aggadah', icon: '📖', description: 'Narrative/homiletical' },
  MUSSAR: { name: 'Mussar', icon: '💫', description: 'Ethics and character' },
  KABBALAH: { name: 'Kabbalah', icon: '✨', description: 'Mystical teachings' },
  HISTORY: { name: 'History', icon: '📜', description: 'Historical context' },
  PHILOSOPHY: { name: 'Philosophy', icon: '🧠', description: 'Theological concepts' }
};

// Comprehensive cross-reference database
// In production, this would be fetched from a database
const CROSS_REFERENCES = {
  // === GENESIS ===
  'Genesis.1.1': [
    {
      category: 'TALMUD_BAVLI',
      reference: 'Chagigah 12a',
      topic: 'PHILOSOPHY',
      summary: 'Discusses what existed before creation and the ten things created on the first day',
      quote: 'מאי בראשית - בשביל התורה שנקראת ראשית',
      translation: 'What is "In the beginning"? For the sake of Torah which is called "beginning"',
      relevance: 'high'
    },
    {
      category: 'MIDRASH_RABBAH',
      reference: 'Bereishit Rabbah 1:1',
      topic: 'AGGADAH',
      summary: 'Torah as the blueprint for creation',
      quote: 'התורה אומרת אני הייתי כלי אומנתו של הקב"ה',
      translation: 'The Torah says: I was the instrument of the Holy One',
      relevance: 'high'
    },
    {
      category: 'ZOHAR',
      reference: 'Zohar I:15a',
      topic: 'KABBALAH',
      summary: 'The Aleph-Bet and the process of creation',
      quote: 'בראשית - ב׳ ראשית',
      translation: 'Bereishit - the second one is first (Bet precedes Aleph in Torah)',
      relevance: 'high'
    },
    {
      category: 'RASHI_SOURCE',
      reference: 'Bereishit Rabbah 1:1; Isaiah 41:4',
      topic: 'PHILOSOPHY',
      summary: 'Source for Rashi\'s interpretation that Torah begins with creation to establish God\'s ownership of the land',
      relevance: 'medium'
    }
  ],

  'Genesis.1.26': [
    {
      category: 'TALMUD_BAVLI',
      reference: 'Sanhedrin 38b',
      topic: 'PHILOSOPHY',
      summary: 'Discussion of "Let us make" in plural form',
      quote: 'כשברא הקב"ה אדם הראשון בראו דו פרצופין',
      translation: 'When God created Adam, He created him with two faces',
      relevance: 'high'
    },
    {
      category: 'MIDRASH_RABBAH',
      reference: 'Bereishit Rabbah 8:4',
      topic: 'AGGADAH',
      summary: 'Angels\' debate over human creation',
      quote: 'מלאכי השרת נחלקו',
      translation: 'The ministering angels were divided',
      relevance: 'high'
    }
  ],

  'Genesis.2.7': [
    {
      category: 'TALMUD_BAVLI',
      reference: 'Berakhot 61a',
      topic: 'PHILOSOPHY',
      summary: 'Two inclinations created in man',
      quote: 'וייצר - בשני יודין, שני יצרים ברא בו',
      translation: 'Vayitzer with two yuds - two inclinations created in him',
      relevance: 'high'
    },
    {
      category: 'ZOHAR',
      reference: 'Zohar I:27a',
      topic: 'KABBALAH',
      summary: 'The soul\'s descent into the body',
      relevance: 'high'
    }
  ],

  'Genesis.3.6': [
    {
      category: 'TALMUD_BAVLI',
      reference: 'Sanhedrin 29a',
      topic: 'HALAKHA',
      summary: 'Prohibition against adding to commandments',
      quote: 'שכל המוסיף גורע',
      translation: 'Whoever adds [to a commandment] diminishes',
      relevance: 'high'
    },
    {
      category: 'MIDRASH_RABBAH',
      reference: 'Bereishit Rabbah 19:3',
      topic: 'AGGADAH',
      summary: 'Eve\'s addition to God\'s command enabled the serpent\'s deception',
      relevance: 'high'
    }
  ],

  'Genesis.4.7': [
    {
      category: 'TALMUD_BAVLI',
      reference: 'Kiddushin 30b',
      topic: 'MUSSAR',
      summary: 'Torah study conquers the evil inclination',
      quote: 'בראתי יצר הרע ובראתי לו תורה תבלין',
      translation: 'I created the evil inclination and I created Torah as its antidote',
      relevance: 'high'
    }
  ],

  'Genesis.12.1': [
    {
      category: 'TALMUD_BAVLI',
      reference: 'Sanhedrin 99b',
      topic: 'PHILOSOPHY',
      summary: 'Abraham\'s ten tests',
      quote: 'עשרה נסיונות נתנסה אברהם',
      translation: 'Abraham was tested with ten trials',
      relevance: 'high'
    },
    {
      category: 'MIDRASH_TANCHUMA',
      reference: 'Lekh Lekha 3',
      topic: 'AGGADAH',
      summary: 'The journey of the soul',
      relevance: 'medium'
    }
  ],

  'Genesis.18.1': [
    {
      category: 'TALMUD_BAVLI',
      reference: 'Shabbat 127a',
      topic: 'HALAKHA',
      summary: 'Hospitality greater than receiving the Divine Presence',
      quote: 'גדולה הכנסת אורחים מהקבלת פני שכינה',
      translation: 'Greater is hospitality than receiving the Divine Presence',
      relevance: 'high'
    }
  ],

  'Genesis.22.1': [
    {
      category: 'TALMUD_BAVLI',
      reference: 'Sanhedrin 89b',
      topic: 'PHILOSOPHY',
      summary: 'The binding of Isaac - supreme test of faith',
      relevance: 'high'
    },
    {
      category: 'MIDRASH_RABBAH',
      reference: 'Bereishit Rabbah 55:4',
      topic: 'AGGADAH',
      summary: 'Satan\'s attempts to prevent Abraham',
      relevance: 'high'
    }
  ],

  // === EXODUS ===
  'Exodus.3.14': [
    {
      category: 'TALMUD_BAVLI',
      reference: 'Berakhot 9b',
      topic: 'PHILOSOPHY',
      summary: 'I Am That I Am - the eternal divine name',
      quote: 'אהיה אשר אהיה - אהיה עמם בצרה זו',
      translation: 'I will be - I will be with them in this trouble',
      relevance: 'high'
    },
    {
      category: 'MIDRASH_RABBAH',
      reference: 'Shemot Rabbah 3:6',
      topic: 'PHILOSOPHY',
      summary: 'The meaning of the divine name',
      relevance: 'high'
    }
  ],

  'Exodus.12.2': [
    {
      category: 'TALMUD_BAVLI',
      reference: 'Rosh Hashanah 7a',
      topic: 'HALAKHA',
      summary: 'Four new years and the Jewish calendar',
      relevance: 'high'
    },
    {
      category: 'MECHILTA',
      reference: 'Bo 1',
      topic: 'HALAKHA',
      summary: 'First commandment to Israel as a nation',
      relevance: 'high'
    }
  ],

  'Exodus.19.6': [
    {
      category: 'TALMUD_BAVLI',
      reference: 'Zevachim 115b',
      topic: 'HALAKHA',
      summary: 'Kingdom of priests - firstborn service before Levites',
      relevance: 'high'
    }
  ],

  'Exodus.20.2': [
    {
      category: 'TALMUD_BAVLI',
      reference: 'Makkot 23b-24a',
      topic: 'HALAKHA',
      summary: '613 commandments - Moses taught 611, two directly from God',
      quote: 'תרי״ג מצות נאמרו לו למשה',
      translation: '613 commandments were told to Moses',
      relevance: 'high'
    }
  ],

  'Exodus.21.24': [
    {
      category: 'TALMUD_BAVLI',
      reference: 'Bava Kamma 83b-84a',
      topic: 'HALAKHA',
      summary: 'Eye for an eye means monetary compensation',
      quote: 'עין תחת עין - ממון',
      translation: 'Eye for eye - monetary [compensation]',
      relevance: 'high'
    }
  ],

  // === LEVITICUS ===
  'Leviticus.19.2': [
    {
      category: 'SIFRA',
      reference: 'Kedoshim 1:1',
      topic: 'MUSSAR',
      summary: 'Be holy - separate from immorality',
      quote: 'קדושים תהיו - פרושים תהיו',
      translation: 'Be holy - be separated',
      relevance: 'high'
    },
    {
      category: 'TALMUD_BAVLI',
      reference: 'Yevamot 20a',
      topic: 'HALAKHA',
      summary: 'Sanctify yourself in what is permitted to you',
      quote: 'קדש עצמך במותר לך',
      translation: 'Sanctify yourself in what is permitted',
      relevance: 'high'
    }
  ],

  'Leviticus.19.18': [
    {
      category: 'TALMUD_YERUSHALMI',
      reference: 'Nedarim 9:4',
      topic: 'MUSSAR',
      summary: "Rabbi Akiva: Great principle of the Torah",
      quote: 'ואהבת לרעך כמוך - זה כלל גדול בתורה',
      translation: 'Love your neighbor as yourself - this is a great principle',
      relevance: 'high'
    },
    {
      category: 'TALMUD_BAVLI',
      reference: 'Shabbat 31a',
      topic: 'MUSSAR',
      summary: 'Hillel: What is hateful to you, do not do to others',
      quote: 'דעלך סני לחברך לא תעביד',
      translation: 'That which is hateful to you, do not do to your fellow',
      relevance: 'high'
    }
  ],

  // === NUMBERS ===
  'Numbers.6.24': [
    {
      category: 'TALMUD_BAVLI',
      reference: 'Megillah 18a',
      topic: 'HALAKHA',
      summary: 'Priestly blessing must be recited in Hebrew',
      relevance: 'high'
    },
    {
      category: 'MIDRASH_RABBAH',
      reference: 'Bamidbar Rabbah 11:2',
      topic: 'AGGADAH',
      summary: 'The fifteen words of blessing correspond to fifteen expressions of love',
      relevance: 'high'
    }
  ],

  // === DEUTERONOMY ===
  'Deuteronomy.6.4': [
    {
      category: 'TALMUD_BAVLI',
      reference: 'Berakhot 13b',
      topic: 'HALAKHA',
      summary: 'Requirements for reciting Shema',
      relevance: 'high'
    },
    {
      category: 'TALMUD_BAVLI',
      reference: 'Pesachim 56a',
      topic: 'AGGADAH',
      summary: "Jacob's sons declaring unity of God",
      quote: 'שמע ישראל ה׳ אלהינו ה׳ אחד',
      translation: 'Hear O Israel, the Lord our God, the Lord is One',
      relevance: 'high'
    },
    {
      category: 'ZOHAR',
      reference: 'Zohar II:160b',
      topic: 'KABBALAH',
      summary: 'Unification of the divine attributes',
      relevance: 'high'
    }
  ],

  'Deuteronomy.6.5': [
    {
      category: 'TALMUD_BAVLI',
      reference: 'Berakhot 54a',
      topic: 'MUSSAR',
      summary: 'With all your soul - even if He takes your life',
      quote: 'בכל נפשך - אפילו נוטל את נפשך',
      translation: 'With all your soul - even if He takes your soul',
      relevance: 'high'
    }
  ],

  'Deuteronomy.16.20': [
    {
      category: 'TALMUD_BAVLI',
      reference: 'Sanhedrin 32b',
      topic: 'HALAKHA',
      summary: 'Pursue justice - go to the finest court',
      quote: 'צדק צדק תרדף - הלך אחר בית דין יפה',
      translation: 'Justice, justice pursue - go after the fine court',
      relevance: 'high'
    }
  ],

  'Deuteronomy.30.19': [
    {
      category: 'TALMUD_BAVLI',
      reference: 'Kiddushin 39b',
      topic: 'PHILOSOPHY',
      summary: 'Free will and reward/punishment',
      relevance: 'high'
    }
  ]
};

/**
 * Get all cross-references for a verse
 */
export const getReferencesForVerse = (reference) => {
  const refs = CROSS_REFERENCES[reference];
  if (!refs) {
    return {
      reference,
      hasReferences: false,
      references: [],
      byCategory: {},
      byTopic: {}
    };
  }

  // Group by category
  const byCategory = {};
  const byTopic = {};

  refs.forEach(ref => {
    // By category
    if (!byCategory[ref.category]) {
      byCategory[ref.category] = [];
    }
    byCategory[ref.category].push(ref);

    // By topic
    if (!byTopic[ref.topic]) {
      byTopic[ref.topic] = [];
    }
    byTopic[ref.topic].push(ref);
  });

  return {
    reference,
    hasReferences: true,
    references: refs,
    count: refs.length,
    byCategory,
    byTopic,
    categories: Object.keys(byCategory),
    topics: Object.keys(byTopic)
  };
};

/**
 * Search for references by topic or category
 */
export const searchReferences = (query, options = {}) => {
  const { category, topic, minRelevance } = options;
  const results = [];

  Object.entries(CROSS_REFERENCES).forEach(([verse, refs]) => {
    refs.forEach(ref => {
      const matches = [];

      // Check category filter
      if (category && ref.category !== category) return;

      // Check topic filter
      if (topic && ref.topic !== topic) return;

      // Check relevance filter
      if (minRelevance === 'high' && ref.relevance !== 'high') return;

      // Check query match
      if (query) {
        const q = query.toLowerCase();
        if (
          ref.reference.toLowerCase().includes(q) ||
          ref.summary?.toLowerCase().includes(q) ||
          ref.translation?.toLowerCase().includes(q)
        ) {
          matches.push(ref);
        }
      } else {
        matches.push(ref);
      }

      matches.forEach(match => {
        results.push({
          verse,
          ...match
        });
      });
    });
  });

  return results;
};

/**
 * Get statistics about references
 */
export const getReferenceStats = () => {
  let total = 0;
  const byCategoryCount = {};
  const byTopicCount = {};
  const versesWithRefs = Object.keys(CROSS_REFERENCES).length;

  Object.values(CROSS_REFERENCES).forEach(refs => {
    total += refs.length;
    refs.forEach(ref => {
      byCategoryCount[ref.category] = (byCategoryCount[ref.category] || 0) + 1;
      byTopicCount[ref.topic] = (byTopicCount[ref.topic] || 0) + 1;
    });
  });

  return {
    totalReferences: total,
    versesWithReferences: versesWithRefs,
    averagePerVerse: (total / versesWithRefs).toFixed(1),
    byCategory: byCategoryCount,
    byTopic: byTopicCount
  };
};

/**
 * Get related verses (verses that share references)
 */
export const getRelatedVerses = (reference) => {
  const refs = CROSS_REFERENCES[reference];
  if (!refs) return [];

  const relatedSet = new Set();
  const refSources = new Set(refs.map(r => r.reference));

  // Find verses that share the same rabbinic sources
  Object.entries(CROSS_REFERENCES).forEach(([verse, verseRefs]) => {
    if (verse === reference) return;

    verseRefs.forEach(vRef => {
      if (refSources.has(vRef.reference)) {
        relatedSet.add(verse);
      }
    });
  });

  return Array.from(relatedSet);
};

/**
 * Get Sefaria-style URL for a reference
 */
export const getSefariaUrl = (reference) => {
  // Convert to Sefaria URL format
  const formatted = reference
    .replace(/\s+/g, '_')
    .replace(/:/g, '.');

  return `https://www.sefaria.org/${encodeURIComponent(formatted)}`;
};

const rabbinicReferencesService = {
  REFERENCE_CATEGORIES,
  TOPIC_CATEGORIES,
  getReferencesForVerse,
  searchReferences,
  getReferenceStats,
  getRelatedVerses,
  getSefariaUrl
};

export default rabbinicReferencesService;
