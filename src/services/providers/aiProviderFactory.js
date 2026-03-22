/**
 * AI Provider Factory - Minimal
 * Provider switching between Groq (cloud) and Ollama (local)
 */

import { checkOllamaConnection } from './ollamaProvider';
import { hasApiKey as hasGroqKey, ANALYSIS_MODES } from '../groqService';

// Provider types
export const AI_PROVIDERS = {
  GROQ: 'groq',
  OLLAMA: 'ollama',
  AUTO: 'auto'
};

// Settings
export const getSelectedProvider = () =>
  localStorage.getItem('ai_provider') || AI_PROVIDERS.GROQ;

export const setSelectedProvider = (provider) => {
  if (Object.values(AI_PROVIDERS).includes(provider)) {
    localStorage.setItem('ai_provider', provider);
  }
};

// Availability check
export const checkProviderAvailability = async (provider) => {
  if (provider === AI_PROVIDERS.GROQ) {
    return {
      available: hasGroqKey(),
      provider: AI_PROVIDERS.GROQ,
      message: hasGroqKey() ? 'Groq ready' : 'No API key'
    };
  }

  if (provider === AI_PROVIDERS.OLLAMA) {
    const status = await checkOllamaConnection();
    return {
      available: status.connected,
      provider: AI_PROVIDERS.OLLAMA,
      models: status.models || [],
      message: status.connected ? `${status.modelCount} models` : status.error
    };
  }

  if (provider === AI_PROVIDERS.AUTO) {
    const ollama = await checkOllamaConnection();
    if (ollama.connected) {
      return { available: true, provider: AI_PROVIDERS.OLLAMA, message: 'Local' };
    }
    if (hasGroqKey()) {
      return { available: true, provider: AI_PROVIDERS.GROQ, message: 'Cloud' };
    }
    return { available: false, provider: null, message: 'No provider available' };
  }

  return { available: false, message: 'Unknown provider' };
};

// Get all provider statuses
export const getAllProviderStatus = async () => {
  const [groq, ollama] = await Promise.all([
    checkProviderAvailability(AI_PROVIDERS.GROQ),
    checkProviderAvailability(AI_PROVIDERS.OLLAMA)
  ]);
  return {
    groq,
    ollama,
    selectedProvider: getSelectedProvider(),
    anyAvailable: groq.available || ollama.available
  };
};

// Export
export { ANALYSIS_MODES };

const aiProviderFactory = {
  AI_PROVIDERS,
  getSelectedProvider,
  setSelectedProvider,
  checkProviderAvailability,
  ANALYSIS_MODES
};

export default aiProviderFactory;
