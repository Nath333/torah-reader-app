/**
 * כללי הפסיקה — Rules of Halachic Decision
 *
 * The traditional rules that govern how the halacha is decided at each layer.
 * These rules are what connects the layers of the שושלת הוראה and explain
 * WHY a particular opinion becomes the final psak.
 *
 * Layer flow:
 *   Tannaim rules → Amoraim rules → Rishonim methodology → SA methodology → Acharonim
 */

// ═══════════════════════════════════════════════════════════
// I. כללי הפסיקה בין התנאים — Rules among Tannaim
// ═══════════════════════════════════════════════════════════

export const TANNAIM_RULES = [
  {
    id: 'beit_hillel',
    rule: 'הלכה כבית הלל',
    english: 'The halacha follows Beit Hillel against Beit Shammai',
    explanation: 'After the Bat Kol declared the halacha follows Beit Hillel, this is the universal rule (Eruvin 13b)',
    applies: (opinions) => {
      const hasBH = opinions.some(o => o.authority === 'Beit Hillel');
      const hasBS = opinions.some(o => o.authority === 'Beit Shammai');
      return hasBH && hasBS;
    },
    winner: 'Beit Hillel'
  },
  {
    id: 'stam_mishnah',
    rule: 'הלכה כסתם משנה',
    english: 'The halacha follows an anonymous Mishnah',
    explanation: 'An unattributed Mishnah represents the majority view accepted by R\' Yehuda HaNasi (Sanhedrin 86a)',
    applies: (opinions) => {
      return opinions.some(o =>
        o.authority === 'Tanna Kama' || o.authority === 'Stam Mishnah'
      );
    },
    winner: 'Tanna Kama'
  },
  {
    id: 'rabbi_yose',
    rule: 'הלכה כרבי יוסי מחבירו',
    english: 'The halacha follows Rabbi Yose against a single peer',
    explanation: 'Because his reasoning (נימוקו עמו) is always well-founded (Eruvin 46b)',
    applies: (opinions) => {
      return opinions.some(o => o.authority === 'Rabbi Yose') && opinions.length <= 3;
    },
    winner: 'Rabbi Yose'
  },
  {
    id: 'rabbi_yehuda_vs_meir',
    rule: 'הלכה כרבי יהודה נגד רבי מאיר',
    english: 'The halacha follows Rabbi Yehuda against Rabbi Meir',
    explanation: 'When these two disagree, the halacha follows R\' Yehuda (Eruvin 46b)',
    applies: (opinions) => {
      const hasYehuda = opinions.some(o => o.authority === 'Rabbi Yehuda');
      const hasMeir = opinions.some(o => o.authority === 'Rabbi Meir');
      return hasYehuda && hasMeir && !opinions.some(o =>
        o.authority !== 'Rabbi Yehuda' && o.authority !== 'Rabbi Meir'
      );
    },
    winner: 'Rabbi Yehuda'
  },
  {
    id: 'rabim',
    rule: 'יחיד ורבים הלכה כרבים',
    english: 'Individual vs. majority — halacha follows the majority',
    explanation: 'The fundamental principle: we follow the majority view (Berakhot 9a)',
    applies: (opinions) => {
      // Check if there is a clear majority (one opinion held by multiple authorities)
      if (opinions.length < 3) return false;
      const authorityCounts = {};
      opinions.forEach(o => {
        const ruling = o.ruling || 'unknown';
        authorityCounts[ruling] = (authorityCounts[ruling] || 0) + 1;
      });
      const counts = Object.values(authorityCounts);
      return counts.some(c => c > 1) && counts.some(c => c === 1);
    },
    winner: null // Dynamic — whoever has majority
  },
  {
    id: 'rabbi_akiva',
    rule: 'הלכה כרבי עקיבא מחבירו',
    english: 'The halacha follows Rabbi Akiva against a single peer',
    explanation: 'R\' Akiva represents the majority view of his generation (Eruvin 46b)',
    applies: (opinions) => {
      return opinions.some(o => o.authority === 'Rabbi Akiva') && opinions.length <= 3;
    },
    winner: 'Rabbi Akiva'
  }
];

// ═══════════════════════════════════════════════════════════
// II. כללי הפסיקה בגמרא — Gemara-level rules
// ═══════════════════════════════════════════════════════════

