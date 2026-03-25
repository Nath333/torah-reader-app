/**
 * AIChazaraMode - AI-Enhanced Review (חזרה)
 *
 * Parallel to TalmudToolsTab's Chazara mode, but with AI enhancement:
 * - AI generates custom quiz questions
 * - AI adapts difficulty based on answers
 * - AI explains correct answers
 * - AI tracks mastery
 */
import React, { useState, useCallback } from 'react';
import { analyzeCommentary } from '../../../services/groqService';
import { ModeHeader, ModeError, ModeEmptyState, ModeResultText, modePropTypes } from './shared';

const CHAZARA_PROMPTS = {
  generate: `Generate 5 review questions (שאלות חזרה) for this text.

For each question provide:
- Question in Hebrew
- Type: factual/understanding/application
- Difficulty: 1-3 (1=easy, 3=hard)
- Correct answer
- Brief explanation

Format as JSON array:
[{"question": "...", "type": "...", "difficulty": 1, "answer": "...", "explanation": "..."}]

Make questions progressively harder. Focus on key concepts.`,

  explain: (question, userAnswer) => `
The student answered this question:
Question: ${question}
Their answer: ${userAnswer}

Please:
1. Evaluate if the answer is correct, partially correct, or incorrect
2. Explain the correct answer in Hebrew
3. Provide additional context if helpful
4. Give encouragement

Respond in Hebrew.`
};

