// =============================================================================
// DIAGRAM TYPE: SUMMARY - Dynamic content-based summary (NO HARDCODING)
// Analyzes text structure dynamically without predefined topic patterns
// (extrait de talmudDiagramService.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

import { createLogger } from '../../../../utils/debug';
import { getTalmudDaf } from '../../../sefariaApi';
import { detectEntities } from '../../namedEntityService';
import {
  DIAGRAM_TYPES
} from '../../talmudDiagramData';
import { stripNikud, cleanForMermaid } from '../textUtils';
import { summarizeText } from '../summarizer';
import {
  extractFullDiscourse,
  extractDomainsDynamic,
  extractActorsDynamic,
  extractCompoundTerms,
  extractEnumerations,
  extractContrastingPairs,
  extractHalachicCasesDynamic,
  analyzeStructure
} from '../extractors';

const log = createLogger('talmudDiagramService');

// =============================================================================
// DIAGRAM TYPE: SUMMARY - Dynamic content-based summary (NO HARDCODING)
// Analyzes text structure dynamically without predefined topic patterns
// =============================================================================

export async function generateSummaryDiagram(tractate, daf, options = {}) {
  const { direction = 'TB', preloadedText = null } = options;

  // PRO SCHOLAR V11.1: Use preloaded text if available, otherwise fetch
  let dafContent = null;
  let fetchError = null;

  // Use preloaded text if provided (avoids duplicate API calls)
  if (preloadedText && typeof preloadedText === 'string' && preloadedText.trim().length > 0) {
    log.debug(`[Summary:${tractate}.${daf}] Using preloaded text (${preloadedText.length} chars)`);
    dafContent = {
      ref: `${tractate}.${daf}`,
      segments: [{ index: 1, hebrew: preloadedText }]
    };
  } else {
    // Fetch from API
    try {
      dafContent = await getTalmudDaf(tractate, daf);
      log.debug(`[Summary:${tractate}.${daf}] Fetched ${dafContent?.segments?.length || 0} segments`);
    } catch (err) {
      fetchError = err;
      console.warn(`[Summary:${tractate}.${daf}] Primary API failed:`, err.message);

      // Try fallback: fetch with simpler API call (v2 endpoint)
      try {
        const fallbackUrl = process.env.NODE_ENV === 'development'
          ? `/sefaria-api/texts/${tractate}.${daf}?context=0`
          : `https://www.sefaria.org/api/texts/${tractate}.${daf}?context=0`;

        const response = await fetch(fallbackUrl);
        if (response.ok) {
          const data = await response.json();
          // Convert v2 response to our format
          const hebrewTexts = Array.isArray(data.he)
            ? data.he.flat().filter(Boolean)
            : [data.he].filter(Boolean);

          if (hebrewTexts.length > 0) {
            dafContent = {
              ref: data.ref || `${tractate}.${daf}`,
              segments: hebrewTexts.map((text, i) => ({
                index: i + 1,
                hebrew: typeof text === 'string' ? text : ''
              }))
            };
            log.debug(`[Summary:${tractate}.${daf}] Fallback API succeeded: ${hebrewTexts.length} segments`);
          }
        }
      } catch (fallbackErr) {
        console.warn(`[Summary:${tractate}.${daf}] Fallback API also failed:`, fallbackErr.message);
      }
    }
  }

  const lines = [`graph ${direction}`];

  // Enhanced scholarly style definitions
  lines.push('  %% Scholarly Summary Styles');
  lines.push('  classDef daf fill:#1e40af,stroke:#1e3a8a,color:#fff,stroke-width:4px,font-weight:bold');
  lines.push('  classDef klal fill:#7c3aed,stroke:#6d28d9,color:#fff,stroke-width:3px');
  lines.push('  classDef mishna fill:#059669,stroke:#047857,color:#fff,stroke-width:2px');
  lines.push('  classDef gemara fill:#f59e0b,stroke:#d97706,color:#000');
  lines.push('  classDef case fill:#0ea5e9,stroke:#0284c7,color:#fff');
  lines.push('  classDef chiyuv fill:#dc2626,stroke:#b91c1c,color:#fff,stroke-width:2px');
  lines.push('  classDef ptur fill:#16a34a,stroke:#15803d,color:#fff,stroke-width:2px');
  lines.push('  classDef safek fill:#eab308,stroke:#ca8a04,color:#000');
  lines.push('  classDef subject fill:#8b5cf6,stroke:#7c3aed,color:#fff');
  lines.push('  classDef question fill:#f97316,stroke:#ea580c,color:#fff');
  lines.push('  classDef proof fill:#84cc16,stroke:#65a30d,color:#000');
  lines.push('  classDef objection fill:#ef4444,stroke:#dc2626,color:#fff');
  lines.push('  classDef resolution fill:#22c55e,stroke:#16a34a,color:#fff');
  lines.push('  classDef conclusion fill:#a855f7,stroke:#9333ea,color:#fff,stroke-width:2px');
  lines.push('  classDef rabbi fill:#ec4899,stroke:#db2777,color:#fff');
  lines.push('  classDef domain fill:#06b6d4,stroke:#0891b2,color:#fff');
  lines.push('  classDef actor fill:#f472b6,stroke:#ec4899,color:#fff');
  lines.push('  classDef stats fill:#64748b,stroke:#475569,color:#fff');
  lines.push('  classDef errorNode fill:#fca5a5,stroke:#ef4444,color:#7f1d1d,stroke-width:2px');

  // Central daf node
  lines.push(`  daf[["📖 ${tractate} ${daf}"]]`);
  lines.push(`  class daf daf`);

  if (!dafContent?.segments || dafContent.segments.length === 0) {
    // PRO SCHOLAR V11.2: Enhanced error display with known daf info
    const errorMsg = fetchError
      ? cleanForMermaid(fetchError.message, 35)
      : 'חיבור לסוגרים נכשל';

    // Show known info about this tractate even without content
    const tractateInfo = {
      'Shabbat': { topic: 'הלכות שבת', perakim: 24, firstMishna: 'יציאות השבת' },
      'Berakhot': { topic: 'הלכות ברכות', perakim: 9, firstMishna: 'מאימתי קורין' },
      'Pesachim': { topic: 'הלכות פסח', perakim: 10, firstMishna: 'אור לארבעה עשר' },
      'Bava Kamma': { topic: 'נזיקין', perakim: 10, firstMishna: 'ארבע אבות נזיקין' },
      'Sanhedrin': { topic: 'דיני נפשות', perakim: 11, firstMishna: 'דיני ממונות בשלשה' }
    }[tractate];

    lines.push(`  subgraph error["⚠️ שגיאה בטעינה"]`);
    lines.push(`    direction TB`);
    lines.push(`    errMsg["${errorMsg}"]`);
    lines.push(`    class errMsg errorNode`);
    if (tractateInfo) {
      lines.push(`    info["📚 ${tractateInfo.topic}\\n${tractateInfo.perakim} פרקים"]`);
      lines.push(`    class info case`);
    }
    lines.push(`    hint["💡 נסה לרענן או\\nבחר דף אחר"]`);
    lines.push(`    class hint stats`);
    lines.push(`  end`);
    lines.push(`  daf --> error`);

    return {
      mermaid: lines.join('\n'),
      stats: { elements: 0, error: fetchError?.message || 'connection_failed' },
      explanation: `שגיאה בטעינת ${tractate} ${daf}`,
      type: DIAGRAM_TYPES.SUMMARY
    };
  }

  const fullText = dafContent.segments.map(s => s.hebrew || '').join(' ');
  let nodeCount = 0;

  // Debug: Log text length for troubleshooting empty diagrams
  if (process.env.NODE_ENV === 'development') {
    log.debug(`[talmudDiagramService:summary] ${tractate} ${daf} - Text length: ${fullText.length} chars`);
  }

  // Handle empty text case
  if (!fullText || fullText.trim().length < 50) {
    lines.push(`  empty["⚠️ לא נמצא תוכן עברי בדף זה"]`);
    lines.push(`  daf --> empty`);
    return {
      mermaid: lines.join('\n'),
      stats: { elements: 0, textLength: fullText?.length || 0 },
      explanation: `לא נמצא תוכן - ${tractate} ${daf}`,
      type: DIAGRAM_TYPES.SUMMARY
    };
  }

  // ===== SCHOLARLY DYNAMIC ANALYSIS =====
  // NOTE: Using exported cleanForMermaid utility (includes stripNikud for better Hebrew matching)

  // 1. USE namedEntityService for entity detection
  const entities = detectEntities(fullText);

  // 2. Extract compound phrases (צירופים)
  const compoundTerms = extractCompoundTerms(fullText);

  // 3. Find enumeration patterns (שתיים שהן ארבע)
  const enumerations = extractEnumerations(fullText);

  // 4. Extract contrasting pairs (פנים/חוץ)
  const contrastingPairs = extractContrastingPairs(fullText);

  // 5. Extract structural elements
  const structure = analyzeStructure(fullText);

  // 6. Extract actor-action-ruling chains
  const halachicCases = extractHalachicCasesDynamic(fullText);

  // 7. Extract full discourse (questions, proofs, objections, resolutions, conclusions)
  const discourse = extractFullDiscourse(fullText);

  // 8. Extract domains/locations
  const domains = extractDomainsDynamic(fullText);

  // 9. Extract actors
  const actors = extractActorsDynamic(fullText);

  // Track node IDs for connections
  const nodeIds = {};

  // ===== BUILD DIAGRAM (SUGYA FLOW) =====

  // === KLAL (Underlying Principle) ===
  if (enumerations.length > 0) {
    lines.push(`  %% כלל`);
    const klalId = `klal${nodeCount++}`;
    nodeIds.klal = klalId;
    lines.push(`  ${klalId}{{{"📐 ${cleanForMermaid(enumerations[0].text, 28)}"}}}`);
    lines.push(`  class ${klalId} klal`);
    lines.push(`  daf --> ${klalId}`);
  }

  // === MISHNA ===
  if (structure.mishna) {
    lines.push(`  %% משנה`);
    const mishnaId = `m${nodeCount++}`;
    nodeIds.mishna = mishnaId;
    lines.push(`  ${mishnaId}["📜 מתני׳:\\n${cleanForMermaid(structure.mishna, 45)}"]`);
    lines.push(`  class ${mishnaId} mishna`);
    if (nodeIds.klal) {
      lines.push(`  ${nodeIds.klal} --> ${mishnaId}`);
    } else {
      lines.push(`  daf --> ${mishnaId}`);
    }
  }

  // === KEY CONCEPTS (מושגים) ===
  if (compoundTerms.length > 0 || domains.length > 0 || actors.length > 0) {
    lines.push(`  %% מושגים`);
    lines.push(`  subgraph concepts["מושגי יסוד"]`);
    lines.push(`    direction LR`);

    // V3: Pre-clean and filter to avoid fragments
    compoundTerms.slice(0, 3).forEach((term) => {
      const cleanTerm = cleanForMermaid(term.term, 20);
      if (cleanTerm.length < 4) return;  // Compound terms should be at least 4 chars
      const termId = `t${nodeCount++}`;
      lines.push(`    ${termId}["${cleanTerm}"]`);
      lines.push(`    class ${termId} subject`);
    });

    domains.slice(0, 2).forEach((dom) => {
      const cleanDom = cleanForMermaid(dom, 15);
      if (cleanDom.length < 3) return;  // Skip fragments
      const domId = `d${nodeCount++}`;
      lines.push(`    ${domId}["📍 ${cleanDom}"]`);
      lines.push(`    class ${domId} domain`);
    });

    actors.slice(0, 2).forEach((act) => {
      const cleanAct = cleanForMermaid(act, 15);
      if (cleanAct.length < 3) return;  // Skip fragments
      const actId = `a${nodeCount++}`;
      lines.push(`    ${actId}["👤 ${cleanAct}"]`);
      lines.push(`    class ${actId} actor`);
    });

    lines.push(`  end`);
    lines.push(`  daf --> concepts`);
  }

  // Add contrasting pairs (the conceptual structure)
  if (contrastingPairs.length > 0) {
    lines.push(`  %% Contrasting Pairs`);
    lines.push(`  subgraph pairs["זוגות מנוגדים"]`);
    lines.push(`    direction TB`);
    // V3: Pre-clean and validate pairs
    contrastingPairs.slice(0, 3).forEach((pair) => {
      const cleanA = cleanForMermaid(pair.a, 15);
      const cleanB = cleanForMermaid(pair.b, 15);
      // Skip if either side is too short (fragment)
      if (cleanA.length < 3 || cleanB.length < 3) return;

      const pairId1 = `cp${nodeCount++}`;
      const pairId2 = `cp${nodeCount++}`;
      lines.push(`    ${pairId1}["${cleanA}"]`);
      lines.push(`    ${pairId2}["${cleanB}"]`);
      lines.push(`    ${pairId1} --- ${pairId2}`);
      if (pair.type === 'ruling') {
        lines.push(`    class ${pairId1} chiyuv`);
        lines.push(`    class ${pairId2} ptur`);
      } else {
        lines.push(`    class ${pairId1} case`);
        lines.push(`    class ${pairId2} case`);
      }
    });
    lines.push(`  end`);
    lines.push(`  daf --> pairs`);
  }

  // Add halachic cases (actor → action → ruling)
  if (halachicCases.length > 0) {
    lines.push(`  %% Halachic Cases`);
    lines.push(`  subgraph cases["מקרים ודינים"]`);
    lines.push(`    direction TB`);

    // V3: Pre-clean and validate case actors
    halachicCases.slice(0, 8).forEach((c) => {
      const actor = cleanForMermaid(c.actor, 12);
      // Skip if actor is too short (fragment)
      if (actor.length < 2) return;

      const caseId = `case${nodeCount++}`;
      const icon = c.ruling === 'חייב' ? '🔴' :
                   c.ruling === 'פטור' ? '🟢' :
                   c.ruling === 'ספק' ? '🟡' :
                   c.ruling === 'מותר' ? '✅' :
                   c.ruling === 'אסור' ? '🚫' : '⚪';

      const action = c.action ? `\\n${cleanForMermaid(c.action, 15)}` : '';
      const ruling = c.ruling ? `\\n${c.ruling}` : '';

      lines.push(`    ${caseId}["${icon} ${actor}${action}${ruling}"]`);

      if (c.ruling === 'חייב') lines.push(`    class ${caseId} chiyuv`);
      else if (c.ruling === 'פטור') lines.push(`    class ${caseId} ptur`);
      else if (c.ruling === 'ספק' || c.ruling === 'תיקו') lines.push(`    class ${caseId} safek`);
      else lines.push(`    class ${caseId} case`);
    });

    lines.push(`  end`);
    lines.push(`  daf --> cases`);
  }

  // === GEMARA DISCUSSION (שקלא וטריא) ===
  const hasDiscourse = structure.gemara || discourse.questions.length > 0 ||
                       discourse.proofs.length > 0 || discourse.objections.length > 0;

  if (hasDiscourse) {
    lines.push(`  %% שקלא וטריא`);
    lines.push(`  subgraph shakla["שקלא וטריא"]`);
    lines.push(`    direction TB`);

    if (structure.gemara) {
      const gId = `g${nodeCount++}`;
      nodeIds.gemara = gId;
      lines.push(`    ${gId}>"📚 גמ׳: ${cleanForMermaid(structure.gemara, 30)}"]`);
      lines.push(`    class ${gId} gemara`);
    }

    discourse.questions.slice(0, 2).forEach((q, idx) => {
      const qId = `q${nodeCount++}`;
      lines.push(`    ${qId}>"❓ ${cleanForMermaid(q.text, 25)}"]`);
      lines.push(`    class ${qId} question`);
    });

    discourse.proofs.slice(0, 1).forEach((p, idx) => {
      const pId = `prf${nodeCount++}`;
      lines.push(`    ${pId}["📖 ${cleanForMermaid(p.text, 22)}"]`);
      lines.push(`    class ${pId} proof`);
    });

    discourse.objections.slice(0, 1).forEach((o, idx) => {
      const oId = `obj${nodeCount++}`;
      lines.push(`    ${oId}>"⚡ ${cleanForMermaid(o.text, 22)}"]`);
      lines.push(`    class ${oId} objection`);
    });

    discourse.resolutions.slice(0, 1).forEach((r, idx) => {
      const rId = `res${nodeCount++}`;
      lines.push(`    ${rId}["✓ ${cleanForMermaid(r.text, 22)}"]`);
      lines.push(`    class ${rId} resolution`);
    });

    lines.push(`  end`);
    if (nodeIds.mishna) {
      lines.push(`  ${nodeIds.mishna} -.-> shakla`);
    } else {
      lines.push(`  daf --> shakla`);
    }
  }

  // === CONCLUSIONS (מסקנות) ===
  if (discourse.conclusions.length > 0) {
    lines.push(`  %% מסקנות`);
    discourse.conclusions.slice(0, 2).forEach((c, idx) => {
      const cId = `conc${nodeCount++}`;
      lines.push(`  ${cId}[["⭐ ${cleanForMermaid(c.text, 30)}"]]`);
      lines.push(`  class ${cId} conclusion`);
      lines.push(`  daf --> ${cId}`);
    });
  }

  // === SAGES (חכמים) ===
  const uniqueRabbis = [...new Set(entities.rabbis.map(r => r.hebrew))].slice(0, 4);
  if (uniqueRabbis.length > 0) {
    lines.push(`  %% חכמים`);
    lines.push(`  subgraph sages["חכמים"]`);
    lines.push(`    direction LR`);
    uniqueRabbis.forEach((rabbi) => {
      const rId = `r${nodeCount++}`;
      lines.push(`    ${rId}(("${rabbi}"))`);
      lines.push(`    class ${rId} rabbi`);
    });
    lines.push(`  end`);
    lines.push(`  sages -.-> daf`);
  }

  // === TF-IDF KEY TERMS (PRO SCHOLAR Algorithmic Analysis) ===
  const tfidfSummary = summarizeText(fullText);
  const topTerms = tfidfSummary.keyTerms.slice(0, 6);

  if (topTerms.length > 0) {
    lines.push(`  %% מילות מפתח (TF-IDF)`);
    lines.push(`  subgraph tfidf["📊 מילות מפתח"]`);
    lines.push(`    direction LR`);
    // V3: Pre-filter terms and skip fragments after cleaning
    topTerms.forEach((t) => {
      // V3: Clean FIRST, then validate meaningful length
      const cleanTerm = cleanForMermaid(t.term, 15);
      // Skip fragments (< 3 chars) and empty terms
      if (cleanTerm.length < 3) return;

      const tId = `tf${nodeCount++}`;
      const categoryIcon = t.category === 'halachic' ? '⚖️' :
                          t.category === 'sources' ? '📜' :
                          t.category === 'states' ? '🔄' : '🔹';
      lines.push(`    ${tId}["${categoryIcon} ${cleanTerm}\\n(${t.count}×)"]`);
      // Color by score intensity
      if (t.score > 3) lines.push(`    class ${tId} conclusion`);
      else if (t.score > 2) lines.push(`    class ${tId} subject`);
      else lines.push(`    class ${tId} case`);
    });
    lines.push(`  end`);
    lines.push(`  tfidf -.-> daf`);
  }

  // === FALLBACK: Basic word extraction when nothing else found ===
  if (nodeCount === 0) {
    // If no scholarly content was extracted, show basic text analysis
    lines.push(`  %% Fallback: Basic Text Analysis`);

    // Extract most frequent significant Hebrew words (skip common stopwords)
    const stopwords = new Set(['את', 'של', 'על', 'אם', 'כי', 'לא', 'הוא', 'היא', 'הם', 'זה', 'זו', 'מה', 'אשר', 'כל', 'בו', 'לו', 'בה', 'עד', 'גם', 'או', 'יש', 'אין', 'רק', 'אך', 'אלא', 'כמו']);
    const wordCounts = new Map();
    const words = fullText.split(/\s+/).filter(w => w.length >= 3);
    words.forEach(word => {
      const clean = word.replace(/[^\u0590-\u05FF]/g, '');
      if (clean.length >= 3 && !stopwords.has(clean)) {
        wordCounts.set(clean, (wordCounts.get(clean) || 0) + 1);
      }
    });

    // Get top 8 words by frequency
    const topWords = [...wordCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    if (topWords.length > 0) {
      lines.push(`  subgraph words["📝 מילים מרכזיות"]`);
      lines.push(`    direction LR`);
      topWords.forEach(([word, count], idx) => {
        const wId = `w${idx}`;
        lines.push(`    ${wId}["${word} (${count}×)"]`);
        lines.push(`    class ${wId} case`);
        nodeCount++;
      });
      lines.push(`  end`);
      lines.push(`  daf --> words`);
    }
  }

  // === STATS SUMMARY ===
  const chiyuvCount = halachicCases.filter(c => c.ruling === 'חייב').length;
  const pturCount = halachicCases.filter(c => c.ruling === 'פטור').length;

  // Always show stats summary with text statistics
  const statsId = `st${nodeCount++}`;
  const statsParts = [
    chiyuvCount > 0 ? `🔴${chiyuvCount}` : '',
    pturCount > 0 ? `🟢${pturCount}` : '',
    discourse.questions.length > 0 ? `❓${discourse.questions.length}` : '',
    uniqueRabbis.length > 0 ? `👤${uniqueRabbis.length}` : '',
    `📝${tfidfSummary.statistics.uniqueTerms || fullText.split(/\s+/).length}`,
  ].filter(Boolean).join(' ');
  lines.push(`  ${statsId}[/"${statsParts}"/]`);
  lines.push(`  class ${statsId} stats`);
  lines.push(`  daf -.-> ${statsId}`);

  // Build scholarly explanation (V3: clean all terms)
  const explanationParts = [];
  if (enumerations.length > 0) {
    explanationParts.push(cleanForMermaid(enumerations[0].text, 20));
  }
  if (compoundTerms.length > 0) {
    // V3: Clean and filter compound terms for explanation
    const cleanedTerms = compoundTerms.slice(0, 2)
      .map(t => cleanForMermaid(t.term, 15))
      .filter(t => t.length >= 4);  // Skip fragments
    if (cleanedTerms.length > 0) {
      explanationParts.push(cleanedTerms.join(', '));
    }
  }
  if (halachicCases.length > 0 && (chiyuvCount > 0 || pturCount > 0)) {
    explanationParts.push(`${chiyuvCount} חייב, ${pturCount} פטור`);
  }
  if (uniqueRabbis.length > 0) {
    explanationParts.push(`${uniqueRabbis.length} חכמים`);
  }

  return {
    mermaid: lines.join('\n'),
    stats: {
      compoundTerms: compoundTerms.length,
      enumerations: enumerations.length,
      contrastingPairs: contrastingPairs.length,
      halachicCases: halachicCases.length,
      chiyuvCases: chiyuvCount,
      pturCases: pturCount,
      domains: domains.length,
      actors: actors.length,
      rabbis: uniqueRabbis.length,
      questions: discourse.questions.length,
      proofs: discourse.proofs.length,
      objections: discourse.objections.length,
      resolutions: discourse.resolutions.length,
      conclusions: discourse.conclusions.length,
      elements: nodeCount,
      // TF-IDF Statistics
      tfidf: tfidfSummary.statistics
    },
    explanation: explanationParts.join(' • ') || `סיכום ${tractate} ${daf}`,
    type: DIAGRAM_TYPES.SUMMARY,
    extracted: {
      compoundTerms, enumerations, contrastingPairs, halachicCases,
      discourse, domains, actors, entities, structure,
      // TF-IDF Analysis Results
      tfidfKeyTerms: tfidfSummary.keyTerms,
      tfidfKeySegments: tfidfSummary.keySegments,
      tfidfStructure: tfidfSummary.structure
    }
  };
}
