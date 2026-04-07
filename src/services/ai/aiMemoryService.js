/**
 * AI Memory Service - Multi-Turn Conversation Intelligence
 *
 * Features:
 * - Conversation history with context preservation
 * - Topic tracking across sessions
 * - Entity extraction (rabbis, sources, concepts)
 * - Smart context summarization for long conversations
 * - Cross-session learning and preferences
 */

const STORAGE_KEY = 'ai-memory-store';
const MAX_HISTORY_PER_SESSION = 50;
const MAX_SESSIONS = 20;

// Memory store structure
let memoryStore = {
  sessions: [],
  currentSession: null,
  userProfile: {
    preferredLanguage: 'en',
    learningLevel: 'intermediate',
    interests: [],
    studyHistory: [],
    vocabularyLevel: 'intermediate'
  },
  entityMemory: {
    mentionedRabbis: {},
    discussedTopics: {},
    referencedVerses: {},
    conceptsExplored: {}
  }
};

/**
 * Initialize memory from localStorage
 */
export function initializeMemory() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      memoryStore = JSON.parse(stored);
    }
  } catch (err) {
    console.warn('Failed to load AI memory:', err);
  }

  // Start new session if none exists or last one is old
  if (!memoryStore.currentSession || isSessionExpired(memoryStore.currentSession)) {
    startNewSession();
  }

  return memoryStore;
}

/**
 * Check if session is expired (older than 30 minutes of inactivity)
 */
function isSessionExpired(session) {
  if (!session || !session.lastActivity) return true;
  const thirtyMinutes = 30 * 60 * 1000;
  return Date.now() - session.lastActivity > thirtyMinutes;
}

/**
 * Save memory to localStorage
 */
function persistMemory() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryStore));
  } catch (err) {
    console.warn('Failed to persist AI memory:', err);
  }
}

/**
 * Start a new conversation session
 */
export function startNewSession(context = {}) {
  const session = {
    id: `session_${Date.now()}`,
    startTime: Date.now(),
    lastActivity: Date.now(),
    context: {
      currentBook: context.book || null,
      currentChapter: context.chapter || null,
      currentVerse: context.verse || null,
      studyMode: context.mode || 'general',
      ...context
    },
    messages: [],
    entities: {
      rabbis: new Set(),
      verses: new Set(),
      topics: new Set(),
      hebrewTerms: new Set()
    },
    summary: null
  };

  // Archive current session if exists
  if (memoryStore.currentSession && memoryStore.currentSession.messages.length > 0) {
    // Convert Sets to Arrays for JSON serialization
    const archived = {
      ...memoryStore.currentSession,
      entities: {
        rabbis: Array.from(memoryStore.currentSession.entities.rabbis || []),
        verses: Array.from(memoryStore.currentSession.entities.verses || []),
        topics: Array.from(memoryStore.currentSession.entities.topics || []),
        hebrewTerms: Array.from(memoryStore.currentSession.entities.hebrewTerms || [])
      }
    };
    memoryStore.sessions.unshift(archived);

    // Limit stored sessions
    if (memoryStore.sessions.length > MAX_SESSIONS) {
      memoryStore.sessions = memoryStore.sessions.slice(0, MAX_SESSIONS);
    }
  }

  memoryStore.currentSession = session;
  persistMemory();

  return session;
}

/**
 * Add a message to current session
 */
export function addMessage(role, content, metadata = {}) {
  if (!memoryStore.currentSession) {
    startNewSession();
  }

  const message = {
    id: `msg_${Date.now()}`,
    role, // 'user' | 'assistant' | 'system'
    content,
    timestamp: Date.now(),
    metadata: {
      verseRef: metadata.verseRef || null,
      analysisMode: metadata.analysisMode || null,
      ...metadata
    }
  };

  memoryStore.currentSession.messages.push(message);
  memoryStore.currentSession.lastActivity = Date.now();

  // Extract entities from message
  extractEntities(content, role);

  // Trim if too long
  if (memoryStore.currentSession.messages.length > MAX_HISTORY_PER_SESSION) {
    // Summarize older messages before removing
    summarizeOldMessages();
  }

  persistMemory();
  return message;
}

/**
 * Extract entities from message content
 */
