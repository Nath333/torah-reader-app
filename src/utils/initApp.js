/**
 * Application Initialization
 * Runs once at app startup before rendering
 */

import { setGroqApiKey, getStoredApiKey } from '../services/groqService';

/**
 * Initialize API keys from environment variables
 */
export const initializeApiKeys = () => {
  const envKey = process.env.REACT_APP_GROQ_API_KEY;
  const storedKey = getStoredApiKey();

  if (envKey && !storedKey) {
    setGroqApiKey(envKey);
    console.log('[Init] Groq API key initialized from environment');
  }
};

/**
 * Pre-warm dictionary cache with common words
 * NOTE: Disabled - initialization is now handled by App.js useEffect
 * to prevent duplicate preloading
 */
export const initializeDictionaryCache = () => {
  // REMOVED: Duplicate initialization was causing 3x dictionary loading
  // The App.js useEffect now handles all preloading in one place
  // This prevents the "[DictionaryLoader] Preloading core dictionaries..."
  // message appearing multiple times
};

/**
 * Run all initialization tasks
 */
export const initializeApp = () => {
  initializeApiKeys();
  // initializeDictionaryCache(); // Removed - handled by App.js
};
