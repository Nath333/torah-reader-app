/**
 * AI Tutor Service - Interactive Torah Study Partner
 * Multi-turn conversation, adaptive difficulty, teaching personas
 * @module aiTutorService
 */

import { callGroqAPI, getStoredApiKey, AIError, ERROR_TYPES } from './groqApi';
import { STUDY_MODES as BASE_STUDY_MODES, STUDY_MODE_KEYS } from '../constants/talmudStudy';

// =============================================================================
// Data Flow Utilities
// =============================================================================

/**
 * Unified API call with JSON parsing and error handling
 * @param {Object} config - Request configuration
 * @returns {Promise<Object>} Parsed response or fallback
 */
const callAIWithParsing = async ({
  systemPrompt,
  userPrompt,
  options = {},
  fallbackFn = (raw) => ({ raw, error: 'Parse failed' })
}) => {
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];

  const response = await callGroqAPI(messages, {
    temperature: 0.7,
    maxTokens: 1024,
    ...options
  });

  if (options.jsonResponse) {
    try {
      return JSON.parse(response);
    } catch {
      return fallbackFn(response);
    }
  }

  return response;
};

/**
 * Get config with fallback - memoized lookup
 */
const configCache = new Map();

const getConfig = (type, key, fallbackKey) => {
  const cacheKey = `${type}:${key}`;
  if (configCache.has(cacheKey)) return configCache.get(cacheKey);

  const configs = type === 'level' ? LEVEL_CONFIG :
                  type === 'persona' ? PERSONA_CONFIG :
                  STUDY_MODE_CONFIG;
  const fallback = type === 'level' ? LEVEL_CONFIG[fallbackKey] :
                   type === 'persona' ? PERSONA_CONFIG[fallbackKey] :
                   STUDY_MODE_CONFIG[fallbackKey];

  const result = configs[key] || fallback;
  configCache.set(cacheKey, result);
  return result;
};

/**
 * Compose multiple configs into unified context
 */
const composeStudyContext = (level, persona, studyMode) => ({
  level: getConfig('level', level, DIFFICULTY_LEVELS.INTERMEDIATE),
  persona: getConfig('persona', persona, TEACHING_PERSONAS.DEFAULT),
  studyMode: getConfig('studyMode', studyMode, STUDY_MODES.IYUN)
});

// =============================================================================
// Common Talmudic Terms (for teaching context)
// =============================================================================

export const TALMUDIC_TERMS = {
  // Debate terms
  kushya: { hebrew: 'קושיא', meaning: 'difficulty/question' },
  teirutz: { hebrew: 'תירוץ', meaning: 'answer/resolution' },
  stirah: { hebrew: 'סתירה', meaning: 'contradiction' },
  rayah: { hebrew: 'ראיה', meaning: 'proof' },
  // Halachic terms
  lechatchila: { hebrew: 'לכתחילה', meaning: 'ideally/initially' },
  bediavad: { hebrew: 'בדיעבד', meaning: 'after the fact' },
  mutar: { hebrew: 'מותר', meaning: 'permitted' },
  assur: { hebrew: 'אסור', meaning: 'forbidden' },
  patur: { hebrew: 'פטור', meaning: 'exempt' },
  chayav: { hebrew: 'חייב', meaning: 'obligated' },
  // Analysis terms
  svara: { hebrew: 'סברא', meaning: 'logical reasoning' },
  kal_vachomer: { hebrew: 'קל וחומר', meaning: 'a fortiori argument' },
  gezera_shava: { hebrew: 'גזירה שווה', meaning: 'verbal analogy' },
  machloket: { hebrew: 'מחלוקת', meaning: 'dispute' },
  // Source terms
  gemara: { hebrew: 'גמרא', meaning: 'Talmud discussion' },
  mishnah: { hebrew: 'משנה', meaning: 'oral law compilation' },
  braita: { hebrew: 'ברייתא', meaning: 'external teaching' },
  tosefta: { hebrew: 'תוספתא', meaning: 'supplement to Mishnah' }
};

// =============================================================================
// Difficulty Levels
// =============================================================================
export const DIFFICULTY_LEVELS = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
  SCHOLAR: 'scholar'
};

