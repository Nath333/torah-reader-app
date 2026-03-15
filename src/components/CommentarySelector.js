import React, { useState, useEffect, useCallback } from 'react';
import './CommentarySelector.css';
import { getCommentary } from '../services/sefariaApi';
import { removeHtmlTags } from '../utils/sanitize';
import { ClickableHebrewText } from './ClickableText';
import CommentarySummary from './CommentarySummary';
import { getStoredApiKey } from '../services/groqService';

// Commentary categories (PARDES methodology)
const PARDES = {
  PESHAT: { id: 'peshat', label: 'פשט', name: 'Peshat', desc: 'Plain/literal meaning' },
  REMEZ: { id: 'remez', label: 'רמז', name: 'Remez', desc: 'Allegorical hints' },
  DERASH: { id: 'derash', label: 'דרש', name: 'Derash', desc: 'Homiletical interpretation' },
  SOD: { id: 'sod', label: 'סוד', name: 'Sod', desc: 'Mystical/hidden meaning' }
};

// Era classifications
const ERA = {
  TANNAIM: { id: 'tannaim', label: 'תנאים', name: 'Tannaim', period: '10-220 CE' },
  AMORAIM: { id: 'amoraim', label: 'אמוראים', name: 'Amoraim', period: '220-500 CE' },
  GEONIM: { id: 'geonim', label: 'גאונים', name: 'Geonim', period: '600-1000 CE' },
  RISHONIM: { id: 'rishonim', label: 'ראשונים', name: 'Rishonim', period: '1000-1500 CE' },
  ACHARONIM: { id: 'acharonim', label: 'אחרונים', name: 'Acharonim', period: '1500-present' },
  TARGUM: { id: 'targum', label: 'תרגום', name: 'Targum', period: 'Ancient translations' }
};

