/**
 * Sugya analysis helpers - Hebrew/Aramaic pattern detection, key term extraction,
 * source reference mining, and chazara summary generation. Pure functions, no API.
 */

// =============================================================================
// Talmudic Discourse Pattern Detection (Local - No API)
// =============================================================================
export const SUGYA_PATTERNS = {
  // Questions and challenges
  KUSHYA: { pattern: /(?:ק(?:שיא|ושיא)|מתיבי|איתיבי|ורמינהו)/g, label: 'קושיא', type: 'question', color: '#ef4444' },
  TEIKU: { pattern: /תיקו|תיקום/g, label: 'תיקו', type: 'unresolved', color: '#f59e0b' },

  // Answers and resolutions
  TIRETZ: { pattern: /(?:ת(?:י)?רוץ|מתרץ|שאני|הכא)/g, label: 'תירוץ', type: 'answer', color: '#22c55e' },

  // Sources and proofs
  TANYA: { pattern: /תנ(?:יא|ן)|ת"ר|תנו רבנן/g, label: 'ברייתא', type: 'source', color: '#3b82f6' },
  MISHNA: { pattern: /מתני(?:תין)?|סתם משנה/g, label: 'משנה', type: 'source', color: '#8b5cf6' },
  MEMRA: { pattern: /אמר ר(?:ב|בי)|א"ר/g, label: 'מימרא', type: 'statement', color: '#06b6d4' },

  // Dialectical markers
  MACHLOKES: { pattern: /פליגי|חולקים|מחלוקת/g, label: 'מחלוקת', type: 'dispute', color: '#ec4899' },
  SVARA: { pattern: /סברא|מ(?:נא|נין) ה(?:ני|אי) מילי/g, label: 'סברא', type: 'reasoning', color: '#14b8a6' },
  MASKANA: { pattern: /(?:ש)?מע מינה|הלכה|למעשה/g, label: 'מסקנא', type: 'conclusion', color: '#10b981' },
};

export const MAX_PATTERNS = 100; // Prevent unbounded array growth

export const analyzeSugyaStructure = (text) => {
  if (!text) return { patterns: [], summary: null };

  const patterns = [];
  const textLower = text;

  outer: for (const [key, config] of Object.entries(SUGYA_PATTERNS)) {
    let match;
    const regex = new RegExp(config.pattern.source, 'g');
    while ((match = regex.exec(textLower)) !== null) {
      patterns.push({
        type: key,
        label: config.label,
        category: config.type,
        color: config.color,
        position: match.index,
        text: match[0]
      });
      if (patterns.length >= MAX_PATTERNS) break outer;
    }
  }

  patterns.sort((a, b) => a.position - b.position);

  return {
    patterns,
    hasKushya: patterns.some(p => p.category === 'question'),
    hasTiretz: patterns.some(p => p.category === 'answer'),
    hasMachlokes: patterns.some(p => p.category === 'dispute'),
    hasMaskana: patterns.some(p => p.category === 'conclusion'),
    sources: patterns.filter(p => p.category === 'source'),
    flow: patterns.slice(0, 20).map(p => p.label).join(' → ')
  };
};

export const extractKeyTerms = (text) => {
  if (!text) return [];

  const IMPORTANT_TERMS = [
    { term: 'הלכה', meaning: 'Law/Legal ruling' },
    { term: 'ברייתא', meaning: 'External Tannaitic teaching' },
    { term: 'משנה', meaning: 'Mishnaic teaching' },
    { term: 'גמרא', meaning: 'Talmudic discussion' },
    { term: 'תנא', meaning: 'Tannaitic sage' },
    { term: 'אמורא', meaning: 'Amoraic sage' },
    { term: 'סברא', meaning: 'Logical reasoning' },
    { term: 'קושיא', meaning: 'Difficulty/Question' },
    { term: 'תירוץ', meaning: 'Answer/Resolution' },
    { term: 'ראיה', meaning: 'Proof' },
    { term: 'מחלוקת', meaning: 'Dispute' },
    { term: 'שמע מינה', meaning: 'We derive from this' },
    { term: 'פשיטא', meaning: 'Obviously' },
    { term: 'מאי', meaning: 'What is' },
    { term: 'היכי', meaning: 'How' },
    { term: 'אלא', meaning: 'Rather/But' },
    { term: 'לימא', meaning: 'Should we say' },
    { term: 'תיקו', meaning: 'Unresolved question' }
  ];

  const found = [];
  IMPORTANT_TERMS.forEach(item => {
    if (text.includes(item.term)) {
      found.push(item);
    }
  });

  return found;
};

/**
 * Extract Mareh Mekomot (source references) from text
 * Looks for patterns like: מסכת X דף Y, רמב"ם הלכות X פרק Y, etc.
 */
export const extractMarehMekomot = (text, rashiText, tosafotText) => {
  if (!text && !rashiText && !tosafotText) return [];

  const combinedText = [text, rashiText, tosafotText].filter(Boolean).join(' ');
  const references = [];

  const talmudPattern = /(?:מס(?:כת)?|ב?גמ(?:רא)?)\s*(\S+)\s*(?:דף\s*)?(\d+[אב]?)/g;
  let match;
  while ((match = talmudPattern.exec(combinedText)) !== null) {
    references.push({
      type: 'talmud',
      label: 'תלמוד',
      masechet: match[1],
      daf: match[2],
      text: match[0],
      icon: '📜'
    });
  }

  const torahBooks = ['בראשית', 'שמות', 'ויקרא', 'במדבר', 'דברים'];
  torahBooks.forEach(book => {
    const bookPattern = new RegExp(`${book}\\s+(\\S+)\\s*(\\d+)?`, 'g');
    while ((match = bookPattern.exec(combinedText)) !== null) {
      references.push({
        type: 'torah',
        label: 'תורה',
        book,
        parsha: match[1],
        verse: match[2],
        text: match[0],
        icon: '📖'
      });
    }
  });

  const rambamPattern = /רמב"ם\s+(?:הל(?:כות)?\s*)?(\S+)/g;
  while ((match = rambamPattern.exec(combinedText)) !== null) {
    references.push({
      type: 'rambam',
      label: 'רמב"ם',
      halacha: match[1],
      text: match[0],
      icon: '⚖️'
    });
  }

  const saPattern = /שו"ע|שולחן ערוך\s*(\S+)/g;
  while ((match = saPattern.exec(combinedText)) !== null) {
    references.push({
      type: 'shulchan_aruch',
      label: 'שו"ע',
      section: match[1] || '',
      text: match[0],
      icon: '📚'
    });
  }

  const uniqueRefs = references.filter((ref, index, self) =>
    index === self.findIndex(r => r.text === ref.text)
  );

  return uniqueRefs;
};

export const generateChazaraSummary = (text, sugyaStructure, keyTerms) => {
  if (!text) return null;

  const summary = {
    mainPoints: [],
    keyTermsToRemember: keyTerms.slice(0, 5),
    flowSummary: sugyaStructure.flow || '',
    reviewQuestions: []
  };

  if (sugyaStructure.hasKushya) {
    summary.mainPoints.push('יש קושיא בסוגיא שצריך להבין');
  }
  if (sugyaStructure.hasTiretz) {
    summary.mainPoints.push('יש תירוץ שמיישב את הקושיא');
  }
  if (sugyaStructure.hasMachlokes) {
    summary.mainPoints.push('יש מחלוקת בין התנאים/אמוראים');
  }
  if (sugyaStructure.hasMaskana) {
    summary.mainPoints.push('יש מסקנא ברורה בסוגיא');
  }

  if (sugyaStructure.hasKushya) {
    summary.reviewQuestions.push('מה הקושיא בסוגיא?');
  }
  if (sugyaStructure.hasTiretz) {
    summary.reviewQuestions.push('מה התירוץ?');
  }
  if (sugyaStructure.hasMachlokes) {
    summary.reviewQuestions.push('מה צדדי המחלוקת?');
  }
  if (sugyaStructure.sources.length > 0) {
    summary.reviewQuestions.push('מה המקורות שהסוגיא מביאה?');
  }

  return summary;
};
