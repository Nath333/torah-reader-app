/**
 * Enhanced AI Service for Torah Commentary Analysis
 * Advanced AI-powered study tools with streaming, retry, and conversation support
 */

import groqService, {
  ANALYSIS_MODES,
  getStoredApiKey,
  setGroqApiKey,
  removeGroqApiKey,
  checkGroqConnection,
  clearAnalysisCache
} from './groqService';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// ============================================================================
// Configuration
// ============================================================================
const CONFIG = {
  maxRetries: 3,
  baseRetryDelay: 1000,
  maxRetryDelay: 10000,
  maxConversationHistory: 6,
  defaultModel: 'llama-3.3-70b-versatile',
};

// ============================================================================
// Error Types for Better Handling
// ============================================================================
export class AIError extends Error {
  constructor(message, type, retryable = false, details = null) {
    super(message);
    this.name = 'AIError';
    this.type = type;
    this.retryable = retryable;
    this.details = details;
  }
}

export const ERROR_TYPES = {
  NO_API_KEY: 'no_api_key',
  RATE_LIMIT: 'rate_limit',
  INVALID_RESPONSE: 'invalid_response',
  NETWORK_ERROR: 'network_error',
  CANCELLED: 'cancelled',
  INVALID_INPUT: 'invalid_input',
  SERVER_ERROR: 'server_error',
  QUOTA_EXCEEDED: 'quota_exceeded',
};

// ============================================================================
// Conversation History - For contextual follow-ups
// ============================================================================
let conversationHistory = [];
let currentContext = null;

export const addToConversation = (role, content) => {
  conversationHistory.push({ role, content, timestamp: Date.now() });
  // Keep only recent history
  if (conversationHistory.length > CONFIG.maxConversationHistory * 2) {
    conversationHistory = conversationHistory.slice(-CONFIG.maxConversationHistory * 2);
  }
};

export const clearConversation = () => {
  conversationHistory = [];
  currentContext = null;
};

export const getConversationHistory = () => [...conversationHistory];

export const setCurrentContext = (context) => {
  currentContext = context;
};

export const getCurrentContext = () => currentContext;

// ============================================================================
// Request Cancellation
// ============================================================================
let activeController = null;

export const cancelRequest = () => {
  if (activeController) {
    activeController.abort();
    activeController = null;
    return true;
  }
  return false;
};

export const isRequestActive = () => activeController !== null;

// ============================================================================
// Retry Logic with Exponential Backoff
// ============================================================================
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const calculateBackoff = (attempt) => {
  const delay = CONFIG.baseRetryDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 500;
  return Math.min(delay + jitter, CONFIG.maxRetryDelay);
};

const shouldRetry = (error, attempt) => {
  if (attempt >= CONFIG.maxRetries) return false;
  if (error.name === 'AbortError') return false;
  if (error.type === ERROR_TYPES.NO_API_KEY) return false;
  if (error.type === ERROR_TYPES.INVALID_INPUT) return false;
  if (error.type === ERROR_TYPES.QUOTA_EXCEEDED) return false;
  return error.retryable !== false;
};

// ============================================================================
// Response Validation
// ============================================================================
const validateResponse = (data, mode) => {
  if (!data || typeof data !== 'object') {
    throw new AIError('Invalid response format', ERROR_TYPES.INVALID_RESPONSE, true);
  }

  const hasContent = data.summary || data.insight || data.keyPoints ||
                     data.pshat || data.middot || data.hebrewTerms ||
                     data.approaches || data.creationTheme || data.literaryAnalysis ||
                     data.words || data.torahParallels || data.answer;

  if (!hasContent) {
    throw new AIError('Response missing required content', ERROR_TYPES.INVALID_RESPONSE, true);
  }

  return true;
};

