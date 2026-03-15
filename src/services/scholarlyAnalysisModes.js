/**
 * Scholarly Analysis Modes - Rule-based analysis using Sefaria data
 *
 * Provides structured analysis WITHOUT AI/LLM calls by fetching and
 * organizing data from Sefaria API and the commentary factory.
 *
 * For AI-powered analysis (conversations, insights), use aiService.js
 */

import { getScholarlyData, getVerseConnections, getWordAnalysis } from './scholarlyApiService';
import { cleanHtml } from '../utils/sanitize';

const SEFARIA_BASE = 'https://www.sefaria.org/api';

// =============================================================================
// ANALYSIS MODES
// =============================================================================

export const SCHOLARLY_MODES = {
  PARDES: 'pardes',
  MEFARSHIM: 'mefarshim',
  HALACHA: 'halacha',
  LEXICON: 'lexicon',
  INTERTEXTUAL: 'intertextual',
  SUMMARY: 'summary'
};

// =============================================================================
// COMMENTATOR CATEGORIES FOR PARDES
// =============================================================================

const PARDES_CATEGORIES = {
  pshat: ['Rashbam', 'Ibn Ezra', 'Radak', 'Sforno', 'Shadal'],
  drash: ['Rashi', 'Midrash', 'Tanchuma', 'Yalkut'],
  remez: ['Baal HaTurim', 'Rabbeinu Bachya', 'Kli Yakar'],
  sod: ['Zohar', 'Or HaChaim', 'Ramban', 'Tanya']
};

// =============================================================================
// HELPER
// =============================================================================