function extractEntities(content, role) {
  const session = memoryStore.currentSession;
  if (!session?.entities) return;

  const entities = session.entities;

  // Extract rabbi names
  const rabbiPatterns = [
    /\b(Rashi|Rambam|Ramban|Ibn Ezra|Sforno|Rashbam|Tosafot|Maharsha|Vilna Gaon|Baal Shem Tov|Chofetz Chaim)\b/gi,
    /\b(ר['"]?ש['"]?י|רמב['"]?ם|רמב['"]?ן|אבן עזרא|ספורנו)\b/g
  ];

  rabbiPatterns.forEach(pattern => {
    const matches = content.match(pattern) || [];
    matches.forEach(match => {
      if (!entities.rabbis) entities.rabbis = new Set();
      entities.rabbis.add(match);
      // Update global entity memory
      memoryStore.entityMemory.mentionedRabbis[match] =
        (memoryStore.entityMemory.mentionedRabbis[match] || 0) + 1;
    });
  });

  // Extract verse references
  const versePattern = /\b(Genesis|Exodus|Leviticus|Numbers|Deuteronomy|בראשית|שמות|ויקרא|במדבר|דברים)\s+\d+[:\s]\d+/gi;
  const verseMatches = content.match(versePattern) || [];
  verseMatches.forEach(match => {
    if (!entities.verses) entities.verses = new Set();
    entities.verses.add(match);
    memoryStore.entityMemory.referencedVerses[match] =
      (memoryStore.entityMemory.referencedVerses[match] || 0) + 1;
  });

  // Extract Hebrew terms (words in Hebrew characters)
  const hebrewPattern = /[\u0590-\u05FF]{2,}/g;
  const hebrewMatches = content.match(hebrewPattern) || [];
  hebrewMatches.slice(0, 10).forEach(match => {
    if (!entities.hebrewTerms) entities.hebrewTerms = new Set();
    entities.hebrewTerms.add(match);
  });

  // Extract topics (simplified - would use NLP in production)
  const topicKeywords = [
    'covenant', 'blessing', 'commandment', 'prayer', 'sacrifice', 'redemption',
    'creation', 'exodus', 'prophecy', 'wisdom', 'justice', 'mercy', 'faith',
    'ברית', 'ברכה', 'מצוה', 'תפילה', 'קרבן', 'גאולה', 'בריאה', 'נבואה'
  ];

  topicKeywords.forEach(topic => {
    if (content.toLowerCase().includes(topic.toLowerCase())) {
      if (!entities.topics) entities.topics = new Set();
      entities.topics.add(topic);
      memoryStore.entityMemory.discussedTopics[topic] =
        (memoryStore.entityMemory.discussedTopics[topic] || 0) + 1;
    }
  });
}

/**
 * Summarize older messages to maintain context within limits
 */
function summarizeOldMessages() {
  const session = memoryStore.currentSession;
  if (!session || session.messages.length < 20) return;

  // Keep last 10 messages intact, summarize older ones
  const toSummarize = session.messages.slice(0, -10);
  const toKeep = session.messages.slice(-10);

  // Create summary
  const summary = {
    messageCount: toSummarize.length,
    timeRange: {
      start: toSummarize[0]?.timestamp,
      end: toSummarize[toSummarize.length - 1]?.timestamp
    },
    topics: Array.from(session.entities.topics || []),
    keyPoints: toSummarize
      .filter(m => m.role === 'assistant')
      .slice(-3)
      .map(m => m.content.substring(0, 200))
  };

  session.summary = session.summary
    ? { ...session.summary, ...summary, messageCount: (session.summary.messageCount || 0) + summary.messageCount }
    : summary;

  session.messages = toKeep;
}

/**
 * Get conversation context for AI prompts
 * Returns formatted context string for injection into prompts
 */
export function getConversationContext(options = {}) {
  const { maxMessages = 10, includeEntities = true, includeProfile = true } = options;

  if (!memoryStore.currentSession) {
    return '';
  }

  const session = memoryStore.currentSession;
  const parts = [];

  // Add session summary if exists
  if (session.summary) {
    parts.push(`[Previous discussion summary: ${session.summary.keyPoints?.join('; ') || 'Multiple exchanges about ' + session.summary.topics?.join(', ')}]`);
  }

  // Add recent messages
  const recentMessages = session.messages.slice(-maxMessages);
  if (recentMessages.length > 0) {
    parts.push('\n--- Recent Conversation ---');
    recentMessages.forEach(msg => {
      const role = msg.role === 'user' ? 'Student' : 'Teacher';
      const preview = msg.content.length > 500 ? msg.content.substring(0, 500) + '...' : msg.content;
      parts.push(`${role}: ${preview}`);
    });
    parts.push('--- End Recent Conversation ---\n');
  }

  // Add entity context
  if (includeEntities && session.entities) {
    const entities = [];
    if (session.entities.rabbis?.size > 0) {
      entities.push(`Commentators discussed: ${Array.from(session.entities.rabbis).join(', ')}`);
    }
    if (session.entities.topics?.size > 0) {
      entities.push(`Topics covered: ${Array.from(session.entities.topics).join(', ')}`);
    }
    if (session.entities.verses?.size > 0) {
      entities.push(`Verses referenced: ${Array.from(session.entities.verses).slice(0, 5).join(', ')}`);
    }
    if (entities.length > 0) {
      parts.push(`[Context: ${entities.join('. ')}]`);
    }
  }

  // Add user profile context
  if (includeProfile && memoryStore.userProfile) {
    const profile = memoryStore.userProfile;
    parts.push(`[Student level: ${profile.learningLevel}, interests: ${profile.interests.slice(0, 3).join(', ') || 'general Torah study'}]`);
  }

  return parts.join('\n');
}

/**
 * Get relevant context from past sessions
 */
export function getRelevantPastContext(query, limit = 3) {
  const relevantSessions = [];

  // Simple keyword matching (would use embeddings in production)
  const queryTerms = query.toLowerCase().split(/\s+/);

  memoryStore.sessions.forEach(session => {
    let relevance = 0;

    // Check topic overlap
    const sessionTopics = session.entities?.topics || [];
    queryTerms.forEach(term => {
      if (sessionTopics.some(t => t.toLowerCase().includes(term))) {
        relevance += 2;
      }
    });

    // Check verse references
    const sessionVerses = session.entities?.verses || [];
    queryTerms.forEach(term => {
      if (sessionVerses.some(v => v.toLowerCase().includes(term))) {
        relevance += 3;
      }
    });

    if (relevance > 0) {
      relevantSessions.push({ session, relevance });
    }
  });

  return relevantSessions
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, limit)
    .map(({ session }) => ({
      id: session.id,
      date: new Date(session.startTime).toLocaleDateString(),
      topics: session.entities?.topics || [],
      summary: session.summary?.keyPoints?.[0] || 'Previous study session'
    }));
}

/**
 * Update user profile based on interactions
 */
export function updateUserProfile(updates) {
  memoryStore.userProfile = {
    ...memoryStore.userProfile,
    ...updates
  };
  persistMemory();
}

/**
 * Track study progress
 */
export function trackStudy(verseRef, mode, duration) {
  memoryStore.userProfile.studyHistory.push({
    verseRef,
    mode,
    duration,
    timestamp: Date.now()
  });

  // Keep last 100 entries
  if (memoryStore.userProfile.studyHistory.length > 100) {
    memoryStore.userProfile.studyHistory = memoryStore.userProfile.studyHistory.slice(-100);
  }

  // Update interests based on topics
  const topics = memoryStore.currentSession?.entities?.topics;
  if (topics?.size > 0) {
    const newInterests = Array.from(topics);
    newInterests.forEach(topic => {
      if (!memoryStore.userProfile.interests.includes(topic)) {
        memoryStore.userProfile.interests.push(topic);
      }
    });
    // Keep top 20 interests
    memoryStore.userProfile.interests = memoryStore.userProfile.interests.slice(0, 20);
  }

  persistMemory();
}

/**
 * Get user's most discussed topics
 */
export function getTopTopics(limit = 10) {
  return Object.entries(memoryStore.entityMemory.discussedTopics)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([topic, count]) => ({ topic, count }));
}

