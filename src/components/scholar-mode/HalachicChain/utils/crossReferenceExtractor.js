/**
 * Cross Reference Extractor
 * 
 * Finds related sugyot and cross-references within Talmud texts.
 * Identifies parallel discussions, contrasting opinions, and source citations.
 */

import { sefariaApiRequest } from '../../../../services/sefariaApi';

// Patterns for finding references to other texts
const REFERENCE_PATTERNS = [
  // "וכן ב" (and similarly in)
  { pattern: /(?:וכן|כיון|כדומה)\s+ב([א-ת]{2,20})/g, type: 'parallel' },
  // "במסכת" (in tractate)
  { pattern: /(?:במסכת|במס'|בתלמוד)\s+([א-ת]{2,20})/g, type: 'tractate_ref' },
  // "דכתיב" (as it is written)
  { pattern: /(?:דכתיב|כדכתיב|שנאמר)\s+([א-ת\s]{5,100})/g, type: 'biblical' },
  // "תניא" (braita reference)
  { pattern: /תניא\s+([א-ת\s]{10,200})/g, type: 'braita' },
  // "אמר\s+רב" followed by other rabbi
  { pattern: /(?:אמר|איתמר)\s+([א-ת]{2,10})/g, type: 'statement' }
];

// Common tractate names for detection
const TRACTATE_NAMES = [
  'ברכות', 'שבת', 'עירובין', 'פסחים', 'יומא', 'סוכה', 'ביצה',
  'ראש השנה', 'תענית', 'מגילה', 'מועד קטן', 'חגיגה',
  'יבמות', 'כתובות', 'נדרים', 'נזיר', 'סוטה', 'גיטין', 'קידושין',
  'בבא קמא', 'בבא מציעא', 'בבא בתרא', 'סנהדרין', 'מכות', 'שבועות',
  'עבודה זרה', 'אבות', 'הוריות',
  'זבחים', 'מנחות', 'חולין', 'בכורות', 'ערכין', 'תמורה', 'כריתות', 'מעילה', 'תמיד', 'נדה'
];

/**
 * Extract cross-references from text
 * @param {string} reference - Current reference
 * @param {string} text - Text to analyze
 * @param {AbortSignal} signal - Abort signal
 * @returns {Promise<Array>} Array of cross-references
 */
export const extractCrossReferences = async (reference, text, signal) => {
  const references = [];
  
  if (signal?.aborted) {
    throw new Error('AbortError');
  }

  // Method 1: Pattern matching in text
  const textReferences = extractReferencesFromText(text, reference);
  references.push(...textReferences);

  // Method 2: Fetch from Sefaria links API
  try {
    const apiReferences = await fetchLinkedReferences(reference, signal);
    references.push(...apiReferences);
  } catch (err) {
    console.warn('Failed to fetch linked references:', err);
  }

  // Remove duplicates
  const uniqueRefs = removeDuplicateReferences(references);
  
  // Sort by relevance
  return sortByRelevance(uniqueRefs, reference);
};

/**
 * Extract references using pattern matching
 */
const extractReferencesFromText = (text, currentRef) => {
  const references = [];
  const seen = new Set();

  // Look for tractate mentions
  TRACTATE_NAMES.forEach(tractate => {
    if (text.includes(tractate)) {
      // Find context
      const index = text.indexOf(tractate);
      const context = extractContext(text, index, 80);
      
      const key = `${tractate}_mention`;
      if (!seen.has(key)) {
        seen.add(key);
        references.push({
          ref: tractate,
          hebrewRef: tractate,
          book: tractate,
          snippet: context,
          topic: 'tractate_mention',
          connectionType: 'reference'
        });
      }
    }
  });

  // Apply regex patterns
  REFERENCE_PATTERNS.forEach(({ pattern, type }) => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const content = match[1];
      if (content && content.length > 3) {
        const key = `${type}_${content.substring(0, 20)}`;
        if (!seen.has(key)) {
          seen.add(key);
          references.push({
            ref: null, // Would need to resolve
            hebrewRef: content,
            book: currentRef.split('.')[0],
            snippet: extractContext(text, match.index, 100),
            topic: content.substring(0, 30),
            connectionType: type
          });
        }
      }
    }
  });

  return references;
};

/**
 * Fetch linked references from Sefaria API
 */
const fetchLinkedReferences = async (reference, signal) => {
  try {
    const links = await sefariaApiRequest(`/api/links/${reference}`, { signal });
    
    if (!Array.isArray(links)) {
      return [];
    }

    return links
      .filter(link => {
        // Filter for meaningful connections
        const category = link?.category?.toLowerCase() || '';
        return ['reference', 'quotation', 'parallel', 'commentary'].includes(category);
      })
      .slice(0, 10) // Limit to 10
      .map(link => ({
        ref: link.ref,
        hebrewRef: link.heRef || link.ref,
        book: link.ref?.split('.')[0] || '',
        snippet: link.text?.substring(0, 150) || '',
        topic: link.category || 'related',
        connectionType: link.category || 'reference'
      }));
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error;
    }
    return [];
  }
};

/**
 * Extract context around a position
 */
const extractContext = (text, position, size = 100) => {
  const start = Math.max(0, position - size);
  const end = Math.min(text.length, position + size);
  return text.substring(start, end).trim();
};

/**
 * Remove duplicate references
 */
const removeDuplicateReferences = (references) => {
  const seen = new Set();
  return references.filter(ref => {
    const key = ref.ref || ref.hebrewRef;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/**
 * Sort references by relevance
 */
const sortByRelevance = (references, currentRef) => {
  const currentBook = currentRef.split('.')[0];
  
  return references.sort((a, b) => {
    // Same book is more relevant
    const aSameBook = a.book === currentBook ? 1 : 0;
    const bSameBook = b.book === currentBook ? 1 : 0;
    
    // Commentary links are very relevant
    const aCommentary = a.connectionType === 'commentary' ? 1 : 0;
    const bCommentary = b.connectionType === 'commentary' ? 1 : 0;
    
    // Parallel discussions are highly relevant
    const aParallel = a.connectionType === 'parallel' ? 1 : 0;
    const bParallel = b.connectionType === 'parallel' ? 1 : 0;
    
    const scoreA = aSameBook * 3 + aCommentary * 2 + aParallel * 2;
    const scoreB = bSameBook * 3 + bCommentary * 2 + bParallel * 2;
    
    return scoreB - scoreA;
  });
};

/**
 * Group references by type
 */
export const groupReferencesByType = (references) => {
  const groups = {};
  
  references.forEach(ref => {
    const type = ref.connectionType || 'other';
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(ref);
  });
  
  return groups;
};

/**
 * Filter references by book
 */
export const filterReferencesByBook = (references, bookName) => {
  return references.filter(ref => 
    ref.book === bookName || 
    ref.ref?.startsWith(bookName)
  );
};

export default {
  extractCrossReferences,
  groupReferencesByType,
  filterReferencesByBook
};
