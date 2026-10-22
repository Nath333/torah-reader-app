// =============================================================================
// Classificateurs de définitions — garbage, noms propres, grammatical,
// noms obscurs, translittération-seule.
// (extrait de definitionCleaner.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

// Garbage definitions that are just grammatical markers - REJECT these
export const GARBAGE_DEFINITIONS = [
  /^(noun|verb|adjective|adverb|preposition|conjunction|interjection|pronoun)\.?$/i,
  /^(n\.|v\.|adj\.|adv\.|prep\.|conj\.|interj\.|pron\.)$/i,
  /^(masculine|feminine|plural|singular)\.?$/i,
  /^(m\.|f\.|pl\.|sing\.)$/i,
  /^(unknown|uncertain)\.?$/i,
  /^(proper noun|pr\. n\.)$/i,
  /^[mfn]\.\s*$/i,
  /^\s*$/,
];

// =============================================================================
// PROPER NOUN DETECTION
// Dictionary entries for people/places should be SKIPPED for common word lookup
// Pattern: "hen I", "adam II", "Moses III" = multiple people with same name
// Pattern: "Tima, an Amora" = Rabbi's name with title
// =============================================================================
const PROPER_NOUN_PATTERNS = [
  // **CRITICAL** "name of X Israelites" - Jastrow entries for proper names
  /name\s+of\s+(?:\w+\s+)?(?:Israelites?|Amoras?|Tannas?|persons?|rabbis?|men|women)/i,
  // "name of a place", "name of a city"
  /name\s+of\s+(?:a\s+)?(?:place|city|town|village|mountain|river|region)/i,
  // Name followed by Roman numeral (person number): "hen I", "adam II"
  /^[a-z]+\s+[IVX]+$/i,
  // Name followed by number in parens: "hen (1)", "adam (2)"
  /^[a-z]+\s*\(\d+\)$/i,
  // Starts with "pr.n." marker
  /^pr\.?\s*n\.?\s/i,
  // "proper name" marker
  /proper\s+name/i,
  // "n.pr." marker (noun proper)
  /^n\.?\s*pr\.?\s/i,
  // Single capitalized name (but allow phrases like "the king")
  /^[A-Z][a-z]+$/,
  // Name with "son of" pattern
  /^[A-Z][a-z]+\s+(?:son|daughter)\s+of/i,
  // Location marker "in Judah", "of Israel"
  /^(?:in|of|from)\s+[A-Z][a-z]+$/i,
  // BDB format "word . part-of-speech": "hen . pronoun", "tsav . noun"
  /^[a-z]+\s*\.\s*(?:pronoun|noun|verb|adj|adv|prep|conj|interj)/i,
  // Rabbi/person names with titles: "Tima, an Amora", "Rav Huna", "Rabbi Akiva"
  /^[A-Za-z]+,?\s+(?:an?\s+)?(?:Amora|Tanna|Sage|Rabbi|Rav|Mar|Abba)/i,
  // Name followed by description: "m. Tima, an Amora" (m. = masculine marker)
  /^[mfn]\.\s*[A-Za-z]+,?\s+(?:an?\s+)?(?:Amora|Tanna|Sage)/i,
  // Place names with location markers
  /^[A-Za-z]+,?\s+(?:a city|a town|a village|in\s+)/i,
  // "m. = אוּמָד" format (gender marker = Hebrew word) - not a real definition
  /^[mfn]\.\s*=\s*[\u0590-\u05FF]/,
  // "בי"ת Beth" format - Hebrew + transliteration only
  /^[\u0590-\u05FF]+\s+[A-Z][a-z]+$/,
];

// =============================================================================
// SMART HOMOGRAPH DETECTION
// Instead of hardcoding specific wrong definitions, use SEMANTIC ANALYSIS:
// - Function words (מן, על, ב, ל, כ) should have GRAMMATICAL definitions
// - Nouns like "a musical chord" are wrong for common function words
// - Detect by definition PATTERN, not specific words
// =============================================================================

/**
 * GRAMMATICAL DEFINITION PATTERNS
 * These are patterns that indicate a word is being used grammatically
 * (preposition, conjunction, particle, etc.)
 */
const GRAMMATICAL_PATTERNS = [
  // Prepositions
  /^(from|to|in|on|upon|at|by|with|for|of|into|onto|against|before|after|under|over|between|among|through|about|concerning)$/i,
  // Conjunctions
  /^(and|or|but|that|which|who|whom|because|if|when|while|although|though|whether|since|until|unless|so|yet|nor)$/i,
  // Particles/demonstratives
  /^(the|this|that|these|those|what|how|there|here|thus|so|then|now|not|no|yes|also|even|only|just|very|more)$/i,
  // Pronouns
  /^(he|she|it|they|we|you|I|him|her|them|us|me|his|hers|its|their|our|my|your)$/i,
  // Question words
  /^(who|what|where|when|why|how|which|whose)$/i,
  // Relative particles
  /^(that which|which is|who is|where|when|because|since)$/i,
  // Short preposition phrases
  /^(in the|to the|from the|on the|with the|by the|for the)$/i,
];

