/**
 * Majority Calculator
 * 
 * Calculates majority opinions among Rishonim.
 * Follows the Shulchan Aruch rule: majority of Rif, Rambam, Rosh.
 */

import { AUTHORITY_DISPLAY_NAMES } from '../types';

// Primary decisors according to Shulchan Aruch methodology
const PRIMARY_DECISORS = ['Rif', 'Rambam', 'Rosh'];

/**
 * Calculate majority opinion from Rishonim decisions
 * @param {Array} decisions - Array of Rishon decisions
 * @returns {Object} Majority calculation result
 */
export const calculateMajority = (decisions) => {
  if (!decisions || decisions.length === 0) {
    return {
      ruling: null,
      isMajority: false,
      primaryDecisors: { agree: 0, disagree: 0 },
      allDecisors: { agree: 0, disagree: 0 },
      breakdown: []
    };
  }

  // Group by ruling
  const rulingGroups = {};
  const primaryDecisorVotes = {};
  
  decisions.forEach(decision => {
    const ruling = decision.ruling || 'unknown';
    
    if (!rulingGroups[ruling]) {
      rulingGroups[ruling] = [];
    }
    rulingGroups[ruling].push(decision);
    
    // Track primary decisors
    if (PRIMARY_DECISORS.includes(decision.authority)) {
      if (!primaryDecisorVotes[ruling]) {
        primaryDecisorVotes[ruling] = [];
      }
      primaryDecisorVotes[ruling].push(decision.authority);
    }
  });

  // Find majority
  const sortedRulings = Object.entries(rulingGroups)
    .sort((a, b) => b[1].length - a[1].length);
  
  const [majorityRuling, majorityDecisions] = sortedRulings[0] || [null, []];
  
  // Check primary decisors
  let primaryAgree = 0;
  let primaryDisagree = 0;
  
  PRIMARY_DECISORS.forEach(decisor => {
    const votedRuling = Object.entries(primaryDecisorVotes)
      .find(([ruling, voters]) => voters.includes(decisor));
    
    if (votedRuling) {
      if (votedRuling[0] === majorityRuling) {
        primaryAgree++;
      } else {
        primaryDisagree++;
      }
    }
  });

  // Build detailed breakdown
  const breakdown = sortedRulings.map(([ruling, decs]) => ({
    ruling,
    count: decs.length,
    authorities: decs.map(d => ({
      name: d.authority,
      hebrewName: AUTHORITY_DISPLAY_NAMES[d.authority]?.hebrew || d.authority,
      isPrimary: PRIMARY_DECISORS.includes(d.authority)
    })),
    isMajority: ruling === majorityRuling
  }));

  // Determine if it's a clear majority
  const totalVotes = decisions.length;
  const majorityCount = majorityDecisions.length;
  const isClearMajority = majorityCount > totalVotes / 2;
  
  // Check for machloket (valid disagreement)
  const isDisputed = sortedRulings.length > 1 && 
    sortedRulings[1][1].length >= majorityCount - 1;

  return {
    ruling: majorityRuling,
    isMajority: isClearMajority,
    isDisputed,
    primaryDecisors: {
      agree: primaryAgree,
      disagree: primaryDisagree,
      total: PRIMARY_DECISORS.length
    },
    allDecisors: {
      agree: majorityCount,
      disagree: totalVotes - majorityCount,
      total: totalVotes
    },
    breakdown,
    minorityOpinion: isDisputed ? sortedRulings[1][0] : null
  };
};

/**
 * Get consensus level description
 */
export const getConsensusLevel = (majorityResult) => {
  if (!majorityResult) return 'unknown';
  
  if (majorityResult.primaryDecisors.agree >= 2) {
    return 'strong'; // 2 of 3 primary decisors agree
  } else if (majorityResult.primaryDecisors.agree >= 1) {
    return 'moderate'; // At least 1 primary decisor agrees
  } else if (majorityResult.isMajority) {
    return 'weak'; // Majority but no primary decisors
  } else {
    return 'disputed';
  }
};

/**
 * Format majority result for display
 */
export const formatMajorityResult = (majorityResult) => {
  if (!majorityResult || !majorityResult.ruling) {
    return {
      text: 'No consensus',
      color: 'gray',
      icon: '❓'
    };
  }

  const level = getConsensusLevel(majorityResult);
  
  const formats = {
    strong: {
      text: `Clear majority: ${majorityResult.ruling}`,
      color: 'green',
      icon: '✓'
    },
    moderate: {
      text: `Majority opinion: ${majorityResult.ruling}`,
      color: 'blue',
      icon: '◯'
    },
    weak: {
      text: `Lean toward: ${majorityResult.ruling}`,
      color: 'yellow',
      icon: '~'
    },
    disputed: {
      text: 'Valid disagreement',
      color: 'orange',
      icon: '⚖'
    },
    unknown: {
      text: 'No consensus',
      color: 'gray',
      icon: '❓'
    }
  };

  return formats[level] || formats.unknown;
};

export { PRIMARY_DECISORS, calculateMajority, getConsensusLevel, formatMajorityResult };