// ============================================================================
// Streaming Parser
// ============================================================================
const parseStreamChunk = (chunk) => {
  const lines = chunk.split('\n').filter(line => line.trim() !== '');
  let content = '';

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = line.slice(6);
      if (data === '[DONE]') continue;

      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) content += delta;
      } catch (e) {
        // Ignore parse errors for incomplete chunks
      }
    }
  }

  return content;
};

// ============================================================================
// Mode Configuration
// ============================================================================
const MODE_CONFIG = {
  [ANALYSIS_MODES.QUICK_INSIGHT]: { maxTokens: 300, temperature: 0.4 },
  [ANALYSIS_MODES.SUMMARY]: { maxTokens: 1024, temperature: 0.3 },
  [ANALYSIS_MODES.DEEP_STUDY]: { maxTokens: 2048, temperature: 0.3 },
  [ANALYSIS_MODES.STUDY_QUESTIONS]: { maxTokens: 1024, temperature: 0.5 },
  [ANALYSIS_MODES.KEY_TERMS]: { maxTokens: 1024, temperature: 0.3 },
  [ANALYSIS_MODES.COMPARE]: { maxTokens: 1500, temperature: 0.3 },
  [ANALYSIS_MODES.PARDES]: { maxTokens: 1500, temperature: 0.3 },
  [ANALYSIS_MODES.MUSSAR]: { maxTokens: 1500, temperature: 0.4 },
  [ANALYSIS_MODES.CREATION]: { maxTokens: 1500, temperature: 0.3 },
  [ANALYSIS_MODES.NARRATIVE]: { maxTokens: 1500, temperature: 0.4 },
  [ANALYSIS_MODES.GEMATRIA]: { maxTokens: 1024, temperature: 0.2 },
  [ANALYSIS_MODES.HALACHA]: { maxTokens: 1800, temperature: 0.2 },
  [ANALYSIS_MODES.MEFARSHIM]: { maxTokens: 2048, temperature: 0.3 },
  [ANALYSIS_MODES.HISTORICAL]: { maxTokens: 1500, temperature: 0.3 },
  [ANALYSIS_MODES.LEXICON]: { maxTokens: 2500, temperature: 0.15 },
  [ANALYSIS_MODES.INTERTEXTUAL]: { maxTokens: 2200, temperature: 0.3 },
};

// ============================================================================
// System Prompts for Follow-up and Questions
// ============================================================================
const getFollowUpSystemPrompt = (source) => {
  return `You are an expert Torah scholar and Talmid Chacham serving as a study assistant. You have deep knowledge of classical Jewish sources including Rishonim, Acharonim, Talmud, Midrash, and Kabbalah.

You are continuing a conversation about ${source || 'a Torah text'}. Use the conversation history to provide contextually relevant, connected responses.

Guidelines:
- Reference previous points in the conversation when relevant
- Build on insights already discussed
- Correct any misunderstandings gently
- Suggest related topics for further exploration
- Use proper Hebrew/Aramaic transliteration

Respond in JSON format:
{
  "answer": "Your comprehensive response to the question",
  "connection": "How this relates to what was previously discussed",
  "sources": ["Relevant classical sources"],
  "followUp": "A suggested next question to explore"
}`;
};

const getQuestionSystemPrompt = (source) => {
  return `You are an expert Torah scholar and Talmid Chacham serving as a study assistant. You are answering a specific question about ${source || 'a Torah text'}.

Guidelines:
- Provide a thorough, scholarly answer
- Cite relevant sources (Rashi, Ramban, Gemara, etc.)
- Consider multiple viewpoints when applicable
- Make the answer accessible while maintaining depth
- Use proper Hebrew/Aramaic transliteration

Respond in JSON format:
{
  "answer": "Your comprehensive answer",
  "sources": [{"name": "Source name", "quote": "Relevant quote or reference"}],
  "relatedQuestions": ["Questions this might lead to"],
  "practicalApplication": "How this knowledge applies to life (if applicable)"
}`;
};

