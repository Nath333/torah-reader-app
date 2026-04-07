/**
 * Semantic Search Service - 2026 AI-Powered Search
 *
 * Features:
 * - Vector embeddings for verses using local computation
 * - Semantic similarity search ("find verses about forgiveness")
 * - Concept clustering and related verse discovery
 * - Hybrid search (semantic + keyword)
 */

import { callGroqAPI } from '../groqApi';

// In-memory vector store (for demo - production would use Supabase pgvector)
const vectorStore = {
  verses: new Map(),
  embeddings: new Map(),
  index: null
};

// Simple TF-IDF based semantic similarity (no external API needed)
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
  'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need',
  'that', 'which', 'who', 'whom', 'this', 'these', 'those', 'it', 'its',
  'he', 'she', 'they', 'them', 'his', 'her', 'their', 'our', 'your',
  'את', 'אל', 'על', 'עם', 'מן', 'כי', 'אשר', 'לא', 'כל', 'הוא', 'היא',
  'הם', 'אני', 'אתה', 'אנחנו', 'זה', 'זאת', 'אלה'
]);

// Semantic concept mappings for Hebrew/English Torah terms
export const CONCEPT_MAPPINGS = {
  // Core theological concepts
  forgiveness: ['סליחה', 'מחילה', 'כפרה', 'forgive', 'pardon', 'atone', 'mercy', 'חנון', 'רחום'],
  covenant: ['ברית', 'covenant', 'promise', 'oath', 'שבועה', 'נדר', 'agreement'],
  blessing: ['ברכה', 'bless', 'blessed', 'prosperity', 'favor', 'טובה'],
  curse: ['קללה', 'curse', 'cursed', 'ארור', 'punishment'],
  love: ['אהבה', 'love', 'beloved', 'חסד', 'kindness', 'mercy', 'compassion', 'רחמים'],
  fear: ['יראה', 'fear', 'awe', 'reverence', 'פחד', 'afraid'],
  faith: ['אמונה', 'faith', 'trust', 'believe', 'בטחון', 'faithful'],
  righteousness: ['צדק', 'צדקה', 'righteous', 'justice', 'just', 'משפט'],
  sin: ['חטא', 'עוון', 'פשע', 'sin', 'transgression', 'iniquity', 'guilt'],
  repentance: ['תשובה', 'repent', 'return', 'שוב', 'confess', 'וידוי'],

  // Actions and commandments
  sacrifice: ['קרבן', 'זבח', 'עולה', 'sacrifice', 'offering', 'altar', 'מזבח'],
  prayer: ['תפילה', 'pray', 'prayer', 'supplication', 'תחנה', 'בקשה'],
  worship: ['עבודה', 'worship', 'serve', 'service', 'השתחוה'],
  sabbath: ['שבת', 'sabbath', 'rest', 'מנוחה', 'seventh day'],
  commandment: ['מצוה', 'מצוות', 'commandment', 'law', 'חוק', 'משפט', 'תורה'],

  // People and relationships
  father: ['אב', 'אבא', 'father', 'patriarch', 'אבות'],
  mother: ['אם', 'אמא', 'mother', 'matriarch', 'אמהות'],
  child: ['בן', 'בת', 'ילד', 'child', 'son', 'daughter', 'offspring', 'זרע'],
  king: ['מלך', 'king', 'kingdom', 'מלכות', 'reign', 'ruler'],
  prophet: ['נביא', 'prophet', 'prophecy', 'נבואה', 'vision', 'חזון'],
  priest: ['כהן', 'priest', 'priesthood', 'כהונה', 'levite', 'לוי'],

  // Creation and nature
  creation: ['בריאה', 'ברא', 'create', 'creation', 'עשה', 'יצר', 'form'],
  heaven: ['שמים', 'heaven', 'heavens', 'sky', 'celestial'],
  earth: ['ארץ', 'אדמה', 'earth', 'land', 'ground', 'world'],
  water: ['מים', 'water', 'sea', 'ים', 'נהר', 'river', 'flood', 'מבול'],
  light: ['אור', 'light', 'shine', 'נר', 'lamp', 'illuminate'],
  darkness: ['חושך', 'darkness', 'dark', 'night', 'לילה'],

  // Emotions and states
  joy: ['שמחה', 'joy', 'rejoice', 'happy', 'glad', 'ששון', 'גיל'],
  sorrow: ['צער', 'עצב', 'sorrow', 'grief', 'mourn', 'אבל', 'sad'],
  anger: ['כעס', 'חרון', 'אף', 'anger', 'wrath', 'fury', 'rage'],
  peace: ['שלום', 'peace', 'peaceful', 'harmony', 'wholeness'],
  war: ['מלחמה', 'war', 'battle', 'fight', 'קרב', 'צבא', 'army'],

  // Redemption themes
  exodus: ['יציאה', 'exodus', 'leave', 'יצא', 'egypt', 'מצרים', 'freedom', 'חירות'],
  redemption: ['גאולה', 'גאל', 'redeem', 'redemption', 'פדה', 'rescue', 'save', 'ישועה'],
  promised_land: ['ארץ', 'כנען', 'canaan', 'promised land', 'inheritance', 'נחלה'],
  wilderness: ['מדבר', 'wilderness', 'desert', 'wandering'],
  temple: ['מקדש', 'בית המקדש', 'temple', 'sanctuary', 'משכן', 'tabernacle']
};

