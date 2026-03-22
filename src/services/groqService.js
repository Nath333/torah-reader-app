/**
 * Groq API Service for Torah Commentary Analysis
 * AI-powered study tools using Llama 3.3 70B
 * @module groqService
 */

// PRO SCHOLAR V6.2: Use CacheOrchestrator for unified cache management
import { createManagedCache } from './cacheOrchestrator';
import {
  GROQ_API_URL,
  getStoredApiKey,
  setGroqApiKey,
  removeGroqApiKey,
  hasApiKey,
  checkConnection as checkGroqConnection
} from './groqApi';
import { buildRAGContext, formatRAGContextForPrompt } from './ragService';
import { getModePrompt, MODE_DESCRIPTIONS } from './prompts/modePrompts';

const MAX_TEXT_CHARS = 8000;

// =============================================================================
// Analysis Modes (6 Kollel-Style Study Modes)
// Authentic Beit Midrash methodology for deep Torah learning
// =============================================================================
export const ANALYSIS_MODES = {
  // סיכום - Overview
  SUMMARY: 'summary',

  // עיון - Deep dialectical study (chavrusa-style)
  IYUN: 'iyun',

  // מוסר - Character development & ethical growth
  MUSSAR: 'mussar',

  // מחלוקת - Understanding disputes & their roots
  MACHLOKET: 'machloket',

  // מראי מקומות - Cross-references & source mapping
  MAREI_MEKOMOT: 'marei_mekomot',

  // הלכה למעשה - Practical law with chain of transmission
  HALACHA: 'halacha',

  // טעמי המקרא - Cantillation analysis with AI insights
  TAAMIM: 'taamim',

  // שורש - Living Root System with occurrence patterns
  SHORESH: 'shoresh',

  // חברותא - AI Chavruta mode (devil's advocate)
  CHAVRUTA: 'chavruta',

  // שיעור - Shiur Preparation mode for teachers
  SHIUR: 'shiur',

  // נפקא מינה - Practical Differences Analysis
  // THE key yeshiva question: "What's the practical outcome?"
  NAFKA_MINA: 'nafka_mina',

  // מקבילות - Related Passages & Cross-Textual Connections
  MEKABILOT: 'mekabilot'
};

// =============================================================================
// Cache Management - PRO SCHOLAR V6.2: Unified via CacheOrchestrator
// =============================================================================
const analysisCache = createManagedCache('groqAnalysis', { ttl: 30 * 60 * 1000, maxSize: 100 });

const getCacheKey = (text, source, verse, mode) =>
  `${text.slice(0, 100)}|${text.length}|${source}|${verse}|${mode}`;

// =============================================================================
// Re-export API Key Management from groqApi
// =============================================================================
export { getStoredApiKey, hasApiKey, setGroqApiKey, removeGroqApiKey };

// =============================================================================
// Mode Configuration - Optimized for Scholarly Output
// =============================================================================
const getModeConfig = (mode) => {
  const configs = {
    // Temperature settings (lower = more precise/scholarly)
    temperature: {
      [ANALYSIS_MODES.HALACHA]: 0.15,       // Precise for legal analysis
      [ANALYSIS_MODES.MACHLOKET]: 0.15,     // Precise for source citations
      [ANALYSIS_MODES.IYUN]: 0.2,           // Balanced for deep analysis
      [ANALYSIS_MODES.MAREI_MEKOMOT]: 0.2,  // Balanced for cross-references
      [ANALYSIS_MODES.MUSSAR]: 0.3,         // Slightly warmer for ethical guidance
      [ANALYSIS_MODES.SUMMARY]: 0.25,
      [ANALYSIS_MODES.TAAMIM]: 0.2,         // Precise for cantillation analysis
      [ANALYSIS_MODES.SHORESH]: 0.15,       // Precise for root analysis
      [ANALYSIS_MODES.CHAVRUTA]: 0.4,       // Warmer for creative debate
      [ANALYSIS_MODES.SHIUR]: 0.3,          // Balanced for teaching content
      [ANALYSIS_MODES.NAFKA_MINA]: 0.15,    // Precise for practical differences
      [ANALYSIS_MODES.MEKABILOT]: 0.2,      // Balanced for cross-references
      default: 0.25
    },
    // Max tokens - increased for comprehensive scholarly output
    maxTokens: {
      [ANALYSIS_MODES.SUMMARY]: 2000,
      [ANALYSIS_MODES.IYUN]: 4000,          // Full chavrusa analysis
      [ANALYSIS_MODES.MACHLOKET]: 3500,     // Multiple positions with reasoning
      [ANALYSIS_MODES.MAREI_MEKOMOT]: 3000, // Many cross-references
      [ANALYSIS_MODES.HALACHA]: 2500,       // Legal chain of transmission
      [ANALYSIS_MODES.MUSSAR]: 2500,        // Ethical development
      [ANALYSIS_MODES.TAAMIM]: 3000,        // Cantillation analysis
      [ANALYSIS_MODES.SHORESH]: 3500,       // Root occurrence patterns
      [ANALYSIS_MODES.CHAVRUTA]: 4000,      // Full debate mode
      [ANALYSIS_MODES.SHIUR]: 4500,         // Full shiur preparation
      [ANALYSIS_MODES.NAFKA_MINA]: 3500,    // Practical differences analysis
      [ANALYSIS_MODES.MEKABILOT]: 3000,     // Related passages
      default: 2000
    }
  };

  return {
    temperature: configs.temperature[mode] ?? configs.temperature.default,
    maxTokens: configs.maxTokens[mode] ?? configs.maxTokens.default
  };
};