// ============================================================================
// Streaming Analysis Function
// ============================================================================
export const analyzeWithStreaming = async (
  text,
  source,
  verse,
  mode,
  onChunk,
  options = {}
) => {
  const apiKey = getStoredApiKey();

  if (!apiKey) {
    throw new AIError(
      'API key not configured. Please add your Groq API key in settings.',
      ERROR_TYPES.NO_API_KEY,
      false
    );
  }

  if (!text || text.trim().length < 10) {
    throw new AIError(
      'Text is too short to analyze (minimum 10 characters).',
      ERROR_TYPES.INVALID_INPUT,
      false
    );
  }

  // Cancel any existing request
  if (activeController) {
    activeController.abort();
  }
  activeController = new AbortController();

  // Set context for follow-up questions
  setCurrentContext({ text, source, verse, mode });

  const modeConfig = MODE_CONFIG[mode] || MODE_CONFIG[ANALYSIS_MODES.SUMMARY];

  let attempt = 0;
  let lastError = null;

  while (attempt <= CONFIG.maxRetries) {
    try {
      // Use the base groqService for non-streaming, or make streaming request
      if (!onChunk) {
        const result = await groqService.analyzeCommentary(text, source, verse, mode);
        if (result.success) {
          addToConversation('assistant', JSON.stringify(result));
        }
        activeController = null;
        return result;
      }

      // Streaming request
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: options.model || CONFIG.defaultModel,
          messages: [
            { role: 'system', content: getSystemPromptForMode(mode, source) },
            { role: 'user', content: getUserPromptForMode(text, source, verse, mode) }
          ],
          temperature: modeConfig.temperature,
          max_tokens: modeConfig.maxTokens,
          response_format: { type: 'json_object' },
          stream: true
        }),
        signal: activeController.signal
      });

      if (!response.ok) {
        await handleErrorResponse(response);
      }

      // Process streaming response
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
          onChunk(content, false);
        }
      }

      // Parse and validate complete response
      const parsed = JSON.parse(fullContent);
      validateResponse(parsed, mode);

      if (parsed.diagram) {
        parsed.diagram = sanitizeMermaidDiagram(parsed.diagram);
      }

      const result = {
        success: true,
        mode,
        ...parsed,
        model: options.model || CONFIG.defaultModel,
        fromCache: false
      };

      addToConversation('assistant', fullContent);
      onChunk(null, true); // Signal completion
      activeController = null;
      return result;

    } catch (error) {
      lastError = error;

      if (error.name === 'AbortError') {
        throw new AIError('Request cancelled', ERROR_TYPES.CANCELLED, false);
      }

      if (shouldRetry(error, attempt)) {
        const backoff = calculateBackoff(attempt);
        console.log(`Retry attempt ${attempt + 1} after ${backoff}ms...`);
        await sleep(backoff);
        attempt++;
        continue;
      }

      throw error;
    }
  }

  activeController = null;
  throw lastError || new AIError('Request failed after retries', ERROR_TYPES.SERVER_ERROR, false);
};

// ============================================================================
// Follow-up Question Function
// ============================================================================
export const askFollowUp = async (question, onChunk = null) => {
  const context = getCurrentContext();

  if (!context) {
    throw new AIError(
      'No previous analysis to follow up on. Please analyze a verse first.',
      ERROR_TYPES.INVALID_INPUT,
      false
    );
  }

  const apiKey = getStoredApiKey();
  if (!apiKey) {
    throw new AIError('API key not configured.', ERROR_TYPES.NO_API_KEY, false);
  }

  // Cancel any existing request
  if (activeController) {
    activeController.abort();
  }
  activeController = new AbortController();

  // Build messages with conversation history
  const messages = [
    { role: 'system', content: getFollowUpSystemPrompt(context.source) },
    ...conversationHistory.slice(-CONFIG.maxConversationHistory).map(h => ({
      role: h.role,
      content: h.content
    })),
    { role: 'user', content: `Regarding ${context.source} on ${context.verse}:\n\nQuestion: ${question}` }
  ];

  addToConversation('user', question);

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: CONFIG.defaultModel,
        messages,
        temperature: 0.4,
        max_tokens: 1024,
        response_format: { type: 'json_object' },
        stream: !!onChunk
      }),
      signal: activeController.signal
    });

    if (!response.ok) {
      await handleErrorResponse(response);
    }

    if (onChunk) {
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
          onChunk(content, false);
        }
      }

      const parsed = JSON.parse(fullContent);
      addToConversation('assistant', fullContent);
      onChunk(null, true);
      activeController = null;
      return { success: true, ...parsed };
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    const parsed = JSON.parse(content);
    addToConversation('assistant', content);
    activeController = null;
    return { success: true, ...parsed, usage: data.usage };

  } catch (error) {
    activeController = null;
    if (error.name === 'AbortError') {
      throw new AIError('Request cancelled', ERROR_TYPES.CANCELLED, false);
    }
    throw error;
  }
};

