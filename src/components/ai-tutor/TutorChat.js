/**
 * TutorChat - Interactive AI Torah Study Partner
 *
 * Features:
 * - Multi-turn conversation interface
 * - Level selector (Beginner → Scholar)
 * - Persona selector (Ben Ish Chai, Rav Ovadia, etc.)
 * - Socratic questioning mode
 * - Message history with export
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  startConversation,
  askQuestion,
  quickAsk,
  changeLevel,
  changePersona,
  generateSocraticQuestions,
  DIFFICULTY_LEVELS,
  LEVEL_CONFIG,
  TEACHING_PERSONAS,
  PERSONA_CONFIG,
  STUDY_MODES,
  STUDY_MODE_CONFIG
} from '../../services/ai/aiTutorService';
// 2026 Smart Features - AI Memory for conversation tracking
import {
  initializeMemory,
  addMessage as addToMemory,
  getConversationContext,
  startNewSession,
  trackStudy,
  getTopTopics,
  getMemoryStats
} from '../../services/ai/aiMemoryService';
import LevelSelector from './LevelSelector';
import PersonaSelector from './PersonaSelector';
import './TutorChat.css';
import { markdownToSafeHtml, safeStorage, containsXssPayload } from '../../utils/safeHtml';

// Helper to detect if text contains Hebrew characters
const containsHebrew = (text) => /[\u0590-\u05FF]/.test(text);

// Memoized markdown formatting — caches rendered lines to avoid re-parsing on every render
const _formatCache = new Map();
const MAX_FORMAT_CACHE = 200;

const formatMessage = (text) => {
  if (!text) return null;

  if (_formatCache.has(text)) return _formatCache.get(text);

  if (containsXssPayload(text)) {
    console.warn('[TutorChat] Potential XSS detected in message, sanitizing...');
  }

  const result = text.split('\n').map((line, lineIdx) => {
    const isHebrewLine = containsHebrew(line) && line.match(/[\u0590-\u05FF]/g)?.length > line.length * 0.3;
    const safeHtml = markdownToSafeHtml(line);

    return (
      <p
        key={lineIdx}
        className={isHebrewLine ? 'hebrew-line' : ''}
        dir={isHebrewLine ? 'rtl' : 'ltr'}
        dangerouslySetInnerHTML={{ __html: safeHtml || '&nbsp;' }}
      />
    );
  });

  if (_formatCache.size >= MAX_FORMAT_CACHE) _formatCache.clear();
  _formatCache.set(text, result);
  return result;
};

const TutorChat = ({
  textContent,
  textRef,
  hebrewText,
  initialLevel = DIFFICULTY_LEVELS.INTERMEDIATE,
  initialPersona = TEACHING_PERSONAS.DEFAULT,
  onClose
}) => {
  // State
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [level, setLevel] = useState(initialLevel);
  const [persona, setPersona] = useState(initialPersona);
  const [studyMode, setStudyMode] = useState(STUDY_MODES.IYUN); // Default to deep learning
  const [showSettings, setShowSettings] = useState(false);
  const [socraticMode, setSocraticMode] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [socraticQuestions, setSocraticQuestions] = useState(null);
  const [savedChiddushim, setSavedChiddushim] = useState([]); // Store insights
  const [showUnderstandingCheck, setShowUnderstandingCheck] = useState(false);
  const [lastResponseForCheck, setLastResponseForCheck] = useState(null);

  // Refs
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize conversation and AI Memory
  useEffect(() => {
    const id = startConversation(textRef, level, persona);
    setConversationId(id);

    // Initialize AI Memory service
    initializeMemory();

    // Start a new session in AI Memory with context
    startNewSession({
      book: textRef?.split(' ')[0],
      verse: textRef,
      mode: 'tutor'
    });

    // Get past conversation context for continuity
    const topTopics = getTopTopics(3);
    const memoryStats = getMemoryStats();

    // Add initial system message with memory context
    const levelConfig = LEVEL_CONFIG[level];
    const personaConfig = PERSONA_CONFIG[persona];

    // Parse reference for better welcome message
    const refParts = textRef?.split(/[\s.:]+/) || [];
    const bookName = refParts[0] || 'this text';
    const chapter = refParts[1] || '';
    const verse = refParts[2] || '';
    const verseDisplay = chapter && verse ? `${chapter}:${verse}` : '';

    // Get study mode config
    const studyModeConfig = STUDY_MODE_CONFIG[studyMode];

    // Build scholarly welcome message
    let welcomeMessage = `ברוך הבא לחברותא! Welcome to your study session.`;
    welcomeMessage += `\n\n📖 **לומדים (Studying):** ${bookName}${verseDisplay ? ` ${verseDisplay}` : ''}`;
    welcomeMessage += `\n🎓 **רמה (Level):** ${levelConfig.name} (${levelConfig.nameHebrew}) ${levelConfig.icon}`;
    welcomeMessage += `\n👤 **סגנון (Style):** ${personaConfig.name} (${personaConfig.nameHebrew}) ${personaConfig.icon}`;
    welcomeMessage += `\n📚 **אופן לימוד (Mode):** ${studyModeConfig.name} (${studyModeConfig.nameHebrew}) ${studyModeConfig.icon}`;

    welcomeMessage += `\n\n💡 **Quick start:** Use the buttons below to explore through פרד״ס (PaRDeS) - from פשט (simple meaning) to סוד (deeper secrets).`;
    welcomeMessage += `\n\n_Switch between **בקיאות** (breadth) and **עיון** (depth) study modes using the toggle above._`;

    // Add personalized context if available
    if (memoryStats.totalSessions > 0) {
      welcomeMessage += `\n\n📚 I remember our previous ${memoryStats.totalSessions} study session${memoryStats.totalSessions > 1 ? 's' : ''}!`;
      if (topTopics.length > 0) {
        welcomeMessage += ` Topics explored: ${topTopics.map(t => t.topic).join(', ')}.`;
      }
    }

    welcomeMessage += `\n\n_Type a question or select a quick action to begin..._`;

    setMessages([{
      role: 'system',
      content: welcomeMessage,
      timestamp: new Date().toISOString()
    }]);
  }, [textRef, level, persona, studyMode]);

  // Handle sending a message
  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setError(null);

    // Add user message to UI immediately
    setMessages(prev => [...prev, {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    }]);

    // Track in AI Memory - 2026 Smart Feature
    addToMemory('user', userMessage, {
      verseRef: textRef,
      analysisMode: 'tutor',
      level,
      persona
    });

    setIsLoading(true);

    try {
      // Get conversation context from AI Memory for enhanced responses
      const memoryContext = getConversationContext({ maxMessages: 5, includeEntities: true });

      const textContext = `TEXT BEING STUDIED:\nReference: ${textRef}\nHebrew: ${hebrewText || ''}\nTranslation: ${textContent}\n\n${memoryContext ? `CONVERSATION CONTEXT:\n${memoryContext}` : ''}`;

      let response;
      if (conversationId) {
        const result = await askQuestion(conversationId, userMessage, textContext, studyMode);
        response = result.response;
      } else {
        response = await quickAsk(userMessage, textContext, level, persona, studyMode);
      }

      // Add assistant response
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString()
      }]);

      // Track assistant response in AI Memory
      addToMemory('assistant', response, {
        verseRef: textRef,
        analysisMode: 'tutor'
      });

      // Track study activity for recommendations
      trackStudy(textRef, 'tutor', 0);

      // Show understanding check prompt for Iyun mode
      if (studyMode === STUDY_MODES.IYUN && response.length > 200) {
        setLastResponseForCheck(response);
        setShowUnderstandingCheck(true);
      }

    } catch (err) {
      setError(err.message);
      setMessages(prev => [...prev, {
        role: 'error',
        content: `Error: ${err.message}`,
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [inputValue, isLoading, conversationId, textRef, hebrewText, textContent, level, persona, studyMode]);

  // Handle key press
  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // Handle level change
  const handleLevelChange = useCallback((newLevel) => {
    setLevel(newLevel);
    if (conversationId) {
      changeLevel(conversationId, newLevel);
    }
    const levelConfig = LEVEL_CONFIG[newLevel];
    setMessages(prev => [...prev, {
      role: 'system',
      content: `Switched to ${levelConfig.name} level ${levelConfig.icon}. I'll adjust my explanations accordingly.`,
      timestamp: new Date().toISOString()
    }]);
  }, [conversationId]);

  // Handle persona change
  const handlePersonaChange = useCallback((newPersona) => {
    setPersona(newPersona);
    if (conversationId) {
      changePersona(conversationId, newPersona);
    }
    const personaConfig = PERSONA_CONFIG[newPersona];
    setMessages(prev => [...prev, {
      role: 'system',
      content: `Now teaching in the style of ${personaConfig.name} ${personaConfig.icon}. ${personaConfig.description}`,
      timestamp: new Date().toISOString()
    }]);
  }, [conversationId]);

  // Generate Socratic questions
  const handleSocraticMode = useCallback(async () => {
    setIsLoading(true);
    setSocraticMode(true);

    try {
      const questions = await generateSocraticQuestions(textContent, textRef, level);
      setSocraticQuestions(questions);

      if (questions.questions?.length > 0) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Let me guide your learning with some questions:\n\n**Question 1:** ${questions.questions[0].question}\n\n_(Take your time to think, then share your thoughts)_`,
          timestamp: new Date().toISOString(),
          socraticIndex: 0
        }]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [textContent, textRef, level]);

  // Quick action buttons - PaRDeS-based scholarly prompts
  // פרד"ס = Pshat (פשט), Remez (רמז), Drash (דרש), Sod (סוד)
  const quickActions = [
    // PaRDeS Levels
    { label: 'פשט', sublabel: 'Pshat', icon: '📜', prompt: 'What is the pshat (פשט - simple, plain meaning) of this text? Explain the straightforward reading clearly.', category: 'pardes' },
    { label: 'רמז', sublabel: 'Remez', icon: '🔍', prompt: 'What is the remez (רמז - hint/allusion) in this text? What deeper hints, gematria, or wordplay is concealed here?', category: 'pardes' },
    { label: 'דרש', sublabel: 'Drash', icon: '📚', prompt: 'What is the drash (דרש - homiletical interpretation) of this text? What lessons do the Midrash and commentators derive?', category: 'pardes' },
    { label: 'סוד', sublabel: 'Sod', icon: '✨', prompt: 'What is the sod (סוד - mystical/secret meaning) of this text according to Kabbalah and Chassidut?', category: 'pardes' },
    // Study Tools
    { label: 'מילים', sublabel: 'Words', icon: '🔤', prompt: 'What are the key Hebrew terms (מילים) I should understand? Give me the shoresh (root), grammar, and deeper meaning.', category: 'tools' },
    { label: 'מחלוקת', sublabel: 'Machloket', icon: '⚖️', prompt: 'Are there disputes (מחלוקת) among the commentators on this text? Explain the different views and their reasoning.', category: 'tools' },
    { label: 'מוסר', sublabel: 'Mussar', icon: '💎', prompt: 'What ethical lesson (מוסר) can we derive from this text? How does it apply to daily life and character development?', category: 'tools' },
    { label: 'קשרים', sublabel: 'Links', icon: '🔗', prompt: 'What are the textual connections (קשרים) to other places in Tanach, Talmud, and Midrash?', category: 'tools' },
    // Advanced Learning
    { label: 'קושיא', sublabel: 'Challenge', icon: '❓', prompt: 'Act as my chavruta. Pose a KUSHYA (קושיא - difficulty/challenge) on this text that I need to work through. Present a genuine textual difficulty, contradiction, or conceptual challenge. Wait for my attempt to answer before giving your teirutz (resolution).', category: 'advanced' },
    { label: 'הלכה', sublabel: 'Halacha', icon: '⚖️', prompt: 'What is the הלכה למעשה (practical halacha) that emerges from this text? How do we rule in practice according to Sephardi authorities?', category: 'advanced' },
    { label: 'עמקות', sublabel: 'Depth', icon: '🏊', prompt: 'Go deeper (בעומק). What is a subtle insight or chiddush that most people miss in this text? Share something that requires careful thought.', category: 'advanced' },
    { label: 'חזרה', sublabel: 'Review', icon: '🔄', prompt: 'Help me review (חזרה) what we learned. Summarize the key points in a memorable way and suggest how I can retain this learning.', category: 'advanced' }
  ];

  // Direct send for quick actions - bypasses input state
  const handleQuickAction = useCallback(async (prompt) => {
    if (isLoading) return;

    // Add user message to UI immediately
    setMessages(prev => [...prev, {
      role: 'user',
      content: prompt,
      timestamp: new Date().toISOString()
    }]);

    // Track in AI Memory
    addToMemory('user', prompt, {
      verseRef: textRef,
      analysisMode: 'tutor',
      level,
      persona
    });

    setIsLoading(true);
    setError(null);

    try {
      const memoryContext = getConversationContext({ maxMessages: 5, includeEntities: true });
      const textContext = `TEXT BEING STUDIED:\nReference: ${textRef}\nHebrew: ${hebrewText || ''}\nTranslation: ${textContent}\n\n${memoryContext ? `CONVERSATION CONTEXT:\n${memoryContext}` : ''}`;

      let response;
      if (conversationId) {
        const result = await askQuestion(conversationId, prompt, textContext, studyMode);
        response = result.response;
      } else {
        response = await quickAsk(prompt, textContext, level, persona, studyMode);
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString()
      }]);

      addToMemory('assistant', response, { verseRef: textRef, analysisMode: 'tutor' });
      trackStudy(textRef, 'tutor', 0);
    } catch (err) {
      setError(err.message);
      setMessages(prev => [...prev, {
        role: 'error',
        content: `Error: ${err.message}`,
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, conversationId, textRef, hebrewText, textContent, level, persona, studyMode]);

  // Generate session summary with key takeaways
  const handleSessionSummary = useCallback(async () => {
    if (isLoading || messages.length < 3) return;

    setIsLoading(true);

    try {
      // Collect all the learning from this session
      const sessionMessages = messages
        .filter(m => m.role === 'assistant' || m.role === 'user')
        .map(m => `${m.role.toUpperCase()}: ${m.content}`)
        .join('\n\n');

      const summaryPrompt = `Generate a brief SESSION SUMMARY (סיכום שיעור) of our Torah study session. Include:

1. **נושאים (Topics):** What we covered
2. **נקודות מפתח (Key Points):** 2-3 main insights
3. **מושגים חדשים (New Terms):** Hebrew terms learned with meanings
4. **שאלות להמשך (Follow-up Questions):** 1-2 questions for future study
5. **הערת חיזוק (Encouragement):** Brief words of encouragement

Keep it concise and practical. Use both Hebrew and English.`;

      const textContext = `SESSION CONTENT:\n${sessionMessages}\n\nVERSE: ${textRef}\nLEVEL: ${LEVEL_CONFIG[level].name}\nMODE: ${STUDY_MODE_CONFIG[studyMode].name}`;

      const response = await quickAsk(summaryPrompt, textContext, level, persona, studyMode);

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `📋 **סיכום שיעור | Session Summary**\n\n${response}`,
        timestamp: new Date().toISOString(),
        isSummary: true
      }]);

      // Track in memory
      addToMemory('assistant', response, {
        verseRef: textRef,
        analysisMode: 'tutor-summary'
      });

    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, messages, textRef, level, persona, studyMode]);

  // Handle understanding check - ask a comprehension question
  const handleUnderstandingCheck = useCallback(async () => {
    if (!lastResponseForCheck || isLoading) return;

    setShowUnderstandingCheck(false);
    setIsLoading(true);

    try {
      const checkPrompt = `Based on what you just taught me, ask me ONE comprehension question (שאלת הבנה) to check if I understood. The question should test understanding of the key concept, not just recall. Format: Start with "לבדיקת הבנה:" then ask the question.`;

      const memoryContext = getConversationContext({ maxMessages: 3 });
      const textContext = `PREVIOUS RESPONSE TO CHECK:\n${lastResponseForCheck}\n\n${memoryContext ? `CONTEXT:\n${memoryContext}` : ''}`;

      const response = await quickAsk(checkPrompt, textContext, level, persona, studyMode);

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
        isComprehensionCheck: true
      }]);

    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
      setLastResponseForCheck(null);
    }
  }, [lastResponseForCheck, isLoading, level, persona, studyMode]);

  // Handle study mode change with notification
  const handleStudyModeChange = useCallback((newMode) => {
    setStudyMode(newMode);
    const modeConfig = STUDY_MODE_CONFIG[newMode];
    setMessages(prev => [...prev, {
      role: 'system',
      content: `🔄 **Switched to ${modeConfig.name} (${modeConfig.nameHebrew})** ${modeConfig.icon}\n\n${modeConfig.description}`,
      timestamp: new Date().toISOString()
    }]);
  }, []);

  // Save a chiddush (insight) from a message
  const handleSaveChiddush = useCallback((messageContent, messageIndex) => {
    // Sanitize content before storing
    const sanitizedContent = typeof messageContent === 'string' 
      ? messageContent.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      : String(messageContent);
      
    const chiddush = {
      id: Date.now(),
      content: sanitizedContent,
      textRef,
      timestamp: new Date().toISOString(),
      studyMode,
      level,
      persona
    };
    setSavedChiddushim(prev => [...prev, chiddush]);

    // Store in localStorage for persistence using safe storage
    const stored = safeStorage.getItem('torah-chiddushim', []);
    stored.push(chiddush);
    safeStorage.setItem('torah-chiddushim', stored);

    // Show confirmation
    setMessages(prev => [...prev, {
      role: 'system',
      content: `💎 **חידוש שמור! (Insight saved!)**\nYou can review your chiddushim later. Keep learning!`,
      timestamp: new Date().toISOString()
    }]);
  }, [textRef, studyMode, level, persona]);

  // Load saved chiddushim on mount
  useEffect(() => {
    const stored = safeStorage.getItem('torah-chiddushim', []);
    if (Array.isArray(stored)) {
      setSavedChiddushim(stored);
    }
  }, []);

  return (
    <div className="tutor-chat">
      {/* Header */}
      <div className="tutor-header">
        <div className="tutor-title">
          <span className="tutor-icon">🎓</span>
          <div className="tutor-title-text">
            <h3>חברותא | AI Study Partner</h3>
            <span className="tutor-subtitle">
              {LEVEL_CONFIG[level].icon} {LEVEL_CONFIG[level].name} • {PERSONA_CONFIG[persona].icon} {PERSONA_CONFIG[persona].name}
            </span>
          </div>
        </div>
        <div className="tutor-actions">
          <button
            className={`tutor-btn ${socraticMode ? 'active' : ''}`}
            onClick={handleSocraticMode}
            title="Socratic Mode - Let me ask YOU questions"
          >
            🤔
          </button>
          <button
            className="tutor-btn summary-btn"
            onClick={handleSessionSummary}
            disabled={isLoading || messages.length < 3}
            title="Generate Session Summary (סיכום שיעור)"
          >
            📋
          </button>
          <button
            className="tutor-btn"
            onClick={() => setShowSettings(!showSettings)}
            title="Settings"
          >
            ⚙️
          </button>
          {onClose && (
            <button className="tutor-btn close" onClick={onClose} title="Close">
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Study Mode Toggle - Yeshiva Style */}
      <div className="study-mode-toggle">
        <button
          className={`mode-btn bekius ${studyMode === STUDY_MODES.BEKIUS ? 'active' : ''}`}
          onClick={() => handleStudyModeChange(STUDY_MODES.BEKIUS)}
          title={STUDY_MODE_CONFIG[STUDY_MODES.BEKIUS].description}
        >
          <span className="mode-icon">{STUDY_MODE_CONFIG[STUDY_MODES.BEKIUS].icon}</span>
          <span className="mode-hebrew">{STUDY_MODE_CONFIG[STUDY_MODES.BEKIUS].nameHebrew}</span>
          <span className="mode-english">{STUDY_MODE_CONFIG[STUDY_MODES.BEKIUS].name}</span>
        </button>
        <button
          className={`mode-btn iyun ${studyMode === STUDY_MODES.IYUN ? 'active' : ''}`}
          onClick={() => handleStudyModeChange(STUDY_MODES.IYUN)}
          title={STUDY_MODE_CONFIG[STUDY_MODES.IYUN].description}
        >
          <span className="mode-icon">{STUDY_MODE_CONFIG[STUDY_MODES.IYUN].icon}</span>
          <span className="mode-hebrew">{STUDY_MODE_CONFIG[STUDY_MODES.IYUN].nameHebrew}</span>
          <span className="mode-english">{STUDY_MODE_CONFIG[STUDY_MODES.IYUN].name}</span>
        </button>
        {savedChiddushim.length > 0 && (
          <span className="chiddush-count" title="Saved insights">
            💎 {savedChiddushim.length}
          </span>
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="tutor-settings">
          <div className="settings-section">
            <label>Difficulty Level</label>
            <LevelSelector value={level} onChange={handleLevelChange} />
          </div>
          <div className="settings-section">
            <label>Teaching Style</label>
            <PersonaSelector value={persona} onChange={handlePersonaChange} />
          </div>
        </div>
      )}

      {/* Context Banner */}
      <div className="tutor-context">
        <span className="context-label">Studying:</span>
        <span className="context-ref">{textRef}</span>
      </div>

      {/* Messages */}
      <div className="tutor-messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            {msg.role === 'assistant' && (
              <span className="message-avatar">🎓</span>
            )}
            {msg.role === 'user' && (
              <span className="message-avatar">👤</span>
            )}
            {msg.role === 'system' && (
              <span className="message-avatar">ℹ️</span>
            )}
            {msg.role === 'error' && (
              <span className="message-avatar">⚠️</span>
            )}
            <div className="message-content">
              <div className={`message-text ${containsHebrew(msg.content) ? 'has-hebrew' : ''}`}>
                {formatMessage(msg.content)}
              </div>
              <div className="message-footer">
                <span className="message-time">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {msg.role === 'assistant' && (
                  <button
                    className="save-chiddush-btn"
                    onClick={() => handleSaveChiddush(msg.content, idx)}
                    title="Save this insight (חידוש)"
                  >
                    💎 Save חידוש
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="message assistant loading">
            <span className="message-avatar">🎓</span>
            <div className="message-content">
              <div className="typing-indicator">
                <span></span><span></span><span></span>
              </div>
              <span className="loading-text">לומד... Studying the text...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Understanding Check Prompt */}
      {showUnderstandingCheck && (
        <div className="understanding-check-prompt">
          <div className="check-content">
            <span className="check-icon">🧠</span>
            <div className="check-text">
              <span className="check-hebrew">לבדיקת הבנה</span>
              <span className="check-english">Check your understanding?</span>
            </div>
          </div>
          <div className="check-actions">
            <button
              className="check-btn yes"
              onClick={handleUnderstandingCheck}
              disabled={isLoading}
            >
              ✓ כן
            </button>
            <button
              className="check-btn no"
              onClick={() => setShowUnderstandingCheck(false)}
            >
              ✗ לא
            </button>
          </div>
        </div>
      )}

      {/* Quick Actions - PaRDeS based */}
      <div className="quick-actions-bar">
        <div className="quick-actions-section pardes">
          <span className="section-label">פרד״ס</span>
          {quickActions.filter(a => a.category === 'pardes').map((action, idx) => (
            <button
              key={idx}
              className="quick-action-btn pardes-btn"
              onClick={() => handleQuickAction(action.prompt)}
              disabled={isLoading}
              title={action.prompt}
            >
              <span className="action-icon">{action.icon}</span>
              <span className="action-hebrew">{action.label}</span>
              <span className="action-english">{action.sublabel}</span>
            </button>
          ))}
        </div>
        <div className="quick-actions-section tools">
          <span className="section-label">כלים</span>
          {quickActions.filter(a => a.category === 'tools').map((action, idx) => (
            <button
              key={idx}
              className="quick-action-btn tool-btn"
              onClick={() => handleQuickAction(action.prompt)}
              disabled={isLoading}
              title={action.prompt}
            >
              <span className="action-icon">{action.icon}</span>
              <span className="action-hebrew">{action.label}</span>
              <span className="action-english">{action.sublabel}</span>
            </button>
          ))}
        </div>
        <div className="quick-actions-section advanced">
          <span className="section-label">למדן</span>
          {quickActions.filter(a => a.category === 'advanced').map((action, idx) => (
            <button
              key={idx}
              className="quick-action-btn advanced-btn"
              onClick={() => handleQuickAction(action.prompt)}
              disabled={isLoading}
              title={action.prompt}
            >
              <span className="action-icon">{action.icon}</span>
              <span className="action-hebrew">{action.label}</span>
              <span className="action-english">{action.sublabel}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="tutor-input-container">
        {error && (
          <div className="input-error">
            <span className="error-icon">⚠️</span>
            <span className="error-text">{error}</span>
            <button className="error-dismiss" onClick={() => setError(null)}>×</button>
          </div>
        )}
        <div className="tutor-input-wrapper">
          <textarea
            ref={inputRef}
            className="tutor-input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="שאל שאלה... Ask a question about this text..."
            rows={2}
            disabled={isLoading}
          />
          <button
            className="send-btn"
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            title="Send (Enter)"
          >
            {isLoading ? '⏳' : '➤'}
          </button>
        </div>
        <div className="input-hint">
          <kbd>Enter</kbd> to send • <kbd>Shift+Enter</kbd> for new line
        </div>
      </div>
    </div>
  );
};

TutorChat.propTypes = {
  textContent: PropTypes.string.isRequired,
  textRef: PropTypes.string.isRequired,
  hebrewText: PropTypes.string,
  initialLevel: PropTypes.oneOf(Object.values(DIFFICULTY_LEVELS)),
  initialPersona: PropTypes.oneOf(Object.values(TEACHING_PERSONAS)),
  onClose: PropTypes.func
};

export default TutorChat;