/**
 * OBSCURE NOUN PATTERNS
 * Definitions that are clearly NOUNS (not grammatical) and likely wrong for common words
 * These are patterns, not specific words - DICTIONARY-DRIVEN
 */
const OBSCURE_NOUN_PATTERNS = [
  // "a X" or "an X" pattern where X is an obscure/technical noun
  /^an?\s+(?:musical|portion|yoke|gnat|louse|debt|flash|signal|encampment|dwelling)/i,
  /^an?\s+(?:outgo|injunction|utterance|issuance|bath|Hebrew measure|custom)/i,
  // Musical/technical terms that are almost never right in Talmudic context
  /^an?\s+(?:musical\s+chord|stringed\s+instrument)/i,
  // Scientific/technical terms unlikely for common Talmudic words
  /^(?:an?\s+)?(?:insect|pest|parasite|reptile|amphibian)/i,
  // Rare concrete nouns
  /^(?:an?\s+)?(?:strap|thong|cord|string|rope|whip|lash)/i,
  // Abstract nouns that are rarely primary meanings (EXPANDED)
  /^(?:calamity|ruin|destruction|poverty|wretchedness|misery|trouble|intermission|bisection|carelessness)$/i,
  // Physical objects unlikely for function words
  /^(?:an?\s+)?(?:vessel|container|pot|jar|utensil)/i,
  // BDB format showing wrong entry: "sarah . שָׂרָה verb persist" or "word . Hebrew definition"
  /^[a-z]+\s*\.\s*[\u0590-\u05FF]+\s+(?:verb|noun|adj)/i,
  /^[a-z]+\s+[\u0590-\u05FF]+\s+verb\b/i,
  // Truncated definitions with "i" at end (from "i.e." or similar)
  /,\s*i$/i,
  /\s+i$/i,  // Ends with lone "i" with space before
  // Truncated definitions: "word, i" pattern
  /^[a-z]+,\s*i$/i,
  // Adverbs that are often wrong (e.g., "properly" for נדבה)
  /^(?:properly|certainly|surely|truly)$/i,
  // Bracketed content that got extracted wrong
  /^\{[^}]+\}$/,
  // Definition is just a measure/unit description
  /^(?:a\s+)?(?:bath|measure|liquid measure)/i,
  // Parenthetical fragments: "( Pfl.", "(word" without closing
  /^\(\s*[A-Za-z]+\.?\s*$/,
  // Just "issue" or similar single vague noun (often wrong homograph)
  /^(?:issue|outgo|output|debt|trouble|custom)$/i,
  // Starts with lowercase then has Hebrew + verb (BDB format)
  /^[a-z]+\s+[\u0590-\u05FF]+\s+(?:verb|noun|adj|to\s)/i,
  // Numbers and codes (Strong's number only, no definition)
  /^H\d{4,5}$/i,
  // Two prepositions together (parse error): "in on", "to from", etc.
  /^(?:in|on|to|from|at|by|with|for)\s+(?:in|on|to|from|at|by|with|for)$/i,
  // Single number/digit definitions
  /^\d+$/,
  // Jastrow reference format: "* תּוֹכָה f. (v."
  /^\*\s*[\u0590-\u05FF]+\s*[mfn]\.\s*\(/,
  // Just a Hebrew word with parenthetical: "* תּוֹכָה f. (v. תּוֹךְ"
  /^\*?\s*[\u0590-\u05FF]+\s*[mfn]?\.\s*\(v\./i,
  // Object marker (particle, not definition): "(object marker)"
  /^\(?object\s*marker\)?$/i,
  // Just says "prefix" or "suffix" (with optional number)
  /^(?:\d+\)\s*)?prefix$/i,
  /^(?:\d+\)\s*)?suffix$/i,
  // Numbered entries: "1) prefix", "2) word", etc. - dictionary notation
  /^\d+\)\s*\w+$/,
  // NOTE: Short words (2-4 letters) are NOT filtered here by length alone
  // Valid definitions like "king", "rest", "hand", "from", "they" would be lost
  // Known transliterations are filtered explicitly in TRANSLITERATION_PATTERNS
];

/**
 * Check if a definition looks grammatical (preposition, conjunction, etc.)
 * @param {string} def - Definition text
 * @returns {boolean} - True if grammatical
 */
export const isGrammaticalDefinition = (def) => {
  if (!def || typeof def !== 'string') return false;
  const trimmed = def.trim().toLowerCase();

  // Very short = likely grammatical
  if (trimmed.length <= 6) return true;

  // Check patterns
  for (const pattern of GRAMMATICAL_PATTERNS) {
    if (pattern.test(trimmed)) return true;
  }

  return false;
};

