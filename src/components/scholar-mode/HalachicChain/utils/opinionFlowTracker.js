/**
 * Opinion Flow Tracker
 *
 * Tracks each opinion's journey through the full שושלת הוראה:
 * Tanna → Gemara survival → Rishonim support → Tur citation → SA/Rema → Acharonim → Psak
 *
 * This is the core educational feature: a student can select any opinion
 * and see its complete lineage through the halachic chain.
 */

import { HALACHIC_LAYERS } from '../types';

/**
 * @typedef {Object} OpinionFlowNode
 * @property {string} layer - Which layer this node is in
 * @property {string} authority - Name of the authority
 * @property {string} hebrewName - Hebrew name
 * @property {string} ruling - The ruling/position
 * @property {string} status - 'originated' | 'survived' | 'adopted' | 'codified' | 'rejected' | 'minority'
 * @property {string} [reasoning] - Why this happened
 * @property {string[]} [supportedBy] - Who supports at this layer
 * @property {string[]} [rejectedBy] - Who rejects at this layer
 */

/**
 * @typedef {Object} OpinionFlow
 * @property {string} originAuthority - The Tanna who originated this opinion
 * @property {string} ruling - The core ruling
 * @property {OpinionFlowNode[]} journey - The opinion's path through layers
 * @property {string} finalStatus - 'accepted' | 'rejected' | 'disputed' | 'minority'
 * @property {string} finalPsak - Where it ended up
 * @property {boolean} isMajority - Whether this became the majority view
 */

/**
 * Build opinion flows from chain data.
 * Traces each Mishnah opinion through Gemara → Rishonim → Tur → SA → Acharonim.
 *
 * @param {Object} chainData - The complete halachic chain
 * @returns {OpinionFlow[]} Array of opinion flows
 */
export const buildOpinionFlows = (chainData) => {
  if (!chainData?.layers) return [];

  const flows = [];
  const mishnahLayer = chainData.layers[HALACHIC_LAYERS.MISHNAH];

  if (!mishnahLayer?.opinions?.length) return flows;

  // For each Mishnah opinion, trace through the chain
  mishnahLayer.opinions.forEach(opinion => {
    const flow = {
      originAuthority: opinion.authority,
      originHebrew: opinion.authorityHebrew || opinion.authority,
      ruling: opinion.ruling,
      journey: [],
      finalStatus: 'unknown',
      finalPsak: null,
      isMajority: false
    };

    // Node 1: Origin in Mishnah
    flow.journey.push({
      layer: HALACHIC_LAYERS.MISHNAH,
      authority: opinion.authority,
      hebrewName: opinion.authorityHebrew || opinion.authority,
      ruling: opinion.ruling,
      status: 'originated',
      reasoning: opinion.reasoning || null
    });

    // Helper to add a placeholder node when a layer is missing
    const addPlaceholder = (layer) => ({
      layer,
      authority: opinion.authority,
      hebrewName: opinion.authorityHebrew || opinion.authority,
      ruling: opinion.ruling,
      status: 'not_analyzed',
      reasoning: 'שכבה זו לא זמינה'
    });

    // Node 2: Gemara — did this opinion survive?
    const gemaraLayer = chainData.layers[HALACHIC_LAYERS.GEMARA];
    flow.journey.push(
      gemaraLayer
        ? traceInGemara(opinion, gemaraLayer)
        : addPlaceholder(HALACHIC_LAYERS.GEMARA)
    );

    // Node 3: Rishonim — who adopted this opinion?
    const rishonimLayer = chainData.layers[HALACHIC_LAYERS.RISHONIM];
    flow.journey.push(
      rishonimLayer?.decisions?.length
        ? traceInRishonim(opinion, rishonimLayer.decisions)
        : addPlaceholder(HALACHIC_LAYERS.RISHONIM)
    );

    // Node 4: Tur — is this opinion cited?
    const turLayer = chainData.layers[HALACHIC_LAYERS.TUR];
    flow.journey.push(
      turLayer?.turAnalysis
        ? traceInTur(opinion, turLayer.turAnalysis)
        : addPlaceholder(HALACHIC_LAYERS.TUR)
    );

    // Node 5: Psak — did Mechaber/Rema follow this opinion?
    const psakLayer = chainData.layers[HALACHIC_LAYERS.PSAK];
    if (psakLayer?.psak) {
      const psakNode = traceInPsak(opinion, psakLayer.psak);
      flow.journey.push(psakNode);
      flow.finalPsak = psakNode.status;
    } else {
      flow.journey.push(addPlaceholder(HALACHIC_LAYERS.PSAK));
    }

    // Node 6: Acharonim — who supports this in the Acharonim layer?
    const acharonimLayer = chainData.layers[HALACHIC_LAYERS.ACHARONIM];
    flow.journey.push(
      acharonimLayer?.decisions?.length
        ? traceInAcharonim(opinion, acharonimLayer.decisions)
        : addPlaceholder(HALACHIC_LAYERS.ACHARONIM)
    );

    // Determine final status
    flow.finalStatus = determineFinalStatus(flow.journey);
    flow.isMajority = flow.finalStatus === 'accepted' || flow.finalStatus === 'codified';

    flows.push(flow);
  });

  return flows;
};

