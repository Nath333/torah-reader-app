// Dictionary components - word lookup and translation display
export { default as AnnotatedTranslation } from './AnnotatedTranslation';
export { default as DictionaryTranslation } from './DictionaryTranslation';
export { default as GlossedText } from './GlossedText';
export { default as SourceDefinitionItem } from './SourceDefinitionItem';
export { default as WordDefinitionCard } from './WordDefinitionCard';
export { default as WordGlossary } from './WordGlossary';
export { default as WordIntelligenceCard } from './WordIntelligenceCard';
export { default as FamilyTree } from './FamilyTree';

// v3 Features
export {
  QuickReviewButtons,
  LearningInsightsPanel,
  HistoryPanel,
  CrossRefsMini
} from './ProScholarFeatures';

// Panels - Advanced linguistic analysis (panels/ subdirectory)
export { default as ProScholarPanel } from './panels/ProScholarPanel';
export {
  SemanticFieldBadge,
  RootFamilyPanel,
  BinyanAnalysisBadge,
  DialectMarker,
  SourceTierBadge,
  TelemetryMini,
  HypothesisRankingPanel,
  HistoricalLayerBadge,
  GrammaticalAnomalyBadge,
  CognatePanel
} from './panels/ProScholarPanel';
export { default as RootFamilyTree } from './panels/RootFamilyTree';
export { default as BinyanConjugationPanel } from './panels/BinyanConjugationPanel';
export { default as V6AnalysisBadge } from './panels/V6AnalysisBadge';
export { default as V6TelemetryDashboard } from './panels/V6TelemetryDashboard';
export { default as HistoricalLayerPanel } from './panels/HistoricalLayerPanel';
export { default as CognateLanguagesPanel } from './panels/CognateLanguagesPanel';
export { default as TextAttestationsPanel } from './panels/TextAttestationsPanel';
export { default as RootMeaningPanel } from './panels/RootMeaningPanel';
export { default as RelatedRootsPanel } from './panels/RelatedRootsPanel';
export { default as CrossReferencesPanel } from './panels/CrossReferencesPanel';
export { default as SourceComparison } from './panels/SourceComparison';
export { default as SourceComparisonView } from './panels/SourceComparisonView';
export {
  SourceTab,
  SourceHeader,
  DefinitionEntry,
  SourcePanel,
  ComparisonGrid,
  DICTIONARY_SOURCES,
  SOURCE_ORDER
} from './panels/SourceComparisonView';

// Morphology - text analysis components (morphology/ subdirectory)
export { default as MorphologyBreakdown } from './morphology/MorphologyBreakdown';
export { default as ConjugationTable } from './morphology/ConjugationTable';
export { default as VerbConjugationDisplay } from './morphology/VerbConjugationDisplay';
export { default as EtymologyChain } from './morphology/EtymologyChain';
export { default as InterlinearText } from './morphology/InterlinearText';
export { default as WeakVerbIndicator } from './morphology/WeakVerbIndicator';
export {
  PatternBadge,
  PatternDetailCard,
  TransformationDiagram,
  WEAK_VERB_PATTERNS
} from './morphology/WeakVerbIndicator';
