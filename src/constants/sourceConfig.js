/**
 * PRO SCHOLAR V5: Unified source configuration with tier information
 * Single source of truth for all dictionary/source metadata
 *
 * Extracted to its own module to avoid circular dependencies
 * (wordLookupHelpers <-> rootExtraction).
 *
 * Tiers:
 * - gold: Academic standard dictionaries (highest reliability, +5 bonus)
 * - silver: Established reference works (0 bonus)
 * - bronze: Algorithmic or general sources (-3 bonus)
 */
export const SOURCE_CONFIG = {
  // GOLD TIER - Academic standard
  bdb: { fullName: 'Brown-Driver-Briggs Hebrew Lexicon', shortName: 'BDB (1906)', year: 1906, tier: 'gold', bonus: 5, language: 'hebrew' },
  jastrow: { fullName: "Jastrow's Dictionary of Targumim, Talmud", shortName: 'Jastrow (1903)', year: 1903, tier: 'gold', bonus: 5, language: 'aramaic' },
  halot: { fullName: 'Hebrew and Aramaic Lexicon of the Old Testament', shortName: 'HALOT', year: 2000, tier: 'gold', bonus: 5, language: 'both' },
  cal: { fullName: 'Comprehensive Aramaic Lexicon (Hebrew Union College)', shortName: 'CAL', year: 2023, tier: 'gold', bonus: 5, language: 'aramaic' },

  // SILVER TIER - Established reference
  strongs: { fullName: "Strong's Exhaustive Concordance", shortName: "Strong's", tier: 'silver', bonus: 0, language: 'hebrew' },
  strong: { fullName: "Strong's Concordance", shortName: "Strong's", tier: 'silver', bonus: 0, language: 'hebrew' }, // alias
  klein: { fullName: "Klein's Etymological Dictionary", shortName: 'Klein', year: 1987, tier: 'silver', bonus: 0, language: 'hebrew' },
  gesenius: { fullName: "Gesenius' Hebrew Grammar & Lexicon", shortName: 'Gesenius', year: 1910, tier: 'silver', bonus: 0, language: 'hebrew' },
  twot: { fullName: 'Theological Wordbook of the Old Testament', shortName: 'TWOT', year: 1980, tier: 'silver', bonus: 0, language: 'hebrew' },

  // BRONZE TIER - General/algorithmic
  sefaria: { fullName: 'Sefaria.org Lexicon', shortName: 'Sefaria', tier: 'bronze', bonus: -3, language: 'both' },
  steinsaltz: { fullName: 'Steinsaltz Talmud Translation', shortName: 'Steinsaltz', year: 1989, tier: 'bronze', bonus: -3, language: 'aramaic' },
  bolls: { fullName: 'Bolls.life Bible Dictionary', shortName: 'Bolls', year: 2020, tier: 'bronze', bonus: -3, language: 'hebrew' }
};

/**
 * Tier reliability scores
 */
export const TIER_RELIABILITY = {
  gold: 0.95,
  silver: 0.85,
  bronze: 0.70
};