export const LEVEL_CONFIG = {
  [DIFFICULTY_LEVELS.BEGINNER]: {
    name: 'Beginner', nameHebrew: 'מתחיל', icon: '🌱',
    description: 'Simple explanations with lots of context',
    prompt: 'AUDIENCE: Complete beginner. Use simple language, explain ALL Hebrew terms, provide context, use daily life analogies, be encouraging.'
  },
  [DIFFICULTY_LEVELS.INTERMEDIATE]: {
    name: 'Intermediate', nameHebrew: 'בינוני', icon: '📖',
    description: 'Some Hebrew terminology, basic concepts explained',
    prompt: 'AUDIENCE: Basic Torah knowledge. Use Hebrew terms with translations, explain key concepts, reference known stories, balance depth and accessibility.'
  },
  [DIFFICULTY_LEVELS.ADVANCED]: {
    name: 'Advanced', nameHebrew: 'מתקדם', icon: '📚',
    description: 'Full terminology, cross-references, assumes background',
    prompt: 'AUDIENCE: Yeshiva/seminary background. Use Hebrew/Aramaic freely, reference multiple commentators, include cross-references, discuss machloket, cite sources precisely.'
  },
  [DIFFICULTY_LEVELS.SCHOLAR]: {
    name: 'Scholar', nameHebrew: 'תלמיד חכם', icon: '🎓',
    description: 'Deep analysis, sources, scholarly debate',
    prompt: 'AUDIENCE: Talmid Chacham. Assume comprehensive knowledge, engage in pilpul, compare Rishonim/Acharonim, discuss textual difficulties, reference obscure sources.'
  }
};

// =============================================================================
// Teaching Personas
// =============================================================================
export const TEACHING_PERSONAS = {
  // Sephardi Gedolim
  BEN_ISH_CHAI: 'ben_ish_chai',
  RAV_OVADIA: 'rav_ovadia',
  OHR_HACHAIM: 'ohr_hachaim',
  CHIDA: 'chida',
  // Ashkenazi Gedolim
  VILNA_GAON: 'vilna_gaon',
  CHOFETZ_CHAIM: 'chofetz_chaim',
  RAV_MOSHE: 'rav_moshe',
  MAHARAL: 'maharal',
  // Chassidic
  BAAL_SHEM_TOV: 'baal_shem_tov',
  REBBE: 'rebbe',
  // General
  RAMBAM: 'rambam',
  RASHI: 'rashi',
  CHILDREN: 'children',
  DEFAULT: 'default'
};

