/**
 * FollowUpQuestion - Chavruta-style Q&A Component
 * Allows users to ask follow-up questions with RAG-enhanced answers
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { askWithRAG } from '../../../services/groqService';

// Markdown-style link renderer for citations
const renderAnswer = (text) => {
  if (!text) return null;

  // Parse markdown links [text](url) and render as clickable
  const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = linkPattern.exec(text)) !== null) {
    // Add text before the link
    if (match.index > lastIndex) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {text.slice(lastIndex, match.index)}
        </span>
      );
    }

    // Add the link
    parts.push(
      <a
        key={`link-${match.index}`}
        href={match[2]}
        target="_blank"
        rel="noopener noreferrer"
        className="citation-link"
        title={`Open in Sefaria: ${match[1]}`}
      >
        {match[1]}
      </a>
    );

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(
      <span key={`text-${lastIndex}`}>
        {text.slice(lastIndex)}
      </span>
    );
  }

  return parts.length > 0 ? parts : text;
};

// Single Q&A exchange display
const QAExchange = ({ exchange, index }) => (
  <div className={`qa-exchange ${exchange.modeLabel ? 'special-mode' : ''}`}>
    <div className="qa-question">
      <span className="qa-label">Q{index + 1}:</span>
      <span className="qa-text">{exchange.question}</span>
    </div>
    <div className="qa-answer">
      {exchange.modeLabel && (
        <span className="qa-mode-badge">{exchange.modeLabel}</span>
      )}
      <span className="qa-label">A:</span>
      <div className="qa-text">{renderAnswer(exchange.answer)}</div>

      {/* Show sources used from RAG */}
      {exchange.sourcesUsed?.length > 0 && (
        <div className="qa-sources-used">
          <span className="sources-used-label">
            <span className="rag-check">✓</span> Grounded in:
          </span>
          <div className="sources-used-list">
            {exchange.sourcesUsed.slice(0, 6).map((source, i) => (
              <span key={i} className="source-used-tag">{source}</span>
            ))}
            {exchange.sourcesUsed.length > 6 && (
              <span className="source-used-more">+{exchange.sourcesUsed.length - 6} more</span>
            )}
          </div>
        </div>
      )}

      {/* Clickable citations extracted from answer */}
      {exchange.citations?.length > 0 && (
        <div className="qa-citations">
          <span className="citations-label">Direct links:</span>
          {exchange.citations.map((cite, i) => (
            <a
              key={i}
              href={cite.url}
              target="_blank"
              rel="noopener noreferrer"
              className="citation-badge"
            >
              {cite.sourceName}
            </a>
          ))}
        </div>
      )}
    </div>
  </div>
);

QAExchange.propTypes = {
  exchange: PropTypes.shape({
    question: PropTypes.string.isRequired,
    answer: PropTypes.string,
    citations: PropTypes.array
  }).isRequired,
  index: PropTypes.number.isRequired
};

// Chavruta interaction modes
const CHAVRUTA_MODES = {
  ASK: 'ask',           // Standard Q&A
  ADVOCATE: 'advocate', // Devil's Advocate - challenge understanding
  RABBI: 'rabbi',       // "What Would [Rabbi] Say?" mode
};

// Rabbi styles for "What Would [Rabbi] Say?" mode
const RABBI_STYLES = [
  { id: 'rashi', name: 'Rashi', hebrewName: 'רש"י', style: 'peshat, brevity, practical' },
  { id: 'ramban', name: 'Ramban', hebrewName: 'רמב"ן', style: 'philosophical, mystical, lengthy' },
  { id: 'ibn_ezra', name: 'Ibn Ezra', hebrewName: 'אבן עזרא', style: 'grammatical, rationalist' },
  { id: 'sforno', name: 'Sforno', hebrewName: 'ספורנו', style: 'moral philosophy, humanist' },
  { id: 'rambam', name: 'Rambam', hebrewName: 'רמב"ם', style: 'systematic, philosophical' },
  { id: 'vilna_gaon', name: 'Vilna Gaon', hebrewName: 'הגר"א', style: 'precise, grammatical, deep' }
];

// Suggested questions based on mode/context
const SUGGESTED_QUESTIONS = {
  default: [
    "What does Rashi say about this?",
    "How do other commentators interpret this?",
    "What is the deeper meaning?",
    "Are there related passages elsewhere?"
  ],
  talmud: [
    "What is the halachic conclusion?",
    "How does Tosafot explain this?",
    "What is the underlying principle?",
    "Are there dissenting opinions?"
  ],
  genesis: [
    "What does this teach about creation?",
    "How do the Midrashim expand on this?",
    "What moral lesson is derived here?",
    "How does Ramban interpret this differently?"
  ]
};