// Commentary metadata with scholarly info
const COMMENTARY_INFO = {
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
    importance: 'primary'
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
    importance: 'primary'
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
    importance: 'primary'
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
    importance: 'secondary'
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
    importance: 'primary'
  },
  'Targum Jonathan': {
    hebrewName: 'תרגום יונתן',
    fullName: 'Attributed to Jonathan ben Uzziel',
    fullNameHe: 'יונתן בן עוזיאל',
    location: 'Land of Israel',
    dates: '~1st century CE',
    era: ERA.TARGUM,
    approach: [PARDES.PESHAT, PARDES.DERASH],
    methodology: 'Expanded translation with Aggadic material',
    description: 'Aramaic translation of the Prophets',
    color: '#65a30d',
    importance: 'secondary'
  },
  // Talmud commentaries
  'Tosafot': {
    hebrewName: 'תוספות',
    fullName: 'Tosafists (Franco-German School)',
    fullNameHe: 'בעלי התוספות',
    location: 'France & Germany',
    dates: '12th-14th centuries',
    era: ERA.RISHONIM,
    approach: [PARDES.PESHAT],
    methodology: 'Dialectical analysis reconciling Talmudic contradictions',
    description: 'Critical analysis building on Rashi',
    color: '#dc2626',
    importance: 'primary'
  },
  'Rashbam': {
    hebrewName: 'רשב״ם',
    fullName: 'Rabbi Shmuel ben Meir',
    fullNameHe: 'רבי שמואל בן מאיר',
    location: 'Troyes, France',
    dates: '1085-1158',
    era: ERA.RISHONIM,
    approach: [PARDES.PESHAT],
    methodology: 'Strict adherence to peshat, even against Midrash',
    description: 'Rashi\'s grandson, pure peshat approach',
    color: '#ea580c',
    importance: 'secondary'
  },
  'Maharsha': {
    hebrewName: 'מהרש״א',
    fullName: 'Rabbi Shmuel Eidels',
    fullNameHe: 'רבי שמואל אידלש',
    location: 'Poland',
    dates: '1555-1631',
    era: ERA.ACHARONIM,
    approach: [PARDES.DERASH],
    methodology: 'Novellae on Halacha and Aggadah',
    description: 'Deep halachic and aggadic insights',
    color: '#d97706',
    importance: 'secondary'
  },
  'Ritva': {
    hebrewName: 'ריטב״א',
    fullName: 'Rabbi Yom Tov of Seville',
    fullNameHe: 'רבי יום טוב אשבילי',
    location: 'Seville, Spain',
    dates: '1250-1330',
    era: ERA.RISHONIM,
    approach: [PARDES.PESHAT],
    methodology: 'Clear, systematic Talmudic analysis',
    description: 'Spanish school of Talmud commentary',
    color: '#ca8a04',
    importance: 'secondary'
  },
  // Mishnah commentaries
  'Bartenura': {
    hebrewName: 'ברטנורא',
    fullName: 'Rabbi Ovadia of Bartenura',
    fullNameHe: 'רבי עובדיה מברטנורא',
    location: 'Italy → Jerusalem',
    dates: '1445-1515',
    era: ERA.ACHARONIM,
    approach: [PARDES.PESHAT],
    methodology: 'Rashi-style explanation of Mishnah',
    description: 'The "Rashi" of Mishnah commentary',
    color: '#16a34a',
    importance: 'primary'
  },
  'Tosafot Yom Tov': {
    hebrewName: 'תוספות יום טוב',
    fullName: 'Rabbi Yom Tov Lipmann Heller',
    fullNameHe: 'רבי יום טוב ליפמן הלר',
    location: 'Prague, Vienna',
    dates: '1578-1654',
    era: ERA.ACHARONIM,
    approach: [PARDES.PESHAT],
    methodology: 'Supercommentary on Bartenura with additions',
    description: 'Elaborates on Bartenura',
    color: '#0d9488',
    importance: 'secondary'
  },
  'Ikar Tosafot Yom Tov': {
    hebrewName: 'עיקר תוספות יו״ט',
    fullName: 'Abridgement of Tosafot Yom Tov',
    fullNameHe: 'עיקר תוספות יום טוב',
    location: 'Various',
    dates: '17th century',
    era: ERA.ACHARONIM,
    approach: [PARDES.PESHAT],
    methodology: 'Condensed essential points',
    description: 'Abridged Tosafot Yom Tov',
    color: '#0891b2',
    importance: 'tertiary'
  },
  'Rambam': {
    hebrewName: 'רמב״ם',
    fullName: 'Rabbi Moshe ben Maimon (Maimonides)',
    fullNameHe: 'רבי משה בן מימון',
    location: 'Spain → Egypt',
    dates: '1138-1204',
    era: ERA.RISHONIM,
    approach: [PARDES.PESHAT],
    methodology: 'Systematic philosophical and halachic framework',
    description: 'Foundational Mishnah commentary',
    color: '#6366f1',
    importance: 'primary'
  },
  // Additional Torah Commentaries - Acharonim
  'Or HaChaim': {
    hebrewName: 'אור החיים',
    fullName: 'Rabbi Chaim ibn Attar',
    fullNameHe: 'רבי חיים בן עטר',
    location: 'Morocco → Jerusalem',
    dates: '1696-1743',
    era: ERA.ACHARONIM,
    approach: [PARDES.PESHAT, PARDES.DERASH, PARDES.SOD],
    methodology: 'Kabbalistic insights with ethical teachings',
    description: 'Mystical commentary beloved by Chassidim',
    color: '#f59e0b',
    importance: 'primary'
  },
  'Kli Yakar': {
    hebrewName: 'כלי יקר',
    fullName: 'Rabbi Shlomo Ephraim Luntschitz',
    fullNameHe: 'רבי שלמה אפרים לונטשיץ',
    location: 'Prague, Poland',
    dates: '1550-1619',
    era: ERA.ACHARONIM,
    approach: [PARDES.DERASH],
    methodology: 'Homiletical explanations with ethical depth',
    description: 'Profound ethical and moral interpretations',
    color: '#8b5cf6',
    importance: 'secondary'
  },
  'Malbim': {
    hebrewName: 'מלבי״ם',
    fullName: 'Rabbi Meir Leibush ben Yechiel Michel Wisser',
    fullNameHe: 'רבי מאיר ליבוש בן יחיאל מיכל',
    location: 'Russia, Romania',
    dates: '1809-1879',
    era: ERA.ACHARONIM,
    approach: [PARDES.PESHAT],
    methodology: 'Linguistic precision showing no word is superfluous',
    description: 'Grammatical precision defending tradition',
    color: '#3b82f6',
    importance: 'secondary'
  },
  'Rabbeinu Bahya': {
    hebrewName: 'רבינו בחיי',
    fullName: 'Rabbi Bahya ben Asher ibn Halawa',
    fullNameHe: 'רבי בחיי בן אשר אבן חלאווה',
    location: 'Saragossa, Spain',
    dates: '1255-1340',
    era: ERA.RISHONIM,
    approach: [PARDES.PESHAT, PARDES.REMEZ, PARDES.DERASH, PARDES.SOD],
    methodology: 'Systematic four-level PaRDeS interpretation',
    description: 'Master of all four levels of interpretation',
    color: '#ec4899',
    importance: 'secondary'
  },
  'Chizkuni': {
    hebrewName: 'חזקוני',
    fullName: 'Rabbi Hezekiah ben Manoah',
    fullNameHe: 'רבי חזקיה בן מנוח',
    location: 'France',
    dates: '13th century',
    era: ERA.RISHONIM,
    approach: [PARDES.PESHAT],
    methodology: 'Compilation and synthesis of earlier commentators',
    description: 'Anthological peshat commentary',
    color: '#14b8a6',
    importance: 'secondary'
  },
  'Baal HaTurim': {
    hebrewName: 'בעל הטורים',
    fullName: 'Rabbi Yaakov ben Asher',
    fullNameHe: 'רבי יעקב בן אשר',
    location: 'Germany → Spain',
    dates: '1269-1343',
    era: ERA.RISHONIM,
    approach: [PARDES.REMEZ],
    methodology: 'Gematria, notarikon, and textual connections',
    description: 'Numerical and wordplay insights',
    color: '#f97316',
    importance: 'secondary'
  },
  'Siftei Chakhamim': {
    hebrewName: 'שפתי חכמים',
    fullName: 'Rabbi Shabbethai Bass',
    fullNameHe: 'רבי שבתי באס',
    location: 'Prague',
    dates: '1641-1718',
    era: ERA.ACHARONIM,
    approach: [PARDES.PESHAT],
    methodology: 'Super-commentary explaining Rashi',
    description: 'Clarifies difficult passages in Rashi',
    color: '#a855f7',
    importance: 'tertiary'
  },
  'Radak': {
    hebrewName: 'רד״ק',
    fullName: 'Rabbi David Kimchi',
    fullNameHe: 'רבי דוד קמחי',
    location: 'Narbonne, Provence',
    dates: '1160-1235',
    era: ERA.RISHONIM,
    approach: [PARDES.PESHAT],
    methodology: 'Grammatical analysis with historical context',
    description: 'Grammar master on Prophets and Writings',
    color: '#06b6d4',
    importance: 'secondary'
  },
  'Abarbanel': {
    hebrewName: 'אברבנאל',
    fullName: 'Don Isaac Abarbanel',
    fullNameHe: 'דון יצחק אברבנאל',
    location: 'Portugal, Spain, Italy',
    dates: '1437-1508',
    era: ERA.RISHONIM,
    approach: [PARDES.PESHAT, PARDES.DERASH],
    methodology: 'Extended philosophical and political analysis',
    description: 'Philosophical statesman commentary',
    color: '#e11d48',
    importance: 'secondary'
  },
  'Meshech Chochmah': {
    hebrewName: 'משך חכמה',
    fullName: 'Rabbi Meir Simcha of Dvinsk',
    fullNameHe: 'רבי מאיר שמחה הכהן מדווינסק',
    location: 'Dvinsk, Latvia',
    dates: '1843-1926',
    era: ERA.ACHARONIM,
    approach: [PARDES.DERASH],
    methodology: 'Halachic insights woven into Torah commentary',
    description: 'Profound halachic and hashkafic analysis',
    color: '#84cc16',
    importance: 'secondary'
  },
  'Netziv': {
    hebrewName: 'נצי״ב',
    fullName: 'Rabbi Naftali Tzvi Yehuda Berlin',
    fullNameHe: 'רבי נפתלי צבי יהודה ברלין',
    location: 'Volozhin, Lithuania',
    dates: '1816-1893',
    era: ERA.ACHARONIM,
    approach: [PARDES.PESHAT, PARDES.DERASH],
    methodology: 'Broad perspective connecting peshat and midrash',
    description: 'HaEmek Davar - depth in plain meaning',
    color: '#0ea5e9',
    importance: 'secondary'
  },
  'Seforno': {
    hebrewName: 'ספורנו',
    fullName: 'Rabbi Ovadia Sforno',
    fullNameHe: 'רבי עובדיה ספורנו',
    location: 'Bologna, Italy',
    dates: '1475-1550',
    era: ERA.ACHARONIM,
    approach: [PARDES.PESHAT],
    methodology: 'Philosophical insights with ethical focus',
    description: 'Renaissance humanism in Torah commentary',
    color: '#0891b2',
    importance: 'secondary'
  }
};

