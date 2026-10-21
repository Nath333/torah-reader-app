// =============================================================================
// DIAGRAM TYPE: SUGYA FLOW - Argument Structure - PRO SCHOLAR V13 Enhanced
// (extrait de talmudDiagramService.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

import { getTalmudDaf } from '../../../sefariaApi';
import { DISCOURSE_PATTERNS } from '../../discoursePatternService';
import {
  DIAGRAM_TYPES,
  ENHANCED_DISCOURSE_MARKERS
} from '../../talmudDiagramData';
import { safeExecute } from '../textUtils';
import {
  detectDiscoursePatterns
} from '../extractors';

// =============================================================================
// DIAGRAM TYPE: SUGYA FLOW - Argument Structure - PRO SCHOLAR V13 Enhanced
// =============================================================================


export async function generateSugyaFlowDiagram(tractate, daf, options = {}) {
  const { direction = 'TB' } = options;

  const dafContent = await safeExecute(
    () => getTalmudDaf(tractate, daf),
    null,
    'sugyaFlow:getTalmudDaf'
  );

  if (!dafContent?.segments) {
    return {
      mermaid: `graph ${direction}\n  A["📖 ${tractate} ${daf}"]\n  B["טען דף כדי לראות מהלך"]`,
      stats: { patterns: 0, questions: 0, objections: 0, resolutions: 0 },
      explanation: `מהלך הסוגיא: ${tractate} ${daf} (אין תוכן)`,
      type: DIAGRAM_TYPES.SUGYA_FLOW
    };
  }

  // Detect discourse patterns using enhanced markers
  const fullText = dafContent.segments.map(s => s.hebrew).join(' ');
  const detectedPatterns = [];

  // Apply all enhanced patterns
  ENHANCED_DISCOURSE_MARKERS.forEach(({ pattern, type, label, icon, category }) => {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(fullText)) !== null) {
      detectedPatterns.push({
        type,
        label,
        icon,
        category,
        position: match.index,
        text: match[0]
      });
    }
  });

  // Also use existing discourse pattern service
  const servicePatterns = detectDiscoursePatterns(fullText);
  servicePatterns.forEach(p => {
    const patternInfo = DISCOURSE_PATTERNS[p.type] || {};
    detectedPatterns.push({
      type: p.type,
      label: patternInfo.label || p.type,
      icon: patternInfo.icon || '📝',
      category: patternInfo.type || 'other',
      position: p.position || 0,
      text: p.marker
    });
  });

  // Sort by position and deduplicate
  detectedPatterns.sort((a, b) => a.position - b.position);

  // Remove duplicates (same position within 10 chars)
  const uniquePatterns = [];
  let lastPosition = -100;
  detectedPatterns.forEach(p => {
    if (p.position - lastPosition > 10) {
      uniquePatterns.push(p);
      lastPosition = p.position;
    }
  });

  const lines = [`graph ${direction}`];

  // Enhanced style definitions with better colors
  lines.push('  %% PRO SCHOLAR V13 Discourse Styles');
  lines.push('  classDef source fill:#3B82F6,stroke:#1E40AF,color:#fff,stroke-width:2px');
  lines.push('  classDef question fill:#F59E0B,stroke:#B45309,color:#000,stroke-width:2px');
  lines.push('  classDef objection fill:#DC2626,stroke:#991B1B,color:#fff,stroke-width:2px');
  lines.push('  classDef proof fill:#10B981,stroke:#047857,color:#fff,stroke-width:2px');
  lines.push('  classDef resolution fill:#7C3AED,stroke:#5B21B6,color:#fff,stroke-width:2px');
  lines.push('  classDef conclusion fill:#0891B2,stroke:#0E7490,color:#fff,stroke-width:2px');
  lines.push('  classDef other fill:#6B7280,stroke:#4B5563,color:#fff');

  // Stats tracking
  const stats = {
    patterns: uniquePatterns.length,
    questions: 0,
    objections: 0,
    proofs: 0,
    resolutions: 0,
    conclusions: 0
  };

  // Build flow with step numbers
  let prevNodeId = null;
  uniquePatterns.forEach((pattern, index) => {
    const nodeId = `p${index}`;
    const stepNum = index + 1;

    // Create node with step number
    lines.push(`  ${nodeId}["${stepNum}. ${pattern.icon} ${pattern.label}"]`);

    // Apply style class based on category
    lines.push(`  class ${nodeId} ${pattern.category}`);

    // Track stats
    if (pattern.category === 'question') stats.questions++;
    else if (pattern.category === 'objection') stats.objections++;
    else if (pattern.category === 'proof') stats.proofs++;
    else if (pattern.category === 'resolution') stats.resolutions++;
    else if (pattern.category === 'conclusion') stats.conclusions++;

    // Connect to previous with appropriate arrow style
    if (prevNodeId) {
      // Use different arrow styles based on relationship
      if (pattern.category === 'objection') {
        lines.push(`  ${prevNodeId} -.->|קושיא| ${nodeId}`);
      } else if (pattern.category === 'resolution') {
        lines.push(`  ${prevNodeId} ==>|תירוץ| ${nodeId}`);
      } else if (pattern.category === 'conclusion') {
        lines.push(`  ${prevNodeId} -->|מסקנה| ${nodeId}`);
      } else {
        lines.push(`  ${prevNodeId} --> ${nodeId}`);
      }
    }
    prevNodeId = nodeId;
  });

  // PRO SCHOLAR V26: Enhanced empty case handling with Mishna structure fallback
  if (uniquePatterns.length === 0) {
    lines.push(`  start["📖 ${tractate} ${daf}"]`);
    lines.push(`  class start source`);

    // Try to generate content from Mishna structure analysis
    const { analyzeMishnaStructure, generateMishnaSummary } = await import('../../discoursePatternService');
    const mishnaAnalysis = analyzeMishnaStructure(fullText);
    const mishnaSummary = generateMishnaSummary(fullText, mishnaAnalysis);

    if (mishnaAnalysis.elements.length > 0 || mishnaSummary.rulings?.length > 0) {
      // Show Mishna structure elements as diagram
      let nodeIndex = 0;

      // Add topic node
      if (mishnaSummary.topic) {
        lines.push(`  topic["📚 ${mishnaSummary.topic}"]`);
        lines.push(`  class topic source`);
        lines.push(`  start --> topic`);
        nodeIndex++;
      }

      // Add ruling nodes
      if (mishnaSummary.rulings && mishnaSummary.rulings.length > 0) {
        const uniqueRulings = [...new Set(mishnaSummary.rulings.map(r => r.text))].slice(0, 6);
        uniqueRulings.forEach((ruling, i) => {
          const cleanRuling = ruling.replace(/["\[\]{}]/g, '').substring(0, 30);
          const isLiable = ruling.includes('חייב');
          const icon = isLiable ? '🔴' : '🟢';
          const styleClass = isLiable ? 'objection' : 'resolution';
          lines.push(`  r${i}["${icon} ${cleanRuling}"]`);
          lines.push(`  class r${i} ${styleClass}`);
          if (nodeIndex === 0) {
            lines.push(`  start --> r${i}`);
          } else if (i === 0 && mishnaSummary.topic) {
            lines.push(`  topic --> r${i}`);
          } else if (i > 0) {
            lines.push(`  r${i-1} --> r${i}`);
          }
        });
      }

      // Add structure element summary
      if (mishnaAnalysis.summary.breakdown) {
        const breakdown = mishnaAnalysis.summary.breakdown;
        const summaryParts = [];
        if (breakdown.enumeration) summaryParts.push(`${breakdown.enumeration} מניינים`);
        if (breakdown.condition) summaryParts.push(`${breakdown.condition} תנאים`);
        if (breakdown.ruling) summaryParts.push(`${breakdown.ruling} פסקים`);
        if (summaryParts.length > 0) {
          lines.push(`  summary["📊 ${summaryParts.join(' • ')}"]`);
          lines.push(`  class summary conclusion`);
        }
      }

      stats.patterns = mishnaAnalysis.elements.length;
    } else {
      // Fallback message when truly no content
      lines.push(`  note["🔍 טען את הטקסט המלא לניתוח"]`);
      lines.push(`  start --> note`);
    }
  }

  // Build explanation in Hebrew
  const explanationParts = [`${uniquePatterns.length} שלבים`];
  if (stats.questions > 0) explanationParts.push(`${stats.questions} שאלות`);
  if (stats.objections > 0) explanationParts.push(`${stats.objections} קושיות`);
  if (stats.resolutions > 0) explanationParts.push(`${stats.resolutions} תירוצים`);

  return {
    mermaid: lines.join('\n'),
    stats,
    explanation: `מהלך הסוגיא: ${explanationParts.join(' • ')}`,
    type: DIAGRAM_TYPES.SUGYA_FLOW,
    patterns: uniquePatterns
  };
}
