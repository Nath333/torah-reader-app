/**
 * Smart Data Service - Unified Intelligence Layer
 * Orchestrates RAG, word lookup, and offline/online modes
 * @module smartDataService
 */

// PRO SCHOLAR V6.2: Use CacheOrchestrator for unified cache management
import { createManagedCache } from '../cacheOrchestrator';
import { stripAllDiacritics } from '../../utils/hebrewUtils';

// =============================================================================
// Connectivity Detection & Management
// =============================================================================

const connectivityState = {
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  lastCheck: Date.now(),
  apiStatus: {
    sefaria: { available: null, lastCheck: 0, latency: null },
    groq: { available: null, lastCheck: 0, latency: null }
  },
  listeners: new Set()
};

// Check interval: 30 seconds for API status
const API_CHECK_INTERVAL = 30000;
// Quick ping timeout
const PING_TIMEOUT = 5000;

/**
 * Subscribe to connectivity changes
 */
export const onConnectivityChange = (callback) => {
  connectivityState.listeners.add(callback);
  return () => connectivityState.listeners.delete(callback);
};

/**
 * Notify all listeners of connectivity change
 */
const notifyListeners = () => {
  const status = getConnectivityStatus();
  connectivityState.listeners.forEach(cb => cb(status));
};

/**
 * Get current connectivity status
 */
export const getConnectivityStatus = () => ({
  isOnline: connectivityState.isOnline,
  sefaria: connectivityState.apiStatus.sefaria.available,
  groq: connectivityState.apiStatus.groq.available,
  mode: determineMode(),
  lastCheck: connectivityState.lastCheck
});

/**
 * Determine operating mode based on connectivity
 */
const determineMode = () => {
  if (!connectivityState.isOnline) return 'offline';

  const { sefaria, groq } = connectivityState.apiStatus;

  // Full mode: both APIs available
  if (sefaria.available && groq.available) return 'full';

  // Lookup only: Sefaria available but no Groq
  if (sefaria.available && !groq.available) return 'lookup-only';

  // AI only: Groq available but Sefaria down (rare)
  if (!sefaria.available && groq.available) return 'ai-only';

  // Degraded: online but APIs not responding
  return 'degraded';
};

/**
 * Quick ping to check API availability
 */
const pingApi = async (url, name) => {
  const startTime = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PING_TIMEOUT);

    await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      mode: 'no-cors' // Just check if reachable
    });

    clearTimeout(timeoutId);
    const latency = Date.now() - startTime;

    return { available: true, latency };
  } catch (error) {
    return { available: false, latency: null, error: error.message };
  }
};

/**
 * Check all API endpoints
 */
export const checkConnectivity = async (force = false) => {
  const now = Date.now();

  // Skip if recently checked (unless forced)
  if (!force && now - connectivityState.lastCheck < API_CHECK_INTERVAL) {
    return getConnectivityStatus();
  }

  connectivityState.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  connectivityState.lastCheck = now;

  if (!connectivityState.isOnline) {
    connectivityState.apiStatus.sefaria = { available: false, lastCheck: now };
    connectivityState.apiStatus.groq = { available: false, lastCheck: now };
    notifyListeners();
    return getConnectivityStatus();
  }

  // Check APIs in parallel
  const [sefariaResult, groqResult] = await Promise.all([
    pingApi('https://www.sefaria.org/api/texts/Genesis.1.1', 'sefaria'),
    // For Groq, we just check if we have a key (actual check happens on use)
    Promise.resolve({ available: !!localStorage.getItem('groq_api_key'), latency: null })
  ]);

  connectivityState.apiStatus.sefaria = { ...sefariaResult, lastCheck: now };
  connectivityState.apiStatus.groq = { ...groqResult, lastCheck: now };

  notifyListeners();
  return getConnectivityStatus();
};

// Listen for browser online/offline events
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    connectivityState.isOnline = true;
    checkConnectivity(true);
  });

  window.addEventListener('offline', () => {
    connectivityState.isOnline = false;
    connectivityState.apiStatus.sefaria.available = false;
    connectivityState.apiStatus.groq.available = false;
    notifyListeners();
  });
}

