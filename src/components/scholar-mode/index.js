/**
 * ScholarMode - Advanced Torah & Talmud Study Center
 *
 * Core Tabs (Torah Mode - 5 tabs):
 *   - LEARN (לימוד) - AI Analysis modes (Summary, Iyun, Mussar, Machloket, etc.)
 *   - WORDS (מילים) - BDB, Jastrow, Strong's, CAL dictionary integration
 *   - COMMENTARY (פירושים) - Multi-commentary view with summaries
 *   - CHAVRUTA (חברותא) - Unified study partner (Chat, Quiz, Challenge, Compare)
 *   - NOTEBOOK (מחברת) - Personal journal (Questions, Insights, Progress, Today)
 *
 * Talmud-specific Tabs (+2):
 *   - TALMUD (גמרא) - Talmud tools and discourse analysis
 *   - TZURAT HADAF (צורת הדף) - Traditional 3-column layout
 *
 * Visualizations:
 *   - DisagreementVisualization - Machloket/dispute analysis display
 *   - HalachicChainVisualization - Chain of transmission view
 *   - KnowledgeGraph - Concept web for Torah connections
 */

// Utility components
export { LoadingState, ErrorState, EmptyState } from './LoadingStates';
export { default as TabButton } from './TabButton';
export { default as RabbiTooltip } from './RabbiTooltip';
export { default as RAGSourcesPanel } from './RAGSourcesPanel';

// Core tab components (5 tabs)
export { default as AIAnalysisTab } from './AIAnalysisTab';      // LEARN tab
export { default as WordsTab } from './WordsTab';                 // WORDS tab (NEW - split architecture)
export { default as CommentaryTab } from './CommentaryTab';      // COMMENTARY tab
export { default as ChavrutaTab } from './ChavrutaTab';          // CHAVRUTA tab (NEW - consolidated)
export { default as NotebookTab } from './NotebookTab';          // NOTEBOOK tab (NEW - consolidated)

// Backward compatibility - export LookupTab as LexiconTab
export { LookupTab as LexiconTab } from './WordsTab/components';

// Talmud-specific tabs
export { default as SugyaTab } from './SugyaTab';                  // NEW: Halachic Chain visualization
export { default as TalmudToolsTab, StatBadge, CollapsibleSection } from './TalmudToolsTab';
export { default as TzuratHaDafTab } from './TzuratHaDafTab';
export { default as EntitiesTab } from './EntitiesTab';

// Visualization components
export { default as DisagreementVisualization } from './DisagreementVisualization';
export { default as HalachicChainVisualization } from './HalachicChainVisualization';
export { default as KnowledgeGraph } from './KnowledgeGraph';

// Scholar info panels
export { default as RabbiInfoPanel, findRabbi } from './RabbiInfoPanel';
export { default as RealiaPanel, findRealia, detectRealiaInText, getRealiaByCategory } from './RealiaPanel';

// PRO SCHOLAR V6 Analysis Panel
export { default as ProScholarV6Panel } from './ProScholarV6Panel';

// PRO SCHOLAR V15 - Unified Sugya Analysis
export { default as UnifiedSugyaAnalysis } from './UnifiedSugyaAnalysis';
export {
  StudyModeSelector,
  SugyaHeader,
  ViewModeTabs,
  FlowView,
  TreeView,
  DiagramView,
  SummaryView,
  PatternDetailPanel,
  NotesPanel
} from './UnifiedSugyaAnalysis';

// PRO SCHOLAR V31 - Single Source of Truth for Constants
// Re-export from centralized constants file for backwards compatibility
export {
  STUDY_MODES,
  VIEW_MODES,
  HEBREW_TYPE_LABELS,
  TEXT_TYPE_LABELS,
  STUDY_MODE_KEYS,
  TYPE_CATEGORIES,
  STORAGE_KEYS,
  MASECHTA_HEBREW,
  CHAZARA_QUESTION_TEMPLATES,
  ABBR_TYPE_ICONS,
  CROSS_REF_CATEGORIES,
  IYUN_ANALYSIS_PATTERNS,
  IYUN_PROMPTS,
  parseDafReference,
  parseReference,
  stripNikud,
  stripHtmlTags
} from '../../constants/talmudStudy';

// PRO SCHOLAR V31 - Shared Hooks
export {
  useCopyToClipboard,
  useStudyNotes,
  useMasteryLevel,
  useChazaraProgress,
  useViewPreferences
} from '../../hooks/useTalmudStudy';

// AI Tutor Panel (Talmud study prompts)
export { default as AITutorPanel } from './AITutorPanel';