/**
 * Trace an opinion through the Gemara layer
 */
const traceInGemara = (opinion, gemaraLayer) => {
  const survivingOpinions = gemaraLayer.survivingOpinions || [];
  const survived = survivingOpinions.includes(opinion.authority);

  // Check if any analysis specifically challenges or supports this opinion
  let challengedBy = [];
  let supportedBy = [];

  gemaraLayer.analysis?.forEach(a => {
    a.rejections?.forEach(r => {
      if (r.includes(opinion.authority) || r.includes(opinion.ruling)) {
        challengedBy.push('Gemara challenge');
      }
    });
    a.resolutions?.forEach(r => {
      if (r.includes(opinion.authority) || r.includes(opinion.ruling)) {
        supportedBy.push('Gemara resolution');
      }
    });
  });

  return {
    layer: HALACHIC_LAYERS.GEMARA,
    authority: opinion.authority,
    hebrewName: opinion.authorityHebrew || opinion.authority,
    ruling: opinion.ruling,
    status: survived ? 'survived' : (challengedBy.length > 0 ? 'challenged' : 'unknown'),
    reasoning: survived
      ? 'This opinion survived the Gemara\'s dialectical analysis'
      : challengedBy.length > 0
        ? 'This opinion was challenged in the Gemara'
        : 'Status unclear from Gemara analysis',
    supportedBy,
    rejectedBy: challengedBy
  };
};

/**
 * Trace an opinion through the Rishonim layer
 */
const traceInRishonim = (opinion, decisions) => {
  const supporters = [];
  const opposers = [];

  decisions.forEach(d => {
    // Check if this Rishon's ruling matches the opinion
    if (d.ruling === opinion.ruling || d.ruling === 'discusses') {
      // Check basedOn for explicit connection
      if (d.basedOn?.includes(opinion.authority)) {
        supporters.push(d.authority);
      } else if (d.ruling === opinion.ruling) {
        supporters.push(d.authority);
      }
    } else if (d.ruling && d.ruling !== 'discusses' && d.ruling !== 'mentioned') {
      opposers.push(d.authority);
    }
  });

  const status = supporters.length > opposers.length ? 'adopted'
    : supporters.length > 0 ? 'minority'
      : opposers.length > 0 ? 'rejected'
        : 'unknown';

  return {
    layer: HALACHIC_LAYERS.RISHONIM,
    authority: opinion.authority,
    hebrewName: opinion.authorityHebrew || opinion.authority,
    ruling: opinion.ruling,
    status,
    reasoning: supporters.length > 0
      ? `Adopted by ${supporters.join(', ')}`
      : opposers.length > 0
        ? `Not followed by majority of Rishonim`
        : 'Rishonim analysis pending',
    supportedBy: supporters,
    rejectedBy: opposers
  };
};

/**
 * Trace an opinion through the Tur layer
 */
const traceInTur = (opinion, turAnalysis) => {
  const cited = turAnalysis.turSummary?.some(s =>
    s.position === opinion.ruling ||
    s.authority === opinion.authority
  );

  return {
    layer: HALACHIC_LAYERS.TUR,
    authority: opinion.authority,
    hebrewName: opinion.authorityHebrew || opinion.authority,
    ruling: opinion.ruling,
    status: cited ? 'cited' : 'not_cited',
    reasoning: cited
      ? `Cited in ${turAnalysis.saSectionHebrew || 'Tur'}`
      : `Not directly cited in Tur for this section`
  };
};

/**
 * Trace an opinion through the Psak (SA/Rema) layer
 */