// ============================================================================
// Ask Specific Question Function
// ============================================================================
export const askQuestion = async (text, question, source = 'Torah', onChunk = null) => {
  const apiKey = getStoredApiKey();
  if (!apiKey) {
    throw new AIError('API key not configured.', ERROR_TYPES.NO_API_KEY, false);
  }

  if (activeController) {
    activeController.abort();
  }
  activeController = new AbortController();

  const userMessage = `Text: "${text}"\n\nQuestion: ${question}`;
  addToConversation('user', userMessage);

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: CONFIG.defaultModel,
        messages: [
          { role: 'system', content: getQuestionSystemPrompt(source) },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.5,
        max_tokens: 1024,
        response_format: { type: 'json_object' },
        stream: !!onChunk
      }),
      signal: activeController.signal
    });

    if (!response.ok) {
      await handleErrorResponse(response);
    }

    if (onChunk) {
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
          onChunk(content, false);
        }
      }

      const parsed = JSON.parse(fullContent);
      addToConversation('assistant', fullContent);
      onChunk(null, true);
      activeController = null;
      return { success: true, ...parsed };
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    const parsed = JSON.parse(content);
    addToConversation('assistant', content);
    activeController = null;
    return { success: true, ...parsed, usage: data.usage };

  } catch (error) {
    activeController = null;
    if (error.name === 'AbortError') {
      throw new AIError('Request cancelled', ERROR_TYPES.CANCELLED, false);
    }
    throw error;
  }
};

// ============================================================================
// Helper Functions
// ============================================================================
const handleErrorResponse = async (response) => {
  const errorData = await response.json().catch(() => ({}));

  if (response.status === 429) {
    const retryAfter = response.headers.get('retry-after');
    throw new AIError(
      `Rate limit reached. ${retryAfter ? `Try again in ${retryAfter} seconds.` : 'Please wait a moment.'}`,
      ERROR_TYPES.RATE_LIMIT,
      true,
      { retryAfter }
    );
  }

  if (response.status === 401) {
    throw new AIError(
      'Invalid API key. Please check your Groq API key in settings.',
      ERROR_TYPES.NO_API_KEY,
      false
    );
  }

  if (response.status === 402 || errorData.error?.code === 'insufficient_quota') {
    throw new AIError(
      'API quota exceeded. Please check your Groq account.',
      ERROR_TYPES.QUOTA_EXCEEDED,
      false
    );
  }

  if (response.status >= 500) {
    throw new AIError(
      'Groq server error. Please try again.',
      ERROR_TYPES.SERVER_ERROR,
      true
    );
  }

  throw new AIError(
    errorData.error?.message || 'Failed to analyze text',
    ERROR_TYPES.SERVER_ERROR,
    true
  );
};

