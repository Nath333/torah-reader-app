// =============================================================================
// Discourse Pattern Detection Service
// Detects Talmudic structural elements: Mishna/Gemara markers, questions,
// objections, proofs, resolutions, and speaker attributions
// =============================================================================

// PRO SCHOLAR V12: Use centralized Hebrew utilities (DRY - single source of truth)
import { stripAllDiacritics, stripAllDiacritics as stripNikudLocal } from '../../utils/hebrewUtils';


// Ré-exports : l'original exposait ces 5 noms (TzuratHaDaf, TalmudToolsTab,
// talmudDiagramService… en dépendent)
export { DISCOURSE_TYPES, DISCOURSE_PATTERNS, RABBI_PATTERNS, TALMUDIC_PATTERNS, MISHNA_STRUCTURE_PATTERNS };

// =============================================================================
// CORE DETECTION FUNCTIONS
// =============================================================================

/**
 * Detect all discourse markers in Hebrew/Aramaic text
 * @param {string} text - The text to analyze
 * @returns {Array} Array of detected patterns with positions
 */
import {
  DISCOURSE_TYPES,
  DISCOURSE_PATTERNS,
  RABBI_PATTERNS,
  TALMUDIC_PATTERNS,
  MISHNA_STRUCTURE_PATTERNS
} from './discourse/discourseData';
import {
  detectStructuralMarkers,
  analyzeDiscourseStructure,
  detectDiscoursePatterns,
  detectRabbis,
  generateDiscourseFlowVisualization,
  getFlowDiagram,
  getHighlightedText,
  getPatternConfig,
  getPatternSummary,
  getPatternTypes,
  hasTalmudicStructure
} from './discourse/detection';
import {
  extractGemaraQA,
  generateQAFlowDiagram
} from './discourse/gemaraQA';
import {
  applyLayerColoring,
  getDiscourseLayerStyles,
  segmentIntoSugyaUnits
} from './discourse/layers';
import {
  analyzeMishnaStructure,
  generateMishnaSummary
} from './discourse/mishna';
import {
  buildArgumentChain,
  detectCrossReferences,
  detectSvarot,
  extractHalachicConclusions
} from './discourse/svara';
import {
  generateTzuratHaDaf,
  generateTzuratHaDafAscii,
  getTzuratHaDafProps,
  getTzuratHaDafStyles,
  renderTzuratHaDafHtml
} from './discourse/tzuratHavad';

// Ré-exports : les 5 noms de données le sont déjà plus haut (phase 1) ;
// ce bloc ajoute les fonctions (phase 2)
export {
  detectStructuralMarkers,
  detectDiscoursePatterns,
  detectRabbis,
  analyzeDiscourseStructure,
  getHighlightedText,
  getFlowDiagram,
  hasTalmudicStructure,
  getPatternSummary,
  getPatternTypes,
  getPatternConfig,
  generateDiscourseFlowVisualization,
  getDiscourseLayerStyles,
  applyLayerColoring,
  segmentIntoSugyaUnits,
  generateTzuratHaDaf,
  generateTzuratHaDafAscii,
  getTzuratHaDafStyles,
  getTzuratHaDafProps,
  renderTzuratHaDafHtml,
  analyzeMishnaStructure,
  generateMishnaSummary,
  extractGemaraQA,
  generateQAFlowDiagram,
  detectSvarot,
  extractHalachicConclusions,
  detectCrossReferences,
  buildArgumentChain
};

export function getComprehensiveSugyaAnalysis(text) {
  if (!text) return null;

  const markers = detectStructuralMarkers(text);
  const mishnaAnalysis = analyzeMishnaStructure(text);
  const mishnaSummary = generateMishnaSummary(text, mishnaAnalysis);
  const qaFlow = extractGemaraQA(text);
  const svarot = detectSvarot(text);
  const halachicConclusions = extractHalachicConclusions(text);
  const crossRefs = detectCrossReferences(text);
  const argumentChain = buildArgumentChain(text);

  const hasMishna = markers.some(m => m.type === 'mishna');
  const hasGemara = markers.some(m => m.type === 'gemara') || markers.some(m => ['question', 'objection', 'resolution'].includes(m.type));
  const hasSages = markers.some(m => m.type === 'sage_statement');

  return {
    hasMishna,
    hasGemara,
    hasSages,
    markers,
    mishnaAnalysis,
    mishnaSummary,
    qaFlow,
    argumentChain,
    svarot,
    halachicConclusions,
    crossRefs,
    statistics: {
      totalMarkers: markers.length,
      mishnaElements: mishnaAnalysis.elements.length,
      qaUnits: qaFlow.flow.length,
      svarotCount: svarot.length,
      conclusionsCount: halachicConclusions.length,
      crossRefCount: Object.values(crossRefs).flat().length,
      argumentDepth: argumentChain.maxDepth,
      resolutionRate: argumentChain.summary.resolutionRate
    }
  };
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

const discoursePatternService = {
  // Type constants
  DISCOURSE_TYPES,
  DISCOURSE_PATTERNS,
  RABBI_PATTERNS,
  TALMUDIC_PATTERNS,
  MISHNA_STRUCTURE_PATTERNS,

  // Core detection
  detectDiscoursePatterns,
  detectStructuralMarkers,
  detectRabbis,

  // Analysis
  analyzeDiscourseStructure,
  getPatternSummary,
  hasTalmudicStructure,

  // PRO SCHOLAR V26 - Mishna & Gemara Analysis
  analyzeMishnaStructure,
  generateMishnaSummary,
  extractGemaraQA,
  generateQAFlowDiagram,

  // PRO SCHOLAR V30 - Enhanced Analysis
  detectSvarot,
  extractHalachicConclusions,
  detectCrossReferences,
  buildArgumentChain,
  getComprehensiveSugyaAnalysis,

  // Visualization
  generateDiscourseFlowVisualization,
  getFlowDiagram,
  getHighlightedText,
  applyLayerColoring,
  getDiscourseLayerStyles,

  // Segmentation
  segmentIntoSugyaUnits,

  // Tzurat HaDaf (Traditional Page Layout)
  generateTzuratHaDaf,
  generateTzuratHaDafAscii,
  getTzuratHaDafStyles,
  getTzuratHaDafProps,
  renderTzuratHaDafHtml,

  // Utilities
  getPatternTypes,
  getPatternConfig
};

export default discoursePatternService;


