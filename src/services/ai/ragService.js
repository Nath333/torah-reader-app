/**
 * RAG (Retrieval-Augmented Generation) Service
 * Fetches real source texts from Sefaria to enhance AI analysis accuracy
 * @module ragService
 */

import { createManagedCache } from '../cacheOrchestrator';
import {
  getCommentary,
  getRelatedTexts,
  getCrossReferences,
  getTopicsForRef,
  getRashiForVerse,
  getIbnEzraForVerse,
  getSfornoForVerse,
  getOrHaChaimForVerse,
  isTalmudBook
} from '../sefariaApi';
import { getRambanForVerse, getMaharshaForDaf } from '../commentary/commentaryServiceFactory';
import { getTosafotForDaf } from '../commentary/tosafotService';

// Cache for RAG context (longer TTL since source texts don't change)
const ragCache = createManagedCache('ragContext', { ttl: 60 * 60 * 1000, maxSize: 200 }); // 1 hour

// =============================================================================
// Configuration - What to fetch from Sefaria for each mode
// Only fetch what's actually useful and available
// =============================================================================

/**
 * RAG data requirements per analysis mode (Kollel-style modes)
 * Each mode fetches different combinations for optimal context
 *
 * Sources available:
 * - commentary: Rashi, Ramban, Ibn Ezra, Sforno, Or HaChaim (Tosafot/Maharsha for Talmud)
 * - crossRefs: Cross-references grouped by category (Tanakh, Talmud, etc.)
 * - relatedTexts: Midrash, Targum, Halacha links, Parallels
 * - topics: Sefaria topic tags for thematic context
 */
const MODE_DATA_REQUIREMENTS = {
  // 📋 סיכום (Summary) - Quick overview
  summary: ['commentary'],

  // 🔍 עיון (Iyun) - Deep chavrusa-style analysis
  iyun: ['commentary', 'crossRefs', 'topics'],

  // 💎 מוסר (Mussar) - Character development (needs Midrash for ethical teachings)
  mussar: ['commentary', 'relatedTexts', 'topics'],

  // ⚔️ מחלוקת (Machloket) - Commentator disputes
  machloket: ['commentary'],

  // 🔗 מראי מקומות (Marei Mekomot) - Cross-references
  marei_mekomot: ['crossRefs', 'relatedTexts', 'topics'],

  // ⚖️ הלכה (Halacha) - Legal derivations
  halacha: ['relatedTexts', 'crossRefs']
};

/**
 * Source priority per mode (higher priority sources listed first)
 */
const MODE_PRIORITIES = {
  summary: ['Rashi', 'Ramban'],
  iyun: ['Rashi', 'Ramban', 'Ibn Ezra', 'Tosafot'],
  mussar: ['Midrash', 'Rashi', 'Ramban', 'Targum'],
  machloket: ['Rashi', 'Ramban', 'Ibn Ezra', 'Sforno', 'Or HaChaim'],
  marei_mekomot: ['Tanakh', 'Talmud', 'Midrash', 'Parallels'],
  halacha: ['Halacha', 'Talmud', 'Midrash']
};

/**
 * Max sources per mode to prevent context overflow
 */
const MODE_MAX_SOURCES = {
  summary: 5,
  iyun: 12,
  mussar: 10,
  machloket: 8,
  marei_mekomot: 15,
  halacha: 10
};

// =============================================================================
// Helper Functions
// =============================================================================

const formatRef = (book, chapter, verse) => `${book}.${chapter}${verse ? `.${verse}` : ''}`;

