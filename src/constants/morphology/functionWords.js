// =============================================================================
// FUNCTION WORDS & STOP WORDS — extrait de morphology.js (découpage 03/10/2026)
// Source de données pure : aucune dépendance vers le fichier façade.
// morphology.js ré-exporte ces noms (compatibilité des importeurs existants).
// =============================================================================

import { stripAllDiacritics } from '../../utils/hebrewUtils';

export const STOP_WORDS = new Set([
  // Shabbat words - NOT "ש + בת"
  'שבת', 'שבתות', 'שבתון',
  // Common religious terms
  'משנה', 'משניות', // Mishnah - NOT "מ + שנה"
  'שמע', 'שמים', // Shema/heaven - NOT "ש + מע"
  'מלך', 'מלכות', // King/kingdom - NOT "מ + לך"
  'ברכה', 'ברכות', // Blessing - NOT "ב + רכה"
  'כהן', 'כהנים', // Priest
  'לוי', 'לויים', // Levite
  // Aramaic terms
  'גמרא', 'דינא', 'תורה', 'תפלה',
  // Common words that look like prefixed
  'הלכה', 'הלכות', // Halacha
  'כתוב', 'כתובים', // Written
  'מצוה', 'מצוות', // Commandment

  // === BIBLICAL PROPER NAMES - CRITICAL! ===
  // These look like prefixed words but are names!
  'משה', // Moses - NOT "מ + שה" (from + lamb)!
  'מרים', // Miriam - NOT "מ + רים"
  'בנימין', 'בנימן', // Benjamin - NOT "ב + נימין"
  'שמעון', // Shimon - NOT "ש + מעון"
  'שמואל', // Samuel - NOT "ש + מואל"
  'דוד', // David - NOT "ד + וד"
  'שלמה', // Solomon - NOT "ש + למה"

  // === TALMUDIC TECHNICAL TERMS - COMMON IN RASHI ===
  'הוצאה', 'הוצאות', // Carrying out - NOT "ה + וצאה"
  'הכנסה', 'הכנסות', // Carrying in - NOT "ה + כנסה"
  'מלאכה', 'מלאכות', // Work/labor - critical Shabbat term
  'מחנה', 'מחנות', // Camp - NOT "מ + חנה"

  // === LEGAL/PUNISHMENT TERMS - Critical Talmudic words ===
  // These start with prefix letters but are NOT prefixed
  'כרת', // Excision punishment - NOT "כ + רת" (like + cut)
  'כשר', 'כשרה', 'כשרים', // Kosher - NOT "כ + שר"
  'לויה', // Accompaniment - NOT "ל + ויה"
  'מלאכה', 'מלאכות', // Work/labor - NOT "מ + לאכה"
  'מותר', // Permitted - NOT "מ + ותר"
  'מיתה', // Death penalty - NOT "מ + יתה"
  'מלקות', // Lashes - NOT "מ + לקות"

  // === COMMON VERBS/NOUNS starting with ה ===
  'הוצאה', 'הוצאות', // Transfer out - NOT "ה + וצאה"
  'הכנסה', 'הכנסות', // Transfer in - NOT "ה + כנסה"
  'התראה', // Warning - NOT "ה + תראה"
  'היתר', // Permission - NOT "ה + יתר"

  // === WORDS STARTING WITH ש (shin) ===
  'שגגה', 'שגגות', // Unintentional - NOT "ש + גגה"
  'שריפה', // Burning - NOT "ש + ריפה"

  // === WORDS STARTING WITH ב (bet) ===
  'בעי', // Asks (Aramaic) - NOT "ב + עי"

  // === OTHER COMMON TERMS ===
  'לשון', // Language - NOT "ל + שון"
  'דבר', 'דברים', // Thing/word - NOT "ד + בר"

  // === COMMON PRONOUNS - Don't strip further ===
  // These are complete words, dictionary lookups get wrong matches
  'הוא', 'היא', 'הם', 'הן', // he/she/they - NOT further strippable
  'אני', 'אתה', 'את', 'אנחנו', 'אתם', 'אתן', // I/you/we
  'זה', 'זו', 'זאת', 'אלה', 'אלו', // this/these
  'מי', 'מה', 'איזה', 'איזו', // who/what/which
  'כל', 'כלו', 'כולם', // all

  // === COMPOUND PRONOUNS starting with ש (that) ===
  // These parse as ש + pronoun, but the pronoun shouldn't be further stripped
  'שהוא', 'שהיא', 'שהם', 'שהן', // that he/she/they
  'שאני', 'שאתה', 'שאת', // that I/you
  'שזה', 'שזו', 'שאלה', // that this/these

  // === HEBREW NUMBERS - Don't parse as prefixed ===
  // שתים (two) is NOT "ש + תים" (that + ?)
  // These are complete words that happen to start with prefix letters
  'שתים', 'שתי', 'שלש', 'שלשה', 'שלושה', // 2, 3
  'ששה', 'ששים', 'שבע', 'שבעה', 'שמונה', // 6, 7, 8
  'מאה', 'מאות', // 100 - NOT "מ + אה"
  'שנה', 'שנים', 'שנות', // year(s) - NOT "ש + נה"

  // =============================================================================
  // ARAMAIC STOP WORDS (PRO SCHOLAR)
  // Aramaic words that start with Hebrew prefix letters but should NOT be stripped
  // This prevents the Hebrew morphology analyzer from incorrectly parsing them
  // =============================================================================

  // === ARAMAIC DISCOURSE MARKERS starting with ד (daleth) ===
  // ד looks like Hebrew "of/that" prefix but these are complete Aramaic words
  'דאמר', 'דקאמר', // "who said" - NOT "ד + אמר"
  'דתנא', 'דתנן', 'דתני', // "that taught" - NOT "ד + תנא"
  'דהא', 'דהכי', // "for behold" - NOT "ד + הא"
  'דלמא', // "perhaps" - NOT "ד + למא"
  'דאי', 'דכי', // "that if" - NOT "ד + אי"
  'דאיכא', 'דליכא', // "that there is" - NOT "ד + איכא"
  'דאמרי', 'דאמרינן', // "that they say" - NOT "ד + אמרי"
  'דמתני', 'דמתניתין', // "that the Mishnah" - NOT "ד + מתני"
  'דרב', 'דרבי', 'דרבא', 'דרבה', // "of Rav" - NOT "ד + רב"
  'דקתני', // "that it teaches"
  'דכתיב', // "that it is written"

  // === ARAMAIC WORDS starting with ל (lamed) ===
  // ל looks like Hebrew "to" prefix but these are complete Aramaic words
  'לימא', 'לימרו', // "let us say" - NOT "ל + ימא"
  'ליכא', // "there is not" - NOT "ל + יכא"
  'לית', 'ליתא', // "there is not" - NOT "ל + ית"
  'למא', 'למאי', // "for what" - NOT "ל + מאי"
  'לאו', // "not" - NOT "ל + או"

  // === ARAMAIC WORDS starting with מ (mem) ===
  // מ looks like Hebrew "from" prefix but these are complete Aramaic words
  'מאן', 'מאי', // "who/what" - NOT "מ + אן/אי"
  'מנלן', 'מנא', // "from where" - NOT "מ + נלן"
  'מילתא', 'מלתא', // "the matter" - NOT "מ + ילתא"
  'מתני', 'מתניתא', 'מתניתין', // "the Mishnah/teaching" - NOT "מ + תני"

  // === ARAMAIC WORDS starting with ה (hey) ===
  // ה looks like Hebrew "the" prefix but these are Aramaic demonstratives
  'הא', 'האי', // "this/behold" - NOT "ה + א"
  'הני', 'הנך', // "these" - NOT "ה + ני"
  'ההוא', 'ההיא', // "that one" - NOT "ה + הוא"
  'הכי', 'הכא', // "thus/here" - NOT "ה + כי"
  'היכי', 'היכא', // "how/where" - NOT "ה + יכי"
  'השתא', // "now" - NOT "ה + שתא"
  'הוה', 'הוי', // "was/be" - NOT "ה + וה"

  // === ARAMAIC WORDS starting with ב (bet) ===
  // ב looks like Hebrew "in" prefix but these are complete Aramaic words
  'בעי', 'בעיא', 'בעינן', // "needs/asks" - NOT "ב + עי"
  'ברם', // "but" - NOT "ב + רם"
  'בהדי', // "together with" - NOT "ב + הדי"
  // PRO SCHOLAR V4.2: Aramaic positional words - don't strip ב prefix
  'ברישא', 'ברישיה', 'ברישי', // "at the beginning/head" - NOT "ב + רישא"
  'בסיפא', 'בסיפיה', // "at the end" - NOT "ב + סיפא"
  'בגוה', 'בגויה', // "inside it" - NOT "ב + גוה"
  'בתרא', 'בתראה', // "final/latter" - NOT "ב + תרא"

  // === ARAMAIC WORDS starting with כ (kaf) ===
  // כ looks like Hebrew "like" prefix but these are complete Aramaic words
  'כמאן', // "like whom" - NOT "כ + מאן"
  'כגון', // "such as" - NOT "כ + גון"
  'כדי', // "in order to" - NOT "כ + די"

  // === ARAMAIC TECHNICAL TERMS ===
  // These are complete terms that shouldn't be morphologically analyzed
  'סוגיא', 'סוגיה', // "topic/discussion"
  'שמעתא', 'שמעתתא', // "a teaching"
  'גמרא', // "the Gemara" (already above but critical)
  'ברייתא', // "external teaching"
  'תוספתא', // "addition"

  // === ARAMAIC APHEL (CAUSATIVE) VERB FORMS ===
  // These start with ת/א/מ/נ which LOOK like Hebrew prefixes
  // but are actually Aramaic conjugation markers!
  // Example: תפיק = "you bring out" NOT "ת (the) + פיק (trembling)"

  // נפק (go out) → Aphel conjugations
  'תפיק', 'אפיק', 'מפיק', 'נפיק', 'יפיק', // bring out
  'תפקי', 'מפקא', 'אפקי', // bring out (other forms)

  // סלק (go up) → Aphel conjugations
  'תסליק', 'אסליק', 'מסליק', 'נסליק', // raise/remove

  // עיל (enter) → Aphel conjugations
  'תעיל', 'אעיל', 'מעיל', 'נעיל', // bring in

  // חזי (see) → Aphel conjugations
  'תחזי', 'אחזי', 'מחזי', 'נחזי', // show

  // שכח (find) → verb conjugations
  'תשכח', 'אשכח', 'משכח', 'נשכח', // find
  'אשכחן', 'משכחת', 'אשכחינן', // find (other forms)

  // קום (stand) → Aphel conjugations
  'תקום', 'אקום', 'מקים', // establish

  // ידע (know) → Aphel conjugations
  'תודיע', 'אודיע', 'מודיע', // inform
]);

