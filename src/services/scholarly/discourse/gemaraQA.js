// discoursePatternService — Extraction Gemara Q/A + diagramme de flux + helpers (split phase 2, 03/10/2026)
import {
  TALMUDIC_PATTERNS
} from './discourseData';
import { stripAllDiacritics, stripAllDiacritics as stripNikudLocal } from '../../../utils/hebrewUtils';
import { analyzeMishnaStructure, generateMishnaSummary } from './mishna';

export function extractGemaraQA(text) {
  if (!text) return { flow: [], summary: { questionsAsked: 0, challengesRaised: 0, proofsOffered: 0, resolved: 0, unresolved: 0 } };

  // PRO SCHOLAR V12: Using centralized stripAllDiacritics
  const cleanText = stripAllDiacritics(text);

  // Detect all discourse patterns
  const patterns = detectStructuralMarkers(cleanText);

  // PRO SCHOLAR V26: Enhanced implicit question patterns for better Q&A detection
  // Includes Shabbat 2a specific patterns and general Talmudic inquiry forms
  const implicitQuestions = [];
  const implicitPatterns = [
    // Basic question forms
    { regex: /מאי\s+[א-ת]{2,}/g, label: 'מאי (שאלה)', type: 'question' },
    { regex: /מהו\s+[א-ת]{2,}/g, label: 'מהו', type: 'question' },
    { regex: /מנא\s+הני\s+מילי/g, label: 'מנא הני מילי', type: 'question' },
    { regex: /מנלן/g, label: 'מנלן', type: 'question' },
    { regex: /היכי\s+דמי/g, label: 'היכי דמי', type: 'question' },
    { regex: /פשיטא/g, label: 'פשיטא (קושיא)', type: 'objection' },
    { regex: /למימרא/g, label: 'למימרא', type: 'question' },
    { regex: /איבעיא\s+להו/g, label: 'איבעיא להו', type: 'disputed' },
    // PRO SCHOLAR V29: כיצד is a Mishna case introduction, not a Gemara question
    { regex: /כיצד/g, label: 'כיצד', type: 'case_structure' },
    { regex: /הא\s+תנן/g, label: 'הא תנן', type: 'question' },
    { regex: /מאי\s+טעמא/g, label: 'מה הטעם?', type: 'question' },
    { regex: /מאי\s+שנא/g, label: 'מה שונה?', type: 'question' },
    { regex: /למה\s+לי/g, label: 'למה לי?', type: 'question' },
    { regex: /לאתויי\s+מאי/g, label: 'לאתויי מאי?', type: 'question' },
    { regex: /אמאי/g, label: 'אמאי?', type: 'question' },
    { regex: /מדוע/g, label: 'מדוע?', type: 'question' },
    // Source-based questions
    { regex: /תנן\s+התם/g, label: 'תנן התם', type: 'source_citation' },
    { regex: /דתנן/g, label: 'דתנן', type: 'source_citation' },
    { regex: /תנו\s+רבנן/g, label: 'תנו רבנן', type: 'source_citation' },
    { regex: /תניא/g, label: 'תניא', type: 'source_citation' },
    // Challenges and objections
    { regex: /והאמר/g, label: 'והאמר', type: 'objection' },
    { regex: /ורמינהו/g, label: 'ורמינהו', type: 'objection' },
    { regex: /מיתיבי/g, label: 'מיתיבי', type: 'objection' },
    { regex: /מתקיף\s+לה/g, label: 'מתקיף', type: 'objection' },
    { regex: /קשיא/g, label: 'קשיא', type: 'objection' },
    // Resolutions - V30: Significantly expanded
    { regex: /לא\s+קשיא/g, label: 'לא קשיא', type: 'resolution' },
    { regex: /הכא\s+במאי\s+עסקינן/g, label: 'הכא במאי עסקינן', type: 'resolution' },
    { regex: /אמר\s+לך/g, label: 'אמר לך', type: 'resolution' },
    { regex: /הכי\s+קאמר/g, label: 'הכי קאמר', type: 'resolution' },
    { regex: /אלא\s+אמר/g, label: 'אלא אמר', type: 'resolution' },
    { regex: /הכי\s+נמי/g, label: 'הכי נמי', type: 'resolution' },
    { regex: /שאני/g, label: 'שאני (חילוק)', type: 'resolution' },
    { regex: /לעולם/g, label: 'לעולם', type: 'resolution' },
    { regex: /כדאמרן/g, label: 'כדאמרן', type: 'resolution' },
    { regex: /לא\s+צריכא/g, label: 'לא צריכא', type: 'resolution' },
    { regex: /דאמר\s+קרא/g, label: 'דאמר קרא', type: 'resolution' },
    { regex: /תנאי\s+היא/g, label: 'תנאי היא', type: 'resolution' },
    { regex: /אין\s+הכי\s+נמי/g, label: 'אין הכי נמי', type: 'resolution' },
    { regex: /הא\s+מני/g, label: 'הא מני', type: 'resolution' },
    { regex: /כגון/g, label: 'כגון', type: 'resolution' },
    // Unresolved markers - V30: Track open questions
    { regex: /תיקו/g, label: 'תיקו', type: 'unresolved' },
    { regex: /צריך\s+עיון/g, label: 'צריך עיון', type: 'unresolved' },
    { regex: /קשיא$/gm, label: 'נשאר בקשיא', type: 'unresolved' },
    // Conclusions
    { regex: /שמע\s+מינה/g, label: 'שמע מינה', type: 'halachic_conclusion' },
    { regex: /מכלל\s+ד/g, label: 'מכלל', type: 'halachic_conclusion' },
    { regex: /הלכתא/g, label: 'הלכתא', type: 'halachic_conclusion' },
    { regex: /אלמא/g, label: 'אלמא', type: 'halachic_conclusion' },
    { regex: /נמצא/g, label: 'נמצא', type: 'halachic_conclusion' }
  ];

  for (const { regex, label, type } of implicitPatterns) {
    let match;
    while ((match = regex.exec(cleanText)) !== null) {
      implicitQuestions.push({
        marker: match[0],
        label,
        type,
        category: type,
        position: match.index
      });
    }
  }

  // Combine and sort all patterns
  const allPatterns = [...patterns, ...implicitQuestions].sort((a, b) => a.position - b.position);

  // Group into Q&A units
  const flow = [];
  let currentUnit = null;

  const questionTypes = ['question', 'disputed'];
  const challengeTypes = ['objection', 'contradiction'];
  const proofTypes = ['proof'];
  const sourceTypes = ['source_citation', 'tannaitic_source'];
  const resolutionTypes = ['resolution', 'halachic_conclusion'];
  const startUnitTypes = ['source_citation', 'tannaitic_source', 'explication'];

  for (const pattern of allPatterns) {
    const patternType = pattern.category || pattern.type;

    // Start new Q&A unit on question
    if (questionTypes.includes(patternType)) {
      if (currentUnit) flow.push(currentUnit);
      currentUnit = {
        type: 'qa_unit',
        question: pattern,
        sources: [],
        challenges: [],
        proofs: [],
        resolution: null,
        speakers: []
      };
    }
    // PRO V25: Start unit on source citation if no unit exists (common in Bavli)
    else if (startUnitTypes.includes(patternType) && !currentUnit) {
      currentUnit = {
        type: 'source_unit',
        question: { marker: pattern.marker, label: pattern.hebrewLabel || pattern.label, type: 'source' },
        sources: [pattern],
        challenges: [],
        proofs: [],
        resolution: null,
        speakers: []
      };
    }
    // Add challenge to current unit or start new unit
    else if (challengeTypes.includes(patternType)) {
      if (!currentUnit) {
        currentUnit = {
          type: 'challenge_unit',
          question: { marker: pattern.marker, label: 'קושיא', type: 'challenge' },
          sources: [],
          challenges: [],
          proofs: [],
          resolution: null,
          speakers: []
        };
      }
      currentUnit.challenges.push(pattern);
    }
    // Add source/proof to current unit
    else if (sourceTypes.includes(patternType) && currentUnit) {
      currentUnit.sources.push(pattern);
    }
    else if (proofTypes.includes(patternType) && currentUnit) {
      currentUnit.proofs.push(pattern);
    }
    // Set resolution
    else if (resolutionTypes.includes(patternType) && currentUnit) {
      currentUnit.resolution = pattern;
      flow.push(currentUnit);
      currentUnit = null;
    }
    // Track speakers
    else if (patternType === 'speaker' && currentUnit) {
      currentUnit.speakers.push(pattern);
    }
  }

  // Push final unit if exists
  if (currentUnit) flow.push(currentUnit);

  // Generate summary
  const summary = {
    totalUnits: flow.length,
    questionsAsked: flow.filter(u => u.type === 'qa_unit').length,
    sourceCitations: flow.filter(u => u.type === 'source_unit').length,
    challengesRaised: flow.reduce((sum, u) => sum + u.challenges.length, 0),
    proofsOffered: flow.reduce((sum, u) => sum + (u.proofs?.length || 0) + (u.sources?.length || 0), 0),
    resolved: flow.filter(u => u.resolution).length,
    unresolved: flow.filter(u => !u.resolution).length
  };

  return { flow, summary };
}

