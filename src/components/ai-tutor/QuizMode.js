/**
 * QuizMode - Interactive Torah Quiz with Gamification
 *
 * Features:
 * - AI-generated questions from current text
 * - Multiple question types (MC, T/F, fill-blank)
 * - Points, streaks, and level progression
 * - Detailed explanations after answers
 * - Progress tracking and achievements
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { generateQuizQuestions, DIFFICULTY_LEVELS } from '../../services/aiTutorService';
import LevelSelector from './LevelSelector';
import './QuizMode.css';

// Points configuration
const POINTS_CONFIG = {
  easy: { correct: 10, timeBonus: 5 },
  medium: { correct: 25, timeBonus: 10 },
  hard: { correct: 50, timeBonus: 20 }
};

// Streak multipliers
const STREAK_MULTIPLIERS = {
  5: 2,   // 2x after 5 correct
  10: 3,  // 3x after 10 correct
  15: 4,  // 4x after 15 correct
  20: 5   // 5x after 20 correct
};

// Achievement definitions
const ACHIEVEMENTS = {
  FIRST_CORRECT: { id: 'first_correct', name: 'First Steps', icon: '🌱', description: 'Answer your first question correctly' },
  STREAK_5: { id: 'streak_5', name: 'On Fire', icon: '🔥', description: 'Get 5 correct answers in a row' },
  STREAK_10: { id: 'streak_10', name: 'Unstoppable', icon: '⚡', description: 'Get 10 correct answers in a row' },
  PERFECT_QUIZ: { id: 'perfect', name: 'Perfect Score', icon: '💯', description: 'Complete a quiz with no mistakes' },
  QUICK_THINKER: { id: 'quick', name: 'Quick Thinker', icon: '⏱️', description: 'Answer correctly in under 5 seconds' },
  SCHOLAR: { id: 'scholar', name: 'Budding Scholar', icon: '📚', description: 'Complete 10 quizzes' },
  MASTER: { id: 'master', name: 'Torah Master', icon: '👑', description: 'Score 1000 total points' }
};

// Rank progression
const RANKS = [
  { name: 'תלמיד', english: 'Student', minPoints: 0, icon: '📖' },
  { name: 'חבר', english: 'Fellow', minPoints: 100, icon: '📚' },
  { name: 'חכם', english: 'Sage', minPoints: 500, icon: '🎓' },
  { name: 'רב', english: 'Rabbi', minPoints: 1000, icon: '⭐' },
  { name: 'גאון', english: 'Gaon', minPoints: 2500, icon: '👑' }
];

const QuizMode = ({
  textContent,
  textRef,
  onClose,
  initialLevel = DIFFICULTY_LEVELS.INTERMEDIATE
}) => {
  // Quiz state
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Settings
  const [level, setLevel] = useState(initialLevel);
  const [numQuestions, setNumQuestions] = useState(5);
  const [quizStarted, setQuizStarted] = useState(false);

  // Scoring
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [answers, setAnswers] = useState([]);

  // Achievements
  const [earnedAchievements, setEarnedAchievements] = useState([]);
  const [newAchievement, setNewAchievement] = useState(null);

  // Timer
  const [timeLeft, setTimeLeft] = useState(30);
  const [questionStartTime, setQuestionStartTime] = useState(null);
  const timerRef = useRef(null);

  // Current question
  const currentQuestion = questions[currentIndex];
  const isQuizComplete = quizStarted && currentIndex >= questions.length && questions.length > 0;

  // Calculate current rank
  const currentRank = RANKS.slice().reverse().find(r => score >= r.minPoints) || RANKS[0];
  const nextRank = RANKS.find(r => r.minPoints > score);

  // Get streak multiplier
  const getStreakMultiplier = () => {
    const thresholds = Object.keys(STREAK_MULTIPLIERS).map(Number).sort((a, b) => b - a);
    for (const threshold of thresholds) {
      if (streak >= threshold) return STREAK_MULTIPLIERS[threshold];
    }
    return 1;
  };

  // Check for achievements
  const checkAchievements = useCallback((newCorrect, newStreak, newScore, answerTime) => {
    const newAchievements = [];

    if (newCorrect === 1 && !earnedAchievements.includes('first_correct')) {
      newAchievements.push(ACHIEVEMENTS.FIRST_CORRECT);
    }
    if (newStreak === 5 && !earnedAchievements.includes('streak_5')) {
      newAchievements.push(ACHIEVEMENTS.STREAK_5);
    }
    if (newStreak === 10 && !earnedAchievements.includes('streak_10')) {
      newAchievements.push(ACHIEVEMENTS.STREAK_10);
    }
    if (answerTime < 5000 && !earnedAchievements.includes('quick')) {
      newAchievements.push(ACHIEVEMENTS.QUICK_THINKER);
    }
    if (newScore >= 1000 && !earnedAchievements.includes('master')) {
      newAchievements.push(ACHIEVEMENTS.MASTER);
    }

    if (newAchievements.length > 0) {
      setEarnedAchievements(prev => [...prev, ...newAchievements.map(a => a.id)]);
      setNewAchievement(newAchievements[0]);
      setTimeout(() => setNewAchievement(null), 3000);
    }
  }, [earnedAchievements]);

  // Generate quiz
  const startQuiz = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await generateQuizQuestions(textContent, textRef, numQuestions, level);

      if (result.error || !result.questions?.length) {
        setError(result.error || 'Failed to generate questions. Please try again.');
        return;
      }

      setQuestions(result.questions);
      setQuizStarted(true);
      setCurrentIndex(0);
      setScore(0);
      setStreak(0);
      setCorrectCount(0);
      setAnswers([]);
      setQuestionStartTime(Date.now());
      setTimeLeft(30);
    } catch (err) {
      setError(err.message || 'Failed to generate quiz');
    } finally {
      setIsLoading(false);
    }
  };

  // Timer effect - intentionally uses currentIndex as proxy for currentQuestion
  useEffect(() => {
    if (quizStarted && currentQuestion && !showExplanation && !isQuizComplete) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            // Time's up - auto submit wrong
            handleAnswer(-1);
            return 30;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timerRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizStarted, currentIndex, showExplanation, isQuizComplete]);

  // Handle answer selection
  const handleAnswer = (answerIndex) => {
    if (selectedAnswer !== null) return;

    clearInterval(timerRef.current);
    setSelectedAnswer(answerIndex);

    const isCorrect = answerIndex === currentQuestion.correctIndex;
    const answerTime = Date.now() - questionStartTime;
    const difficulty = currentQuestion.difficulty || 'medium';

    let pointsEarned = 0;
    let newStreak = streak;
    let newCorrect = correctCount;

    if (isCorrect) {
      newStreak = streak + 1;
      newCorrect = correctCount + 1;
      const multiplier = getStreakMultiplier();
      const basePoints = POINTS_CONFIG[difficulty]?.correct || 10;
      const timeBonus = timeLeft > 20 ? (POINTS_CONFIG[difficulty]?.timeBonus || 5) : 0;
      pointsEarned = (basePoints + timeBonus) * multiplier;

      setStreak(newStreak);
      setCorrectCount(newCorrect);
    } else {
      newStreak = 0;
      setStreak(0);
    }

    const newScore = score + pointsEarned;
    setScore(newScore);

    setAnswers(prev => [...prev, {
      questionIndex: currentIndex,
      selected: answerIndex,
      correct: currentQuestion.correctIndex,
      isCorrect,
      points: pointsEarned,
      time: answerTime
    }]);

    checkAchievements(newCorrect, newStreak, newScore, answerTime);
    setShowExplanation(true);
  };

  // Move to next question
  const nextQuestion = () => {
    setSelectedAnswer(null);
    setShowExplanation(false);
    setCurrentIndex(prev => prev + 1);
    setQuestionStartTime(Date.now());
    setTimeLeft(30);
  };

  // Restart quiz
  const restartQuiz = () => {
    setQuizStarted(false);
    setQuestions([]);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setScore(0);
    setStreak(0);
    setCorrectCount(0);
    setAnswers([]);
  };

  // Get option class
  const getOptionClass = (index) => {
    if (selectedAnswer === null) return '';
    if (index === currentQuestion.correctIndex) return 'correct';
    if (index === selectedAnswer && index !== currentQuestion.correctIndex) return 'incorrect';
    return 'dimmed';
  };

  // Check if we have valid text content
  const hasValidContent = textContent && textContent.trim().length > 20;

  // Pre-quiz setup screen
  if (!quizStarted) {
    return (
      <div className="quiz-mode">
        <div className="quiz-header">
          <h3>
            <span className="quiz-icon">🎯</span>
            <span className="quiz-title-text">
              <span className="quiz-title-hebrew">בחינה</span>
              Torah Quiz
            </span>
          </h3>
          {onClose && (
            <button className="close-btn" onClick={onClose}>×</button>
          )}
        </div>

        <div className="quiz-setup">
          {/* Text Preview Section */}
          <div className="setup-section">
            <h4>
              <span className="section-icon">📜</span>
              Study Text
            </h4>
            {hasValidContent ? (
              <>
                <div className="text-preview" dir="rtl">
                  {textContent?.substring(0, 200)}{textContent?.length > 200 ? '...' : ''}
                </div>
                <div className="text-ref">
                  <span className="ref-icon">📍</span>
                  {textRef}
                </div>
              </>
            ) : (
              <div className="no-text-warning">
                <span className="warning-icon">⚠️</span>
                <span>Please select verses to study before starting a quiz.</span>
              </div>
            )}
          </div>

          {/* Difficulty Level */}
          <div className="setup-section">
            <h4>
              <span className="section-icon">📊</span>
              Difficulty Level
            </h4>
            <LevelSelector
              value={level}
              onChange={setLevel}
              compact={false}
            />
          </div>

          {/* Number of Questions */}
          <div className="setup-section">
            <h4>
              <span className="section-icon">❓</span>
              Number of Questions
            </h4>
            <div className="num-questions-selector">
              {[3, 5, 7, 10].map(num => (
                <button
                  key={num}
                  className={`num-btn ${numQuestions === num ? 'selected' : ''}`}
                  onClick={() => setNumQuestions(num)}
                  title={`Generate ${num} questions`}
                >
                  <span className="num-value">{num}</span>
                  <span className="num-label">{num <= 3 ? 'Quick' : num <= 5 ? 'Standard' : num <= 7 ? 'Extended' : 'Full'}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quiz Features Info */}
          <div className="quiz-features">
            <div className="feature">
              <span className="feature-icon">⏱️</span>
              <span>30 seconds per question</span>
            </div>
            <div className="feature">
              <span className="feature-icon">🔥</span>
              <span>Streak bonuses for consecutive correct answers</span>
            </div>
            <div className="feature">
              <span className="feature-icon">🏆</span>
              <span>Earn achievements and climb the ranks</span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              <div className="error-content">
                <span className="error-text">{error}</span>
                <span className="error-hint">Check your API key in settings or try again.</span>
              </div>
              <button className="error-retry" onClick={() => setError(null)}>×</button>
            </div>
          )}

          {/* Start Button */}
          <button
            className="start-quiz-btn"
            onClick={startQuiz}
            disabled={isLoading || !hasValidContent}
          >
            {isLoading ? (
              <>
                <span className="spinner" />
                Generating Quiz...
              </>
            ) : (
              <>
                <span className="btn-icon">▶</span>
                Start Quiz
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Quiz complete screen
  if (isQuizComplete) {
    const percentage = Math.round((correctCount / questions.length) * 100);
    const isPerfect = correctCount === questions.length;

    // Check for perfect quiz achievement
    if (isPerfect && !earnedAchievements.includes('perfect')) {
      setEarnedAchievements(prev => [...prev, 'perfect']);
      setNewAchievement(ACHIEVEMENTS.PERFECT_QUIZ);
    }

    return (
      <div className="quiz-mode">
        <div className="quiz-complete">
          <div className="complete-header">
            <div className="complete-icon">{isPerfect ? '🏆' : percentage >= 70 ? '🎉' : '📚'}</div>
            <h3>Quiz Complete!</h3>
          </div>

          <div className="results-summary">
            <div className="score-display">
              <div className="final-score">{score}</div>
              <div className="score-label">Points</div>
            </div>

            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-value">{correctCount}/{questions.length}</span>
                <span className="stat-label">Correct</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{percentage}%</span>
                <span className="stat-label">Accuracy</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{currentRank.icon} {currentRank.name}</span>
                <span className="stat-label">Rank</span>
              </div>
            </div>

            {nextRank && (
              <div className="next-rank">
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${((score - currentRank.minPoints) / (nextRank.minPoints - currentRank.minPoints)) * 100}%` }}
                  />
                </div>
                <span className="next-rank-text">
                  {nextRank.minPoints - score} points to {nextRank.english}
                </span>
              </div>
            )}
          </div>

          <div className="answers-review">
            <h4>Review Answers</h4>
            {answers.map((answer, idx) => (
              <div key={idx} className={`answer-item ${answer.isCorrect ? 'correct' : 'incorrect'}`}>
                <span className="answer-icon">{answer.isCorrect ? '✓' : '✗'}</span>
                <span className="answer-question">{questions[idx]?.question}</span>
                <span className="answer-points">{answer.isCorrect ? `+${answer.points}` : '0'}</span>
              </div>
            ))}
          </div>

          <div className="complete-actions">
            <button className="restart-btn" onClick={restartQuiz}>
              <span>🔄</span> New Quiz
            </button>
            {onClose && (
              <button className="close-quiz-btn" onClick={onClose}>
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Active quiz screen
  return (
    <div className="quiz-mode">
      {/* Achievement popup */}
      {newAchievement && (
        <div className="achievement-popup">
          <span className="achievement-icon">{newAchievement.icon}</span>
          <div className="achievement-info">
            <span className="achievement-name">{newAchievement.name}</span>
            <span className="achievement-desc">{newAchievement.description}</span>
          </div>
        </div>
      )}

      {/* Quiz header with stats */}
      <div className="quiz-header active">
        <div className="header-left">
          <span className="question-counter">
            {currentIndex + 1} / {questions.length}
          </span>
          {streak > 1 && (
            <span className="streak-badge">
              🔥 {streak} streak {getStreakMultiplier() > 1 && `(${getStreakMultiplier()}x)`}
            </span>
          )}
        </div>
        <div className="header-center">
          <div className={`timer ${timeLeft <= 10 ? 'warning' : ''}`}>
            <span className="timer-icon">⏱️</span>
            <span className="timer-value">{timeLeft}s</span>
          </div>
        </div>
        <div className="header-right">
          <span className="score-badge">
            {currentRank.icon} {score} pts
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="quiz-progress">
        <div
          className="progress-fill"
          style={{ width: `${((currentIndex) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question */}
      <div className="question-container">
        <div className="question-badge">
          <span className={`difficulty ${currentQuestion.difficulty || 'medium'}`}>
            {currentQuestion.difficulty || 'medium'}
          </span>
          <span className="points-possible">
            +{POINTS_CONFIG[currentQuestion.difficulty || 'medium']?.correct || 10} pts
          </span>
        </div>

        <p className="question-text">{currentQuestion.question}</p>

        <div className="options-list">
          {currentQuestion.options?.map((option, idx) => (
            <button
              key={idx}
              className={`option-btn ${getOptionClass(idx)}`}
              onClick={() => handleAnswer(idx)}
              disabled={selectedAnswer !== null}
            >
              <span className="option-letter">{String.fromCharCode(65 + idx)}</span>
              <span className="option-text">{option}</span>
              {selectedAnswer !== null && idx === currentQuestion.correctIndex && (
                <span className="correct-icon">✓</span>
              )}
              {selectedAnswer === idx && idx !== currentQuestion.correctIndex && (
                <span className="incorrect-icon">✗</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Explanation */}
      {showExplanation && (
        <div className={`explanation-panel ${selectedAnswer === currentQuestion.correctIndex ? 'correct' : 'incorrect'}`}>
          <div className="explanation-header">
            {selectedAnswer === currentQuestion.correctIndex ? (
              <><span className="result-icon">✓</span> Correct! +{answers[answers.length - 1]?.points || 0} points</>
            ) : (
              <><span className="result-icon">✗</span> Incorrect</>
            )}
          </div>
          <p className="explanation-text">{currentQuestion.explanation}</p>
          <button className="next-btn" onClick={nextQuestion}>
            {currentIndex < questions.length - 1 ? 'Next Question →' : 'See Results'}
          </button>
        </div>
      )}
    </div>
  );
};

export default QuizMode;
