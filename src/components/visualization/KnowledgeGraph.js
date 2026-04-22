/**
 * KnowledgeGraph Component - Torah Study Tool
 *
 * Designed for Kollel/Yeshiva-style learning:
 * - Machlokes View: Understand WHY commentators disagree
 * - Shita Grid: Compare approaches side-by-side
 * - Study Path: Suggested learning order
 * - Chavrusa Mode: Compare two commentators side-by-side
 * - Today's Learning: Track your daily progress
 * - Quick Study: Fast access to actual commentary text
 * - Learning Questions: Think prompts for deeper understanding
 */
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import PropTypes from 'prop-types';
import { RABBINIC_NETWORK } from '../../services/scholarly/knowledgeGraphService';
import './KnowledgeGraph.css';

// Local storage keys for tracking learning
const TODAY_LEARNING_KEY = 'torah_today_learning';
const LEARNING_STREAK_KEY = 'torah_learning_streak';

// Period definitions
const PERIODS = {
  'Tannaim': { order: 1, dates: '10-220 CE', color: '#059669', hebrewName: 'תנאים', icon: '🏛️' },
  'Amoraim': { order: 2, dates: '220-500 CE', color: '#0d9488', hebrewName: 'אמוראים', icon: '📖' },
  'Geonim': { order: 3, dates: '589-1038', color: '#0891b2', hebrewName: 'גאונים', icon: '✨' },
  'Rishonim': { order: 4, dates: '1038-1500', color: '#6366f1', hebrewName: 'ראשונים', icon: '📜' },
  'Acharonim': { order: 5, dates: '1500+', color: '#8b5cf6', hebrewName: 'אחרונים', icon: '📚' }
};

// Study approach categories for understanding shitos
const APPROACH_CATEGORIES = {
  peshat: { label: 'פשט', labelEn: 'Plain Meaning', icon: '📖', color: '#3b82f6' },
  drash: { label: 'דרש', labelEn: 'Homiletical', icon: '💬', color: '#8b5cf6' },
  remez: { label: 'רמז', labelEn: 'Hint/Allusion', icon: '🔍', color: '#f59e0b' },
  sod: { label: 'סוד', labelEn: 'Mystical', icon: '✨', color: '#ec4899' },
  halacha: { label: 'הלכה', labelEn: 'Legal', icon: '⚖️', color: '#10b981' },
  grammar: { label: 'דקדוק', labelEn: 'Grammar', icon: '🔤', color: '#06b6d4' },
  philosophy: { label: 'מחשבה', labelEn: 'Philosophy', icon: '🧠', color: '#6366f1' }
};

// Map commentators to their primary approach
const COMMENTATOR_APPROACHES = {
  'Rashi': ['peshat', 'drash'],
  'Rashbam': ['peshat'],
  'Ibn Ezra': ['peshat', 'grammar'],
  'Ramban': ['peshat', 'sod', 'halacha'],
  'Rambam': ['halacha', 'philosophy'],
  'Sforno': ['peshat', 'philosophy'],
  'Or HaChaim': ['sod', 'drash'],
  'Malbim': ['peshat', 'grammar'],
  'Kli Yakar': ['drash'],
  'Radak': ['peshat', 'grammar'],
  'Onkelos': ['peshat'],
  'Chizkuni': ['peshat'],
  'Baal HaTurim': ['remez'],
  'Maharal': ['philosophy', 'drash']
};

// =============================================================================
// TODAY'S LEARNING TRACKING
// =============================================================================

function getTodayKey() {
  return new Date().toISOString().split('T')[0];
}

function getTodayLearning() {
  try {
    const data = JSON.parse(localStorage.getItem(TODAY_LEARNING_KEY) || '{}');
    const today = getTodayKey();
    if (data.date !== today) {
      return { date: today, commentators: [], timeStarted: null, minutesLearned: 0 };
    }
    return data;
  } catch {
    return { date: getTodayKey(), commentators: [], timeStarted: null, minutesLearned: 0 };
  }
}

function saveTodayLearning(data) {
  try {
    localStorage.setItem(TODAY_LEARNING_KEY, JSON.stringify({ ...data, date: getTodayKey() }));
  } catch { /* ignore */ }
}

function addCommentatorToToday(name) {
  const data = getTodayLearning();
  if (!data.commentators.includes(name)) {
    data.commentators.push(name);
    saveTodayLearning(data);
  }
  return data;
}