// Jewish traditions/movements
const TRADITION = {
  ASHKENAZI: { id: 'ashkenazi', label: 'אשכנז', name: 'Ashkenazi', region: 'European' },
  SEPHARDI: { id: 'sephardi', label: 'ספרד', name: 'Sephardi', region: 'Spanish/Mediterranean' },
  CHASSIDIC: { id: 'chassidic', label: 'חסידי', name: 'Chassidic', region: 'Eastern European' },
  LITVISH: { id: 'litvish', label: 'ליטאי', name: 'Litvish/Lithuanian', region: 'Lithuanian' },
  YEMENITE: { id: 'yemenite', label: 'תימני', name: 'Yemenite', region: 'Yemenite' }
};

// Source types for categorization
const SOURCE_TYPE = {
  MIKRA: { id: 'mikra', label: 'מקרא', name: 'Torah/Tanakh', category: 'Bible' },
  TALMUD: { id: 'talmud', label: 'תלמוד', name: 'Talmud', category: 'Oral Law' },
  MISHNAH: { id: 'mishnah', label: 'משנה', name: 'Mishnah', category: 'Oral Law' },
  MIDRASH: { id: 'midrash', label: 'מדרש', name: 'Midrash', category: 'Homiletics' },
  HALACHA: { id: 'halacha', label: 'הלכה', name: 'Halacha', category: 'Jewish Law' },
  KABBALAH: { id: 'kabbalah', label: 'קבלה', name: 'Kabbalah', category: 'Mysticism' },
  MUSSAR: { id: 'mussar', label: 'מוסר', name: 'Mussar', category: 'Ethics' }
};

