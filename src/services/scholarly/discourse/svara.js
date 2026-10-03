// discoursePatternService — Svarot, conclusions halachiques, cross-réfs, chaîne argumentative (split phase 2, 03/10/2026)
import { stripAllDiacritics } from '../../../utils/hebrewUtils';

export function detectSvarot(text) {
  if (!text) return [];

  // PRO SCHOLAR V12: Using centralized stripAllDiacritics
  const cleanText = stripAllDiacritics(text);

  const svaraPatterns = [
    // Logical reasoning
    { regex: /מסתברא\s+([\u0590-\u05FF\s]{5,50})/g, type: 'logical_reasoning', label: 'מסתברא', icon: '🧠' },
    { regex: /סברא\s+היא/g, type: 'logical_principle', label: 'סברא היא', icon: '💭' },
    { regex: /מה\s+טעם/g, type: 'reason_inquiry', label: 'מה טעם', icon: '❓' },

    // Hermeneutic rules (מידות שהתורה נדרשת בהן)
    { regex: /קל\s+וחומר/g, type: 'kal_vachomer', label: 'קל וחומר', icon: '⬆️', description: 'A fortiori' },
    { regex: /גזרה\s+שוה/g, type: 'gezera_shava', label: 'גזרה שוה', icon: '🔗', description: 'Word analogy' },
    { regex: /בנין\s+אב/g, type: 'binyan_av', label: 'בנין אב', icon: '🏛️', description: 'Prototype' },
    { regex: /מה\s+מצינו/g, type: 'mah_matzinu', label: 'מה מצינו', icon: '🔍', description: 'What we find' },
    { regex: /היקש/g, type: 'hekesh', label: 'היקש', icon: '⚖️', description: 'Juxtaposition' },
    { regex: /סמוכין/g, type: 'semuchin', label: 'סמוכין', icon: '📐', description: 'Proximity' },
    { regex: /כלל\s+ופרט/g, type: 'klal_uprat', label: 'כלל ופרט', icon: '📊', description: 'General/specific' },
    { regex: /ריבוי\s+ומיעוט/g, type: 'ribui_miut', label: 'ריבוי ומיעוט', icon: '±', description: 'Include/exclude' },

    // Logical distinctions
    { regex: /אין\s+למדין\s+מן\s+הכללות/g, type: 'klalot_rule', label: 'אין למדין מן הכללות', icon: '⚠️' },
    { regex: /כל\s+היכא\s+ד/g, type: 'general_principle', label: 'כל היכא ד', icon: '📜' },
    { regex: /מידי\s+דהוה/g, type: 'comparison', label: 'מידי דהוה', icon: '↔️' },
    { regex: /לאו\s+כל\s+כמינך/g, type: 'limitation', label: 'לאו כל כמינך', icon: '🚫' },

    // Assumptions and conclusions
    { regex: /הוה\s+אמינא/g, type: 'initial_thought', label: 'הו"א', icon: '💭', description: 'I would have thought' },
    { regex: /קא\s+משמע\s+לן/g, type: 'teaching', label: 'קמ"ל', icon: '💡', description: 'It teaches us' },
    { regex: /צריכא/g, type: 'necessity', label: 'צריכא', icon: '✓', description: 'Necessary' },
    { regex: /למעוטי\s+מאי/g, type: 'exclusion', label: 'למעוטי מאי', icon: '➖' }
  ];

  const results = [];
  for (const { regex, type, label, icon, description } of svaraPatterns) {
    let match;
    while ((match = regex.exec(cleanText)) !== null) {
      results.push({
        type,
        label,
        icon,
        description: description || '',
        text: match[0],
        context: match[1] || '',
        position: match.index
      });
    }
  }

  return results.sort((a, b) => a.position - b.position);
}

// =============================================================================
// PRO SCHOLAR V30: HALACHIC CONCLUSION EXTRACTOR
// =============================================================================

/**
 * PRO SCHOLAR V30: Extract halachic conclusions and rulings from text
 * @param {string} text - Hebrew/Aramaic text to analyze
 * @returns {Array} Array of halachic conclusions with classification
 */
