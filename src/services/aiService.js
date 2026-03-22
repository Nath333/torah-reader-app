/**
 * Enhanced AI Service for Torah Commentary Analysis
 * Streaming, retry logic, and conversation support
 */

import groqService, { ANALYSIS_MODES, clearAnalysisCache, sanitizeMermaidDiagram } from './groqService';
import {
  GROQ_API_URL,
  DEFAULT_MODEL,
  getStoredApiKey,
  setGroqApiKey,
  removeGroqApiKey,
  AIError,
  ERROR_TYPES,
  readStream,
  withRetry,
  checkConnection as checkGroqConnection
} from './groqApi';

const CONFIG = {
  maxConversationHistory: 6,
  defaultModel: DEFAULT_MODEL,
};

// =============================================================================
// Conversation History
// =============================================================================
let conversationHistory = [];
let currentContext = null;

export const addToConversation = (role, content) => {
  conversationHistory.push({ role, content, timestamp: Date.now() });
  if (conversationHistory.length > CONFIG.maxConversationHistory * 2) {
    conversationHistory = conversationHistory.slice(-CONFIG.maxConversationHistory * 2);
  }
};

export const clearConversation = () => { conversationHistory = []; currentContext = null; };
export const getConversationHistory = () => [...conversationHistory];
export const setCurrentContext = (context) => { currentContext = context; };
export const getCurrentContext = () => currentContext;

// =============================================================================
// Request Control
// =============================================================================
let activeController = null;

export const cancelRequest = () => {
  if (activeController) { activeController.abort(); activeController = null; return true; }
  return false;
};

export const isRequestActive = () => activeController !== null;

// =============================================================================
// Core API Call (uses shared infrastructure from groqApi)
// =============================================================================
const callAPI = async (messages, options = {}) => {
  const apiKey = getStoredApiKey();
  if (!apiKey) throw new AIError('API key not configured.', ERROR_TYPES.NO_API_KEY, false);

  if (activeController) activeController.abort();
  activeController = new AbortController();

  const { temperature = 0.4, maxTokens = 1024, stream = false, onChunk } = options;

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: CONFIG.defaultModel,
      messages,
      temperature,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
      stream
    }),
    signal: activeController.signal
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const status = response.status;
    if (status === 429) throw new AIError('Rate limit reached.', ERROR_TYPES.RATE_LIMIT, true);
    if (status === 401) throw new AIError('Invalid API key.', ERROR_TYPES.NO_API_KEY, false);
    throw new AIError(errorData.error?.message || 'API error', ERROR_TYPES.SERVER_ERROR, true);
  }

  let content;
  if (stream && onChunk) {
    content = await readStream(response, onChunk);
  } else {
    const data = await response.json();
    content = data.choices[0]?.message?.content || '';
  }

  activeController = null;
  return content;
};

// =============================================================================
// Mode Configuration (Kollel-Style Modes)
// =============================================================================
const MODE_CONFIG = {
  [ANALYSIS_MODES.SUMMARY]: { maxTokens: 1024, temperature: 0.3 },
  [ANALYSIS_MODES.IYUN]: { maxTokens: 2048, temperature: 0.25 },
  [ANALYSIS_MODES.MUSSAR]: { maxTokens: 1500, temperature: 0.35 },
  [ANALYSIS_MODES.MACHLOKET]: { maxTokens: 2048, temperature: 0.2 },
  [ANALYSIS_MODES.MAREI_MEKOMOT]: { maxTokens: 2200, temperature: 0.25 },
  [ANALYSIS_MODES.HALACHA]: { maxTokens: 1800, temperature: 0.2 },
};

// =============================================================================
// System Prompts
// =============================================================================
const getSystemPrompt = (type, source) => {
  const base = `You are an expert Torah scholar with deep knowledge of Rishonim, Acharonim, Talmud, Midrash, and Kabbalah.`;

  if (type === 'followup') {
    return `${base} Continue the conversation about ${source || 'Torah'}. Reference previous points, build on insights.
JSON: {"answer":"","connection":"","sources":[],"followUp":""}`;
  }

  if (type === 'question') {
    return `${base} Answer about ${source || 'Torah'}. Cite sources, consider multiple viewpoints.
JSON: {"answer":"","sources":[{"name":"","quote":""}],"relatedQuestions":[],"practicalApplication":""}`;
  }

  return `${base} Analyze ${source || 'Torah text'} with proper terminology.
Create Mermaid flowchart (graph TD, A-Z nodes, 4-8 nodes, --> arrows).
JSON with "diagram" field.`;
};

