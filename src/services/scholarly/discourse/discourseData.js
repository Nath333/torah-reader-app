// Discourse Pattern Service — DONNÉES (split 03/10/2026)
// Types, patterns et marqueurs talmudiques. Purement déclaratif : aucune
// dépendance. La façade (discoursePatternService.js) ré-exporte ces 5 noms.

/**
 * Talmudic Discourse Pattern Types
 * Based on scholarly research of formulaic terms in Talmud Bavli
 */
export const DISCOURSE_TYPES = {
  MISHNA: 'mishna',
  GEMARA: 'gemara',
  QUESTION: 'question',
  OBJECTION: 'objection',
  PROOF: 'proof',
  RESOLUTION: 'resolution',
  ALTERNATIVE: 'alternative',
  SOURCE_CITATION: 'source_citation',
  SPEAKER: 'speaker',
  LEGAL_RULING: 'legal_ruling',
  NARRATIVE: 'narrative',
  EXPLICATION: 'explication'
};

/**
 * Pattern Configuration
 * Each pattern has markers, display info, and semantic meaning
 */
export const DISCOURSE_PATTERNS = {
  // ==========================================================================
  // STRUCTURAL MARKERS - Identify major text divisions
  // ==========================================================================
  mishna: {
    type: DISCOURSE_TYPES.MISHNA,
    markers: [
      'מתני׳', 'מתניתין', 'תנן', 'שנינו', 'תנינא', 'משנה',
      'מַתְנִי׳', 'מַתְנִיתִין'
    ],
    label: 'Mishna',
    hebrewLabel: 'משנה',
    icon: '📘',
    color: '#3B82F6', // Blue
    description: 'Mishnaic source text',
    cssClass: 'discourse-mishna'
  },

  gemara: {
    type: DISCOURSE_TYPES.GEMARA,
    markers: [
      'גמ׳', 'גמרא', 'גְּמָ׳', 'גְּמָרָא'
    ],
    label: 'Gemara',
    hebrewLabel: 'גמרא',
    icon: '📜',
    color: '#8B4513', // Brown
    description: 'Gemara discussion begins',
    cssClass: 'discourse-gemara'
  },

  // ==========================================================================
  // SOURCE INDICATORS - Where information comes from
  // ==========================================================================
  tannaitic_source: {
    type: DISCOURSE_TYPES.SOURCE_CITATION,
    markers: [
      'תנו רבנן', 'תנא', 'תניא', 't\'na', 'ת״ר',
      'תָּנוּ רַבָּנָן', 'תַּנְיָא'
    ],
    label: 'Baraita',
    hebrewLabel: 'ברייתא',
    icon: '📋',
    color: '#6366F1', // Indigo
    description: 'External Tannaitic source (Baraita/Tosefta)',
    cssClass: 'discourse-baraita'
  },

  // PRO SCHOLAR V25: Parallel Mishna citation - "We learned elsewhere"
  parallel_mishna: {
    type: DISCOURSE_TYPES.SOURCE_CITATION,
    markers: [
      'תנן התם', 'תְּנַן הָתָם', 'תנינא התם', 'הא תנן', 'הָא תְּנַן',
      'דתנן', 'דִּתְנַן', 'כדתנן', 'כִּדְתְנַן'
    ],
    label: 'Parallel Mishna',
    hebrewLabel: 'משנה מקבילה',
    icon: '📜',
    color: '#0EA5E9', // Sky blue
    description: 'Citation from another Mishna for comparison',
    cssClass: 'discourse-parallel'
  },

  amoraic_statement: {
    type: DISCOURSE_TYPES.SOURCE_CITATION,
    markers: [
      'איתמר', 'אמר מר', 'אִיתְּמַר', 'אָמַר מָר'
    ],
    label: 'Amoraic Statement',
    hebrewLabel: 'מימרא',
    icon: '💬',
    color: '#8B5CF6', // Purple
    description: 'Amoraic teaching or discussion',
    cssClass: 'discourse-amoraic'
  },

  // ==========================================================================
  // QUESTION MARKERS - Inquiry and clarification
  // ==========================================================================
  question_what: {
    type: DISCOURSE_TYPES.QUESTION,
    markers: [
      'מאי', 'מַאי', 'מהו', 'מָהוּ', 'מנא הני מילי', 'מְנָא הָנֵי מִילֵּי',
      'מאי טעמא', 'מַאי טַעְמָא', 'מאי קא משמע לן', 'מַאי קָא מַשְׁמַע לַן'
    ],
    label: 'Question',
    hebrewLabel: 'שאלה',
    icon: '❓',
    color: '#F59E0B', // Amber/Orange
    description: 'Inquiry: What? Why? From where?',
    cssClass: 'discourse-question'
  },

  question_why: {
    type: DISCOURSE_TYPES.QUESTION,
    markers: [
      'מאי טעמא', 'למה', 'מדוע', 'מפני מה', 'מִפְּנֵי מָה'
    ],
    label: 'Why?',
    hebrewLabel: 'מדוע',
    icon: '🤔',
    color: '#F59E0B',
    description: 'Reason inquiry',
    cssClass: 'discourse-question-why'
  },

  question_source: {
    type: DISCOURSE_TYPES.QUESTION,
    markers: [
      'מנא הני מילי', 'מנלן', 'מְנָלָן', 'מנא לן', 'מְנָא לָן'
    ],
    label: 'Source?',
    hebrewLabel: 'מקור',
    icon: '📍',
    color: '#F59E0B',
    description: 'Source inquiry: From where do we learn this?',
    cssClass: 'discourse-question-source'
  },

  question_difference: {
    type: DISCOURSE_TYPES.QUESTION,
    markers: [
      'מאי בינייהו', 'מַאי בֵּינַיְיהוּ', 'במאי קא מיפלגי', 'בְּמַאי קָא מִיפַּלְגִי'
    ],
    label: 'Difference?',
    hebrewLabel: 'הבדל',
    icon: '⚖️',
    color: '#F59E0B',
    description: 'What is the practical difference between opinions?',
    cssClass: 'discourse-question-diff'
  },

  question_implication: {
    type: DISCOURSE_TYPES.QUESTION,
    markers: [
      'מאי נפקא מינה', 'מַאי נַפְקָא מִינָּהּ', 'למאי נפקא מינה'
    ],
    label: 'Implication?',
    hebrewLabel: 'נפקא מינה',
    icon: '🎯',
    color: '#F59E0B',
    description: 'What is the practical implication?',
    cssClass: 'discourse-question-nafka'
  },

  disputed_question: {
    type: DISCOURSE_TYPES.QUESTION,
    markers: [
      'איבעיא להו', 'אִיבַּעְיָא לְהוּ', 'בעי', 'בָּעֵי', 'בעיא', 'בַּעְיָא'
    ],
    label: 'Disputed',
    hebrewLabel: 'בעיא',
    icon: '⁉️',
    color: '#EF4444', // Red
    description: 'Unresolved halachic question',
    cssClass: 'discourse-disputed'
  },

  // ==========================================================================
  // OBJECTION/CHALLENGE MARKERS
  // ==========================================================================
  objection_logical: {
    type: DISCOURSE_TYPES.OBJECTION,
    markers: [
      'מתקיף', 'מַתְקִיף', 'מתקיף לה', 'מַתְקִיף לָהּ'
    ],
    label: 'Challenge',
    hebrewLabel: 'קושיא',
    icon: '⚡',
    color: '#EF4444', // Red
    description: 'Logical objection/challenge',
    cssClass: 'discourse-objection'
  },

  objection_source: {
    type: DISCOURSE_TYPES.OBJECTION,
    markers: [
      'מתיבי', 'מְתִיבֵי', 'מיתיבי', 'מֵיתִיבֵי'
    ],
    label: 'Source Objection',
    hebrewLabel: 'מתיבי',
    icon: '📖⚡',
    color: '#DC2626', // Darker red
    description: 'Objection from authoritative source',
    cssClass: 'discourse-metivi'
  },

  contradiction: {
    type: DISCOURSE_TYPES.OBJECTION,
    markers: [
      'ורמינהו', 'וְרָמִינְהוּ', 'רמינהי', 'רָמִינְהִי', 'ורמי', 'וְרָמֵי'
    ],
    label: 'Contradiction',
    hebrewLabel: 'סתירה',
    icon: '🔄',
    color: '#DC2626',
    description: 'Contradiction between equal-authority sources',
    cssClass: 'discourse-contradiction'
  },

  conditional_challenge: {
    type: DISCOURSE_TYPES.OBJECTION,
    markers: [
      'בשלמא', 'בִּשְׁלָמָא', 'אי הכי', 'אִי הָכִי', 'אלא', 'אֶלָּא'
    ],
    label: 'Conditional',
    hebrewLabel: 'בשלמא',
    icon: '🔀',
    color: '#F97316', // Orange
    description: 'Conditional challenge: It\'s fine according to X, but...',
    cssClass: 'discourse-bishlama'
  },

  // ==========================================================================
  // PROOF/SUPPORT MARKERS
  // ==========================================================================
  proof_citation: {
    type: DISCOURSE_TYPES.PROOF,
    markers: [
      'תא שמע', 'תָּא שְׁמַע', 'ת״ש'
    ],
    label: 'Proof',
    hebrewLabel: 'ראיה',
    icon: '✅',
    color: '#10B981', // Green
    description: 'Come and hear - proof from authoritative source',
    cssClass: 'discourse-proof'
  },

  inference: {
    type: DISCOURSE_TYPES.PROOF,
    markers: [
      'שמע מינה', 'שְׁמַע מִינָּהּ', 'ש״מ'
    ],
    label: 'Inference',
    hebrewLabel: 'שמע מינה',
    icon: '💡',
    color: '#10B981',
    description: 'Infer from this - logical conclusion',
    cssClass: 'discourse-inference'
  },

  tannaitic_support: {
    type: DISCOURSE_TYPES.PROOF,
    markers: [
      'תנא כוותיה', 'תַּנָּא כְּוָותֵיהּ', 'תניא כוותיה', 'תַּנְיָא כְּוָותֵיהּ'
    ],
    label: 'Tannaitic Support',
    hebrewLabel: 'תנא כוותיה',
    icon: '👍',
    color: '#059669', // Darker green
    description: 'A Tanna taught in accordance with this view',
    cssClass: 'discourse-support'
  },

  logical_validation: {
    type: DISCOURSE_TYPES.PROOF,
    markers: [
      'מסתברא', 'מִסְתַּבְּרָא', 'מסתבר', 'מִסְתַּבֵּר'
    ],
    label: 'Logical',
    hebrewLabel: 'מסתברא',
    icon: '🧠',
    color: '#10B981',
    description: 'It is logical/reasonable',
    cssClass: 'discourse-logical'
  },

  // ==========================================================================
  // RESOLUTION MARKERS
  // ==========================================================================
  refutation: {
    type: DISCOURSE_TYPES.RESOLUTION,
    markers: [
      'תיובתא', 'תְּיוּבְתָּא', 'תיובתיה', 'תְּיוּבְתֵּיהּ'
    ],
    label: 'Refutation',
    hebrewLabel: 'תיובתא',
    icon: '❌',
    color: '#7C3AED', // Purple
    description: 'Conclusive refutation',
    cssClass: 'discourse-refutation'
  },

  resolution_answer: {
    type: DISCOURSE_TYPES.RESOLUTION,
    markers: [
      'לא קשיא', 'לָא קַשְׁיָא', 'הכי קאמר', 'הָכִי קָאָמַר',
      'לעולם', 'לְעוֹלָם'
    ],
    label: 'Resolution',
    hebrewLabel: 'תירוץ',
    icon: '🎯',
    color: '#7C3AED',
    description: 'Resolution of difficulty',
    cssClass: 'discourse-resolution'
  },

  halachic_conclusion: {
    type: DISCOURSE_TYPES.LEGAL_RULING,
    markers: [
      'הלכתא', 'הִלְכְתָא', 'הלכה', 'הֲלָכָה', 'והלכתא', 'וְהִלְכְתָא'
    ],
    label: 'Halacha',
    hebrewLabel: 'הלכה',
    icon: '⚖️',
    color: '#0891B2', // Cyan
    description: 'Final halachic ruling',
    cssClass: 'discourse-halacha'
  },

  // ==========================================================================
  // ALTERNATIVE VIEWS
  // ==========================================================================
  alternative_version: {
    type: DISCOURSE_TYPES.ALTERNATIVE,
    markers: [
      'איכא דאמרי', 'אִיכָּא דְּאָמְרֵי', 'לישנא אחרינא', 'לִישָׁנָא אַחֲרִינָא',
      'ואיכא דאמרי', 'וְאִיכָּא דְּאָמְרֵי'
    ],
    label: 'Alternative',
    hebrewLabel: 'איכא דאמרי',
    icon: '🔀',
    color: '#6366F1', // Indigo
    description: 'Some say / Alternative version',
    cssClass: 'discourse-alternative'
  },

  // ==========================================================================
  // EXPLICATION MARKERS
  // ==========================================================================
  gufa_expansion: {
    type: DISCOURSE_TYPES.EXPLICATION,
    markers: [
      'גופא', 'גּוּפָא', 'גופה', 'גּוּפָהּ'
    ],
    label: 'Expansion',
    hebrewLabel: 'גופא',
    icon: '📖',
    color: '#0EA5E9', // Sky blue
    description: 'Now regarding the matter itself - detailed analysis',
    cssClass: 'discourse-gufa'
  },

  clarification: {
    type: DISCOURSE_TYPES.EXPLICATION,
    markers: [
      'מאי קאמר', 'מַאי קָאָמַר', 'היכי דמי', 'הֵיכִי דָּמֵי',
      'במאי עסקינן', 'בְּמַאי עָסְקִינַן'
    ],
    label: 'Clarification',
    hebrewLabel: 'פירוש',
    icon: '🔍',
    color: '#0EA5E9',
    description: 'What does he mean? / In what case?',
    cssClass: 'discourse-clarification'
  },

  // ==========================================================================
  // BIBLICAL CITATION MARKERS
  // ==========================================================================
  biblical_proof: {
    type: DISCOURSE_TYPES.SOURCE_CITATION,
    markers: [
      'שנאמר', 'שֶׁנֶּאֱמַר', 'דכתיב', 'דִּכְתִיב', 'כדכתיב', 'כִּדְכְתִיב',
      'מנין', 'מִנַּיִן', 'שנא׳', 'דכתי׳'
    ],
    label: 'Scripture',
    hebrewLabel: 'פסוק',
    icon: '📖',
    color: '#14B8A6', // Teal
    description: 'Biblical proof text',
    cssClass: 'discourse-scripture'
  },

  // ==========================================================================
  // LEGAL TERMS
  // ==========================================================================
  legal_liable: {
    type: DISCOURSE_TYPES.LEGAL_RULING,
    markers: [
      'חייב', 'חַיָּב', 'חייבין', 'חַיָּבִין', 'חייבים', 'חַיָּבִים'
    ],
    label: 'Liable',
    hebrewLabel: 'חייב',
    icon: '⚠️',
    color: '#DC2626',
    description: 'Legally obligated/liable',
    cssClass: 'discourse-liable'
  },

  legal_exempt: {
    type: DISCOURSE_TYPES.LEGAL_RULING,
    markers: [
      'פטור', 'פָּטוּר', 'פטורין', 'פְּטוּרִין', 'פטורים', 'פְּטוּרִים'
    ],
    label: 'Exempt',
    hebrewLabel: 'פטור',
    icon: '✓',
    color: '#10B981',
    description: 'Legally exempt',
    cssClass: 'discourse-exempt'
  },

  legal_permitted: {
    type: DISCOURSE_TYPES.LEGAL_RULING,
    markers: [
      'מותר', 'מֻתָּר', 'שרי', 'שָׁרֵי'
    ],
    label: 'Permitted',
    hebrewLabel: 'מותר',
    icon: '✅',
    color: '#10B981',
    description: 'Permitted',
    cssClass: 'discourse-permitted'
  },

  legal_forbidden: {
    type: DISCOURSE_TYPES.LEGAL_RULING,
    markers: [
      'אסור', 'אָסוּר', 'אסורין', 'אֲסוּרִין', 'אסורים', 'אֲסוּרִים'
    ],
    label: 'Forbidden',
    hebrewLabel: 'אסור',
    icon: '🚫',
    color: '#DC2626',
    description: 'Forbidden',
    cssClass: 'discourse-forbidden'
  }
};

