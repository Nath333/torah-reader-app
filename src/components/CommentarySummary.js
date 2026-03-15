import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import mermaid from 'mermaid';
import { analyzeCommentary, ANALYSIS_MODES } from '../services/groqService';
import './CommentarySummary.css';

// Initialize mermaid with better settings
mermaid.initialize({
  startOnLoad: false,
  theme: 'base',
  securityLevel: 'strict',
  flowchart: {
    useMaxWidth: true,
    htmlLabels: true,
    curve: 'basis',
    padding: 20
  },
  themeVariables: {
    primaryColor: '#667eea',
    primaryTextColor: '#fff',
    primaryBorderColor: '#5a67d8',
    lineColor: '#718096',
    secondaryColor: '#e0e7ff',
    tertiaryColor: '#f7fafc'
  }
});

// ============================================================================
// Mermaid Diagram Component with Enhanced Error Handling
// ============================================================================
const MermaidDiagram = ({ chart, id }) => {
  const containerRef = useRef(null);
  const [svg, setSvg] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const renderDiagram = async () => {
      if (!chart) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setSvg('');
      setError(null);

      try {
        // Clean the chart syntax
        let cleanChart = chart
          .replace(/\\n/g, '\n')
          .replace(/\\"/g, '"')
          .trim();

        // Ensure it starts with a valid graph declaration
        if (!cleanChart.match(/^(graph|flowchart|sequenceDiagram|classDiagram|mindmap)/i)) {
          cleanChart = 'graph TD\n' + cleanChart;
        }

        // Generate unique ID to avoid conflicts
        const uniqueId = `mermaid-${id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const { svg: renderedSvg } = await mermaid.render(uniqueId, cleanChart);
        setSvg(renderedSvg);
      } catch (err) {
        console.error('Mermaid rendering error:', err);
        setError(err.message || 'Failed to render diagram');
      } finally {
        setLoading(false);
      }
    };

    renderDiagram();
  }, [chart, id]);

  if (loading) {
    return (
      <div className="mermaid-loading">
        <div className="diagram-spinner"></div>
        <span>Rendering diagram...</span>
      </div>
    );
  }

  if (error || !svg) {
    // Show the raw diagram code as fallback
    return (
      <div className="mermaid-fallback">
        <div className="fallback-header">
          <span className="fallback-icon">📊</span>
          <span>Concept Flow</span>
        </div>
        <pre className="fallback-code">{chart}</pre>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="mermaid-container"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};

// ============================================================================
// Visual Concept Cards - Alternative to Diagrams
// ============================================================================
const ConceptFlow = ({ concepts }) => {
  if (!concepts || concepts.length === 0) return null;

  return (
    <div className="concept-flow">
      {concepts.map((concept, i) => (
        <React.Fragment key={i}>
          <div className="concept-node">
            <span className="concept-text">{concept}</span>
          </div>
          {i < concepts.length - 1 && <div className="concept-arrow">→</div>}
        </React.Fragment>
      ))}
    </div>
  );
};

// ============================================================================
// Topic Tag with Icon
// ============================================================================
const TopicTag = ({ topic }) => {
  const icons = {
    'Teshuvah': '🔄', 'Mitzvot': '📜', 'Mussar': '💡', 'Halacha': '⚖️',
    'Aggadah': '📖', 'Kabbalah': '✨', 'Torah': '📕', 'Prayer': '🙏',
    'Shabbat': '🕯️', 'Ethics': '🤝', 'Creation': '🌍', 'Prophecy': '👁️',
    'History': '📚', 'Language': '🔤', 'Emunah': '❤️', 'Middot': '🌟',
    'Chesed': '💝', 'Justice': '⚖️', 'Faith': '🌟', 'Wisdom': '🧠'
  };

  const getIcon = (t) => {
    const normalized = t.toLowerCase();
    for (const [key, icon] of Object.entries(icons)) {
      if (normalized.includes(key.toLowerCase())) return icon;
    }
    return '🏷️';
  };

  return (
    <span className="topic-tag">
      <span className="topic-icon">{getIcon(topic)}</span>
      {topic}
    </span>
  );
};

// ============================================================================
// Info Card Component
// ============================================================================
const InfoCard = ({ icon, title, children, className = '', highlight = false }) => (
  <div className={`info-card ${className} ${highlight ? 'highlight' : ''}`}>
    <div className="info-card-header">
      <span className="info-card-icon">{icon}</span>
      <h4 className="info-card-title">{title}</h4>
    </div>
    <div className="info-card-content">
      {children}
    </div>
  </div>
);

// ============================================================================
// Mode Selector - Professional Jewish Study Modes
// ============================================================================
const ModeSelector = ({ currentMode, onModeChange, loading }) => {
  const modes = [
    { id: ANALYSIS_MODES.SUMMARY, label: 'Summary', icon: '📝', desc: 'Quick overview' },
    { id: ANALYSIS_MODES.PARDES, label: 'PaRDeS', icon: '🌳', desc: 'Four levels' },
    { id: ANALYSIS_MODES.DEEP_STUDY, label: 'Deep', icon: '📚', desc: 'Scholarly analysis' },
    { id: ANALYSIS_MODES.MUSSAR, label: 'Mussar', icon: '💎', desc: 'Character growth' },
    { id: ANALYSIS_MODES.STUDY_QUESTIONS, label: 'Questions', icon: '❓', desc: 'Study questions' },
    { id: ANALYSIS_MODES.KEY_TERMS, label: 'Terms', icon: '🔤', desc: 'Hebrew terms' },
    { id: ANALYSIS_MODES.COMPARE, label: 'Compare', icon: '⚖️', desc: 'Different views' }
  ];

  return (
    <div className="mode-selector">
      {modes.map(mode => (
        <button
          key={mode.id}
          className={`mode-btn ${currentMode === mode.id ? 'active' : ''}`}
          onClick={() => onModeChange(mode.id)}
          disabled={loading}
          title={mode.desc}
        >
          <span className="mode-icon">{mode.icon}</span>
          <span className="mode-label">{mode.label}</span>
        </button>
      ))}
    </div>
  );
};

// ============================================================================
// Study Questions Display
// ============================================================================
const StudyQuestionsView = ({ data }) => {
  const [revealedHints, setRevealedHints] = useState({});

  const toggleHint = (key) => {
    setRevealedHints(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const renderQuestions = (questions, title, color, levelIcon) => {
    if (!questions || questions.length === 0) return null;
    return (
      <InfoCard icon={levelIcon} title={title} className={`level-${color}`}>
        <ul className="questions-list">
          {questions.map((q, i) => (
            <li key={i} className="question-item">
              <span className="question-text">{typeof q === 'string' ? q : q.question}</span>
              {q.hint && (
                <button
                  className={`hint-btn ${revealedHints[`${title}-${i}`] ? 'revealed' : ''}`}
                  onClick={() => toggleHint(`${title}-${i}`)}
                >
                  {revealedHints[`${title}-${i}`] ? (
                    <span className="hint-text">💡 {q.hint}</span>
                  ) : (
                    <span>💡 Show Hint</span>
                  )}
                </button>
              )}
            </li>
          ))}
        </ul>
      </InfoCard>
    );
  };

  return (
    <div className="study-questions-view">
      {data.summary && (
        <div className="context-banner">
          <p>{data.summary}</p>
        </div>
      )}

      <div className="questions-grid">
        {renderQuestions(data.basicQuestions, 'Basic Questions', 'green', '🟢')}
        {renderQuestions(data.analyticalQuestions, 'Analytical Questions', 'yellow', '🟡')}
        {renderQuestions(data.advancedQuestions, 'Advanced Questions', 'red', '🔴')}
      </div>

      {data.discussionTopics && data.discussionTopics.length > 0 && (
        <InfoCard icon="💬" title="Chavruta Discussion Topics">
          <ul className="discussion-list">
            {data.discussionTopics.map((topic, i) => (
              <li key={i}>{topic}</li>
            ))}
          </ul>
        </InfoCard>
      )}

      {data.practicalApplication && (
        <InfoCard icon="🎯" title="Practical Application" highlight>
          <p>{data.practicalApplication}</p>
        </InfoCard>
      )}
    </div>
  );
};

// ============================================================================
// Key Terms Display
// ============================================================================
const KeyTermsView = ({ data }) => {
  const [expandedTerm, setExpandedTerm] = useState(null);

  return (
    <div className="key-terms-view">
      {data.summary && (
        <div className="context-banner">
          <p>{data.summary}</p>
        </div>
      )}

      {data.hebrewTerms && data.hebrewTerms.length > 0 && (
        <div className="terms-section">
          <h4>📖 Hebrew/Aramaic Terms</h4>
          <div className="terms-grid">
            {data.hebrewTerms.map((term, i) => (
              <div
                key={i}
                className={`term-card ${expandedTerm === i ? 'expanded' : ''}`}
                onClick={() => setExpandedTerm(expandedTerm === i ? null : i)}
              >
                <div className="term-header">
                  <span className="term-hebrew">{term.term}</span>
                  {term.transliteration && (
                    <span className="term-transliteration">{term.transliteration}</span>
                  )}
                </div>
                <div className="term-translation">{term.translation}</div>
                {expandedTerm === i && (
                  <div className="term-expanded">
                    {term.explanation && <p className="term-explanation">{term.explanation}</p>}
                    {term.relatedTerms && term.relatedTerms.length > 0 && (
                      <div className="related-terms">
                        <span className="related-label">Related:</span>
                        {term.relatedTerms.map((rt, j) => (
                          <span key={j} className="related-term-chip">{rt}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <div className="expand-indicator">{expandedTerm === i ? '▼' : '▶'}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.concepts && data.concepts.length > 0 && (
        <div className="concepts-section">
          <h4>💡 Key Concepts</h4>
          <div className="concepts-grid">
            {data.concepts.map((concept, i) => (
              <InfoCard key={i} icon="📌" title={concept.name}>
                <p><strong>Definition:</strong> {concept.definition}</p>
                {concept.significance && <p><strong>Significance:</strong> {concept.significance}</p>}
              </InfoCard>
            ))}
          </div>
        </div>
      )}

      {data.topics && data.topics.length > 0 && (
        <div className="topics-footer">
          {data.topics.map((topic, i) => <TopicTag key={i} topic={topic} />)}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Deep Study Display
// ============================================================================
const DeepStudyView = ({ data, showDiagram, diagramId }) => {
  return (
    <div className="deep-study-view">
      {data.summary && (
        <InfoCard icon="📜" title="Main Thesis" className="thesis-card">
          <p className="thesis-text">{data.summary}</p>
        </InfoCard>
      )}

      <div className="deep-study-grid">
        {data.methodology && (
          <InfoCard icon="🔍" title="Methodology">
            <p>{data.methodology}</p>
          </InfoCard>
        )}

        {data.novelInsight && (
          <InfoCard icon="✨" title="חידוש (Novel Insight)" highlight>
            <p>{data.novelInsight}</p>
          </InfoCard>
        )}
      </div>

      {data.difficulties && data.difficulties.length > 0 && (
        <InfoCard icon="❓" title="Questions Addressed">
          <ul className="bullet-list">
            {data.difficulties.map((d, i) => <li key={i}>{d}</li>)}
          </ul>
        </InfoCard>
      )}

      {data.keyPoints && data.keyPoints.length > 0 && (
        <InfoCard icon="🎯" title="Key Points">
          <div className="key-points-grid">
            {data.keyPoints.map((p, i) => (
              <div key={i} className="key-point-item">
                <span className="point-num">{i + 1}</span>
                <span className="point-content">{p}</span>
              </div>
            ))}
          </div>
        </InfoCard>
      )}

      {data.textualBasis && data.textualBasis.length > 0 && (
        <InfoCard icon="📚" title="Textual Sources">
          <div className="sources-list">
            {data.textualBasis.map((s, i) => (
              <span key={i} className="source-chip">{s}</span>
            ))}
          </div>
        </InfoCard>
      )}

      {showDiagram && data.diagram && (
        <div className="diagram-section">
          <h4>🗺️ Analysis Flow</h4>
          <MermaidDiagram chart={data.diagram} id={diagramId} />
        </div>
      )}

      {data.furtherStudy && data.furtherStudy.length > 0 && (
        <InfoCard icon="📖" title="Further Study">
          <ul className="further-study-list">
            {data.furtherStudy.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </InfoCard>
      )}
    </div>
  );
};

// ============================================================================
// Compare View
// ============================================================================
const CompareView = ({ data, showDiagram, diagramId }) => {
  const colors = ['#667eea', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="compare-view">
      {data.summary && (
        <div className="context-banner">
          <p>{data.summary}</p>
        </div>
      )}

      {data.approaches && data.approaches.length > 0 && (
        <div className="approaches-section">
          <h4>📊 Interpretive Approaches</h4>
          <div className="approaches-grid">
            {data.approaches.map((approach, i) => (
              <div
                key={i}
                className="approach-card"
                style={{ borderLeftColor: colors[i % colors.length] }}
              >
                <h5 style={{ color: colors[i % colors.length] }}>{approach.school}</h5>
                <p>{approach.interpretation}</p>
                {approach.representative && (
                  <span className="representative">— {approach.representative}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {data.tensions && data.tensions.length > 0 && (
        <InfoCard icon="⚡" title="Points of Tension">
          <ul className="tension-list">
            {data.tensions.map((t, i) => <li key={i}>{t}</li>)}
          </ul>
        </InfoCard>
      )}

      {data.synthesis && (
        <InfoCard icon="🤝" title="Synthesis" highlight>
          <p>{data.synthesis}</p>
        </InfoCard>
      )}

      {showDiagram && data.diagram && (
        <div className="diagram-section">
          <h4>🗺️ Approaches Map</h4>
          <MermaidDiagram chart={data.diagram} id={diagramId} />
        </div>
      )}
    </div>
  );
};

// ============================================================================
// PaRDeS View - Four Levels of Interpretation
// ============================================================================
const PardesView = ({ data, showDiagram, diagramId }) => {
  const levels = [
    { key: 'pshat', hebrew: 'פְּשָׁט', color: '#3b82f6', icon: '📖' },
    { key: 'remez', hebrew: 'רֶמֶז', color: '#8b5cf6', icon: '🔮' },
    { key: 'drash', hebrew: 'דְּרָשׁ', color: '#10b981', icon: '📜' },
    { key: 'sod', hebrew: 'סוֹד', color: '#f59e0b', icon: '✨' }
  ];

  return (
    <div className="pardes-view">
      {data.summary && (
        <div className="context-banner pardes-banner">
          <span className="pardes-title">🌳 פַּרְדֵּס - The Four Levels</span>
          <p>{data.summary}</p>
        </div>
      )}

      <div className="pardes-levels">
        {levels.map(({ key, hebrew, color, icon }) => {
          const levelData = data[key];
          if (!levelData) return null;

          return (
            <div key={key} className="pardes-level" style={{ '--level-color': color }}>
              <div className="level-header">
                <span className="level-icon">{icon}</span>
                <span className="level-hebrew">{hebrew}</span>
                <span className="level-name">{levelData.level}</span>
              </div>
              <div className="level-content">
                <p className="level-interpretation">{levelData.interpretation}</p>

                {levelData.keyWords && levelData.keyWords.length > 0 && (
                  <div className="level-keywords">
                    {levelData.keyWords.map((word, i) => (
                      <span key={i} className="keyword-chip">{word}</span>
                    ))}
                  </div>
                )}

                {levelData.hints && levelData.hints.length > 0 && (
                  <div className="level-hints">
                    <strong>Hints:</strong> {levelData.hints.join(', ')}
                  </div>
                )}

                {levelData.midrash && (
                  <div className="level-midrash">
                    <strong>Midrash:</strong> {levelData.midrash}
                  </div>
                )}

                {levelData.lesson && (
                  <div className="level-lesson">
                    <strong>Lesson:</strong> {levelData.lesson}
                  </div>
                )}

                {levelData.concept && (
                  <div className="level-concept">
                    <strong>Mystical Concept:</strong> {levelData.concept}
                  </div>
                )}

                {levelData.commentator && (
                  <div className="level-source">
                    <span className="source-badge">📚 {levelData.commentator}</span>
                  </div>
                )}

                {levelData.source && (
                  <div className="level-source">
                    <span className="source-badge">📚 {levelData.source}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {data.synthesis && (
        <InfoCard icon="🔗" title="Synthesis - How the Levels Connect" highlight>
          <p>{data.synthesis}</p>
        </InfoCard>
      )}

      {showDiagram && data.diagram && (
        <div className="diagram-section">
          <h4>🗺️ PaRDeS Structure</h4>
          <MermaidDiagram chart={data.diagram} id={diagramId} />
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Mussar View - Ethical/Character Development
// ============================================================================
const MussarView = ({ data, showDiagram, diagramId }) => {
  return (
    <div className="mussar-view">
      {data.summary && (
        <div className="context-banner mussar-banner">
          <span className="mussar-title">💎 מוּסָר - Character Development</span>
          <p>{data.summary}</p>
        </div>
      )}

      {/* Middot Section */}
      {data.middot && data.middot.length > 0 && (
        <div className="middot-section">
          <h4>📿 Middot to Develop</h4>
          <div className="middot-grid">
            {data.middot.map((middah, i) => (
              <div key={i} className="middah-card">
                <div className="middah-header">
                  <span className="middah-hebrew">{middah.trait}</span>
                  <span className="middah-english">{middah.translation}</span>
                </div>
                <p className="middah-definition">{middah.definition}</p>
                {middah.howToWork && (
                  <div className="middah-practice">
                    <strong>How to Work:</strong>
                    <p>{middah.howToWork}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mussar Teaching */}
      {data.mussar_teaching && (
        <InfoCard icon="📖" title={`Teaching from ${data.mussar_teaching.source || 'Mussar Masters'}`}>
          <p className="teaching-text">{data.mussar_teaching.teaching}</p>
          {data.mussar_teaching.practice && (
            <div className="teaching-practice">
              <strong>Daily Practice:</strong> {data.mussar_teaching.practice}
            </div>
          )}
        </InfoCard>
      )}

      {/* Cheshbon HaNefesh */}
      {data.cheshbon_hanefesh && (
        <InfoCard icon="🪞" title="חשבון הנפש - Self-Examination" className="cheshbon-card">
          {data.cheshbon_hanefesh.questions && (
            <div className="cheshbon-questions">
              <strong>Questions to Ask Yourself:</strong>
              <ul>
                {data.cheshbon_hanefesh.questions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
          )}
          {data.cheshbon_hanefesh.warning && (
            <div className="cheshbon-warning">
              <span className="warning-icon">⚠️</span>
              <span>{data.cheshbon_hanefesh.warning}</span>
            </div>
          )}
          {data.cheshbon_hanefesh.encouragement && (
            <div className="cheshbon-encouragement">
              <span className="encouragement-icon">💪</span>
              <span>{data.cheshbon_hanefesh.encouragement}</span>
            </div>
          )}
        </InfoCard>
      )}

      {/* Daily Practice */}
      {data.daily_practice && (
        <div className="daily-practice-section">
          <h4>🌅 Daily Practice Schedule</h4>
          <div className="practice-timeline">
            {data.daily_practice.morning && (
              <div className="practice-item morning">
                <span className="time-icon">🌅</span>
                <div className="practice-content">
                  <strong>Morning Kavanah</strong>
                  <p>{data.daily_practice.morning}</p>
                </div>
              </div>
            )}
            {data.daily_practice.during_day && (
              <div className="practice-item day">
                <span className="time-icon">☀️</span>
                <div className="practice-content">
                  <strong>During the Day</strong>
                  <p>{data.daily_practice.during_day}</p>
                </div>
              </div>
            )}
            {data.daily_practice.evening && (
              <div className="practice-item evening">
                <span className="time-icon">🌙</span>
                <div className="practice-content">
                  <strong>Evening Reflection</strong>
                  <p>{data.daily_practice.evening}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Topics */}
      {data.topics && data.topics.length > 0 && (
        <div className="topics-footer">
          {data.topics.map((topic, i) => <TopicTag key={i} topic={topic} />)}
        </div>
      )}

      {showDiagram && data.diagram && (
        <div className="diagram-section">
          <h4>🗺️ Growth Path</h4>
          <MermaidDiagram chart={data.diagram} id={diagramId} />
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Summary View (Default) - Enhanced
// ============================================================================
const SummaryView = ({ data, showDiagram, diagramId }) => {
  // Extract key concepts for visual flow if no diagram
  const keyConceptsFlow = useMemo(() => {
    if (data.relatedConcepts && data.relatedConcepts.length >= 2) {
      return data.relatedConcepts.slice(0, 4);
    }
    return null;
  }, [data.relatedConcepts]);

  return (
    <div className="summary-view">
      {/* Topics Bar */}
      {data.topics && data.topics.length > 0 && (
        <div className="topics-bar">
          {data.topics.map((topic, i) => <TopicTag key={i} topic={topic} />)}
        </div>
      )}

      {/* Main Summary Card */}
      {data.summary && (
        <InfoCard icon="📝" title="Summary" className="summary-main-card">
          <p className="summary-text">{data.summary}</p>
        </InfoCard>
      )}

      {/* Key Points - Visual List */}
      {data.keyPoints && data.keyPoints.length > 0 && (
        <div className="key-points-section">
          <h4>🎯 Key Points</h4>
          <div className="key-points-visual">
            {data.keyPoints.map((point, i) => (
              <div key={i} className="key-point-card">
                <div className="point-number">{i + 1}</div>
                <div className="point-text">{point}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Diagram or Concept Flow */}
      {showDiagram && data.diagram && (
        <div className="diagram-section">
          <h4>🗺️ Concept Map</h4>
          <MermaidDiagram chart={data.diagram} id={diagramId} />
        </div>
      )}

      {/* Concept Flow as Alternative */}
      {(!data.diagram || !showDiagram) && keyConceptsFlow && (
        <div className="concept-flow-section">
          <h4>🔗 Concept Flow</h4>
          <ConceptFlow concepts={keyConceptsFlow} />
        </div>
      )}

      {/* Practical Lesson - Highlighted */}
      {data.practicalLesson && (
        <InfoCard icon="💡" title="Practical Takeaway" highlight>
          <p className="practical-text">{data.practicalLesson}</p>
        </InfoCard>
      )}

      {/* Related Concepts */}
      {data.relatedConcepts && data.relatedConcepts.length > 0 && (
        <div className="related-section">
          <h4>🔗 Related Concepts</h4>
          <div className="related-chips">
            {data.relatedConcepts.map((c, i) => (
              <span key={i} className="related-chip">{c}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================
const CommentarySummary = ({ commentaryText, source = 'Commentary', verse = '', onClose }) => {
  const [mode, setMode] = useState(ANALYSIS_MODES.SUMMARY);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [showDiagram, setShowDiagram] = useState(true);

  const analyze = useCallback(async (selectedMode) => {
    if (!commentaryText || commentaryText.trim().length < 20) {
      setError('Commentary text is too short to analyze');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await analyzeCommentary(commentaryText, source, verse, selectedMode);
      if (result.success) {
        setData(result);
      } else {
        setError(result.error || 'Analysis failed');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [commentaryText, source, verse]);

  useEffect(() => {
    analyze(mode);
  }, [mode, analyze]);

  const handleModeChange = (newMode) => {
    setMode(newMode);
    setData(null);
  };

  const diagramId = useMemo(() =>
    `${source}-${verse}-${mode}`.replace(/[^a-zA-Z0-9]/g, '-'),
    [source, verse, mode]
  );

  const renderContent = () => {
    if (!data) return null;

    switch (mode) {
      case ANALYSIS_MODES.STUDY_QUESTIONS:
        return <StudyQuestionsView data={data} />;
      case ANALYSIS_MODES.KEY_TERMS:
        return <KeyTermsView data={data} />;
      case ANALYSIS_MODES.DEEP_STUDY:
        return <DeepStudyView data={data} showDiagram={showDiagram} diagramId={diagramId} />;
      case ANALYSIS_MODES.COMPARE:
        return <CompareView data={data} showDiagram={showDiagram} diagramId={diagramId} />;
      case ANALYSIS_MODES.PARDES:
        return <PardesView data={data} showDiagram={showDiagram} diagramId={diagramId} />;
      case ANALYSIS_MODES.MUSSAR:
        return <MussarView data={data} showDiagram={showDiagram} diagramId={diagramId} />;
      default:
        return <SummaryView data={data} showDiagram={showDiagram} diagramId={diagramId} />;
    }
  };

  return (
    <div className="commentary-summary">
      {/* Header */}
      <div className="summary-header">
        <div className="header-left">
          <span className="summary-icon">🤖</span>
          <span className="header-title">AI Study Assistant</span>
          <span className="header-source">{source}</span>
        </div>
        <div className="header-actions">
          {data?.diagram && (
            <button
              className={`header-btn ${showDiagram ? 'active' : ''}`}
              onClick={() => setShowDiagram(!showDiagram)}
              title={showDiagram ? 'Hide diagram' : 'Show diagram'}
            >
              📊
            </button>
          )}
          <button
            className="header-btn"
            onClick={() => analyze(mode)}
            title="Regenerate"
            disabled={loading}
          >
            🔄
          </button>
          {onClose && (
            <button className="header-btn close" onClick={onClose}>×</button>
          )}
        </div>
      </div>

      {/* Mode Selector */}
      <ModeSelector currentMode={mode} onModeChange={handleModeChange} loading={loading} />

      {/* Content Area */}
      <div className="summary-content">
        {/* Loading State */}
        {loading && (
          <div className="loading-content">
            <div className="loading-spinner"></div>
            <p className="loading-text">Analyzing with AI...</p>
            <p className="loading-sub">
              {mode === ANALYSIS_MODES.DEEP_STUDY ? 'Deep scholarly analysis...' :
               mode === ANALYSIS_MODES.STUDY_QUESTIONS ? 'Generating study questions...' :
               mode === ANALYSIS_MODES.KEY_TERMS ? 'Extracting key terms...' :
               mode === ANALYSIS_MODES.COMPARE ? 'Comparing approaches...' :
               mode === ANALYSIS_MODES.PARDES ? 'Analyzing four levels of interpretation...' :
               mode === ANALYSIS_MODES.MUSSAR ? 'Extracting ethical teachings...' :
               'Creating summary...'}
            </p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="error-content">
            <div className="error-icon">❌</div>
            <p className="error-message">{error}</p>
            <button className="retry-btn" onClick={() => analyze(mode)}>
              🔄 Try Again
            </button>
          </div>
        )}

        {/* Main Content */}
        {!loading && !error && data && renderContent()}
      </div>

      {/* Footer */}
      {data && !loading && (
        <div className="summary-footer">
          <span className="footer-info">
            {data.fromCache ? '⚡ Cached' : `🤖 ${data.model || 'Llama 3.3'}`}
          </span>
          {data.usage && !data.fromCache && (
            <span className="footer-tokens">{data.usage.total_tokens} tokens</span>
          )}
        </div>
      )}
    </div>
  );
};

export default CommentarySummary;