// These functions get prompts from groqService - we import the base functionality
const getSystemPromptForMode = (mode, source) => {
  const diagramInstructions = `
DIAGRAM: Create a Mermaid flowchart (graph TD) showing the flow of ideas:
- Node IDs: A-Z only
- Node text: 2-5 words, English only
- Use --> arrows only
- 4-8 nodes, show: Teaching → Concepts → Application`;

  return `You are an expert Torah scholar analyzing ${source || 'a Torah text'}. Provide deep, scholarly analysis with proper Hebrew/Aramaic terminology.

${diagramInstructions}

Respond in valid JSON format with a "diagram" field containing a Mermaid flowchart.`;
};

const getUserPromptForMode = (text, source, verse, mode) => {
  const modeDescriptions = {
    summary: `Provide a structured summary with key points and a visual concept diagram.
Include: summary, keyPoints[], topics[], practicalLesson, diagram, diagramExplanation, relatedConcepts[]`,
    deep_study: `Provide an in-depth scholarly analysis with a flow diagram.
Include: summary, methodology, textualBasis[], keyPoints[], difficulties[], novelInsight, diagram, diagramExplanation`,
    pardes: 'Analyze using the four levels of PaRDeS with a diagram showing the four levels.',
    mussar: 'Provide Mussar analysis focusing on character development with a growth path diagram.',
    quick_insight: 'Give one quick, memorable insight.',
  };

  return `Analyze this ${source} commentary on ${verse}:

"${text}"

${modeDescriptions[mode] || 'Provide a thorough analysis with a concept diagram.'}

Respond with valid JSON only. Include a "diagram" field with Mermaid flowchart syntax.`;
};

const sanitizeMermaidDiagram = (diagram) => {
  if (!diagram || typeof diagram !== 'string') return null;

  let sanitized = diagram
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '  ')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .trim();

  // Remove any Hebrew/Arabic characters
  sanitized = sanitized.replace(/[\u0590-\u05FF\u0600-\u06FF]/g, '');

  // Remove markdown code block markers if present
  sanitized = sanitized
    .replace(/^```mermaid\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  if (!sanitized.match(/^(graph|flowchart|sequenceDiagram|classDiagram|mindmap)/i)) {
    sanitized = 'graph TD\n' + sanitized;
  }

  sanitized = sanitized.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  sanitized = sanitized
    .replace(/\s*-->\s*/g, ' --> ')
    .replace(/\s*---\s*/g, ' --- ')
    .replace(/\s*-\.->\s*/g, ' -.-> ')
    .replace(/\s*==>\s*/g, ' --> ')
    .replace(/\s*-\.-\s*/g, ' --- ')
    .replace(/(\n\s*)(\d+)(\[)/g, '$1N$2$3')
    .replace(/\[([^\]]*)\]/g, (match, content) => {
      const cleaned = content
        .replace(/[^\w\s\-.,!?]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 35);
      return `[${cleaned || 'Node'}]`;
    })
    .replace(/(\])\s*([A-Z])/g, '$1\n    $2')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\n+/, '')
    .replace(/\n([A-Z])/g, '\n    $1');

  if (!sanitized.includes(' --> ') && !sanitized.includes(' --- ')) {
    return null;
  }

  return sanitized;
};

// ============================================================================
// Utility Functions
// ============================================================================
export const hasApiKey = () => !!getStoredApiKey();

export const getCacheStats = () => ({
  info: 'Cache managed by groqService'
});

// ============================================================================
// Export Enhanced Service
// ============================================================================
const aiService = {
  // Enhanced functions
  analyzeWithStreaming,
  askFollowUp,
  askQuestion,

  // Request control
  cancelRequest,
  isRequestActive,

  // Conversation management
  addToConversation,
  clearConversation,
  getConversationHistory,
  setCurrentContext,
  getCurrentContext,

  // Re-export from groqService
  analyzeCommentary: groqService.analyzeCommentary,
  checkGroqConnection,
  setGroqApiKey,
  getStoredApiKey,
  hasApiKey,
  removeGroqApiKey,
  clearAnalysisCache,

  // Constants
  ANALYSIS_MODES,
  ERROR_TYPES,
  AIError,
  MODE_CONFIG,
};

export default aiService;
