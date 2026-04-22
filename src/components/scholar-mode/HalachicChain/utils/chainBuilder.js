/**
 * Chain Builder Utility
 *
 * Builds the complete 7-layer שושלת הוראה:
 * משנה → גמרא → ראשונים → טור/בית יוסף → אחרונים → פוסקים → פסק
 */

import { HALACHIC_LAYERS, AUTHORITY_TYPES, AUTHORITY_DISPLAY_NAMES } from '../types';
import { extractMishnaOpinions } from './mishnaParser';
import { extractGemaraAnalysis } from './gemaraParser';
import {
  fetchRishonimDecisions,
  fetchTurBeitYosef,
  fetchAcharonimDecisions,
  fetchModernPoskim,
  fetchPsakFromSefaria
} from './sefariaIntegration';
import { extractCrossReferences } from './crossReferenceExtractor';
import { enrichPsakWithAcharonim } from './majorityCalculator';
import { analyzeKlaleiPesika } from './klaleiPesika';
import { buildOpinionFlows } from './opinionFlowTracker';

/**
 * Build complete halachic chain from text
 */
export const buildHalachicChain = async (text, reference, options, signal) => {
  const chain = {
    reference,
    text: text.substring(0, 10000),
    layers: {},
    crossReferences: [],
    createdAt: new Date().toISOString()
  };

  try {
    // Layer 1: Mishnah — Tannaim opinions
    if (options.includeMishnah) {
      chain.layers[HALACHIC_LAYERS.MISHNAH] = await buildMishnaLayer(text, signal);
    }

    // Layer 2: Gemara — Shakla v'tarya analysis
    if (options.includeGemara) {
      chain.layers[HALACHIC_LAYERS.GEMARA] = await buildGemaraLayer(
        text, chain.layers[HALACHIC_LAYERS.MISHNAH], signal
      );
    }

    // Layer 3: Rishonim — Rashi, Tosafot, Rif, Rambam, Rosh, etc.
    if (options.includeRishonim) {
      chain.layers[HALACHIC_LAYERS.RISHONIM] = await buildRishonimLayer(reference, text, signal);
    }

    // Layer 4: Tur / Beit Yosef — bridge to Shulchan Aruch
    if (options.includeTur) {
      chain.layers[HALACHIC_LAYERS.TUR] = await buildTurLayer(
        reference,
        chain.layers[HALACHIC_LAYERS.RISHONIM]?.decisions,
        signal
      );
    }

    // Layer 5: Psak — Shulchan Aruch + Rema (structured Mechaber/Rema comparison)
    if (options.includePsak) {
      chain.layers[HALACHIC_LAYERS.PSAK] = await buildPsakLayer(
        reference, chain.layers[HALACHIC_LAYERS.RISHONIM], signal
      );
    }

    // Layer 6: Acharonim — key commentators on SA by section
    if (options.includeAcharonim) {
      chain.layers[HALACHIC_LAYERS.ACHARONIM] = await buildAcharonimLayer(
        reference, chain.layers[HALACHIC_LAYERS.PSAK]?.psak, signal
      );

      // Enrich Psak with Acharonim support data
      if (chain.layers[HALACHIC_LAYERS.PSAK]?.psak && chain.layers[HALACHIC_LAYERS.ACHARONIM]?.decisions) {
        chain.layers[HALACHIC_LAYERS.PSAK].psak = enrichPsakWithAcharonim(
          chain.layers[HALACHIC_LAYERS.PSAK].psak,
          chain.layers[HALACHIC_LAYERS.ACHARONIM].decisions
        );
      }
    }

    // Layer 7: Modern Poskim
    if (options.includePoskim) {
      chain.layers[HALACHIC_LAYERS.POSKIM] = await buildPoskimLayer(reference, signal);
    }

    // Cross-references
    if (options.fetchCrossReferences) {
      chain.crossReferences = await extractCrossReferences(reference, text, signal);
    }

    // ── Post-processing: כללי הפסיקה analysis ──
    chain.klaleiPesika = analyzeKlaleiPesika(chain);

    // ── Post-processing: Opinion flow tracking ──
    chain.opinionFlows = buildOpinionFlows(chain);

    return chain;
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    console.error('Error building halachic chain:', error);
    return chain;
  }
};

