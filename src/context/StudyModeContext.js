/**
 * StudyModeContext - Yeshiva-style learning modes
 *
 * Three core modes reflecting traditional Torah study methods:
 *
 * 1. IYUN (עיון) - Deep Analysis
 *    - Full commentary display
 *    - AI analysis enabled
 *    - Cross-references expanded
 *    - Slow, thorough study
 *
 * 2. BEKIUT (בקיאות) - Broad Coverage
 *    - Minimal interruption
 *    - Quick translations only
 *    - Focus on reading flow
 *    - Cover more ground
 *
 * 3. CHAZARA (חזרה) - Review Mode
 *    - Spaced repetition active
 *    - Test yourself features
 *    - Track mastery
 *    - Reinforce learning
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';

// =============================================================================
// Study Mode Definitions
// =============================================================================

export const STUDY_MODES = {
  IYUN: 'iyun',
  BEKIUT: 'bekiut',
  CHAZARA: 'chazara'
};

export const STUDY_MODE_CONFIG = {
  [STUDY_MODES.IYUN]: {
    name: 'עיון',
    englishName: 'Iyun (Deep Study)',
    description: 'Deep analysis with full commentaries and AI insights',
    icon: '🔬',
    features: {
      showAllCommentaries: true,
      enableAI: true,
      showCrossRefs: true,
      autoExpandSources: true,
      showGrammar: true,
      showEtymology: true,
      enableChavruta: true,
      trackKushyot: true,
      readingSpeed: 'slow'
    }
  },
  [STUDY_MODES.BEKIUT]: {
    name: 'בקיאות',
    englishName: 'Bekiut (Broad Coverage)',
    description: 'Quick reading with essential translations only',
    icon: '📖',
    features: {
      showAllCommentaries: false,
      enableAI: false,
      showCrossRefs: false,
      autoExpandSources: false,
      showGrammar: false,
      showEtymology: false,
      enableChavruta: false,
      trackKushyot: false,
      readingSpeed: 'fast'
    }
  },
  [STUDY_MODES.CHAZARA]: {
    name: 'חזרה',
    englishName: 'Chazara (Review)',
    description: 'Review mode with testing and spaced repetition',
    icon: '🔄',
    features: {
      showAllCommentaries: false,
      enableAI: true,
      showCrossRefs: false,
      autoExpandSources: false,
      showGrammar: false,
      showEtymology: false,
      enableChavruta: false,
      trackKushyot: false,
      readingSpeed: 'medium',
      enableSRS: true,
      enableTesting: true,
      hideTranslationsFirst: true
    }
  }
};

// =============================================================================
// Kushya (Question) Tracking
// =============================================================================

const createKushya = (text, context) => ({
  id: `kushya_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  text,
  context: {
    book: context.book,
    chapter: context.chapter,
    verse: context.verse,
    selectedText: context.selectedText || null
  },
  status: 'open', // open, resolved, deferred
  terutz: null, // resolution
  source: null, // where answer was found
  createdAt: Date.now(),
  resolvedAt: null,
  priority: 'normal', // low, normal, high, critical
  tags: []
});

// =============================================================================
// Learning Session Tracking
// =============================================================================

const createLearningSession = (mode, context) => ({
  id: `session_${Date.now()}`,
  mode,
  startedAt: Date.now(),
  endedAt: null,
  context: {
    book: context.book,
    chapter: context.chapter,
    startVerse: context.verse
  },
  progress: {
    versesRead: 0,
    wordsLookedUp: [],
    commentariesViewed: [],
    kushyotRaised: 0,
    kushyotResolved: 0
  },
  notes: []
});

// =============================================================================
// Context
// =============================================================================

const StudyModeContext = createContext(null);

export const StudyModeProvider = ({ children }) => {
  // Core state
  const [currentMode, setCurrentMode] = useLocalStorage('studyMode', STUDY_MODES.IYUN);
  const [kushyot, setKushyot] = useLocalStorage('kushyot', []);
  const [sessions, setSessions] = useLocalStorage('learningSessions', []);
  const [currentSession, setCurrentSession] = useState(null);

  // Chavruta state
  const [chavrutaActive, setChavrutaActive] = useState(false);
  const [chavrutaHistory, setChavrutaHistory] = useState([]);

  // Get current mode config
  const modeConfig = STUDY_MODE_CONFIG[currentMode];
  const features = modeConfig?.features || {};

  // =============================================================================
  // Mode Management
  // =============================================================================

  const switchMode = useCallback((newMode) => {
    if (STUDY_MODES[newMode.toUpperCase()] || Object.values(STUDY_MODES).includes(newMode)) {
      // End current session if exists
      if (currentSession) {
        const endedSession = {
          ...currentSession,
          endedAt: Date.now()
        };
        setSessions(prev => [...prev, endedSession]);
      }

      setCurrentMode(newMode);
      setCurrentSession(null);
    }
  }, [currentSession, setSessions, setCurrentMode]);

  // =============================================================================
  // Session Management
  // =============================================================================

  const startSession = useCallback((context) => {
    const session = createLearningSession(currentMode, context);
    setCurrentSession(session);
    return session;
  }, [currentMode]);

  const endSession = useCallback(() => {
    if (currentSession) {
      const endedSession = {
        ...currentSession,
        endedAt: Date.now()
      };
      setSessions(prev => [...prev, endedSession]);
      setCurrentSession(null);
      return endedSession;
    }
    return null;
  }, [currentSession, setSessions]);

  const updateSessionProgress = useCallback((updates) => {
    if (currentSession) {
      setCurrentSession(prev => ({
        ...prev,
        progress: {
          ...prev.progress,
          ...updates
        }
      }));
    }
  }, [currentSession]);

  // =============================================================================
  // Kushya Management
  // =============================================================================

  const addKushya = useCallback((text, context) => {
    const kushya = createKushya(text, context);
    setKushyot(prev => [kushya, ...prev]);

    if (currentSession) {
      updateSessionProgress({
        kushyotRaised: (currentSession.progress.kushyotRaised || 0) + 1
      });
    }

    return kushya;
  }, [setKushyot, currentSession, updateSessionProgress]);

  const resolveKushya = useCallback((kushyaId, terutz, source = null) => {
    setKushyot(prev => prev.map(k =>
      k.id === kushyaId
        ? {
            ...k,
            status: 'resolved',
            terutz,
            source,
            resolvedAt: Date.now()
          }
        : k
    ));

    if (currentSession) {
      updateSessionProgress({
        kushyotResolved: (currentSession.progress.kushyotResolved || 0) + 1
      });
    }
  }, [setKushyot, currentSession, updateSessionProgress]);

  const deferKushya = useCallback((kushyaId) => {
    setKushyot(prev => prev.map(k =>
      k.id === kushyaId
        ? { ...k, status: 'deferred' }
        : k
    ));
  }, [setKushyot]);

  const deleteKushya = useCallback((kushyaId) => {
    setKushyot(prev => prev.filter(k => k.id !== kushyaId));
  }, [setKushyot]);

  const getOpenKushyot = useCallback(() => {
    return kushyot.filter(k => k.status === 'open');
  }, [kushyot]);

  const getKushyotForContext = useCallback((book, chapter, verse = null) => {
    return kushyot.filter(k => {
      if (k.context.book !== book) return false;
      if (k.context.chapter !== chapter) return false;
      if (verse !== null && k.context.verse !== verse) return false;
      return true;
    });
  }, [kushyot]);

  // =============================================================================
  // Chavruta (Study Partner) Management
  // =============================================================================

  const startChavruta = useCallback(() => {
    setChavrutaActive(true);
    setChavrutaHistory([]);
  }, []);

  const endChavruta = useCallback(() => {
    setChavrutaActive(false);
    // Could save history to sessions
  }, []);

  const addChavrutaExchange = useCallback((question, response) => {
    setChavrutaHistory(prev => [...prev, {
      timestamp: Date.now(),
      question,
      response
    }]);
  }, []);

  // =============================================================================
  // Statistics & Analytics
  // =============================================================================

  const getStudyStats = useCallback(() => {
    const allSessions = [...sessions, currentSession].filter(Boolean);

    const totalTime = allSessions.reduce((acc, s) => {
      const end = s.endedAt || Date.now();
      return acc + (end - s.startedAt);
    }, 0);

    const byMode = {};
    for (const mode of Object.values(STUDY_MODES)) {
      const modeSessions = allSessions.filter(s => s.mode === mode);
      byMode[mode] = {
        sessions: modeSessions.length,
        totalTime: modeSessions.reduce((acc, s) => {
          const end = s.endedAt || Date.now();
          return acc + (end - s.startedAt);
        }, 0)
      };
    }

    return {
      totalSessions: allSessions.length,
      totalTimeMs: totalTime,
      totalTimeFormatted: formatDuration(totalTime),
      byMode,
      totalKushyot: kushyot.length,
      openKushyot: kushyot.filter(k => k.status === 'open').length,
      resolvedKushyot: kushyot.filter(k => k.status === 'resolved').length
    };
  }, [sessions, currentSession, kushyot]);

  // =============================================================================
  // Context Value
  // =============================================================================

  const value = {
    // Current state
    currentMode,
    modeConfig,
    features,
    currentSession,

    // Mode management
    switchMode,
    STUDY_MODES,
    STUDY_MODE_CONFIG,

    // Session management
    startSession,
    endSession,
    updateSessionProgress,

    // Kushya management
    kushyot,
    addKushya,
    resolveKushya,
    deferKushya,
    deleteKushya,
    getOpenKushyot,
    getKushyotForContext,

    // Chavruta
    chavrutaActive,
    chavrutaHistory,
    startChavruta,
    endChavruta,
    addChavrutaExchange,

    // Stats
    getStudyStats
  };

  return (
    <StudyModeContext.Provider value={value}>
      {children}
    </StudyModeContext.Provider>
  );
};

// =============================================================================
// Hook
// =============================================================================

export const useStudyMode = () => {
  const context = useContext(StudyModeContext);
  if (!context) {
    throw new Error('useStudyMode must be used within a StudyModeProvider');
  }
  return context;
};

// =============================================================================
// Helpers
// =============================================================================

function formatDuration(ms) {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export default StudyModeContext;