// =============================================================================
// Persistent Offline Storage (IndexedDB)
// =============================================================================

const DB_NAME = 'torah-reader-cache';
const DB_VERSION = 1;
const STORES = {
  LOOKUP: 'word-lookup',
  RAG: 'rag-context',
  VERSES: 'verses'
};

let db = null;

/**
 * Initialize IndexedDB for offline storage
 */
const initDB = () => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      // Word lookup cache
      if (!database.objectStoreNames.contains(STORES.LOOKUP)) {
        const lookupStore = database.createObjectStore(STORES.LOOKUP, { keyPath: 'word' });
        lookupStore.createIndex('timestamp', 'timestamp');
      }

      // RAG context cache
      if (!database.objectStoreNames.contains(STORES.RAG)) {
        const ragStore = database.createObjectStore(STORES.RAG, { keyPath: 'key' });
        ragStore.createIndex('timestamp', 'timestamp');
        ragStore.createIndex('reference', 'reference');
      }

      // Verse cache
      if (!database.objectStoreNames.contains(STORES.VERSES)) {
        const verseStore = database.createObjectStore(STORES.VERSES, { keyPath: 'ref' });
        verseStore.createIndex('timestamp', 'timestamp');
      }
    };
  });
};

/**
 * Store data in IndexedDB
 */
const storeOffline = async (storeName, data) => {
  try {
    const database = await initDB();
    const tx = database.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);

    await new Promise((resolve, reject) => {
      const request = store.put({ ...data, timestamp: Date.now() });
      request.onsuccess = resolve;
      request.onerror = () => reject(request.error);
    });

    return true;
  } catch (error) {
    console.warn('Offline storage error:', error);
    return false;
  }
};

/**
 * Retrieve data from IndexedDB
 */
const getOffline = async (storeName, key) => {
  try {
    const database = await initDB();
    const tx = database.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);

    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn('Offline retrieval error:', error);
    return null;
  }
};

// =============================================================================
// Smart Memory Cache with LRU
// =============================================================================

// PRO SCHOLAR V6.2: In-memory caches with CacheOrchestrator integration
const memoryCache = {
  lookup: createManagedCache('smartLookup', { ttl: 60 * 60 * 1000, maxSize: 500 }),     // 1 hour, 500 words
  rag: createManagedCache('smartRAG', { ttl: 60 * 60 * 1000, maxSize: 200 }),           // 1 hour, 200 contexts
  prefetch: createManagedCache('smartPrefetch', { ttl: 5 * 60 * 1000, maxSize: 50 })    // 5 min, 50 prefetches
};

// =============================================================================
// Smart Lookup Orchestrator
// =============================================================================

/**
 * Smart word lookup with intelligent fallback chain
 * @param {string} word - Hebrew/Aramaic word to look up
 * @param {Object} options - Lookup options
 * @returns {Promise<Object>} Lookup result with source info
 */
