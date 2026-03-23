/**
 * Application Initialization
 * Runs once at app startup before rendering
 */

import { setGroqApiKey, getStoredApiKey } from '../services/groqService';
// PRO SCHOLAR V8: Use dictionaryLoader (consolidated from dictionaryPreloader)
import { initializePreload } from '../services/dictionaryLoader';

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
 * Runs asynchronously in background - doesn't block app startup
 */
export const initializeDictionaryCache = () => {
  // Run in background after a short delay to not block initial render
  setTimeout(async () => {
    try {
      await initializePreload();
    } catch (e) {
      // Silent fail - preloading is an optimization, not critical
      console.debug('[Init] Dictionary preload skipped:', e.message);
    }
  }, 1000); // Wait 1 second after app loads
};

/**
 * Run all initialization tasks
 */
export const initializeApp = () => {
  initializeApiKeys();
  initializeDictionaryCache();
};

// Auto-run initialization when this module is imported
initializeApp();