function updateLearningStreak() {
  try {
    const streak = JSON.parse(localStorage.getItem(LEARNING_STREAK_KEY) || '{}');
    const today = getTodayKey();
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    if (streak.lastDate === today) return streak.count;
    if (streak.lastDate === yesterday) {
      streak.count = (streak.count || 0) + 1;
    } else {
      streak.count = 1;
    }
    streak.lastDate = today;
    localStorage.setItem(LEARNING_STREAK_KEY, JSON.stringify(streak));
    return streak.count;
  } catch {
    return 1;
  }
}

// =============================================================================
// CHAVRUSA COMPARISON DATA
// =============================================================================

// What to look for when comparing two commentators
const COMPARISON_PROMPTS = {
  'Rashi-Rashbam': [
    'איפה רשב"ם אומר "וזהו פשוטו" - מה הוא חולק?',
    'Where does Rashbam say "this is the pshat" - what is he disputing?',
    'Compare the length of their comments - what does that tell you?'
  ],
  'Rashi-Ramban': [
    'מצא היכן רמב"ן אומר "ואין דעתי כדעתו"',
    'Find where Ramban says "I don\'t agree with him"',
    'Does Ramban add deeper/mystical meaning that Rashi omits?'
  ],
  'Ibn Ezra-Ramban': [
    'Ibn Ezra hints at ideas Ramban openly rejects - can you find them?',
    'Compare their treatment of miracles and supernatural events'
  ],
  'default': [
    'מה כל אחד מדגיש? מה הוא משמיט?',
    'What does each one emphasize? What do they omit?',
    'Do they quote the same sources or different ones?',
    'Is there a practical (halachic) difference between them?'
  ]
};

// Known disagreements with explanations (for actual learning value)
const MACHLOKES_DATABASE = {
  'Rashbam-Rashi': {
    type: 'methodology',
    hebrewSummary: 'רשב"ם מפרש פשט טהור, רש"י משלב מדרש',
    summary: 'Rashbam focuses on pure peshat (literal meaning), while Rashi integrates midrashic interpretations',
    learnMore: 'Rashbam often says "וזהו פשוטו" (this is the plain meaning) to contrast with his grandfather Rashi',
    studyQuestion: 'למה רש"י צריך להביא מדרשים? האם הפשט לבד לא מספיק?',
    studyQuestionEn: 'Why does Rashi need to bring midrashim? Is peshat alone not enough?'
  },
  'Ramban-Rashi': {
    type: 'interpretation',
    hebrewSummary: 'רמב"ן לעתים חולק על פירוש רש"י ומביא שיטה אחרת',
    summary: 'Ramban often disagrees with Rashi\'s interpretation and brings alternative explanations',
    learnMore: 'Ramban typically says "ואין דעתי כדעתו" (I don\'t agree) before presenting his view',
    studyQuestion: 'האם מחלוקת הראשונים היא לשם שמים? מה אפשר ללמוד משניהם?',
    studyQuestionEn: 'Is the disagreement l\'shem shamayim? What can we learn from both?'
  },
  'Ramban-Ibn Ezra': {
    type: 'methodology',
    hebrewSummary: 'רמב"ן מבקר את הגישה הרציונליסטית של אבן עזרא',
    summary: 'Ramban criticizes Ibn Ezra\'s rationalist approach, especially regarding miracles',
    learnMore: 'Ibn Ezra hints at critical views that Ramban strongly opposes',
    studyQuestion: 'מהי הדרך הנכונה להבין נסים בתורה?',
    studyQuestionEn: 'What is the correct way to understand miracles in the Torah?'
  },
  'Rambam-Ravad': {
    type: 'halacha',
    hebrewSummary: 'ראב"ד משיג על פסקי הרמב"ם בהלכה',
    summary: 'Ravad critiques Rambam\'s halachic rulings, often bringing alternative sources',
    learnMore: 'The Hasagot are printed alongside Mishneh Torah and are essential for understanding',
    studyQuestion: 'למה הראב"ד חולק? האם יש מקור אחר או סברא אחרת?',
    studyQuestionEn: 'Why does Ravad disagree? Is there another source or different logic?'
  },
  'Tosafot-Rashi': {
    type: 'talmud',
    hebrewSummary: 'תוספות מקשים על רש"י ומתרצים',
    summary: 'Tosafot raise questions on Rashi and often propose alternative interpretations',
    learnMore: 'Tosafot\'s method: קשה (difficulty), תירוץ (answer), or יש לפרש (alternative explanation)',
    studyQuestion: 'מה הקושיא של תוספות? איך זה משנה את ההבנה?',
    studyQuestionEn: 'What is Tosafot\'s question? How does it change our understanding?'
  }
};

/**
 * Get Sefaria link for a commentator on a verse
 */
