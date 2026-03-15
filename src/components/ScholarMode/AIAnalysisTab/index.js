/**
 * AIAnalysisTab - Comprehensive AI-powered Torah/Talmud study
 * Supports 25+ analysis modes including PaRDeS, Mussar, Gematria, etc.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { analyzeCommentary, ANALYSIS_MODES, hasApiKey as checkHasApiKey } from '../../../services/groqService';
import { askFollowUp, clearConversation } from '../../../services/aiService';
import ModeGrid, { ALL_MODES } from './ModeGrid';
import APIKeySetup from '../APIKeySetup';
import './AIAnalysisTab.css';

// Content type options for analysis
const CONTENT_TYPES = {
  VERSE: 'verse',
  RASHI: 'rashi',
  ONKELOS: 'onkelos',
  RAMBAN: 'ramban',
  ALL: 'all'
};

// Result Section Component
const ResultSection = ({ title, icon, children, color }) => (
  <div className="result-section" style={{ '--section-color': color || '#6366f1' }}>
    <div className="section-header">
      <span className="section-icon">{icon}</span>
      <h4>{title}</h4>
    </div>
    <div className="section-content">
      {children}
    </div>
  </div>
);

// Key Points List Component
const KeyPointsList = ({ points }) => (
  <div className="key-points">
    {points?.map((point, i) => (
      <div key={i} className="key-point">
        <span className="point-num">{i + 1}</span>
        <span className="point-text">{point}</span>
      </div>
    ))}
  </div>
);

// Generic AI Result Renderer
const AIResult = ({ result, mode }) => {
  if (!result) return null;

  const modeInfo = ALL_MODES.find(m => m.id === mode) || {};

  return (
    <div className="ai-result">
      {/* Summary */}
      {result.summary && (
        <ResultSection title="Summary" icon="📋" color={modeInfo.color}>
          <p className="result-text">{result.summary}</p>
        </ResultSection>
      )}

      {/* One-line Summary */}
      {result.oneLineSummary && (
        <div className="result-highlight">
          <p className="result-oneline">{result.oneLineSummary}</p>
        </div>
      )}

      {/* Key Points */}
      {result.keyPoints && result.keyPoints.length > 0 && (
        <ResultSection title="Key Points" icon="📝" color="#3b82f6">
          <KeyPointsList points={result.keyPoints} />
        </ResultSection>
      )}

      {/* PaRDeS Levels */}
      {result.pshat && (
        <div className="pardes-levels">
          <ResultSection title="פשט (Pshat)" icon="📖" color="#3b82f6">
            <p>{result.pshat}</p>
          </ResultSection>
          {result.remez && (
            <ResultSection title="רמז (Remez)" icon="🔮" color="#10b981">
              <p>{result.remez}</p>
            </ResultSection>
          )}
          {result.drash && (
            <ResultSection title="דרש (Drash)" icon="📚" color="#8b5cf6">
              <p>{result.drash}</p>
            </ResultSection>
          )}
          {result.sod && (
            <ResultSection title="סוד (Sod)" icon="✨" color="#a855f7">
              <p>{result.sod}</p>
            </ResultSection>
          )}
        </div>
      )}

      {/* Mussar / Ethical Teachings */}
      {result.ethicalTeachings && (
        <ResultSection title="Ethical Teachings" icon="💎" color="#ec4899">
          {result.ethicalTeachings.map((teaching, i) => (
            <div key={i} className="teaching-item">
              <strong>{teaching.middah || teaching.virtue}:</strong> {teaching.explanation}
            </div>
          ))}
        </ResultSection>
      )}

      {/* Study Questions */}
      {result.questions && result.questions.length > 0 && (
        <ResultSection title="Chavruta Questions" icon="❓" color="#f59e0b">
          <div className="questions-list">
            {result.questions.map((q, i) => (
              <div key={i} className="question-item">
                <span className="q-num">{i + 1}.</span>
                <span className="q-text">{q.question || q}</span>
              </div>
            ))}
          </div>
        </ResultSection>
      )}

      {/* Key Terms */}
      {result.terms && result.terms.length > 0 && (
        <ResultSection title="Key Terms" icon="🔤" color="#06b6d4">
          <div className="terms-grid">
            {result.terms.map((term, i) => (
              <div key={i} className="term-card">
                <span className="term-hebrew" dir="rtl">{term.hebrew || term.term}</span>
                {term.transliteration && <span className="term-translit">{term.transliteration}</span>}
                <span className="term-meaning">{term.meaning || term.definition}</span>
              </div>
            ))}
          </div>
        </ResultSection>
      )}

      {/* Gematria */}
      {result.gematria && (
        <ResultSection title="Gematria Analysis" icon="🔢" color="#f97316">
          {result.gematria.words && result.gematria.words.map((word, i) => (
            <div key={i} className="gematria-item">
              <span className="gem-word" dir="rtl">{word.word}</span>
              <span className="gem-value">{word.value}</span>
              {word.connections && <span className="gem-connections">{word.connections}</span>}
            </div>
          ))}
          {result.gematria.interpretation && (
            <p className="gem-interpretation">{result.gematria.interpretation}</p>
          )}
        </ResultSection>
      )}

      {/* Mefarshim / Commentators */}
      {result.commentators && result.commentators.length > 0 && (
        <ResultSection title="Mefarshim Views" icon="📚" color="#7c3aed">
          {result.commentators.map((comm, i) => (
            <div key={i} className="commentator-view">
              <div className="commentator-name">{comm.name}</div>
              <p className="commentator-view-text">{comm.view || comm.interpretation}</p>
            </div>
          ))}
        </ResultSection>
      )}

      {/* Halacha */}
      {result.halacha && (
        <ResultSection title="Halachic Applications" icon="⚖️" color="#dc2626">
          {result.halacha.principles && (
            <div className="halacha-principles">
              {result.halacha.principles.map((p, i) => (
                <div key={i} className="principle-item">{p}</div>
              ))}
            </div>
          )}
          {result.halacha.practicalApplication && (
            <p className="practical-app">{result.halacha.practicalApplication}</p>
          )}
        </ResultSection>
      )}

      {/* Historical Context */}
      {result.historicalContext && (
        <ResultSection title="Historical Context" icon="🏛️" color="#b45309">
          <p>{result.historicalContext}</p>
        </ResultSection>
      )}

      {/* Cross-references */}
      {result.crossReferences && result.crossReferences.length > 0 && (
        <ResultSection title="Cross-References" icon="🔗" color="#059669">
          <div className="crossref-list">
            {result.crossReferences.map((ref, i) => (
              <div key={i} className="crossref-item">
                <span className="ref-source">{ref.reference || ref.source}</span>
                <span className="ref-connection">{ref.connection}</span>
              </div>
            ))}
          </div>
        </ResultSection>
      )}

      {/* Narrative Analysis */}
      {result.narrative && (
        <ResultSection title="Narrative Analysis" icon="📖" color="#14b8a6">
          {result.narrative.plot && <p><strong>Plot:</strong> {result.narrative.plot}</p>}
          {result.narrative.characters && (
            <div className="narrative-chars">
              <strong>Characters:</strong>
              {result.narrative.characters.map((char, i) => (
                <span key={i} className="char-tag">{char.name || char}</span>
              ))}
            </div>
          )}
          {result.narrative.themes && (
            <div className="narrative-themes">
              <strong>Themes:</strong> {result.narrative.themes.join(', ')}
            </div>
          )}
        </ResultSection>
      )}

      {/* Insights */}
      {result.insights && result.insights.length > 0 && (
        <ResultSection title="Quick Insights" icon="💡" color="#fbbf24">
          <KeyPointsList points={result.insights} />
        </ResultSection>
      )}

      {/* Passage Analysis (multi-verse) */}
      {result.passageAnalysis && (
        <div className="passage-analysis">
          {result.passageAnalysis.overview && (
            <ResultSection title="Passage Overview" icon="📜" color="#6366f1">
              <p>{result.passageAnalysis.overview}</p>
            </ResultSection>
          )}
          {result.passageAnalysis.themes && (
            <ResultSection title="Major Themes" icon="🔮" color="#a855f7">
              <div className="themes-list">
                {result.passageAnalysis.themes.map((theme, i) => (
                  <div key={i} className="theme-item">
                    <strong>{theme.name}:</strong> {theme.description}
                  </div>
                ))}
              </div>
            </ResultSection>
          )}
        </div>
      )}

      {/* Practical Lesson */}
      {result.practicalLesson && (
        <div className="practical-lesson">
          <span className="lesson-icon">🎯</span>
          <p>{result.practicalLesson}</p>
        </div>
      )}

      {/* Related Topics */}
      {result.relatedTopics && result.relatedTopics.length > 0 && (
        <div className="related-topics">
          {result.relatedTopics.map((topic, i) => (
            <span key={i} className="topic-tag">{topic}</span>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * AIAnalysisTab - Main Component
 */
const AIAnalysisTab = ({
  text,
  reference,
  textType = 'torah',
  selectedBook,
  selectedVerse,
  selectedVerses,
  isMultiVerse = false,
  rashiText,
  onkelosText,
  rambanText
}) => {
  const [hasKey, setHasKey] = useState(false);
  const [selectedMode, setSelectedMode] = useState(
    isMultiVerse ? ANALYSIS_MODES.PASSAGE : ANALYSIS_MODES.SUMMARY
  );
  const [selectedContent, setSelectedContent] = useState(CONTENT_TYPES.VERSE);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [completedModes, setCompletedModes] = useState(new Set());

  // Follow-up conversation state
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [followUpQuestion, setFollowUpQuestion] = useState('');
  const [followUpResult, setFollowUpResult] = useState(null);
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const followUpInputRef = useRef(null);

  // Check for API key on mount
  useEffect(() => {
    setHasKey(checkHasApiKey());
  }, []);

  // Clear conversation when component unmounts or changes
  useEffect(() => {
    return () => {
      clearConversation();
    };
  }, [text, reference]);

  // Determine if Genesis for special modes
  const isGenesis = selectedBook?.toLowerCase().includes('genesis') ||
    selectedBook?.toLowerCase().includes('bereshit');

  // Get text to analyze based on content selection
  const getTextToAnalyze = useCallback(() => {
    switch (selectedContent) {
      case CONTENT_TYPES.RASHI:
        return rashiText || text;
      case CONTENT_TYPES.ONKELOS:
        return onkelosText || text;
      case CONTENT_TYPES.RAMBAN:
        return rambanText || text;
      case CONTENT_TYPES.ALL:
        return [text, rashiText, onkelosText, rambanText].filter(Boolean).join('\n\n');
      default:
        return text;
    }
  }, [text, rashiText, onkelosText, rambanText, selectedContent]);

  // Handle analysis
  const handleAnalyze = useCallback(async () => {
    const analysisText = getTextToAnalyze();
    if (!analysisText) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setFollowUpResult(null);

    try {
      const sourceType = textType === 'talmud' ? 'Talmud' : 'Torah';
      const analysisResult = await analyzeCommentary(
        analysisText,
        sourceType,
        reference,
        selectedMode
      );

      if (analysisResult.success) {
        setResult(analysisResult);
        setCompletedModes(prev => new Set([...prev, selectedMode]));
      } else {
        setError(analysisResult.error || 'Analysis failed');
      }
    } catch (err) {
      setError(err.message || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  }, [getTextToAnalyze, textType, reference, selectedMode]);

  // Handle follow-up question
  const handleFollowUp = useCallback(async () => {
    if (!followUpQuestion.trim() || !result) return;

    setFollowUpLoading(true);

    try {
      const response = await askFollowUp(followUpQuestion);
      setFollowUpResult(response);
      setFollowUpQuestion('');
    } catch (err) {
      setError(err.message);
    } finally {
      setFollowUpLoading(false);
    }
  }, [followUpQuestion, result]);

  // Handle mode selection
  const handleModeSelect = useCallback((mode) => {
    setSelectedMode(mode);
    // Auto-analyze when mode changes if we have a previous result
    if (result) {
      setResult(null);
      setFollowUpResult(null);
    }
  }, [result]);

  // Handle API key setup
  const handleApiKeySet = useCallback(() => {
    setHasKey(true);
  }, []);

  // Show API key setup if no key
  if (!hasKey) {
    return <APIKeySetup onKeySet={handleApiKeySet} />;
  }

  // Get verse count for display
  const verseCount = isMultiVerse && selectedVerses ? selectedVerses.length : 1;

  return (
    <div className="ai-analysis-tab">
      {/* Multi-verse Info Display */}
      {isMultiVerse && selectedVerses && selectedVerses.length > 0 && (
        <div className="multi-verse-info">
          <div className="multi-verse-header">
            <span className="multi-verse-icon">📜</span>
            <span className="multi-verse-title">Passage Analysis</span>
            <span className="multi-verse-count">{verseCount} verses selected</span>
          </div>
          <div className="multi-verse-preview">
            {selectedVerses.slice(0, 3).map((v, i) => (
              <span key={i} className="verse-chip">
                {v.chapter}:{v.verse}
              </span>
            ))}
            {selectedVerses.length > 3 && (
              <span className="verse-chip more">+{selectedVerses.length - 3} more</span>
            )}
          </div>
        </div>
      )}

      {/* Mode Selection */}
      <ModeGrid
        selectedMode={selectedMode}
        onSelect={handleModeSelect}
        loading={loading}
        showGenesisMode={isGenesis}
        isMultiVerse={isMultiVerse}
        completedModes={completedModes}
        textType={textType}
      />

      {/* Content Type Selector (show for both single and multi-verse when commentary available) */}
      {(rashiText || onkelosText || rambanText) && (
        <div className="content-type-selector">
          <span className="selector-label">Analyze:</span>
          <div className="content-pills">
            <button
              className={`content-pill ${selectedContent === CONTENT_TYPES.VERSE ? 'active' : ''}`}
              onClick={() => setSelectedContent(CONTENT_TYPES.VERSE)}
            >
              {isMultiVerse ? 'Verses' : 'Verse'}
            </button>
            {rashiText && (
              <button
                className={`content-pill ${selectedContent === CONTENT_TYPES.RASHI ? 'active' : ''}`}
                onClick={() => setSelectedContent(CONTENT_TYPES.RASHI)}
              >
                Rashi
              </button>
            )}
            {onkelosText && (
              <button
                className={`content-pill ${selectedContent === CONTENT_TYPES.ONKELOS ? 'active' : ''}`}
                onClick={() => setSelectedContent(CONTENT_TYPES.ONKELOS)}
              >
                Onkelos
              </button>
            )}
            {rambanText && (
              <button
                className={`content-pill ${selectedContent === CONTENT_TYPES.RAMBAN ? 'active' : ''}`}
                onClick={() => setSelectedContent(CONTENT_TYPES.RAMBAN)}
              >
                Ramban
              </button>
            )}
            <button
              className={`content-pill ${selectedContent === CONTENT_TYPES.ALL ? 'active' : ''}`}
              onClick={() => setSelectedContent(CONTENT_TYPES.ALL)}
            >
              All
            </button>
          </div>
        </div>
      )}

      {/* Analyze Button */}
      <button
        onClick={handleAnalyze}
        disabled={loading || !text}
        className="btn-analyze"
      >
        {loading ? (
          <>
            <span className="loading-spinner-small"></span>
            Analyzing...
          </>
        ) : (
          <>
            <span>🧠</span> Analyze
          </>
        )}
      </button>

      {/* Error Display */}
      {error && (
        <div className="ai-error">
          <span>⚠️</span> {error}
          <button onClick={() => setError(null)} className="error-dismiss">×</button>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <>
          <AIResult result={result} mode={selectedMode} />

          {/* Follow-up Section */}
          <div className="followup-section">
            <button
              className={`followup-toggle ${showFollowUp ? 'active' : ''}`}
              onClick={() => {
                setShowFollowUp(!showFollowUp);
                if (!showFollowUp) {
                  setTimeout(() => followUpInputRef.current?.focus(), 100);
                }
              }}
            >
              <span>💬</span> Ask a follow-up question
            </button>

            {showFollowUp && (
              <div className="followup-input-area">
                <input
                  ref={followUpInputRef}
                  type="text"
                  value={followUpQuestion}
                  onChange={(e) => setFollowUpQuestion(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleFollowUp()}
                  placeholder="Ask about the analysis..."
                  disabled={followUpLoading}
                />
                <button
                  onClick={handleFollowUp}
                  disabled={followUpLoading || !followUpQuestion.trim()}
                >
                  {followUpLoading ? '...' : '→'}
                </button>
              </div>
            )}

            {followUpResult && (
              <div className="followup-result">
                <div className="followup-answer">
                  <strong>Answer:</strong>
                  <p>{followUpResult.answer}</p>
                </div>
                {followUpResult.connection && (
                  <div className="followup-connection">
                    <strong>Connection:</strong>
                    <p>{followUpResult.connection}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Empty State */}
      {!result && !loading && !error && (
        <div className="ai-empty-state">
          <span className="empty-icon">{isMultiVerse ? '📜' : '🧠'}</span>
          <p>
            {isMultiVerse
              ? `Select an analysis mode to study ${verseCount} verses together as a unified passage`
              : 'Select an analysis mode and click "Analyze" to begin AI-powered study'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default AIAnalysisTab;
