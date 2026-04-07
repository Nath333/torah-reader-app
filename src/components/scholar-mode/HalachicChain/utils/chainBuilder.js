/**
 * Chain Builder Utility
 * 
 * Parses Talmud text and builds a structured halachic decision chain.
 * Extracts opinions from Mishnah, analysis from Gemara, decisions from Rishonim,
 * and fetches final psak from Shulchan Aruch/Rema via Sefaria API.
 */

import { HALACHIC_LAYERS, AUTHORITY_TYPES, AUTHORITY_DISPLAY_NAMES } from '../types';
import { extractMishnaOpinions } from './mishnaParser';
import { extractGemaraAnalysis } from './gemaraParser';
import { fetchRishonimDecisions } from './sefariaIntegration';
import { fetchPsakFromSefaria } from './sefariaIntegration';
import { extractCrossReferences } from './crossReferenceExtractor';

/**
 * Build complete halachic chain from text
 * 
 * @param {string} text - The Talmud text
 * @param {string} reference - Sefaria reference (e.g., "Berakhot.2a")
 * @param {Object} options - Build options
 * @param {AbortSignal} signal - Abort signal for cancellation
 * @returns {Promise<Object>} Complete halachic chain
 */
export const buildHalachicChain = async (text, reference, options, signal) => {
  const chain = {
    reference,
    text: text.substring(0, 10000), // Limit stored text
    layers: {},
    crossReferences: [],
    createdAt: new Date().toISOString()
  };

  try {
    // Layer 1: Mishnah - Extract opinions
    if (options.includeMishnah) {
      chain.layers[HALACHIC_LAYERS.MISHNAH] = await buildMishnaLayer(text, signal);
    }

    // Layer 2: Gemara - Extract analysis
    if (options.includeGemara) {
      chain.layers[HALACHIC_LAYERS.GEMARA] = await buildGemaraLayer(text, chain.layers[HALACHIC_LAYERS.MISHNAH], signal);
    }

    // Layer 3: Rishonim - Fetch decisions
    if (options.includeRishonim) {
      chain.layers[HALACHIC_LAYERS.RISHONIM] = await buildRishonimLayer(reference, text, signal);
    }

    // Layer 4: Psak - Fetch final ruling
    if (options.includePsak) {
      chain.layers[HALACHIC_LAYERS.PSAK] = await buildPsakLayer(reference, chain.layers[HALACHIC_LAYERS.RISHONIM], signal);
    }

    // Cross-references
    if (options.fetchCrossReferences) {
      chain.crossReferences = await extractCrossReferences(reference, text, signal);
    }

    return chain;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error;
    }
    console.error('Error building halachic chain:', error);
    // Return partial chain even if some layers failed
    return chain;
  }
};

/**
 * Build Mishnah layer - extract opinions from text
 */
const buildMishnaLayer = async (text, signal) => {
  const layer = {
    id: HALACHIC_LAYERS.MISHNAH,
    hebrewName: 'משנה',
    englishName: 'Mishnah',
    opinions: [],
    isComplete: false
  };

  try {
    // Check if text contains Mishnah
    const hasMishnah = text.includes('משנה') || 
                       text.includes('מתני') ||
                       /^(Tanna|מתניתין)/.test(text.trim());

    if (!hasMishnah) {
      layer.isComplete = true;
      return layer;
    }

    // Extract opinions using parser
    layer.opinions = await extractMishnaOpinions(text, signal);
    layer.isComplete = true;

    return layer;
  } catch (error) {
    console.warn('Error building Mishnah layer:', error);
    layer.isComplete = false;
    return layer;
  }
};

/**
 * Build Gemara layer - extract analysis
 */
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
    // Extract Gemara analysis
    layer.analysis = await extractGemaraAnalysis(text, signal);
    
    // Determine which opinions survive Gemara's analysis
    if (mishnaLayer?.opinions) {
      layer.survivingOpinions = determineSurvivingOpinions(
        mishnaLayer.opinions,
        layer.analysis
      );
    }

    layer.isComplete = true;
    return layer;
  } catch (error) {
    console.warn('Error building Gemara layer:', error);
    layer.isComplete = false;
    return layer;
  }
};

/**
 * Build Rishonim layer - fetch decisions from commentaries
 */
