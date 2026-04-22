/**
 * Majority Calculator
 *
 * Calculates majority opinions among Rishonim following Beit Yosef methodology.
 * Includes Ashkenazi/Sephardic tradition split and structured minority tracking.
 */

import { AUTHORITY_DISPLAY_NAMES, TRADITIONS } from '../types';

// Primary decisors according to Shulchan Aruch (Beit Yosef) methodology
export const PRIMARY_DECISORS = ['Rif', 'Rambam', 'Rosh'];

/**
 * Calculate majority opinion from Rishonim decisions
 */
export const calculateMajority = (decisions) => {
  if (!decisions || decisions.length === 0) {
    return {
      ruling: null,
      isMajority: false,
      primaryDecisors: { agree: 0, disagree: 0, total: 3 },
      allDecisors: { agree: 0, disagree: 0, total: 0 },
      breakdown: [],
      minorityPositions: [],
      traditionSplit: null
    };
  }

  // Group by ruling
  const rulingGroups = {};
  const primaryDecisorVotes = {};

  decisions.forEach(decision => {
    const ruling = decision.ruling || 'unknown';
    if (!rulingGroups[ruling]) rulingGroups[ruling] = [];
    rulingGroups[ruling].push(decision);

    if (PRIMARY_DECISORS.includes(decision.authority)) {
      if (!primaryDecisorVotes[ruling]) primaryDecisorVotes[ruling] = [];
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
      .find(([, voters]) => voters.includes(decisor));
    if (votedRuling) {
      if (votedRuling[0] === majorityRuling) primaryAgree++;
      else primaryDisagree++;
    }
  });

  // Build breakdown with detail
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

  const totalVotes = decisions.length;
  const majorityCount = majorityDecisions.length;
  const isClearMajority = majorityCount > totalVotes / 2;
  const isDisputed = sortedRulings.length > 1 &&
    sortedRulings[1][1].length >= majorityCount - 1;

  // ── Structured minority positions ──
  const minorityPositions = sortedRulings
    .filter(([ruling]) => ruling !== majorityRuling)
    .map(([ruling, decs]) => ({
      ruling,
      authorities: decs.map(d => ({
        name: d.authority,
        hebrewName: AUTHORITY_DISPLAY_NAMES[d.authority]?.hebrew || d.authority
      })),
      count: decs.length,
      isSignificant: decs.length >= majorityCount - 1
    }));

  // ── Tradition split analysis ──
  const traditionSplit = calculateTraditionSplit(decisions);

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
    minorityPositions,
    traditionSplit,
    minorityOpinion: isDisputed ? sortedRulings[1]?.[0] : null
  };
};

/**
 * Analyze how decisions split along Ashkenazi/Sephardic lines.
 * This helps predict where Mechaber and Rema may disagree.
 */
export const calculateTraditionSplit = (decisions) => {
  if (!decisions || decisions.length === 0) return null;

  const ashkenazi = { authorities: [], rulings: {} };
  const sephardic = { authorities: [], rulings: {} };
  const shared = { authorities: [], rulings: {} };

  decisions.forEach(decision => {
    const info = AUTHORITY_DISPLAY_NAMES[decision.authority];
    const tradition = info?.tradition || decision.tradition;
    const ruling = decision.ruling || 'unknown';

    const target = tradition === TRADITIONS.ASHKENAZI ? ashkenazi
      : tradition === TRADITIONS.SEPHARDIC ? sephardic
        : shared;

    target.authorities.push({
      name: decision.authority,
      hebrewName: info?.hebrew || decision.authority,
      ruling
    });

    target.rulings[ruling] = (target.rulings[ruling] || 0) + 1;
  });

  // Determine if traditions diverge
  const ashkRulings = Object.keys(ashkenazi.rulings);
  const sephRulings = Object.keys(sephardic.rulings);
  const traditionsConverge = ashkRulings.length === 0 || sephRulings.length === 0 ||
    (ashkRulings.length === 1 && sephRulings.length === 1 && ashkRulings[0] === sephRulings[0]);

  return {
    ashkenazi,
    sephardic,
    shared,
    traditionsConverge,
    summary: traditionsConverge
      ? 'שתי המסורות מסכימות בנושא זה'
      : 'המסורות האשכנזית והספרדית חלוקות'
  };
};