/**
 * Check if a word is a stop word (should not be prefix-stripped)
 * @param {string} word - Cleaned Hebrew word
 * @returns {boolean}
 */
export const isStopWord = (word) => STOP_WORDS.has(word);

export const FUNCTION_WORDS = {
  // === PARTICLES & CONJUNCTIONS ===
  'של': 'of',
  'שֶׁל': 'of',
  'אוֹ': 'or',
  'או': 'or',
  'אם': 'if',
  'אִם': 'if',
  'כי': 'for/because',
  'כִּי': 'for/because',
  'גם': 'also',
  'גַּם': 'also',
  'רק': 'only',
  'אך': 'but/only',
  'אַךְ': 'but/only',
  'אף': 'also/even',
  'אַף': 'also/even',
  'עד': 'until',
  'עַד': 'until',
  'כן': 'so/thus',
  'כֵּן': 'so/thus',
  'לא': 'not',
  'לֹא': 'not',
  'אין': 'there is not',
  'אֵין': 'there is not',
  'יש': 'there is',
  'יֵשׁ': 'there is',
  'הנה': 'behold',
  'הִנֵּה': 'behold',
  'עתה': 'now',
  'עַתָּה': 'now',

  // === RELATIVE PRONOUNS ===
  'אשר': 'that/which',
  'אֲשֶׁר': 'that/which',
  'שהן': 'that they (f)',
  'שֶׁהֵן': 'that they (f)',
  'שהם': 'that they (m)',
  'שֶׁהֵם': 'that they (m)',

  // === QUESTION WORDS ===
  'מה': 'what',
  'מָה': 'what',
  'מי': 'who',
  'מִי': 'who',
  'מאי': 'what (Aramaic)',
  'מַאי': 'what (Aramaic)',
  'איך': 'how',
  'אֵיךְ': 'how',
  'היכי': 'how (Aramaic)',
  'הֵיכִי': 'how (Aramaic)',
  'כיצד': 'how?',
  'כֵּיצַד': 'how?',
  'למה': 'why',
  'לָמָּה': 'why',
  'מדוע': 'why',
  'מַדּוּעַ': 'why',
  'אימתי': 'when',
  'אֵימָתַי': 'when',
  'היכן': 'where',
  'הֵיכָן': 'where',

  // === DEMONSTRATIVES ===
  'זה': 'this (m)',
  'זֶה': 'this (m)',
  'זו': 'this (f)',
  'זוֹ': 'this (f)',
  'זאת': 'this (f)',
  'זֹאת': 'this (f)',
  'אלה': 'these',
  'אֵלֶּה': 'these',
  'אלו': 'these',
  'אֵלּוּ': 'these',
  'הזה': 'this (m)',
  'הַזֶּה': 'this (m)',
  'הזאת': 'this (f)',
  'הַזֹּאת': 'this (f)',

  // === PRONOUNS ===
  'הוא': 'he',
  'הוּא': 'he',
  'היא': 'she',
  'הִיא': 'she',
  'הם': 'they (m)',
  'הֵם': 'they (m)',
  'הן': 'they (f)',
  'הֵן': 'they (f)',
  'אני': 'I',
  'אֲנִי': 'I',
  'אנחנו': 'we',
  'אֲנַחְנוּ': 'we',
  'אתה': 'you (m)',
  'אַתָּה': 'you (m)',
  'את': '(object marker)',
  'אֵת': '(object marker)',
  'אתם': 'you (m.pl)',
  'אַתֶּם': 'you (m.pl)',

  // === COMMON NOUNS (often misparsed) ===
  'בעל': 'master/owner',
  'בַּעַל': 'master/owner',
  'עני': 'poor person',
  'עָנִי': 'poor person',
  'הֶעָנִי': 'the poor person',
  'בית': 'house',
  'בַּיִת': 'house',
  'הַבַּיִת': 'the house',
  'יד': 'hand',
  'יָד': 'hand',
  'יָדוֹ': 'his hand',

  // === COMMON VERBS (often misparsed) ===
  'עומד': 'standing',
  'עוֹמֵד': 'standing',
  'נתן': 'gave',
  'נָתַן': 'gave',
  'נטל': 'took',
  'נָטַל': 'took',
  'פשט': 'extended',
  'פָּשַׁט': 'extended',
  'הוציא': 'took out',
  'הוֹצִיא': 'took out',
  'הכניס': 'brought in',
  'הִכְנִיס': 'brought in',

  // === TALMUDIC TERMS ===
  'חייב': 'liable',
  'חַיָּיב': 'liable',
  'פטור': 'exempt',
  'פָּטוּר': 'exempt',
  'מותר': 'permitted',
  'מוּתָּר': 'permitted',
  'אסור': 'forbidden',
  'אָסוּר': 'forbidden',
  'שניהם': 'both of them',
  'שְׁנֵיהֶם': 'both of them',
  'תנן': 'we learned',
  'תְּנַן': 'we learned',
  'התם': 'there',
  'הָתָם': 'there',
  'הכא': 'here',
  'הָכָא': 'here',
  'גמרא': 'Gemara',
  'גְּמָ׳': 'Gemara',
  "מתני'": 'Mishna',
  'מַתְנִי׳': 'Mishna',

  // === NUMBERS ===
  'שתים': 'two',
  'שְׁתַּיִם': 'two',
  'ארבע': 'four',
  'אַרְבַּע': 'four',
  'שלש': 'three',
  'שָׁלֹשׁ': 'three',
  'חמש': 'five',
  'חָמֵשׁ': 'five',
  'שש': 'six',
  'שֵׁשׁ': 'six',
  'שבע': 'seven',
  'שֶׁבַע': 'seven',
  'שמונה': 'eight',
  'שְׁמוֹנֶה': 'eight',

  // === PLACE/DIRECTION (from the Mishna passage) ===
  'בפנים': 'inside',
  'בִּפְנִים': 'inside',
  'לפנים': 'inside',
  'לִפְנִים': 'inside',
  'בחוץ': 'outside',
  'בַּחוּץ': 'outside',
  'לחוץ': 'outside',
  'לַחוּץ': 'outside',

  // === SABBATH TERMS ===
  // Note: יציאות defined in commentaryUtils.js with fuller definition
  'יְצִיאוֹת': 'goings out, transfers',
  'השבת': 'Shabbat',
  'הַשַּׁבָּת': 'Shabbat',
  'שבת': 'Shabbat',
  'שַׁבָּת': 'Shabbat',
  'שבועות': 'oaths/weeks',
  'שְׁבוּעוֹת': 'oaths/weeks',

  // === PREFIXED COMBINATIONS (common in Mishna) ===
  // These prevent dictionary returning wrong matches for prefixed words
  'ובעל': 'and master of',
  'וּבַעַל': 'and master of',
  'לתוך': 'into',
  'לְתוֹךְ': 'into',
  'מתוכה': 'from inside it',
  'מִתּוֹכָהּ': 'from inside it',
  'לתוכה': 'into it',
  'לְתוֹכָהּ': 'into it',
  'שנתן': 'that gave',
  'שֶׁנָּתַן': 'that gave',
  'שנטל': 'that took',
  'שֶׁנָּטַל': 'that took',
  'והוציא': 'and took out',
  'וְהוֹצִיא': 'and took out',
  'והכניס': 'and brought in',
  'וְהִכְנִיס': 'and brought in',
  'והעני': 'and the poor person',
  'וְהֶעָנִי': 'and the poor person',
  'ונתן': 'and gave',
  'וְנָתַן': 'and gave',
  'ונטל': 'and took',
  'וְנָטַל': 'and took',

  // === VERB FORMS IN CONTEXT ===
  'פטורין': 'are exempt',
  'פְּטוּרִין': 'are exempt',
  'חייבין': 'are liable',
  'חַיָּבִין': 'are liable',

  // =============================================================================
  // ARAMAIC TALMUDIC VOCABULARY (PRO SCHOLAR)
  // Common Gemara terms that often get wrong dictionary matches
  // These are high-frequency terms that appear on almost every daf
  // =============================================================================

  // === ARAMAIC DISCOURSE MARKERS ===
  'אמר': 'said',
  'אָמַר': 'said',
  'דאמר': 'who said',
  'דְּאָמַר': 'who said',
  'קאמר': 'is saying',
  'קָאָמַר': 'is saying',
  'אמרינן': 'we say',
  'אָמְרִינַן': 'we say',
  'אמרי': 'they say',
  'אָמְרִי': 'they say',
  'תנא': 'taught',
  'תָּנָא': 'taught',
  'דתנא': 'that [a Tanna] taught',
  'דְּתָנָא': 'that [a Tanna] taught',
  'דתנן': 'that we learned',
  'דִּתְנַן': 'that we learned',
  'תנינא': 'we have learned',
  'תְּנֵינָא': 'we have learned',
  'לימא': 'let us say',
  'לֵימָא': 'let us say',
  'נימא': 'shall we say',
  'נֵימָא': 'shall we say',
  'קתני': 'it teaches',
  'קָתָנֵי': 'it teaches',
  'תני': 'taught/teaches',
  'תָּנֵי': 'taught/teaches',

  // === ARAMAIC EXISTENTIALS ===
  'איכא': 'there is',
  'אִיכָּא': 'there is',
  'ליכא': 'there is not',
  'לֵיכָּא': 'there is not',
  'איתא': 'it exists',
  'אִיתָא': 'it exists',
  'לית': 'there is not',
  'לֵית': 'there is not',
  'אית': 'there is',
  'אִית': 'there is',

  // === ARAMAIC DEMONSTRATIVES ===
  'הא': 'this/behold',
  'הָא': 'this/behold',
  'הני': 'these',
  'הָנֵי': 'these',
  'ההוא': 'that one (m)',
  'הַהוּא': 'that one (m)',
  'ההיא': 'that one (f)',
  'הַהִיא': 'that one (f)',
  'הכי': 'thus/so',
  'הָכִי': 'thus/so',

  // === ARAMAIC CONJUNCTIONS & PARTICLES ===
  'דהא': 'because/for',
  'דְּהָא': 'because/for',
  'דלמא': 'perhaps/lest',
  'דִּלְמָא': 'perhaps/lest',
  'והא': 'and behold',
  'וְהָא': 'and behold',
  'אלא': 'but/rather',
  'אֶלָּא': 'but/rather',
  'אי': 'if',
  'אִי': 'if',
  'ואי': 'and if',
  'וְאִי': 'and if',
  'כד': 'when',
  'כַּד': 'when',
  'דכי': 'that when',
  'דְּכִי': 'that when',

  // === ARAMAIC VERBS (common forms) ===
  'סבר': 'thinks/holds',
  'סָבַר': 'thinks/holds',
  'קסבר': 'he holds',
  'קָסָבַר': 'he holds',
  'בעי': 'wants/asks',
  'בָּעֵי': 'wants/asks',
  'בעינן': 'we need/want',
  'בָּעֵינַן': 'we need/want',
  'הוה': 'was',
  'הֲוָה': 'was',
  'הוי': 'be!/is',
  'הֱוֵי': 'be!/is',
  'אתי': 'comes',
  'אָתֵי': 'comes',
  'אתא': 'came',
  'אֲתָא': 'came',
  'עביד': 'does/makes',
  'עָבֵיד': 'does/makes',
  'נפק': 'goes out',
  'נָפֵק': 'goes out',
  'נפקא': 'it derives/goes out', // Aramaic feminine - VERY COMMON in Gemara!
  'נָפְקָא': 'it derives',
  'יתיב': 'sits/dwells',
  'יָתֵיב': 'sits/dwells',
  'חזי': 'see!',
  'חֲזִי': 'see!',
  'חזינן': 'we see',
  'חָזֵינַן': 'we see',
  'קרי': 'calls/reads',
  'קָרֵי': 'calls/reads',
  'ידע': 'knows',
  'יָדַע': 'knows',

  // =========================================================================
  // ARAMAIC VERB CONJUGATIONS - NOW COMPUTED BY PATTERN ANALYSIS!
  // =========================================================================
  // These are NO LONGER hardcoded here. Instead, they are computed by:
  //   1. extractAramaicRoot() - detects pattern, reconstructs weak roots
  //   2. computeVerbTranslation() - generates translation from:
  //      - _getRootMeanings()[root].base/causative
  //      - CONJUGATION_PREFIXES[prefix].label (you/I/we/he)
  //      - CONJUGATION_SUFFIXES[suffix].label ((pl)/(f))
  //
  // Example workflow for תפיקו:
  //   Step 1: extractAramaicRoot("תפיקו")
  //     - Strips suffix ו → stem = תפיק
  //     - Identifies prefix ת → verbStem = פיק
  //     - Reconstructs: נ + פ + ק = נפק (validated in COMMON_TALMUDIC_ROOTS)
  //     - Returns: { root: 'נפק', pattern: 'Aphel', conjPrefix: 'ת', suffix: 'ו' }
  //
  //   Step 2: computeVerbTranslation(rootAnalysis)
  //     - _getRootMeanings()['נפק'].causative = 'bring out'
  //     - CONJUGATION_PREFIXES['ת'].label = 'you'
  //     - CONJUGATION_SUFFIXES['ו'].label = '(pl)'
  //     - Returns: "you (pl) bring out"
  //
  // This is SYSTEMATIC - any verb from the ~40 roots is computed, not hardcoded!
  // =========================================================================

  // === TALMUDIC TECHNICAL TERMS ===
  'פשיטא': 'it is obvious',
  'פְּשִׁיטָא': 'it is obvious',
  'תיקו': 'let it stand',
  'תֵּיקוּ': 'let it stand',
  'מנלן': 'from where?',
  'מְנָלַן': 'from where?',
  'שמעינן': 'we derive',
  'שָׁמְעִינַן': 'we derive',
  'משמע': 'it implies',
  'מַשְׁמַע': 'it implies',
  'גמירי': 'we have learned',
  'גְּמִירִי': 'we have learned',
  'סברא': 'reasoning',
  'סְבָרָא': 'reasoning',
  'קמיה': 'before him',
  'קַמֵּיהּ': 'before him',
  'בתריה': 'after him',
  'בַּתְרֵיהּ': 'after him',

  // === COMMON ARAMAIC NOUNS ===
  'מילתא': 'matter/thing',
  'מִילְתָא': 'matter/thing',
  'גברא': 'man',
  'גַּבְרָא': 'man',
  'אתתא': 'woman',
  'אִתְּתָא': 'woman',
  'ביתא': 'house',
  'בֵּיתָא': 'house',
  'עלמא': 'world',
  'עָלְמָא': 'world',
  'דינא': 'law/judgment',
  'דִּינָא': 'law/judgment',
  'מרא': 'master',
  'מָרָא': 'master',

  // === RABBINIC TITLES ===
  'רב': 'Rav/Rabbi',
  'רַב': 'Rav/Rabbi',
  'רבא': 'Rava',
  'רָבָא': 'Rava',
  'רבה': 'Rabbah',
  'רַבָּה': 'Rabbah',
  'אביי': 'Abaye',
  'אַבַּיֵי': 'Abaye',
  'רבינא': 'Ravina',
  'רָבִינָא': 'Ravina',
  'מר': 'Mar (title)',
  'מָר': 'Mar (title)',

  // === BIBLICAL PROPER NAMES ===
  // These MUST have high priority to prevent wrong prefix analysis
  'משה': 'Moses',            // NOT מ+שה (from+lamb)!
  'מֹשֶׁה': 'Moses',
  'מרים': 'Miriam',
  'מִרְיָם': 'Miriam',
  'בנימין': 'Benjamin',
  'בִּנְיָמִין': 'Benjamin',
  'שמעון': 'Shimon',
  'שִׁמְעוֹן': 'Shimon',
  'שמואל': 'Samuel',
  'שְׁמוּאֵל': 'Samuel',
  'דוד': 'David',
  'דָּוִד': 'David',
  'שלמה': 'Solomon',
  'שְׁלֹמֹה': 'Solomon',
  'אברהם': 'Abraham',
  'אַבְרָהָם': 'Abraham',
  'יצחק': 'Isaac',
  'יִצְחָק': 'Isaac',
  'יעקב': 'Jacob',
  'יַעֲקֹב': 'Jacob',

  // === TALMUDIC TECHNICAL TERMS ===
  // Common terms in Gemara/Rashi that need correct translations
  'הוצאה': 'carrying out',     // One of 39 melachot
  'הכנסה': 'bringing in',      // One of 39 melachot
  'מלאכה': 'labor/work',       // Shabbat term
  'מלאכת': 'work of',          // Construct state
  'מחנה': 'camp',              // NOT מ+חנה!
  'לקמן': 'below/later',       // Common Talmud reference
  'לעיל': 'above/earlier',     // Common Talmud reference
  'להלן': 'below/further',     // Common Talmud reference

  // === ARAMAIC DERIVATION TERMS ===
  // These appear constantly in Gemara discussions
  // נפקא and נפקי already defined above in נפק verb forms
  'נפקא לן': 'we derive',
  'נפקא מינה': 'practical difference',
  'מינה': 'from it',
  'דיליף': 'that derives',
  'כדיליף': 'as it derives',
  'דילפינן': 'that we derive',
  'יליף': 'derives/learns',
  'ילפינן': 'we derive/learn',
  'גמר': 'learns (gezeirah shavah)',
  'גמרינן': 'we learn',

  // === SIN/PUNISHMENT TERMS ===
  'שגגה': 'unintentional sin',
  'שגגתו': 'his unintentional sin',
  'זדון': 'intentional sin',
  'זדונו': 'his intentional sin',
  'התראה': 'warning',
  'התראתו': 'his warning',
  'סקילה': 'stoning',
  'שריפה': 'burning',
  'הרג': 'execution by sword',
  'חנק': 'strangulation',

  // === COMMON VERBS WITH PREFIXES ===
  'להביא': 'to bring',
  'להוציא': 'to take out',
  'להכניס': 'to bring in',
  'לעשות': 'to do',
  'לומר': 'to say',
  'לפרש': 'to explain',

  // === REFERENCE TERMS ===
  'העומדים': 'those standing',
  'העומד': 'the one standing',
  'היושבים': 'those sitting',
  'היושב': 'the one sitting',
  'בעה"ב': 'homeowner',
  'בע"ה': 'homeowner',
  // Hebrew gershayim (״) variants - same abbreviations with proper Hebrew quotation mark
  'בעה״ב': 'homeowner',
  'בע״ה': 'homeowner',
  "בעל הבית": 'homeowner',

  // === DOMAIN ABBREVIATIONS ===
  // Common Talmudic abbreviations
  "רה\"י": 'private domain',
  "רה\"ר": 'public domain',
  "רשות היחיד": 'private domain',
  "רשות הרבים": 'public domain',
  "מרה\"י": 'from private domain',
  "לרה\"ר": 'to public domain',
  "מרה\"ר": 'from public domain',
  "לרה\"י": 'to private domain',

  // === ARAMAIC PRONOUNS/SUFFIXES ===
  'לן': 'to us',               // Common Aramaic suffix
  'לכו': 'to you (pl)',
  'להו': 'to them',
  'ליה': 'to him',
  'לה': 'to her',
  'מיניה': 'from him',
  // מינה already defined above in derivation terms
  'עליה': 'on it/her',
  'עלה': 'on it/her',
  'בהדיה': 'with him',
  'גביה': 'with him/at him',

  // === ADDITIONAL TALMUDIC REFERENCE TERMS ===
  // (Unique additions - duplicates removed)
  'כדאמרינן': 'as we say',
  'כדתנן': 'as we learned',
  'כדאמר': 'as says',
  'ואזיל': 'and goes/continues',
  'אזיל': 'goes',

  // === DOMAIN/RESHUT TERMS ===
  'רשות': 'domain',
  'רשויות': 'domains',
  'עקירה': 'uprooting/lifting',
  'הנחה': 'placing/setting down',
  'עקר': 'uprooted',
  'הניח': 'placed',

  // === ARAMAIC POSITIONAL TERMS (ריש/סיפא) ===
  // CRITICAL: These are complete words, NOT "ב + ריש" - don't match ברא (create)!
  'ברישא': 'at the beginning',
  'ברישיה': 'at its beginning',
  'ברישי': 'at the beginnings',
  'רישא': 'the beginning',
  'רישיה': 'its beginning',
  'בסיפא': 'at the end',
  'בסיפיה': 'at its end',
  'סיפא': 'the end',

  // === PARTICIPLES (common) ===
  'הזורק': 'the one who throws',
  'זורק': 'throws/throwing',
  'העוקר': 'the one who uproots',
  'עוקר': 'uproots/uprooting',
  'המניח': 'the one who places',
  'מניח': 'places/placing',

  // === VERB FORMS (common Talmudic) ===
  'הוסיפו': 'they added',
  'הוסיף': 'he added',
  'ויעבירו': 'and they proclaimed',  // Hiphil of עבר - "caused to pass/proclaimed"
  'ויעביר': 'and he proclaimed',     // Hiphil singular
  'העבירו': 'they proclaimed',       // Hiphil perfect
  'העביר': 'he proclaimed',          // Hiphil perfect singular
  'מויצו': 'and they commanded',     // ויצו with prefix
  'תפיקו': 'you shall bring out',    // Future plural from נפק

  // === COMMON TALMUDIC PHRASES ===
  'אי הכי': 'if so',
  'מאי טעמא': 'what is the reason',
  'מנא לן': 'from where do we know',
  'לכתחלה': 'from the outset',
  'לכתחילה': 'from the outset',
  'בדיעבד': 'after the fact',
  'מדאורייתא': 'by Torah law',
  'מדרבנן': 'by Rabbinic law',

  // === COMMON TALMUDIC ABBREVIATIONS (bare form, no geresh) ===
  // Must match before prefix analysis strips the leading ו (see וגו → גו "inside")
  'וגו': 'etc. (וגומר)',
  'וכו': 'etc. (וכולי)',
  'וגומר': 'etc.',
  'וכולי': 'etc.',
  'חז"ל': 'Sages of blessed memory',
  'שליט"א': 'may his honor be protected',

  // === CHAPTER/SECTION REFERENCES ===
  'ובפ\'': 'and in chapter',      // Common abbreviation
  'בפ\'': 'in chapter',
  'פ\'': 'chapter',
  'ד\'': 'page',
  'דף': 'page',

  // === COMMON VERB CONJUGATIONS ===
  'דבע"ה': 'of homeowner',        // Common shorthand (ASCII quotes)
  'דבע״ה': 'of homeowner',        // Hebrew gershayim variant
  'שעשאוה': 'who did it',
  'שעשאוהו': 'who did it (to him)',
  'פטורים': 'exempt (pl)',
  'חייבים': 'liable (pl)',
};

/**
 * Lookup a function word for quick inline translation
 * Returns null if not a known function word (fall back to dictionary)
 * @param {string} word - Hebrew word (with or without vowels)
 * @returns {string|null} - Short English translation or null
 */
export const lookupFunctionWord = (word) => {
  if (!word) return null;

  // Strip trailing punctuation (period, comma, colon, semicolon, dash, etc.)
  // This is needed because text often includes punctuation with words
  // Includes Hebrew punctuation: ׳ (geresh/abbreviation), ״ (gershayim), ־ (maqaf), ׃ (sof pasuq), ׀ (paseq)
  const noPunct = word.replace(/[.,;:!?\-—–׳״־׃׀]+$/, '');

  // Try exact match first (with punctuation stripped)
  if (FUNCTION_WORDS[noPunct]) return FUNCTION_WORDS[noPunct];

  // Try without vowels (strip nikud) - use hebrewUtils (DRY)
  const stripped = stripAllDiacritics(noPunct);
  if (FUNCTION_WORDS[stripped]) return FUNCTION_WORDS[stripped];

  // Try original word as fallback
  if (FUNCTION_WORDS[word]) return FUNCTION_WORDS[word];

  return null;
};