/**
 * Get frequently referenced sources
 */
export function getFrequentSources(limit = 10) {
  return Object.entries(memoryStore.entityMemory.mentionedRabbis)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([rabbi, count]) => ({ rabbi, count }));
}

/**
 * Clear all memory
 */
export function clearMemory() {
  memoryStore = {
    sessions: [],
    currentSession: null,
    userProfile: {
      preferredLanguage: 'en',
      learningLevel: 'intermediate',
      interests: [],
      studyHistory: [],
      vocabularyLevel: 'intermediate'
    },
    entityMemory: {
      mentionedRabbis: {},
      discussedTopics: {},
      referencedVerses: {},
      conceptsExplored: {}
    }
  };
  localStorage.removeItem(STORAGE_KEY);
  startNewSession();
}

/**
 * Get memory statistics
 */
export function getMemoryStats() {
  return {
    totalSessions: memoryStore.sessions.length,
    currentSessionMessages: memoryStore.currentSession?.messages?.length || 0,
    topicsDiscussed: Object.keys(memoryStore.entityMemory.discussedTopics).length,
    sourcesReferenced: Object.keys(memoryStore.entityMemory.mentionedRabbis).length,
    versesStudied: Object.keys(memoryStore.entityMemory.referencedVerses).length,
    userInterests: memoryStore.userProfile.interests.length,
    studySessionsTracked: memoryStore.userProfile.studyHistory.length
  };
}

// Initialize on module load
initializeMemory();

const aiMemoryService = {
  initializeMemory,
  startNewSession,
  addMessage,
  getConversationContext,
  getRelevantPastContext,
  updateUserProfile,
  trackStudy,
  getTopTopics,
  getFrequentSources,
  clearMemory,
  getMemoryStats
};

export default aiMemoryService;
