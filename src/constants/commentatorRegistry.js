/**
 * Commentator Registry - Single Source of Truth
 * Consolidates metadata from SourceBadge.js and SourceChainView.js
 */

// Era definitions with CSS variable references
export const ERAS = {
  targum: { name: 'Targum', hebrew: 'תרגום', cssVar: '--accent-emerald' },
  rishonim: { name: 'Rishonim', hebrew: 'ראשונים', cssVar: '--primary' },
  acharonim: { name: 'Acharonim', hebrew: 'אחרונים', cssVar: '--accent-amber' }
};

// Commentator database
export const COMMENTATORS = {
  onkelos: {
    name: 'Onkelos', hebrew: 'אונקלוס', full: 'Onkelos the Convert',
    dates: '~35-120 CE', location: 'Israel', era: 'targum',
    icon: '📜', color: '#059669', method: 'Aramaic translation',
    teachers: [], students: [], respondsTo: []
  },
  rashi: {
    name: 'Rashi', hebrew: 'רש״י', full: 'Rabbi Shlomo Yitzchaki',
    dates: '1040-1105', location: 'France', era: 'rishonim',
    icon: '📖', color: '#4f46e5', method: 'Peshat',
    teachers: [], students: ['rashbam'], respondsTo: []
  },
  tosafot: {
    name: 'Tosafot', hebrew: 'תוספות', full: 'Baalei HaTosafot',
    dates: '1100-1300', location: 'France/Germany', era: 'rishonim',
    icon: '📚', color: '#dc2626', method: 'Dialectical analysis',
    teachers: ['rashi'], students: [], respondsTo: ['rashi']
  },
  ramban: {
    name: 'Ramban', hebrew: 'רמב״ן', full: 'Rabbi Moshe ben Nachman',
    dates: '1194-1270', location: 'Spain → Israel', era: 'rishonim',
    icon: '🔮', color: '#7c3aed', method: 'Kabbalah & Peshat',
    teachers: [], students: [], respondsTo: ['rashi', 'ibn_ezra']
  },
  ibn_ezra: {
    name: 'Ibn Ezra', hebrew: 'אבן עזרא', full: 'Rabbi Avraham ibn Ezra',
    dates: '1089-1167', location: 'Spain', era: 'rishonim',
    icon: '🔤', color: '#2563eb', method: 'Grammar & linguistics',
    teachers: [], students: [], respondsTo: ['rashi']
  },
  sforno: {
    name: 'Sforno', hebrew: 'ספורנו', full: 'Rabbi Ovadia Sforno',
    dates: '1475-1550', location: 'Italy', era: 'acharonim',
    icon: '💡', color: '#0891b2', method: 'Philosophy',
    teachers: [], students: [], respondsTo: []
  },
  maharsha: {
    name: 'Maharsha', hebrew: 'מהרש״א', full: 'Rabbi Shmuel Eliezer Eidels',
    dates: '1555-1631', location: 'Poland', era: 'acharonim',
    icon: '🎓', color: '#d97706', method: 'Halacha & Aggada',
    teachers: [], students: [], respondsTo: ['rashi', 'tosafot']
  },
  rambam: {
    name: 'Rambam', hebrew: 'רמב״ם', full: 'Rabbi Moshe ben Maimon',
    dates: '1138-1204', location: 'Spain/Egypt', era: 'rishonim',
    icon: '⚖️', color: '#dc2626', method: 'Halacha & Philosophy',
    teachers: [], students: [], respondsTo: []
  },
  radak: {
    name: 'Radak', hebrew: 'רד״ק', full: 'Rabbi David Kimchi',
    dates: '1160-1235', location: 'Provence', era: 'rishonim',
    icon: '📖', color: '#0891b2', method: 'Grammar & Peshat',
    teachers: [], students: [], respondsTo: []
  },
  ohr_hachaim: {
    name: 'Ohr HaChaim', hebrew: 'אור החיים', full: 'Rabbi Chaim ibn Attar',
    dates: '1696-1743', location: 'Morocco/Israel', era: 'acharonim',
    icon: '✨', color: '#d97706', method: 'Kabbalah',
    teachers: [], students: [], respondsTo: ['rashi', 'ramban']
  },
  kli_yakar: {
    name: 'Kli Yakar', hebrew: 'כלי יקר', full: 'Rabbi Shlomo Luntschitz',
    dates: '1550-1619', location: 'Poland', era: 'acharonim',
    icon: '💎', color: '#d97706', method: 'Mussar',
    teachers: [], students: [], respondsTo: ['rashi']
  },
  malbim: {
    name: 'Malbim', hebrew: 'מלבי״ם', full: 'Rabbi Meir Leibush',
    dates: '1809-1879', location: 'Ukraine', era: 'acharonim',
    icon: '📐', color: '#d97706', method: 'Grammar',
    teachers: [], students: [], respondsTo: []
  },
  hirsch: {
    name: 'Hirsch', hebrew: 'רש״ר הירש', full: 'Rabbi Samson Raphael Hirsch',
    dates: '1808-1888', location: 'Germany', era: 'acharonim',
    icon: '🌍', color: '#d97706', method: 'Philosophy',
    teachers: [], students: [], respondsTo: []
  },
  rashbam: {
    name: 'Rashbam', hebrew: 'רשב״ם', full: 'Rabbi Shmuel ben Meir',
    dates: '1085-1158', location: 'France', era: 'rishonim',
    icon: '📝', color: '#2563eb', method: 'Strict Peshat',
    teachers: ['rashi'], students: [], respondsTo: ['rashi']
  },
  chizkuni: {
    name: 'Chizkuni', hebrew: 'חזקוני', full: 'Rabbi Chizkiyahu ben Manoach',
    dates: '~1250', location: 'France', era: 'rishonim',
    icon: '📚', color: '#2563eb', method: 'Synthesis',
    teachers: [], students: [], respondsTo: ['rashi']
  },
  ralbag: {
    name: 'Ralbag', hebrew: 'רלב״ג', full: 'Rabbi Levi ben Gershon',
    dates: '1288-1344', location: 'France', era: 'rishonim',
    icon: '🔭', color: '#0891b2', method: 'Philosophy & Science',
    teachers: [], students: [], respondsTo: []
  },
  abarbanel: {
    name: 'Abarbanel', hebrew: 'אברבנאל', full: 'Rabbi Don Isaac Abarbanel',
    dates: '1437-1508', location: 'Spain/Italy', era: 'rishonim',
    icon: '👑', color: '#7c3aed', method: 'Political & Historical',
    teachers: [], students: [], respondsTo: []
  },
  alshich: {
    name: 'Alshich', hebrew: 'אלשיך', full: 'Rabbi Moshe Alshich',
    dates: '1508-1593', location: 'Safed', era: 'acharonim',
    icon: '🌟', color: '#d97706', method: 'Drash',
    teachers: [], students: [], respondsTo: []
  },
  rabbeinu_bachya: {
    name: 'Rabbeinu Bachya', hebrew: 'רבינו בחיי', full: 'Rabbeinu Bachya ibn Paquda',
    dates: '1050-1120', location: 'Spain', era: 'rishonim',
    icon: '❤️', color: '#dc2626', method: 'Mussar & Kabbalah',
    teachers: [], students: [], respondsTo: []
  }
};