const truncateText = (text, maxLen = 500) => {
  if (!text || text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '...';
};

/**
 * Sort sources by priority for a given mode
 * Sources matching priority list come first, in order
 */
const sortByPriority = (sources, priorityList) => {
  if (!priorityList?.length) return sources;

  return [...sources].sort((a, b) => {
    const aIdx = priorityList.findIndex(p =>
      a.source?.toLowerCase().includes(p.toLowerCase())
    );
    const bIdx = priorityList.findIndex(p =>
      b.source?.toLowerCase().includes(p.toLowerCase())
    );

    // Items in priority list come first, in order
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    if (aIdx !== -1) return -1;
    if (bIdx !== -1) return 1;
    return 0;
  });
};

// =============================================================================
// Data Fetchers - Retrieve specific types of data
// =============================================================================

/**
 * Fetch commentaries for a verse and format for RAG context
 * @returns {Object} { results: [], error: null | string }
 */
const fetchCommentaryContext = async (book, chapter, verse, options = {}) => {
  const { isTalmud } = options;
  const results = [];
  let fetchError = null;

  try {
    if (isTalmud) {
      // Fetch Talmud-specific commentaries
      const [tosafot, maharsha] = await Promise.all([
        getTosafotForDaf(book, chapter).catch(() => []),
        getMaharshaForDaf(book, chapter).catch(() => [])
      ]);

      if (tosafot?.length) {
        results.push({
          source: 'Tosafot',
          type: 'commentary',
          texts: tosafot.slice(0, 3).map(t => ({
            hebrew: truncateText(t.hebrew, 400),
            english: truncateText(t.english, 400),
            dibbur: t.dibbur
          }))
        });
      }

      if (maharsha?.length) {
        results.push({
          source: 'Maharsha',
          type: 'commentary',
          texts: maharsha.slice(0, 2).map(t => ({
            hebrew: truncateText(t.hebrew, 400),
            english: truncateText(t.english, 400)
          }))
        });
      }
    } else {
      // Fetch Torah/Tanakh commentaries in parallel
      const [rashi, ramban, ibnEzra, sforno, orHaChaim, generalCommentary] = await Promise.all([
        getRashiForVerse(book, chapter, verse).catch(() => []),
        getRambanForVerse(book, chapter, verse).catch(() => []),
        getIbnEzraForVerse(book, chapter, verse).catch(() => []),
        getSfornoForVerse(book, chapter, verse).catch(() => []),
        getOrHaChaimForVerse(book, chapter, verse).catch(() => []),
        getCommentary(book, chapter, verse).catch(() => [])
      ]);

      // Format each commentator
      const commentators = [
        { name: 'Rashi', data: rashi },
        { name: 'Ramban', data: ramban },
        { name: 'Ibn Ezra', data: ibnEzra },
        { name: 'Sforno', data: sforno },
        { name: 'Or HaChaim', data: orHaChaim }
      ];

      for (const { name, data } of commentators) {
        if (data?.length) {
          results.push({
            source: name,
            type: 'commentary',
            texts: data.slice(0, 2).map(t => ({
              hebrew: truncateText(t.hebrew, 400),
              english: truncateText(t.english, 400),
              dibbur: t.dibbur || ''
            }))
          });
        }
      }

      // Add any additional commentaries from general fetch
      const otherCommentaries = generalCommentary?.filter(c =>
        !['Rashi', 'Ramban', 'Ibn Ezra', 'Sforno', 'Or HaChaim'].includes(c.source)
      );
      if (otherCommentaries?.length) {
        for (const comm of otherCommentaries.slice(0, 3)) {
          results.push({
            source: comm.source,
            type: 'commentary',
            texts: [{
              hebrew: comm.language === 'hebrew' ? truncateText(comm.text, 300) : '',
              english: comm.language === 'english' ? truncateText(comm.text, 300) : ''
            }]
          });
        }
      }
    }
  } catch (error) {
    fetchError = error.message || 'Unknown commentary fetch error';
    console.warn('Error fetching commentary context:', error);
  }

  return { results, error: fetchError };
};

/**
 * Fetch cross-references and related passages
 * @returns {Object} { results: [], error: null | string }
 */
const fetchCrossRefsContext = async (book, chapter) => {
  const results = [];
  let fetchError = null;

  try {
    const crossRefs = await getCrossReferences(book, chapter);

    if (crossRefs?.length) {
      // Group by category
      const grouped = {};
      for (const ref of crossRefs.slice(0, 15)) {
        const cat = ref.category || 'Other';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push({
          ref: ref.ref,
          heRef: ref.heRef,
          text: truncateText(ref.text, 200),
          heText: truncateText(ref.heText, 200)
        });
      }

      for (const [category, refs] of Object.entries(grouped)) {
        results.push({
          source: category,
          type: 'crossRef',
          refs: refs.slice(0, 5)
        });
      }
    }
  } catch (error) {
    fetchError = error.message || 'Unknown cross-refs fetch error';
    console.warn('Error fetching cross-refs:', error);
  }

  return { results, error: fetchError };
};

/**
 * Fetch related texts (midrash, targum, halacha, parallels)
 * @returns {Object} { results: [], error: null | string }
 */
const fetchRelatedTextsContext = async (book, chapter, verse) => {
  const results = [];
  let fetchError = null;
  const ref = formatRef(book, chapter, verse);

  try {
    const related = await getRelatedTexts(ref);

    if (related) {
      // Midrash - important for PaRDeS (drash level)
      if (related.midrash?.length) {
        results.push({
          source: 'Midrash',
          type: 'midrash',
          texts: related.midrash.slice(0, 3).map(m => ({
            ref: m.ref,
            hebrew: truncateText(m.he, 300),
            english: truncateText(m.text, 300)
          }))
        });
      }

      // Targum
      if (related.targum?.length) {
        results.push({
          source: 'Targum',
          type: 'targum',
          texts: related.targum.slice(0, 2).map(t => ({
            ref: t.ref,
            aramaic: truncateText(t.he, 300),
            english: truncateText(t.text, 300)
          }))
        });
      }

      // Halacha links
      if (related.halacha?.length) {
        results.push({
          source: 'Halacha',
          type: 'halacha',
          refs: related.halacha.slice(0, 5).map(h => ({
            ref: h.ref,
            text: truncateText(h.text, 200)
          }))
        });
      }

      // Parallel passages
      if (related.parallels?.length) {
        results.push({
          source: 'Parallels',
          type: 'parallel',
          refs: related.parallels.slice(0, 5).map(p => ({
            ref: p.ref,
            heRef: p.heRef,
            text: truncateText(p.text, 200)
          }))
        });
      }
    }
  } catch (error) {
    fetchError = error.message || 'Unknown related texts fetch error';
    console.warn('Error fetching related texts:', error);
  }

  return { results, error: fetchError };
};

/**
 * Fetch topics associated with a reference
 * @returns {Object} { results: [], error: null | string }
 */
const fetchTopicsContext = async (book, chapter, verse) => {
  const ref = formatRef(book, chapter, verse);
  let fetchError = null;

  try {
    const topics = await getTopicsForRef(ref);

    if (topics?.length) {
      return {
        results: [{
          source: 'Topics',
          type: 'topics',
          topics: topics.slice(0, 8).map(t => ({
            slug: t.slug,
            title: t.title?.en || t.slug,
            heTitle: t.title?.he || '',
            category: t.category,
            description: truncateText(t.description, 150)
          }))
        }],
        error: null
      };
    }
  } catch (error) {
    fetchError = error.message || 'Unknown topics fetch error';
    console.warn('Error fetching topics:', error);
  }

  return { results: [], error: fetchError };
};

// =============================================================================
// Main RAG Context Builder
// =============================================================================

/**
 * Build RAG context for AI analysis
 * @param {Object} params - Parameters
 * @param {string} params.book - Book name (e.g., 'Genesis', 'Berakhot')
 * @param {string|number} params.chapter - Chapter number or daf
 * @param {string|number} params.verse - Verse number (optional for Talmud)
 * @param {string} params.mode - Analysis mode (summary, deep_study, etc.)
 * @returns {Promise<Object>} RAG context object with sources, metadata, and error info
 */
export const buildRAGContext = async ({
  book,
  chapter,
  verse,
  mode = 'summary'
}) => {
  const cacheKey = `rag:${book}:${chapter}:${verse}:${mode}`;
  const cached = ragCache.get(cacheKey);
  if (cached) return { ...cached, fromCache: true };

  const isTalmud = isTalmudBook(book);

  // Get mode configuration
  const requirements = MODE_DATA_REQUIREMENTS[mode] || ['commentary'];
  const priorities = MODE_PRIORITIES[mode] || [];
  const maxSources = MODE_MAX_SOURCES[mode] || 10;

  const startTime = Date.now();

  const context = {
    mode,
    reference: formatRef(book, chapter, verse),
    isTalmud,
    sources: [],
    errors: [],      // Track fetch errors for diagnostics
    partial: false,  // True if some sources failed but others succeeded
    metadata: {
      fetchDurationMs: 0,
      sourceTypes: {},
      totalTexts: 0
    }
  };

  // Build fetcher promises based on mode requirements
  // Each returns { results: [], error: null | string }
  const fetcherNames = [];
  const fetchPromises = [];

  if (requirements.includes('commentary')) {
    fetcherNames.push('commentary');
    fetchPromises.push(
      fetchCommentaryContext(book, chapter, verse, { isTalmud })
    );
  }

  if (requirements.includes('crossRefs')) {
    fetcherNames.push('crossRefs');
    fetchPromises.push(fetchCrossRefsContext(book, chapter));
  }

  if (requirements.includes('relatedTexts')) {
    fetcherNames.push('relatedTexts');
    fetchPromises.push(fetchRelatedTextsContext(book, chapter, verse));
  }

  if (requirements.includes('topics')) {
    fetcherNames.push('topics');
    fetchPromises.push(fetchTopicsContext(book, chapter, verse));
  }

  // Execute all fetchers in parallel and collect results
  const fetchResults = await Promise.all(fetchPromises);

  // Process results and collect errors
  for (let i = 0; i < fetchResults.length; i++) {
    const { results, error } = fetchResults[i];

    // Add successful results
    if (results?.length) {
      context.sources.push(...results);
    }

    // Track errors with context
    if (error) {
      context.errors.push({
        source: fetcherNames[i],
        message: error
      });
    }
  }

  // Mark as partial if some failed but others succeeded
  context.partial = context.errors.length > 0 && context.sources.length > 0;

  // Sort by priority and limit to maxSources
  context.sources = sortByPriority(context.sources, priorities).slice(0, maxSources);

  // Calculate metadata
  context.metadata.fetchDurationMs = Date.now() - startTime;
  context.totalSources = context.sources.length;
  context.fromCache = false;

  // Clean up errors array if empty (for cleaner JSON)
  if (context.errors.length === 0) {
    delete context.errors;
    delete context.partial;
  }

  // Build sourceTypes breakdown for UI
  for (const source of context.sources) {
    const type = source.type || 'other';
    if (!context.sourceTypes[type]) {
      context.sourceTypes[type] = { count: 0, sources: [] };
    }
    context.sourceTypes[type].count++;
    context.sourceTypes[type].sources.push(source.source);
  }

  // Cache the result (even partial results are useful)
  ragCache.set(cacheKey, context);

  return context;
};

// =============================================================================
// Format RAG Context for AI Prompt
// =============================================================================

/**
 * Format RAG context into a string for AI prompt injection
 */
export const formatRAGContextForPrompt = (context) => {
  if (!context || !context.sources?.length) {
    return '';
  }

  const sections = [];

  sections.push(`\n═══════════════════════════════════════`);
  sections.push(`📚 RETRIEVED SOURCE TEXTS (${context.reference})`);
  sections.push(`Use these ACTUAL sources for accurate citations:`);
  sections.push(`═══════════════════════════════════════\n`);

  for (const source of context.sources) {
    switch (source.type) {
      case 'commentary':
        sections.push(`\n【${source.source}】`);
        for (const text of source.texts) {
          if (text.dibbur) {
            sections.push(`  ד"ה ${text.dibbur}`);
          }
          if (text.hebrew) {
            sections.push(`  Hebrew: ${text.hebrew}`);
          }
          if (text.english) {
            sections.push(`  English: ${text.english}`);
          }
          sections.push('');
        }
        break;

      case 'crossRef':
        sections.push(`\n【Cross-References: ${source.source}】`);
        for (const ref of source.refs.slice(0, 4)) {
          sections.push(`  • ${ref.ref}${ref.text ? `: ${ref.text}` : ''}`);
        }
        break;

      case 'midrash':
        sections.push(`\n【Midrash Sources】`);
        for (const text of source.texts) {
          sections.push(`  • ${text.ref}`);
          if (text.hebrew) sections.push(`    ${text.hebrew}`);
          if (text.english) sections.push(`    ${text.english}`);
        }
        break;

      case 'targum':
        sections.push(`\n【Targum】`);
        for (const text of source.texts) {
          sections.push(`  • ${text.ref}`);
          if (text.aramaic) sections.push(`    Aramaic: ${text.aramaic}`);
          if (text.english) sections.push(`    ${text.english}`);
        }
        break;

      case 'halacha':
        sections.push(`\n【Halachic Sources】`);
        for (const ref of source.refs) {
          sections.push(`  • ${ref.ref}${ref.text ? `: ${ref.text}` : ''}`);
        }
        break;

      case 'parallel':
        sections.push(`\n【Parallel Passages】`);
        for (const ref of source.refs) {
          sections.push(`  • ${ref.ref} (${ref.heRef || ''})`);
          if (ref.text) sections.push(`    ${ref.text}`);
        }
        break;

      case 'topics':
        sections.push(`\n【Related Topics】`);
        const topicList = source.topics.map(t =>
          `${t.title}${t.heTitle ? ` (${t.heTitle})` : ''}`
        ).join(', ');
        sections.push(`  ${topicList}`);
        break;

      case 'lexicon':
        sections.push(`\n【Lexicon Definitions】`);
        for (const word of source.words) {
          sections.push(`  ${word.headword}: ${word.definition}`);
        }
        break;

      default:
        // Unknown source type - skip
        break;
    }
  }

  sections.push(`\n═══════════════════════════════════════`);
  sections.push(`IMPORTANT: Use the ACTUAL texts above for citations.`);
  sections.push(`Quote directly when possible. Cite specific sources by name.`);
  sections.push(`═══════════════════════════════════════\n`);

  return sections.join('\n');
};

// =============================================================================
// Quick Context for Lightweight Modes
// =============================================================================

/**
 * Get minimal RAG context for quick analysis modes
 */
export const getQuickRAGContext = async (book, chapter, verse) => {
  const cacheKey = `rag-quick:${book}:${chapter}:${verse}`;
  const cached = ragCache.get(cacheKey);
  if (cached) return cached;

  try {
    // Just fetch basic commentary for quick modes
    const commentary = await getCommentary(book, chapter, verse);
    const topics = await getTopicsForRef(formatRef(book, chapter, verse));

    const context = {
      commentary: commentary?.slice(0, 5).map(c => ({
        source: c.source,
        text: truncateText(c.text, 200)
      })) || [],
      topics: topics?.slice(0, 5).map(t => t.title?.en || t.slug) || []
    };

    ragCache.set(cacheKey, context);
    return context;
  } catch {
    return { commentary: [], topics: [] };
  }
};

// =============================================================================
// Cache Management
// =============================================================================

export const clearRAGCache = () => ragCache.clear();

// =============================================================================
// Export
// =============================================================================

const ragService = {
  buildRAGContext,
  formatRAGContextForPrompt,
  getQuickRAGContext,
  clearRAGCache
};

export default ragService;