// =============================================================================
// Prompts - Now imported from prompts/modePrompts.js for maintainability
// =============================================================================
const getSystemPrompt = (mode, source, options = {}) => {
  // Delegate to the extracted prompt module
  return getModePrompt(mode, source, options);
};

// Note: All prompts moved to prompts/modePrompts.js for maintainability
// Original file was 766 lines of prompts - now cleanly organized in separate module

const getUserPrompt = (text, source, verse, mode) => {
  const desc = MODE_DESCRIPTIONS[mode] || MODE_DESCRIPTIONS.summary;

  return `SCHOLARLY ANALYSIS REQUEST
═══════════════════════════════════════
Source: ${source}
Reference: ${verse}
═══════════════════════════════════════

TEXT TO ANALYZE:
"${text}"

═══════════════════════════════════════
REQUIREMENTS:
${desc}

IMPORTANT:
• Cite specific sources by name (e.g., "Rashi s.v. ...", "Ramban on verse X")
• Use Hebrew terms with transliteration (e.g., "תשובה (teshuvah)")
• Provide substantive analysis, not surface-level summaries
• Connect to broader Torah themes when relevant
• Include practical application (הלכה למעשה)

Respond with valid JSON only. Be comprehensive and scholarly.`;
};

// =============================================================================
// Text Processing
// =============================================================================
const truncateText = (text, maxChars = MAX_TEXT_CHARS) => {
  if (!text || text.length <= maxChars) return text;
  const truncated = text.slice(0, maxChars);
  const cutPoint = Math.max(truncated.lastIndexOf('.'), truncated.lastIndexOf('\n'));
  return (cutPoint > maxChars * 0.7 ? truncated.slice(0, cutPoint + 1) : truncated) + '\n[truncated...]';
};