export const GEMARA_RULES = [
  {
    id: 'talmid_rav',
    rule: 'אין הלכה כתלמיד במקום הרב',
    english: 'The halacha does not follow a student against his teacher',
    explanation: 'A student\'s opinion cannot override his teacher\'s'
  },
  {
    id: 'batrai',
    rule: 'הלכה כבתראי',
    english: 'The halacha follows the later authorities',
    explanation: 'Later Amoraim who saw the earlier debates have the final word (among Amoraim only)'
  },
  {
    id: 'rava_abaye',
    rule: 'הלכה כרבא לגבי אביי חוץ מיע"ל קג"ם',
    english: 'The halacha follows Rava against Abaye, except in 6 cases',
    explanation: 'The 6 exceptions: יאוש שלא מדעת, עד זומם, לחי העומד מאיליו, קידושין שלא נמסרו לביאה, גילוי דעת, מומר'
  },
  {
    id: 'shakla_vetarya_conclusion',
    rule: 'מסקנת הגמרא',
    english: 'The Gemara\'s conclusion',
    explanation: 'The final resolution of the dialectic determines the halacha'
  }
];

// ═══════════════════════════════════════════════════════════
// III. כללי הפסיקה בראשונים — Rishonim methodology
// ═══════════════════════════════════════════════════════════

export const RISHONIM_RULES = [
  {
    id: 'three_pillars',
    rule: 'הלכה כשניים מתוך שלושה: רי"ף, רמב"ם, ר"אש',
    english: 'The halacha follows 2 out of 3: Rif, Rambam, Rosh',
    explanation: 'The Beit Yosef\'s primary methodology for determining the Shulchan Aruch ruling',
    primaryDecisors: ['Rif', 'Rambam', 'Rosh']
  },
  {
    id: 'rashi_tosafot',
    rule: 'רש"י ותוספות — פרשנות יסודית',
    english: 'Rashi and Tosafot as foundational interpretation',
    explanation: 'While not primary decisors, their interpretation shapes how the sugya is understood'
  },
  {
    id: 'minhag_hamakom',
    rule: 'מנהג המקום',
    english: 'Local custom',
    explanation: 'When Rishonim are evenly split, local custom may determine practice'
  }
];

// ═══════════════════════════════════════════════════════════
// IV. כללי הפסיקה בשולחן ערוך — SA methodology
// ═══════════════════════════════════════════════════════════

export const SHULCHAN_ARUCH_RULES = [
  {
    id: 'mechaber_sephardic',
    rule: 'ספרדים הולכים אחר המחבר',
    english: 'Sephardim follow the Mechaber (R\' Yosef Karo)',
    explanation: 'The Shulchan Aruch is the primary source for Sephardic halachic practice'
  },
  {
    id: 'rema_ashkenazi',
    rule: 'אשכנזים הולכים אחר הרמ"א',
    english: 'Ashkenazim follow the Rema (R\' Moshe Isserles)',
    explanation: 'Where the Rema adds a gloss (הגה), Ashkenazim follow his ruling'
  },
  {
    id: 'mechaber_no_rema',
    rule: 'כשאין הגה — גם אשכנזים הולכים אחר המחבר',
    english: 'Where there is no Rema gloss, Ashkenazim also follow the Mechaber',
    explanation: 'Silence of the Rema implies agreement with the Mechaber'
  },
  {
    id: 'acharonim_override',
    rule: 'אחרונים יכולים לפסוק נגד השולחן ערוך',
    english: 'Later authorities can rule against the Shulchan Aruch',
    explanation: 'When a clear majority of Acharonim disagree, their opinion may prevail'
  }
];

// ═══════════════════════════════════════════════════════════
// V. Analysis Engine — Apply rules to chain data
// ═══════════════════════════════════════════════════════════

/**
 * Analyze which כללי הפסיקה apply to the current sugya
 * and explain WHY the psak came out as it did.
 *
 * @param {Object} chainData - The full halachic chain
 * @returns {Object} Analysis result with applicable rules and reasoning
 */
