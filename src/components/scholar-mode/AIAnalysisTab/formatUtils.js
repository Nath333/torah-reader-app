/**
 * Format utilities for AI Analysis exports
 */
import { ALL_MODES } from './ModeGrid';

/**
 * Format AI result as plain text for export/clipboard
 */
export const formatResultAsText = (result, mode, reference) => {
  if (!result) return '';

  const modeInfo = ALL_MODES.find(m => m.id === mode) || { label: mode };
  const modeName = modeInfo.label || modeInfo.name || mode;
  const lines = [];

  lines.push(`═══════════════════════════════════════`);
  lines.push(`📖 ${modeName} Analysis`);
  lines.push(`📍 Reference: ${reference || 'N/A'}`);
  lines.push(`📅 Date: ${new Date().toLocaleDateString()}`);
  lines.push(`═══════════════════════════════════════`);
  lines.push('');

  if (result.summary) {
    lines.push('📋 SUMMARY');
    lines.push('─────────────────────────────────────');
    lines.push(result.summary);
    lines.push('');
  }

  if (result.oneLineSummary) {
    lines.push('💡 KEY INSIGHT');
    lines.push('─────────────────────────────────────');
    lines.push(result.oneLineSummary);
    lines.push('');
  }

  if (result.keyPoints?.length) {
    lines.push('📝 KEY POINTS');
    lines.push('─────────────────────────────────────');
    result.keyPoints.forEach((point, i) => {
      lines.push(`${i + 1}. ${point}`);
    });
    lines.push('');
  }

  // PaRDeS levels
  if (result.pshat) {
    lines.push('📖 פשט (PSHAT) - Plain Meaning');
    lines.push('─────────────────────────────────────');
    lines.push(result.pshat);
    lines.push('');
  }
  if (result.remez) {
    lines.push('🔮 רמז (REMEZ) - Hints');
    lines.push('─────────────────────────────────────');
    lines.push(result.remez);
    lines.push('');
  }
  if (result.drash) {
    lines.push('📚 דרש (DRASH) - Homiletical');
    lines.push('─────────────────────────────────────');
    lines.push(result.drash);
    lines.push('');
  }
  if (result.sod) {
    lines.push('✨ סוד (SOD) - Mystical');
    lines.push('─────────────────────────────────────');
    lines.push(result.sod);
    lines.push('');
  }

  if (result.ethicalTeachings?.length) {
    lines.push('💎 ETHICAL TEACHINGS');
    lines.push('─────────────────────────────────────');
    result.ethicalTeachings.forEach(teaching => {
      lines.push(`• ${teaching.middah || teaching.virtue}: ${teaching.explanation}`);
    });
    lines.push('');
  }

  if (result.questions?.length) {
    lines.push('❓ CHAVRUTA QUESTIONS');
    lines.push('─────────────────────────────────────');
    result.questions.forEach((q, i) => {
      lines.push(`${i + 1}. ${q.question || q}`);
    });
    lines.push('');
  }

  if (result.terms?.length) {
    lines.push('🔤 KEY TERMS');
    lines.push('─────────────────────────────────────');
    result.terms.forEach(term => {
      lines.push(`• ${term.hebrew || term.term}: ${term.meaning || term.definition}`);
    });
    lines.push('');
  }

  if (result.crossReferences?.length) {
    lines.push('🔗 CROSS-REFERENCES');
    lines.push('─────────────────────────────────────');
    result.crossReferences.forEach(ref => {
      lines.push(`• ${ref.reference || ref.source}: ${ref.connection}`);
    });
    lines.push('');
  }

  if (result.practicalLesson) {
    lines.push('🎯 PRACTICAL LESSON');
    lines.push('─────────────────────────────────────');
    lines.push(result.practicalLesson);
    lines.push('');
  }

  // Sugya Flow (Talmudic discourse)
  if (result.sugyaOverview) {
    lines.push('🌊 SUGYA OVERVIEW');
    lines.push('─────────────────────────────────────');
    lines.push(`Type: ${result.sugyaOverview.type || 'N/A'}`);
    lines.push(`Topic: ${result.sugyaOverview.mainTopic}`);
    if (result.sugyaOverview.complexity) {
      lines.push(`Complexity: ${result.sugyaOverview.complexity}`);
    }
    lines.push('');
  }

  if (result.structuralAnalysis?.mishnaContent) {
    lines.push('📜 MISHNA');
    lines.push('─────────────────────────────────────');
    lines.push(result.structuralAnalysis.mishnaContent);
    lines.push('');
  }

  if (result.discourseFlow?.length) {
    lines.push('📊 DISCOURSE FLOW');
    lines.push('─────────────────────────────────────');
    result.discourseFlow.forEach((step, i) => {
      lines.push(`${i + 1}. [${step.type || 'Step'}] ${step.summary}`);
      if (step.speaker) lines.push(`   Speaker: ${step.speaker}`);
    });
    lines.push('');
  }

  // Shakla VeTarya (Dialectic)
  if (result.dialecticOverview) {
    lines.push('⚔️ SHAKLA VETARYA');
    lines.push('─────────────────────────────────────');
    lines.push(`Question: ${result.dialecticOverview.mainQuestion}`);
    lines.push(`Exchanges: ${result.dialecticOverview.numberOfExchanges || 'N/A'}`);
    if (result.dialecticOverview.finalOutcome) {
      lines.push(`Resolution: ${result.dialecticOverview.finalOutcome}`);
    }
    lines.push('');
  }

  if (result.exchanges?.length) {
    lines.push('💬 EXCHANGES');
    lines.push('─────────────────────────────────────');
    result.exchanges.forEach((ex, i) => {
      lines.push(`Exchange ${i + 1}:`);
      if (ex.challenge) {
        lines.push(`  קושיא: ${ex.challenge.content}`);
      }
      if (ex.response) {
        lines.push(`  תירוץ: ${ex.response.content}`);
      }
      if (ex.outcome) {
        lines.push(`  Outcome: ${ex.outcome}`);
      }
      lines.push('');
    });
  }

  if (result.methodology?.length) {
    lines.push('🔧 TALMUDIC METHODS');
    lines.push('─────────────────────────────────────');
    lines.push(result.methodology.join(', '));
    lines.push('');
  }

  // Sugya Summary
  if (result.background) {
    lines.push('📚 BACKGROUND');
    lines.push('─────────────────────────────────────');
    lines.push(result.background);
    lines.push('');
  }

  if (result.structure) {
    lines.push('🏗️ STRUCTURE');
    lines.push('─────────────────────────────────────');
    if (result.structure.mishna) lines.push(`Mishna: ${result.structure.mishna}`);
    if (result.structure.gemara) lines.push(`Gemara: ${result.structure.gemara}`);
    lines.push('');
  }

  if (result.keyQuestion) {
    lines.push('❓ KEY QUESTION');
    lines.push('─────────────────────────────────────');
    lines.push(result.keyQuestion);
    lines.push('');
  }

  if (result.mainPositions?.length) {
    lines.push('⚖️ MAIN POSITIONS');
    lines.push('─────────────────────────────────────');
    result.mainPositions.forEach((pos, i) => {
      lines.push(`${i + 1}. ${pos.holder}: ${pos.position}`);
      if (pos.reasoning) lines.push(`   Reasoning: ${pos.reasoning}`);
    });
    lines.push('');
  }

  if (result.resolution) {
    lines.push('✓ RESOLUTION');
    lines.push('─────────────────────────────────────');
    lines.push(result.resolution);
    lines.push('');
  }

  if (result.bottomLine) {
    lines.push('🎯 BOTTOM LINE');
    lines.push('─────────────────────────────────────');
    lines.push(result.bottomLine);
    lines.push('');
  }

  if (result.halachicImplications) {
    lines.push('⚖️ HALACHIC IMPLICATIONS');
    lines.push('─────────────────────────────────────');
    if (result.halachicImplications.mainRuling) {
      lines.push(`Main Ruling: ${result.halachicImplications.mainRuling}`);
    }
    if (result.halachicImplications.practicalApplication) {
      lines.push(`Application: ${result.halachicImplications.practicalApplication}`);
    }
    lines.push('');
  }

  lines.push('═══════════════════════════════════════');
  lines.push('Generated by Torah Reader AI Scholar Mode');

  return lines.join('\n');
};

