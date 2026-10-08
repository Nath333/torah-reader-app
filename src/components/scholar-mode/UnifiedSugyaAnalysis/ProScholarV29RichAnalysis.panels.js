/**
 * Façade des panneaux ProScholar V29 — chaque composant vit désormais dans
 * ./ProScholarV29Panels/ (recette docs/DECOUPE-MONOLITHES.md : tests de rendu
 * d'abord, puis un fichier par panneau). Tous les noms historiques restent
 * servis ici : aucun importeur à modifier.
 */
import { ShabbatCasesGrid } from './ProScholarV29Panels/ShabbatCasesGrid';
import { GemaraDeepAnalysis } from './ProScholarV29Panels/GemaraDeepAnalysis';
import { RabbisDetailPanel } from './ProScholarV29Panels/RabbisDetailPanel';
import { SourceQualityIndicator } from './ProScholarV29Panels/SourceQualityIndicator';
import { CrossReferencesPanel } from './ProScholarV29Panels/CrossReferencesPanel';
import { SugyaMermaidDiagram } from './ProScholarV29Panels/SugyaMermaidDiagram';
import { V29CrossReferencePanel } from './ProScholarV29Panels/V29CrossReferencePanel';
import { HalakhicConceptsMap } from './ProScholarV29Panels/HalakhicConceptsMap';
import { StudyProgressTracker } from './ProScholarV29Panels/StudyProgressTracker';

export {
  ShabbatCasesGrid,
  GemaraDeepAnalysis,
  RabbisDetailPanel,
  SourceQualityIndicator,
  CrossReferencesPanel,
  SugyaMermaidDiagram,
  V29CrossReferencePanel,
  HalakhicConceptsMap,
  StudyProgressTracker
};
