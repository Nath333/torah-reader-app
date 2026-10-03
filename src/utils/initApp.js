/**
 * Application Initialization
 * Runs once at app startup before rendering
 */

/**
 * Aucune clé API via variables d'environnement : une REACT_APP_* est inlinée
 * en clair dans le bundle public. La clé Groq provient uniquement de la saisie
 * utilisateur (Réglages → API), stockée via safeStorage (voir services/groqApi.js).
 */
export const initializeApp = () => {};
