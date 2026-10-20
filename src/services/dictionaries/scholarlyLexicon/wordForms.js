// =============================================================================
// Génération de variantes morphologiques pour les lookups
// (extrait de scholarlyLexiconService.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

import { extractRoot } from './rootUtils';

/**
 * Generate word form variants for lookup
 * Handles prefixes, suffixes, plural forms, construct states, verb conjugations
 * Enhanced for better Torah Hebrew matching
 */
export const generateWordForms = (word) => {
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

  // Step 7: Try ADDING common endings for incomplete forms
  // This helps Aramaic words like "יציא" match dictionary entries like "יציאה"
  // Only for words that might be truncated (3-5 letters, not already ending with common suffix)
  if (word.length >= 3 && word.length <= 6) {
    const commonEndings = [
      'ה',   // Feminine singular (יציא → יציאה)
      'א',   // Aramaic definite (מלכ → מלכא)
      'תא',  // Aramaic definite feminine
      'ת',   // Feminine construct
    ];

    // Don't add endings if word already ends with them
    for (const ending of commonEndings) {
      if (!word.endsWith(ending)) {
        forms.add(word + ending);
      }
    }

    // For words ending in א (Aramaic definite), also try ה variant
    // יציא → יציאה (the ה ending is often the dictionary form)
    if (word.endsWith('א') && !word.endsWith('תא')) {
      forms.add(word.slice(0, -1) + 'ה');
    }
  }

  return Array.from(forms);
};
