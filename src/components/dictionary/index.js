// Dictionary components - word lookup and translation display
export { default as AnnotatedTranslation } from './AnnotatedTranslation';
export { default as ConjugationTable } from './ConjugationTable';
export { default as DictionaryTranslation } from './DictionaryTranslation';
export { default as EtymologyChain } from './EtymologyChain';
export { default as GlossedText } from './GlossedText';
export { default as InterlinearText } from './InterlinearText';
export { default as MorphologyBreakdown } from './MorphologyBreakdown';
export { default as SourceDefinitionItem } from './SourceDefinitionItem';
export { default as VerbConjugationDisplay } from './VerbConjugationDisplay';
export { default as WordDefinitionCard } from './WordDefinitionCard';
export { default as WordGlossary } from './WordGlossary';
export { default as WordIntelligenceCard } from './WordIntelligenceCard';
export { default as FamilyTree } from './FamilyTree';

// PRO SCHOLAR v3 Features
export {
  QuickReviewButtons,
  LearningInsightsPanel,
  HistoryPanel,
  CrossRefsMini
} from './ProScholarFeatures';

// PRO SCHOLAR V6.1 Panel - Advanced linguistic analysis
export { default as ProScholarPanel } from './ProScholarPanel';
export {
  SemanticFieldBadge,
  RootFamilyPanel,
  BinyanAnalysisBadge,
  DialectMarker,
  SourceTierBadge,
  TelemetryMini,
  HypothesisRankingPanel,
  // V6.1: New scholarly components
  HistoricalLayerBadge,
  GrammaticalAnomalyBadge,
  CognatePanel
} from './ProScholarPanel';

// PRO SCHOLAR V6 - Weak Verb Indicator
export { default as WeakVerbIndicator } from './WeakVerbIndicator';
export {
  PatternBadge,
  PatternDetailCard,
  TransformationDiagram,
  WEAK_VERB_PATTERNS
} from './WeakVerbIndicator';

// PRO SCHOLAR V6 - Source Comparison View
export { default as SourceComparisonView } from './SourceComparisonView';
export {
  SourceTab,
  SourceHeader,
  DefinitionEntry,
  SourcePanel,
  ComparisonGrid,
  DICTIONARY_SOURCES,
  SOURCE_ORDER
} from './SourceComparisonView';

// PRO SCHOLAR V6 - Root Family Visualization
export { default as RootFamilyTree } from './RootFamilyTree';

// PRO SCHOLAR V6 - Binyan Conjugation Panel
export { default as BinyanConjugationPanel } from './BinyanConjugationPanel';

// PRO SCHOLAR V6 - Analysis Badge & Telemetry
export { default as V6AnalysisBadge } from './V6AnalysisBadge';
export { default as V6TelemetryDashboard } from './V6TelemetryDashboard';

// PRO SCHOLAR V6 - Historical Layers & Cognates
export { default as HistoricalLayerPanel } from './HistoricalLayerPanel';
export { default as CognateLanguagesPanel } from './CognateLanguagesPanel';