export const smartLookup = async (word, options = {}) => {
  const { forceOnline = false, includeFrench = true } = options;

  const cleaned = stripAllDiacritics(word).trim();
  if (!cleaned || cleaned.length < 2) {
    return { success: false, error: 'Word too short' };
  }

  const cacheKey = `${cleaned}:${includeFrench}`;

  // 1. Check memory cache first (instant)
  const memoryCached = memoryCache.lookup.get(cacheKey);
  if (memoryCached) {
    return { ...memoryCached, source: 'memory-cache' };
  }

  // 2. Check offline storage (fast)
  const offlineCached = await getOffline(STORES.LOOKUP, cleaned);
  if (offlineCached && !forceOnline) {
    // Refresh memory cache
    memoryCache.lookup.set(cacheKey, offlineCached);
    return { ...offlineCached, source: 'offline-cache' };
  }

  // 3. Determine if we should try online
  const connectivity = getConnectivityStatus();
  const shouldTryOnline = connectivity.isOnline && (connectivity.sefaria || forceOnline);

  if (!shouldTryOnline) {
    // Return local dictionary result
    // PRO SCHOLAR V10: Use unifiedLookupService (consolidated from combinedTranslationService)
    const { quickLookup } = await import('../unifiedLookupService');
    const localResult = quickLookup(cleaned);

    return {
      success: !!localResult?.english,
      word: cleaned,
      english: localResult?.english || null,
      french: localResult?.french || null,
      source: 'local-dictionary',
      sources: localResult?.english ? [{ name: 'Dictionary', definition: localResult.english }] : [],
      offline: true
    };
  }

  // 4. Try online scholarly lookup
  try {
    const { scholarlyLookup } = await import('../dictionaries/scholarlyLexiconService');
    const result = await scholarlyLookup(cleaned);

    if (result?.primaryDefinition) {
      const output = {
        success: true,
        word: cleaned,
        english: result.primaryDefinition,
        french: null,
        source: 'sefaria-scholarly',
        sources: formatSources(result.sources),
        headword: result.sources?.bdb?.headword || result.sources?.strong?.headword || cleaned,
        root: result.root,
        morphology: result.grammar,
        language: result.language || 'Hebrew',
        offline: false
      };

      // Get French translation if needed
      if (includeFrench && output.english) {
        try {
          const { translateEnglishToFrench } = await import('../dictionaries/englishToFrenchService');
          output.french = await translateEnglishToFrench(output.english);
        } catch {
          // French optional
        }
      }

      // Store for offline use
      memoryCache.lookup.set(cacheKey, output);
      storeOffline(STORES.LOOKUP, { word: cleaned, ...output }).catch(() => {});

      return output;
    }
  } catch (error) {
    console.warn('Online lookup failed, falling back:', error.message);
  }

  // 5. Fallback to unified lookup service
  // PRO SCHOLAR V10: Use unifiedLookupService (consolidated from combinedTranslationService)
  try {
    const { lookupWord } = await import('../unifiedLookupService');
    const combined = await lookupWord(cleaned);

    if (combined?.english) {
      const output = {
        success: true,
        word: cleaned,
        english: combined.english,
        french: combined.french,
        source: 'combined-fallback',
        sources: combined.sources || [{ name: 'Sefaria', definition: combined.english }],
        offline: false
      };

      memoryCache.lookup.set(cacheKey, output);
      storeOffline(STORES.LOOKUP, { word: cleaned, ...output }).catch(() => {});

      return output;
    }
  } catch {
    // Silent fail
  }

  // 6. Final fallback: local sync
  // PRO SCHOLAR V10: Use unifiedLookupService (consolidated from combinedTranslationService)
  const { quickLookup } = await import('../unifiedLookupService');
  const local = quickLookup(cleaned);

  return {
    success: !!local?.english,
    word: cleaned,
    english: local?.english || null,
    french: local?.french || null,
    source: 'local-fallback',
    sources: local?.english ? [{ name: 'Dictionary', definition: local.english }] : [],
    offline: true
  };
};

/**
 * Format sources from scholarly lookup
 */
const formatSources = (sources) => {
  if (!sources) return [];

  const formatted = [];
  const configs = {
    bdb: { name: 'BDB', fullName: 'Brown-Driver-Briggs', year: 1906 },
    strong: { name: "Strong's", fullName: "Strong's Concordance" },
    jastrow: { name: 'Jastrow', fullName: "Jastrow's Dictionary", year: 1903 },
    klein: { name: 'Klein', fullName: "Klein's Etymology", year: 1987 },
    steinsaltz: { name: 'Steinsaltz', fullName: 'Steinsaltz Translation', year: 1989 }
  };

  for (const [key, config] of Object.entries(configs)) {
    const data = sources[key];
    if (data?.definitions?.length) {
      formatted.push({
        name: config.name,
        fullName: config.fullName,
        year: config.year,
        definition: data.definitions[0]?.text,
        strongNumber: data.strongNumber
      });
    }
  }

  return formatted;
};

// =============================================================================
// Smart RAG Orchestrator
// =============================================================================

