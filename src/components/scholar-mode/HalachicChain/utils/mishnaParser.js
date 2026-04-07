/**
 * Mishna Parser
 * 
 * Extracts opinions from Mishnah text.
 * Identifies Tannaim and their respective rulings.
 */

import { AUTHORITY_TYPES, AUTHORITY_DISPLAY_NAMES } from '../types';

// Pattern to identify opinion statements in Mishnah
const OPINION_PATTERNS = [
  // "אבא שאול אומר" (Abba Shaul says)
  /([א-ת\s\"']{2,20})\s*(?:אומר|אומרת|אמר|אומרים)\s*[,:]\s*([^\.\n]+)/g,
  
  // "דברי רבי מאיר" (the words of Rabbi Meir)
  /דברי\s+([א-ת\s\"']{2,20})/g,
  
  // "רבי מאיר פוטר" (Rabbi Meir exempts)
  /([א-ת\s\"']{2,20})\s*(?:פוטר|מחייב|מטמא|מטהר|אוסר|מתיר)/g,
  
  // "תנא קמא" (first Tanna) patterns
  /תנא\s+קמא[\s,:]+([^\.\n]+)/g,
  
  // "חכמים אומרים" (the Sages say)
  /חכמים\s*(?:אומרים|אומרת)[\s,:]+([^\.\n]+)/g
];

// List of known Tannaim to recognize
const KNOWN_TANNAIM = [
  'רבי מאיר', 'רבי יהודה', 'רבי יוסי', 'רבי שמעון', 'רבי עקיבא',
  'רבי טרפון', 'רבי אליעזר', 'רבי יהושע', 'רבי אלעזר', 'רבי ינאי',
  'אבא שאול', 'בן עזאי', 'בן זומא', 'בן ננס', 'שמאי', 'הלל',
  'תנא קמא', 'רבי נתן', 'סומכוס', 'רבי יוחנן בן נורי'
];

/**
 * Extract opinions from Mishnah text
 * @param {string} text - Mishnah text
 * @param {AbortSignal} signal - Abort signal
 * @returns {Promise<Array>} Array of opinion objects
 */
export const extractMishnaOpinions = async (text, signal) => {
  const opinions = [];
  const seenAuthorities = new Set();

  // Check for abort
  if (signal?.aborted) {
    throw new Error('AbortError');
  }

  // Method 1: Pattern matching
  OPINION_PATTERNS.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (signal?.aborted) break;

      const authority = cleanAuthorityName(match[1]);
      const ruling = match[2] || match[0];

      if (authority && !seenAuthorities.has(authority)) {
        seenAuthorities.add(authority);
        opinions.push(createOpinion(authority, ruling, text));
      }
    }
  });

  // Method 2: Known Tannaim lookup
  KNOWN_TANNAIM.forEach(tanna => {
    if (signal?.aborted) return;
    
    if (text.includes(tanna) && !seenAuthorities.has(tanna)) {
      // Find context around mention
      const index = text.indexOf(tanna);
      const context = extractContext(text, index);
      
      seenAuthorities.add(tanna);
      opinions.push(createOpinion(tanna, context, text));
    }
  });

  // Sort by appearance order in text
  opinions.sort((a, b) => {
    const indexA = text.indexOf(a.authority);
    const indexB = text.indexOf(b.authority);
    return indexA - indexB;
  });

  return opinions;
};

/**
 * Clean up authority name
 */
const cleanAuthorityName = (name) => {
  if (!name) return null;
  
  return name
    .trim()
    .replace(/[\"':\s]+$/g, '') // Remove trailing punctuation/spaces
    .replace(/^[\"':\s]+/g, '') // Remove leading punctuation/spaces
    .replace(/\s+/g, ' ');       // Normalize spaces
};

/**
 * Create opinion object
 */
const createOpinion = (authority, ruling, fullText) => {
  const displayInfo = AUTHORITY_DISPLAY_NAMES[authority] || {
    hebrew: authority,
    type: AUTHORITY_TYPES.TANNA
  };

  return {
    authority,
    authorityType: displayInfo.type,
    ruling: cleanRuling(ruling),
    text: fullText,
    reasoning: null, // Will be filled if Gemara explains
    isAccepted: false, // Will be determined later
    rejectedBy: [],
    supportedBy: []
  };
};

/**
 * Clean up ruling text
 */
const cleanRuling = (ruling) => {
  if (!ruling) return '';
  
  return ruling
    .trim()
    .substring(0, 200) // Limit length
    .replace(/\s+/g, ' ');
};

/**
 * Extract context around a position
 */
const extractContext = (text, position, contextSize = 100) => {
  const start = Math.max(0, position - contextSize);
  const end = Math.min(text.length, position + contextSize);
  return text.substring(start, end).trim();
};

/**
 * Check if text is Mishnah (vs Gemara)
 */
export const isMishnaText = (text) => {
  const mishnaIndicators = [
    /^משנה/,
    /^מתניתין/,
    /מתני\s*'/,
    /תנן/,
    /תנא\s/,
    /^(?:(?:רבי|בן)\s+[א-ת]{2,10}\s+אומר)/
  ];

  return mishnaIndicators.some(pattern => pattern.test(text.trim()));
};

export default {
  extractMishnaOpinions,
  isMishnaText
};