const getSefariaLink = (commentator, reference) => {
  if (!reference) return null;
  // Convert "Genesis 1:1" to "Genesis.1.1"
  const sefariaRef = reference.replace(/\s+/g, '.').replace(':', '.');
  const commentatorMap = {
    'Rashi': 'Rashi_on_',
    'Ramban': 'Ramban_on_',
    'Ibn Ezra': 'Ibn_Ezra_on_',
    'Sforno': 'Sforno_on_',
    'Rashbam': 'Rashbam_on_',
    'Or HaChaim': 'Or_HaChaim_on_',
    'Chizkuni': 'Chizkuni_on_',
    'Radak': 'Radak_on_'
  };
  const prefix = commentatorMap[commentator];
  if (prefix) {
    return `https://www.sefaria.org/${prefix}${sefariaRef}`;
  }
  return `https://www.sefaria.org/${sefariaRef}`;
};

/**
 * Suggested study order based on traditional learning
 */
const getStudyOrder = (availableCommentators) => {
  const ORDER = [
    { name: 'Onkelos', reason: 'התרגום הראשון - להבנת המילים' },
    { name: 'Rashi', reason: 'הפירוש הבסיסי - תמיד מתחילים ברש"י' },
    { name: 'Rashbam', reason: 'פשט טהור - מה נכדו מוסיף' },
    { name: 'Ibn Ezra', reason: 'דקדוק וסברא - הבנה עמוקה יותר' },
    { name: 'Ramban', reason: 'עיון עמוק - מחלוקות ועמקות' },
    { name: 'Sforno', reason: 'מחשבה ומוסר' },
    { name: 'Or HaChaim', reason: 'סוד וחסידות - לסיום' }
  ];

  return ORDER.filter(item =>
    !availableCommentators || availableCommentators.includes(item.name)
  );
};

/**
 * Find machlokes between available commentators
 */