const buildRishonimLayer = async (reference, text, signal) => {
  const layer = {
    id: HALACHIC_LAYERS.RISHONIM,
    hebrewName: 'ראשונים',
    englishName: 'Rishonim',
    decisions: [],
    isComplete: false
  };

  try {
    // Fetch Rishonim decisions from Sefaria
    layer.decisions = await fetchRishonimDecisions(reference, signal);
    
    // If no data from API, try to extract from text
    if (layer.decisions.length === 0) {
      layer.decisions = extractRishonimFromText(text);
    }

    layer.isComplete = true;
    return layer;
  } catch (error) {
    console.warn('Error building Rishonim layer:', error);
    layer.isComplete = false;
    return layer;
  }
};

/**
 * Build Psak layer - fetch final halachic ruling
 */
const buildPsakLayer = async (reference, rishonimLayer, signal) => {
  const layer = {
    id: HALACHIC_LAYERS.PSAK,
    hebrewName: 'פסק',
    englishName: 'Psak',
    psak: null,
    isComplete: false
  };

  try {
    // Fetch psak from Shulchan Aruch via Sefaria
    layer.psak = await fetchPsakFromSefaria(reference, signal);
    
    // If no psak found, calculate from Rishonim majority
    if (!layer.psak && rishonimLayer?.decisions) {
      layer.psak = calculatePsakFromRishonim(rishonimLayer.decisions);
    }

    layer.isComplete = true;
    return layer;
  } catch (error) {
    console.warn('Error building Psak layer:', error);
    layer.isComplete = false;
    return layer;
  }
};

/**
 * Determine which Mishnah opinions survive Gemara's analysis
 */
const determineSurvivingOpinions = (mishnaOpinions, gemaraAnalysis) => {
  const surviving = [];
  
  // Track which opinions are explicitly rejected or accepted
  const rejectedOpinions = new Set();
  const acceptedOpinions = new Set();

  gemaraAnalysis.forEach(analysis => {
    // Check rejections
    analysis.rejections?.forEach(rejection => {
      mishnaOpinions.forEach(op => {
        if (rejection.includes(op.authority) || 
            rejection.includes(op.ruling)) {
          rejectedOpinions.add(op.authority);
        }
      });
    });

    // Check resolutions/acceptances
    analysis.resolutions?.forEach(resolution => {
      mishnaOpinions.forEach(op => {
        if (resolution.includes(op.authority) || 
            resolution.includes(op.ruling)) {
          acceptedOpinions.add(op.authority);
        }
      });
    });
  });

  // Opinions survive if accepted or not rejected
  mishnaOpinions.forEach(op => {
    if (acceptedOpinions.has(op.authority) || 
        !rejectedOpinions.has(op.authority)) {
      surviving.push(op.authority);
    }
  });

  return [...new Set(surviving)]; // Remove duplicates
};

/**
 * Extract Rishonim mentions from text (fallback method)
 */
const extractRishonimFromText = (text) => {
  const decisions = [];
  const rishonimNames = Object.keys(AUTHORITY_DISPLAY_NAMES).filter(
    name => AUTHORITY_DISPLAY_NAMES[name].type === AUTHORITY_TYPES.RISHON
  );

  rishonimNames.forEach(authority => {
    const hebrewName = AUTHORITY_DISPLAY_NAMES[authority].hebrew;
    if (text.includes(hebrewName) || text.includes(authority)) {
      // Try to extract context around mention
      const index = text.indexOf(hebrewName) || text.indexOf(authority);
      const start = Math.max(0, index - 100);
      const end = Math.min(text.length, index + 100);
      const context = text.substring(start, end);

      decisions.push({
        authority,
        ruling: 'mentioned',
        reasoning: context,
        sourceRef: 'inline',
        basedOn: []
      });
    }
  });

  return decisions;
};

/**
 * Calculate psak from Rishonim majority when no Shulchan Aruch available
 */
const calculatePsakFromRishonim = (decisions) => {
  if (!decisions || decisions.length === 0) return null;

  // Count rulings
  const rulingCounts = {};
  decisions.forEach(d => {
    const ruling = d.ruling || 'unknown';
    rulingCounts[ruling] = (rulingCounts[ruling] || 0) + 1;
  });

  // Find majority
  const entries = Object.entries(rulingCounts);
  entries.sort((a, b) => b[1] - a[1]);
  
  const [majorityRuling, count] = entries[0];
  const total = decisions.length;

  return {
    ruling: majorityRuling,
    majorityCount: { for: count, against: total - count },
    source: 'Rishonim Majority',
    location: null,
    minorityOpinion: entries.length > 1 ? entries[1][0] : null,
    isDisputed: entries.length > 1 && entries[1][1] >= count - 1
  };
};

export default buildHalachicChain;