export const PERSONA_CONFIG = {
  // === Sephardi Gedolim ===
  [TEACHING_PERSONAS.BEN_ISH_CHAI]: {
    name: 'Ben Ish Chai', nameHebrew: 'בן איש חי', icon: '🕯️',
    tradition: 'sephardi',
    description: 'Practical Sephardi halacha with kabbalah',
    prompt: 'Teach like Ben Ish Chai: practical halacha with kabbalah, minhagei Sefarad, Zohar/Arizal references, follow Mechaber, Kaf HaChaim.'
  },
  [TEACHING_PERSONAS.RAV_OVADIA]: {
    name: 'Rav Ovadia Yosef', nameHebrew: 'רב עובדיה יוסף', icon: '⚖️',
    tradition: 'sephardi',
    description: 'Comprehensive halachic analysis',
    prompt: 'Teach like Rav Ovadia: comprehensive halachic analysis, cite many sources, clear practical psak, restore Sephardi tradition, reference Yalkut Yosef.'
  },
  [TEACHING_PERSONAS.OHR_HACHAIM]: {
    name: 'Ohr HaChaim', nameHebrew: 'אור החיים', icon: '✨',
    tradition: 'sephardi',
    description: 'Mystical-Sephardi Torah commentary',
    prompt: 'Teach like Ohr HaChaim: multiple interpretations, accessible kabbalistic insights, textual nuances, integration of pshat and sod.'
  },
  [TEACHING_PERSONAS.CHIDA]: {
    name: 'Chida', nameHebrew: 'חיד"א', icon: '📜',
    tradition: 'sephardi',
    description: 'Classic Sephardi scholarship',
    prompt: 'Teach like Chida: encyclopedic knowledge, obscure sources, precise citations, integration of halacha/kabbalah/mussar.'
  },
  // === Ashkenazi Gedolim ===
  [TEACHING_PERSONAS.VILNA_GAON]: {
    name: 'Vilna Gaon', nameHebrew: 'הגר"א', icon: '📐',
    tradition: 'ashkenazi',
    description: 'Analytical Lithuanian approach',
    prompt: 'Teach like the Vilna Gaon: precise textual analysis, focus on peshat, reveal hidden connections in Torah, reference Tanach and Gemara extensively, analytical depth.'
  },
  [TEACHING_PERSONAS.CHOFETZ_CHAIM]: {
    name: 'Chofetz Chaim', nameHebrew: 'חפץ חיים', icon: '🤝',
    tradition: 'ashkenazi',
    description: 'Mussar and ethical focus',
    prompt: 'Teach like Chofetz Chaim: focus on middot and ethical behavior, practical mussar, lashon hara awareness, gentle encouragement, practical halacha from Mishnah Berurah.'
  },
  [TEACHING_PERSONAS.RAV_MOSHE]: {
    name: 'Rav Moshe Feinstein', nameHebrew: 'רב משה פיינשטיין', icon: '📋',
    tradition: 'ashkenazi',
    description: 'Modern halachic authority',
    prompt: 'Teach like Rav Moshe Feinstein: clear halachic analysis, practical modern applications, balance of strictness and leniency, cite Igrot Moshe style reasoning.'
  },
  [TEACHING_PERSONAS.MAHARAL]: {
    name: 'Maharal', nameHebrew: 'מהר"ל', icon: '🔮',
    tradition: 'ashkenazi',
    description: 'Deep philosophical approach',
    prompt: 'Teach like Maharal of Prague: deep philosophical insights, explain aggadot, symbolic meanings, Jewish thought and hashkafa, integration of philosophy and Torah.'
  },
  // === Chassidic ===
  [TEACHING_PERSONAS.BAAL_SHEM_TOV]: {
    name: 'Baal Shem Tov', nameHebrew: 'בעל שם טוב', icon: '💫',
    tradition: 'chassidic',
    description: 'Chassidic joy and connection',
    prompt: 'Teach like the Baal Shem Tov: joy in serving Hashem, find the good in every Jew, stories and parables, simple but profound, focus on devekut and avodas Hashem.'
  },
  [TEACHING_PERSONAS.REBBE]: {
    name: 'Lubavitcher Rebbe', nameHebrew: 'הרבי מליובאוויטש', icon: '🌍',
    tradition: 'chassidic',
    description: 'Chabad philosophy and outreach',
    prompt: 'Teach like the Lubavitcher Rebbe: deep chassidut with practical application, every Jew is precious, mivtzoyim and outreach, Tanya concepts, Rambam integration.'
  },
  // === Classical Rishonim ===
  [TEACHING_PERSONAS.RAMBAM]: {
    name: 'Rambam', nameHebrew: 'רמב"ם', icon: '🏛️',
    tradition: 'classical',
    description: 'Philosophical and systematic',
    prompt: 'Teach like Rambam: systematic/logical, philosophical depth, ikkarei emunah, clear halachic rulings, integration of reason and revelation.'
  },
  [TEACHING_PERSONAS.RASHI]: {
    name: 'Rashi', nameHebrew: 'רש"י', icon: '📝',
    tradition: 'classical',
    description: 'Clear and concise explanation',
    prompt: 'Teach like Rashi: concise explanations, address textual difficulties, use midrash when needed, simple Hebrew/Aramaic translations, focus on peshat.'
  },
  // === General ===
  [TEACHING_PERSONAS.CHILDREN]: {
    name: "Children's Teacher", nameHebrew: 'מורה לילדים', icon: '🧒',
    tradition: 'general',
    description: 'Very simple explanations',
    prompt: 'Teach for children (6-8 years): VERY simple language, stories, examples from family/school, encouraging, focus on middot.'
  },
  [TEACHING_PERSONAS.DEFAULT]: {
    name: 'Default', nameHebrew: 'ברירת מחדל', icon: '📖',
    tradition: 'general',
    description: 'Balanced perspective',
    prompt: 'Balanced Torah teacher: reference multiple approaches, warm and encouraging, respect all traditions.'
  }
};

// =============================================================================
// Conversation Manager - Immutable state updates for predictable data flow
// =============================================================================
class ConversationManager {
  constructor() {
    this.conversations = new Map();
    this.maxHistory = 20;
  }

