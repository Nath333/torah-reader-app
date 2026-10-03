// discoursePatternService — Analyse et résumé de structure mishnaïque (split phase 2, 03/10/2026)
import {
  MISHNA_STRUCTURE_PATTERNS
} from './discourseData';
import { stripAllDiacritics } from '../../../utils/hebrewUtils';

export function analyzeMishnaStructure(text) {
  if (!text) return { elements: [], summary: null };

  // PRO SCHOLAR V12: Using centralized stripAllDiacritics
  const cleanText = stripAllDiacritics(text);

  // PRO SCHOLAR V28: Build position mapping from clean text to original text
  // This fixes the nikud position alignment issue where positions don't match
  const cleanToOriginal = [];
  let cleanIdx = 0;
  for (let origIdx = 0; origIdx < text.length; origIdx++) {
    const char = text[origIdx];
    // Check if character is nikud/cantillation (will be stripped)
    if (!/[\u0591-\u05C7]/.test(char)) {
      cleanToOriginal[cleanIdx] = origIdx;
      cleanIdx++;
    }
  }
  // Add end mapping for slicing
  cleanToOriginal[cleanIdx] = text.length;

  const elements = [];
  const seenPositions = new Set();

  for (const [type, config] of Object.entries(MISHNA_STRUCTURE_PATTERNS)) {
    for (const pattern of config.patterns) {
      const regex = new RegExp(pattern.source, pattern.flags);
      let match;
      while ((match = regex.exec(cleanText)) !== null) {
        // Map clean text positions back to original text positions
        const origStart = cleanToOriginal[match.index] ?? match.index;
        const origEnd = cleanToOriginal[match.index + match[0].length] ?? (match.index + match[0].length);

        const posKey = `${origStart}-${type}`;
        if (!seenPositions.has(posKey)) {
          seenPositions.add(posKey);
          // Extract original text with nikud
          const originalText = text.slice(origStart, origEnd);
          elements.push({
            type,
            text: originalText || match[0],
            position: origStart,
            endPosition: origEnd,
            label: config.label,
            icon: config.icon,
            color: config.color
          });
        }
      }
    }
  }

  // Sort by position
  elements.sort((a, b) => a.position - b.position);

  // Generate summary
  const summary = {
    hasEnumeration: elements.some(e => e.type === 'enumeration'),
    hasConditions: elements.some(e => e.type === 'condition'),
    hasExceptions: elements.some(e => e.type === 'exception'),
    hasRulings: elements.some(e => e.type === 'ruling'),
    hasDisputes: elements.some(e => e.type === 'dispute'),
    hasCaseStructure: elements.some(e => e.type === 'case_structure'),
    totalElements: elements.length,
    breakdown: {}
  };

  // Count by type
  for (const el of elements) {
    summary.breakdown[el.type] = (summary.breakdown[el.type] || 0) + 1;
  }

  return { elements, summary };
}

// =============================================================================
// MISHNA SUMMARY GENERATOR (PRO SCHOLAR V26)
// Generates meaningful one-liner summaries explaining the halacha
// =============================================================================

/**
 * PRO SCHOLAR V26: Known Mishna opening patterns with explanations
 * Maps famous opening phrases to descriptive summaries
 */
const KNOWN_MISHNA_OPENINGS = {
  // Shabbat
  'יציאות השבת': {
    topic: 'הוצאה והכנסה בשבת',
    summary: 'מלאכת הוצאה: העברת חפצים בין רשות היחיד לרשות הרבים',
    details: 'שתים שהן ארבע - שני צדדים (הוצאה/הכנסה) × שני גורמים (עני/בעה"ב)'
  },
  'שתים שהן ארבע': {
    topic: 'מניין חיובי הוצאה',
    summary: 'ארבעה מקרים של הוצאה: מבפנים החוצה ומבחוץ פנימה, כל אחד על ידי עני או בעל הבית',
    details: 'בפנים = רשות היחיד, בחוץ = רשות הרבים'
  },
  'במה מדליקין': {
    topic: 'נרות שבת',
    summary: 'חומרים כשרים ופסולים להדלקת נר שבת - פתילות ושמנים',
    details: 'נר שבת חייב לדלוק כראוי לכבוד שבת'
  },
  'כירה': {
    topic: 'שהיית תבשיל על האש',
    summary: 'מתי מותר להשאיר תבשיל על כירה בשבת - גרוף וקטום',
    details: 'חשש שמא יחתה בגחלים להגביר האש'
  },
  'במה טומנין': {
    topic: 'הטמנת תבשיל',
    summary: 'חומרים בהם מותר/אסור לעטוף סיר כדי לשמור חום',
    details: 'מותר בדבר שאינו מוסיף הבל'
  },
  // Berakhot
  'מאימתי קורין': {
    topic: 'זמן קריאת שמע',
    summary: 'זמני קריאת שמע של ערבית ושחרית',
    details: 'משעה שהכהנים נכנסים לאכול בתרומתן'
  },
  'היה קורא': {
    topic: 'קריאת שמע',
    summary: 'דיני קריאת שמע - כוונה, הפסקות, וטעויות',
    details: 'כוונה בפסוק ראשון מעכבת'
  },
  // General patterns
  'שלשה דברים': {
    topic: 'מנייה תלת',
    summary: 'שלושה עניינים הקשורים בנושא המשנה',
    details: 'מבנה של ספירה וסיווג'
  },
  'ארבעה דברים': {
    topic: 'מנייה ארבע',
    summary: 'ארבעה עניינים או סוגים בנושא הנידון',
    details: 'מבנה של ספירה וסיווג'
  }
};

