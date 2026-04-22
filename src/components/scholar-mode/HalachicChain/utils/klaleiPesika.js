/**
 * כללי הפסיקה — Rules of Halachic Decision
 *
 * Traditional rules that connect the layers of the שושלת הוראה and
 * explain WHY a particular opinion becomes the final psak.
 */

// ═══════════════════════════════════════════════════════════
// Rule databases — one per layer
// ═══════════════════════════════════════════════════════════

export const TANNAIM_RULES = [
  {
    id: 'beit_hillel',
    rule: 'הלכה כבית הלל',
    explanation: 'לאחר שיצאה בת קול ואמרה הלכה כבית הלל (עירובין יג ע"ב)',
    applies: (ops) =>
      ops.some(o => o.authority === 'Beit Hillel') &&
      ops.some(o => o.authority === 'Beit Shammai'),
    winner: 'Beit Hillel'
  },
  {
    id: 'stam_mishnah',
    rule: 'הלכה כסתם משנה',
    explanation: 'משנה סתמית משקפת את דעת הרוב שנתקבלה על ידי רבי (סנהדרין פו ע"א)',
    applies: (ops) => ops.some(o =>
      o.authority === 'Tanna Kama' || o.authority === 'Stam Mishnah'
    ),
    winner: 'Tanna Kama'
  },
  {
    id: 'rabbi_yose',
    rule: 'הלכה כרבי יוסי מחבירו',
    explanation: 'נימוקו עמו (עירובין מו ע"ב)',
    applies: (ops) =>
      ops.some(o => o.authority === 'Rabbi Yose') && ops.length <= 3,
    winner: 'Rabbi Yose'
  },
  {
    id: 'rabbi_yehuda_vs_meir',
    rule: 'הלכה כרבי יהודה נגד רבי מאיר',
    explanation: 'כאשר חולקים רבי יהודה ורבי מאיר, הלכה כרבי יהודה (עירובין מו ע"ב)',
    applies: (ops) =>
      ops.some(o => o.authority === 'Rabbi Yehuda') &&
      ops.some(o => o.authority === 'Rabbi Meir') &&
      !ops.some(o => o.authority !== 'Rabbi Yehuda' && o.authority !== 'Rabbi Meir'),
    winner: 'Rabbi Yehuda'
  },
  {
    id: 'rabim',
    rule: 'יחיד ורבים הלכה כרבים',
    explanation: 'העיקרון היסודי: הולכים אחר דעת הרוב (ברכות ט ע"א)',
    applies: (ops) => {
      if (ops.length < 3) return false;
      const counts = {};
      ops.forEach(o => { counts[o.ruling || 'unknown'] = (counts[o.ruling || 'unknown'] || 0) + 1; });
      const vals = Object.values(counts);
      return vals.some(c => c > 1) && vals.some(c => c === 1);
    },
    winner: null // Dynamic — whoever has majority
  },
  {
    id: 'rabbi_akiva',
    rule: 'הלכה כרבי עקיבא מחבירו',
    explanation: 'רבי עקיבא מייצג את דעת הרוב של דורו (עירובין מו ע"ב)',
    applies: (ops) =>
      ops.some(o => o.authority === 'Rabbi Akiva') && ops.length <= 3,
    winner: 'Rabbi Akiva'
  }
];

export const GEMARA_RULES = [
  { id: 'talmid_rav', rule: 'אין הלכה כתלמיד במקום הרב',
    explanation: 'דעת התלמיד אינה דוחה את דעת רבו' },
  { id: 'batrai', rule: 'הלכה כבתראי',
    explanation: 'האמוראים המאוחרים שראו את הדיונים הקודמים, דברם אחרון (רק בין אמוראים)' },
  { id: 'rava_abaye', rule: 'הלכה כרבא לגבי אביי חוץ מיע"ל קג"ם',
    explanation: 'שש החריגות: יאוש שלא מדעת, עד זומם, לחי העומד מאליו, קידושין שלא נמסרו לביאה, גילוי דעת, מומר' },
  { id: 'shakla_conclusion', rule: 'מסקנת הגמרא',
    explanation: 'המסקנה הסופית של השקלא וטריא קובעת את ההלכה' }
];