  /**
   * Create a new conversation with initial state
   */
  create(textRef, level = DIFFICULTY_LEVELS.INTERMEDIATE, persona = TEACHING_PERSONAS.DEFAULT) {
    const id = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const now = new Date().toISOString();
    const conversation = Object.freeze({
      id,
      textRef,
      level,
      persona,
      messages: [],
      createdAt: now,
      lastActive: now
    });
    this.conversations.set(id, conversation);
    return id;
  }

  /**
   * Get conversation (returns frozen copy)
   */
  get(id) {
    return this.conversations.get(id) || null;
  }

  /**
   * Immutable update - returns new conversation state
   */
  #update(id, updater) {
    const conv = this.conversations.get(id);
    if (!conv) return null;

    const updated = Object.freeze({
      ...conv,
      ...updater(conv),
      lastActive: new Date().toISOString()
    });
    this.conversations.set(id, updated);
    return updated;
  }

  /**
   * Add message with automatic history trimming
   */
  addMessage(id, role, content) {
    return this.#update(id, (conv) => {
      const newMessage = Object.freeze({
        role,
        content,
        timestamp: new Date().toISOString()
      });
      const messages = [...conv.messages, newMessage];
      // Trim if exceeds max
      return {
        messages: messages.length > this.maxHistory * 2
          ? messages.slice(-this.maxHistory * 2)
          : messages
      };
    });
  }

  /**
   * Get messages as array (safe copy)
   */
  getMessages(id) {
    return this.get(id)?.messages || [];
  }

  /**
   * Update level
   */
  updateLevel(id, level) {
    return this.#update(id, () => ({ level }));
  }

  /**
   * Update persona
   */
  updatePersona(id, persona) {
    return this.#update(id, () => ({ persona }));
  }

  /**
   * Clear conversation
   */
  clear(id) {
    this.conversations.delete(id);
  }

  /**
   * Export conversation data
   */
  export(id) {
    const conv = this.get(id);
    return conv ? { ...conv, exportedAt: new Date().toISOString() } : null;
  }

  /**
   * Get conversation stats for debugging
   */
  getStats() {
    return {
      activeConversations: this.conversations.size,
      totalMessages: [...this.conversations.values()].reduce(
        (sum, c) => sum + c.messages.length, 0
      )
    };
  }
}

const conversationManager = new ConversationManager();

// =============================================================================
// Study Modes - Import from single source of truth (DRY)
// Re-export for backwards compatibility
// =============================================================================
export const STUDY_MODES = STUDY_MODE_KEYS;

// AI Tutor specific prompts (extend base config with detailed AI prompts)
export const STUDY_MODE_CONFIG = {
  [STUDY_MODE_KEYS.BEKIUS]: {
    ...BASE_STUDY_MODES.bekius,
    name: 'Bekius',
    prompt: `STUDY MODE: BEKIUS (בקיאות) - Breadth Learning
- Give clear, concise explanations
- Cover the main points efficiently
- Build vocabulary and familiarity
- Connect to related passages
- Keep moving forward, don't get stuck on details`
  },
  [STUDY_MODE_KEYS.IYUN]: {
    ...BASE_STUDY_MODES.iyun,
    name: 'Iyun',
    prompt: `STUDY MODE: IYUN (עיון) - Depth Learning
- Analyze every word and nuance carefully
- Explore multiple interpretations
- Question assumptions and probe difficulties
- Compare different commentators' approaches
- Develop chiddushim (novel insights)
- Don't move on until thoroughly understood`
  },
  [STUDY_MODE_KEYS.CHAZARA]: {
    ...BASE_STUDY_MODES.chazara,
    name: 'Chazara',
    prompt: `STUDY MODE: CHAZARA (חזרה) - Review & Testing
- Test understanding with targeted questions
- Reinforce key concepts through repetition
- Identify gaps in knowledge
- Connect current material to previously learned
- Build long-term retention with spaced review
- Challenge with progressively harder questions`
  }
};

// =============================================================================
// System Prompt Generation - Uses composed config for clean data flow
// =============================================================================
const systemPromptCache = new Map();