/**
 * Extract halachic ruling patterns from text
 * @param {string} text - Hebrew text
 * @returns {Object[]} Array of rulings with type and context
 */
function extractRulings(text) {
  const rulings = [];
  const patterns = [
    { regex: /(?:העני|עני)\s*[\u0590-\u05FF]*\s*(?:חייב|פטור)/g, actor: 'עני', actionType: 'transfer' },
    { regex: /(?:בעל\s+הבית|בעה"ב)\s*[\u0590-\u05FF]*\s*(?:חייב|פטור)/g, actor: 'בעל הבית', actionType: 'transfer' },
    { regex: /שניהם\s+(?:פטורים|חייבים)/g, actor: 'שניהם', actionType: 'both' },
    { regex: /(?:מותר|אסור)\s+[\u0590-\u05FF]{2,20}/g, actor: null, actionType: 'permission' },
    { regex: /(?:חייב|פטור)\s+[\u0590-\u05FF]{2,20}/g, actor: null, actionType: 'liability' }
  ];

  for (const { regex, actor, actionType } of patterns) {
    let match;
    while ((match = regex.exec(text)) !== null) {
      rulings.push({
        text: match[0],
        actor,
        actionType,
        isLiable: match[0].includes('חייב'),
        isExempt: match[0].includes('פטור'),
        isPermitted: match[0].includes('מותר'),
        isForbidden: match[0].includes('אסור'),
        position: match.index
      });
    }
  }

  return rulings;
}

/**
 * PRO SCHOLAR V26: Generate a meaningful Mishna summary
 * Creates a one-liner that explains the actual halachic content
 * @param {string} text - Mishna text
 * @param {Object} analysis - Output from analyzeMishnaStructure
 * @returns {Object} Summary with oneLiner, topic, details, and rulings
 */
export function generateMishnaSummary(text, analysis = null) {
  if (!text) return { oneLiner: '', topic: '', details: '', rulings: [] };

  // PRO SCHOLAR V12: Using centralized stripAllDiacritics
  const cleanText = stripAllDiacritics(text);

  // Check for known Mishna openings
  for (const [opening, info] of Object.entries(KNOWN_MISHNA_OPENINGS)) {
    if (cleanText.includes(opening)) {
      const rulings = extractRulings(cleanText);
      return {
        oneLiner: info.summary,
        topic: info.topic,
        details: info.details,
        rulings,
        isKnown: true
      };
    }
  }

  // Generate dynamic summary based on detected patterns
  const structureAnalysis = analysis || analyzeMishnaStructure(text);
  const { elements = [], summary = {} } = structureAnalysis;

  // Extract key content
  const rulings = extractRulings(cleanText);
  const liableCount = rulings.filter(r => r.isLiable).length;
  const exemptCount = rulings.filter(r => r.isExempt).length;

  // Build summary based on detected elements
  const summaryParts = [];

  // Check for enumeration (שתים שהן ארבע pattern)
  const enumMatch = cleanText.match(/(?:שתים|שלש|ארבע|חמש|שש|שבע)\s+(?:שהן|שהם)\s+(?:ארבע|שש|שמונה|עשר)/);
  if (enumMatch) {
    summaryParts.push(`מניין: ${enumMatch[0]}`);
  }

  // Count rulings
  if (liableCount > 0 || exemptCount > 0) {
    const ruleParts = [];
    if (liableCount > 0) ruleParts.push(`${liableCount} מקרי חיוב`);
    if (exemptCount > 0) ruleParts.push(`${exemptCount} מקרי פטור`);
    summaryParts.push(ruleParts.join(' ו-'));
  }

  // Check for dispute
  if (summary.hasDisputes) {
    summaryParts.push('מחלוקת תנאים');
  }

  // Check for cases
  if (elements.some(e => e.type === 'case_structure')) {
    const caseTexts = elements.filter(e => e.type === 'case_structure').map(e => e.text);
    if (caseTexts.length > 0) {
      summaryParts.push(`מקרים: ${caseTexts.slice(0, 2).join(', ')}`);
    }
  }

  // Generate one-liner
  let oneLiner = '';
  if (summaryParts.length > 0) {
    oneLiner = summaryParts.join(' • ');
  } else {
    // Fallback: Extract first meaningful sentence
    const firstSentence = cleanText.split(/[.:]/).filter(s => s.length > 10)[0];
    if (firstSentence) {
      oneLiner = firstSentence.trim().substring(0, 80) + (firstSentence.length > 80 ? '...' : '');
    }
  }

  // Determine topic from content
  let topic = 'נושא המשנה';
  if (cleanText.includes('שבת') || cleanText.includes('הוצאה') || cleanText.includes('מלאכ')) {
    topic = 'הלכות שבת';
  } else if (cleanText.includes('קורא') || cleanText.includes('שמע')) {
    topic = 'קריאת שמע';
  } else if (cleanText.includes('תפל')) {
    topic = 'הלכות תפילה';
  }

  return {
    oneLiner,
    topic,
    details: `${elements.length} אלמנטים מבניים זוהו`,
    rulings,
    isKnown: false,
    breakdown: summary.breakdown || {}
  };
}

// =============================================================================
// GEMARA Q&A FLOW EXTRACTOR (PRO SCHOLAR V26)
// Enhanced to detect source-based and comparison-based Gemara flows
// =============================================================================

/**
 * Extract Q&A flow from Gemara text
 * Groups patterns into logical question-answer-resolution chains
 * PRO SCHOLAR V25: Also detects source-based flows (e.g., "תנן התם")
 * @param {string} text - Gemara text to analyze
 * @returns {Object} Q&A flow with questions, challenges, proofs, and resolutions
 */