export const analyzeKlaleiPesika = (chainData) => {
  const result = {
    applicableRules: [],
    psakReasoning: '',
    opinionFlow: [],
    educationalNotes: []
  };

  if (!chainData?.layers) return result;

  // 1. Analyze Mishnah layer — which Tannaim rules apply?
  const mishnahLayer = chainData.layers.mishnah;
  if (mishnahLayer?.opinions?.length > 0) {
    const mishnahRules = analyzeTannaimRules(mishnahLayer.opinions);
    result.applicableRules.push(...mishnahRules);
  }

  // 2. Analyze Rishonim layer — does the 2/3 rule apply?
  const rishonimLayer = chainData.layers.rishonim;
  if (rishonimLayer?.decisions?.length > 0) {
    const rishonimAnalysis = analyzeRishonimRules(rishonimLayer.decisions);
    result.applicableRules.push(...rishonimAnalysis.rules);
    if (rishonimAnalysis.reasoning) {
      result.psakReasoning = rishonimAnalysis.reasoning;
    }
  }

  // 3. Analyze Psak layer — Mechaber/Rema dynamics
  const psakLayer = chainData.layers.psak;
  if (psakLayer?.psak) {
    const psakRules = analyzePsakRules(psakLayer.psak);
    result.applicableRules.push(...psakRules);
  }

  // 4. Build educational notes
  result.educationalNotes = buildEducationalNotes(result.applicableRules, chainData);

  return result;
};

/**
 * Check which Tannaim rules apply to the Mishnah opinions
 */
const analyzeTannaimRules = (opinions) => {
  const applicable = [];

  TANNAIM_RULES.forEach(rule => {
    if (rule.applies(opinions)) {
      applicable.push({
        ...rule,
        layer: 'mishnah',
        relevantAuthorities: opinions.map(o => o.authority),
        predictedWinner: rule.winner
      });
    }
  });

  return applicable;
};

/**
 * Analyze Rishonim decisions using the 3-pillar methodology
 */
const analyzeRishonimRules = (decisions) => {
  const rules = [];
  const primaryDecisors = ['Rif', 'Rambam', 'Rosh'];
  const primaryVotes = {};

  decisions.forEach(d => {
    if (primaryDecisors.includes(d.authority)) {
      primaryVotes[d.authority] = d.ruling;
    }
  });

  const primaryCount = Object.keys(primaryVotes).length;
  let reasoning = '';

  if (primaryCount >= 2) {
    // Check if 2/3 agree
    const rulingCounts = {};
    Object.values(primaryVotes).forEach(ruling => {
      rulingCounts[ruling] = (rulingCounts[ruling] || 0) + 1;
    });

    const maxRuling = Object.entries(rulingCounts).sort((a, b) => b[1] - a[1])[0];
    if (maxRuling && maxRuling[1] >= 2) {
      const agreeingDecisors = Object.entries(primaryVotes)
        .filter(([, ruling]) => ruling === maxRuling[0])
        .map(([name]) => name);

      reasoning = `${agreeingDecisors.join(' and ')} agree on "${maxRuling[0]}" (${maxRuling[1]} of 3 pillars). ` +
        `This is the Beit Yosef methodology: the Shulchan Aruch follows the majority of Rif, Rambam, and Rosh.`;

      rules.push({
        id: 'three_pillars_applied',
        rule: RISHONIM_RULES[0].rule,
        english: RISHONIM_RULES[0].english,
        explanation: reasoning,
        layer: 'rishonim',
        predictedWinner: maxRuling[0],
        votes: primaryVotes
      });
    } else {
      reasoning = 'The three primary decisors (Rif, Rambam, Rosh) are split. ' +
        'The Beit Yosef considers additional factors.';

      rules.push({
        id: 'three_pillars_split',
        rule: 'שלושת עמודי ההוראה חלוקים',
        english: 'The three pillars are divided',
        explanation: reasoning,
        layer: 'rishonim',
        votes: primaryVotes
      });
    }
  }

  return { rules, reasoning };
};

/**
 * Analyze Psak rules — Mechaber/Rema dynamics
 */
