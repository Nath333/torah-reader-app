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
export { default as WordsTab } from './LexiconTab';              // WORDS tab
export { default as CommentaryTab } from './CommentaryTab';      // COMMENTARY tab
export { default as ChavrutaTab } from './ChavrutaTab';          // CHAVRUTA tab (NEW - consolidated)
export { default as NotebookTab } from './NotebookTab';          // NOTEBOOK tab (NEW - consolidated)

// Talmud-specific tabs
export { default as TalmudToolsTab } from './TalmudToolsTab';
export { default as TzuratHaDafTab } from './TzuratHaDafTab';
export { default as EntitiesTab } from './EntitiesTab';

// Visualization components
export { default as DisagreementVisualization } from './DisagreementVisualization';
export { default as HalachicChainVisualization } from './HalachicChainVisualization';
export { default as KnowledgeGraph } from './KnowledgeGraph';
