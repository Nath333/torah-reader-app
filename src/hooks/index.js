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
  default as usePanelData,
  useSetToggle,
  buildPanelClassName,
  toggleSetItem,
  renderPanelLoading,
  renderPanelError
} from './usePanelData';
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

// ============================================================================
// PRO SCHOLAR v4 Hooks
// ============================================================================
export {
  default as useProScholarV4,
  useWordAnalysis,
  useCrossRefs,
  useSRSCard,
  useKnowledgeGraph
} from './useProScholarV4';

// ============================================================================
// PRO SCHOLAR V6 Hooks (Unified Root Service Integration)
// ============================================================================
export {
  default as useProScholarV6,
  useProScholarTelemetry,
  useRootFamily,
  useDialectDetection,
  WEAK_VERB_DISPLAY,
  TIER_DISPLAY,
  DIALECT_DISPLAY,
  SEMANTIC_FIELD_DISPLAY
} from './useProScholarV6';