/**
 * PRO SCHOLAR V30: Enhanced visual flow diagram with subgraphs and cross-references
 * Enhanced to include Mishna structure, cross-refs, and sage statements
 * @param {string} text - Gemara text
 * @returns {string} Mermaid diagram code
 */
export function generateQAFlowDiagram(text) {
  const { flow, summary } = extractGemaraQA(text);
  const mishnaAnalysis = analyzeMishnaStructure(text);
  const mishnaSummary = generateMishnaSummary(text, mishnaAnalysis);

  // V28: Also try to generate from structural markers if flow is empty
  if (flow.length === 0 && mishnaAnalysis.elements.length === 0) {
    // Fall back to pattern-based diagram generation
    return generatePatternBasedDiagram(text);
  }

  // V30: Extract cross-references and sages for enhanced diagram
  const crossRefs = extractEnhancedCrossRefs(text);
  const sages = extractSagesFromText(text);

  let mermaid = 'flowchart TD\n';

  // V30: Enhanced styling with better visuals
  mermaid += '  classDef mishna fill:#DBEAFE,stroke:#3B82F6,color:#1E40AF,font-weight:bold,stroke-width:2px\n';
  mermaid += '  classDef question fill:#FEF3C7,stroke:#F59E0B,color:#92400E,stroke-width:2px\n';
  mermaid += '  classDef challenge fill:#FEE2E2,stroke:#EF4444,color:#991B1B,stroke-width:2px\n';
  mermaid += '  classDef proof fill:#D1FAE5,stroke:#10B981,color:#047857,stroke-width:2px\n';
  mermaid += '  classDef resolution fill:#DDD6FE,stroke:#7C3AED,color:#5B21B6,stroke-width:2px\n';
  mermaid += '  classDef liable fill:#FEE2E2,stroke:#DC2626,color:#7F1D1D,stroke-width:2px\n';
  mermaid += '  classDef exempt fill:#D1FAE5,stroke:#10B981,color:#065F46,stroke-width:2px\n';
  mermaid += '  classDef gemara fill:#FEF9C3,stroke:#CA8A04,color:#713F12,stroke-width:2px\n';
  mermaid += '  classDef sage fill:#F3E8FF,stroke:#8B5CF6,color:#6D28D9,stroke-width:2px\n';
  mermaid += '  classDef crossref fill:#E0F2FE,stroke:#0EA5E9,color:#0369A1,stroke-width:1px,stroke-dasharray:3\n';
  mermaid += '  classDef baraita fill:#E0E7FF,stroke:#6366F1,color:#4338CA,stroke-width:2px\n';
  mermaid += '  classDef scripture fill:#CCFBF1,stroke:#14B8A6,color:#0F766E,stroke-width:2px\n';
  mermaid += '  classDef conclusion fill:#FDF4FF,stroke:#D946EF,color:#A21CAF,stroke-width:3px\n\n';

  let nodeIndex = 0;
  let prevNode = null;
  const mishnaNodeIds = [];
  const gemaraNodeIds = [];

  // V30: Create Mishna subgraph if we have content
  const hasMishnaContent = mishnaSummary?.topic || (mishnaSummary?.rulings?.length > 0);
  if (hasMishnaContent) {
    mermaid += '  subgraph MISHNA["📘 משנה"]\n';
    mermaid += '    direction TB\n';

    // Add Mishna topic header if available
    if (mishnaSummary?.topic && mishnaSummary.isKnown) {
      const topicId = `T${nodeIndex++}`;
      const topicText = mishnaSummary.topic.replace(/"/g, "'").substring(0, 22);
      mermaid += `    ${topicId}["${topicText}"]\n`;
      mishnaNodeIds.push(topicId);
      prevNode = topicId;
    }

    // Add Mishna rulings to the diagram
    if (mishnaSummary?.rulings && mishnaSummary.rulings.length > 0) {
      const uniqueRulings = [...new Set(mishnaSummary.rulings.map(r => r.text))].slice(0, 4);
      uniqueRulings.forEach((ruling, i) => {
        const rulingId = `R${nodeIndex++}`;
        const rulingText = ruling.replace(/"/g, "'").substring(0, 18);
        const isLiable = ruling.includes('חייב');
        const icon = isLiable ? '🔴' : '🟢';
        mermaid += `    ${rulingId}["${icon} ${rulingText}"]\n`;
        mishnaNodeIds.push(rulingId);

        if (prevNode) {
          mermaid += `    ${prevNode} --> ${rulingId}\n`;
        }
        prevNode = rulingId;
      });
    }

    mermaid += '  end\n\n';
  }

  // V30: Create Gemara subgraph with Q&A flow
  const hasGemaraContent = flow.length > 0 || sages.length > 0;
  if (hasGemaraContent) {
    mermaid += '  subgraph GEMARA["📜 גמרא"]\n';
    mermaid += '    direction TB\n';

    // Add Gemara header
    const gemaraId = `G${nodeIndex++}`;
    mermaid += `    ${gemaraId}["גמרא"]\n`;
    gemaraNodeIds.push({ id: gemaraId, type: 'gemara' });

    if (prevNode && hasMishnaContent) {
      // Will link after subgraph
    }
    prevNode = gemaraId;

    // V30: Add sage statements as nodes
    const uniqueSages = [...new Set(sages.map(s => s.name))].slice(0, 3);
    uniqueSages.forEach((sageName, i) => {
      const sageId = `S${nodeIndex++}`;
      const sageText = sageName.substring(0, 12).replace(/"/g, "'");
      mermaid += `    ${sageId}["👤 ${sageText}"]\n`;
      gemaraNodeIds.push({ id: sageId, type: 'sage' });
    });

    // Q&A flow
    flow.forEach((unit, i) => {
      const qId = `Q${nodeIndex++}`;
      const qText = (unit.question?.marker?.substring(0, 14) || `שאלה ${i + 1}`).replace(/"/g, "'");
      mermaid += `    ${qId}["❓ ${qText}"]\n`;
      gemaraNodeIds.push({ id: qId, type: 'question' });

      if (prevNode) {
        mermaid += `    ${prevNode} --> ${qId}\n`;
      }

      // Add challenges
      unit.challenges.forEach((c, j) => {
        const cId = `C${nodeIndex++}`;
        const cText = (c.marker?.substring(0, 10) || 'קושיא').replace(/"/g, "'");
        mermaid += `    ${cId}["⚡ ${cText}"]\n`;
        mermaid += `    ${qId} --> ${cId}\n`;
        gemaraNodeIds.push({ id: cId, type: 'challenge' });
      });

      // Add proofs
      unit.proofs.forEach((p, j) => {
        const pId = `P${nodeIndex++}`;
        const pText = (p.marker?.substring(0, 10) || 'ראיה').replace(/"/g, "'");
        mermaid += `    ${pId}["✅ ${pText}"]\n`;
        mermaid += `    ${qId} --> ${pId}\n`;
        gemaraNodeIds.push({ id: pId, type: 'proof' });
      });

      // Add resolution with thick arrow
      if (unit.resolution) {
        const rId = `RS${nodeIndex++}`;
        const rText = (unit.resolution.marker?.substring(0, 10) || 'תירוץ').replace(/"/g, "'");
        mermaid += `    ${rId}["🎯 ${rText}"]\n`;
        mermaid += `    ${qId} ==> ${rId}\n`;
        gemaraNodeIds.push({ id: rId, type: 'resolution' });
        prevNode = rId;
      } else {
        prevNode = qId;
      }
    });

    mermaid += '  end\n\n';
  }

  // V30: Add cross-references subgraph if present
  if (crossRefs.length > 0) {
    mermaid += '  subgraph REFS["🔗 הפניות"]\n';
    mermaid += '    direction LR\n';

    const refNodeIds = [];
    crossRefs.slice(0, 4).forEach((ref, i) => {
      const refId = `XR${nodeIndex++}`;
      const refText = (ref.text || ref.tractate || 'מקור').substring(0, 12).replace(/"/g, "'");
      const icon = ref.icon || '📚';
      mermaid += `    ${refId}["${icon} ${refText}"]\n`;
      refNodeIds.push(refId);
    });

    mermaid += '  end\n\n';

    // Link refs to main content with dashed lines
    if (mishnaNodeIds.length > 0 && refNodeIds.length > 0) {
      mermaid += `  ${mishnaNodeIds[0]} -.- ${refNodeIds[0]}\n`;
    }

    // Apply crossref class
    if (refNodeIds.length > 0) {
      mermaid += `  class ${refNodeIds.join(',')} crossref\n`;
    }
  }

  // Apply classes to nodes
  if (mishnaNodeIds.length > 0) {
    mermaid += `  class ${mishnaNodeIds.join(',')} mishna\n`;
  }
  gemaraNodeIds.forEach(n => {
    mermaid += `  class ${n.id} ${n.type}\n`;
  });

  // Link Mishna to Gemara subgraphs
  if (hasMishnaContent && hasGemaraContent && mishnaNodeIds.length > 0 && gemaraNodeIds.length > 0) {
    mermaid += `  ${mishnaNodeIds[mishnaNodeIds.length - 1]} --> ${gemaraNodeIds[0].id}\n`;
  }

  // Add unresolved indicator
  if (summary.unresolved > 0) {
    const unresolvedId = `U${nodeIndex++}`;
    mermaid += `  ${unresolvedId}["⏳ ${summary.unresolved} פתוחות"]\n`;
    mermaid += `  class ${unresolvedId} question\n`;
    if (prevNode) {
      mermaid += `  ${prevNode} -.-> ${unresolvedId}\n`;
    }
  }

  // V30: Add conclusion node if there are resolutions
  if (summary.resolutions > 0) {
    const conclusionId = `CON${nodeIndex++}`;
    mermaid += `  ${conclusionId}(["🎯 מסקנה"])\n`;
    mermaid += `  class ${conclusionId} conclusion\n`;
    if (prevNode) {
      mermaid += `  ${prevNode} ==> ${conclusionId}\n`;
    }
  }

  return mermaid;
}

/**
 * V30: Extract cross-references for diagram
 * @param {string} text - Source text
 * @returns {Array} Array of cross-reference objects
 */
function extractEnhancedCrossRefs(text) {
  if (!text) return [];

  const cleanText = stripNikudLocal(text);
  const refs = [];

  // Parallel Mishna pattern
  const mishnaPattern = /תנן\s+התם\s*([\u0590-\u05FF\s]{3,30})/g;
  let match;
  while ((match = mishnaPattern.exec(cleanText)) !== null) {
    refs.push({ type: 'mishna', text: match[1]?.trim(), icon: '📘' });
  }

  // Baraita pattern
  const baraitaPattern = /(?:תניא|תנו\s*רבנן)\s*([\u0590-\u05FF\s]{3,30})/g;
  while ((match = baraitaPattern.exec(cleanText)) !== null) {
    refs.push({ type: 'baraita', text: match[1]?.trim(), icon: '📋' });
  }

  // Scripture pattern
  const scripturePattern = /(?:דכתיב|שנאמר)\s*([\u0590-\u05FF\s]{3,30})/g;
  while ((match = scripturePattern.exec(cleanText)) !== null) {
    refs.push({ type: 'scripture', text: match[1]?.trim(), icon: '📖' });
  }

  // Tractate references
  const tractatePattern = /במסכת\s+(\S+)|כדאמרינן\s+ב(\S+)/g;
  while ((match = tractatePattern.exec(cleanText)) !== null) {
    const tractate = match[1] || match[2];
    if (tractate) {
      refs.push({ type: 'tractate', tractate: tractate.trim(), text: tractate, icon: '📚' });
    }
  }

  return refs.slice(0, 6);
}

/**
 * V30: Extract sage names from text
 * @param {string} text - Source text
 * @returns {Array} Array of sage objects
 */
function extractSagesFromText(text) {
  if (!text) return [];

  const cleanText = stripNikudLocal(text);
  const sages = [];
  const seenNames = new Set();

  // Sage statement patterns
  const patterns = [
    /אמר\s+(רב[יא]?\s*\S{2,10})/g,
    /אמר\s+(ר['׳]\s*\S{2,10})/g,
    /א"ר\s*(\S{2,10})/g
  ];

  patterns.forEach(pattern => {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(cleanText)) !== null) {
      const name = match[1]?.trim();
      if (name && name.length >= 2 && !seenNames.has(name)) {
        seenNames.add(name);
        sages.push({ name, position: match.index });
      }
    }
  });

  return sages.slice(0, 5);
}

/**
 * V28: Generate a Mermaid diagram from structural markers
 * Fallback for when Q&A flow extraction doesn't find structured units
 */
function generatePatternBasedDiagram(text) {
  const markers = detectStructuralMarkers(text);
  if (!markers || markers.length === 0) return null;

  let mermaid = 'flowchart TD\n';
  mermaid += '  classDef mishna fill:#DBEAFE,stroke:#3B82F6\n';
  mermaid += '  classDef gemara fill:#FEF3C7,stroke:#D97706\n';
  mermaid += '  classDef question fill:#FEF3C7,stroke:#F59E0B\n';
  mermaid += '  classDef objection fill:#FEE2E2,stroke:#EF4444\n';
  mermaid += '  classDef proof fill:#D1FAE5,stroke:#10B981\n';
  mermaid += '  classDef resolution fill:#DDD6FE,stroke:#7C3AED\n';
  mermaid += '  classDef legal fill:#FEE2E2,stroke:#DC2626\n';
  mermaid += '  classDef sage fill:#F3E8FF,stroke:#8B5CF6\n';
  mermaid += '  classDef baraita fill:#E0E7FF,stroke:#6366F1\n';
  mermaid += '  classDef scripture fill:#CCFBF1,stroke:#14B8A6\n\n';

  // Build nodes
  let prevId = null;
  markers.forEach((m, i) => {
    const nodeId = `N${i}`;
    const nodeText = m.marker?.substring(0, 15)?.replace(/"/g, "'") || m.type;
    const icon = TALMUDIC_PATTERNS[m.type]?.icon || '📝';
    const cssClass = getCssClassForType(m.type);

    mermaid += `  ${nodeId}["${icon} ${nodeText}"]:::${cssClass}\n`;

    // Link to previous node
    if (prevId !== null) {
      // Use different arrow styles based on relationship
      const arrowStyle = getArrowStyle(markers[i - 1]?.type, m.type);
      mermaid += `  ${prevId} ${arrowStyle} ${nodeId}\n`;
    }
    prevId = nodeId;
  });

  return mermaid;
}

/**
 * V28: Get CSS class for pattern type
 */
function getCssClassForType(type) {
  const typeMap = {
    mishna: 'mishna',
    gemara: 'gemara',
    question: 'question',
    objection: 'objection',
    proof: 'proof',
    resolution: 'resolution',
    legal_ruling: 'legal',
    sage_statement: 'sage',
    baraita: 'baraita',
    scripture: 'scripture',
    alternative: 'question'
  };
  return typeMap[type] || 'question';
}

/**
 * V28: Get arrow style based on pattern relationship
 */
function getArrowStyle(prevType, currentType) {
  // Question to resolution: thick arrow
  if (prevType === 'question' && currentType === 'resolution') {
    return '==>';
  }
  // Objection to resolution: thick arrow
  if (prevType === 'objection' && currentType === 'resolution') {
    return '==>';
  }
  // Normal flow
  return '-->';
}

// =============================================================================
// PRO SCHOLAR V30: SVARA (LOGIC) DETECTION
// Detects underlying logical principles and hermeneutic rules
// =============================================================================

/**
 * PRO SCHOLAR V30: Detect Svara (logical reasoning) patterns in Talmudic text
 * Identifies hermeneutic rules, logical principles, and reasoning patterns
 * @param {string} text - Hebrew/Aramaic text to analyze
 * @returns {Array} Array of detected svara patterns with type and context
 */