const generateSystemPrompt = (level, persona, textContext = '', studyMode = STUDY_MODES.IYUN) => {
  // Cache key excludes textContext since it's dynamic
  const cacheKey = `${level}:${persona}:${studyMode}`;

  // Get composed config using unified lookup
  const config = composeStudyContext(level, persona, studyMode);

  // Build base prompt (cacheable part)
  let basePrompt = systemPromptCache.get(cacheKey);
  if (!basePrompt) {
    basePrompt = `You are an AI Torah study partner (chavruta) in a Kollel/Yeshiva setting.

${config.persona.prompt}

${config.level.prompt}

${config.studyMode.prompt}

SEPHARDI TRADITION: Default to Sephardi halacha (Mechaber). Reference Ben Ish Chai, Ohr HaChaim, Chida. Use Sephardi pronunciation (Shabbat not Shabbos).

RESPONSE FORMAT - Structure your response for effective learning:
1. **מקור (Source):** Cite the source/commentator being discussed
2. **פשט (Simple Meaning):** Start with the basic understanding
3. **הסבר (Explanation):** Develop the idea clearly
4. **מילים חשובות (Key Terms):** Highlight Hebrew terms with translations
5. **קושיא (Difficulty/Question):** Note any questions this raises
6. **תירוץ (Resolution):** How commentators resolve difficulties
7. **למעשה (Practical):** Real-life application if relevant

TEACHING APPROACH:
- Be warm but rigorous like a good chavruta
- Ask "מה קשה?" (what's difficult?) to probe understanding
- Use "בוא נראה" (let's see) when exploring sources
- Encourage with "יפה מאוד" (very nice) for good questions
- After explaining, ask: "האם זה ברור?" (is this clear?)`;

    systemPromptCache.set(cacheKey, basePrompt);
  }

  // Append dynamic context
  return textContext
    ? `${basePrompt}\n\nCURRENT STUDY CONTEXT:\n${textContext}\n\nRemember: The goal is real Torah learning, not just information transfer.`
    : `${basePrompt}\n\nRemember: The goal is real Torah learning, not just information transfer.`;
};

// =============================================================================
// Public API - Clean data flow with unified utilities
// =============================================================================

export const startConversation = (textRef, level = DIFFICULTY_LEVELS.INTERMEDIATE, persona = TEACHING_PERSONAS.DEFAULT) =>
  conversationManager.create(textRef, level, persona);

export const getConversation = (id) => conversationManager.get(id);

/**
 * Ask a question in an existing conversation
 * Data flow: validate → add message → build context → API call → store response
 */
export const askQuestion = async (conversationId, question, textContext = '', studyMode = STUDY_MODES.IYUN) => {
  // 1. Validate conversation exists
  const conv = conversationManager.get(conversationId);
  if (!conv) throw new AIError('Conversation not found', ERROR_TYPES.INVALID_INPUT);

  // 2. Add user message (returns updated conversation)
  const updatedConv = conversationManager.addMessage(conversationId, 'user', question);

  // 3. Build message history for API
  const systemPrompt = generateSystemPrompt(conv.level, conv.persona, textContext, studyMode);
  const messages = [
    { role: 'system', content: systemPrompt },
    ...updatedConv.messages.map(({ role, content }) => ({ role, content }))
  ];

  // 4. Call API
  const response = await callGroqAPI(messages, { temperature: 0.7, maxTokens: 2048 });

  // 5. Store assistant response
  const finalConv = conversationManager.addMessage(conversationId, 'assistant', response);

  // 6. Return structured result
  return {
    response,
    conversationId,
    messageCount: finalConv.messages.length,
    level: finalConv.level,
    persona: finalConv.persona
  };
};

/**
 * Quick one-off question without conversation history
 */
export const quickAsk = async (question, textContext, level = DIFFICULTY_LEVELS.INTERMEDIATE, persona = TEACHING_PERSONAS.DEFAULT, studyMode = STUDY_MODES.IYUN) => {
  return callAIWithParsing({
    systemPrompt: generateSystemPrompt(level, persona, textContext, studyMode),
    userPrompt: question,
    options: { maxTokens: 2048 }
  });
};

/**
 * Generate Socratic questions for deep learning
 */
export const generateSocraticQuestions = async (textContent, textRef, level = DIFFICULTY_LEVELS.INTERMEDIATE) => {
  const levelConfig = getConfig('level', level, DIFFICULTY_LEVELS.INTERMEDIATE);

  return callAIWithParsing({
    systemPrompt: 'Master Torah teacher using Socratic method. Respond with valid JSON.',
    userPrompt: `Based on this Torah text, generate 3-5 Socratic questions.

TEXT: ${textContent}
REFERENCE: ${textRef}
LEVEL: ${levelConfig.name}

Questions should: observe → analyze → understand → apply.

JSON: {"questions":[{"question":"","purpose":"","followUp":""}],"keyInsight":""}`,
    options: { temperature: 0.8, jsonResponse: true },
    fallbackFn: (raw) => ({ questions: [], keyInsight: raw, error: 'Parse failed' })
  });
};

