/**
 * ChavrutaAI - AI Study Partner
 *
 * Simulates a chavruta (study partner) experience:
 * - Asks challenging questions about the text
 * - Plays devil's advocate on interpretations
 * - Prompts deeper analysis
 * - Tracks understanding progression
 *
 * Based on traditional yeshiva learning methods:
 * - "Vos iz der chiluk?" (What's the difference?)
 * - "Vos iz der ra'aya?" (What's the proof?)
 * - "Vos iz di kashya?" (What's the difficulty?)
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useStudyMode } from '../../context/StudyModeContext';
import { askQuestion } from '../../services/ai/aiService';
// 2026 Smart Features - AI Memory for persistent conversation intelligence
import {
  initializeMemory,
  addMessage as addToMemory,
  getConversationContext,
  startNewSession,
  trackStudy
} from '../../services/ai/aiMemoryService';
import './ChavrutaAI.css';

// =============================================================================
// Chavruta Question Types (Traditional Yeshiva Style)
// =============================================================================

const CHAVRUTA_PROMPTS = {
  // Understanding check
  EXPLAIN: {
    prompt: "Ask me to explain the main point of this text in my own words. Challenge oversimplifications.",
    icon: "💭",
    label: "Explain"
  },
  // Find difficulties
  KASHYA: {
    prompt: "Point out a potential difficulty or contradiction in this text. Ask 'What's your kashya here?'",
    icon: "❓",
    label: "Kashya"
  },
  // Seek proof
  RAAYA: {
    prompt: "Ask me what proof or source supports this interpretation. Challenge weak reasoning.",
    icon: "📜",
    label: "Ra'aya"
  },
  // Compare views
  CHILUK: {
    prompt: "Ask me to distinguish between two similar concepts or interpretations in this text.",
    icon: "⚖️",
    label: "Chiluk"
  },
  // Practical application
  NAFKA_MINA: {
    prompt: "Ask what practical difference this teaching makes. 'Mai nafka minah?'",
    icon: "🎯",
    label: "Nafka Mina"
  },
  // Devil's advocate
  STIRAH: {
    prompt: "Present a contradicting view or source that challenges the text's position.",
    icon: "🔄",
    label: "Stirah"
  }
};

// =============================================================================
// Component
// =============================================================================

const ChavrutaAI = ({
  currentText,
  currentReference,
  commentaries = [],
  onKushyaRaised,
  minimal = false
}) => {
  const { chavrutaActive, startChavruta, endChavruta, addChavrutaExchange, features } = useStudyMode();

  const [conversation, setConversation] = useState([]);
  const [isThinking, setIsThinking] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [currentChallenge, setCurrentChallenge] = useState(null);
  const [understandingScore, setUnderstandingScore] = useState(0);

  const conversationRef = useRef(null);
  const memoryInitialized = useRef(false);

  // Initialize AI Memory when chavruta session starts
  useEffect(() => {
    if (chavrutaActive && !memoryInitialized.current) {
      initializeMemory();
      startNewSession({
        mode: 'chavruta',
        book: currentReference?.split(' ')[0] || 'Unknown',
        studyMode: 'chavruta_challenge'
      });
      memoryInitialized.current = true;

      // Track study activity
      trackStudy({
        type: 'chavruta_start',
        reference: currentReference,
        timestamp: Date.now()
      });
    }
    // Reset when session ends
    if (!chavrutaActive) {
      memoryInitialized.current = false;
    }
  }, [chavrutaActive, currentReference]);

  // Auto-scroll conversation
  useEffect(() => {
    if (conversationRef.current) {
      conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
    }
  }, [conversation]);

  // =============================================================================
  // AI Interaction
  // =============================================================================

  const askChavruta = useCallback(async (questionType) => {
    if (!currentText || isThinking) return;

    setIsThinking(true);
    setCurrentChallenge(questionType);

    const prompt = CHAVRUTA_PROMPTS[questionType];
    const systemPrompt = `You are a chavruta (study partner) in a yeshiva setting. Your role is to help your partner understand the text deeply through challenging questions and discussion.

Current text being studied:
"${currentText}"

Reference: ${currentReference || 'Unknown'}

${commentaries.length > 0 ? `Available commentaries:\n${commentaries.map(c => `- ${c.name}: ${c.text?.substring(0, 200)}...`).join('\n')}` : ''}

Your task: ${prompt.prompt}

Important guidelines:
- Use traditional yeshiva terminology when appropriate (kashya, terutz, ra'aya, chiluk, nafka mina)
- Be challenging but supportive
- Ask follow-up questions based on the response
- If the student seems stuck, offer hints not answers
- Occasionally praise good insights
- Keep responses concise but meaningful

Respond as if speaking directly to your chavruta.`;

    try {
      const response = await askQuestion(systemPrompt, {
        maxTokens: 300,
        temperature: 0.8
      });

      const exchange = {
        type: questionType,
        question: response,
        timestamp: Date.now(),
        userResponse: null
      };

      setConversation(prev => [...prev, exchange]);
      addChavrutaExchange(response, null);

      // Track AI message to memory for context building
      addToMemory({
        role: 'assistant',
        content: response,
        metadata: {
          questionType,
          reference: currentReference
        }
      });

    } catch (error) {
      console.error('Chavruta error:', error);
      setConversation(prev => [...prev, {
        type: 'error',
        question: 'Sorry, I need a moment to think. Try again.',
        timestamp: Date.now()
      }]);
    } finally {
      setIsThinking(false);
    }
  }, [currentText, currentReference, commentaries, isThinking, addChavrutaExchange]);

  const respondToChavruta = useCallback(async () => {
    if (!userInput.trim() || isThinking) return;

    const myResponse = userInput.trim();
    setUserInput('');
    setIsThinking(true);

    // Track user message to memory
    addToMemory({
      role: 'user',
      content: myResponse,
      metadata: {
        reference: currentReference
      }
    });

    // Update last exchange with user response
    setConversation(prev => {
      const updated = [...prev];
      if (updated.length > 0) {
        updated[updated.length - 1].userResponse = myResponse;
      }
      return updated;
    });

    // Get conversation context from memory (includes entity tracking, topic extraction)
    const memoryContext = getConversationContext({ maxMessages: 10 });

    // Get AI follow-up
    const conversationContext = conversation.map(ex =>
      `Chavruta: ${ex.question}\n${ex.userResponse ? `Student: ${ex.userResponse}` : ''}`
    ).join('\n\n');

    const followUpPrompt = `You are continuing a chavruta study session.

${memoryContext.topTopics?.length > 0 ? `Key topics discussed: ${memoryContext.topTopics.join(', ')}` : ''}

Text being studied: "${currentText}"

Previous discussion:
${conversationContext}

Student just said: "${myResponse}"

Respond as the chavruta:
- If the answer is good, acknowledge it and either deepen the discussion or move to a new point
- If the answer is weak, gently challenge it or offer a hint
- If they raised a good question, engage with it
- Keep traditional yeshiva learning style
- Be encouraging but rigorous

Your response:`;

    try {
      const response = await askQuestion(followUpPrompt, {
        maxTokens: 250,
        temperature: 0.7
      });

      // Check for understanding markers in response
      const showsUnderstanding = response.toLowerCase().includes('good') ||
                                  response.toLowerCase().includes('exactly') ||
                                  response.toLowerCase().includes('right') ||
                                  response.toLowerCase().includes('יפה');

      if (showsUnderstanding) {
        setUnderstandingScore(prev => Math.min(prev + 1, 5));
        // Track learning progress
        trackStudy({
          type: 'understanding_gained',
          reference: currentReference,
          score: understandingScore + 1
        });
      }

      setConversation(prev => [...prev, {
        type: 'followup',
        question: response,
        timestamp: Date.now(),
        userResponse: null
      }]);

      addChavrutaExchange(response, myResponse);

      // Track AI follow-up to memory
      addToMemory({
        role: 'assistant',
        content: response,
        metadata: {
          type: 'followup',
          reference: currentReference
        }
      });

    } catch (error) {
      console.error('Chavruta follow-up error:', error);
    } finally {
      setIsThinking(false);
    }
  }, [userInput, conversation, currentText, currentReference, isThinking, understandingScore, addChavrutaExchange]);

  // =============================================================================
  // Kushya Integration
  // =============================================================================

  const raiseKushya = useCallback(() => {
    if (conversation.length > 0) {
      const lastExchange = conversation[conversation.length - 1];
      if (onKushyaRaised) {
        onKushyaRaised(lastExchange.question);
      }
    }
  }, [conversation, onKushyaRaised]);

  // =============================================================================
  // Render
  // =============================================================================

  if (!features?.enableChavruta && !minimal) {
    return null;
  }

  if (minimal) {
    return (
      <div className="chavruta-minimal">
        <button
          className="chavruta-start-btn"
          onClick={chavrutaActive ? endChavruta : startChavruta}
        >
          {chavrutaActive ? '🤝 End Chavruta' : '🎓 Start Chavruta'}
        </button>
      </div>
    );
  }

  return (
    <div className={`chavruta-ai ${chavrutaActive ? 'active' : ''}`}>
      {!chavrutaActive ? (
        <div className="chavruta-intro">
          <div className="chavruta-icon">🎓</div>
          <h3>Chavruta Study Partner</h3>
          <p>Start a chavruta session to have AI challenge your understanding with traditional yeshiva-style questions.</p>
          <button className="start-chavruta-btn" onClick={startChavruta}>
            Start Learning Together
          </button>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="chavruta-header">
            <div className="chavruta-title">
              <span className="chavruta-icon">🤝</span>
              <span>Chavruta Session</span>
            </div>
            <div className="understanding-meter">
              {[...Array(5)].map((_, i) => (
                <span
                  key={i}
                  className={`understanding-dot ${i < understandingScore ? 'filled' : ''}`}
                />
              ))}
            </div>
            <button className="end-chavruta-btn" onClick={endChavruta}>
              End
            </button>
          </div>

          {/* Question Type Buttons */}
          <div className="chavruta-prompts">
            {Object.entries(CHAVRUTA_PROMPTS).map(([key, { icon, label }]) => (
              <button
                key={key}
                className={`prompt-btn ${currentChallenge === key ? 'active' : ''}`}
                onClick={() => askChavruta(key)}
                disabled={isThinking}
                title={label}
              >
                <span className="prompt-icon">{icon}</span>
                <span className="prompt-label">{label}</span>
              </button>
            ))}
          </div>

          {/* Conversation */}
          <div className="chavruta-conversation" ref={conversationRef}>
            {conversation.length === 0 ? (
              <div className="conversation-start">
                <p>Select a question type above to begin the discussion.</p>
                <p className="hebrew-hint">נו, לאמיר לערנען!</p>
              </div>
            ) : (
              conversation.map((exchange, idx) => (
                <div key={idx} className="exchange">
                  <div className="chavruta-message">
                    <span className="speaker-icon">🎓</span>
                    <div className="message-content">
                      {exchange.question}
                    </div>
                  </div>
                  {exchange.userResponse && (
                    <div className="user-message">
                      <div className="message-content">
                        {exchange.userResponse}
                      </div>
                      <span className="speaker-icon">👤</span>
                    </div>
                  )}
                </div>
              ))
            )}

            {isThinking && (
              <div className="chavruta-thinking">
                <span className="thinking-dots">
                  <span>.</span><span>.</span><span>.</span>
                </span>
                Thinking...
              </div>
            )}
          </div>

          {/* Input */}
          <div className="chavruta-input">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && respondToChavruta()}
              placeholder="Your response..."
              disabled={isThinking || conversation.length === 0}
            />
            <button
              onClick={respondToChavruta}
              disabled={isThinking || !userInput.trim()}
            >
              Send
            </button>
          </div>

          {/* Actions */}
          {conversation.length > 0 && (
            <div className="chavruta-actions">
              <button
                className="action-btn"
                onClick={raiseKushya}
                title="Save this question to your kushya list"
              >
                📝 Save as Kushya
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ChavrutaAI;
