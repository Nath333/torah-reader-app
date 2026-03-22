/**
 * Ollama Provider Service for Local AI Analysis
 * Enables offline Torah study with locally-running LLMs
 *
 * @module ollamaProvider
 * @description Provides AI-powered analysis using local Ollama models.
 * Compatible with the same prompts and modes as groqService.
 */

const OLLAMA_API_URL = 'http://localhost:11434/api';

// ============================================================================
// Connection & Model Management
// ============================================================================

/**
 * Check if Ollama is running locally
 */
export const checkOllamaConnection = async () => {
  try {
    const response = await fetch(`${OLLAMA_API_URL}/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000) // 3 second timeout
    });

    if (response.ok) {
      const data = await response.json();
      return {
        connected: true,
        models: data.models || [],
        modelCount: (data.models || []).length
      };
    }
    return { connected: false, error: 'Ollama not responding' };
  } catch (error) {
    return {
      connected: false,
      error: error.name === 'TimeoutError'
        ? 'Ollama connection timed out'
        : 'Ollama not running. Start it with: ollama serve'
    };
  }
};

/**
 * Get list of available models from Ollama
 */
export const getAvailableModels = async () => {
  try {
    const response = await fetch(`${OLLAMA_API_URL}/tags`, {
      signal: AbortSignal.timeout(3000) // 3 second timeout
    });
    if (response.ok) {
      const data = await response.json();
      return data.models || [];
    }
    return [];
  } catch (error) {
    // Silently return empty array - Ollama not being available is expected
    return [];
  }
};

/**
 * Recommended models for Torah study (Hebrew/multilingual capable)
 */
export const RECOMMENDED_MODELS = [
  {
    name: 'llama3.1:8b',
    description: 'Good balance of speed and quality',
    hebrewCapability: 'moderate',
    size: '4.7GB'
  },
  {
    name: 'llama3.1:70b',
    description: 'Best quality, needs powerful hardware',
    hebrewCapability: 'good',
    size: '40GB'
  },
  {
    name: 'mistral:7b',
    description: 'Fast and efficient',
    hebrewCapability: 'moderate',
    size: '4.1GB'
  },
  {
    name: 'gemma2:9b',
    description: 'Google model, multilingual support',
    hebrewCapability: 'good',
    size: '5.4GB'
  },
  {
    name: 'qwen2.5:7b',
    description: 'Excellent multilingual, good for Hebrew',
    hebrewCapability: 'excellent',
    size: '4.4GB'
  },
  {
    name: 'phi3:medium',
    description: 'Microsoft model, efficient reasoning',
    hebrewCapability: 'moderate',
    size: '7.9GB'
  }
];

// ============================================================================
// Settings Management
// ============================================================================

const getSelectedModel = () => {
  return localStorage.getItem('ollama_model') || 'llama3.1:8b';
};

export const setSelectedModel = (model) => {
  localStorage.setItem('ollama_model', model);
};

export const getOllamaSettings = () => {
  return {
    model: getSelectedModel(),
    baseUrl: localStorage.getItem('ollama_url') || 'http://localhost:11434'
  };
};

export const setOllamaBaseUrl = (url) => {
  localStorage.setItem('ollama_url', url);
};

// ============================================================================
// Main Analysis Function - Compatible with groqService interface
// ============================================================================

/**
 * Analyze text using Ollama
 * @param {Object} options Analysis options
 * @param {string} options.systemPrompt The system prompt
 * @param {string} options.userPrompt The user prompt
 * @param {number} options.temperature Temperature setting
 * @param {number} options.maxTokens Max tokens to generate
 * @param {string} options.mode The analysis mode (for logging)
 * @returns {Promise<Object>} The parsed analysis result
 */
export const analyzeWithOllama = async ({
  systemPrompt,
  userPrompt,
  temperature = 0.3,
  maxTokens = 1500,
  mode = 'summary'
}) => {
  const settings = getOllamaSettings();
  const baseUrl = settings.baseUrl || OLLAMA_API_URL.replace('/api', '');

  try {
    // Use the chat endpoint for better conversation handling
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: settings.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        options: {
          temperature: temperature,
          num_predict: maxTokens,
        },
        format: 'json',
        stream: false
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.message?.content;

    if (!content) {
      throw new Error('No response from Ollama');
    }

    // Parse JSON response
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (parseError) {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1]);
      } else {
        // Try to find JSON object in the response
        const jsonStart = content.indexOf('{');
        const jsonEnd = content.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1) {
          parsed = JSON.parse(content.slice(jsonStart, jsonEnd + 1));
        } else {
          throw new Error('Could not parse Ollama response as JSON');
        }
      }
    }

    return {
      success: true,
      mode,
      ...parsed,
      model: settings.model,
      provider: 'ollama',
      usage: {
        prompt_tokens: data.prompt_eval_count || 0,
        completion_tokens: data.eval_count || 0,
        total_tokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
      },
      fromCache: false
    };
  } catch (error) {
    console.error('Ollama analysis error:', error);
    return {
      success: false,
      mode,
      error: error.message,
      provider: 'ollama',
      summary: null,
      keyPoints: [],
      topics: []
    };
  }
};

/**
 * Generate a simple completion (for follow-up questions)
 */
export const generateCompletion = async (prompt, context = '') => {
  const settings = getOllamaSettings();
  const baseUrl = settings.baseUrl || OLLAMA_API_URL.replace('/api', '');

  try {
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: settings.model,
        prompt: context ? `Context: ${context}\n\nQuestion: ${prompt}` : prompt,
        stream: false,
        options: {
          temperature: 0.4,
          num_predict: 500
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      response: data.response,
      model: settings.model
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Pull/download a model from Ollama registry
 */
export const pullModel = async (modelName, onProgress) => {
  const settings = getOllamaSettings();
  const baseUrl = settings.baseUrl || OLLAMA_API_URL.replace('/api', '');

  try {
    const response = await fetch(`${baseUrl}/api/pull`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: modelName,
        stream: true
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to pull model: ${response.status}`);
    }

    // Handle streaming progress
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value);
      const lines = text.split('\n').filter(line => line.trim());

      for (const line of lines) {
        try {
          const json = JSON.parse(line);
          if (onProgress && json.status) {
            onProgress({
              status: json.status,
              completed: json.completed || 0,
              total: json.total || 0,
              percent: json.total ? Math.round((json.completed / json.total) * 100) : 0
            });
          }
        } catch (e) {
          // Ignore parse errors for partial JSON
        }
      }
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

// ============================================================================
// Export
// ============================================================================
const ollamaProvider = {
  checkOllamaConnection,
  getAvailableModels,
  analyzeWithOllama,
  generateCompletion,
  pullModel,
  setSelectedModel,
  setOllamaBaseUrl,
  getOllamaSettings,
  RECOMMENDED_MODELS
};

export default ollamaProvider;