// Key Hebrew terms glossary for study
const HEBREW_TERMS = {
  'ד״ה': { full: 'דיבור המתחיל', english: 'Opening word(s)', desc: 'Reference phrase from the text being commented on' },
  'וכו׳': { full: 'וכולי', english: 'etc.', desc: 'And so on' },
  'ע״ש': { full: 'עיין שם', english: 'See there', desc: 'Cross-reference to look at another source' },
  'עכ״ל': { full: 'עד כאן לשונו', english: 'End quote', desc: 'Until here is the quote' },
  'ז״ל': { full: 'זכרונו לברכה', english: 'Of blessed memory', desc: 'Honorific for deceased sage' },
  'הקב״ה': { full: 'הקדוש ברוך הוא', english: 'The Holy One', desc: 'God - The Holy One, Blessed be He' },
  'חז״ל': { full: 'חכמינו זכרונם לברכה', english: 'Our Sages', desc: 'Our Sages of blessed memory' },
  'רש״י': { full: 'רבי שלמה יצחקי', english: 'Rashi', desc: 'Rabbi Shlomo Yitzchaki' },
  'תוס׳': { full: 'תוספות', english: 'Tosafot', desc: 'Additional commentaries on Talmud' },
  'גמ׳': { full: 'גמרא', english: 'Gemara', desc: 'Talmudic discussion' },
  'מ״מ': { full: 'מכל מקום', english: 'Nevertheless', desc: 'In any case, nevertheless' },
  'א״כ': { full: 'אם כן', english: 'If so', desc: 'Therefore, if that is the case' },
  'כ״ש': { full: 'כל שכן', english: 'All the more so', desc: 'Kal vachomer reasoning' },
  'מדא׳': { full: 'מדאורייתא', english: 'Biblical', desc: 'From Torah law' },
  'מדרב׳': { full: 'מדרבנן', english: 'Rabbinic', desc: 'From rabbinic enactment' }
};