// Devil's Advocate prompts - challenges the user's understanding
const ADVOCATE_PROMPTS = [
  "Challenge my understanding with counter-arguments",
  "What objections would Tosafot raise?",
  "Play devil's advocate on this interpretation",
  "What questions would a sharp chavrusa ask here?"
];

// Main FollowUpQuestion Component
const FollowUpQuestion = ({
  reference,
  hebrewText,
  previousAnalysis,
  ragContext,
  textType = 'torah',
  isGenesis = false
}) => {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [exchanges, setExchanges] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [chavrutaMode, setChavrutaMode] = useState(CHAVRUTA_MODES.ASK);
  const [selectedRabbi, setSelectedRabbi] = useState(null);
  const [showRabbiSelector, setShowRabbiSelector] = useState(false);
  const inputRef = useRef(null);
  const answersEndRef = useRef(null);

  // Get contextual suggestions based on mode
  const suggestions = chavrutaMode === CHAVRUTA_MODES.ADVOCATE
    ? ADVOCATE_PROMPTS
    : textType === 'talmud'
      ? SUGGESTED_QUESTIONS.talmud
      : isGenesis
        ? SUGGESTED_QUESTIONS.genesis
        : SUGGESTED_QUESTIONS.default;

  // Auto-scroll to latest answer
  useEffect(() => {
    if (exchanges.length > 0 && answersEndRef.current) {
      answersEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [exchanges]);

  // Build special prompt based on chavruta mode
  const buildPrompt = useCallback((baseQuestion) => {
    if (chavrutaMode === CHAVRUTA_MODES.ADVOCATE) {
      return `[DEVIL'S ADVOCATE MODE]
You are a sharp chavrusa challenging my understanding.
My question/statement: "${baseQuestion}"

Your task:
1. Present counter-arguments from OTHER commentators who disagree
2. Raise difficult questions that this interpretation doesn't answer
3. Point out textual difficulties with this reading
4. Suggest alternative interpretations that I should consider
5. End with a challenging question for me to think about

Be respectful but intellectually rigorous. Quote specific sources.`;
    }

    if (chavrutaMode === CHAVRUTA_MODES.RABBI && selectedRabbi) {
      const rabbi = RABBI_STYLES.find(r => r.id === selectedRabbi);
      return `[WHAT WOULD ${rabbi.name.toUpperCase()} SAY?]
Respond to this question AS IF you were ${rabbi.name} (${rabbi.hebrewName}).
Match their methodology: ${rabbi.style}
Use their characteristic style and reasoning patterns.

Question: "${baseQuestion}"

Respond in first person as ${rabbi.name} would, citing sources they typically cite.`;
    }

    return baseQuestion;
  }, [chavrutaMode, selectedRabbi]);

  // Handle question submission
  const handleAsk = useCallback(async (questionText) => {
    const q = questionText || question;
    if (!q.trim()) return;

    // For Rabbi mode, ensure a rabbi is selected
    if (chavrutaMode === CHAVRUTA_MODES.RABBI && !selectedRabbi) {
      setShowRabbiSelector(true);
      return;
    }

    setLoading(true);
    setError(null);
    setShowSuggestions(false);

    try {
      const enhancedQuestion = buildPrompt(q.trim());

      const result = await askWithRAG({
        question: enhancedQuestion,
        reference,
        hebrewText,
        previousAnalysis,
        ragContext,
        conversationHistory: exchanges
      });

      if (result.success) {
        // Format the exchange label based on mode
        const modeLabel = chavrutaMode === CHAVRUTA_MODES.ADVOCATE
          ? '⚔️ Challenge'
          : chavrutaMode === CHAVRUTA_MODES.RABBI && selectedRabbi
            ? `🎭 ${RABBI_STYLES.find(r => r.id === selectedRabbi)?.name}`
            : null;

        setExchanges(prev => [...prev, {
          question: q.trim(),
          answer: result.answer,
          citations: result.citations || [],
          sourcesUsed: result.sourcesUsed || [],
          modeLabel
        }]);
        setQuestion('');
      } else {
        setError(result.error || 'Failed to get answer');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [question, reference, hebrewText, previousAnalysis, ragContext, exchanges, chavrutaMode, selectedRabbi, buildPrompt]);

  // Handle Enter key
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey && !loading) {
      e.preventDefault();
      handleAsk();
    }
  }, [handleAsk, loading]);

  // Handle suggestion click
  const handleSuggestion = (suggestionText) => {
    setQuestion(suggestionText);
    handleAsk(suggestionText);
  };

  // Clear conversation
  const handleClear = () => {
    setExchanges([]);
    setShowSuggestions(true);
    setError(null);
  };

  return (
    <div className="followup-question">
      <div className="followup-header">
        <span className="followup-icon">💬</span>
        <h4>Chavruta Q&A</h4>
        {exchanges.length > 0 && (
          <button
            type="button"
            className="clear-btn"
            onClick={handleClear}
            title="Clear conversation"
          >
            Clear
          </button>
        )}
      </div>

      {/* Chavruta Mode Selector */}
      <div className="chavruta-mode-tabs">
        <button
          type="button"
          className={`mode-tab ${chavrutaMode === CHAVRUTA_MODES.ASK ? 'active' : ''}`}
          onClick={() => { setChavrutaMode(CHAVRUTA_MODES.ASK); setShowRabbiSelector(false); }}
          title="Standard Q&A"
        >
          💬 Ask
        </button>
        <button
          type="button"
          className={`mode-tab ${chavrutaMode === CHAVRUTA_MODES.ADVOCATE ? 'active' : ''}`}
          onClick={() => { setChavrutaMode(CHAVRUTA_MODES.ADVOCATE); setShowRabbiSelector(false); }}
          title="Challenge my understanding"
        >
          ⚔️ Challenge
        </button>
        <button
          type="button"
          className={`mode-tab ${chavrutaMode === CHAVRUTA_MODES.RABBI ? 'active' : ''}`}
          onClick={() => { setChavrutaMode(CHAVRUTA_MODES.RABBI); setShowRabbiSelector(true); }}
          title="What would [Rabbi] say?"
        >
          🎭 As Rabbi
        </button>
      </div>

      {/* Rabbi Selector (for Rabbi mode) */}
      {showRabbiSelector && chavrutaMode === CHAVRUTA_MODES.RABBI && (
        <div className="rabbi-selector">
          <span className="rabbi-label">Respond as:</span>
          <div className="rabbi-options">
            {RABBI_STYLES.map(rabbi => (
              <button
                key={rabbi.id}
                type="button"
                className={`rabbi-option ${selectedRabbi === rabbi.id ? 'selected' : ''}`}
                onClick={() => setSelectedRabbi(rabbi.id)}
                title={rabbi.style}
              >
                <span className="rabbi-name">{rabbi.name}</span>
                <span className="rabbi-hebrew">{rabbi.hebrewName}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mode description */}
      <div className="chavruta-mode-info">
        {chavrutaMode === CHAVRUTA_MODES.ASK && (
          <span className="mode-desc">Ask any question about this passage</span>
        )}
        {chavrutaMode === CHAVRUTA_MODES.ADVOCATE && (
          <span className="mode-desc challenge">⚔️ AI will challenge your understanding with counter-arguments</span>
        )}
        {chavrutaMode === CHAVRUTA_MODES.RABBI && selectedRabbi && (
          <span className="mode-desc rabbi">🎭 AI will respond as {RABBI_STYLES.find(r => r.id === selectedRabbi)?.name} would</span>
        )}
      </div>

      {/* Previous exchanges */}
      {exchanges.length > 0 && (
        <div className="qa-history">
          {exchanges.map((ex, i) => (
            <QAExchange key={i} exchange={ex} index={i} />
          ))}
          <div ref={answersEndRef} />
        </div>
      )}

      {/* Suggested questions */}
      {showSuggestions && exchanges.length === 0 && (
        <div className="suggested-questions">
          <span className="suggestions-label">Try asking:</span>
          <div className="suggestions-list">
            {suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                className="suggestion-btn"
                onClick={() => handleSuggestion(s)}
                disabled={loading}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="followup-error">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Input area */}
      <div className="followup-input-area">
        <input
          ref={inputRef}
          type="text"
          className="followup-input"
          placeholder="Ask about this passage..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <button
          type="button"
          className="ask-btn"
          onClick={() => handleAsk()}
          disabled={loading || !question.trim()}
        >
          {loading ? (
            <span className="loading-spinner" />
          ) : (
            <span>Ask</span>
          )}
        </button>
      </div>

      {/* Source indicator */}
      {ragContext && (
        <div className="followup-sources">
          <span className="sources-icon">📚</span>
          <span>Answers grounded in {ragContext.totalSources || 'real'} Sefaria sources</span>
        </div>
      )}
    </div>
  );
};

FollowUpQuestion.propTypes = {
  reference: PropTypes.string.isRequired,
  hebrewText: PropTypes.string,
  previousAnalysis: PropTypes.object,
  ragContext: PropTypes.object,
  textType: PropTypes.oneOf(['torah', 'talmud']),
  isGenesis: PropTypes.bool
};

export default FollowUpQuestion;
