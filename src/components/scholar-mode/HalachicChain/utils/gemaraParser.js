/**
 * Gemara Parser
 * 
 * Extracts shakla v'tarya (back-and-forth analysis) from Gemara text.
 * Identifies questions, challenges, resolutions, and surviving opinions.
 */

// Question patterns in Gemara
const QUESTION_PATTERNS = [
  { pattern: /(?:מאי|מה|מנא|מנין)\s+(?:טעמא|טעם|הא|הני|הכא)/g, type: 'what_reason' },
  { pattern: /(?:קא\s+)?מיבעיא\s+(?:ליה|להו)/g, type: 'question' },
  { pattern: /(?:קשיא|קשה|קשין|קשות)/g, type: 'difficulty' },
  { pattern: /(?:תניא|תנן|תנו)/g, type: 'braita' },
  { pattern: /(?:איתיביה|איתיבה|איתיבי)/g, type: 'challenge' },
  { pattern: /(?:אמר\s+(?:רב|רבי|רבא|רבה|אביי|רב\s+אשי))/g, type: 'statement' }
];

// Resolution patterns
const RESOLUTION_PATTERNS = [
  { pattern: /(?:אלא|אלא\s+הכא|אלא\s+הני)/g, type: 'rather' },
  { pattern: /(?:מודה|מודים|מודה\s+הוא)/g, type: 'concedes' },
  { pattern: /(?:תרוי?הו|שניהם|כולן)/g, type: 'both' },
  { pattern: /(?:הכא\s+במאי\s+עסקינן|הכי\s+קאמר)/g, type: 'context' },
  { pattern: /(?:הוא\s+הדין|היינו)/g, type: 'same_law' }
];

// Rejection patterns
const REJECTION_PATTERNS = [
  { pattern: /(?:אין|ל"א|לא|אינו|אינה)/g, type: 'no' },
  { pattern: /(?:מתיב|מתיבין|מתיבי|קא\s+משמע\s+לן)/g, type: 'objection' },
  { pattern: /(?:והא|הא\s+איתמר|הא\s+אמר)/g, type: 'but_said' }
];

/**
 * Extract Gemara analysis
 * @param {string} text - Gemara text
 * @param {AbortSignal} signal - Abort signal
 * @returns {Promise<Array>} Array of analysis segments
 */
export const extractGemaraAnalysis = async (text, signal) => {
  const analysis = [];
  
  if (signal?.aborted) {
    throw new Error('AbortError');
  }

  // Split into logical segments (approximate)
  const segments = segmentGemara(text);
  
  segments.forEach((segment, index) => {
    if (signal?.aborted) return;
    
    const segmentAnalysis = analyzeSegment(segment);
    if (segmentAnalysis) {
      analysis.push({
        id: `segment_${index}`,
        ...segmentAnalysis
      });
    }
  });

  return analysis;
};

/**
 * Segment Gemara text into logical units
 */
const segmentGemara = (text) => {
  // Split on common delimiters
  const delimiters = /(?=[\.\n]\s*(?:מאי|מה|מנא|קשיא|איתיביה|אלא|מודה|הכא|אין|מתיב|והא))/g;
  return text.split(delimiters).filter(s => s.trim().length > 20);
};

/**
 * Analyze a single segment
 */
const analyzeSegment = (segment) => {
  const questions = [];
  const rejections = [];
  const resolutions = [];
  
  // Check for questions
  QUESTION_PATTERNS.forEach(({ pattern, type }) => {
    if (pattern.test(segment)) {
      questions.push({
        type,
        text: extractQuestionText(segment, pattern)
      });
    }
  });
  
  // Check for rejections
  REJECTION_PATTERNS.forEach(({ pattern, type }) => {
    if (pattern.test(segment)) {
      rejections.push({
        type,
        text: extractContext(segment, pattern)
      });
    }
  });
  
  // Check for resolutions
  RESOLUTION_PATTERNS.forEach(({ pattern, type }) => {
    if (pattern.test(segment)) {
      resolutions.push({
        type,
        text: extractContext(segment, pattern)
      });
    }
  });
  
  // Only return if there's meaningful analysis
  if (questions.length > 0 || rejections.length > 0 || resolutions.length > 0) {
    return {
      question: questions.length > 0 ? questions[0].text : null,
      questions,
      rejections: rejections.map(r => r.text),
      resolutions: resolutions.map(r => r.text),
      fullText: segment.substring(0, 300)
    };
  }
  
  return null;
};

/**
 * Extract question text
 */
const extractQuestionText = (segment, pattern) => {
  const match = segment.match(pattern);
  if (!match) return segment.substring(0, 100);
  
  const start = Math.max(0, match.index - 20);
  const end = Math.min(segment.length, match.index + 150);
  return segment.substring(start, end).trim();
};

/**
 * Extract context around pattern
 */
const extractContext = (segment, pattern) => {
  const match = segment.match(pattern);
  if (!match) return segment.substring(0, 100);
  
  const start = Math.max(0, match.index);
  const end = Math.min(segment.length, match.index + 200);
  return segment.substring(start, end).trim();
};

/**
 * Identify structural markers in Gemara
 */
export const identifyStructuralMarkers = (text) => {
  const markers = {
    hasQuestion: QUESTION_PATTERNS.some(p => p.pattern.test(text)),
    hasRejection: REJECTION_PATTERNS.some(p => p.pattern.test(text)),
    hasResolution: RESOLUTION_PATTERNS.some(p => p.pattern.test(text)),
    isBraita: /תניא/.test(text),
    isMishnaReference: /תנן/.test(text),
    isChallenge: /איתיביה/.test(text)
  };
  
  return markers;
};

/**
 * Check if text is primarily Gemara (vs Mishnah)
 */
export const isGemaraText = (text) => {
  const gemaraIndicators = [
    /מאי\s+טעמא/,
    /קא\s+מיבעיא/,
    /קשיא/,
    /איתיביה/,
    /אלא\s+הכא/,
    /מודה\s+הוא/,
    /רב\s+אמר/,
    /רבי\s+אליעזר\s+אמר/,
    /אביי\s+אמר/,
    /רבא\s+אמר/
  ];
  
  return gemaraIndicators.some(pattern => pattern.test(text));
};

export default {
  extractGemaraAnalysis,
  identifyStructuralMarkers,
  isGemaraText
};