/**
 * Explain a concept in context
 */
export const explainConcept = async (concept, context, level = DIFFICULTY_LEVELS.INTERMEDIATE, persona = TEACHING_PERSONAS.DEFAULT) => {
  return quickAsk(
    `Explain: "${concept}"\n\nContext: ${context}\n\nProvide: 1) Simple definition 2) Why it matters 3) Example 4) Practical connection`,
    context,
    level,
    persona
  );
};

// State management exports
export const changeLevel = (id, level) => conversationManager.updateLevel(id, level);
export const changePersona = (id, persona) => conversationManager.updatePersona(id, persona);
export const getConversationHistory = (id) => conversationManager.getMessages(id);
export const exportConversation = (id) => conversationManager.export(id);
export const clearConversation = (id) => conversationManager.clear(id);

// =============================================================================
// Quiz Generation - Using unified data flow utilities
// =============================================================================

/**
 * Generate quiz questions for assessment
 */
export const generateQuizQuestions = async (textContent, textRef, numQuestions = 5, level = DIFFICULTY_LEVELS.INTERMEDIATE) => {
  const levelConfig = getConfig('level', level, DIFFICULTY_LEVELS.INTERMEDIATE);

  return callAIWithParsing({
    systemPrompt: 'Torah teacher creating quizzes. Respond with valid JSON only.',
    userPrompt: `Generate ${numQuestions} quiz questions about this Torah text.

TEXT: ${textContent}
REFERENCE: ${textRef}
DIFFICULTY: ${levelConfig.name}

Mix question types. 4 options each.

JSON: {"questions":[{"id":1,"type":"multiple_choice","question":"","options":[],"correctIndex":0,"explanation":"","difficulty":"medium"}],"topic":"","estimatedTime":""}`,
    options: { maxTokens: 1500, jsonResponse: true },
    fallbackFn: () => ({ questions: [], error: 'Failed to generate quiz' })
  });
};

/**
 * Grade a student's response with feedback
 */
export const gradeResponse = async (question, studentAnswer, textContext, level = DIFFICULTY_LEVELS.INTERMEDIATE) => {
  const levelConfig = getConfig('level', level, DIFFICULTY_LEVELS.INTERMEDIATE);

  return callAIWithParsing({
    systemPrompt: 'Supportive Torah teacher grading work. Be encouraging. Respond with valid JSON.',
    userPrompt: `Grade this Torah study response.

QUESTION: ${question}
ANSWER: ${studentAnswer}
CONTEXT: ${textContext}
LEVEL: ${levelConfig.name}

JSON: {"score":0,"feedback":"","strengths":[],"improvements":[],"modelAnswer":"","encouragement":""}`,
    options: { temperature: 0.6, jsonResponse: true },
    fallbackFn: (raw) => ({ score: 50, feedback: raw, error: 'Parse failed' })
  });
};

// =============================================================================
// Utility Exports
// =============================================================================
export { getStoredApiKey };

/**
 * Clear all caches (useful for testing or memory management)
 */
export const clearCaches = () => {
  configCache.clear();
  systemPromptCache.clear();
};

/**
 * Get service stats for debugging
 */
export const getServiceStats = () => ({
  ...conversationManager.getStats(),
  cachedConfigs: configCache.size,
  cachedPrompts: systemPromptCache.size
});

// =============================================================================
// Default Export
// =============================================================================
const aiTutorService = {
  // Conversation management
  startConversation,
  getConversation,
  askQuestion,
  quickAsk,
  changeLevel,
  changePersona,
  getConversationHistory,
  exportConversation,
  clearConversation,

  // Learning tools
  generateSocraticQuestions,
  explainConcept,
  generateQuizQuestions,
  gradeResponse,

  // Utilities
  clearCaches,
  getServiceStats,

  // Constants
  DIFFICULTY_LEVELS,
  LEVEL_CONFIG,
  TEACHING_PERSONAS,
  PERSONA_CONFIG,
  TALMUDIC_TERMS,
  STUDY_MODES,
  STUDY_MODE_CONFIG
};

export default aiTutorService;