/**
 * Smart RAG context with caching and offline awareness
 * @param {Object} params - RAG parameters
 * @returns {Promise<Object>} RAG context or null
 */
export const smartRAG = async ({
  book,
  chapter,
  verse,
  mode = 'summary',
  forceRefresh = false
}) => {
  if (!book || !chapter) {
    return null;
  }

  const cacheKey = `${book}:${chapter}:${verse || 'all'}:${mode}`;

  // 1. Check memory cache (unless force refresh)
  if (!forceRefresh) {
    const memoryCached = memoryCache.rag.get(cacheKey);
    if (memoryCached) {
      return { ...memoryCached, fromCache: true, cacheType: 'memory' };
    }
  }

  // 2. Check offline storage
  if (!forceRefresh) {
    const offlineCached = await getOffline(STORES.RAG, cacheKey);
    if (offlineCached) {
      memoryCache.rag.set(cacheKey, offlineCached);
      return { ...offlineCached, fromCache: true, cacheType: 'offline' };
    }
  }

  // 3. Check connectivity
  const connectivity = getConnectivityStatus();
  if (!connectivity.isOnline || !connectivity.sefaria) {
    console.log('[SmartRAG] Offline - no RAG available');
    return null;
  }

  // 4. Fetch fresh RAG context
  try {
    const { buildRAGContext } = await import('./ragService');
    const context = await buildRAGContext({ book, chapter, verse, mode });

    if (context?.sources?.length > 0) {
      // Store for offline use
      memoryCache.rag.set(cacheKey, context);
      storeOffline(STORES.RAG, { key: cacheKey, reference: `${book}.${chapter}.${verse}`, ...context }).catch(() => {});

      return { ...context, fromCache: false };
    }
  } catch (error) {
    console.warn('[SmartRAG] Fetch failed:', error.message);
  }

  return null;
};

// =============================================================================
// Intelligent Prefetching
// =============================================================================

const prefetchQueue = new Set();
const MAX_PREFETCH_CONCURRENT = 3;
let prefetchInProgress = 0;

// Helper to execute a single prefetch with concurrency tracking
const executePrefetch = (book, chapter, verse, mode, key) => {
  prefetchInProgress++;
  smartRAG({ book, chapter, verse, mode })
    .then(result => {
      if (result) {
        memoryCache.prefetch.set(key, true);
      }
    })
    .finally(() => {
      prefetchInProgress--;
      prefetchQueue.delete(key);
    });
};

/**
 * Prefetch RAG context for upcoming verses
 * Call this when user is reading - prefetch next verses
 */
export const prefetchRAGContext = async (book, chapter, currentVerse, mode = 'summary') => {
  const connectivity = getConnectivityStatus();
  if (!connectivity.isOnline || !connectivity.sefaria) return;

  // Prefetch next 3 verses
  const versesToPrefetch = [
    currentVerse + 1,
    currentVerse + 2,
    currentVerse + 3
  ].filter(v => v > 0);

  for (const verse of versesToPrefetch) {
    const key = `${book}:${chapter}:${verse}:${mode}`;

    // Skip if already cached or in queue
    if (memoryCache.rag.get(key) || memoryCache.prefetch.get(key) || prefetchQueue.has(key)) {
      continue;
    }

    prefetchQueue.add(key);

    // Process queue with concurrency limit
    if (prefetchInProgress < MAX_PREFETCH_CONCURRENT) {
      executePrefetch(book, chapter, verse, mode, key);
    }
  }
};

/**
 * Prefetch word lookups for visible text
 * Call with array of Hebrew words visible on screen
 */