// =============================================================================
// RABBI DETECTION PATTERNS
// =============================================================================

export const RABBI_PATTERNS = {
  amar_rabbi: {
    // אמר רבי X, א"ר X
    pattern: /(?:אמר|א"ר|א״ר)\s*(רב(?:י|ן|א)?|ר׳)\s*(\p{Script=Hebrew}+)/gu,
    type: 'statement',
    description: 'Rabbi X says'
  },

  rabbi_amar: {
    // רבי X אמר, רב X אמר
    pattern: /(?:רב(?:י|ן|א)?|ר׳)\s*(\p{Script=Hebrew}+)\s*(?:אמר|אומר)/gu,
    type: 'statement',
    description: 'Rabbi X says'
  },

  ploni_ve_ploni: {
    // רבי X ורבי Y
    pattern: /(?:רב(?:י|ן|א)?|ר׳)\s*(\p{Script=Hebrew}+)\s*(?:ו|ו־)(?:רב(?:י|ן|א)?|ר׳)\s*(\p{Script=Hebrew}+)/gu,
    type: 'dispute',
    description: 'Rabbi X and Rabbi Y'
  },

  machloket: {
    // פליגי בה רבי X ורבי Y
    pattern: /(?:פליגי|נחלקו)\s*(?:בה|בהּ)?\s*(?:רב(?:י|ן|א)?|ר׳)\s*(\p{Script=Hebrew}+)/gu,
    type: 'dispute',
    description: 'Dispute between...'
  }
};

// =============================================================================
// SIMPLIFIED TALMUDIC PATTERNS (Quick Reference)
// Color-coded structural markers for visual highlighting
// =============================================================================

export const TALMUDIC_PATTERNS = {
  mishna: {
    markers: ['מתני׳', 'תנן', 'שנינו', 'מתניתין', 'במתניתין', 'דתנן', 'מדתנן'],
    color: '#4A90D9', // blue
    label: 'Mishna',
    hebrewLabel: 'משנה',
    icon: '📘'
  },
  gemara: {
    // V30: Enhanced Gemara detection - includes explicit marker AND implicit Gemara starters
    markers: [
      'גמ׳', 'גְּמָ׳', 'גמרא', 'בגמרא',
      // Implicit Gemara starters (when text starts discussing the Mishna)
      'מאי קאמר', 'מאי קא משמע לן', 'במאי עסקינן', 'היכי דמי'
    ],
    color: '#8B4513', // brown
    label: 'Gemara',
    hebrewLabel: 'גמרא',
    icon: '📜'
  },
  question: {
    // V29: Question markers - removed כיצד (it's a Mishna case intro, not a Gemara question)
    markers: [
      'מאי', 'מנא הני מילי', 'מאי טעמא', 'איבעיא להו', 'מאי בינייהו', 'מהו', 'מנלן',
      'היכי דמי', 'מאן תנא', 'פשיטא', 'למימרא', 'מה הן', 'היכי', 'מאי קאמר',
      'מאי שנא', 'מה בין', 'באיזה', 'מי אמר', 'אימא', 'וכי'
    ],
    color: '#E67E22', // orange
    label: 'Question',
    hebrewLabel: 'שאלה',
    icon: '❓'
  },
  objection: {
    // V28: Expanded objection markers
    markers: [
      'מתקיף', 'מתיבי', 'ורמינהו', 'בשלמא', 'אלא',
      'קשיא', 'תיקו', 'איתיביה', 'ומי', 'והא', 'והתניא',
      'ולא', 'ליתא', 'קא קשיא', 'הא גופא קשיא'
    ],
    color: '#E74C3C', // red
    label: 'Challenge',
    hebrewLabel: 'קושיא',
    icon: '⚡'
  },
  proof: {
    // V28: Expanded proof markers
    markers: [
      'תא שמע', 'שמע מינה', 'תנא כוותיה', 'מסתברא',
      'ראיה', 'דתנן', 'מדתנן', 'דתניא', 'מדתניא', 'מיתיבי',
      'לימא', 'איכא למימר', 'מכלל', 'אלמא'
    ],
    color: '#27AE60', // green
    label: 'Proof',
    hebrewLabel: 'ראיה',
    icon: '✅'
  },
  resolution: {
    // V30: Expanded resolution markers with more answer patterns
    markers: [
      'תיובתא', 'הלכתא', 'לא קשיא', 'הכי קאמר',
      'משום', 'כדתניא', 'הכי נמי', 'לא צריכא',
      'תרוץ', 'לעולם', 'שאני', 'כדאמרן',
      // V30: Additional resolution patterns
      'אלא אמר', 'הכא במאי עסקינן', 'אמר לך', 'תנאי היא',
      'דאמר קרא', 'כדרב', 'כדשמואל', 'אין הכי נמי'
    ],
    color: '#9B59B6', // purple
    label: 'Conclusion',
    hebrewLabel: 'מסקנא',
    icon: '🎯'
  },
  alternative: {
    // V28: Expanded alternative markers
    markers: [
      'איכא דאמרי', 'לישנא אחרינא', 'ואיכא דאמרי',
      'אי נמי', 'אי הכי', 'או דילמא', 'אלא אי אמרת'
    ],
    color: '#3498DB', // light blue
    label: 'Alternative View',
    hebrewLabel: 'לישנא אחרינא',
    icon: '🔀'
  },
  baraita: {
    // V28: Expanded baraita markers
    markers: ['תנו רבנן', 'תניא', 'ת״ר', 'תנא', 'דתנא', 'כדתניא', 'ברייתא'],
    color: '#6366F1', // indigo
    label: 'Baraita',
    hebrewLabel: 'ברייתא',
    icon: '📋'
  },
  scripture: {
    // V28: Expanded scripture markers
    markers: [
      'שנאמר', 'דכתיב', 'כדכתיב', 'מנין',
      'וכתיב', 'ואומר', 'הכתוב', 'מקרא'
    ],
    color: '#14B8A6', // teal
    label: 'Scripture',
    hebrewLabel: 'פסוק',
    icon: '📖'
  },
  // V30: Enhanced sage detection with more patterns
  sage_statement: {
    markers: [
      // Standard attribution patterns
      'אמר רב', 'אמר רבי', 'אמר ר\'', 'א"ר', 'אר"ש', 'אר"מ',
      'רבא אמר', 'אביי אמר', 'רבי אומר', 'חכמים אומרים',
      // V30: Additional sage patterns
      'רב אמר', 'שמואל אמר', 'רבי יוחנן', 'ריש לקיש',
      'רב הונא', 'רב נחמן', 'רב יוסף', 'רב ששת', 'רב חסדא',
      'רבינא', 'רב אשי', 'מר זוטרא', 'רב פפא',
      // Tannaim
      'רבי מאיר', 'רבי יהודה', 'רבי שמעון', 'רבי יוסי',
      'רבי עקיבא', 'רבי אליעזר', 'רבי יהושע', 'רבן גמליאל',
      // Attribution verbs
      'סבר', 'סבירא ליה', 'אמר ליה', 'א"ל'
    ],
    color: '#8B5CF6', // violet
    label: 'Sage Statement',
    hebrewLabel: 'דברי חכם',
    icon: '👤'
  },
  legal_ruling: {
    markers: [
      'הלכה', 'דינא', 'הדין', 'חייב', 'פטור', 'מותר', 'אסור',
      'כשר', 'פסול', 'טמא', 'טהור'
    ],
    color: '#DC2626', // dark red
    label: 'Legal Ruling',
    hebrewLabel: 'פסק הלכה',
    icon: '⚖️'
  }
};

/**
 * Mishna Structure Patterns
 * Detects enumeration, conditions, exceptions, and rulings in Mishnaic text
 */
export const MISHNA_STRUCTURE_PATTERNS = {
  // Enumeration patterns - Enhanced for Shabbat 2a style (שתים שהן ארבע)
  enumeration: {
    patterns: [
      /(?:שתים|שלש|ארבע|חמש|שש|שבע|שמונה|תשע|עשר|שנים עשר|שלושה|ארבעה|חמישה)\s+(?:דברים|מקומות|זמנים|אופנים|מינים|דרכים)/g,
      /(?:שתים|שלש|ארבע)\s+שהן\s+(?:ארבע|שש|שמונה)/g, // שתים שהן ארבע
      /ראשון\b|שני\b|שלישי\b|רביעי\b|חמישי\b/g,
      /(?:אחד|שתים|שלש)\b.*?(?:ואחד|ושתים|ושלש)\b/g,
      /(?:מבפנים|מבחוץ|בפנים|בחוץ)/g // Inside/outside cases
    ],
    label: 'ספירה',
    icon: '🔢',
    color: '#3B82F6'
  },
  // Conditional rulings - Enhanced for case scenarios
  condition: {
    patterns: [
      /(?:אם|כל\s+ש|בזמן\s+ש|כשהוא|כש)\s+[\u0590-\u05FF]+/g,
      /(?:היה|היו|היתה)\s+[\u0590-\u05FF]+/g,
      /(?:עד\s+ש|משום\s+ש|מפני\s+ש)/g,
      /(?:פשט\s+[\u0590-\u05FF]+\s+ידו|הכניס\s+ידו|הוציא\s+ידו)/g, // Hand extension cases
      /(?:עני\s+[\u0590-\u05FF]*\s*עומד|בעל\s+הבית\s+[\u0590-\u05FF]*\s*עומד)/g // Poor man/homeowner standing
    ],
    label: 'תנאי',
    icon: '🔀',
    color: '#F59E0B'
  },
  // Exceptions
  exception: {
    patterns: [
      /(?:חוץ\s+מ|אלא\s+א|אבל|ואם|אלא\s+ש)/g,
      /(?:פרט\s+ל|להוציא|יצא)/g
    ],
    label: 'יוצא מן הכלל',
    icon: '⚡',
    color: '#EF4444'
  },
  // Legal rulings - Enhanced with liable/exempt pairs
  ruling: {
    patterns: [
      /(?:מותר|אסור|פטור|חייב|טהור|טמא|כשר|פסול|יוצא|אינו יוצא)\b/g,
      /(?:חייב\s+[\u0590-\u05FF]*\s*(?:ו|ה)?פטור|פטור\s+[\u0590-\u05FF]*\s*(?:ו|ה)?חייב)/g, // Liable-exempt pairs
      /(?:העני\s+[\u0590-\u05FF]*\s*חייב|בעל\s+הבית\s+[\u0590-\u05FF]*\s*פטור)/g, // Poor man liable, homeowner exempt
      /(?:חכמים אומרים|רבי\s+[\u0590-\u05FF]+\s+אומר)/g,
      /(?:זה\s+הכלל|כלל\s+גדול)/g,
      /(?:שניהם\s+פטורים|שניהם\s+חייבים)/g // Both exempt/liable
    ],
    label: 'פסק',
    icon: '⚖️',
    color: '#10B981'
  },
  // Disputes
  dispute: {
    patterns: [
      /בית\s+(?:הלל|שמאי)\s+אומרים/g,
      /(?:רבי\s+[\u0590-\u05FF]+)\s+אומר.*?(?:וחכמים אומרים|ורבי\s+[\u0590-\u05FF]+\s+אומר)/g,
      /מחלוקת\b/g
    ],
    label: 'מחלוקת',
    icon: '⚔️',
    color: '#8B5CF6'
  },
  // Case structure - NEW for Shabbat 2a style
  case_structure: {
    patterns: [
      /(?:יציאות\s+השבת|הוצאות\s+שבת)/g, // Shabbat carrying
      /(?:רשות\s+היחיד|רשות\s+הרבים)/g, // Private/public domain
      /(?:הכנסה|הוצאה)/g, // Bringing in/taking out
      /(?:כיצד)/g // "How is this?"
    ],
    label: 'מקרה',
    icon: '📋',
    color: '#6366F1'
  }
};