const AIChazaraMode = ({ text, reference, onResult, loading, setLoading }) => {
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [showAnswer, setShowAnswer] = useState({});
  const [feedback, setFeedback] = useState({});
  const [error, setError] = useState(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  // Generate questions
  const generateQuestions = useCallback(async () => {
    if (!text || loading) return;

    setLoading(true);
    setError(null);
    setQuestions([]);
    setCurrentIndex(0);
    setUserAnswers({});
    setShowAnswer({});
    setFeedback({});
    setScore({ correct: 0, total: 0 });

    try {
      const result = await analyzeCommentary(text, reference || 'Text', '', 'chavruta', {
        customPrompt: CHAZARA_PROMPTS.generate
      });

      // Parse JSON response
      const jsonMatch = result.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setQuestions(parsed);
        if (onResult) onResult({ type: 'chazara', questions: parsed });
      } else {
        throw new Error('Failed to parse questions');
      }
    } catch (err) {
      console.error('[AIChazaraMode] Generation error:', err);
      setError('שגיאה ביצירת שאלות. נסה שוב.');
    } finally {
      setLoading(false);
    }
  }, [text, reference, loading, setLoading, onResult]);

  // Check answer with AI
  const checkAnswer = useCallback(async (index) => {
    const question = questions[index];
    const userAnswer = userAnswers[index];

    if (!userAnswer || loading) return;

    setLoading(true);
    setShowAnswer(prev => ({ ...prev, [index]: true }));

    try {
      const feedbackResult = await analyzeCommentary(
        text,
        reference || 'Text',
        '',
        'chavruta',
        { customPrompt: CHAZARA_PROMPTS.explain(question.question, userAnswer) }
      );

      setFeedback(prev => ({ ...prev, [index]: feedbackResult }));

      // Simple scoring - check if AI says correct
      const isCorrect = feedbackResult.includes('נכון') ||
                       feedbackResult.includes('correct') ||
                       feedbackResult.includes('מצוין');

      setScore(prev => ({
        correct: prev.correct + (isCorrect ? 1 : 0),
        total: prev.total + 1
      }));
    } catch (err) {
      console.error('[AIChazaraMode] Check error:', err);
      setFeedback(prev => ({ ...prev, [index]: question.explanation }));
    } finally {
      setLoading(false);
    }
  }, [questions, userAnswers, text, reference, loading, setLoading]);

  // Handle answer input
  const handleAnswerChange = (index, value) => {
    setUserAnswers(prev => ({ ...prev, [index]: value }));
  };

  // Navigation
  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const prevQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const currentQuestion = questions[currentIndex];

  return (
    <div className="ai-chazara-mode">
      <ModeHeader mode="chazara">
        {score.total > 0 && (
          <div className="score-badge">
            <span className="score-correct">{score.correct}</span>
            <span className="score-divider">/</span>
            <span className="score-total">{score.total}</span>
          </div>
        )}
      </ModeHeader>

      {/* Generate button */}
      {questions.length === 0 && (
        <div className="chazara-generate">
          <button
            className={`generate-btn ${loading ? 'loading' : ''}`}
            onClick={generateQuestions}
            disabled={loading || !text}
          >
            {loading ? (
              <>
                <span className="btn-spinner" />
                <span>יוצר שאלות...</span>
              </>
            ) : (
              <>
                <span className="btn-icon">🎯</span>
                <span>צור שאלות חזרה</span>
              </>
            )}
          </button>
          <p className="generate-hint">AI יצור 5 שאלות מותאמות לטקסט</p>
        </div>
      )}

      <ModeError error={error} className="chazara-error" />

      {/* Question display */}
      {currentQuestion && (
        <div className="chazara-question">
          {/* Progress bar */}
          <div className="question-progress">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
              />
            </div>
            <span className="progress-text">
              שאלה {currentIndex + 1} מתוך {questions.length}
            </span>
          </div>

          {/* Difficulty indicator */}
          <div className="question-meta">
            <span className={`difficulty difficulty-${currentQuestion.difficulty}`}>
              {'⭐'.repeat(currentQuestion.difficulty)}
            </span>
            <span className="question-type">{currentQuestion.type}</span>
          </div>

          {/* Question text */}
          <div className="question-text">
            <span className="question-number">ש{currentIndex + 1}.</span>
            <span>{currentQuestion.question}</span>
          </div>

          {/* Answer input */}
          <div className="answer-section">
            <textarea
              className="answer-input"
              value={userAnswers[currentIndex] || ''}
              onChange={(e) => handleAnswerChange(currentIndex, e.target.value)}
              placeholder="הקלד את תשובתך כאן..."
              disabled={showAnswer[currentIndex]}
              rows={3}
            />

            {!showAnswer[currentIndex] ? (
              <button
                className="check-btn"
                onClick={() => checkAnswer(currentIndex)}
                disabled={!userAnswers[currentIndex] || loading}
              >
                {loading ? (
                  <span className="btn-spinner" />
                ) : (
                  <>
                    <span className="btn-icon">✓</span>
                    <span>בדוק תשובה</span>
                  </>
                )}
              </button>
            ) : (
              <div className="answer-revealed">
                <div className="correct-answer">
                  <span className="answer-label">תשובה נכונה:</span>
                  <span className="answer-text">{currentQuestion.answer}</span>
                </div>
                {feedback[currentIndex] && (
                  <div className="ai-feedback">
                    <span className="feedback-label">🤖 הסבר:</span>
                    <div className="feedback-text">
                      <ModeResultText text={feedback[currentIndex]} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="question-nav">
            <button
              className="nav-btn prev"
              onClick={prevQuestion}
              disabled={currentIndex === 0}
            >
              ← הקודם
            </button>
            <div className="nav-dots">
              {questions.map((_, i) => (
                <button
                  key={i}
                  className={`nav-dot ${i === currentIndex ? 'active' : ''} ${showAnswer[i] ? 'answered' : ''}`}
                  onClick={() => setCurrentIndex(i)}
                />
              ))}
            </div>
            <button
              className="nav-btn next"
              onClick={nextQuestion}
              disabled={currentIndex === questions.length - 1}
            >
              הבא →
            </button>
          </div>
        </div>
      )}

      {/* Completion state */}
      {questions.length > 0 && score.total === questions.length && (
        <div className="chazara-complete">
          <span className="complete-icon">🎉</span>
          <span className="complete-title">סיימת את החזרה!</span>
          <span className="complete-score">
            ציון: {score.correct}/{score.total} ({Math.round((score.correct / score.total) * 100)}%)
          </span>
          <button className="restart-btn" onClick={generateQuestions}>
            <span className="btn-icon">🔄</span>
            <span>התחל מחדש</span>
          </button>
        </div>
      )}

      {!text && <ModeEmptyState mode="chazara" />}
    </div>
  );
};

AIChazaraMode.propTypes = modePropTypes;

export default AIChazaraMode;