// ═══════════════════════════════════════════════════════════
// Layer builders
// ═══════════════════════════════════════════════════════════

const buildMishnaLayer = async (text, signal) => {
  const layer = {
    id: HALACHIC_LAYERS.MISHNAH,
    hebrewName: 'משנה',
    englishName: 'Mishnah',
    opinions: [],
    isComplete: false
  };
  try {
    const hasMishnah = text.includes('משנה') || text.includes('מתני') ||
      /^(Tanna|מתניתין)/.test(text.trim());
    if (!hasMishnah) { layer.isComplete = true; return layer; }
    layer.opinions = await extractMishnaOpinions(text, signal);
    layer.isComplete = true;
    return layer;
  } catch (error) {
    console.warn('Error building Mishnah layer:', error);
    return layer;
  }
};

const buildGemaraLayer = async (text, mishnaLayer, signal) => {
  const layer = {
    id: HALACHIC_LAYERS.GEMARA,
    hebrewName: 'גמרא',
    englishName: 'Gemara',
    analysis: [],
    survivingOpinions: [],
    isComplete: false
  };
  try {
    layer.analysis = await extractGemaraAnalysis(text, signal);
    if (mishnaLayer?.opinions) {
      layer.survivingOpinions = determineSurvivingOpinions(mishnaLayer.opinions, layer.analysis);
    }
    layer.isComplete = true;
    return layer;
  } catch (error) {
    console.warn('Error building Gemara layer:', error);
    return layer;
  }
};

const buildRishonimLayer = async (reference, text, signal) => {
  const layer = {
    id: HALACHIC_LAYERS.RISHONIM,
    hebrewName: 'ראשונים',
    englishName: 'Rishonim',
    decisions: [],
    isComplete: false
  };
  try {
    layer.decisions = await fetchRishonimDecisions(reference, signal);
    if (layer.decisions.length === 0) {
      layer.decisions = extractRishonimFromText(text);
    }
    layer.isComplete = true;
    return layer;
  } catch (error) {
    console.warn('Error building Rishonim layer:', error);
    return layer;
  }
};

/**
 * Layer 4: Tur / Beit Yosef — the bridge
 * Shows how the Tur organizes Rishonim opinions and
 * the Beit Yosef's analysis of why SA rules as it does.
 */
const buildTurLayer = async (reference, rishonimDecisions, signal) => {
  const layer = {
    id: HALACHIC_LAYERS.TUR,
    hebrewName: 'טור / בית יוסף',
    englishName: 'Tur / Beit Yosef',
    turAnalysis: null,
    isComplete: false
  };
  try {
    layer.turAnalysis = await fetchTurBeitYosef(reference, signal);

    // Cross-reference Tur citations with actual Rishonim decisions
    if (layer.turAnalysis?.turSummary && rishonimDecisions?.length) {
      layer.turAnalysis.turSummary = layer.turAnalysis.turSummary.map(citation => {
        const matchingDecision = rishonimDecisions.find(d =>
          d.authority === citation.authority || d.hebrewName === citation.hebrewName
        );
        if (matchingDecision) {
          return {
            ...citation,
            confirmedRuling: matchingDecision.ruling,
            sourceRef: matchingDecision.sourceRef,
            crossReferenced: true
          };
        }
        return { ...citation, crossReferenced: false };
      });
    }

    layer.isComplete = true;
    return layer;
  } catch (error) {
    console.warn('Error building Tur layer:', error);
    return layer;
  }
};

const buildPsakLayer = async (reference, rishonimLayer, signal) => {
  const layer = {
    id: HALACHIC_LAYERS.PSAK,
    hebrewName: 'שולחן ערוך',
    englishName: 'Shulchan Aruch',
    psak: null,
    isComplete: false
  };
  try {
    layer.psak = await fetchPsakFromSefaria(reference, signal);
    if (!layer.psak && rishonimLayer?.decisions) {
      layer.psak = calculatePsakFromRishonim(rishonimLayer.decisions);
    }
    layer.isComplete = true;
    return layer;
  } catch (error) {
    console.warn('Error building Psak layer:', error);
    return layer;
  }
};

