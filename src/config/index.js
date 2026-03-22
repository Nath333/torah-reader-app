/**
 * Config Index - Application configuration exports
 * Usage: import { ROUTES, getReadPath, COMMENTARY_INFO } from './config';
 */

// =============================================================================
// Route Configuration
// =============================================================================
export {
  ROUTES,
  getReadPath,
  getVersionsPath,
  getTraditionalPath,
  parseBookSlug
} from './routes';

// =============================================================================
// Commentary Configuration
// =============================================================================
export {
  // PARDES methodology
  PARDES,

  // Era classifications
  ERA,

  // Commentary metadata
  COMMENTARY_INFO,

  // Tab configurations
  TORAH_TABS,
  TALMUD_TABS,

  // Helpers
  getCommentaryInfo,
  getCommentaryIcon,
  getCommentaryColor
} from './commentaryConfig';
