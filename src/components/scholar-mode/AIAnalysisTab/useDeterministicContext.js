/**
 * useDeterministicContext - Bridge hook between deterministic analysis and AI
 *
 * V34: Enriched with deeper services:
 * - Structural markers (mishna, gemara, question, proof, resolution...)
 * - Q&A flow (questions asked, resolved vs open)
 * - Svarot / hermeneutical rules detected
 * - Halachic conclusions extracted
 * - Abbreviations found
 * - Rabbis/sages detected
 * - Cross-references to other sugyot
 *
 * This gives the AI grounded, factual data to work with.
 */
import { useMemo } from 'react';
import {
  detectStructuralMarkers,
  extractGemaraQA,
  detectSvarot,
  extractHalachicConclusions,
  detectCrossReferences
} from '../../../services/scholarly/discoursePatternService';
import { findAbbreviations } from '../../../services/textual/talmudicAbbreviationsService';
import { detectRabbis } from '../../../services/scholarly/namedEntityService';

/**
 * Run all deterministic analysis on the given text.
 * Returns raw results + a formatted context string for AI prompts.
 */
export default function useDeterministicContext(text, textType) {
  return useMemo(() => {
    const empty = {
      markers: [], qaFlow: null, abbreviations: [], rabbis: [],
      svarot: [], halachicConclusions: [], crossRefs: null,
      contextString: '', stats: {
        markerCount: 0, questionCount: 0, resolvedCount: 0,
        rabbiCount: 0, abbreviationCount: 0, svaraCount: 0, conclusionCount: 0
      }
    };

    if (!text || text.length < 10) return empty;

    const isTalmud = textType === 'talmud' || textType === 'gemara' ||
                     textType === 'mishna' || textType === 'mishnah';

    // --- Run deterministic services (all silent on error) ---
    let markers = [];
    let qaFlow = null;
    let abbreviations = [];
    let rabbis = [];
    let svarot = [];
    let halachicConclusions = [];
    let crossRefs = null;

    try { markers = detectStructuralMarkers(text) || []; } catch (e) { /* silent */ }
    try { rabbis = detectRabbis(text) || []; } catch (e) { /* silent */ }

    if (isTalmud) {
      try { qaFlow = extractGemaraQA(text) || null; } catch (e) { /* silent */ }
      try { abbreviations = findAbbreviations(text) || []; } catch (e) { /* silent */ }
      try { svarot = detectSvarot(text) || []; } catch (e) { /* silent */ }
      try { halachicConclusions = extractHalachicConclusions(text) || []; } catch (e) { /* silent */ }
      try { crossRefs = detectCrossReferences(text) || null; } catch (e) { /* silent */ }
    }

    // --- Build context string for AI prompts ---
    const lines = [];

    // Structural markers summary
    if (markers.length > 0) {
      const typeCounts = {};
      markers.forEach(m => {
        typeCounts[m.hebrewLabel || m.label] = (typeCounts[m.hebrewLabel || m.label] || 0) + 1;
      });
      const parts = Object.entries(typeCounts).map(([label, count]) => `${label}(${count})`);
      lines.push(`[מבנה: ${parts.join(', ')}]`);
    }

    // Q&A flow summary
    if (qaFlow?.summary) {
      const s = qaFlow.summary;
      const qaParts = [];
      if (s.questionsAsked) qaParts.push(`${s.questionsAsked} שאלות`);
      if (s.resolved) qaParts.push(`${s.resolved} נפתרו`);
      if (s.unresolved) qaParts.push(`${s.unresolved} פתוחות`);
      if (s.challengesRaised) qaParts.push(`${s.challengesRaised} קושיות`);
      if (s.proofsOffered) qaParts.push(`${s.proofsOffered} ראיות`);
      if (qaParts.length > 0) {
        lines.push(`[שקו"ט: ${qaParts.join(', ')}]`);
      }
    }

    // Key questions detected
    if (qaFlow?.flow?.length > 0) {
      const questions = qaFlow.flow
        .filter(u => u.question)
        .slice(0, 5)
        .map(u => u.question.marker || u.question.label);
      if (questions.length > 0) {
        lines.push(`[שאלות שזוהו: ${questions.join(' | ')}]`);
      }
    }

    // Svarot / hermeneutical rules
    if (svarot.length > 0) {
      const svaraLabels = [...new Set(svarot.map(s => s.label))].slice(0, 6);
      lines.push(`[סברות/מידות: ${svaraLabels.join(', ')}]`);
    }

    // Halachic conclusions
    if (halachicConclusions.length > 0) {
      const rulings = halachicConclusions.slice(0, 4).map(c => c.extracted || c.fullText);
      lines.push(`[מסקנות הלכתיות: ${rulings.join(' | ')}]`);
    }

    // Cross-references
    if (crossRefs) {
      const totalRefs = Object.values(crossRefs).reduce((sum, arr) => sum + (arr?.length || 0), 0);
      if (totalRefs > 0) {
        const refParts = [];
        if (crossRefs.scripture?.length) refParts.push(`${crossRefs.scripture.length} פסוקים`);
        if (crossRefs.baraita?.length) refParts.push(`${crossRefs.baraita.length} ברייתות`);
        if (crossRefs.parallel_sugya?.length) refParts.push(`${crossRefs.parallel_sugya.length} סוגיות מקבילות`);
        if (refParts.length > 0) {
          lines.push(`[הפניות: ${refParts.join(', ')}]`);
        }
      }
    }

    // Sages detected
    if (rabbis.length > 0) {
      const uniqueNames = [...new Set(rabbis.map(r => r.hebrew || r.name))].slice(0, 8);
      const tannaCount = rabbis.filter(r => r.period === 'tanna').length;
      const amoraCount = rabbis.filter(r => r.period === 'amora').length;
      let sageInfo = uniqueNames.join(', ');
      if (tannaCount > 0 || amoraCount > 0) {
        const periods = [];
        if (tannaCount > 0) periods.push(`${tannaCount} תנאים`);
        if (amoraCount > 0) periods.push(`${amoraCount} אמוראים`);
        sageInfo += ` (${periods.join(', ')})`;
      }
      lines.push(`[חכמים: ${sageInfo}]`);
    }

    // Abbreviations summary
    if (abbreviations.length > 0) {
      const abbrevSample = abbreviations
        .slice(0, 5)
        .map(a => `${a.abbreviation}=${a.expansion}`);
      lines.push(`[ר"ת: ${abbrevSample.join(', ')}${abbreviations.length > 5 ? '...' : ''}]`);
    }

    const contextString = lines.length > 0
      ? `\n\nPre-analysis context (deterministic pattern detection):\n${lines.join('\n')}`
      : '';

    return {
      markers,
      qaFlow,
      abbreviations,
      rabbis,
      svarot,
      halachicConclusions,
      crossRefs,
      contextString,
      stats: {
        markerCount: markers.length,
        questionCount: qaFlow?.summary?.questionsAsked || 0,
        resolvedCount: qaFlow?.summary?.resolved || 0,
        rabbiCount: rabbis.length,
        abbreviationCount: abbreviations.length,
        svaraCount: svarot.length,
        conclusionCount: halachicConclusions.length
      }
    };
  }, [text, textType]);
}
