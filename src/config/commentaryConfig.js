/**
 * Commentary Configuration - Shared metadata for all commentary components
 * Centralized scholarly information about commentators
 */

// PARDES methodology categories
export const PARDES = {
  PESHAT: { id: 'peshat', label: 'פשט', name: 'Peshat', desc: 'Plain/literal meaning' },
  REMEZ: { id: 'remez', label: 'רמז', name: 'Remez', desc: 'Allegorical hints' },
  DERASH: { id: 'derash', label: 'דרש', name: 'Derash', desc: 'Homiletical interpretation' },
  SOD: { id: 'sod', label: 'סוד', name: 'Sod', desc: 'Mystical/hidden meaning' }
};

// Era classifications
export const ERA = {
  TANNAIM: { id: 'tannaim', label: 'תנאים', name: 'Tannaim', period: '10-220 CE' },
  AMORAIM: { id: 'amoraim', label: 'אמוראים', name: 'Amoraim', period: '220-500 CE' },
  GEONIM: { id: 'geonim', label: 'גאונים', name: 'Geonim', period: '600-1000 CE' },
  RISHONIM: { id: 'rishonim', label: 'ראשונים', name: 'Rishonim', period: '1000-1500 CE' },
  ACHARONIM: { id: 'acharonim', label: 'אחרונים', name: 'Acharonim', period: '1500-present' },
  TARGUM: { id: 'targum', label: 'תרגום', name: 'Targum', period: 'Ancient translations' }
};

// Commentary metadata with scholarly info
export const COMMENTARY_INFO = {
  // Torah commentaries - Rishonim
  'Rashi': {
    hebrewName: 'רש״י',
    fullName: 'Rabbi Shlomo Yitzchaki',
    fullNameHe: 'רבי שלמה יצחקי',
    location: 'Troyes, France',
    dates: '1040-1105',
    era: ERA.RISHONIM,
    approach: [PARDES.PESHAT, PARDES.DERASH],
    methodology: 'Concise explanation synthesizing Midrash with plain meaning',
    description: 'The foundational commentary on Torah and Talmud',
    color: '#4f46e5',
    importance: 'primary',
    icon: '📖'
  },
  'Ramban': {
    hebrewName: 'רמב״ן',
    fullName: 'Rabbi Moshe ben Nachman (Nachmanides)',
    fullNameHe: 'רבי משה בן נחמן',
    location: 'Girona, Spain',
    dates: '1194-1270',
    era: ERA.RISHONIM,
    approach: [PARDES.PESHAT, PARDES.SOD],
    methodology: 'Philosophical depth with Kabbalistic insights',
    description: 'Deep philosophical and mystical analysis',
    color: '#7c3aed',
    importance: 'primary',
    icon: '📿'
  },
  'Ibn Ezra': {
    hebrewName: 'אבן עזרא',
    fullName: 'Rabbi Avraham ibn Ezra',
    fullNameHe: 'רבי אברהם אבן עזרא',
    location: 'Spain (traveling)',
    dates: '1089-1167',
    era: ERA.RISHONIM,
    approach: [PARDES.PESHAT],
    methodology: 'Grammatical precision and rational analysis',
    description: 'Linguistic and grammatical focus',
    color: '#2563eb',
    importance: 'primary',
    icon: '🌟'
  },
  'Sforno': {
    hebrewName: 'ספורנו',
    fullName: 'Rabbi Ovadia Sforno',
    fullNameHe: 'רבי עובדיה ספורנו',
    location: 'Bologna, Italy',
    dates: '1475-1550',
    era: ERA.ACHARONIM,
    approach: [PARDES.PESHAT],
    methodology: 'Renaissance humanism meets Torah scholarship',
    description: 'Philosophical and ethical interpretations',
    color: '#0891b2',
    importance: 'secondary',
    icon: '💎'
  },
  'Onkelos': {
    hebrewName: 'תרגום אונקלוס',
    fullName: 'Onkelos the Convert',
    fullNameHe: 'אונקלוס הגר',
    location: 'Land of Israel',
    dates: '~35-120 CE',
    era: ERA.TARGUM,
    approach: [PARDES.PESHAT],
    methodology: 'Authoritative Aramaic translation avoiding anthropomorphisms',
    description: 'Official Aramaic translation of the Torah',
    color: '#059669',
    importance: 'primary',
    icon: '🔤'
  },
  'Targum Jonathan': {
    hebrewName: 'תרגום יונתן',
    fullName: 'Attributed to Jonathan ben Uzziel',
    fullNameHe: 'יונתן בן עוזיאל',
    location: 'Land of Israel',
    dates: '~1st century CE',
    era: ERA.TARGUM,
    approach: [PARDES.PESHAT, PARDES.DERASH],
    methodology: 'Expansive Aramaic paraphrase with midrashic elements',
    description: 'Aramaic translation of Prophets',
    color: '#047857',
    importance: 'secondary',
    icon: '📜'
  },
  'Tosafot': {
    hebrewName: 'תוספות',
    fullName: 'Tosafists (Franco-German school)',
    fullNameHe: 'בעלי התוספות',
    location: 'France & Germany',
    dates: '12th-14th century',
    era: ERA.RISHONIM,
    approach: [PARDES.PESHAT, PARDES.DERASH],
    methodology: 'Critical analysis comparing passages across Talmud',
    description: 'Dialectical commentary on Talmud',
    color: '#dc2626',
    importance: 'primary',
    icon: '📚'
  },
  'Maharsha': {
    hebrewName: 'מהרש״א',
    fullName: 'Rabbi Shmuel Eidels',
    fullNameHe: 'רבי שמואל אליעזר הלוי איידלס',
    location: 'Poland',
    dates: '1555-1631',
    era: ERA.ACHARONIM,
    approach: [PARDES.DERASH],
    methodology: 'Deep analysis of aggadic and halachic passages',
    description: 'Profound insights on Talmud and Rashi/Tosafot',
    color: '#d97706',
    importance: 'secondary',
    icon: '✨'
  }
};

// Tab configurations for different text types
export const TORAH_TABS = [
  { id: 'targum', source: 'Onkelos' },
  { id: 'rashi', source: 'Rashi' },
  { id: 'ramban', source: 'Ramban' },
  { id: 'ibnEzra', source: 'Ibn Ezra' },
  { id: 'sforno', source: 'Sforno' }
];

export const TALMUD_TABS = [
  { id: 'rashi', source: 'Rashi' },
  { id: 'tosafot', source: 'Tosafot' },
  { id: 'maharsha', source: 'Maharsha' }
];

// Helper to get commentary info
export const getCommentaryInfo = (source) => COMMENTARY_INFO[source] || null;

// Helper to get icon for source
export const getCommentaryIcon = (source) => COMMENTARY_INFO[source]?.icon || '📝';

// Helper to get color for source
export const getCommentaryColor = (source) => COMMENTARY_INFO[source]?.color || '#6b7280';