export function extractHalachicConclusions(text) {
  if (!text) return [];

  // PRO SCHOLAR V12: Using centralized stripAllDiacritics
  const cleanText = stripAllDiacritics(text);

  const conclusions = [];

  const patterns = [
    // Definitive rulings
    { regex: /הלכה\s+כ([\u0590-\u05FF]+)/g, type: 'ruling_like', extract: 1, icon: '⚖️' },
    { regex: /הלכתא\s+([\u0590-\u05FF\s]{3,30})/g, type: 'halachta', extract: 1, icon: '⚖️' },
    { regex: /קיימא\s+לן/g, type: 'established_law', icon: '✓' },
    { regex: /הכי\s+נקטינן/g, type: 'we_hold', icon: '✓' },

    // Liability rulings
    { regex: /(חייב)\s+([\u0590-\u05FF\s]{2,25})/g, type: 'liable', extract: 0, icon: '🔴' },
    { regex: /(פטור)\s+([\u0590-\u05FF\s]{2,25})/g, type: 'exempt', extract: 0, icon: '🟢' },
    { regex: /(מותר)\s+([\u0590-\u05FF\s]{2,25})/g, type: 'permitted', extract: 0, icon: '✅' },
    { regex: /(אסור)\s+([\u0590-\u05FF\s]{2,25})/g, type: 'forbidden', extract: 0, icon: '🚫' },

    // Ritual status
    { regex: /(טהור|טמא)\s*([\u0590-\u05FF\s]{0,20})/g, type: 'purity_status', extract: 0, icon: '🔵' },
    { regex: /(כשר|פסול)\s*([\u0590-\u05FF\s]{0,20})/g, type: 'validity_status', extract: 0, icon: '✓' },

    // Final statements
    { regex: /נמצא\s+([\u0590-\u05FF\s]{5,40})/g, type: 'conclusion', extract: 1, icon: '📝' },
    { regex: /אלמא\s+([\u0590-\u05FF\s]{5,40})/g, type: 'therefore', extract: 1, icon: '➡️' }
  ];

  for (const { regex, type, extract, icon } of patterns) {
    let match;
    while ((match = regex.exec(cleanText)) !== null) {
      const fullText = match[0];
      conclusions.push({
        type,
        icon,
        fullText,
        extracted: extract !== undefined ? (match[extract] || fullText) : fullText,
        position: match.index,
        isLiable: fullText.includes('חייב'),
        isExempt: fullText.includes('פטור'),
        isPermitted: fullText.includes('מותר'),
        isForbidden: fullText.includes('אסור')
      });
    }
  }

  return conclusions.sort((a, b) => a.position - b.position);
}

// =============================================================================
// PRO SCHOLAR V30: CROSS-REFERENCE DETECTION
// =============================================================================

/**
 * PRO SCHOLAR V30: Detect cross-references to other Talmudic sources
 * @param {string} text - Hebrew/Aramaic text to analyze
 * @returns {Object} Categorized cross-references
 */