const traceInPsak = (opinion, psak) => {
  const mechaberMatch = psak.mechaber?.ruling === opinion.ruling;
  const remaMatch = psak.rema?.ruling === opinion.ruling;

  let status, reasoning;

  if (mechaberMatch && remaMatch) {
    status = 'codified';
    reasoning = 'Both Mechaber and Rema follow this opinion — universal psak';
  } else if (mechaberMatch) {
    status = 'codified_sephardic';
    reasoning = 'The Mechaber (Shulchan Aruch) follows this opinion — Sephardic psak';
  } else if (remaMatch) {
    status = 'codified_ashkenazi';
    reasoning = 'The Rema follows this opinion — Ashkenazi psak';
  } else if (psak.ruling === opinion.ruling) {
    status = 'codified';
    reasoning = 'This opinion became the accepted psak';
  } else {
    status = 'not_codified';
    reasoning = 'This opinion was not codified in the Shulchan Aruch';
  }

  return {
    layer: HALACHIC_LAYERS.PSAK,
    authority: opinion.authority,
    hebrewName: opinion.authorityHebrew || opinion.authority,
    ruling: opinion.ruling,
    status,
    reasoning
  };
};

/**
 * Trace an opinion through the Acharonim layer
 */
const traceInAcharonim = (opinion, acharonimDecisions) => {
  const supporters = [];

  acharonimDecisions.forEach(d => {
    if (d.ruling === opinion.ruling) {
      supporters.push({
        name: d.authority,
        hebrew: d.hebrewName,
        tradition: d.tradition
      });
    }
  });

  return {
    layer: HALACHIC_LAYERS.ACHARONIM,
    authority: opinion.authority,
    hebrewName: opinion.authorityHebrew || opinion.authority,
    ruling: opinion.ruling,
    status: supporters.length > 0 ? 'supported' : 'not_discussed',
    reasoning: supporters.length > 0
      ? `Supported by ${supporters.map(s => s.hebrew || s.name).join(', ')}`
      : 'No direct Acharonim support found',
    supportedBy: supporters.map(s => s.name)
  };
};

/**
 * Determine final status from the full journey
 */
const determineFinalStatus = (journey) => {
  // Check from the end backward — later layers have priority
  const psakNode = journey.find(n => n.layer === HALACHIC_LAYERS.PSAK);
  if (psakNode) {
    if (psakNode.status === 'codified') return 'accepted';
    if (psakNode.status === 'codified_sephardic' || psakNode.status === 'codified_ashkenazi') return 'partial';
    if (psakNode.status === 'not_codified') return 'rejected';
  }

  const rishonimNode = journey.find(n => n.layer === HALACHIC_LAYERS.RISHONIM);
  if (rishonimNode) {
    if (rishonimNode.status === 'adopted') return 'accepted';
    if (rishonimNode.status === 'minority') return 'minority';
    if (rishonimNode.status === 'rejected') return 'rejected';
  }

  const gemaraNode = journey.find(n => n.layer === HALACHIC_LAYERS.GEMARA);
  if (gemaraNode) {
    if (gemaraNode.status === 'survived') return 'pending';
    if (gemaraNode.status === 'challenged') return 'challenged';
  }

  return 'unknown';
};

/**
 * Get the flow for a specific authority
 */
export const getFlowForAuthority = (flows, authority) => {
  return flows.find(f => f.originAuthority === authority) || null;
};

/**
 * Get a summary of all flows — which opinions won, lost, or are disputed
 */
export const getFlowSummary = (flows) => {
  const accepted = flows.filter(f => f.finalStatus === 'accepted');
  const rejected = flows.filter(f => f.finalStatus === 'rejected');
  const partial = flows.filter(f => f.finalStatus === 'partial');
  const disputed = flows.filter(f => f.finalStatus === 'minority' || f.finalStatus === 'challenged');

  return {
    accepted: accepted.map(f => f.originAuthority),
    rejected: rejected.map(f => f.originAuthority),
    partial: partial.map(f => f.originAuthority),
    disputed: disputed.map(f => f.originAuthority),
    totalOpinions: flows.length,
    summary: accepted.length > 0
      ? `${accepted.map(f => f.originAuthority).join(', ')}'s opinion was accepted as the final halacha.`
      : partial.length > 0
        ? `Different traditions follow different opinions.`
        : 'The chain analysis is still being processed.'
  };
};

export default {
  buildOpinionFlows,
  getFlowForAuthority,
  getFlowSummary
};
