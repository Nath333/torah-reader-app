// =============================================================================
// Environnement du module Commentary — logger partagé + base Sefaria
// (extrait de CommentaryTab.constants.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

import { createLogger } from '../../../utils/debug';
import { getSefariaBase } from '../../../services/sefariaBase';

export const log = createLogger('Commentary');

// Base Sefaria unique (dev : proxy Vite ; prod : limud-proxy si configuré)
export const SEFARIA_BASE = getSefariaBase();