export function detectCrossReferences(text) {
  if (!text) return { parallel_sugya: [], mishna_elsewhere: [], baraita: [], scripture: [], yerushalmi: [], midrash: [] };

  // PRO SCHOLAR V12: Using centralized stripAllDiacritics
  const cleanText = stripAllDiacritics(text);

  const refs = {
    parallel_sugya: [],
    mishna_elsewhere: [],
    baraita: [],
    scripture: [],
    yerushalmi: [],
    midrash: []
  };

  // Parallel Mishna references
  const mishnaPattern = /(?:תנן\s+התם|הא\s+תנן|כדתנן|דתנן)\s*([\u0590-\u05FF\s]{3,50})/g;
  let match;
  while ((match = mishnaPattern.exec(cleanText)) !== null) {
    refs.mishna_elsewhere.push({ marker: match[0].trim(), context: match[1]?.trim() || '', position: match.index, icon: '📘' });
  }

  // Baraita references
  const baraitaPattern = /(?:תנו\s+רבנן|תניא|ת"ר|דתניא)\s*([\u0590-\u05FF\s]{3,60})/g;
  while ((match = baraitaPattern.exec(cleanText)) !== null) {
    refs.baraita.push({ marker: match[0].trim(), context: match[1]?.trim() || '', position: match.index, icon: '📋' });
  }

  // Scripture citations
  const scripturePattern = /(?:שנאמר|דכתיב|כדכתיב|הכתוב\s+אומר)\s*([\u0590-\u05FF\s]{3,60})/g;
  while ((match = scripturePattern.exec(cleanText)) !== null) {
    refs.scripture.push({ marker: match[0].trim(), verse: match[1]?.trim() || '', position: match.index, icon: '📖' });
  }

  // Other tractate references
  const tractatePattern = /(?:כדאמרינן|כדאיתא)\s+(?:ב)?(שבת|עירובין|פסחים|ברכות|יומא|סוכה|ביצה|מגילה|יבמות|כתובות|גיטין|קידושין|בבא\s*קמא|בבא\s*מציעא|בבא\s*בתרא|סנהדרין|מכות|חולין|נדה)/g;
  while ((match = tractatePattern.exec(cleanText)) !== null) {
    refs.parallel_sugya.push({ marker: match[0], tractate: match[1], position: match.index, icon: '📚' });
  }

  // Yerushalmi references
  const yerushalmiPattern = /(?:ירושלמי|תלמודא\s*דמערבא)/g;
  while ((match = yerushalmiPattern.exec(cleanText)) !== null) {
    refs.yerushalmi.push({ marker: match[0], position: match.index, icon: '🏛️' });
  }

  return refs;
}

// =============================================================================
// PRO SCHOLAR V30: ARGUMENT CHAIN TRACKING
// =============================================================================

/**
 * PRO SCHOLAR V30: Build argument chain with depth tracking
 * @param {string} text - Hebrew/Aramaic text to analyze
 * @returns {Object} Argument chain with depth, status, and relationships
 */
export function buildArgumentChain(text) {
  if (!text) return { chain: [], maxDepth: 0, unresolvedCount: 0, summary: {} };

  const markers = detectStructuralMarkers(text);
  const chain = [];
  let depth = 0;
  let maxDepth = 0;
  let questionId = 0;

  for (let i = 0; i < markers.length; i++) {
    const m = markers[i];
    const node = { ...m, id: `node-${i}`, depth, direction: 'statement', status: null, resolvedBy: null, questionId: null };

    if (['question', 'objection'].includes(m.type)) {
      depth++;
      maxDepth = Math.max(maxDepth, depth);
      node.depth = depth;
      node.direction = 'question';
      node.status = 'open';
      node.questionId = ++questionId;
      chain.push(node);
    }
    else if (['resolution', 'proof', 'halachic_conclusion'].includes(m.type)) {
      const openQuestions = chain.filter(c => c.status === 'open');
      const matchingQuestion = openQuestions[openQuestions.length - 1];

      if (matchingQuestion) {
        matchingQuestion.status = 'resolved';
        matchingQuestion.resolvedBy = `node-${i}`;
        node.resolves = matchingQuestion.id;
      }

      node.depth = Math.max(depth, 1);
      node.direction = 'answer';
      chain.push(node);
      depth = Math.max(0, depth - 1);
    }
    else if (['mishna', 'gemara'].includes(m.type)) {
      depth = 0;
      node.depth = 0;
      node.direction = 'structure';
      chain.push(node);
    }
    else {
      chain.push(node);
    }
  }

  const unresolvedCount = chain.filter(c => c.status === 'open').length;
  const resolvedCount = chain.filter(c => c.status === 'resolved').length;
  const totalQuestions = chain.filter(c => c.direction === 'question').length;

  return {
    chain,
    maxDepth,
    unresolvedCount,
    summary: {
      totalNodes: chain.length,
      totalQuestions,
      resolvedCount,
      unresolvedCount,
      resolutionRate: totalQuestions > 0 ? Math.round((resolvedCount / totalQuestions) * 100) : 100,
      complexity: maxDepth < 2 ? 'simple' : maxDepth < 4 ? 'moderate' : 'complex'
    }
  };
}

/**
 * PRO SCHOLAR V30: Get comprehensive sugya analysis
 * Combines all analysis functions for a complete picture
 * @param {string} text - Hebrew/Aramaic text to analyze
 * @returns {Object} Complete sugya analysis with all components
 */
