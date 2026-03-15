// =============================================================================
// Scholarly API Service
// Comprehensive integration with Sefaria's Related API, Topics API, and more
// Provides unified scholarly data for any text reference
// =============================================================================

import { createCache } from '../utils/cache';
import { cleanHtml } from '../utils/sanitize';

const SEFARIA_BASE = 'https://www.sefaria.org/api';
const DICTA_NAKDAN_BASE = 'https://nakdan-4-0.loadbalancer.dicta.org.il';

// Cache for scholarly data (longer TTL for reference data)
const scholarlyCache = createCache({ ttl: 30 * 60 * 1000, maxSize: 200 }); // 30 minutes
const topicCache = createCache({ ttl: 60 * 60 * 1000, maxSize: 100 }); // 1 hour

// =============================================================================
// COMMENTARY LAYER CONFIGURATION
// =============================================================================

export const COMMENTARY_LAYERS = {
  // Torah Commentaries
  torah: {
    primary: ['Rashi', 'Onkelos', 'Ramban', 'Ibn Ezra', 'Sforno'],
    secondary: ['Or HaChaim', 'Kli Yakar', 'Baal HaTurim', 'Chizkuni', 'Rabbeinu Bachya'],
    chassidic: ['Kedushat Levi', 'Noam Elimelech', 'Sefat Emet'],
    modern: ['Nechama Leibowitz', 'Rav Hirsch']
  },

  // Talmud Commentaries
  talmud: {
    primary: ['Rashi', 'Tosafot'],
    rishonim: ['Rashbam', 'Ritva', 'Ran', 'Rosh', 'Meiri'],
    acharonim: ['Maharsha', 'Maharal', 'Pnei Yehoshua'],
    modern: ['Steinsaltz']
  },

  // Mishnah Commentaries
  mishnah: {
    primary: ['Bartenura', 'Rambam'],
    secondary: ['Tosafot Yom Tov', 'Tiferet Yisrael', 'Melechet Shlomo']
  }
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const normalizeRef = (ref) => {
  if (!ref) return '';
  return ref.replace(/ /g, '_');
};

const safeJsonParse = async (response) => {
  try {
    const text = await response.text();
    return JSON.parse(text);
  } catch (e) {
    console.warn('JSON parse failed:', e.message);
    return null;
  }
};

// =============================================================================
// MAIN API FUNCTIONS
// =============================================================================

/**
 * Fetch comprehensive scholarly data for a reference
 * Combines: Related texts, Topics, Commentary layers, Cross-references
 * @param {string} ref - Sefaria reference (e.g., "Genesis.1.1", "Shabbat.2a")
 * @returns {Promise<Object>} Comprehensive scholarly data
 */
export async function getScholarlyData(ref) {
  if (!ref) return null;

  const normalizedRef = normalizeRef(ref);
  const cacheKey = `scholarly:${normalizedRef}`;
  const cached = scholarlyCache.get(cacheKey);
  if (cached) return cached;

  try {
    // Fetch multiple endpoints in parallel for efficiency
    const [relatedData, topicsData, linksData] = await Promise.all([
      fetchRelatedTexts(normalizedRef),
      fetchTopicsForRef(normalizedRef),
      fetchLinks(normalizedRef)
    ]);

    const result = {
      ref: normalizedRef,
      timestamp: Date.now(),

      // Organized commentary by category
      commentaries: organizeCommentaries(relatedData?.links || linksData || []),

      // Topic connections from Sefaria's ontology
      topics: topicsData || [],

      // Cross-references (parallel passages, related texts)
      crossReferences: extractCrossReferences(relatedData?.links || linksData || []),

      // Halachic connections
      halacha: extractHalachicReferences(relatedData?.links || linksData || []),

      // Midrashic connections
      midrash: extractMidrashicReferences(relatedData?.links || linksData || []),

      // Raw data for advanced use
      _raw: {
        related: relatedData,
        links: linksData
      }
    };

    scholarlyCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Error fetching scholarly data:', error);
    return null;
  }
}

/**
 * Fetch related texts from Sefaria's Related API
 * @param {string} ref - Normalized reference
 */
async function fetchRelatedTexts(ref) {
  try {
    const response = await fetch(`${SEFARIA_BASE}/related/${ref}`, {
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) return null;
    return await safeJsonParse(response);
  } catch (error) {
    console.warn('Related texts fetch failed:', error.message);
    return null;
  }
}

/**
 * Fetch topic links for a reference
 * @param {string} ref - Normalized reference
 */
async function fetchTopicsForRef(ref) {
  try {
    const response = await fetch(`${SEFARIA_BASE}/ref-topic-links/${ref}`, {
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) return [];

    const data = await safeJsonParse(response);
    if (!Array.isArray(data)) return [];

    return data.map(item => ({
      slug: item.topic || item.slug,
      title: item.title || { en: item.topic, he: item.he },
      description: cleanHtml(item.description || ''),
      category: item.toTopic || item.category || 'General'
    }));
  } catch (error) {
    console.warn('Topics fetch failed:', error.message);
    return [];
  }
}

/**
 * Fetch links for a reference
 * @param {string} ref - Normalized reference
 */
async function fetchLinks(ref) {
  try {
    const response = await fetch(`${SEFARIA_BASE}/links/${ref}`, {
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) return [];
    const data = await safeJsonParse(response);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.warn('Links fetch failed:', error.message);
    return [];
  }
}

/**
 * Organize commentary links by category
 * @param {Array} links - Raw links from Sefaria
 */
function organizeCommentaries(links) {
  const organized = {
    primary: [],
    rishonim: [],
    acharonim: [],
    chassidic: [],
    modern: [],
    other: []
  };

  const primaryCommentators = ['Rashi', 'Tosafot', 'Ramban', 'Ibn Ezra', 'Sforno', 'Rashbam', 'Onkelos', 'Bartenura', 'Targum'];
  const rishonimList = ['Ritva', 'Ran', 'Rosh', 'Meiri', 'Rabbeinu Chananel', 'Rashba', 'Raavad', 'Ramah', 'Sefer HaChinukh'];
  const acharonimList = ['Maharsha', 'Maharal', 'Pnei Yehoshua', 'Shach', 'Taz', 'Mishnah Berurah', 'Chofetz Chaim', 'Ben Ish Chai'];
  const chassidicList = ['Kedushat Levi', 'Noam Elimelech', 'Sefat Emet', 'Likutey Moharan', 'Tanya', 'Mei HaShiloach'];
  const modernList = ['Steinsaltz', 'Artscroll', 'Koren', 'Nechama Leibowitz', 'William Davidson', 'Jastrow'];

  for (const link of links) {
    const category = (link.category || link.type || '').toLowerCase();
    // Include commentaries and explanation-type links
    const isCommentary = category.includes('commentary') ||
                         category.includes('explanation') ||
                         link.collectiveTitle?.en;

    if (!isCommentary) continue;

    const commentaryName = link.collectiveTitle?.en || link.index_title || link.ref?.split(' on ')[0] || '';

    const item = {
      ref: link.ref,
      heRef: link.heRef,
      text: cleanHtml(link.text || ''),
      he: cleanHtml(link.he || ''),
      commentator: commentaryName
    };

    const nameLower = commentaryName.toLowerCase();
    if (primaryCommentators.some(c => nameLower.includes(c.toLowerCase()))) {
      organized.primary.push(item);
    } else if (rishonimList.some(c => nameLower.includes(c.toLowerCase()))) {
      organized.rishonim.push(item);
    } else if (acharonimList.some(c => nameLower.includes(c.toLowerCase()))) {
      organized.acharonim.push(item);
    } else if (chassidicList.some(c => nameLower.includes(c.toLowerCase()))) {
      organized.chassidic.push(item);
    } else if (modernList.some(c => nameLower.includes(c.toLowerCase()))) {
      organized.modern.push(item);
    } else {
      organized.other.push(item);
    }
  }

  return organized;
}

/**
 * Extract cross-references (parallel passages, Talmudic references)
 */
function extractCrossReferences(links) {
  const crossRefs = {
    talmud: [],
    tanakh: [],
    mishnah: [],
    midrash: [],
    other: []
  };

  for (const link of links) {
    const category = (link.category || link.type || '').toLowerCase();

    // Skip commentaries - handled separately
    if (category.includes('commentary')) continue;

    const item = {
      ref: link.ref,
      heRef: link.heRef,
      text: cleanHtml(link.text || ''),
      he: cleanHtml(link.he || ''),
      category: link.category
    };

    if (category.includes('talmud') || category.includes('bavli') || category.includes('yerushalmi')) {
      crossRefs.talmud.push(item);
    } else if (category.includes('tanakh') || category.includes('torah') || category.includes('prophets') || category.includes('writings')) {
      crossRefs.tanakh.push(item);
    } else if (category.includes('mishnah') || category.includes('mishna')) {
      crossRefs.mishnah.push(item);
    } else if (category.includes('midrash')) {
      crossRefs.midrash.push(item);
    } else if (category.includes('parallel') || category.includes('reference')) {
      crossRefs.other.push(item);
    }
  }

  return crossRefs;
}

/**
 * Extract halachic references
 */
function extractHalachicReferences(links) {
  const halachic = [];

  const halachicCategories = ['halakhah', 'halacha', 'shulchan arukh', 'mishneh torah', 'rambam', 'tur', 'aruch hashulchan'];

  for (const link of links) {
    const category = (link.category || '').toLowerCase();
    const ref = (link.ref || '').toLowerCase();

    if (halachicCategories.some(h => category.includes(h) || ref.includes(h))) {
      halachic.push({
        ref: link.ref,
        heRef: link.heRef,
        text: cleanHtml(link.text || ''),
        he: cleanHtml(link.he || ''),
        source: link.collectiveTitle?.en || link.category || 'Halacha'
      });
    }
  }

  return halachic;
}

/**
 * Extract Midrashic references
 */
function extractMidrashicReferences(links) {
  const midrash = [];

  for (const link of links) {
    const category = (link.category || '').toLowerCase();

    if (category.includes('midrash') || category.includes('aggadah') || category.includes('aggadic')) {
      midrash.push({
        ref: link.ref,
        heRef: link.heRef,
        text: cleanHtml(link.text || ''),
        he: cleanHtml(link.he || ''),
        source: link.collectiveTitle?.en || 'Midrash'
      });
    }
  }

  return midrash;
}

// =============================================================================
// TOPIC API
// =============================================================================

/**
 * Get detailed topic information
 * @param {string} slug - Topic slug
 */
export async function getTopicDetails(slug) {
  if (!slug) return null;

  const cacheKey = `topic:${slug}`;
  const cached = topicCache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(`${SEFARIA_BASE}/topics/${encodeURIComponent(slug)}`, {
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) return null;

    const data = await safeJsonParse(response);
    if (!data) return null;

    const result = {
      slug: data.slug,
      primaryTitle: data.primaryTitle,
      titles: data.titles,
      description: {
        en: cleanHtml(data.description?.en || ''),
        he: cleanHtml(data.description?.he || '')
      },
      category: data.category,
      numSources: data.numSources || 0,
      image: data.image,
      relatedTopics: data.links?.filter(l => l.linkType === 'related-to') || [],
      parentTopics: data.links?.filter(l => l.linkType === 'is-a') || []
    };

    topicCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.warn('Topic details fetch failed:', error.message);
    return null;
  }
}

/**
 * Search topics by text using Sefaria's autocomplete endpoint
 * @param {string} query - Search query
 */
export async function searchTopics(query) {
  if (!query || query.length < 2) return [];

  try {
    // Sefaria uses /api/topic/completion for topic search/autocomplete
    const response = await fetch(`${SEFARIA_BASE}/topic/completion/${encodeURIComponent(query)}`, {
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) return [];

    const data = await safeJsonParse(response);

    // Sefaria returns array of [slug, title, heTitle] arrays
    if (Array.isArray(data)) {
      return data.slice(0, 20).map(item => {
        if (Array.isArray(item)) {
          return {
            slug: item[0],
            title: { en: item[1], he: item[2] || item[1] }
          };
        }
        return item;
      });
    }
    return [];
  } catch (error) {
    console.warn('Topic search failed:', error.message);
    return [];
  }
}

// =============================================================================
// DICTA NAKDAN INTEGRATION (Vocalization)
// =============================================================================

/**
 * Add vocalization (nikud) to Hebrew text using Dicta's Nakdan API
 * @param {string} text - Unvocalized Hebrew text
 * @param {string} genre - Text genre: 'modern', 'rabbinic', 'poetry'
 * @returns {Promise<string>} Vocalized text
 */
export async function addVocalization(text, genre = 'rabbinic') {
  if (!text || text.length < 2) return text;

  try {
    // Dicta Nakdan 4.0 API endpoint
    const response = await fetch(`${DICTA_NAKDAN_BASE}/api/nakdan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        data: text,
        genre: genre, // 'modern', 'rabbinic', 'poetry'
        matchPartialWords: true,
        keepMekorQere: false,
        keepQampilex: false,
        ktivmale: true
      }),
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      console.warn('Nakdan API returned:', response.status);
      return text; // Return original on failure
    }

    const result = await safeJsonParse(response);

    // Dicta Nakdan 4.0 returns array of word objects
    if (Array.isArray(result)) {
      // Reconstruct text from word objects
      return result.map(word => {
        if (typeof word === 'object' && word.nakpieces) {
          // Combine all nakpieces for each word
          return word.nakpieces.map(piece => piece.text || piece.w || '').join('');
        }
        if (typeof word === 'object' && word.word) {
          return word.word;
        }
        if (typeof word === 'string') {
          return word;
        }
        return '';
      }).join('');
    }

    // Fallback for other response formats
    if (result?.text) {
      return result.text;
    }
    if (result?.result) {
      return result.result;
    }
    if (typeof result === 'string') {
      return result;
    }

    return text;
  } catch (error) {
    console.warn('Nakdan vocalization failed:', error.message);
    return text; // Return original on error
  }
}

/**
 * Check if Nakdan service is available
 */
export async function checkNakdanAvailability() {
  try {
    // Test with a simple word
    const response = await fetch(`${DICTA_NAKDAN_BASE}/api/nakdan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: 'שלום', genre: 'modern' }),
      signal: AbortSignal.timeout(5000)
    });
    return response.ok;
  } catch {
    return false;
  }
}

// =============================================================================
// COMBINED SCHOLARLY ANALYSIS
// =============================================================================

/**
 * Get complete scholarly analysis for a text segment
 * Combines: discourse patterns, related texts, topics, commentary
 * @param {string} ref - Sefaria reference
 * @param {string} text - The actual text content (for pattern analysis)
 */
export async function getCompleteScholarlyAnalysis(ref, text = '') {
  // Import dynamically to avoid circular dependencies
  const { analyzeDiscourseStructure, detectRabbis } = await import('./discoursePatternService.js');

  const [scholarlyData, discourseAnalysis] = await Promise.all([
    getScholarlyData(ref),
    Promise.resolve(text ? analyzeDiscourseStructure(text) : null)
  ]);

  return {
    ref,
    timestamp: Date.now(),

    // Discourse structure (if text provided)
    discourse: discourseAnalysis,

    // Commentary layers
    commentaries: scholarlyData?.commentaries || {},

    // Topic connections
    topics: scholarlyData?.topics || [],

    // Cross-references
    crossReferences: scholarlyData?.crossReferences || {},

    // Halachic connections
    halacha: scholarlyData?.halacha || [],

    // Midrashic references
    midrash: scholarlyData?.midrash || [],

    // Rabbi mentions (if text provided)
    rabbis: text ? detectRabbis(text) : [],

    // Summary statistics
    summary: {
      commentaryCount: Object.values(scholarlyData?.commentaries || {}).flat().length,
      topicCount: scholarlyData?.topics?.length || 0,
      crossRefCount: Object.values(scholarlyData?.crossReferences || {}).flat().length,
      halachaCount: scholarlyData?.halacha?.length || 0,
      midrashCount: scholarlyData?.midrash?.length || 0,
      discourseComplexity: discourseAnalysis?.complexityLevel || 'unknown',
      rabbiCount: text ? detectRabbis(text).length : 0
    }
  };
}

// =============================================================================
// TEXT PREVIEW FUNCTIONS
// =============================================================================

/**
 * Get a preview of any Sefaria reference
 * @param {string} ref - Reference to preview
 */
export async function getTextPreview(ref) {
  if (!ref) return null;

  try {
    const normalizedRef = normalizeRef(ref);
    const response = await fetch(`${SEFARIA_BASE}/texts/${normalizedRef}?context=0`, {
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) return null;

    const data = await safeJsonParse(response);
    if (!data) return null;

    return {
      ref: data.ref,
      heRef: data.heRef,
      he: cleanHtml(Array.isArray(data.he) ? data.he.join(' ') : (data.he || '')),
      text: cleanHtml(Array.isArray(data.text) ? data.text.join(' ') : (data.text || '')),
      categories: data.categories || []
    };
  } catch (error) {
    console.warn('Text preview fetch failed:', error.message);
    return null;
  }
}

// =============================================================================
// DAILY LEARNING & CALENDAR
// =============================================================================

/**
 * Get today's learning schedule from Sefaria's calendar
 * @param {string} timezone - Timezone (default: America/New_York)
 * @returns {Promise<Object>} Today's learning items
 */
export async function getDailyLearning(timezone = 'America/New_York') {
  try {
    const response = await fetch(
      `${SEFARIA_BASE}/calendars?timezone=${encodeURIComponent(timezone)}`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!response.ok) return null;

    const data = await safeJsonParse(response);
    if (!data?.calendar_items) return null;

    const items = {
      parashat: null,
      haftarah: null,
      dafYomi: null,
      mishnahYomit: null,
      dailyRambam: null,
      chofetzChaim: null,
      dailyPsalms: null,
      other: []
    };

    data.calendar_items.forEach(item => {
      const title = (item.title?.en || '').toLowerCase();
      const parsed = {
        title: item.title,
        displayValue: item.displayValue,
        ref: item.ref || item.url?.split('/').pop() || '',
        url: item.url || `https://www.sefaria.org/${(item.ref || '').replace(/ /g, '_')}`,
        description: item.description
      };

      if (title.includes('parashat') || title.includes('parasha')) {
        items.parashat = parsed;
      } else if (title.includes('haftara')) {
        items.haftarah = parsed;
      } else if (title.includes('daf yomi')) {
        items.dafYomi = parsed;
      } else if (title.includes('mishnah yomit') || title.includes('daily mishnah')) {
        items.mishnahYomit = parsed;
      } else if (title.includes('rambam')) {
        items.dailyRambam = parsed;
      } else if (title.includes('chofetz chaim') || title.includes('shemirat halashon')) {
        items.chofetzChaim = parsed;
      } else if (title.includes('psalm') || title.includes('tehillim')) {
        items.dailyPsalms = parsed;
      } else {
        items.other.push(parsed);
      }
    });

    return items;
  } catch (error) {
    console.warn('Failed to fetch daily learning:', error.message);
    return null;
  }
}

/**
 * Get random inspiring text for study motivation
 * @param {Array} categories - Optional categories to filter by
 * @returns {Promise<Object>} Random text with metadata
 */
export async function getRandomInspiration(categories = ['Tanakh', 'Mishnah']) {
  try {
    const categoryParam = categories.length > 0
      ? `?categories=${categories.map(c => encodeURIComponent(c)).join(',')}`
      : '';

    const response = await fetch(
      `${SEFARIA_BASE}/texts/random${categoryParam}`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!response.ok) return null;

    const data = await safeJsonParse(response);
    if (!data) return null;

    return {
      ref: data.ref,
      heRef: data.heRef,
      he: cleanHtml(Array.isArray(data.he) ? data.he.join(' ') : (data.he || '')),
      text: cleanHtml(Array.isArray(data.text) ? data.text.join(' ') : (data.text || '')),
      categories: data.categories || [],
      book: data.book || data.ref?.split('.')[0]?.replace(/_/g, ' ') || ''
    };
  } catch (error) {
    console.warn('Failed to fetch random text:', error.message);
    return null;
  }
}

// =============================================================================
// TOPIC EXPLORATION
// =============================================================================

/**
 * Get sources for a topic with pagination
 * @param {string} slug - Topic slug
 * @param {number} limit - Number of sources to fetch
 * @param {number} offset - Pagination offset
 * @returns {Promise<Object>} Topic sources
 */
export async function getTopicSources(slug, limit = 20, offset = 0) {
  if (!slug) return null;

  try {
    const response = await fetch(
      `${SEFARIA_BASE}/topics/${encodeURIComponent(slug)}?with_refs=1&annotate_links=0`,
      { signal: AbortSignal.timeout(15000) }
    );

    if (!response.ok) return null;

    const data = await safeJsonParse(response);
    if (!data) return null;

    // Extract and paginate refs
    const allRefs = data.refs || [];
    const paginatedRefs = allRefs.slice(offset, offset + limit);

    return {
      slug: data.slug,
      title: data.primaryTitle,
      description: {
        en: cleanHtml(data.description?.en || ''),
        he: cleanHtml(data.description?.he || '')
      },
      totalSources: allRefs.length,
      sources: paginatedRefs.map(r => ({
        ref: r.ref,
        heRef: r.heRef,
        categories: r.categories
      })),
      hasMore: offset + limit < allRefs.length
    };
  } catch (error) {
    console.warn('Failed to fetch topic sources:', error.message);
    return null;
  }
}

/**
 * Get related topics for exploration
 * @param {string} slug - Starting topic slug
 * @returns {Promise<Array>} Related topics
 */
export async function getRelatedTopics(slug) {
  const topic = await getTopicDetails(slug);
  if (!topic) return [];

  return [
    ...(topic.relatedTopics || []),
    ...(topic.parentTopics || [])
  ].slice(0, 10);
}

// =============================================================================
// VERSE CONNECTIONS
// =============================================================================

/**
 * Get all connections for a verse (comprehensive)
 * @param {string} ref - Verse reference
 * @returns {Promise<Object>} All connections organized by type
 */
export async function getVerseConnections(ref) {
  if (!ref) return null;

  const normalizedRef = normalizeRef(ref);

  try {
    const [linksResponse, topicsResponse] = await Promise.all([
      fetch(`${SEFARIA_BASE}/links/${normalizedRef}`, {
        signal: AbortSignal.timeout(10000)
      }),
      fetch(`${SEFARIA_BASE}/ref-topic-links/${normalizedRef}`, {
        signal: AbortSignal.timeout(10000)
      })
    ]);

    const links = linksResponse.ok ? await safeJsonParse(linksResponse) : [];
    const topics = topicsResponse.ok ? await safeJsonParse(topicsResponse) : [];

    // Organize connections
    const connections = {
      commentary: [],
      talmud: [],
      midrash: [],
      halacha: [],
      kabbalah: [],
      philosophy: [],
      liturgy: [],
      topics: Array.isArray(topics) ? topics : [],
      total: 0
    };

    if (Array.isArray(links)) {
      links.forEach(link => {
        const category = (link.category || '').toLowerCase();
        const item = {
          ref: link.ref,
          heRef: link.heRef,
          text: cleanHtml(link.text || '').slice(0, 200),
          he: cleanHtml(link.he || '').slice(0, 200),
          type: link.type || link.category
        };

        if (category.includes('commentary') || category.includes('rashi') || category.includes('ramban')) {
          connections.commentary.push(item);
        } else if (category.includes('talmud') || category.includes('bavli') || category.includes('yerushalmi')) {
          connections.talmud.push(item);
        } else if (category.includes('midrash')) {
          connections.midrash.push(item);
        } else if (category.includes('halakh') || category.includes('shulchan') || category.includes('mishneh torah')) {
          connections.halacha.push(item);
        } else if (category.includes('kabbalah') || category.includes('zohar')) {
          connections.kabbalah.push(item);
        } else if (category.includes('philosophy') || category.includes('moreh')) {
          connections.philosophy.push(item);
        } else if (category.includes('liturgy') || category.includes('siddur')) {
          connections.liturgy.push(item);
        }
      });
    }

    connections.total = Object.values(connections)
      .filter(v => Array.isArray(v))
      .reduce((sum, arr) => sum + arr.length, 0);

    return connections;
  } catch (error) {
    console.warn('Failed to fetch verse connections:', error.message);
    return null;
  }
}

// =============================================================================
// STUDY AIDS
// =============================================================================

/**
 * Get word analysis from Sefaria's lexicon
 * @param {string} word - Hebrew word to analyze
 * @returns {Promise<Array>} Lexicon entries
 */
export async function getWordAnalysis(word) {
  if (!word || word.length < 2) return [];

  try {
    const response = await fetch(
      `${SEFARIA_BASE}/words/${encodeURIComponent(word)}`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!response.ok) return [];

    const data = await safeJsonParse(response);
    if (!Array.isArray(data)) return [];

    return data.map(entry => ({
      headword: entry.headword,
      lexicon: entry.parent_lexicon,
      content: entry.content,
      definition: cleanHtml(
        typeof entry.content === 'string'
          ? entry.content
          : JSON.stringify(entry.content)
      )
    }));
  } catch (error) {
    console.warn('Failed to fetch word analysis:', error.message);
    return [];
  }
}

// =============================================================================
// CLEAR CACHES
// =============================================================================

export function clearScholarlyCache() {
  scholarlyCache.clear();
  topicCache.clear();
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

const scholarlyApiService = {
  // Main functions
  getScholarlyData,
  getCompleteScholarlyAnalysis,
  getTextPreview,

  // Topic functions
  getTopicDetails,
  searchTopics,
  getTopicSources,
  getRelatedTopics,

  // Daily learning
  getDailyLearning,
  getRandomInspiration,

  // Verse connections
  getVerseConnections,

  // Study aids
  getWordAnalysis,

  // Vocalization (Dicta Nakdan)
  addVocalization,
  checkNakdanAvailability,

  // Configuration
  COMMENTARY_LAYERS,

  // Cache management
  clearScholarlyCache
};

export default scholarlyApiService;
