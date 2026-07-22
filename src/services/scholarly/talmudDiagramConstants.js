/**
 * Talmud Diagram Constants
 * Extracted from talmudDiagramService.js for modularity.
 *
 * Contains every static datum used by the diagram generators and extractors:
 * commentators, diagram types, halachic outcome vocab, outcome icons,
 * content-extraction regex banks, speaker patterns, speaker normalization,
 * discourse markers, and argument-flow skeletons.
 */

// =============================================================================
// TALMUD COMMENTATORS (Available on Sefaria)
// =============================================================================

export const TALMUD_COMMENTATORS = [
  'Rashi',
  'Tosafot',
  'Rashbam',
  'Ritva',
  'Rashba',
  'Ran',
  'Rosh',
  'Maharsha',
  'Maharal',
  'Meiri',
  'Rabbeinu Chananel',
  'Rabbeinu Gershom'
];

// =============================================================================
// DIAGRAM TYPES
// =============================================================================

export const DIAGRAM_TYPES = {
  OVERVIEW: 'overview',
  SUGYA_FLOW: 'sugya_flow',
  SPEAKER_NETWORK: 'speaker_network',
  HALACHIC_CHAIN: 'halachic_chain',
  CONCEPT_MAP: 'concept_map',
  TIMELINE: 'timeline',
  MACHLOKET: 'machloket',
  SUMMARY: 'summary'
};

// =============================================================================
// HALACHIC OUTCOMES
// =============================================================================

export const HALACHIC_OUTCOMES = {
  positive: [
    'חייב', 'חייבים', 'חייבת', 'חייבות', 'מחייב',
    'מותר', 'מותרת', 'מותרים', 'מותרות', 'שרי',
    'טהור', 'טהורה', 'טהורים', 'טהורות', 'מטהר',
    'כשר', 'כשרה', 'כשרים', 'כשרות', 'מכשיר',
    'יצא', 'יצאה', 'יצאו', 'יוצא',
    'קנה', 'קנתה', 'קנו', 'קונה',
    'זכה', 'זכתה', 'זכו', 'זוכה',
    'מקודשת', 'מגורשת', 'מותרת לכהונה',
    'נאמן', 'נאמנת', 'נאמנים',
    'חל', 'חלה', 'חלים'
  ],
  negative: [
    'פטור', 'פטורים', 'פטורה', 'פטורות', 'פוטר',
    'אסור', 'אסורה', 'אסורים', 'אסורות', 'אסיר',
    'טמא', 'טמאה', 'טמאים', 'טמאות', 'מטמא',
    'פסול', 'פסולה', 'פסולים', 'פסולות', 'פוסל',
    'לא יצא', 'לא יצאה', 'לא יצאו', 'אינו יוצא',
    'לא קנה', 'לא קנתה', 'לא קנו', 'אינו קונה',
    'לא זכה', 'לא זכתה', 'לא זכו', 'אינו זוכה',
    'אינה מקודשת', 'אינה מגורשת', 'אסורה לכהונה',
    'אינו נאמן', 'אינה נאמנת',
    'לא חל', 'לא חלה', 'אינו חל'
  ],
  uncertain: [
    'ספק', 'ספיקא', 'מספקא', 'ספקא דרבנן', 'ספקא דאורייתא',
    'תיקו', 'תיקום', 'תיקו נדחה',
    'צריך עיון', 'צ"ע', 'צ״ע',
    'איבעיא', 'בעיא', 'בעי',
    'קשיא', 'קשה', 'קשיות',
    'לא איפשיטא', 'לא נפשטה'
  ],
  conditional: [
    'תלוי', 'תליא', 'תלויה',
    'אם...אז', 'בזמן ש', 'בזמן שהוא',
    'בכל מקום', 'במקצת', 'לפעמים',
    'לכתחילה', 'בדיעבד',
    'מדאורייתא', 'מדרבנן'
  ]
};

export const OUTCOME_ICONS = {
  'חייב': '🔴',
  'פטור': '🟢',
  'מותר': '✅',
  'אסור': '🚫',
  'טהור': '💧',
  'טמא': '⚠️',
  'כשר': '✓',
  'פסול': '✗',
  'ספק': '🟡',
  'תיקו': '❓',
  'יצא': '✅',
  'לא יצא': '❌',
  'קנה': '💰',
  'לא קנה': '💸'
};