/**
 * Get consensus level description
 */
export const getConsensusLevel = (majorityResult) => {
  if (!majorityResult) return 'unknown';
  if (majorityResult.primaryDecisors.agree >= 2) return 'strong';
  if (majorityResult.primaryDecisors.agree >= 1) return 'moderate';
  if (majorityResult.isMajority) return 'weak';
  return 'disputed';
};

/**
 * Format majority result for display
 */
export const formatMajorityResult = (majorityResult) => {
  if (!majorityResult || !majorityResult.ruling) {
    return { text: 'אין הכרעה', color: 'gray', icon: '?' };
  }

  const level = getConsensusLevel(majorityResult);

  const formats = {
    strong: { text: `רוב ברור: ${majorityResult.ruling}`, color: 'green', icon: '✓' },
    moderate: { text: `דעת רוב: ${majorityResult.ruling}`, color: 'blue', icon: '◯' },
    weak: { text: `נוטה ל: ${majorityResult.ruling}`, color: 'yellow', icon: '~' },
    disputed: { text: 'מחלוקת שקולה', color: 'orange', icon: '⚖' },
    unknown: { text: 'אין הכרעה', color: 'gray', icon: '?' }
  };

  return formats[level] || formats.unknown;
};

/**
 * Enrich psak with Acharonim support data.
 * After we fetch Acharonim, we can map which ones support Mechaber vs Rema.
 */
export const enrichPsakWithAcharonim = (psak, acharonimDecisions) => {
  if (!psak || !acharonimDecisions) return psak;

  const mechaberRuling = psak.mechaber?.ruling;
  const remaRuling = psak.rema?.ruling;

  const mechaberSupporters = [];
  const remaSupporters = [];
  const minorityPositions = [...(psak.minorityPositions || [])];

  acharonimDecisions.forEach(d => {
    if (d.ruling === mechaberRuling) {
      mechaberSupporters.push(d.hebrewName || d.authority);
    } else if (d.ruling === remaRuling && remaRuling && remaRuling !== mechaberRuling) {
      remaSupporters.push(d.hebrewName || d.authority);
    } else if (d.ruling && d.ruling !== 'relevant' && d.ruling !== 'comments' &&
               d.ruling !== mechaberRuling && d.ruling !== remaRuling) {
      // Track acharon opinions that differ from both Mechaber and Rema
      const existing = minorityPositions.find(p => p.ruling === d.ruling);
      if (existing) {
        existing.authorities.push({ name: d.authority, hebrewName: d.hebrewName || d.authority });
        existing.count++;
      } else {
        minorityPositions.push({
          ruling: d.ruling,
          authorities: [{ name: d.authority, hebrewName: d.hebrewName || d.authority }],
          count: 1,
          isSignificant: false,
          tradition: d.tradition
        });
      }
    }
  });

  // Update halacha lemaaseh with supporter info
  let halachaLemaaseh = psak.halachaLemaaseh || '';
  if (mechaberSupporters.length > 0 || remaSupporters.length > 0) {
    const parts = [];
    if (mechaberSupporters.length > 0) {
      parts.push(`המחבר נתמך ע"י: ${mechaberSupporters.join(', ')}`);
    }
    if (remaSupporters.length > 0) {
      parts.push(`הרמ"א נתמך ע"י: ${remaSupporters.join(', ')}`);
    }
    halachaLemaaseh = halachaLemaaseh ? `${halachaLemaaseh}. ${parts.join('. ')}` : parts.join('. ');
  }

  return {
    ...psak,
    mechaber: psak.mechaber ? { ...psak.mechaber, supportedBy: mechaberSupporters } : null,
    rema: psak.rema ? { ...psak.rema, supportedBy: remaSupporters } : null,
    minorityPositions,
    halachaLemaaseh
  };
};
