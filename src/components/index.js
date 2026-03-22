// =============================================================================
// Components Index - Clean exports for all components
// Usage: import { AudioPlayer, TorahReader } from './components';
// =============================================================================

// Core Display Components
export { default as TorahReader } from './core/TorahReader';
export { default as EnhancedVerseDisplay } from './core/EnhancedVerseDisplay';
export { default as ClickableText, ClickableHebrewText, ClickableAramaicText } from './core/ClickableText';
export { default as SafeText } from './core/SafeText';
export { default as ReaderControls } from './core/ReaderControls';
export { default as VerseRow } from './core/VerseRow';

// Commentary Components
export { default as CommentaryBlock, CommentaryGroup, CommentaryContent } from './commentary/CommentaryBlock';
export { default as CommentarySummary } from './commentary/CommentarySummary';
export { default as CommentaryViewer } from './commentary/CommentaryViewer';
export { default as CommentaryToggleDropdown } from './commentary/CommentaryToggleDropdown';
export { default as DiburTranslation, extractDibburTranslation } from './commentary/DiburTranslation';
export { default as RashiFrenchTranslation } from './commentary/RashiFrenchTranslation';

// Dictionary & Glossing Components
export { default as AnnotatedTranslation, AnnotatedTranslationInline } from './dictionary/AnnotatedTranslation';
export { default as WordGlossary } from './dictionary/WordGlossary';
export { default as InterlinearText } from './dictionary/InterlinearText';
export { default as GlossedText } from './dictionary/GlossedText';
export { default as DictionaryTranslation } from './dictionary/DictionaryTranslation';
export { default as MorphologyBreakdown } from './dictionary/MorphologyBreakdown';

// Study & Progress Components
export { default as StudyDashboard } from './study/StudyDashboard';
export { default as MasteryTracker } from './study/MasteryTracker';
export { default as VocabularyBank } from './study/VocabularyBank';
export { default as VocabularyReview } from './study/VocabularyReview';
export { default as ReadingProgressBar } from './study/ReadingProgressBar';
export { default as StreakBadge } from './study/StreakBadge';
export { default as ReadingHistory } from './study/ReadingHistory';
export { default as ReadingStats } from './study/ReadingStats';
export { default as StudyModeSelector } from './study/StudyModeSelector';
export { default as KushyaTracker } from './study/KushyaTracker';
export { default as LimmudLog, UNDERSTANDING_LEVELS } from './study/LimmudLog';

// Navigation & UI Components
export { default as Sidebar } from './navigation/Sidebar';
export { default as Breadcrumb } from './navigation/Breadcrumb';
export { default as VerseJump } from './navigation/VerseJump';
export { default as FloatingActionButton } from './navigation/FloatingActionButton';
export { default as QuickActions } from './navigation/QuickActions';
export { default as DiscoverPanel } from './navigation/DiscoverPanel';
export { default as SmartSearch } from './navigation/SmartSearch';

// Layout Components
export { default as FocusMode } from './layout/FocusMode';
export { default as MikraotGedolotPro } from './layout/MikraotGedolotPro';
export { default as MishnahLayout } from './layout/MishnahLayout';
export { default as TzuratHaDaf } from './layout/TzuratHaDaf';
export { default as TraditionalPageView } from './layout/TraditionalPageView';
export { default as StudyLayoutSelector } from './layout/StudyLayoutSelector';

// Shared UI Components
export { default as AudioPlayer } from './shared/AudioPlayer';
export { default as Bookmarks } from './shared/Bookmarks';
export { default as ConnectivityIndicator } from './shared/ConnectivityIndicator';
export { default as EmptyState, BookmarksEmpty, HistoryEmpty, VocabularyEmpty, SearchEmpty, NotesEmpty, CommentaryEmpty, AnalysisEmpty, ErrorEmpty } from './shared/EmptyState';
export { default as ErrorBoundary } from './shared/ErrorBoundary';
export { default as FriendlyError } from './shared/FriendlyError';
export { default as HeaderGreeting } from './shared/HeaderGreeting';
export { default as LoadingSkeleton } from './shared/LoadingSkeleton';
export { default as NoteEditor } from './shared/NoteEditor';
export { default as ScholarlySourceIndicator, SourceBadge as ScholarlySourceBadge } from './shared/ScholarlySourceIndicator';
export { default as SourceBadge, TranslationSourceHeader, SourceBadgeGroup, SOURCE_META } from './shared/SourceBadge';
export { default as SourceChainView, COMMENTATORS } from './shared/SourceChainView';
export { default as Toast, ToastContainer, useToast } from './shared/Toast';
export { default as Tooltip } from './shared/Tooltip';
export { default as WelcomeBanner } from './shared/WelcomeBanner';

// Settings & Configuration
export { default as ApiKeySettings } from './settings/ApiKeySettings';
export { default as HebrewCalendarWidget } from './settings/HebrewCalendarWidget';
export { default as KeyboardHelp } from './settings/KeyboardHelp';
export { default as OllamaSettings } from './settings/OllamaSettings';
export { default as PronunciationSettings } from './settings/PronunciationSettings';

// Analysis Components
export { default as CantillationAnalysis } from './analysis/CantillationAnalysis';
export { default as MasoreticIndicator } from './analysis/MasoreticIndicator';
export { default as RabbinicReferences } from './analysis/RabbinicReferences';
export { default as TextualCriticism } from './analysis/TextualCriticism';
export { default as TextVersions } from './analysis/TextVersions';
export { default as VerseInsights } from './analysis/VerseInsights';

// Visualization Components
export { default as KnowledgeGraph } from './visualization/KnowledgeGraph';
export { default as SugyaFlowVisualization } from './visualization/SugyaFlowVisualization';

// Scholar Mode Components
export { default as ScholarModePanel } from './scholar-mode/ScholarModePanel';

// AI Tutor Components
export { default as ChavrutaAI } from './ai-tutor/ChavrutaAI';