const buildAcharonimLayer = async (reference, psakData, signal) => {
  const layer = {
    id: HALACHIC_LAYERS.ACHARONIM,
    hebrewName: 'אחרונים',
    englishName: 'Acharonim',
    decisions: [],
    isComplete: false
  };
  try {
    layer.decisions = await fetchAcharonimDecisions(reference, psakData, signal);
    layer.isComplete = true;
    return layer;
  } catch (error) {
    console.warn('Error building Acharonim layer:', error);
    return layer;
  }
};

/**
 * Layer 7: Modern Poskim
 */
const buildPoskimLayer = async (reference, signal) => {
  const layer = {
    id: HALACHIC_LAYERS.POSKIM,
    hebrewName: 'פוסקים',
    englishName: 'Modern Poskim',
    decisions: [],
    isComplete: false
  };
  try {
    layer.decisions = await fetchModernPoskim(reference, signal);
    layer.isComplete = true;
    return layer;
  } catch (error) {
    console.warn('Error building Poskim layer:', error);
    return layer;
  }
};

// ═══════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════

const determineSurvivingOpinions = (mishnaOpinions, gemaraAnalysis) => {
  const rejectedOpinions = new Set();
  const acceptedOpinions = new Set();

  gemaraAnalysis.forEach(analysis => {
    analysis.rejections?.forEach(rejection => {
      mishnaOpinions.forEach(op => {
        if (rejection.includes(op.authority) || rejection.includes(op.ruling)) {
          rejectedOpinions.add(op.authority);
        }
      });
    });
    analysis.resolutions?.forEach(resolution => {
      mishnaOpinions.forEach(op => {
        if (resolution.includes(op.authority) || resolution.includes(op.ruling)) {
          acceptedOpinions.add(op.authority);
        }
      });
    });
  });

  const surviving = [];
  mishnaOpinions.forEach(op => {
    if (acceptedOpinions.has(op.authority) || !rejectedOpinions.has(op.authority)) {
      surviving.push(op.authority);
    }
  });
  return [...new Set(surviving)];
};

const extractRishonimFromText = (text) => {
  const decisions = [];
  const rishonimNames = Object.keys(AUTHORITY_DISPLAY_NAMES).filter(
    name => AUTHORITY_DISPLAY_NAMES[name].type === AUTHORITY_TYPES.RISHON
  );
  rishonimNames.forEach(authority => {
    const hebrewName = AUTHORITY_DISPLAY_NAMES[authority].hebrew;
    if (text.includes(hebrewName) || text.includes(authority)) {
      const index = text.indexOf(hebrewName) !== -1 ? text.indexOf(hebrewName) : text.indexOf(authority);
      const start = Math.max(0, index - 100);
      const end = Math.min(text.length, index + 100);
      decisions.push({
        authority,
        hebrewName,
        ruling: 'mentioned',
        reasoning: text.substring(start, end),
        sourceRef: 'inline',
        basedOn: [],
        type: AUTHORITY_TYPES.RISHON
      });
    }
  });
  return decisions;
};

const calculatePsakFromRishonim = (decisions) => {
  if (!decisions || decisions.length === 0) return null;
  const rulingCounts = {};
  decisions.forEach(d => {
    const ruling = d.ruling || 'unknown';
    rulingCounts[ruling] = (rulingCounts[ruling] || 0) + 1;
  });
  const entries = Object.entries(rulingCounts).sort((a, b) => b[1] - a[1]);
  const [majorityRuling, count] = entries[0];
  const total = decisions.length;

  return {
    ruling: majorityRuling,
    majorityCount: { for: count, against: total - count },
    source: 'Rishonim Majority',
    location: null,
    isDisputed: entries.length > 1 && entries[1][1] >= count - 1,
    text: '',
    mechaber: null,
    rema: null,
    traditionsAgree: true,
    minorityPositions: entries.slice(1).map(([ruling, cnt]) => ({
      ruling,
      authorities: decisions.filter(d => d.ruling === ruling).map(d => ({
        name: d.authority,
        hebrewName: d.hebrewName || d.authority
      })),
      count: cnt,
      isSignificant: cnt >= count - 1
    })),
    halachaLemaaseh: `Based on Rishonim majority: ${majorityRuling}`
  };
};

export default buildHalachicChain;
