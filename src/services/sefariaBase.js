/**
 * sefariaBase — UNE seule définition de la base Sefaria (fin des 4 ternaires
 * dupliqués qui divergeaient : scholarlyApiService, dictionaryLoader,
 * scholarlyLexiconService, CommentaryTab.constants).
 *
 * - dev     : le proxy Vite (/sefaria-api → www.sefaria.org) évite le CORS ;
 * - prod    : le serveur d'étude limud-proxy s'il est configuré (Réglages →
 *   API, route /sefaria/ avec cache 5 min), sinon Sefaria direct.
 * Changer le proxy s'applique au rechargement (lu au chargement du module,
 * même sémantique que sefariaApi.js).
 */
import { viaProxy } from './proxyConfig';

export const getSefariaBase = () =>
  process.env.NODE_ENV === 'development'
    ? '/sefaria-api'
    : viaProxy('/sefaria/api', 'https://www.sefaria.org/api');