const getUserPrompt = (text, source, verse, mode) => {
  const desc = {
    summary: 'Structured summary with keyPoints[], diagram.',
    iyun: 'Chavrusa-style deep analysis with questions and chiddushim.',
    mussar: 'Character development with middot and practical steps.',
    machloket: 'Commentator disputes with root causes explained.',
    marei_mekomot: 'Cross-references and source mapping.',
    halacha: 'Halachic chain from source to practice.',
    quick_insight: 'One quick insight.'
  };
  return `Analyze ${source} on ${verse}:\n\n"${text}"\n\n${desc[mode] || 'Thorough analysis with diagram.'}\n\nValid JSON only.`;
};

// =============================================================================
// Main Functions
// =============================================================================
export const analyzeWithStreaming = async (text, source, verse, mode, onChunk, options = {}) => {
  if (!text || text.trim().length < 10) {
    throw new AIError('Text too short (min 10 chars).', ERROR_TYPES.INVALID_INPUT, false);
  }

  setCurrentContext({ text, source, verse, mode });
  const modeConfig = MODE_CONFIG[mode] || MODE_CONFIG[ANALYSIS_MODES.SUMMARY];

  // Non-streaming: use groqService with context options
  if (!onChunk) {
    const result = await groqService.analyzeCommentary(text, source, verse, mode, options);
    if (result.success) addToConversation('assistant', JSON.stringify(result));
    return result;
  }

  // Streaming with retry
  return await withRetry(async () => {
    try {
      const content = await callAPI([
        { role: 'system', content: getSystemPrompt('analysis', source) },
        { role: 'user', content: getUserPrompt(text, source, verse, mode) }
      ], { ...modeConfig, stream: true, onChunk });

      const parsed = JSON.parse(content);
      if (parsed.diagram) parsed.diagram = sanitizeMermaidDiagram(parsed.diagram);

      addToConversation('assistant', content);
      return { success: true, mode, ...parsed, model: CONFIG.defaultModel, fromCache: false };
    } catch (error) {
      if (error.name === 'AbortError') throw new AIError('Cancelled', ERROR_TYPES.CANCELLED, false);
      throw error;
    }
  });
};

export const askFollowUp = async (question, onChunk = null) => {
  const context = getCurrentContext();
  if (!context) throw new AIError('No context. Analyze a verse first.', ERROR_TYPES.INVALID_INPUT, false);

  addToConversation('user', question);

  const messages = [
    { role: 'system', content: getSystemPrompt('followup', context.source) },
    ...conversationHistory.slice(-CONFIG.maxConversationHistory).map(h => ({ role: h.role, content: h.content })),
    { role: 'user', content: `Regarding ${context.source} on ${context.verse}:\n\nQuestion: ${question}` }
  ];

  try {
    const content = await callAPI(messages, { stream: !!onChunk, onChunk });
    const parsed = JSON.parse(content);
    addToConversation('assistant', content);
    return { success: true, ...parsed };
  } catch (error) {
    if (error.name === 'AbortError') throw new AIError('Cancelled', ERROR_TYPES.CANCELLED, false);
    throw error;
  }
};

export const askQuestion = async (text, question, source = 'Torah', onChunk = null) => {
  const userMessage = `Text: "${text}"\n\nQuestion: ${question}`;
  addToConversation('user', userMessage);

  try {
    const content = await callAPI([
      { role: 'system', content: getSystemPrompt('question', source) },
      { role: 'user', content: userMessage }
    ], { temperature: 0.5, stream: !!onChunk, onChunk });

    const parsed = JSON.parse(content);
    addToConversation('assistant', content);
    return { success: true, ...parsed };
  } catch (error) {
    if (error.name === 'AbortError') throw new AIError('Cancelled', ERROR_TYPES.CANCELLED, false);
    throw error;
  }
};

// =============================================================================
// Utility
// =============================================================================
export const hasApiKey = () => !!getStoredApiKey();
export const getCacheStats = () => ({ info: 'Cache managed by groqService' });

// =============================================================================
// Export
// =============================================================================
const aiService = {
  analyzeWithStreaming, askFollowUp, askQuestion,
  cancelRequest, isRequestActive,
  addToConversation, clearConversation, getConversationHistory, setCurrentContext, getCurrentContext,
  analyzeCommentary: groqService.analyzeCommentary,
  checkGroqConnection, setGroqApiKey, getStoredApiKey, hasApiKey, removeGroqApiKey, clearAnalysisCache,
  ANALYSIS_MODES, ERROR_TYPES, AIError, MODE_CONFIG
};

export default aiService;
export { AIError, ERROR_TYPES };