// Gematria calculation helper
const calculateGematria = (text) => {
  const hebrewValues = {
    'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9,
    'י': 10, 'כ': 20, 'ך': 20, 'ל': 30, 'מ': 40, 'ם': 40, 'נ': 50, 'ן': 50,
    'ס': 60, 'ע': 70, 'פ': 80, 'ף': 80, 'צ': 90, 'ץ': 90, 'ק': 100, 'ר': 200,
    'ש': 300, 'ת': 400
  };

  let total = 0;
  for (const char of text) {
    if (hebrewValues[char]) {
      total += hebrewValues[char];
    }
  }
  return total;
};

// Gematria display component
const GematriaDisplay = ({ word }) => {
  const value = calculateGematria(word);
  if (value === 0) return null;

  return (
    <span className="gematria-badge" title={`Gematria value: ${value}`}>
      <span className="gematria-icon">גמ</span>
      <span className="gematria-value">{value}</span>
    </span>
  );
};

// Hebrew term tooltip component
const HebrewTermTooltip = ({ term }) => {
  const info = HEBREW_TERMS[term];
  if (!info) return <span>{term}</span>;

  return (
    <span className="hebrew-term" title={`${info.full} - ${info.english}`}>
      {term}
      <span className="term-tooltip">
        <span className="tooltip-hebrew">{info.full}</span>
        <span className="tooltip-english">{info.english}</span>
        <span className="tooltip-desc">{info.desc}</span>
      </span>
    </span>
  );
};

// Tradition badge component
const TraditionBadge = ({ tradition }) => (
  <span className={`tradition-badge tradition-${tradition.id}`} title={tradition.region}>
    {tradition.label}
  </span>
);

// Source type badge component
const SourceTypeBadge = ({ sourceType }) => (
  <span className={`source-type-badge source-${sourceType.id}`} title={sourceType.category}>
    {sourceType.label}
  </span>
);

// Approach badge component
const ApproachBadge = ({ approach }) => (
  <span className={`approach-badge approach-${approach.id}`} title={approach.desc}>
    {approach.label}
  </span>
);

// Era badge component
const EraBadge = ({ era }) => (
  <span className={`era-badge era-${era.id}`} title={era.period}>
    {era.label}
  </span>
);

// Scholarly info panel for commentary author
const ScholarlyInfo = ({ info, source }) => {
  const [showDetails, setShowDetails] = useState(false);

  if (!info) return null;

  return (
    <div className="scholarly-info">
      <button
        className="scholarly-toggle"
        onClick={() => setShowDetails(!showDetails)}
        title="About this commentator"
      >
        <span className="toggle-icon">ℹ</span>
        <span className="toggle-text">{showDetails ? 'Hide info' : 'About'}</span>
      </button>

      {showDetails && (
        <div className="scholarly-details">
          <div className="scholar-header">
            <h4 className="scholar-name-he">{info.fullNameHe || info.hebrewName}</h4>
            <h5 className="scholar-name-en">{info.fullName || source}</h5>
          </div>

          <div className="scholar-meta">
            <div className="meta-row">
              <span className="meta-label">Period:</span>
              <span className="meta-value">{info.dates}</span>
              {info.era && <EraBadge era={info.era} />}
            </div>
            <div className="meta-row">
              <span className="meta-label">Location:</span>
              <span className="meta-value">{info.location}</span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Approach:</span>
              <div className="approach-tags">
                {info.approach?.map((a, i) => <ApproachBadge key={i} approach={a} />)}
              </div>
            </div>
          </div>

          <p className="scholar-methodology">{info.methodology}</p>
        </div>
      )}
    </div>
  );
};

