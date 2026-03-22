/**
 * Shared Groq API Infrastructure
 * Common utilities for all AI services
 * @module groqApi
 */

import { AIError as BaseAIError, ERROR_TYPES as BaseErrorTypes } from '../utils/errors';

export const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
export const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

// =============================================================================
// API Key Management
// =============================================================================
export const getStoredApiKey = () =>
  process.env.REACT_APP_GROQ_API_KEY || localStorage.getItem('groq_api_key') || null;

export const hasApiKey = () => !!getStoredApiKey();
export const setGroqApiKey = (key) => localStorage.setItem('groq_api_key', key);
export const removeGroqApiKey = () => localStorage.removeItem('groq_api_key');

// =============================================================================
// Error Handling - Re-export from centralized module for backward compat
// =============================================================================
export const AIError = BaseAIError;

export const ERROR_TYPES = {
  ...BaseErrorTypes,
  // Legacy aliases for backward compatibility
  INVALID_RESPONSE: 'invalid_data',
  NETWORK_ERROR: 'network',
  CANCELLED: 'cancelled',
  INVALID_INPUT: 'validation'
};

// =============================================================================
// Core API Call
// =============================================================================
export const callGroqAPI = async (messages, options = {}) => {
  const apiKey = getStoredApiKey();
  if (!apiKey) {
    throw new AIError('No API key configured. Add your Groq API key in settings.', ERROR_TYPES.NO_API_KEY);
  }

  const {
    model = DEFAULT_MODEL,
    temperature = 0.7,
    maxTokens = 2048,
    stream = false,
    signal,
    jsonResponse = false
  } = options;

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream,
      ...(jsonResponse && { response_format: { type: 'json_object' } })
    }),
    ...(signal && { signal })
  });

  if (!response.ok) {
    await handleErrorResponse(response);
  }

  if (stream) return response;

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
};

// =============================================================================
// Error Response Handler
// =============================================================================
const handleErrorResponse = async (response) => {
  const errorData = await response.json().catch(() => ({}));

  const errorMap = {
    429: () => {
      const retryAfter = response.headers.get('retry-after');
      throw new AIError(
        `Rate limit reached. ${retryAfter ? `Try again in ${retryAfter}s.` : 'Please wait.'}`,
        ERROR_TYPES.RATE_LIMIT, true, { retryAfter }
      );
    },
    401: () => {
      throw new AIError('Invalid API key.', ERROR_TYPES.NO_API_KEY, false);
    },
    402: () => {
      throw new AIError('API quota exceeded.', ERROR_TYPES.QUOTA_EXCEEDED, false);
    }
  };

  if (errorMap[response.status]) {
    errorMap[response.status]();
  }

  if (errorData.error?.code === 'insufficient_quota') {
    throw new AIError('API quota exceeded.', ERROR_TYPES.QUOTA_EXCEEDED, false);
  }

  if (response.status >= 500) {
    throw new AIError('Server error. Please try again.', ERROR_TYPES.SERVER_ERROR, true);
  }

  throw new AIError(errorData.error?.message || `API error: ${response.status}`, ERROR_TYPES.SERVER_ERROR, true);
};

// =============================================================================
// Streaming Utilities
// =============================================================================
export const parseStreamChunk = (chunk) => {
  const lines = chunk.split('\n').filter(line => line.trim());
  let content = '';

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = line.slice(6);
      if (data === '[DONE]') continue;
      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) content += delta;
      } catch { /* ignore incomplete chunks */ }
    }
  }
  return content;
};

export const readStream = async (response, onChunk) => {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullContent = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const content = parseStreamChunk(chunk);
    if (content) {
      fullContent += content;
      onChunk?.(content, false);
    }
  }

  onChunk?.(null, true);
  return fullContent;
};

// =============================================================================
// Retry Logic
// =============================================================================
export const withRetry = async (fn, maxRetries = 3, baseDelay = 1000) => {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (error.name === 'AbortError') throw error;
      if (error.type === ERROR_TYPES.NO_API_KEY) throw error;
      if (error.type === ERROR_TYPES.INVALID_INPUT) throw error;
      if (error.type === ERROR_TYPES.QUOTA_EXCEEDED) throw error;
      if (error.retryable === false) throw error;
      if (attempt >= maxRetries) break;

      const delay = Math.min(baseDelay * Math.pow(2, attempt) + Math.random() * 500, 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};

// =============================================================================
// Connection Test
// =============================================================================
export const checkConnection = async () => {
  const apiKey = getStoredApiKey();
  if (!apiKey) return { connected: false, error: 'No API key' };

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: [{ role: 'user', content: 'Say "connected"' }],
        max_tokens: 5
      })
    });

    return response.ok
      ? { connected: true }
      : { connected: false, error: (await response.json()).error?.message };
  } catch (error) {
    return { connected: false, error: error.message };
  }
};

const groqApi = {
  GROQ_API_URL,
  DEFAULT_MODEL,
  getStoredApiKey,
  hasApiKey,
  setGroqApiKey,
  removeGroqApiKey,
  AIError,
  ERROR_TYPES,
  callGroqAPI,
  parseStreamChunk,
  readStream,
  withRetry,
  checkConnection
};

export default groqApi;