const analyzePsakRules = (psak) => {
  const rules = [];

  if (psak.traditionsAgree) {
    rules.push({
      id: 'traditions_agree',
      rule: 'מחבר ורמ"א מסכימים',
      english: 'Mechaber and Rema agree',
      explanation: 'Both Sephardic and Ashkenazi communities follow the same ruling',
      layer: 'psak'
    });
  } else {
    rules.push({
      ...SHULCHAN_ARUCH_RULES[0], // Sephardim follow Mechaber
      layer: 'psak'
    });
    rules.push({
      ...SHULCHAN_ARUCH_RULES[1], // Ashkenazim follow Rema
      layer: 'psak'
    });
  }

  if (!psak.rema) {
    rules.push({
      ...SHULCHAN_ARUCH_RULES[2], // No Rema = all follow Mechaber
      layer: 'psak'
    });
  }

  return rules;
};

/**
 * Build educational notes for the student
 */
const buildEducationalNotes = (applicableRules, chainData) => {
  const notes = [];

  // Note 1: Which layer determines the psak?
  const mishnahRules = applicableRules.filter(r => r.layer === 'mishnah');
  const rishonimRules = applicableRules.filter(r => r.layer === 'rishonim');
  const psakRules = applicableRules.filter(r => r.layer === 'psak');

  if (mishnahRules.length > 0) {
    const rule = mishnahRules[0];
    notes.push({
      layer: 'mishnah',
      type: 'rule_application',
      title: rule.rule,
      text: `${rule.english}. ${rule.explanation}`,
      predictedWinner: rule.predictedWinner
    });
  }

  if (rishonimRules.length > 0) {
    const rule = rishonimRules[0];
    notes.push({
      layer: 'rishonim',
      type: 'methodology',
      title: rule.rule,
      text: rule.explanation,
      predictedWinner: rule.predictedWinner
    });
  }

  if (psakRules.length > 0) {
    const hasSplit = psakRules.some(r => r.id === 'mechaber_sephardic');
    notes.push({
      layer: 'psak',
      type: hasSplit ? 'tradition_split' : 'unified',
      title: hasSplit ? 'Traditions differ here' : 'Unified ruling',
      text: hasSplit
        ? 'Sephardim follow the Mechaber, Ashkenazim follow the Rema. Check each tradition\'s Acharonim for practical guidance.'
        : 'Both traditions agree on this ruling. The halacha is clear.'
    });
  }

  // Note 2: Chain summary
  notes.push({
    layer: 'summary',
    type: 'chain_summary',
    title: 'Opinion Flow Summary',
    text: buildChainSummary(chainData, applicableRules)
  });

  return notes;
};

/**
 * Build a human-readable summary of how the opinion flowed through the chain
 */
const buildChainSummary = (chainData, rules) => {
  const parts = [];

  const mishnahRule = rules.find(r => r.layer === 'mishnah');
  if (mishnahRule?.predictedWinner) {
    parts.push(`In the Mishnah, the rule "${mishnahRule.rule}" suggests ${mishnahRule.predictedWinner}'s opinion should prevail.`);
  }

  const rishonimRule = rules.find(r => r.layer === 'rishonim');
  if (rishonimRule?.predictedWinner) {
    parts.push(`The Rishonim majority (via Beit Yosef methodology) rules: ${rishonimRule.predictedWinner}.`);
  } else if (rishonimRule?.id === 'three_pillars_split') {
    parts.push('The three primary Rishonim are divided, requiring additional analysis.');
  }

  const psakRule = rules.find(r => r.layer === 'psak');
  if (psakRule?.id === 'traditions_agree') {
    parts.push('The Shulchan Aruch and Rema agree — this is the accepted halacha for all communities.');
  } else if (psakRule) {
    parts.push('The Mechaber and Rema disagree — Sephardim and Ashkenazim follow different rulings.');
  }

  return parts.join(' ') || 'Analysis of the chain is in progress.';
};

/**
 * Get all applicable rules for a specific layer
 */
export const getRulesForLayer = (layerId) => {
  switch (layerId) {
    case 'mishnah': return TANNAIM_RULES;
    case 'gemara': return GEMARA_RULES;
    case 'rishonim': return RISHONIM_RULES;
    case 'psak':
    case 'acharonim': return SHULCHAN_ARUCH_RULES;
    default: return [];
  }
};

export default {
  TANNAIM_RULES,
  GEMARA_RULES,
  RISHONIM_RULES,
  SHULCHAN_ARUCH_RULES,
  analyzeKlaleiPesika,
  getRulesForLayer
};