/**
 * Format multi-verse display with chapter grouping
 */
export const formatVerseGroups = (selectedVerses) => {
  if (!selectedVerses || selectedVerses.length === 0) {
    return { groups: [], isMultiChapter: false };
  }

  // Group verses by book and chapter
  const groups = {};
  selectedVerses.forEach(v => {
    const key = `${v.book || 'Book'}.${v.chapter}`;
    if (!groups[key]) {
      groups[key] = { book: v.book, chapter: v.chapter, verses: [] };
    }
    groups[key].verses.push(v.verse);
  });

  const groupEntries = Object.values(groups);
  const isMultiChapter = groupEntries.length > 1;

  // Format each group with verse ranges
  const formattedGroups = groupEntries.map(group => {
    const sortedVerses = [...group.verses].sort((a, b) => a - b);
    const ranges = [];
    let start = sortedVerses[0];
    let end = start;

    for (let j = 1; j <= sortedVerses.length; j++) {
      if (j < sortedVerses.length && sortedVerses[j] === end + 1) {
        end = sortedVerses[j];
      } else {
        ranges.push(start === end ? `${start}` : `${start}-${end}`);
        if (j < sortedVerses.length) {
          start = sortedVerses[j];
          end = start;
        }
      }
    }

    return {
      ...group,
      rangeDisplay: ranges.join(', ')
    };
  });

  return { groups: formattedGroups, isMultiChapter };
};

// Content type options for analysis
export const CONTENT_TYPES = {
  VERSE: 'verse',
  RASHI: 'rashi',
  ONKELOS: 'onkelos',
  RAMBAN: 'ramban',
  ALL: 'all'
};