// Single Commentary Card component - Professional scholarly version
const CommentaryCard = ({ source, commentaries, showTranslation, enableClickableText, verse }) => {
  const [expanded, setExpanded] = useState(true);
  const [showSummary, setShowSummary] = useState(false);
  const info = COMMENTARY_INFO[source] || { hebrewName: source, color: '#6b7280', description: 'Commentary' };
  const hasApiKey = !!getStoredApiKey();

  const hebrewCommentaries = commentaries.filter(c => c.language === 'hebrew');
  const englishCommentaries = commentaries.filter(c => c.language === 'english');

  const getCommentaryText = useCallback(() => {
    const hebrewText = hebrewCommentaries.map(c => removeHtmlTags(c.text)).join('\n\n');
    const englishText = englishCommentaries.map(c => removeHtmlTags(c.text)).join('\n\n');
    return englishText || hebrewText;
  }, [hebrewCommentaries, englishCommentaries]);

  return (
    <div
      className={`commentary-card importance-${info.importance || 'secondary'}`}
      style={{ '--card-color': info.color }}
    >
      <div className="card-header" onClick={() => setExpanded(!expanded)}>
        <div className="card-title">
          <div className="title-main">
            <span className="card-hebrew-name">{info.hebrewName}</span>
            <span className="card-name">{source}</span>
          </div>
          {info.era && (
            <div className="title-meta">
              <span className="card-dates">{info.dates}</span>
              <EraBadge era={info.era} />
            </div>
          )}
        </div>
        <div className="card-actions">
          {hasApiKey && (hebrewCommentaries.length + englishCommentaries.length > 0) && (
            <button
              className={`ai-btn ${showSummary ? 'active' : ''}`}
              onClick={(e) => { e.stopPropagation(); setShowSummary(!showSummary); }}
              title="AI-powered study analysis"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 010 2h-1v1a7 7 0 01-7 7H9a7 7 0 01-7-7v-1H1a1 1 0 010-2h1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2z"/>
                <circle cx="9" cy="14" r="1.5"/>
                <circle cx="15" cy="14" r="1.5"/>
              </svg>
            </button>
          )}
          <button className="expand-btn" aria-label={expanded ? 'Collapse' : 'Expand'}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d={expanded ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"} />
            </svg>
          </button>
        </div>
      </div>

      {expanded && (
        <div className="card-body">
          {/* Approach tags */}
          {info.approach && info.approach.length > 0 && (
            <div className="approach-bar">
              <span className="approach-label">Method:</span>
              {info.approach.map((a, i) => <ApproachBadge key={i} approach={a} />)}
            </div>
          )}

          {/* Scholarly information panel */}
          <ScholarlyInfo info={info} source={source} />

          {/* AI Summary */}
          {showSummary && (
            <CommentarySummary
              commentaryText={getCommentaryText()}
              source={source}
              verse={verse}
              onClose={() => setShowSummary(false)}
            />
          )}

          {/* Hebrew commentaries */}
          <div className="commentary-content">
            {hebrewCommentaries.map((commentary, idx) => (
              <div key={`he-${idx}`} className="commentary-entry hebrew-entry">
                <div className="entry-label">
                  <span className="lang-indicator">עברית</span>
                  {hebrewCommentaries.length > 1 && <span className="entry-num">{idx + 1}</span>}
                </div>
                {enableClickableText ? (
                  <ClickableHebrewText
                    text={removeHtmlTags(commentary.text, ['i', 'sup'])}
                    className="commentary-text hebrew"
                  />
                ) : (
                  <div className="commentary-text hebrew" dir="rtl" lang="he">
                    {removeHtmlTags(commentary.text, ['i', 'sup'])}
                  </div>
                )}
              </div>
            ))}

            {/* English translations */}
            {showTranslation && englishCommentaries.length > 0 && (
              <div className="translation-section">
                <div className="section-divider">
                  <span>Translation</span>
                </div>
                {englishCommentaries.map((commentary, idx) => (
                  <div key={`en-${idx}`} className="commentary-entry english-entry">
                    <div className="entry-label">
                      <span className="lang-indicator en">EN</span>
                      {englishCommentaries.length > 1 && <span className="entry-num">{idx + 1}</span>}
                    </div>
                    <div className="commentary-text english" lang="en">
                      {removeHtmlTags(commentary.text)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {hebrewCommentaries.length === 0 && englishCommentaries.length === 0 && (
            <div className="no-commentary">
              <span className="no-commentary-icon">📭</span>
              <span>No {source} commentary available for this verse</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Commentary Selector Modal
const CommentarySelector = ({
  isOpen,
  onClose,
  onSelect,
  availableSources,
  selectedSource,
  verseRef
}) => {
  if (!isOpen) return null;

  return (
    <div className="commentary-selector-overlay" onClick={onClose}>
      <div className="commentary-selector-modal" onClick={e => e.stopPropagation()}>
        <div className="selector-header">
          <h3>Choose Commentary</h3>
          <span className="verse-ref">{verseRef}</span>
          <button className="close-btn" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="selector-grid">
          {availableSources.map(source => {
            const info = COMMENTARY_INFO[source] || { hebrewName: source, description: 'Commentary', color: '#6b7280' };
            const isSelected = selectedSource === source;

            return (
              <button
                key={source}
                className={`source-option ${isSelected ? 'selected' : ''} importance-${info.importance || 'secondary'}`}
                onClick={() => onSelect(source)}
                style={{ '--option-color': info.color }}
              >
                <div className="option-info">
                  <div className="option-header">
                    <span className="option-hebrew">{info.hebrewName}</span>
                    {info.era && <EraBadge era={info.era} />}
                  </div>
                  <span className="option-name">{info.fullName || source}</span>
                  <span className="option-dates">{info.dates}</span>
                  <span className="option-desc">{info.description}</span>
                  {info.approach && (
                    <div className="option-approach">
                      {info.approach.map((a, i) => <ApproachBadge key={i} approach={a} />)}
                    </div>
                  )}
                </div>
                {isSelected && (
                  <span className="selected-check">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="selector-footer">
          <button className="view-all-btn" onClick={() => onSelect('all')}>
            View All Commentaries
          </button>
        </div>
      </div>
    </div>
  );
};

// Side-by-side Commentary Panel
const CommentaryPanel = ({
  isOpen,
  onClose,
  verse,
  selectedBook,
  selectedChapter,
  isTalmud = false,
  isMishnah = false,
  enableClickableText = true
}) => {
  const [selectedSource, setSelectedSource] = useState(null);
  const [showSelector, setShowSelector] = useState(true);
  const [commentaryData, setCommentaryData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showTranslation, setShowTranslation] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);

  // Define available sources based on text type
  const availableSources = isTalmud
    ? ['Rashi', 'Tosafot', 'Rashbam', 'Maharsha', 'Ritva']
    : isMishnah
      ? ['Bartenura', 'Tosafot Yom Tov', 'Ikar Tosafot Yom Tov', 'Rambam']
      : ['Rashi', 'Onkelos', 'Sforno', 'Ibn Ezra', 'Ramban', 'Targum Jonathan'];

  // Fetch commentary when source is selected
  useEffect(() => {
    const fetchCommentary = async () => {
      if (!selectedSource || !verse) return;

      setLoading(true);
      try {
        const data = await getCommentary(selectedBook, selectedChapter, verse.verse);
        setCommentaryData(data);
      } catch (error) {
        console.error('Failed to fetch commentary:', error);
        setCommentaryData([]);
      }
      setLoading(false);
    };

    fetchCommentary();
  }, [selectedSource, verse, selectedBook, selectedChapter]);

  const handleSourceSelect = (source) => {
    setSelectedSource(source);
    setShowSelector(false);
    setCurrentPage(0);
  };

  const handleBack = () => {
    setShowSelector(true);
    setSelectedSource(null);
    setCommentaryData(null);
  };

  // Filter commentaries by selected source
  const filteredCommentaries = selectedSource === 'all'
    ? commentaryData
    : commentaryData?.filter(c => c.source === selectedSource) || [];

  // Group commentaries by source for "all" view
  const groupedCommentaries = selectedSource === 'all' && commentaryData
    ? availableSources.reduce((acc, source) => {
        const sourceData = commentaryData.filter(c => c.source === source);
        if (sourceData.length > 0) {
          acc[source] = sourceData;
        }
        return acc;
      }, {})
    : null;

  // Pagination for long commentaries
  const ITEMS_PER_PAGE = 3;
  const totalPages = selectedSource !== 'all'
    ? Math.ceil(filteredCommentaries.length / ITEMS_PER_PAGE)
    : 0;
  const paginatedCommentaries = selectedSource !== 'all'
    ? filteredCommentaries.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE)
    : [];

  if (!isOpen) return null;

  const verseRef = `${selectedBook} ${selectedChapter}:${verse?.verse}`;

  return (
    <div className="commentary-panel">
      <div className="panel-header">
        <div className="header-left">
          {!showSelector && (
            <button className="back-btn" onClick={handleBack}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <h3>
            {showSelector ? 'Select Commentary' : (
              selectedSource === 'all' ? 'All Commentaries' : (
                <>
                  {COMMENTARY_INFO[selectedSource]?.icon} {selectedSource}
                </>
              )
            )}
          </h3>
        </div>
        <div className="header-right">
          <span className="verse-badge">{verseRef}</span>
          {!showSelector && (
            <button
              className={`translate-btn ${showTranslation ? 'active' : ''}`}
              onClick={() => setShowTranslation(!showTranslation)}
              title={showTranslation ? 'Hide translation' : 'Show translation'}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10" />
              </svg>
            </button>
          )}
          <button className="close-btn" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="panel-content">
        {showSelector ? (
          <div className="selector-grid compact">
            {availableSources.map(source => {
              const info = COMMENTARY_INFO[source] || { hebrewName: source, description: '', color: '#6b7280' };
              return (
                <button
                  key={source}
                  className={`source-option importance-${info.importance || 'secondary'}`}
                  onClick={() => handleSourceSelect(source)}
                  style={{ '--option-color': info.color }}
                >
                  <div className="option-info">
                    <div className="option-header compact">
                      <span className="option-hebrew">{info.hebrewName}</span>
                      {info.era && <span className="era-mini">{info.era.label}</span>}
                    </div>
                    <span className="option-name">{source}</span>
                    {info.dates && <span className="option-dates">{info.dates}</span>}
                  </div>
                </button>
              );
            })}
            <button
              className="source-option view-all"
              onClick={() => handleSourceSelect('all')}
            >
              <div className="option-info">
                <span className="option-hebrew">כל הפירושים</span>
                <span className="option-name">View All Sources</span>
                <span className="option-desc">Compare multiple commentaries</span>
              </div>
            </button>
          </div>
        ) : loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading {selectedSource === 'all' ? 'commentaries' : selectedSource}...</p>
          </div>
        ) : selectedSource === 'all' && groupedCommentaries ? (
          <div className="all-commentaries">
            {Object.entries(groupedCommentaries).map(([source, commentaries]) => (
              <CommentaryCard
                key={source}
                source={source}
                commentaries={commentaries}
                showTranslation={showTranslation}
                enableClickableText={enableClickableText}
                verse={verseRef}
              />
            ))}
            {Object.keys(groupedCommentaries).length === 0 && (
              <div className="no-commentary">
                No commentaries available for this verse
              </div>
            )}
          </div>
        ) : (
          <div className="single-commentary">
            {paginatedCommentaries.length > 0 ? (
              <>
                {paginatedCommentaries.map((commentary, idx) => (
                  <div key={idx} className="commentary-entry">
                    {commentary.language === 'hebrew' ? (
                      enableClickableText ? (
                        <ClickableHebrewText
                          text={removeHtmlTags(commentary.text, ['i', 'sup'])}
                          className="commentary-text hebrew"
                        />
                      ) : (
                        <div className="commentary-text hebrew" dir="rtl" lang="he">
                          {removeHtmlTags(commentary.text, ['i', 'sup'])}
                        </div>
                      )
                    ) : showTranslation ? (
                      <div className="commentary-text english" lang="en">
                        {removeHtmlTags(commentary.text)}
                      </div>
                    ) : null}
                  </div>
                ))}

                {totalPages > 1 && (
                  <div className="pagination">
                    <button
                      disabled={currentPage === 0}
                      onClick={() => setCurrentPage(p => p - 1)}
                    >
                      Previous
                    </button>
                    <span>{currentPage + 1} / {totalPages}</span>
                    <button
                      disabled={currentPage >= totalPages - 1}
                      onClick={() => setCurrentPage(p => p + 1)}
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="no-commentary">
                No {selectedSource} commentary available for this verse
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export {
  CommentarySelector,
  CommentaryPanel,
  COMMENTARY_INFO,
  PARDES,
  ERA,
  TRADITION,
  SOURCE_TYPE,
  HEBREW_TERMS,
  calculateGematria,
  GematriaDisplay,
  HebrewTermTooltip,
  ApproachBadge,
  EraBadge,
  TraditionBadge,
  SourceTypeBadge
};
export default CommentaryPanel;