export const RISHONIM_RULES = [
  { id: 'three_pillars', rule: 'הלכה כשניים מתוך שלושה: רי"ף, רמב"ם, ר"אש',
    explanation: 'שיטת הבית יוסף היסודית לקביעת פסק השולחן ערוך',
    primaryDecisors: ['Rif', 'Rambam', 'Rosh'] },
  { id: 'rashi_tosafot', rule: 'רש"י ותוספות — פרשנות יסודית',
    explanation: 'אינם עמודי ההוראה, אך פרשנותם מעצבת את הבנת הסוגיא' },
  { id: 'minhag_hamakom', rule: 'מנהג המקום',
    explanation: 'כאשר הראשונים שקולים, מנהג המקום עשוי להכריע' }
];

export const SHULCHAN_ARUCH_RULES = [
  { id: 'mechaber_sephardic', rule: 'ספרדים הולכים אחר המחבר',
    explanation: 'השולחן ערוך הוא המקור העיקרי לפסיקה ספרדית' },
  { id: 'rema_ashkenazi', rule: 'אשכנזים הולכים אחר הרמ"א',
    explanation: 'במקום שהרמ"א מוסיף הגה, אשכנזים הולכים אחר פסיקתו' },
  { id: 'mechaber_no_rema', rule: 'כשאין הגה — גם אשכנזים הולכים אחר המחבר',
    explanation: 'שתיקת הרמ"א מעידה על הסכמה עם המחבר' },
  { id: 'acharonim_override', rule: 'אחרונים יכולים לפסוק נגד השולחן ערוך',
    explanation: 'כאשר רוב ברור של האחרונים חולק, דעתם עשויה להכריע' }
];

const PRIMARY_DECISORS = ['Rif', 'Rambam', 'Rosh'];

// ═══════════════════════════════════════════════════════════
// Main analysis — apply rules to chain data
// ═══════════════════════════════════════════════════════════

/**
 * Analyze which כללי הפסיקה apply to the current sugya
 * and explain WHY the psak came out as it did.
 */
export const analyzeKlaleiPesika = (chainData) => {
  const result = { applicableRules: [], psakReasoning: '', educationalNotes: [] };
  if (!chainData?.layers) return result;

  const { mishnah, rishonim, psak } = chainData.layers;

  if (mishnah?.opinions?.length > 0) {
    result.applicableRules.push(...analyzeTannaimRules(mishnah.opinions));
  }

  if (rishonim?.decisions?.length > 0) {
    const { rules, reasoning } = analyzeRishonimRules(rishonim.decisions);
    result.applicableRules.push(...rules);
    if (reasoning) result.psakReasoning = reasoning;
  }

  if (psak?.psak) {
    result.applicableRules.push(...analyzePsakRules(psak.psak));
  }

  result.educationalNotes = buildEducationalNotes(result.applicableRules);
  return result;
};

/**
 * Which Tannaim rules apply given these opinions?
 */
const analyzeTannaimRules = (opinions) =>
  TANNAIM_RULES
    .filter(rule => rule.applies(opinions))
    .map(rule => ({
      ...rule,
      layer: 'mishnah',
      relevantAuthorities: opinions.map(o => o.authority),
      predictedWinner: rule.winner
    }));

/**
 * Apply the Beit Yosef 3-pillar methodology to Rishonim decisions
 */
const analyzeRishonimRules = (decisions) => {
  const primaryVotes = {};
  decisions.forEach(d => {
    if (PRIMARY_DECISORS.includes(d.authority)) primaryVotes[d.authority] = d.ruling;
  });

  if (Object.keys(primaryVotes).length < 2) return { rules: [], reasoning: '' };

  const counts = {};
  Object.values(primaryVotes).forEach(r => { counts[r] = (counts[r] || 0) + 1; });
  const [topRuling, topCount] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];

  if (topCount >= 2) {
    const agreeing = Object.entries(primaryVotes)
      .filter(([, r]) => r === topRuling)
      .map(([name]) => name);

    const reasoning = `${agreeing.join(' ו')} מסכימים על "${topRuling}" (${topCount} מתוך 3 עמודים). ` +
      `זוהי שיטת הבית יוסף: השולחן ערוך הולך אחר רוב רי"ף, רמב"ם ור"אש.`;

    return {
      reasoning,
      rules: [{
        id: 'three_pillars_applied',
        rule: RISHONIM_RULES[0].rule,
        explanation: reasoning,
        layer: 'rishonim',
        predictedWinner: topRuling,
        votes: primaryVotes
      }]
    };
  }

  const reasoning = 'שלושת עמודי ההוראה (רי"ף, רמב"ם, ר"אש) חלוקים. הבית יוסף שוקל גורמים נוספים.';
  return {
    reasoning,
    rules: [{
      id: 'three_pillars_split',
      rule: 'שלושת עמודי ההוראה חלוקים',
      explanation: reasoning,
      layer: 'rishonim',
      votes: primaryVotes
    }]
  };
};

