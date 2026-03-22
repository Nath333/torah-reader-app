/**
 * Context Index - Clean exports for all React contexts
 * Usage: import { useTorah, useSettings, useStudy } from './context';
 */

// =============================================================================
// Core App Contexts
// =============================================================================

// Torah/Text Context - manages current book, chapter, verses
export { TorahProvider, useTorah } from './TorahContext';

// Settings Context - manages app preferences (dark mode, sidebar, etc.)
export { SettingsProvider, useSettings } from './SettingsContext';

// Study Context - manages bookmarks, vocabulary, notes, history
export { StudyProvider, useStudy } from './StudyContext';

// =============================================================================
// Feature Contexts
// =============================================================================

// Study Mode Context - manages scholar mode, analysis tabs
export {
  StudyModeProvider,
  useStudyMode,
  STUDY_MODES,
  STUDY_MODE_CONFIG
} from './StudyModeContext';

// Toast Context - manages toast notifications
export {
  ToastProvider,
  useToast
} from './ToastContext';

// Commentary Context - centralized commentary data with caching
export {
  CommentaryProvider,
  useCommentary,
  useCommentaryForVerse
} from './CommentaryContext';

// Modal Context - centralized modal state management
export {
  ModalProvider,
  useModals,
  useModal,
  MODALS
} from './ModalContext';

// =============================================================================
// PRO SCHOLAR V8: Initialization Context
// =============================================================================

// Initialization Context - tracks app startup and dictionary loading
export {
  InitializationProvider,
  useInitialization,
  useWaitForInit,
  INIT_STATES
} from './InitializationContext';