// Build reverse mapping for quick lookup
const TERM_TO_CONCEPTS = new Map();
Object.entries(CONCEPT_MAPPINGS).forEach(([concept, terms]) => {
  terms.forEach(term => {
    const lower = term.toLowerCase();
    if (!TERM_TO_CONCEPTS.has(lower)) {
      TERM_TO_CONCEPTS.set(lower, []);
    }
    TERM_TO_CONCEPTS.get(lower).push(concept);
  });
});

/**
 * Tokenize text for semantic analysis
 */
function tokenize(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^\w\s\u0590-\u05FF]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 1 && !STOP_WORDS.has(word));
}

/**
 * Extract semantic concepts from text
 */
function extractConcepts(text) {
  const tokens = tokenize(text);
  const concepts = new Set();

  tokens.forEach(token => {
    const related = TERM_TO_CONCEPTS.get(token);
    if (related) {
      related.forEach(c => concepts.add(c));
    }
  });

  return Array.from(concepts);
}

/**
 * Calculate TF-IDF vector for text
 */
function calculateTFIDF(text, documentFrequencies = {}) {
  const tokens = tokenize(text);
  const tf = {};

  tokens.forEach(token => {
    tf[token] = (tf[token] || 0) + 1;
  });

  // Normalize by document length
  const maxTf = Math.max(...Object.values(tf), 1);
  Object.keys(tf).forEach(token => {
    tf[token] = 0.5 + 0.5 * (tf[token] / maxTf);
    // Apply IDF if available
    if (documentFrequencies[token]) {
      tf[token] *= Math.log(1000 / documentFrequencies[token]);
    }
  });

  return tf;
}

/**
 * Calculate cosine similarity between two TF-IDF vectors
 */
