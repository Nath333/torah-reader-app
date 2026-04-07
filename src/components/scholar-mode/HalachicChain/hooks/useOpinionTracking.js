/**
 * useOpinionTracking Hook
 * 
 * Tracks opinions through the halachic chain - from Mishnah through Gemara
 * to Rishonim and final psak. Shows which opinions were accepted, rejected,
 * or remain as minority views.
 */

import { useMemo } from 'react';
import { HALACHIC_LAYERS } from '../types';

/**
 * Hook for tracking opinion lineage
 * @param {Object} chain - Full halachic chain data
 * @returns {Object} Opinion tracking data
 */
export const useOpinionTracking = (chain) => {
  return useMemo(() => {
    if (!chain) return null;

    const tracking = {
      opinions: [],
      lineage: {},
      rejected: [],
      accepted: [],
      disputed: []
    };

    // Start with Mishnah opinions
    const mishnaLayer = chain.layers[HALACHIC_LAYERS.MISHNAH];
    if (mishnaLayer?.opinions) {
      mishnaLayer.opinions.forEach(opinion => {
        tracking.opinions.push({
          authority: opinion.authority,
          authorityType: opinion.authorityType,
          originalRuling: opinion.ruling,
          mishnahStatus: 'initial',
          gemaraStatus: null,
          rishonimSupport: [],
          finalStatus: null
        });
      });
    }

    // Track through Gemara
    const gemaraLayer = chain.layers[HALACHIC_LAYERS.GEMARA];
    if (gemaraLayer?.survivingOpinions) {
      tracking.opinions.forEach(op => {
        const survives = gemaraLayer.survivingOpinions.includes(op.authority);
        op.gemaraStatus = survives ? 'survives' : 'rejected';
        if (!survives) {
          tracking.rejected.push(op.authority);
        }
      });
    }

    // Track Rishonim support
    const rishonimLayer = chain.layers[HALACHIC_LAYERS.RISHONIM];
    if (rishonimLayer?.decisions) {
      rishonimLayer.decisions.forEach(decision => {
        decision.basedOn?.forEach(authority => {
          const opinion = tracking.opinions.find(op => op.authority === authority);
          if (opinion) {
            opinion.rishonimSupport.push(decision.authority);
          }
        });
      });
    }

    // Determine final status from psak
    const psakLayer = chain.layers[HALACHIC_LAYERS.PSAK];
    if (psakLayer?.psak) {
      const finalRuling = psakLayer.psak.ruling;
      
      tracking.opinions.forEach(op => {
        if (op.gemaraStatus === 'rejected') {
          op.finalStatus = 'rejected';
        } else if (op.originalRuling?.toLowerCase().includes(finalRuling?.toLowerCase())) {
          op.finalStatus = 'accepted';
          tracking.accepted.push(op.authority);
        } else if (psakLayer.psak.isDisputed && op.rishonimSupport.length > 0) {
          op.finalStatus = 'minority';
          tracking.disputed.push(op.authority);
        } else {
          op.finalStatus = 'not_applicable';
        }
      });
    }

    // Build lineage map
    tracking.opinions.forEach(op => {
      tracking.lineage[op.authority] = {
        authority: op.authority,
        type: op.authorityType,
        status: op.finalStatus || op.gemaraStatus || 'unknown',
        support: op.rishonimSupport,
        path: [
          { stage: 'mishnah', status: op.mishnahStatus },
          { stage: 'gemara', status: op.gemaraStatus },
          { stage: 'rishonim', support: op.rishonimSupport.length },
          { stage: 'psak', status: op.finalStatus }
        ]
      };
    });

    return tracking;
  }, [chain]);
};

export default useOpinionTracking;