// =============================================================================
// Diagram Sanitization
// =============================================================================
export const sanitizeMermaidDiagram = (diagram) => {
  if (!diagram || typeof diagram !== 'string') return null;

  let sanitized = diagram
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '  ')
    .replace(/[\u0590-\u05FF\u0600-\u06FF]/g, '')
    .replace(/^```mermaid\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  if (!sanitized.match(/^(graph|flowchart)/i)) {
    sanitized = 'graph TD\n' + sanitized;
  }

  sanitized = sanitized
    .replace(/\s*-->\s*/g, ' --> ')
    .replace(/\[([^\]]*)\]/g, (_, content) => {
      const cleaned = content.replace(/[^\w\s\-.,!?]/g, '').trim().slice(0, 35);
      return `[${cleaned || 'Node'}]`;
    });

  return sanitized.includes(' --> ') ? sanitized : null;
};

// =============================================================================
// Main Analysis Function
// =============================================================================
export const analyzeCommentary = async (
  commentaryText,
  source = 'Commentary',
  verse = '',
  mode = ANALYSIS_MODES.SUMMARY,
  options = {}  // { isTalmud, isMultiVerse, book, chapter, verseNum, useRAG } for smart context
) => {
  const apiKey = getStoredApiKey();

  if (!apiKey) {
    throw new Error('API key not configured. Add your Groq API key in settings.');
  }

  if (!commentaryText || commentaryText.trim().length < 20) {
    throw new Error('Text is too short to analyze.');
  }

  const truncatedText = truncateText(commentaryText);
  const cacheKey = getCacheKey(truncatedText, source, verse, mode);
  const cached = analysisCache.get(cacheKey);

  if (cached) return { ...cached, fromCache: true };

  const { temperature, maxTokens } = getModeConfig(mode);

  // =============================================================================
  // RAG Enhancement: Fetch real source texts from Sefaria
  // =============================================================================
  let ragContextString = '';
  let ragMetadata = null;

  // Use RAG if we have book/chapter/verse info (enabled by default, can be disabled)
  const useRAG = options.useRAG !== false && options.book && options.chapter;

  if (useRAG) {
    try {
      console.log(`[RAG] Fetching context for ${options.book} ${options.chapter}:${options.verseNum || ''} (mode: ${mode})`);

      const ragContext = await buildRAGContext({
        book: options.book,
        chapter: options.chapter,
        verse: options.verseNum,
        hebrewText: truncatedText,
        mode
      });

      if (ragContext && ragContext.sources?.length > 0) {
        ragContextString = formatRAGContextForPrompt(ragContext);

        // Extract source info by type for detailed display
        const sourcesByType = {};
        const sourceNames = [];

        for (const source of ragContext.sources) {
          const type = source.type;
          if (!sourcesByType[type]) {
            sourcesByType[type] = { sources: [], count: 0 };
          }
          sourcesByType[type].sources.push(source.source);
          sourcesByType[type].count++;
          sourceNames.push(source.source);
        }

        ragMetadata = {
          sourcesCount: ragContext.totalSources,
          fromCache: ragContext.fromCache,
          reference: ragContext.reference,
          sourceNames: [...new Set(sourceNames)], // Unique source names
          sourcesByType,
          // Include full sources for RAGSourcesPanel display
          // Users can see and verify the actual texts AI used
          sources: ragContext.sources
        };
        console.log(`[RAG] Retrieved ${ragContext.totalSources} source groups for ${ragContext.reference}`);
      }
    } catch (ragError) {
      console.warn('[RAG] Error fetching context (continuing without RAG):', ragError.message);
      // Continue without RAG - graceful degradation
    }
  }

  // Retry logic with exponential backoff for rate limits
  const MAX_RETRIES = 3;
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // Build enhanced user prompt with RAG context
      const userPromptBase = getUserPrompt(truncatedText, source, verse, mode);
      const userPromptWithRAG = ragContextString
        ? `${ragContextString}\n\n${userPromptBase}`
        : userPromptBase;

      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: getSystemPrompt(mode, source, options) },
            { role: 'user', content: userPromptWithRAG }
          ],
          temperature,
          max_tokens: maxTokens,
          response_format: { type: 'json_object' }
        })
      });

      if (!response.ok) {
        const error = await response.json();
        if (response.status === 429) {
          // Rate limit - retry with exponential backoff
          if (attempt < MAX_RETRIES - 1) {
            const waitTime = Math.pow(2, attempt + 1) * 1000; // 2s, 4s, 8s
            console.log(`Rate limited, retrying in ${waitTime / 1000}s...`);
            await delay(waitTime);
            continue;
          }
          throw new Error('Rate limit reached. Please wait a moment and try again.');
        }
        if (response.status === 413) throw new Error('Text too large. Select shorter passage.');
        throw new Error(error.error?.message || 'Analysis failed');
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) throw new Error('No response from AI');

      const parsed = JSON.parse(content);
      if (parsed.diagram) parsed.diagram = sanitizeMermaidDiagram(parsed.diagram);

      const result = {
        success: true,
        mode,
        ...parsed,
        model: data.model,
        usage: data.usage,
        fromCache: false,
        // Include RAG metadata so UI can show "Enhanced with X sources"
        ragEnhanced: !!ragMetadata,
        ragMetadata
      };

      analysisCache.set(cacheKey, result);
      return result;

    } catch (error) {
      // If it's the last attempt or not a rate limit error, return error
      if (attempt === MAX_RETRIES - 1 || !error.message?.includes('Rate limit')) {
        console.error('Groq API error:', error);
        return {
          success: false,
          mode,
          error: error.message,
          summary: null,
          keyPoints: [],
          topics: []
        };
      }
    }
  }

  // Fallback (should not reach here)
  return {
    success: false,
    mode,
    error: 'Analysis failed after retries',
    summary: null,
    keyPoints: [],
    topics: []
  };
};

// Legacy alias
export const summarizeCommentary = (text, source, verse) =>
  analyzeCommentary(text, source, verse, ANALYSIS_MODES.SUMMARY);

// =============================================================================
// Ask Follow-up Question with RAG Context
// Enables chavruta-style Q&A with real source citations
// =============================================================================

/**
 * Ask a follow-up question using RAG context
 * @param {Object} params - Parameters
 * @param {string} params.question - The user's question
 * @param {string} params.reference - The verse/passage reference (e.g., "Genesis.1.1")
 * @param {string} params.hebrewText - The Hebrew text being studied
 * @param {Object} params.previousAnalysis - Previous analysis result (optional)
 * @param {Object} params.ragContext - Existing RAG context (optional, will fetch if not provided)
 * @param {Array} params.conversationHistory - Previous Q&A exchanges (optional)
 * @returns {Promise<Object>} Answer with citations
 */
export const askWithRAG = async ({
  question,
  reference,
  hebrewText,
  previousAnalysis = null,
  ragContext = null,
  conversationHistory = []
}) => {
  const apiKey = getStoredApiKey();
  if (!apiKey) {
    return { success: false, error: 'No API key configured' };
  }

  try {
    // Build RAG context - always fetch fresh for Q&A to ensure real sources
    // The ragContext prop might only be metadata, not the full context
    let context = null;
    if (reference) {
      const [book, chapter, verse] = reference.split('.');
      context = await buildRAGContext({
        book,
        chapter,
        verse,
        hebrewText,
        mode: 'iyun' // Fetch comprehensive sources for Q&A (chavrusa-style deep study)
      });
      console.log(`[Q&A RAG] Fetched ${context?.totalSources || 0} sources for ${reference}`);
    }

    // Format RAG context for prompt - this gives the AI real source texts
    const ragPrompt = context?.sources?.length > 0
      ? formatRAGContextForPrompt(context)
      : '';

    // Build conversation context
    const conversationContext = conversationHistory.length > 0
      ? '\n\nPrevious discussion:\n' + conversationHistory.map(
          (ex, i) => `Q${i + 1}: ${ex.question}\nA${i + 1}: ${ex.answer}`
        ).join('\n\n')
      : '';

    // Build system prompt for Q&A
    const systemPrompt = `You are a learned Torah scholar (talmid chacham) answering questions about Jewish texts.

CRITICAL INSTRUCTIONS:
1. Use ONLY the provided source texts for your answer
2. Cite specific sources by name (e.g., "Rashi explains...", "According to Ibn Ezra...")
3. When citing, include the reference in this exact format: [[Source Name|reference]]
   - Example: [[Rashi|Rashi on Genesis.1.1]]
   - Example: [[Talmud Berakhot 12a|Berakhot.12a]]
   - Example: [[Midrash Rabbah|Genesis_Rabbah.1.1]]
4. If the sources don't address the question, say so honestly
5. Keep answers concise but thorough (2-4 paragraphs)
6. Use Hebrew terms with translations: "בראשית (Bereishit/In the beginning)"

${previousAnalysis ? `\nContext from previous analysis:\n${previousAnalysis.summary || ''}\n` : ''}
${ragPrompt}
${conversationContext}`;

    const userPrompt = `Reference: ${reference}
Hebrew text: ${hebrewText?.slice(0, 500) || 'N/A'}

Question: ${question}

Please answer based on the sources provided, with proper citations.`;

    // Call Groq API
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 1500
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    const answerText = data.choices?.[0]?.message?.content || '';

    // Parse citations and convert to Sefaria links
    const { formattedAnswer, citations } = parseAndFormatCitations(answerText);

    // Get unique source names
    const uniqueSources = [...new Set(context?.sources?.map(s => s.source) || [])];

    return {
      success: true,
      question,
      answer: formattedAnswer,
      rawAnswer: answerText,
      citations,
      reference,
      ragEnhanced: !!context?.sources?.length,
      ragSourceCount: context?.totalSources || 0,
      sourcesUsed: uniqueSources,
      model: data.model,
      usage: data.usage
    };

  } catch (error) {
    console.error('askWithRAG error:', error);
    return {
      success: false,
      question,
      error: error.message,
      answer: null
    };
  }
};

/**
 * Parse [[Source|ref]] citations and convert to Sefaria links
 */
const parseAndFormatCitations = (text) => {
  const citations = [];
  const citationPattern = /\[\[([^|]+)\|([^\]]+)\]\]/g;

  const formattedAnswer = text.replace(citationPattern, (_match, sourceName, ref) => {
    // Clean up the reference for Sefaria URL
    const sefariaRef = ref
      .replace(/\s+/g, '_')
      .replace(/\./g, '.');

    const sefariaUrl = `https://www.sefaria.org/${encodeURIComponent(sefariaRef)}`;

    citations.push({
      sourceName,
      reference: ref,
      url: sefariaUrl
    });

    // Return markdown-style link for rendering
    return `[${sourceName}](${sefariaUrl})`;
  });

  return { formattedAnswer, citations };
};

/**
 * Convert a Sefaria reference to a clickable URL
 */
export const toSefariaUrl = (ref) => {
  if (!ref) return null;
  const cleanRef = ref.replace(/\s+/g, '_');
  return `https://www.sefaria.org/${encodeURIComponent(cleanRef)}`;
};

// =============================================================================
// Re-export Connection Test from groqApi
// =============================================================================
export { checkGroqConnection };

// =============================================================================
// Cache Utilities
// =============================================================================
export const clearAnalysisCache = () => analysisCache.clear();

// =============================================================================
// Default Export
// =============================================================================
const groqService = {
  analyzeCommentary,
  summarizeCommentary,
  askWithRAG,
  toSefariaUrl,
  checkGroqConnection,
  setGroqApiKey,
  getStoredApiKey,
  removeGroqApiKey,
  hasApiKey,
  clearAnalysisCache,
  sanitizeMermaidDiagram,
  ANALYSIS_MODES
};

export default groqService;