// eslint-disable-next-line no-unused-vars
export const STRUCTURE_MARKERS = {
  mishna: /מתני[׳']|משנה/,
  gemara: /גמ[׳']|גמרא/,
  question: /מאי|מנלן|היכי|כיצד|מה טעם/,
  answer: /אמר|תנא|תניא|שנאמר|דכתיב/,
  conclusion: /שמע מינה|הלכה|למעשה|והלכתא/
};

// =============================================================================
// CONTENT PATTERNS (regex banks used by extractRealContent)
// =============================================================================

export const CONTENT_PATTERNS = {
  questions: [
    { pattern: /מאי\s+([^?。.]+)/g, type: 'definition', label: 'מהו' },
    { pattern: /מנלן\s*[?]?\s*([^。.]{5,50})/g, type: 'source', label: 'מניין לנו' },
    { pattern: /מנא\s+הני\s+מילי\s*[?]?\s*([^。.]{5,50})/g, type: 'source', label: 'מנא ה״מ' },
    { pattern: /היכי\s+דמי\s*[?]?\s*([^。.]{5,40})/g, type: 'case', label: 'כיצד' },
    { pattern: /מאי\s+טעמא\s*[?]?\s*([^。.]{5,50})/g, type: 'reason', label: 'מה הטעם' },
    { pattern: /מאי\s+שנא\s+([^。.]{5,50})/g, type: 'distinction', label: 'מה ההבדל' },
    { pattern: /למאי\s+נפקא\s+מינה\s*[?]?\s*([^。.]{5,50})/g, type: 'practical', label: 'נפק״מ' },
    { pattern: /פשיטא\s*[!]?\s*([^。.]{5,40})/g, type: 'obvious', label: 'פשיטא' },
    { pattern: /כיצד\??\s*([^。.]{5,60})/g, type: 'how', label: 'כיצד' },
  ],
  proofs: [
    { pattern: /שנאמר\s*[":״]?\s*([^"״\n]{5,80})/g, type: 'verse', label: 'פסוק' },
    { pattern: /דכתיב\s*[":״]?\s*([^"״\n]{5,80})/g, type: 'verse', label: 'כתוב' },
    { pattern: /תנן\s*[:]?\s*([^。.]{10,100})/g, type: 'mishna', label: 'משנה' },
    { pattern: /תניא\s*[:]?\s*([^。.]{10,100})/g, type: 'baraita', label: 'ברייתא' },
    { pattern: /תנו\s+רבנן\s*[:]?\s*([^。.]{10,100})/g, type: 'baraita', label: 'ת״ר' },
    { pattern: /גמרא\s*[:]?\s*([^。.]{10,80})/g, type: 'gemara', label: 'גמרא' },
  ],
  objections: [
    { pattern: /מיתיבי\s*[:]?\s*([^。.]{10,80})/g, type: 'objection', label: 'קושיא' },
    { pattern: /ורמינהו\s*[:]?\s*([^。.]{10,80})/g, type: 'contradiction', label: 'סתירה' },
    { pattern: /והתניא\s*[:]?\s*([^。.]{10,80})/g, type: 'challenge', label: 'והרי תניא' },
    { pattern: /והאמר\s+(\S+)\s*[:]?\s*([^。.]{10,60})/g, type: 'challenge', label: 'והרי אמר' },
  ],
  resolutions: [
    { pattern: /לא\s+קשיא\s*[:]?\s*([^。.]{10,80})/g, type: 'resolution', label: 'תירוץ' },
    { pattern: /הכא\s+במאי\s+עסקינן\s*[:]?\s*([^。.]{10,80})/g, type: 'case_distinction', label: 'הכא במאי עסקינן' },
    { pattern: /אמר\s+לך\s*[:]?\s*([^。.]{10,60})/g, type: 'response', label: 'תשובה' },
    { pattern: /שאני\s+([^。.]{5,60})/g, type: 'distinction', label: 'שאני' },
  ],
  conclusions: [
    { pattern: /שמע\s+מינה\s*[:]?\s*([^。.]{10,80})/g, type: 'inference', label: 'ש״מ' },
    { pattern: /הלכה\s+כ?([^。.]{5,50})/g, type: 'halacha', label: 'הלכה' },
    { pattern: /הלכתא\s+כ?([^。.]{5,50})/g, type: 'halacha', label: 'הלכתא' },
    { pattern: /והלכתא\s+([^。.]{5,50})/g, type: 'halacha', label: 'והלכתא' },
    { pattern: /למעשה\s+([^。.]{5,50})/g, type: 'practical', label: 'למעשה' },
  ],
  topics: [
    { pattern: /מתני[׳']\s*[:]?\s*([^。.]{10,100})/g, type: 'mishna_topic', label: 'משנה' },
    { pattern: /גמ[׳']\s*[:]?\s*([^。.]{10,80})/g, type: 'gemara_topic', label: 'גמרא' },
    { pattern: /בעיא\s+([^。.]{5,60})/g, type: 'inquiry', label: 'בעיא' },
    { pattern: /איבעיא\s+להו\s*[:]?\s*([^。.]{10,80})/g, type: 'inquiry', label: 'איבעיא להו' },
  ]
};

// =============================================================================
// SPEAKER EXTRACTION
// =============================================================================

export const DIRECT_SAGE_NAMES = [
  'הלל', 'שמאי', 'בית הלל', 'בית שמאי',
  'רבן גמליאל', 'רבי אליעזר', 'רבי יהושע', 'רבי עקיבא', 'רבי ישמעאל',
  'רבי מאיר', 'רבי יהודה', 'רבי יוסי', 'רבי שמעון', 'רבי נחמיה',
  'רבי יהודה הנשיא', 'רבינו הקדוש', 'רבי חייא',
  'רב', 'שמואל', 'רב הונא', 'רב יהודה', 'רב נחמן', 'רב ששת', 'רב חסדא',
  'רבה', 'רב יוסף', 'אביי', 'רבא', 'רב פפא', 'רב אשי', 'רבינא',
  'רבי יוחנן', 'ריש לקיש', 'רבי אמי', 'רבי אסי', 'רבי אבהו', 'רבי זירא',
  'רבי ירמיה', 'רבי יוסי בר חנינא', 'רבי אלעזר',
  'ר״ל', 'ר"ל', 'רשב"י', 'רשב״י', 'רשב"ג', 'רשב״ג'
];

export const SPEAKER_PATTERNS = [
  // STANDARD STATEMENTS
  { pattern: /אמר\s+(רב[יא]?\s+\S+(?:\s+(?:בן|בר|ב"ר|ב״ר)\s+\S+)?)/g, type: 'statement' },
  { pattern: /אמר\s+(רבן?\s+\S+(?:\s+(?:בן|בר)\s+\S+)?)/g, type: 'statement' },
  { pattern: /דאמר\s+(רב[יא]?\s+\S+)/g, type: 'citation' },
  { pattern: /כדאמר\s+(רב[יא]?\s+\S+)/g, type: 'citation' },
  { pattern: /(רבי\s+\S+(?:\s+(?:בן|בר)\s+\S+)?)\s+[,:]/g, type: 'mention' },
  { pattern: /(רב\s+\S+(?:\s+(?:בן|בר)\s+\S+)?)\s+[,:]/g, type: 'mention' },
  // ABBREVIATED FORMS
  { pattern: /א"ר\s+(\S+(?:\s+(?:בן|בר)\s+\S+)?)/g, type: 'statement' },
  { pattern: /א״ר\s+(\S+(?:\s+(?:בן|בר)\s+\S+)?)/g, type: 'statement' },
  { pattern: /ד"ר\s+(\S+)/g, type: 'citation' },
  { pattern: /ד״ר\s+(\S+)/g, type: 'citation' },
  { pattern: /וא"ר\s+(\S+)/g, type: 'statement' },
  { pattern: /וא״ר\s+(\S+)/g, type: 'statement' },
  { pattern: /כא"ר\s+(\S+)/g, type: 'like_statement' },
  // OPINIONS
  { pattern: /(רבי\s+\S+(?:\s+(?:בן|בר)\s+\S+)?)\s+אומר/g, type: 'opinion' },
  { pattern: /(רב\s+\S+(?:\s+(?:בן|בר)\s+\S+)?)\s+אומר/g, type: 'opinion' },
  { pattern: /(רבן\s+\S+)\s+אומר/g, type: 'opinion' },
  { pattern: /(רבי\s+\S+(?:\s+(?:בן|בר)\s+\S+)?)\s+אמר/g, type: 'opinion' },
  { pattern: /(רב\s+\S+)\s+סבר/g, type: 'opinion' },
  // TRANSMISSION CHAINS
  { pattern: /אמר\s+(\S+)\s+(?:א"ר|אמר)\s+(\S+)/g, type: 'transmission' },
  { pattern: /אמר\s+(\S+)\s+משום\s+(\S+)/g, type: 'transmission' },
  { pattern: /משום\s+(רב[יא]?\s+\S+)/g, type: 'source_attribution' },
  { pattern: /אמר\s+(\S+)\s+משמיה\s+ד(\S+)/g, type: 'transmission' },
  { pattern: /(\S+)\s+משמיה\s+ד(\S+)/g, type: 'transmission' },
  // FAMOUS AMORAIM
  { pattern: /(?:אמר|א"ר|א״ר)\s*(אביי|רבא|רבה|רב\s+נחמן|רב\s+ששת|רב\s+חסדא|רב\s+הונא|רב\s+יוסף|רב\s+פפא|רב\s+אשי)/g, type: 'statement' },
  { pattern: /(אביי\s+ורבא|רב\s+ושמואל|רבי\s+יוחנן\s+ורבי\s+שמעון\s+בן\s+לקיש)/g, type: 'famous_pair' },
  { pattern: /(בית\s+שמאי\s+ובית\s+הלל|בית\s+הלל\s+ובית\s+שמאי)/g, type: 'famous_pair' },
  // CONTINUATION
  { pattern: /ואמר\s+(רב[יא]?\s+\S+(?:\s+(?:בן|בר)\s+\S+)?)/g, type: 'continuation' },
  { pattern: /ו?אמר\s+ליה\s+(רב[יא]?\s+\S+)/g, type: 'response' },
  { pattern: /בעי\s+מיניה\s+(\S+)\s+מ(\S+)/g, type: 'question_to' },
  { pattern: /שאליה\s+(\S+)\s+ל(\S+)/g, type: 'question_to' },
  // OBJECTIONS AND CHALLENGES
  { pattern: /מתיב\s+(רב[יא]?\s+\S+)/g, type: 'objection' },
  { pattern: /איתיביה\s+(רב[יא]?\s+\S+)/g, type: 'objection' },
  { pattern: /(מיתיבי)/g, type: 'anonymous_objection' },
  { pattern: /(ורמינהי)/g, type: 'contradiction' },
  { pattern: /(והתניא)/g, type: 'challenge' },
  { pattern: /(והאמר)\s+(רב[יא]?\s+\S+)/g, type: 'challenge' },
  { pattern: /מתקיף\s+לה\s+(רב[יא]?\s+\S+)/g, type: 'objection' },
  { pattern: /לימא\s+מסייע\s+ליה\s+ל?(רב[יא]?\s+\S+)/g, type: 'support' },
  // BARAITOT AND MISHNA CITATIONS
  { pattern: /(תנן)/g, type: 'mishna_citation' },
  { pattern: /(תנא)/g, type: 'baraita' },
  { pattern: /(תניא)/g, type: 'baraita' },
  { pattern: /תנו\s+רבנן/g, type: 'baraita' },
  { pattern: /תני\s+(רב[יא]?\s+\S+)/g, type: 'teaching' },
  { pattern: /דתנן/g, type: 'mishna_citation' },
  { pattern: /דתניא/g, type: 'baraita' },
  { pattern: /כדתנן/g, type: 'mishna_citation' },
  { pattern: /מתני׳/g, type: 'mishna_marker' },
  { pattern: /גמ׳/g, type: 'gemara_marker' },
  // QUESTIONS AND INQUIRIES
  { pattern: /בעי\s+(רב[יא]?\s+\S+)/g, type: 'question' },
  { pattern: /בעא\s+מיניה\s+(רב[יא]?\s+\S+)/g, type: 'question' },
  { pattern: /בעי\s+מר/g, type: 'question' },
  { pattern: /בעאי/g, type: 'question' },
  { pattern: /קא\s+מיבעיא\s+ליה/g, type: 'inquiry' },
  { pattern: /איבעיא\s+להו/g, type: 'inquiry' },
  // DISPUTES
  { pattern: /(איתמר)/g, type: 'dispute_intro' },
  { pattern: /(רב[יא]?\s+\S+)\s+ו?(רב[יא]?\s+\S+)\s+(?:פליגי|איפליגו)/g, type: 'dispute' },
  { pattern: /(בית\s+שמאי)\s+(?:אומרים|ו?בית\s+הלל)/g, type: 'houses_dispute' },
  { pattern: /(בית\s+הלל)\s+אומרים/g, type: 'houses_dispute' },
  { pattern: /(לימא\s+כתנאי)/g, type: 'tannaitic_dispute' },
  { pattern: /תנאי\s+היא/g, type: 'tannaitic_dispute' },
  // HALACHIC RULINGS
  { pattern: /הלכה\s+כ?(רב[יא]?\s+\S+)/g, type: 'halachic_ruling' },
  { pattern: /הלכתא\s+כ?(רב[יא]?\s+\S+)/g, type: 'halachic_ruling' },
  { pattern: /והלכתא\s+([^.]{5,30})/g, type: 'final_ruling' },
  { pattern: /פסק\s+(רב[יא]?\s+\S+)/g, type: 'halachic_ruling' },
  // OPINION CONTEXT
  { pattern: /לדידיה\s+ד?(רב[יא]?\s+\S+)/g, type: 'opinion_context' },
  { pattern: /אליבא\s+ד?(רב[יא]?\s+\S+)/g, type: 'opinion_context' },
  { pattern: /לדברי\s+(רב[יא]?\s+\S+)/g, type: 'opinion_context' },
  // CONCLUSIONS AND INFERENCES
  { pattern: /שמע\s+מינה\s+([^.]{5,40})/g, type: 'inference' },
  { pattern: /מכלל\s+ד([^.]{5,30})/g, type: 'inference' },
  { pattern: /אלמא/g, type: 'inference' }
];

export const SPEAKER_NORMALIZATION = {
  'ר\' יוחנן': 'רבי יוחנן',
  'ר״ל': 'ריש לקיש',
  'ר"ל': 'ריש לקיש',
  'ר"מ': 'רבי מאיר',
  'ר״מ': 'רבי מאיר',
  'ר"ע': 'רבי עקיבא',
  'ר״ע': 'רבי עקיבא',
  'רשב"י': 'רבי שמעון בר יוחאי',
  'רשב״י': 'רבי שמעון בר יוחאי',
  'רשב"ג': 'רבן שמעון בן גמליאל',
  'רשב״ג': 'רבן שמעון בן גמליאל',
  'ר"י': 'רבי יהודה',
  'ר״י': 'רבי יהודה',
  'ר"א': 'רבי אליעזר',
  'ר״א': 'רבי אליעזר',
  'ר"ג': 'רבן גמליאל',
  'ר״ג': 'רבן גמליאל',
  'ר"ש': 'רבי שמעון',
  'ר״ש': 'רבי שמעון',
  'ר"נ': 'רב נחמן',
  'ר״נ': 'רב נחמן',
  'ר"ה': 'רב הונא',
  'ר״ה': 'רב הונא',
  'ר"ח': 'רב חסדא',
  'ר״ח': 'רב חסדא',
  'ר"פ': 'רב פפא',
  'ר״פ': 'רב פפא',
  'אביי ורבא': 'אביי ורבא',
  'ב"ש': 'בית שמאי',
  'ב״ש': 'בית שמאי',
  'ב"ה': 'בית הלל',
  'ב״ה': 'בית הלל',
  'ר"י נשיאה': 'רבי יהודה הנשיא',
  'רבי': 'רבי יהודה הנשיא',
  'רבינא': 'רבינא',
  'מר זוטרא': 'מר זוטרא'
};

// eslint-disable-next-line no-unused-vars
export const ARGUMENT_FLOW = {
  STANDARD: ['mishna', 'gemara', 'question', 'proof', 'resolution'],
  DISPUTE: ['statement_a', 'statement_b', 'question', 'difference', 'resolution'],
  PROOF_CHAIN: ['claim', 'challenge', 'proof', 'inference', 'conclusion']
};

// =============================================================================
// ENHANCED DISCOURSE MARKERS (pattern/label/icon/category rows, V13)
// =============================================================================

export const ENHANCED_DISCOURSE_MARKERS = [
  { pattern: /מתני[׳']?\s*[.:]/g, type: 'mishna', label: 'משנה', icon: '📘', category: 'source' },
  { pattern: /גמ[׳']?\s*[.:]/g, type: 'gemara', label: 'גמרא', icon: '📖', category: 'source' },
  { pattern: /תניא/g, type: 'baraita', label: 'ברייתא', icon: '📜', category: 'source' },
  { pattern: /תנו\s+רבנן/g, type: 'baraita', label: 'תנו רבנן', icon: '📜', category: 'source' },
  { pattern: /תנן/g, type: 'mishna_cite', label: 'תנן', icon: '📚', category: 'source' },
  { pattern: /מאי\s+\S+/g, type: 'question', label: 'מאי (שאלה)', icon: '❓', category: 'question' },
  { pattern: /מנא\s+הני\s+מילי/g, type: 'source_question', label: 'מקור?', icon: '🔍', category: 'question' },
  { pattern: /מנ?לן/g, type: 'source_question', label: 'מנלן?', icon: '🔍', category: 'question' },
  { pattern: /איבעיא\s+להו/g, type: 'inquiry', label: 'איבעיא', icon: '🤔', category: 'question' },
  { pattern: /בעי\s+\S+/g, type: 'inquiry', label: 'בעי', icon: '🤔', category: 'question' },
  { pattern: /למאי\s+הלכתא/g, type: 'practical_q', label: 'למאי הלכתא?', icon: '⚖️', category: 'question' },
  { pattern: /מיתיבי/g, type: 'objection', label: 'מיתיבי', icon: '⚔️', category: 'objection' },
  { pattern: /ורמינהו?/g, type: 'contradiction', label: 'ורמינהו', icon: '💥', category: 'objection' },
  { pattern: /והתניא/g, type: 'challenge', label: 'והתניא?', icon: '❗', category: 'objection' },
  { pattern: /והאמר/g, type: 'challenge', label: 'והאמר?', icon: '❗', category: 'objection' },
  { pattern: /מתקיף\s+לה/g, type: 'attack', label: 'מתקיף', icon: '👊', category: 'objection' },
  { pattern: /קשיא/g, type: 'difficulty', label: 'קשיא', icon: '❌', category: 'objection' },
  { pattern: /תיובתא/g, type: 'refutation', label: 'תיובתא', icon: '🚫', category: 'objection' },
  { pattern: /שנאמר/g, type: 'scripture', label: 'פסוק', icon: '📖', category: 'proof' },
  { pattern: /דכתיב/g, type: 'scripture', label: 'דכתיב', icon: '📖', category: 'proof' },
  { pattern: /ראיה/g, type: 'proof', label: 'ראיה', icon: '✅', category: 'proof' },
  { pattern: /לימא\s+מסייע/g, type: 'support', label: 'סיוע', icon: '🤝', category: 'proof' },
  { pattern: /לא\s+קשיא/g, type: 'resolution', label: 'לא קשיא', icon: '✨', category: 'resolution' },
  { pattern: /הכי\s+קאמר/g, type: 'explanation', label: 'הכי קאמר', icon: '💡', category: 'resolution' },
  { pattern: /הכא\s+במאי\s+עסקינן/g, type: 'specification', label: 'הכא במאי עסקינן', icon: '🎯', category: 'resolution' },
  { pattern: /אמר\s+לך/g, type: 'response', label: 'אמר לך', icon: '💬', category: 'resolution' },
  { pattern: /תרי\s+תנאי/g, type: 'two_tannaim', label: 'תרי תנאי', icon: '👥', category: 'resolution' },
  { pattern: /חד\s+אמר.*וחד\s+אמר/g, type: 'two_opinions', label: 'מחלוקת', icon: '⚖️', category: 'resolution' },
  { pattern: /שמע\s+מינה/g, type: 'conclusion', label: 'שמע מינה', icon: '✔️', category: 'conclusion' },
  { pattern: /מכלל\s+ד/g, type: 'inference', label: 'מכלל', icon: '➡️', category: 'conclusion' },
  { pattern: /אלמא/g, type: 'inference', label: 'אלמא', icon: '➡️', category: 'conclusion' },
  { pattern: /הלכתא/g, type: 'halacha', label: 'הלכתא', icon: '⚖️', category: 'conclusion' },
  { pattern: /תיקו/g, type: 'unresolved', label: 'תיקו', icon: '🔮', category: 'conclusion' }
];