const fetchLinks = async (ref) => {
  try {
    const response = await fetch(`${SEFARIA_BASE}/links/${ref.replace(/ /g, '_')}`, {
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) return [];
    return await response.json();
  } catch {
    return [];
  }
};

// =============================================================================
// PARDES MODE - Four levels of interpretation
// =============================================================================

export async function analyzePARDES(ref) {
  const links = await fetchLinks(ref);

  const pardes = {
    pshat: { level: 'Pshat', levelHebrew: 'פשט', commentaries: [] },
    remez: { level: 'Remez', levelHebrew: 'רמז', commentaries: [] },
    drash: { level: 'Drash', levelHebrew: 'דרש', commentaries: [] },
    sod: { level: 'Sod', levelHebrew: 'סוד', commentaries: [] }
  };

  for (const link of links) {
    if (!(link.category || '').toLowerCase().includes('commentary')) continue;

    const name = link.collectiveTitle?.en || link.index_title || '';
    const nameLower = name.toLowerCase();

    const item = {
      source: name,
      ref: link.ref,
      text: cleanHtml(link.text || '').slice(0, 300),
      he: cleanHtml(link.he || '').slice(0, 300)
    };

    if (PARDES_CATEGORIES.sod.some(c => nameLower.includes(c.toLowerCase()))) {
      pardes.sod.commentaries.push(item);
    } else if (PARDES_CATEGORIES.drash.some(c => nameLower.includes(c.toLowerCase()))) {
      pardes.drash.commentaries.push(item);
    } else if (PARDES_CATEGORIES.remez.some(c => nameLower.includes(c.toLowerCase()))) {
      pardes.remez.commentaries.push(item);
    } else if (PARDES_CATEGORIES.pshat.some(c => nameLower.includes(c.toLowerCase()))) {
      pardes.pshat.commentaries.push(item);
    }
  }

  return {
    success: true,
    mode: SCHOLARLY_MODES.PARDES,
    ref,
    analysis: pardes,
    source: 'Sefaria (rule-based)'
  };
}

// =============================================================================
// MEFARSHIM MODE - Commentators by period
// =============================================================================

export async function analyzeMefarshim(ref) {
  const links = await fetchLinks(ref);

  const rishonim = ['Rashi', 'Ramban', 'Ibn Ezra', 'Rashbam', 'Sforno', 'Radak'];
  const acharonim = ['Maharsha', 'Kli Yakar', 'Or HaChaim', 'Malbim', 'Netziv'];

  const result = { rishonim: [], acharonim: [], other: [] };

  for (const link of links) {
    if (!(link.category || '').toLowerCase().includes('commentary')) continue;

    const name = link.collectiveTitle?.en || link.index_title || '';
    const nameLower = name.toLowerCase();

    const item = {
      name,
      ref: link.ref,
      text: cleanHtml(link.text || ''),
      he: cleanHtml(link.he || '')
    };

    if (rishonim.some(c => nameLower.includes(c.toLowerCase()))) {
      result.rishonim.push(item);
    } else if (acharonim.some(c => nameLower.includes(c.toLowerCase()))) {
      result.acharonim.push(item);
    } else {
      result.other.push(item);
    }
  }

  return {
    success: true,
    mode: SCHOLARLY_MODES.MEFARSHIM,
    ref,
    commentators: result,
    source: 'Sefaria (rule-based)'
  };
}

// =============================================================================
// HALACHA MODE - Halachic references
// =============================================================================

export async function analyzeHalacha(ref) {
  const links = await fetchLinks(ref);

  const sources = { talmud: [], rambam: [], shulchanAruch: [], other: [] };

  for (const link of links) {
    const cat = (link.category || '').toLowerCase();
    const refLower = (link.ref || '').toLowerCase();

    const item = {
      ref: link.ref,
      text: cleanHtml(link.text || ''),
      he: cleanHtml(link.he || '')
    };

    if (cat.includes('talmud')) {
      sources.talmud.push(item);
    } else if (refLower.includes('mishneh torah') || refLower.includes('rambam')) {
      sources.rambam.push(item);
    } else if (refLower.includes('shulchan')) {
      sources.shulchanAruch.push(item);
    } else if (cat.includes('halakh')) {
      sources.other.push(item);
    }
  }

  return {
    success: true,
    mode: SCHOLARLY_MODES.HALACHA,
    ref,
    sources,
    source: 'Sefaria (rule-based)'
  };
}

// =============================================================================
// LEXICON MODE - Word analysis
// =============================================================================

export async function analyzeLexicon(ref, hebrewText = '') {
  const words = hebrewText
    .replace(/[\u0591-\u05C7]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 1 && /[\u0590-\u05FF]/.test(w))
    .slice(0, 8);

  const analyses = [];
  for (const word of words) {
    const entries = await getWordAnalysis(word);
    if (entries?.length) {
      analyses.push({ word, entries: entries.slice(0, 2) });
    }
  }

  return {
    success: true,
    mode: SCHOLARLY_MODES.LEXICON,
    ref,
    words: analyses,
    source: 'Sefaria Lexicon (rule-based)'
  };
}

// =============================================================================
// INTERTEXTUAL MODE - Cross-references
// =============================================================================

export async function analyzeIntertextual(ref) {
  const [connections, scholarlyData] = await Promise.all([
    getVerseConnections(ref),
    getScholarlyData(ref)
  ]);

  return {
    success: true,
    mode: SCHOLARLY_MODES.INTERTEXTUAL,
    ref,
    connections: connections || {},
    topics: scholarlyData?.topics || [],
    crossReferences: scholarlyData?.crossReferences || {},
    source: 'Sefaria (rule-based)'
  };
}

// =============================================================================
// SUMMARY MODE - Basic overview
// =============================================================================

export async function analyzeSummary(ref) {
  const scholarlyData = await getScholarlyData(ref);

  return {
    success: true,
    mode: SCHOLARLY_MODES.SUMMARY,
    ref,
    commentaries: scholarlyData?.commentaries || {},
    topics: scholarlyData?.topics?.slice(0, 5) || [],
    statistics: {
      commentaryCount: Object.values(scholarlyData?.commentaries || {}).flat().length,
      topicCount: scholarlyData?.topics?.length || 0
    },
    source: 'Sefaria (rule-based)'
  };
}

// =============================================================================
// MAIN ROUTER
// =============================================================================

export async function analyzeScholarly(ref, mode, options = {}) {
  switch (mode) {
    case SCHOLARLY_MODES.PARDES:
      return analyzePARDES(ref);
    case SCHOLARLY_MODES.MEFARSHIM:
      return analyzeMefarshim(ref);
    case SCHOLARLY_MODES.HALACHA:
      return analyzeHalacha(ref);
    case SCHOLARLY_MODES.LEXICON:
      return analyzeLexicon(ref, options.hebrewText);
    case SCHOLARLY_MODES.INTERTEXTUAL:
      return analyzeIntertextual(ref);
    case SCHOLARLY_MODES.SUMMARY:
      return analyzeSummary(ref);
    default:
      return { success: false, error: `Unknown mode: ${mode}` };
  }
}

const scholarlyAnalysisModes = {
  SCHOLARLY_MODES,
  analyzeScholarly,
  analyzePARDES,
  analyzeMefarshim,
  analyzeHalacha,
  analyzeLexicon,
  analyzeIntertextual,
  analyzeSummary
};

export default scholarlyAnalysisModes;