export const prefetchWordLookups = async (words) => {
  const connectivity = getConnectivityStatus();
  if (!connectivity.isOnline) return;

  // Clean and filter words
  const uniqueWords = [...new Set(
    words
      .map(w => stripAllDiacritics(w).trim())
      .filter(w => w.length >= 2)
  )].slice(0, 20); // Limit to 20 words

  // Check which need prefetching
  const needsPrefetch = uniqueWords.filter(word => !memoryCache.lookup.get(word));

  if (needsPrefetch.length === 0) return;

  // Prefetch in batches of 5
  const batches = [];
  for (let i = 0; i < needsPrefetch.length; i += 5) {
    batches.push(needsPrefetch.slice(i, i + 5));
  }

  for (const batch of batches) {
    await Promise.all(
      batch.map(word => smartLookup(word, { includeFrench: false }).catch(err => {
        console.warn(`[SmartPrefetch] Failed to prefetch "${word}":`, err.message);
      }))
    );
    // Small delay between batches to avoid overwhelming API
    await new Promise(resolve => setTimeout(resolve, 100));
  }
};

// =============================================================================
// Smart Analysis (RAG + AI)
// =============================================================================

/**
 * Smart analysis with automatic RAG enhancement
 * @param {Object} params - Analysis parameters
 * @returns {Promise<Object>} Analysis result
 */
export const smartAnalyze = async ({
  text,
  book,
  chapter,
  verse,
  mode = 'summary',
  source = 'Torah'
}) => {
  const connectivity = getConnectivityStatus();

  // Check if AI is available
  if (!connectivity.groq) {
    return {
      success: false,
      error: 'AI analysis requires Groq API key. Add it in settings.',
      offline: true
    };
  }

  if (!connectivity.isOnline) {
    return {
      success: false,
      error: 'AI analysis requires internet connection.',
      offline: true
    };
  }

  // Get RAG context (if Sefaria available)
  let ragContext = null;
  if (connectivity.sefaria) {
    ragContext = await smartRAG({ book, chapter, verse, mode });
  }

  // Perform analysis
  try {
    const { analyzeCommentary } = await import('../groqService');

    const result = await analyzeCommentary(
      text,
      source,
      `${book} ${chapter}:${verse}`,
      mode,
      {
        book,
        chapter,
        verseNum: verse,
        useRAG: !!ragContext,
        ragContext
      }
    );

    return {
      ...result,
      ragEnhanced: !!ragContext,
      ragSourceCount: ragContext?.sources?.length || 0,
      connectivityMode: connectivity.mode
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      offline: false
    };
  }
};

// =============================================================================
// Utility: Get Data Availability Summary
// =============================================================================

/**
 * Get summary of what data is available in current mode
 */
export const getDataAvailability = async () => {
  const connectivity = await checkConnectivity();

  // Count offline cached items
  let lookupCount = 0;
  let ragCount = 0;

  try {
    const database = await initDB();

    const lookupTx = database.transaction(STORES.LOOKUP, 'readonly');
    lookupCount = await new Promise(resolve => {
      const req = lookupTx.objectStore(STORES.LOOKUP).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(0);
    });

    const ragTx = database.transaction(STORES.RAG, 'readonly');
    ragCount = await new Promise(resolve => {
      const req = ragTx.objectStore(STORES.RAG).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(0);
    });
  } catch {
    // IndexedDB not available
  }

  return {
    connectivity,
    cache: {
      lookupMemory: memoryCache.lookup.size || 0,
      lookupOffline: lookupCount,
      ragMemory: memoryCache.rag.size || 0,
      ragOffline: ragCount
    },
    features: {
      wordLookup: true, // Always available (local fallback)
      scholarlyLookup: connectivity.sefaria,
      ragContext: connectivity.sefaria,
      aiAnalysis: connectivity.groq && connectivity.isOnline,
      frenchTranslation: connectivity.isOnline
    }
  };
};

// =============================================================================
// Export
// =============================================================================

const smartDataService = {
  // Connectivity
  checkConnectivity,
  getConnectivityStatus,
  onConnectivityChange,

  // Smart operations
  smartLookup,
  smartRAG,
  smartAnalyze,

  // Prefetching
  prefetchRAGContext,
  prefetchWordLookups,

  // Utility
  getDataAvailability,

  // Cache management
  clearCache: () => {
    memoryCache.lookup.clear();
    memoryCache.rag.clear();
    memoryCache.prefetch.clear();
  }
};

export default smartDataService;
