/**
 * Talmud Study Hooks - PRO SCHOLAR V31
 *
 * Shared React hooks for Talmud study components.
 * Single source of truth for:
 * - useCopyToClipboard - Clipboard operations
 * - useStudyNotes - Personal notes with persistence
 * - useMasteryLevel - Learning progress tracking
 *
 * Used by:
 * - TalmudToolsTab.js
 * - UnifiedSugyaAnalysis/index.js
 * - Other scholar-mode components
 */

import { useState, useCallback } from 'react';
import { safeGet, safeSet } from '../utils/safeLocalStorage';
import { STORAGE_KEYS } from '../constants/talmudStudy';

// =============================================================================
// useCopyToClipboard - Clipboard operations with feedback
// =============================================================================

export function useCopyToClipboard() {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return true;
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      return false;
    }
  }, []);

  return { copied, copy };
}

// =============================================================================
// useStudyNotes - Personal notes with localStorage persistence
// =============================================================================

const MAX_NOTES_ENTRIES = 100;
const MAX_NOTE_TEXT_LENGTH = 5000;
const MAX_INSIGHTS_PER_SUGYA = 20;

export function useStudyNotes(sugyaKey) {
  const [notes, setNotes] = useState(() => {
    if (!sugyaKey) return { text: '', insights: [], questions: [] };
    const all = safeGet(STORAGE_KEYS.notes, {});
    return all[sugyaKey] || { text: '', insights: [], questions: [] };
  });

  const saveNotes = useCallback((newNotes) => {
    if (!sugyaKey) return;

    const sanitized = {
      text: (newNotes.text || '').slice(0, MAX_NOTE_TEXT_LENGTH),
      insights: (newNotes.insights || []).slice(-MAX_INSIGHTS_PER_SUGYA),
      questions: newNotes.questions || []
    };

    setNotes(sanitized);

    const all = safeGet(STORAGE_KEYS.notes, {});
    all[sugyaKey] = sanitized;

    // Limit total entries to prevent localStorage overflow
    const keys = Object.keys(all);
    if (keys.length > MAX_NOTES_ENTRIES) {
      keys.slice(0, keys.length - MAX_NOTES_ENTRIES).forEach(k => delete all[k]);
    }

    safeSet(STORAGE_KEYS.notes, all);
  }, [sugyaKey]);

  const addInsight = useCallback((insight) => {
    if (!insight || !sugyaKey) return;

    setNotes(prev => {
      const updated = {
        ...prev,
        insights: [...(prev.insights || []), {
          text: insight,
          timestamp: new Date().toISOString()
        }].slice(-MAX_INSIGHTS_PER_SUGYA)
      };

      const all = safeGet(STORAGE_KEYS.notes, {});
      all[sugyaKey] = updated;
      safeSet(STORAGE_KEYS.notes, all);

      return updated;
    });
  }, [sugyaKey]);

  const addQuestion = useCallback((question) => {
    if (!question || !sugyaKey) return;

    setNotes(prev => {
      const updated = {
        ...prev,
        questions: [...(prev.questions || []), {
          text: question,
          timestamp: new Date().toISOString(),
          answered: false
        }]
      };

      const all = safeGet(STORAGE_KEYS.notes, {});
      all[sugyaKey] = updated;
      safeSet(STORAGE_KEYS.notes, all);

      return updated;
    });
  }, [sugyaKey]);

  return { notes, saveNotes, addInsight, addQuestion };
}

// =============================================================================
// useMasteryLevel - Learning progress tracking
// =============================================================================

export function useMasteryLevel(sugyaKey) {
  const [level, setLevel] = useState(() => {
    if (!sugyaKey) return 0;
    const all = safeGet(STORAGE_KEYS.mastery, {});
    return all[sugyaKey] || 0;
  });

  const updateLevel = useCallback((newLevel) => {
    if (!sugyaKey) return;

    const clampedLevel = Math.max(0, Math.min(5, newLevel)); // 0-5 scale
    setLevel(clampedLevel);

    const all = safeGet(STORAGE_KEYS.mastery, {});
    all[sugyaKey] = clampedLevel;
    safeSet(STORAGE_KEYS.mastery, all);
  }, [sugyaKey]);

  const incrementLevel = useCallback(() => {
    updateLevel(level + 1);
  }, [level, updateLevel]);

  const decrementLevel = useCallback(() => {
    updateLevel(level - 1);
  }, [level, updateLevel]);

  return { level, updateLevel, incrementLevel, decrementLevel };
}

// =============================================================================
// useChazaraProgress - Track chazara (review) progress
// =============================================================================

export function useChazaraProgress(sugyaKey) {
  const [progress, setProgress] = useState(() => {
    if (!sugyaKey) return { answeredCorrectly: [], lastUpdated: null };
    const all = safeGet(STORAGE_KEYS.chazaraAssessment, {});
    return all[sugyaKey] || { answeredCorrectly: [], lastUpdated: null };
  });

  const markAnswered = useCallback((questionIndex, isCorrect) => {
    if (!sugyaKey) return;

    setProgress(prev => {
      const answeredCorrectly = [...(prev.answeredCorrectly || [])];

      if (isCorrect && !answeredCorrectly.includes(questionIndex)) {
        answeredCorrectly.push(questionIndex);
      } else if (!isCorrect) {
        const idx = answeredCorrectly.indexOf(questionIndex);
        if (idx > -1) answeredCorrectly.splice(idx, 1);
      }

      const updated = {
        answeredCorrectly,
        lastUpdated: new Date().toISOString()
      };

      const all = safeGet(STORAGE_KEYS.chazaraAssessment, {});
      all[sugyaKey] = updated;
      safeSet(STORAGE_KEYS.chazaraAssessment, all);

      return updated;
    });
  }, [sugyaKey]);

  const resetProgress = useCallback(() => {
    if (!sugyaKey) return;

    const reset = { answeredCorrectly: [], lastUpdated: new Date().toISOString() };
    setProgress(reset);

    const all = safeGet(STORAGE_KEYS.chazaraAssessment, {});
    all[sugyaKey] = reset;
    safeSet(STORAGE_KEYS.chazaraAssessment, all);
  }, [sugyaKey]);

  return { progress, markAnswered, resetProgress };
}

// =============================================================================
// useViewPreferences - Persist user's view preferences
// =============================================================================

export function useViewPreferences(componentKey) {
  const [prefs, setPrefs] = useState(() => {
    const all = safeGet(STORAGE_KEYS.viewPrefs, {});
    return all[componentKey] || {};
  });

  const updatePref = useCallback((key, value) => {
    setPrefs(prev => {
      const updated = { ...prev, [key]: value };

      const all = safeGet(STORAGE_KEYS.viewPrefs, {});
      all[componentKey] = updated;
      safeSet(STORAGE_KEYS.viewPrefs, all);

      return updated;
    });
  }, [componentKey]);

  return { prefs, updatePref };
}
