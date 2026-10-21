// =============================================================================
// Patterns morphologiques (regex) — verbes hébreux, verbes araméens, noms
// (extrait de constants/morphology.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

// =============================================================================
// SMART PATTERN-BASED ROOT DETECTION
// Instead of hardcoding every word, detect patterns that indicate complete roots
// This is the PRO SCHOLAR approach - systematic, not hardcoded
// =============================================================================

/**
 * Hebrew verb patterns (binyanim) - these indicate the word is a complete verb
 * Pattern: X = any consonant, vowels vary by binyan
 */
export const VERB_PATTERNS = [
  // HIFIL patterns (starts with ה but is a verb form, not prefix)
  /^ה[א-ת][א-ת][א-ת]$/,  // הגיד, הביא, הכניס (Hifil past 3ms)
  /^מ[א-ת][א-ת][א-ת]$/,  // מגיד, מביא (Hifil participle)
  /^ת[א-ת][א-ת][א-ת]$/,  // תגיד, תביא (Hifil future 2ms/3fs)
  // HITPAEL patterns (starts with הת)
  /^הת[א-ת][א-ת][א-ת]$/,  // התפלל, התקדש
  // NIFAL patterns (starts with נ)
  /^נ[א-ת][א-ת][א-ת]$/,  // נתן, נפל (Nifal/some Qal)
  // PIEL/PUAL patterns (middle letter doubled - approximation)
  /^[א-ת][א-ת][א-ת][א-ת]$/,  // 4-letter = likely intensive form
];

// =============================================================================
// ARAMAIC VERB PATTERNS (PRO SCHOLAR)
// =============================================================================
// CRITICAL: In Aramaic, ת/א/מ/נ at the start of verbs are CONJUGATION MARKERS,
// NOT Hebrew prefixes! This is why תפיק gets incorrectly parsed as ת+פיק.
//
// Aramaic verb conjugation uses these prefixes:
// - ת = 2nd person (you) / 3rd feminine / future
// - א = 1st person singular (I)
// - מ = participle (one who...)
// - נ = 1st person plural (we)
// - י = 3rd person masculine
//
// Example: תפיק (from root נפק "go out" in Aphel form)
// - NOT: ת (Hebrew "the") + פיק (trembling)
// - IS: Aramaic "you will bring out" (causative of "go out")
// =============================================================================

export const ARAMAIC_VERB_PATTERNS = [
  // === APHEL/AFEL (Causative) - Most common Aramaic pattern ===
  // Like Hebrew Hifil. Pattern: *פע*יל or *פי*ק
  // These have vowel י in middle and start with conjugation prefix
  /^[תאמני][א-ת][יו][א-ת]$/,  // תפיק, אפיק, מפיק, נפיק, יפיק (4 letters with י)
  /^[תאמני][א-ת][א-ת][יו][א-ת]$/,  // תסליק, אסליק (5 letters with י)

  // === PEAL (Basic) ===
  // Like Hebrew Qal. Basic triliteral root.
  // In perfect: כתב, אמר. In imperfect: יכתוב, תכתוב, אכתוב
  /^[תאמני][א-ת][ו][א-ת]$/,  // תכתוב, אכתוב (imperfect with ו)

  // === PAEL (Intensive) ===
  // Like Hebrew Piel. Middle radical doubled (shown by dagesh, not visible)
  // Pattern: קט*ל or in imperfect: מקט*ל
  /^[מתא][א-ת][א-ת][א-ת][א-ת]$/,  // מקטרג, מפרנס (Pael participle)

  // === ITHPEEL (Reflexive) ===
  // Like Hebrew Hitpael. Starts with את/אית
  /^א[תי][א-ת][א-ת][א-ת]$/,  // אתפעל, אתקדש (5 letters starting with את)
  /^מ[תי][א-ת][א-ת][א-ת]$/,  // מתפעל (Ithpeel participle)

  // === ITHPAAL ===
  // Reflexive of Pael
  /^א[תי][א-ת][א-ת][א-ת][א-ת]$/,  // אתפרנס (6 letters)

  // === SHAPHEL (Causative variant) ===
  // Starts with ש
  /^ש[א-ת][א-ת][א-ת]$/,  // שעבד, שלים (Shaphel)

  // === Common Aramaic perfect endings ===
  // Past tense 3rd person masculine with ת ending
  /^[א-ת][א-ת][א-ת]ת$/,  // אמרת, כתבת (he said/wrote - perfect with ת)
];

/**
 * Noun patterns that look prefixed but are complete words
 * These are morphological patterns (mishkal/mishkalim)
 */
export const NOUN_PATTERNS = [
  // מקטל pattern - Nouns starting with מ (place/instrument)
  // מזבח (altar), משכן (tabernacle), מקדש (sanctuary), מלאכה (work)
  /^מ[א-ת][א-ת][א-ת]ה?$/,
  // הקטלה pattern - Abstract nouns starting with ה
  // הלכה, הכנסה, הוצאה, הגדה
  /^ה[א-ת][א-ת][א-ת]ה$/,
  // שקטל pattern - Nouns starting with ש (not relative pronoun)
  // שבת, שלום, שמים - when followed by certain patterns
  /^ש[מנלרבכ][א-ת][א-ת]$/,  // Common shin-root nouns
];
