/**
 * studyTracker — suivi d'apprentissage persistant, indépendant de React.
 *
 * Pourquoi ce module : useStudySession vit dans le dashboard (/study), qui
 * n'est PAS monté pendant la lecture. Les versets lus n'étaient donc jamais
 * comptés (anneaux à 0 % pour toujours, niveau figé). Ce service écrit
 * directement dans localStorage et prévient l'UI via l'événement
 * « study:stats-updated » — le dashboard s'y abonne pour se rafraîchir.
 *
 * Deux compteurs :
 *  - journalier  (torah-study-tracker-day)  : versets uniques lus aujourd'hui
 *    → alimente l'anneau « Verses » du dashboard.
 *  - cumulatif   (torah-study-tracker-life) : versets étudiés au fil de la vie
 *    → alimente le niveau (Beginner → Intermediate → Advanced).
 */
import { LEARNING_LEVELS } from './scholarly/learningRecommendationService';

const DAY_KEY = 'torah-study-tracker-day';
const LIFE_KEY = 'torah-study-tracker-life';
export const STATS_EVENT = 'study:stats-updated';

// Objectifs du jour — SOURCE UNIQUE (le dashboard les lit, plus de « 20 »
// en dur dans les composants).
export const DAILY_VERSES_GOAL = 20;
export const DAILY_WORDS_GOAL = 5;

const today = () => new Date().toDateString();

const read = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const write = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
  window.dispatchEvent(new CustomEvent(STATS_EVENT));
};

let notifiedToday = new Set();

/* ------------------------------- journalier ------------------------------ */

const dayData = () => {
  const d = read(DAY_KEY, { date: today(), versesRead: 0, verseIds: [], minutesAuto: 0, wordsLearned: 0, wordIds: [] });
  if (d.date !== today()) return { date: today(), versesRead: 0, verseIds: [], minutesAuto: 0, wordsLearned: 0, wordIds: [] };
  return d;
};

export function getTodayStats() {
  const d = dayData();
  return {
    versesRead: d.versesRead,
    wordsLearned: d.wordsLearned || 0,
    minutesAuto: d.minutesAuto || 0,
    versesProgress: Math.min(100, Math.round((d.versesRead / DAILY_VERSES_GOAL) * 100)),
    wordsProgress: Math.min(100, Math.round(((d.wordsLearned || 0) / DAILY_WORDS_GOAL) * 100)),
    // compat : progress == anneau des versets
    progress: Math.min(100, Math.round((d.versesRead / DAILY_VERSES_GOAL) * 100))
  };
}

// --------------------------- temps automatique ----------------------------
// Le temps passé sur le lecteur compte sans appuyer sur ▶ : accumulateur
// en secondes, arrondi à la minute pour les anneaux. Uniquement quand
// l'onglet est visible.
let autoPendingSeconds = 0;
let autoTimer = null;

function flushAutoMinutes() {
  if (autoPendingSeconds >= 60) {
    const minutes = Math.floor(autoPendingSeconds / 60);
    autoPendingSeconds -= minutes * 60;
    const d = dayData();
    d.minutesAuto = (d.minutesAuto || 0) + minutes;
    write(DAY_KEY, d);
  }
}

export function beginAutoTime() {
  if (autoTimer) return;
  autoTimer = setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    autoPendingSeconds += 15;
    if (autoPendingSeconds >= 60) flushAutoMinutes();
  }, 15000);
}

export function endAutoTime() {
  flushAutoMinutes();
  if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
}

/* ------------------------------- cumulatif ------------------------------- */

const lifeData = () => read(LIFE_KEY, { versesStudied: 0, verseRefs: [] });

// Le 4ᵉ niveau (SCHOLAR) vit dans LEARNING_LEVELS ; l'ordre ici doit le
// refléter, sinon la progression reste bloquée à « Advanced 100 % ».
const LEVEL_ORDER = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'SCHOLAR'];

function computeLevel(versesStudied) {
  const levels = LEVEL_ORDER.map(id => ({ id, cfg: LEARNING_LEVELS[id] || LEARNING_LEVELS.BEGINNER }));
  let current = levels[0];
  for (const l of levels) {
    if (versesStudied >= (l.cfg.criteria?.versesStudied ?? 0)) current = l;
  }
  const idx = levels.indexOf(current);
  const next = levels[idx + 1] || null;
  const progressToNextLevel = next
    ? Math.min(100, Math.round((versesStudied / Math.max(1, next.cfg.criteria?.versesStudied ?? 1)) * 100))
    : 100;
  return {
    level: current.id.toUpperCase(),
    label: current.cfg.label,
    hebrewLabel: current.cfg.hebrewLabel,
    versesStudied,
    nextLabel: next ? next.cfg.label : null,
    progressToNextLevel
  };
}

export function getLevelProgress() {
  return computeLevel(lifeData().versesStudied);
}

/* --------------------------- enregistrement ------------------------------ */

/**
 * Marque un verset comme lu. Unique par jour pour l'anneau, cumulatif pour
 * le niveau. Déduplique par référence (Genesis.1:1).
 * @param {string} ref - ex. « Genesis.1:1 »
 */
export function registerVerseRead(ref) {
  if (!ref) return false;

  const d = dayData();
  const isNewToday = !d.verseIds.includes(ref);
  if (isNewToday) {
    d.verseIds.push(ref);
    d.versesRead = d.verseIds.length;
    write(DAY_KEY, d);
  }

  const life = lifeData();
  if (!life.verseRefs.includes(ref)) {
    life.verseRefs.push(ref);
    life.versesStudied = life.verseRefs.length;
    // garde-fou mémoire : on ne conserve que les 5 000 dernières références
    if (life.verseRefs.length > 5000) life.verseRefs = life.verseRefs.slice(-5000);
    write(LIFE_KEY, life);
  }

  return isNewToday;
}

/**
 * Marque un mot comme appris aujourd'hui (sauvegarde dans le carnet depuis
 * le lecteur). Unique par jour — revoir le même mot ne regonfle pas l'anneau.
 * @param {string} word - le mot hébreu/araméen tel qu'affiché
 */
export function registerWordLearned(word) {
  if (!word) return false;
  const key = String(word).trim().toLowerCase();

  const d = dayData();
  if (!d.wordIds) d.wordIds = [];
  if (d.wordIds.includes(key)) return false;
  d.wordIds.push(key);
  d.wordsLearned = d.wordIds.length;
  write(DAY_KEY, d);
  return true;
}
