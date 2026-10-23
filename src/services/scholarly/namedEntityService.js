// =============================================================================
// Named Entity Service — FAÇADE (split 23/10)
// Détection et lookup d'entités nommées (rabbis, figures bibliques, lieux).
// Modules sous ./namedEntity/ : data (pures — le gros de la base), relationships,
// detection, lookup. Surface publique + default conservées.
// =============================================================================

import {
  ENTITY_TYPES, RABBI_DATABASE, RABBI_RELATIONSHIPS,
  BIBLICAL_FIGURES, PLACES
} from './namedEntity/data';
import { getRabbiRelationships, getTeacherChain } from './namedEntity/relationships';
import {
  detectEntities, detectRabbis, detectBiblicalFigures, detectPlaces,
  detectBiblicalCitations, getEntityStatistics, getHighlightedEntities
} from './namedEntity/detection';
import { lookupRabbi, getRabbisByGeneration } from './namedEntity/lookup';

export {
  // Données
  ENTITY_TYPES, RABBI_DATABASE, RABBI_RELATIONSHIPS, BIBLICAL_FIGURES, PLACES,
  // Relations
  getRabbiRelationships, getTeacherChain,
  // Détection
  detectEntities, detectRabbis, detectBiblicalFigures, detectPlaces,
  detectBiblicalCitations, getEntityStatistics, getHighlightedEntities,
  // Lookup
  lookupRabbi, getRabbisByGeneration
};

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

const namedEntityService = {
  ENTITY_TYPES,
  RABBI_DATABASE,
  RABBI_RELATIONSHIPS,
  BIBLICAL_FIGURES,
  PLACES,

  // Detection
  detectEntities,
  detectRabbis,
  detectBiblicalFigures,
  detectPlaces,
  detectBiblicalCitations,

  // Analysis
  getEntityStatistics,
  getHighlightedEntities,

  // Lookup
  lookupRabbi,
  getRabbisByGeneration,

  // Relationships
  getRabbiRelationships,
  getTeacherChain
};

export default namedEntityService;