const findMachlokes = (commentators) => {
  const machlokes = [];
  const available = new Set(commentators);

  Object.entries(MACHLOKES_DATABASE).forEach(([key, data]) => {
    const [comm1, comm2] = key.split('-');
    if (available.has(comm1) && available.has(comm2)) {
      machlokes.push({
        between: [comm1, comm2],
        ...data
      });
    }
  });

  // Also check disagreesWith from RABBINIC_NETWORK
  commentators.forEach(comm => {
    const info = RABBINIC_NETWORK[comm];
    if (info?.disagreesWith) {
      info.disagreesWith.forEach(other => {
        if (available.has(other)) {
          const key = `${comm}-${other}`;
          const reverseKey = `${other}-${comm}`;
          if (!MACHLOKES_DATABASE[key] && !MACHLOKES_DATABASE[reverseKey]) {
            machlokes.push({
              between: [comm, other],
              type: 'general',
              hebrewSummary: `${info.hebrewName} חולק על ${RABBINIC_NETWORK[other]?.hebrewName || other}`,
              summary: `${comm} disagrees with ${other}`,
              studyQuestion: `מה הם חולקים? מה יסוד המחלוקת?`
            });
          }
        }
      });
    }
  });

  return machlokes;
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Commentator Badge - Quick display with period color
 */
const CommentatorBadge = ({ name, onClick, isAvailable = true, showApproach = false }) => {
  const info = RABBINIC_NETWORK[name];
  const periodInfo = info?.period ? PERIODS[info.period] : null;
  const approaches = COMMENTATOR_APPROACHES[name] || [];

  return (
    <div
      className={`kg-commentator-badge ${!isAvailable ? 'unavailable' : ''}`}
      onClick={onClick}
      style={{ '--badge-color': periodInfo?.color || 'var(--text-muted)' }}
    >
      <span className="badge-icon">{info?.icon || '📚'}</span>
      <div className="badge-content">
        <span className="badge-hebrew" dir="rtl">{info?.hebrewName || name}</span>
        <span className="badge-english">{name}</span>
        {showApproach && approaches.length > 0 && (
          <div className="badge-approaches">
            {approaches.slice(0, 2).map(app => (
              <span key={app} className="approach-tag" style={{ color: APPROACH_CATEGORIES[app]?.color }}>
                {APPROACH_CATEGORIES[app]?.label}
              </span>
            ))}
          </div>
        )}
      </div>
      {!isAvailable && <span className="no-text-indicator">אין פירוש</span>}
    </div>
  );
};

/**
 * Machlokes Card - Display a disagreement with study value
 */
const MachloketCard = ({ machlokes, onSelectCommentator, reference }) => {
  const [expanded, setExpanded] = useState(false);
  const [comm1, comm2] = machlokes.between;
  const info1 = RABBINIC_NETWORK[comm1];
  const info2 = RABBINIC_NETWORK[comm2];

  return (
    <div className="kg-machloket-card">
      <div className="machloket-header" onClick={() => setExpanded(!expanded)}>
        <div className="machloket-parties">
          <span className="party" onClick={(e) => { e.stopPropagation(); onSelectCommentator(comm1); }}>
            {info1?.icon} {info1?.hebrewName || comm1}
          </span>
          <span className="vs-icon">⚔️</span>
          <span className="party" onClick={(e) => { e.stopPropagation(); onSelectCommentator(comm2); }}>
            {info2?.icon} {info2?.hebrewName || comm2}
          </span>
        </div>
        <span className="expand-icon">{expanded ? '▼' : '▶'}</span>
      </div>

      <div className="machloket-summary" dir="rtl">
        {machlokes.hebrewSummary}
      </div>

      {expanded && (
        <div className="machloket-details">
          <p className="machloket-explanation">{machlokes.summary}</p>

          {machlokes.learnMore && (
            <div className="machloket-learn-more">
              <strong>💡 לדעת:</strong> {machlokes.learnMore}
            </div>
          )}

          {machlokes.studyQuestion && (
            <div className="machloket-question">
              <strong>🤔 לחשוב:</strong>
              <p dir="rtl">{machlokes.studyQuestion}</p>
              {machlokes.studyQuestionEn && (
                <p className="question-english">{machlokes.studyQuestionEn}</p>
              )}
            </div>
          )}

          <div className="machloket-actions">
            <a
              href={getSefariaLink(comm1, reference)}
              target="_blank"
              rel="noopener noreferrer"
              className="sefaria-link"
            >
              📖 {info1?.hebrewName} בספריא
            </a>
            <a
              href={getSefariaLink(comm2, reference)}
              target="_blank"
              rel="noopener noreferrer"
              className="sefaria-link"
            >
              📖 {info2?.hebrewName} בספריא
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Study Path View - Suggested learning order
 */
const StudyPathView = ({ availableCommentators, reference, onSelectCommentator }) => {
  const studyOrder = getStudyOrder(availableCommentators);

  return (
    <div className="kg-study-path">
      <div className="study-path-header">
        <h4 dir="rtl">📚 סדר הלימוד המומלץ</h4>
        <p>Recommended study order for this verse</p>
      </div>

      <div className="study-path-steps">
        {studyOrder.map((step, index) => {
          const info = RABBINIC_NETWORK[step.name];
          const isAvailable = !availableCommentators || availableCommentators.includes(step.name);

          return (
            <div
              key={step.name}
              className={`study-step ${!isAvailable ? 'unavailable' : ''}`}
              onClick={() => isAvailable && onSelectCommentator(step.name)}
            >
              <div className="step-number">{index + 1}</div>
              <div className="step-content">
                <div className="step-header">
                  <span className="step-icon">{info?.icon || '📚'}</span>
                  <span className="step-name" dir="rtl">{info?.hebrewName || step.name}</span>
                  <span className="step-name-en">{step.name}</span>
                </div>
                <p className="step-reason" dir="rtl">{step.reason}</p>
                {isAvailable && (
                  <a
                    href={getSefariaLink(step.name, reference)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="step-link"
                    onClick={(e) => e.stopPropagation()}
                  >
                    לקרוא בספריא →
                  </a>
                )}
              </div>
              {index < studyOrder.length - 1 && <div className="step-connector">↓</div>}
            </div>
          );
        })}
      </div>

      {studyOrder.length === 0 && (
        <div className="empty-state">
          <p>בחר פסוק עם פירושים כדי לראות סדר לימוד</p>
        </div>
      )}
    </div>
  );
};

/**
 * Shita Grid - Compare approaches side by side
 */
const ShitaGridView = ({ commentators, availableCommentators, onSelectCommentator, reference }) => {
  // Group by approach
  const byApproach = useMemo(() => {
    const groups = {};
    const available = new Set(availableCommentators || commentators);

    commentators.forEach(name => {
      if (!available.has(name)) return;
      const approaches = COMMENTATOR_APPROACHES[name] || ['other'];
      approaches.forEach(app => {
        if (!groups[app]) groups[app] = [];
        if (!groups[app].includes(name)) {
          groups[app].push(name);
        }
      });
    });

    return groups;
  }, [commentators, availableCommentators]);

  return (
    <div className="kg-shita-grid">
      <div className="shita-header">
        <h4 dir="rtl">📊 השוואת שיטות</h4>
        <p>Compare commentary approaches</p>
      </div>

      <div className="shita-categories">
        {Object.entries(APPROACH_CATEGORIES).map(([key, category]) => {
          const comms = byApproach[key] || [];
          if (comms.length === 0) return null;

          return (
            <div key={key} className="shita-category" style={{ '--category-color': category.color }}>
              <div className="category-header">
                <span className="category-icon">{category.icon}</span>
                <span className="category-label" dir="rtl">{category.label}</span>
                <span className="category-label-en">{category.labelEn}</span>
              </div>
              <div className="category-commentators">
                {comms.map(name => (
                  <CommentatorBadge
                    key={name}
                    name={name}
                    onClick={() => onSelectCommentator(name)}
                    isAvailable={!availableCommentators || availableCommentators.includes(name)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Machlokes View - Understand disagreements
 */
const MachloketView = ({ commentators, availableCommentators, reference, onSelectCommentator }) => {
  const machlokes = useMemo(() => {
    const available = availableCommentators || commentators;
    return findMachlokes(available);
  }, [commentators, availableCommentators]);

  return (
    <div className="kg-machloket-view">
      <div className="machloket-view-header">
        <h4 dir="rtl">⚔️ מחלוקות הראשונים</h4>
        <p>Understand the disagreements</p>
      </div>

      {machlokes.length > 0 ? (
        <div className="machloket-list">
          {machlokes.map((m, i) => (
            <MachloketCard
              key={i}
              machlokes={m}
              onSelectCommentator={onSelectCommentator}
              reference={reference}
            />
          ))}
        </div>
      ) : (
        <div className="no-machloket">
          <p dir="rtl">אין מחלוקות מתועדות בין המפרשים הזמינים</p>
          <p>No documented disagreements between available commentators</p>
        </div>
      )}

      <div className="machloket-tip">
        <strong>💡 טיפ ללימוד:</strong>
        <p dir="rtl">
          כשלומדים מחלוקת, תמיד שאל: מה היסוד? האם יש השלכה להלכה?
          האם אפשר לתרץ את שניהם?
        </p>
      </div>
    </div>
  );
};

/**
 * Chavrusa Mode - Compare two commentators side by side
 */
const ChavrusaView = ({ commentators, availableCommentators, reference, onSelectCommentator, onOpenCommentary }) => {
  const [leftComm, setLeftComm] = useState(null);
  const [rightComm, setRightComm] = useState(null);

  const available = availableCommentators || commentators;

  // Get comparison prompts
  const getComparisonPrompts = (c1, c2) => {
    if (!c1 || !c2) return [];
    const key1 = `${c1}-${c2}`;
    const key2 = `${c2}-${c1}`;
    return COMPARISON_PROMPTS[key1] || COMPARISON_PROMPTS[key2] || COMPARISON_PROMPTS.default;
  };

  const prompts = getComparisonPrompts(leftComm, rightComm);

  // Check if there's a known machlokes between selected commentators
  const getMachlokesBetween = (c1, c2) => {
    if (!c1 || !c2) return null;
    const key1 = `${c1}-${c2}`;
    const key2 = `${c2}-${c1}`;
    return MACHLOKES_DATABASE[key1] || MACHLOKES_DATABASE[key2] || null;
  };

  const machloket = getMachlokesBetween(leftComm, rightComm);

  return (
    <div className="kg-chavrusa-view">
      <div className="chavrusa-header">
        <h4 dir="rtl">👥 חברותא - השוואת מפרשים</h4>
        <p>Select two commentators to compare side by side</p>
      </div>

      <div className="chavrusa-selectors">
        {/* Left Commentator */}
        <div className="chavrusa-selector">
          <label dir="rtl">מפרש ראשון</label>
          <div className="selector-options">
            {available.map(name => {
              const info = RABBINIC_NETWORK[name];
              return (
                <button
                  key={name}
                  className={`selector-btn ${leftComm === name ? 'selected' : ''} ${rightComm === name ? 'disabled' : ''}`}
                  onClick={() => leftComm === name ? setLeftComm(null) : setLeftComm(name)}
                  disabled={rightComm === name}
                >
                  <span className="sel-icon">{info?.icon || '📚'}</span>
                  <span className="sel-name" dir="rtl">{info?.hebrewName || name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="chavrusa-vs">VS</div>

        {/* Right Commentator */}
        <div className="chavrusa-selector">
          <label dir="rtl">מפרש שני</label>
          <div className="selector-options">
            {available.map(name => {
              const info = RABBINIC_NETWORK[name];
              return (
                <button
                  key={name}
                  className={`selector-btn ${rightComm === name ? 'selected' : ''} ${leftComm === name ? 'disabled' : ''}`}
                  onClick={() => rightComm === name ? setRightComm(null) : setRightComm(name)}
                  disabled={leftComm === name}
                >
                  <span className="sel-icon">{info?.icon || '📚'}</span>
                  <span className="sel-name" dir="rtl">{info?.hebrewName || name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Comparison Content */}
      {leftComm && rightComm ? (
        <div className="chavrusa-comparison">
          {/* Known Machlokes Banner */}
          {machloket && (
            <div className="chavrusa-machloket-banner">
              <div className="banner-icon">⚔️</div>
              <div className="banner-content">
                <strong dir="rtl">{machloket.hebrewSummary}</strong>
                <p>{machloket.summary}</p>
              </div>
            </div>
          )}

          {/* Side by Side Cards */}
          <div className="chavrusa-cards">
            <div className="chavrusa-card">
              <CommentatorBadge name={leftComm} showApproach onClick={() => onSelectCommentator(leftComm)} />
              <div className="card-info">
                {RABBINIC_NETWORK[leftComm]?.approach && (
                  <p className="comm-approach">{RABBINIC_NETWORK[leftComm].approach}</p>
                )}
              </div>
              <button className="open-commentary-btn" onClick={() => onOpenCommentary?.(leftComm)}>
                📖 פתח פירוש
              </button>
              <a
                href={getSefariaLink(leftComm, reference)}
                target="_blank"
                rel="noopener noreferrer"
                className="sefaria-link-btn"
              >
                לקרוא בספריא →
              </a>
            </div>

            <div className="chavrusa-card">
              <CommentatorBadge name={rightComm} showApproach onClick={() => onSelectCommentator(rightComm)} />
              <div className="card-info">
                {RABBINIC_NETWORK[rightComm]?.approach && (
                  <p className="comm-approach">{RABBINIC_NETWORK[rightComm].approach}</p>
                )}
              </div>
              <button className="open-commentary-btn" onClick={() => onOpenCommentary?.(rightComm)}>
                📖 פתח פירוש
              </button>
              <a
                href={getSefariaLink(rightComm, reference)}
                target="_blank"
                rel="noopener noreferrer"
                className="sefaria-link-btn"
              >
                לקרוא בספריא →
              </a>
            </div>
          </div>

          {/* Study Prompts */}
          <div className="chavrusa-prompts">
            <h5>🎯 שאלות ללימוד משותף</h5>
            <ul>
              {prompts.map((prompt, i) => (
                <li key={i} dir={/[\u0590-\u05FF]/.test(prompt) ? 'rtl' : 'ltr'}>
                  {prompt}
                </li>
              ))}
            </ul>
          </div>

          {/* Learning Tip */}
          <div className="chavrusa-tip">
            <strong>💡 טיפ:</strong> קרא קודם את שניהם בנפרד, ואז חזור והשווה
          </div>
        </div>
      ) : (
        <div className="chavrusa-empty">
          <p dir="rtl">בחר שני מפרשים להשוואה</p>
          <p>Select two commentators to compare their approaches</p>
        </div>
      )}
    </div>
  );
};

/**
 * Today's Learning Panel - Track daily progress
 */
const TodayLearningPanel = ({ activeCommentators }) => {
  const [todayData, setTodayData] = useState(() => getTodayLearning());
  const [streak, setStreak] = useState(1);

  useEffect(() => {
    const data = getTodayLearning();
    setTodayData(data);
    setStreak(updateLearningStreak());
  }, []);

  const learnedToday = todayData.commentators || [];

  return (
    <div className="kg-today-panel">
      <div className="today-header">
        <div className="today-title">
          <span className="today-icon">📅</span>
          <div>
            <h4 dir="rtl">הלימוד של היום</h4>
            <span className="today-date">{new Date().toLocaleDateString('he-IL', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
          </div>
        </div>
        {streak > 1 && (
          <div className="streak-badge">
            🔥 {streak} ימים רצופים
          </div>
        )}
      </div>

      <div className="today-stats">
        <div className="stat-box">
          <span className="stat-number">{learnedToday.length}</span>
          <span className="stat-label">מפרשים נלמדו</span>
        </div>
        <div className="stat-box">
          <span className="stat-number">{activeCommentators?.length || 0}</span>
          <span className="stat-label">זמינים בפסוק</span>
        </div>
      </div>

      {learnedToday.length > 0 ? (
        <div className="today-learned">
          <h5 dir="rtl">למדת היום:</h5>
          <div className="learned-list">
            {learnedToday.map(name => {
              const info = RABBINIC_NETWORK[name];
              return (
                <div key={name} className="learned-item">
                  <span>{info?.icon || '📚'}</span>
                  <span dir="rtl">{info?.hebrewName || name}</span>
                  <span className="check">✓</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="today-empty">
          <p dir="rtl">עוד לא למדת היום - בוא נתחיל! 📖</p>
        </div>
      )}

      <div className="today-suggestion">
        <h5>📌 המלצה להיום</h5>
        <p dir="rtl">
          {learnedToday.includes('Rashi')
            ? 'כבר למדת רש"י - נסה להוסיף רמב"ן או רשב"ם'
            : 'התחל ברש"י - הפירוש הבסיסי לכל תלמיד תורה'}
        </p>
      </div>
    </div>
  );
};

/**
 * Details Panel - Full commentator info with study focus
 */
const DetailsPanel = ({ commentator, reference, onClose }) => {
  const info = RABBINIC_NETWORK[commentator];
  const periodInfo = info?.period ? PERIODS[info.period] : null;
  const approaches = COMMENTATOR_APPROACHES[commentator] || [];

  if (!info) return null;

  return (
    <div className="kg-details-panel">
      <button className="close-btn" onClick={onClose}>×</button>

      <div className="details-header" style={{ '--period-color': periodInfo?.color }}>
        <span className="header-icon">{info.icon}</span>
        <div className="header-names">
          <h3 className="hebrew-name" dir="rtl">{info.hebrewName}</h3>
          <span className="english-name">{commentator}</span>
          {info.fullName && <span className="full-name">{info.fullName}</span>}
        </div>
      </div>

      <div className="details-body">
        <div className="info-row">
          <span className="info-label">תקופה</span>
          <span className="info-value">
            {periodInfo?.icon} {periodInfo?.hebrewName} ({info.dates})
          </span>
        </div>

        {info.location && (
          <div className="info-row">
            <span className="info-label">מקום</span>
            <span className="info-value">{info.location}</span>
          </div>
        )}

        <div className="info-row">
          <span className="info-label">שיטה</span>
          <span className="info-value">{info.style}</span>
        </div>

        {info.approach && (
          <div className="info-row full-width">
            <span className="info-label">גישה</span>
            <span className="info-value">{info.approach}</span>
          </div>
        )}

        {approaches.length > 0 && (
          <div className="info-row">
            <span className="info-label">סוג פירוש</span>
            <div className="approach-tags">
              {approaches.map(app => (
                <span
                  key={app}
                  className="approach-tag"
                  style={{ backgroundColor: `${APPROACH_CATEGORIES[app]?.color}20`, color: APPROACH_CATEGORIES[app]?.color }}
                >
                  {APPROACH_CATEGORIES[app]?.icon} {APPROACH_CATEGORIES[app]?.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {info.works && (
          <div className="info-row full-width">
            <span className="info-label">חיבורים עיקריים</span>
            <span className="info-value">{info.works.join(' • ')}</span>
          </div>
        )}

        {info.teachers?.length > 0 && (
          <div className="info-row">
            <span className="info-label">רבותיו</span>
            <span className="info-value">{info.teachers.join(', ')}</span>
          </div>
        )}

        {info.students?.length > 0 && (
          <div className="info-row">
            <span className="info-label">תלמידיו</span>
            <span className="info-value">{info.students.join(', ')}</span>
          </div>
        )}
      </div>

      <div className="details-actions">
        <a
          href={getSefariaLink(commentator, reference)}
          target="_blank"
          rel="noopener noreferrer"
          className="sefaria-btn"
        >
          📖 קרא פירוש בספריא
        </a>
        <a
          href={`https://www.sefaria.org/topics/${commentator.replace(/\s+/g, '-')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="sefaria-btn secondary"
        >
          👤 עוד על {info.hebrewName}
        </a>
      </div>
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const KnowledgeGraph = ({
  centerNodeId,
  commentators = [],
  availableCommentators = null,
  commentaryData = null, // Actual commentary text if available
  onNodeClick,
  onOpenCommentary, // Callback to open a specific commentator in CommentaryTab
  viewMode = 'study'
}) => {
  const [activeView, setActiveView] = useState('path'); // 'path' | 'shita' | 'machloket' | 'chavrusa' | 'today'
  const [selectedCommentator, setSelectedCommentator] = useState(null);

  // Use available commentators or defaults
  const activeCommentators = useMemo(() => {
    return availableCommentators || commentators;
  }, [availableCommentators, commentators]);

  // Handle commentator selection
  const handleSelectCommentator = useCallback((name) => {
    setSelectedCommentator(name);
    onNodeClick?.({ id: name, label: name, type: 'rabbi' });
  }, [onNodeClick]);

  // Parse reference for display
  const displayRef = useMemo(() => {
    if (!centerNodeId) return null;
    return centerNodeId.replace(/\./g, ' ').replace(/_/g, ' ');
  }, [centerNodeId]);

  // Empty state
  if (activeCommentators.length === 0) {
    return (
      <div className="kg-container kg-empty">
        <div className="empty-icon">📚</div>
        <h3 dir="rtl">בחר פסוק ללימוד</h3>
        <p>Select a verse with commentaries to begin studying</p>
      </div>
    );
  }

  return (
    <div className="kg-container kg-study-mode">
      {/* Header */}
      <div className="kg-header">
        <div className="header-title">
          <span className="title-icon">🎓</span>
          <div className="title-text">
            <h3 className="title-hebrew" dir="rtl">כלי לימוד</h3>
            <span className="title-english">Study Tools</span>
          </div>
        </div>

        {displayRef && (
          <div className="current-ref">
            <span dir="rtl">{displayRef}</span>
          </div>
        )}
      </div>

      {/* View Tabs - Two Rows for Better Organization */}
      <div className="kg-view-tabs-container">
        <div className="kg-view-tabs">
          <button
            className={`view-tab ${activeView === 'path' ? 'active' : ''}`}
            onClick={() => setActiveView('path')}
          >
            <span className="tab-icon">📚</span>
            <span className="tab-label" dir="rtl">סדר לימוד</span>
          </button>
          <button
            className={`view-tab ${activeView === 'shita' ? 'active' : ''}`}
            onClick={() => setActiveView('shita')}
          >
            <span className="tab-icon">📊</span>
            <span className="tab-label" dir="rtl">שיטות</span>
          </button>
          <button
            className={`view-tab ${activeView === 'machloket' ? 'active' : ''}`}
            onClick={() => setActiveView('machloket')}
          >
            <span className="tab-icon">⚔️</span>
            <span className="tab-label" dir="rtl">מחלוקות</span>
          </button>
        </div>
        <div className="kg-view-tabs kg-view-tabs-secondary">
          <button
            className={`view-tab ${activeView === 'chavrusa' ? 'active' : ''}`}
            onClick={() => setActiveView('chavrusa')}
          >
            <span className="tab-icon">👥</span>
            <span className="tab-label" dir="rtl">חברותא</span>
          </button>
          <button
            className={`view-tab ${activeView === 'today' ? 'active' : ''}`}
            onClick={() => setActiveView('today')}
          >
            <span className="tab-icon">📅</span>
            <span className="tab-label" dir="rtl">היום</span>
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="kg-quick-stats">
        <span className="stat">
          <strong>{activeCommentators.length}</strong> מפרשים זמינים
        </span>
        <span className="stat">
          <strong>{findMachlokes(activeCommentators).length}</strong> מחלוקות
        </span>
      </div>

      {/* Main Content */}
      <div className="kg-content">
        <div className="kg-main">
          {activeView === 'path' && (
            <StudyPathView
              availableCommentators={activeCommentators}
              reference={centerNodeId}
              onSelectCommentator={handleSelectCommentator}
            />
          )}

          {activeView === 'shita' && (
            <ShitaGridView
              commentators={commentators}
              availableCommentators={activeCommentators}
              onSelectCommentator={handleSelectCommentator}
              reference={centerNodeId}
            />
          )}

          {activeView === 'machloket' && (
            <MachloketView
              commentators={commentators}
              availableCommentators={activeCommentators}
              reference={centerNodeId}
              onSelectCommentator={handleSelectCommentator}
            />
          )}

          {activeView === 'chavrusa' && (
            <ChavrusaView
              commentators={commentators}
              availableCommentators={activeCommentators}
              reference={centerNodeId}
              onSelectCommentator={handleSelectCommentator}
              onOpenCommentary={(name) => {
                // Track that user studied this commentator
                addCommentatorToToday(name);
                // Call parent callback if provided
                onOpenCommentary?.(name);
              }}
            />
          )}

          {activeView === 'today' && (
            <TodayLearningPanel activeCommentators={activeCommentators} />
          )}
        </div>

        {/* Details Panel */}
        {selectedCommentator && (
          <DetailsPanel
            commentator={selectedCommentator}
            reference={centerNodeId}
            onClose={() => setSelectedCommentator(null)}
          />
        )}
      </div>

      {/* Footer Tip */}
      <div className="kg-footer-tip" dir="rtl">
        💡 לחץ על מפרש לפרטים נוספים וקישור לספריא
      </div>
    </div>
  );
};

KnowledgeGraph.propTypes = {
  centerNodeId: PropTypes.string,
  commentators: PropTypes.arrayOf(PropTypes.string),
  availableCommentators: PropTypes.arrayOf(PropTypes.string),
  commentaryData: PropTypes.object,
  onNodeClick: PropTypes.func,
  onOpenCommentary: PropTypes.func, // Callback when user wants to open a specific commentary
  viewMode: PropTypes.string
};

export default KnowledgeGraph;
