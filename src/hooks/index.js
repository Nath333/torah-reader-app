/**
 * Hooks Index - Clean exports for all custom hooks
 * Usage: import { useDarkMode, useLocalStorage } from './hooks';
 */

// =============================================================================
// Core Utility Hooks
// =============================================================================
export { default as useDebounce, useDebouncedValue } from './useDebounce';
export { default as useThrottle, useThrottledValue } from './useThrottle';
export { default as useLocalStorage } from './useLocalStorage';
export { default as useOnlineStatus } from './useOnlineStatus';
export { default as useViewRouting } from './useViewRouting';
// Note: useModals moved to context/ModalContext for global modal state

// ============================================================================
// State Management Hooks
// ============================================================================
export { default as useAsyncOperation, useAsyncCallback } from './useAsyncOperation';
export {
  default as useToggleSetting,
  useToggleState,
  useToggleWithCallback,
  useToggleGroup
} from './useToggleSetting';
export {
  default as useReducerWithMiddleware,
  createAsyncReducer,
  createListReducer,
  createFormReducer,
  useFormReducer,
  loggerMiddleware,
  createPersistMiddleware,
  thunkMiddleware
} from './useReducerWithMiddleware';

// ============================================================================
// UI Hooks
// ============================================================================
export { default as useDarkMode } from './useDarkMode';
export { default as useScrollProgress } from './useScrollProgress';
export { default as useKeyboardShortcuts } from './useKeyboardShortcuts';
export { default as useSpeech } from './useSpeech';
export { default as useUrlState } from './useUrlState';

// ============================================================================
// Domain-Specific Hooks
// ============================================================================
export { default as useHebrewDate, getGreeting } from './useHebrewDate';
export { default as useReadingHistory } from './useReadingHistory';
export { default as useStudySession } from './useStudySession';
export { default as useStudyStreak } from './useStudyStreak';
export { default as useVerseNotes } from './useVerseNotes';
export { default as useVocabulary } from './useVocabulary';
export { default as useWordLookup } from './useWordLookup';
export {
  default as useWordIntelligence,
  LRUCache,
  calculateDifficulty,
  estimateStudyTime,
  getCrossReferences
} from './useWordIntelligence';
export { default as useMastery, MASTERY_LEVELS } from './useMastery';
export { default as useAnalysisHistory } from './useAnalysisHistory';
export { default as useCommentaryLoader } from './useCommentaryLoader';
export { default as useTranslationLoading } from './useTranslationLoading';
export { default as useVerseSelection } from './useVerseSelection';

// ============================================================================
// Smart Data Hooks (Unified Intelligence Layer)
// ============================================================================
export {
  useConnectivity,
  useSmartLookup,
  useSmartRAG,
  useSmartAnalysis,
  useDataAvailability,
  usePrefetch,
  useSmartStudy
} from './useSmartData';
