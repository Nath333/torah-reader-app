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
 * Run all initialization tasks
 */
export const initializeApp = () => {
  initializeApiKeys();
};

// Auto-run initialization when this module is imported
initializeApp();