function cosineSimilarity(vec1, vec2) {
  const allTerms = new Set([...Object.keys(vec1), ...Object.keys(vec2)]);

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  allTerms.forEach(term => {
    const v1 = vec1[term] || 0;
    const v2 = vec2[term] || 0;
    dotProduct += v1 * v2;
    norm1 += v1 * v1;
    norm2 += v2 * v2;
  });

  if (norm1 === 0 || norm2 === 0) return 0;
  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

/**
 * Index a verse for semantic search
 */
export function indexVerse(ref, hebrewText, englishText) {
  const combinedText = `${hebrewText} ${englishText}`;
  const concepts = extractConcepts(combinedText);
  const tfidf = calculateTFIDF(combinedText);

  vectorStore.verses.set(ref, {
    ref,
    hebrew: hebrewText,
    english: englishText,
    concepts,
    tfidf
  });

  return { ref, concepts };
}

/**
 * Index multiple verses at once
 */
export function indexVerses(verses) {
  return verses.map(v => indexVerse(v.ref, v.hebrew, v.english));
}

/**
 * Semantic search for verses
 * @param {string} query - Natural language query
 * @param {number} limit - Max results to return
 * @returns {Array} Matching verses with scores
 */
export async function semanticSearch(query, limit = 10) {
  const queryConcepts = extractConcepts(query);
  const queryTfidf = calculateTFIDF(query);

  const results = [];

  vectorStore.verses.forEach((verse, ref) => {
    // Calculate concept overlap score
    const conceptOverlap = verse.concepts.filter(c => queryConcepts.includes(c)).length;
    const conceptScore = queryConcepts.length > 0
      ? conceptOverlap / queryConcepts.length
      : 0;

    // Calculate TF-IDF similarity
    const tfidfScore = cosineSimilarity(queryTfidf, verse.tfidf);

    // Combined score (weighted)
    const score = 0.6 * conceptScore + 0.4 * tfidfScore;

    if (score > 0.1) {
      results.push({
        ref,
        hebrew: verse.hebrew,
        english: verse.english,
        score,
        matchedConcepts: verse.concepts.filter(c => queryConcepts.includes(c)),
        conceptScore,
        tfidfScore
      });
    }
  });

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  return results.slice(0, limit);
}

/**
 * Find similar verses to a given verse
 */
export function findSimilarVerses(ref, limit = 5) {
  const sourceVerse = vectorStore.verses.get(ref);
  if (!sourceVerse) return [];

  const results = [];

  vectorStore.verses.forEach((verse, verseRef) => {
    if (verseRef === ref) return;

    const conceptOverlap = verse.concepts.filter(c =>
      sourceVerse.concepts.includes(c)
    ).length;

    const tfidfScore = cosineSimilarity(sourceVerse.tfidf, verse.tfidf);
    const score = 0.5 * (conceptOverlap / Math.max(sourceVerse.concepts.length, 1)) + 0.5 * tfidfScore;

    if (score > 0.15) {
      results.push({
        ref: verseRef,
        hebrew: verse.hebrew,
        english: verse.english,
        score,
        sharedConcepts: verse.concepts.filter(c => sourceVerse.concepts.includes(c))
      });
    }
  });

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

/**
 * AI-powered semantic search using Groq
 * Interprets natural language queries and finds matching concepts
 */
export async function aiSemanticSearch(query, context = {}) {
  const systemPrompt = `You are a Torah semantic search assistant. Given a user's natural language query, identify:
1. Key concepts they're looking for (use Hebrew terms when relevant)
2. Related biblical themes
3. Suggested search terms

Respond in JSON format:
{
  "concepts": ["concept1", "concept2"],
  "hebrewTerms": ["term1", "term2"],
  "themes": ["theme1", "theme2"],
  "suggestedQueries": ["query1", "query2"]
}`;

  try {
    const response = await callGroqAPI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: query }
    ], {
      temperature: 0.3,
      max_tokens: 500
    });

    // Parse JSON response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return { concepts: [], hebrewTerms: [], themes: [], suggestedQueries: [] };
  } catch (err) {
    console.warn('AI semantic search failed:', err);
    return { concepts: extractConcepts(query), hebrewTerms: [], themes: [], suggestedQueries: [] };
  }
}

/**
 * Hybrid search combining semantic + keyword
 */
export async function hybridSearch(query, options = {}) {
  const { limit = 10, useAI = false } = options;

  // Get AI interpretation if enabled
  let aiConcepts = null;
  if (useAI) {
    aiConcepts = await aiSemanticSearch(query);
  }

  // Expand query with AI concepts
  const expandedQuery = aiConcepts
    ? `${query} ${aiConcepts.hebrewTerms.join(' ')} ${aiConcepts.concepts.join(' ')}`
    : query;

  // Run semantic search
  const results = await semanticSearch(expandedQuery, limit);

  return {
    results,
    aiInterpretation: aiConcepts,
    query: expandedQuery
  };
}

/**
 * Get concept cloud for a set of verses
 */
export function getConceptCloud(refs) {
  const conceptCounts = {};

  refs.forEach(ref => {
    const verse = vectorStore.verses.get(ref);
    if (verse) {
      verse.concepts.forEach(concept => {
        conceptCounts[concept] = (conceptCounts[concept] || 0) + 1;
      });
    }
  });

  return Object.entries(conceptCounts)
    .map(([concept, count]) => ({ concept, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Get search statistics
 */
export function getSearchStats() {
  return {
    indexedVerses: vectorStore.verses.size,
    concepts: Object.keys(CONCEPT_MAPPINGS).length,
    terms: TERM_TO_CONCEPTS.size
  };
}

/**
 * Clear the vector store
 */
export function clearIndex() {
  vectorStore.verses.clear();
  vectorStore.embeddings.clear();
}

const semanticSearchService = {
  indexVerse,
  indexVerses,
  semanticSearch,
  findSimilarVerses,
  aiSemanticSearch,
  hybridSearch,
  getConceptCloud,
  getSearchStats,
  clearIndex,
  CONCEPT_MAPPINGS
};

export default semanticSearchService;