/**
 * Mechaber/Rema dynamics — which SA rules apply?
 */
const analyzePsakRules = (psak) => {
  const rules = [];

  if (psak.traditionsAgree) {
    rules.push({
      id: 'traditions_agree',
      rule: 'מחבר ורמ"א מסכימים',
      explanation: 'שתי הקהילות — ספרדים ואשכנזים — הולכות אחר אותה פסיקה',
      layer: 'psak'
    });
  } else {
    rules.push({ ...SHULCHAN_ARUCH_RULES[0], layer: 'psak' });
    rules.push({ ...SHULCHAN_ARUCH_RULES[1], layer: 'psak' });
  }

  if (!psak.rema) {
    rules.push({ ...SHULCHAN_ARUCH_RULES[2], layer: 'psak' });
  }

  return rules;
};

// ═══════════════════════════════════════════════════════════
// Educational notes — student-facing summaries
// ═══════════════════════════════════════════════════════════

const buildEducationalNotes = (applicableRules) => {
  const notes = [];
  const byLayer = (layer) => applicableRules.find(r => r.layer === layer);

  const mishnahRule = byLayer('mishnah');
  if (mishnahRule) {
    notes.push({
      layer: 'mishnah',
      type: 'rule_application',
      title: mishnahRule.rule,
      text: mishnahRule.explanation,
      predictedWinner: mishnahRule.predictedWinner
    });
  }

  const rishonimRule = byLayer('rishonim');
  if (rishonimRule) {
    notes.push({
      layer: 'rishonim',
      type: 'methodology',
      title: rishonimRule.rule,
      text: rishonimRule.explanation,
      predictedWinner: rishonimRule.predictedWinner
    });
  }

  const psakRules = applicableRules.filter(r => r.layer === 'psak');
  if (psakRules.length > 0) {
    const hasSplit = psakRules.some(r => r.id === 'mechaber_sephardic');
    notes.push({
      layer: 'psak',
      type: hasSplit ? 'tradition_split' : 'unified',
      title: hasSplit ? 'המסורות חלוקות כאן' : 'פסק מאוחד',
      text: hasSplit
        ? 'ספרדים הולכים אחר המחבר, אשכנזים הולכים אחר הרמ"א. בדוק את האחרונים של כל מסורת להוראה מעשית.'
        : 'שתי המסורות מסכימות בפסק זה. ההלכה ברורה.'
    });
  }

  notes.push({
    layer: 'summary',
    type: 'chain_summary',
    title: 'סיכום זרימת דעות',
    text: buildChainSummary(applicableRules)
  });

  return notes;
};

const buildChainSummary = (rules) => {
  const parts = [];
  const byLayer = (layer) => rules.find(r => r.layer === layer);

  const mishnah = byLayer('mishnah');
  if (mishnah?.predictedWinner) {
    parts.push(`במשנה, הכלל "${mishnah.rule}" מלמד שדעת ${mishnah.predictedWinner} גוברת.`);
  }

  const rishonim = byLayer('rishonim');
  if (rishonim?.predictedWinner) {
    parts.push(`רוב הראשונים (לפי שיטת הבית יוסף) פוסקים: ${rishonim.predictedWinner}.`);
  } else if (rishonim?.id === 'three_pillars_split') {
    parts.push('שלושת הראשונים העיקריים חלוקים, נדרש ניתוח נוסף.');
  }

  const psak = byLayer('psak');
  if (psak?.id === 'traditions_agree') {
    parts.push('השולחן ערוך והרמ"א מסכימים — זוהי ההלכה המקובלת לכלל הקהילות.');
  } else if (psak) {
    parts.push('המחבר והרמ"א חולקים — ספרדים ואשכנזים הולכים אחר פסיקות שונות.');
  }

  return parts.join(' ') || 'ניתוח השושלת בעיצומו.';
};

const klaleiPesika = {
  TANNAIM_RULES,
  GEMARA_RULES,
  RISHONIM_RULES,
  SHULCHAN_ARUCH_RULES,
  analyzeKlaleiPesika
};

export default klaleiPesika;