// Helper functions
export const getCommentator = (id) => {
  if (!id) return null;
  const key = id.toLowerCase().replace(/[\s-]+/g, '_');
  if (COMMENTATORS[key]) return { id: key, ...COMMENTATORS[key] };
  return Object.entries(COMMENTATORS).find(([, c]) =>
    c.name.toLowerCase() === id.toLowerCase() || c.hebrew === id
  )?.[1] || null;
};

export const getCommentatorColor = (id) => getCommentator(id)?.color || '#6b7280';
export const getCommentatorIcon = (id) => getCommentator(id)?.icon || '📖';
export const getDisplayName = (id, hebrew = true) => {
  const c = getCommentator(id);
  return c ? (hebrew ? c.hebrew : c.name) : id;
};
export const getEra = (id) => ERAS[getCommentator(id)?.era] || null;
export const getByEra = (era) => Object.entries(COMMENTATORS)
  .filter(([, c]) => c.era === era).map(([id, c]) => ({ id, ...c }));
export const getSorted = () => Object.entries(COMMENTATORS)
  .map(([id, c]) => ({ id, ...c }))
  .sort((a, b) => parseInt(a.dates) - parseInt(b.dates));

// Commentator categories for UI organization
export const COMMENTATOR_CATEGORIES = {
  primary: ['rashi', 'ramban', 'ibn_ezra', 'sforno', 'rashbam', 'onkelos', 'rabbeinu_bachya', 'ohr_hachaim'],
  rishonim: ['radak', 'ralbag', 'abarbanel', 'chizkuni', 'tosafot'],
  acharonim: ['maharsha', 'kli_yakar', 'malbim', 'alshich', 'hirsch'],
  modern: ['steinsaltz', 'artscroll']
};

export const getCategoryForCommentator = (id) => {
  const key = id?.toLowerCase().replace(/[\s-]+/g, '_');
  for (const [cat, list] of Object.entries(COMMENTATOR_CATEGORIES)) {
    if (list.includes(key)) return cat;
  }
  return 'other';
};

// Legacy export for backward compatibility with SourceBadge.js
export const COMMENTARY_SOURCE_META = Object.fromEntries(
  Object.entries(COMMENTATORS).map(([, c]) => [c.name, {
    icon: c.icon, color: c.color, hebrewName: c.hebrew, fullName: c.full,
    shortDesc: c.method, dates: c.dates, location: c.location,
    era: ERAS[c.era]?.name, eraColor: c.color, methodology: c.method
  }])
);

export default COMMENTATORS;