/**
 * Check if a definition looks like an obscure noun (likely wrong for common words)
 * @param {string} def - Definition text
 * @returns {boolean} - True if this looks like a wrong/obscure noun entry
 */
export function isObscureNounDefinition(def) {
  if (!def || typeof def !== 'string') return false;
  const trimmed = def.trim();

  // Check patterns
  for (const pattern of OBSCURE_NOUN_PATTERNS) {
    if (pattern.test(trimmed)) return true;
  }

  return false;
}

// =============================================================================
// TRANSLITERATION-ONLY DETECTION
// BDB/Strong's sometimes returns just the transliteration without definition
// These should be SKIPPED - they're not useful translations
// =============================================================================
const TRANSLITERATION_PATTERNS = [
  // Transliteration with special vowel marks REQUIRED: "kānās", "shābhāth"
  // Must contain at least one diacritic (ā, ē, ī, ō, ū, â, ê, î, ô, û, ḥ, ṣ, etc.) to match
  // This prevents filtering valid English words like "king", "rest", "stoning"
  /^[a-zāēīōūâêîôûḥṣśṭ]*[āēīōūâêîôûḥṣśṭ][a-zāēīōūâêîôûḥṣśṭ]*$/i,
  // Hebrew transliteration followed by Hebrew: "nephaq נְפַק"
  /^[a-z]+\s+[\u0590-\u05FF]/i,
  // Common Hebrew/Aramaic transliterations that are NOT definitions
  // Expanded list based on actual dictionary entries that get confused with definitions
  /^(?:kanas|nephaq|tsav|gav|reshut|nafak|shabbat|yom|kol|ben|bar|sarah|moshe|adam|hen|jah|tov|ra|chai|met|ish|isha|av|em|bat|am|goy|tama|tima)$/i,
  /^(?:baal|cohen|kohen|levi|torah|mitzvah|mitzva|tefila|bracha|beracha|shema|kadosh|kodesh|olam|malakh|malach)$/i,
  /^(?:chesed|hesed|emeth|emet|tzedek|tsedek|shalom|kavod|ruach|nefesh|neshamah|lev|shamayim|eretz|mayim)$/i,
  /^(?:avodah|korban|ohel|mishkan|mikdash|beit|bayit|kedusha|tahara|tumah|issur|heter)$/i,
  // Aramaic transliterations (Talmudic terms)
  /^(?:gemara|sugya|amora|tanna|halakha|halacha|aggada|midrash|tosefta|baraita|mishna|masechet)$/i,
  /^(?:dina|alma|milta|gavra|isha|mara|rav|rabbi|abba|ima|bar|bat|beith|beit)$/i,
  // Definition in brackets (Strong's format) - usually just transliteration
  /^\([a-z]{2,10}\)$/i,
  // Parenthetical at start with just letters: "(Pfl." etc.
  /^\(\s*[A-Za-z]{2,6}\.?\s*$/,
];

/**
 * Check if definition is just a transliteration (not a real translation)
 * IMPORTANT: Be conservative - only filter KNOWN transliterations
 * Valid short words like "king", "rest", "from" should NOT be filtered
 */
export function isTransliterationOnly(def) {
  if (!def || typeof def !== 'string') return false;
  const trimmed = def.trim();

  // Check explicit patterns only - don't filter based on length alone
  // Many valid English definitions are short: "king", "from", "cut", "rest"
  for (const pattern of TRANSLITERATION_PATTERNS) {
    if (pattern.test(trimmed)) return true;
  }

  return false;
}

/**
 * Check if a definition looks like a proper noun entry
 * These should be SKIPPED when looking up common words
 * @param {string} def - Definition text
 * @returns {boolean} - True if this looks like a proper noun
 */
export function isProperNounEntry(def) {
  if (!def || typeof def !== 'string') return false;
  const trimmed = def.trim();

  // Check against proper noun patterns
  for (const pattern of PROPER_NOUN_PATTERNS) {
    if (pattern.test(trimmed)) return true;
  }

  // Additional check: very short text that's just a capitalized name
  // "Hen", "Adam", "Moses" - but NOT "king", "ruler", "they"
  if (/^[A-Z][a-z]{1,10}$/.test(trimmed)) {
    // Common nouns that happen to start with capital are OK
    const commonCapitalized = ['King', 'Lord', 'God', 'Law', 'Torah', 'Sabbath'];
    if (!commonCapitalized.includes(trimmed)) {
      return true;
    }
  }

  return false;
};

/**
 * Extract the most meaningful part from a comma-separated definition
 *
 * @param {string} definition - Full definition text
 * @param {Object} options - Options
 * @param {boolean} options.returnCrossRef - If true, return cross-reference target instead of null
 * @returns {string|null} - Best meaningful part, cross-ref target (prefixed with "→"), or null
 */
