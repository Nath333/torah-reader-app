/**
 * AIResultRenderers - Result rendering components for AI analysis
 * Handles different visualization types for Torah/Talmud analysis results
 */
import React, { useState } from 'react';
import { ANALYSIS_MODES } from '../../../services/groqService';
import { ALL_MODES } from './ModeGrid';
import DisagreementVisualization from '../DisagreementVisualization';
import HalachicChainVisualization from '../HalachicChainVisualization';
// Reserved for semantic networks visualization
// eslint-disable-next-line no-unused-vars
import KnowledgeGraph from '../KnowledgeGraph';
import '../DisagreementVisualization.css';
import '../HalachicChainVisualization.css';
import '../KnowledgeGraph.css';

// Shared components extracted to renderers/SharedComponents.js
import { ResultSection, KeyPointsList, RAGIndicator } from './renderers/SharedComponents';

// Re-export for backward compatibility
export { ResultSection, KeyPointsList, LoadingSkeleton } from './renderers/SharedComponents';

// Tree Result Component with Language Toggle (Bilingual)
export const TreeResultComponent = ({ data }) => {
  const [lang, setLang] = useState('both');
  const colorMap = {
    blue: '#6ba3d6',
    green: '#7eb88a',
    purple: '#a78bfa',
    gold: '#c9a227',
    pink: '#d6a3b5',
    red: '#ef4444'
  };
  const showEn = lang === 'en' || lang === 'both';
  const showHe = lang === 'he' || lang === 'both';

  return (
    <div className="tree-result">
      <div className="tree-header">
        <span className="tree-badge">🌲 Concept Tree</span>
        <div className="tree-titles">
          {showEn && data.title && <span className="tree-title">{data.title}</span>}
          {showHe && data.titleHebrew && <span className="tree-title-hebrew" dir="rtl">{data.titleHebrew}</span>}
        </div>
        {data.verseRange && <span className="tree-verse-range">📖 {data.verseRange}</span>}
        <div className="tree-lang-toggle">
          <button className={`lang-btn ${lang === 'en' ? 'active' : ''}`} onClick={() => setLang('en')}>EN</button>
          <button className={`lang-btn ${lang === 'both' ? 'active' : ''}`} onClick={() => setLang('both')}>EN/עב</button>
          <button className={`lang-btn ${lang === 'he' ? 'active' : ''}`} onClick={() => setLang('he')}>עב</button>
        </div>
      </div>
      {data.root && (
        <div className="tree-root">
          <div className="root-content">
            {data.root.hebrew && <span className="root-hebrew" dir="rtl">{data.root.hebrew}</span>}
            {showEn && <span className="root-concept">{data.root.concept}</span>}
            {showHe && data.root.conceptHebrew && <span className="root-concept-hebrew" dir="rtl">{data.root.conceptHebrew}</span>}
          </div>
          {showEn && data.root.description && <p className="root-description">{data.root.description}</p>}
          {showHe && data.root.descriptionHebrew && <p className="root-description-hebrew" dir="rtl">{data.root.descriptionHebrew}</p>}
        </div>
      )}
      {data.branches?.map((branch, i) => (
        <div key={branch.id || i} className="tree-branch" style={{ '--branch-color': colorMap[branch.color] || colorMap.gold }}>
          <div className="branch-header">
            <span>{branch.icon || '📌'}</span>
            {showEn && <span className="branch-theme">{branch.theme}</span>}
            {showHe && branch.themeHebrew && <span className="branch-theme-hebrew" dir="rtl">{branch.themeHebrew}</span>}
            <span className="branch-id">{branch.id}</span>
            {branch.verseRef && <span className="branch-verse-ref">📖 {branch.verseRef}</span>}
          </div>
          {showEn && branch.description && <p className="branch-description">{branch.description}</p>}
          {showHe && branch.descriptionHebrew && <p dir="rtl">{branch.descriptionHebrew}</p>}
          {branch.leaves?.map((leaf, j) => (
            <div key={j} className="tree-leaf">
              <span>└─</span>
              {showEn && <span>{leaf.point}</span>}
              {showHe && leaf.pointHebrew && <span dir="rtl">{leaf.pointHebrew}</span>}
              {leaf.source && <span className="leaf-source">— {leaf.source}</span>}
            </div>
          ))}
        </div>
      ))}
      {data.connections?.map((conn, i) => (
        <div key={i} className="tree-connection">
          <span>{conn.from} ↔ {conn.to}</span>
          {showEn && <span>{conn.relationship}</span>}
        </div>
      ))}
      {data.practicalRoot && <div className="tree-practical">💡 {showEn ? data.practicalRoot : data.practicalRootHebrew}</div>}
      {data.studyPath && <div className="tree-study-path">📚 {showEn ? data.studyPath : data.studyPathHebrew}</div>}
    </div>
  );
};

// Sugya Flow Result Component (Talmudic discourse analysis)
// Handles both legacy format and new groqService schema
export const SugyaFlowResult = ({ data }) => {
  const {
    sugyaOverview,
    structuralAnalysis,
    discourseFlow,
    halachicImplications,
    // New schema fields from groqService
    summary,
    exchanges,
    methodology,
    resolution,
    practicalHalacha,
    keyPoints,
    novelInsight
  } = data;

  const stepTypeColors = {
    mishna: '#10b981',
    question: '#f59e0b',
    statement: '#3b82f6',
    objection: '#ef4444',
    proof: '#8b5cf6',
    resolution: '#06b6d4',
    conclusion: '#ec4899',
    source: '#10b981',
    answer: '#3b82f6'
  };

  // Handle sugyaOverview as string or object
  const overviewText = typeof sugyaOverview === 'string' ? sugyaOverview : sugyaOverview?.mainTopic;
  const overviewType = typeof sugyaOverview === 'object' ? sugyaOverview?.type : null;

  return (
    <div className="sugya-flow-result">
      {/* Summary (new schema) */}
      {summary && (
        <div className="sugya-summary">
          <p className="result-text">{summary}</p>
        </div>
      )}

      {/* Overview */}
      {(sugyaOverview || overviewText) && (
        <div className="sugya-overview">
          <div className="sugya-overview-header">
            <span className="sugya-badge">🌊 Sugya Flow</span>
            {overviewType && <span className="sugya-type">{overviewType}</span>}
          </div>
          {overviewText && <h3 className="sugya-topic">{overviewText}</h3>}
        </div>
      )}

      {/* Structural Analysis (legacy) */}
      {structuralAnalysis && (
        <div className="structural-analysis">
          {structuralAnalysis.hasMishna && structuralAnalysis.mishnaContent && (
            <div className="mishna-box">
              <span className="mishna-label">📜 מתני׳ (Mishna)</span>
              <p>{structuralAnalysis.mishnaContent}</p>
            </div>
          )}
          <div className="structure-meta">
            <span>Total Steps: {structuralAnalysis.totalSteps || discourseFlow?.length || '?'}</span>
          </div>
        </div>
      )}

      {/* Discourse Flow - handles both content and summary fields */}
      {discourseFlow && discourseFlow.length > 0 && (
        <div className="discourse-flow">
          <h4>📊 Discourse Flow</h4>
          <div className="flow-timeline">
            {discourseFlow.map((step, i) => (
              <div
                key={i}
                className={`flow-step ${step.type?.toLowerCase().replace(/[^a-z]/g, '') || 'statement'}`}
                style={{ '--step-color': stepTypeColors[step.type?.toLowerCase().split('/')[0]] || '#6b7280' }}
              >
                <div className="step-marker">
                  <span className="step-num">{step.step || i + 1}</span>
                  <span className="step-type">{step.type}</span>
                </div>
                <div className="step-content">
                  {step.marker && (
                    <span className="discourse-marker" dir="rtl">{step.marker}</span>
                  )}
                  {step.speaker && (
                    <span className="step-speaker">{step.speaker}</span>
                  )}
                  {/* Handle both content (new) and summary (legacy) */}
                  <p className="step-summary">{step.content || step.summary}</p>
                  {step.hebrewKey && (
                    <span className="step-hebrew" dir="rtl">{step.hebrewKey}</span>
                  )}
                </div>
                {i < discourseFlow.length - 1 && <div className="flow-connector" />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Exchanges (new schema) */}
      {exchanges && exchanges.length > 0 && (
        <div className="talmud-exchanges">
          <h4>💬 Dialectic Exchanges</h4>
          {exchanges.map((ex, i) => (
            <div key={i} className="exchange-item">
              {ex.question && (
                <div className="exchange-question">
                  <span className="ex-label">❓ Question:</span>
                  <p>{ex.question}</p>
                </div>
              )}
              {ex.answer && (
                <div className="exchange-answer">
                  <span className="ex-label">💡 Answer:</span>
                  <p>{ex.answer}</p>
                </div>
              )}
              {ex.refutation && (
                <div className="exchange-refutation">
                  <span className="ex-label">⚡ Refutation:</span>
                  <p>{ex.refutation}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Methodology (new schema) */}
      {methodology && (
        <div className="sugya-methodology">
          <h4>🔧 Methodology</h4>
          <p>{methodology}</p>
        </div>
      )}

      {/* Resolution (new schema) */}
      {resolution && (
        <div className="sugya-resolution">
          <h4>✓ Resolution</h4>
          <p>{resolution}</p>
        </div>
      )}

      {/* Practical Halacha (new schema) */}
      {practicalHalacha && (
        <div className="sugya-halacha">
          <h4>⚖️ Practical Halacha</h4>
          <p>{practicalHalacha}</p>
        </div>
      )}

      {/* Halachic Implications (legacy) */}
      {halachicImplications && (
        <div className="sugya-halacha">
          <h4>⚖️ Halachic Implications</h4>
          {halachicImplications.mainRuling && (
            <div className="main-ruling">
              <strong>Main Ruling:</strong> {halachicImplications.mainRuling}
            </div>
          )}
          {halachicImplications.practicalApplication && (
            <p className="practical-app">{halachicImplications.practicalApplication}</p>
          )}
        </div>
      )}

      {/* Key Points (new schema) */}
      {keyPoints && keyPoints.length > 0 && (
        <div className="sugya-keypoints">
          <h4>📝 Key Points</h4>
          <KeyPointsList points={keyPoints} />
        </div>
      )}

      {/* Novel Insight (new schema) */}
      {novelInsight && (
        <div className="sugya-insight">
          <h4>💡 Novel Insight</h4>
          <p>{novelInsight}</p>
        </div>
      )}
    </div>
  );
};

// Shakla VeTarya Result Component (Dialectic analysis)
export const ShaklaVetaryaResult = ({ data }) => {
  const { dialecticOverview, exchanges, methodology, conclusion } = data;

  const moveTypeIcons = {
    kushya: '❓',
    tiruts: '💡',
    pirka: '⚡',
    raaya: '📜',
    svara: '🧠',
    hava_amina: '💭',
    maskana: '✓'
  };

  return (
    <div className="shakla-vetarya-result">
      {/* Overview */}
      {dialecticOverview && (
        <div className="dialectic-overview">
          <div className="dialectic-header">
            <span className="dialectic-badge">⚔️ שקלא וטריא</span>
            <span className="exchange-count">{dialecticOverview.numberOfExchanges} exchanges</span>
          </div>
          <h3 className="main-question">{dialecticOverview.mainQuestion}</h3>
          {dialecticOverview.finalOutcome && (
            <p className="final-outcome">
              <strong>Resolution:</strong> {dialecticOverview.finalOutcome}
            </p>
          )}
        </div>
      )}

      {/* Exchanges */}
      {exchanges && exchanges.length > 0 && (
        <div className="dialectic-exchanges">
          <h4>💬 The Exchange</h4>
          {exchanges.map((exchange, i) => (
            <div key={i} className="exchange-pair">
              {/* Challenge */}
              {exchange.challenge && (
                <div className="challenge-box">
                  <div className="move-header">
                    <span className="move-icon">{moveTypeIcons[exchange.challenge.type?.toLowerCase()] || '❓'}</span>
                    <span className="move-type">קושיא ({exchange.challenge.type})</span>
                    {exchange.challenge.source && (
                      <span className="move-source">{exchange.challenge.source}</span>
                    )}
                  </div>
                  <p className="move-content">{exchange.challenge.content}</p>
                  {exchange.challenge.hebrewQuote && (
                    <blockquote className="hebrew-quote" dir="rtl">{exchange.challenge.hebrewQuote}</blockquote>
                  )}
                </div>
              )}

              {/* Response */}
              {exchange.response && (
                <div className="response-box">
                  <div className="move-header">
                    <span className="move-icon">{moveTypeIcons[exchange.response.type?.toLowerCase()] || '💡'}</span>
                    <span className="move-type">תירוץ ({exchange.response.type})</span>
                    {exchange.response.source && (
                      <span className="move-source">{exchange.response.source}</span>
                    )}
                  </div>
                  <p className="move-content">{exchange.response.content}</p>
                  {exchange.response.hebrewQuote && (
                    <blockquote className="hebrew-quote" dir="rtl">{exchange.response.hebrewQuote}</blockquote>
                  )}
                </div>
              )}

              {/* Outcome */}
              {exchange.outcome && (
                <div className="exchange-outcome">
                  <span className="outcome-label">Outcome:</span> {exchange.outcome}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Methodology */}
      {methodology && methodology.length > 0 && (
        <div className="talmudic-methods">
          <h4>🔧 Talmudic Methods Used</h4>
          <div className="methods-list">
            {methodology.map((method, i) => (
              <span key={i} className="method-tag">{method}</span>
            ))}
          </div>
        </div>
      )}

      {/* Conclusion */}
      {conclusion && (
        <div className="dialectic-conclusion">
          <h4>📋 Conclusion</h4>
          <p>{conclusion}</p>
        </div>
      )}
    </div>
  );
};

// Sugya Summary Result Component (Quick overview)
export const SugyaSummaryResult = ({ data }) => {
  const { title, oneLineSummary, background, structure, keyQuestion, mainPositions, resolution, bottomLine, keyTerms } = data;

  return (
    <div className="sugya-summary-result">
      {/* Header */}
      <div className="summary-header">
        <span className="summary-badge">📋 Sugya Summary</span>
        {title && <h3 className="summary-title">{title}</h3>}
      </div>

      {/* One Line */}
      {oneLineSummary && (
        <div className="one-line-box">
          <p>{oneLineSummary}</p>
        </div>
      )}

      {/* Background */}
      {background && (
        <div className="summary-section background-section">
          <h4>📚 Background</h4>
          <p>{background}</p>
        </div>
      )}

      {/* Structure */}
      {structure && (
        <div className="summary-section structure-section">
          <h4>🏗️ Structure</h4>
          {structure.mishna && (
            <div className="structure-item">
              <strong>Mishna:</strong> {structure.mishna}
            </div>
          )}
          {structure.gemara && (
            <div className="structure-item">
              <strong>Gemara:</strong> {structure.gemara}
            </div>
          )}
        </div>
      )}

      {/* Key Question */}
      {keyQuestion && (
        <div className="summary-section question-section">
          <h4>❓ Key Question</h4>
          <p className="key-question-text">{keyQuestion}</p>
        </div>
      )}

      {/* Main Positions */}
      {mainPositions && mainPositions.length > 0 && (
        <div className="summary-section positions-section">
          <h4>⚖️ Main Positions</h4>
          <div className="positions-list">
            {mainPositions.map((pos, i) => (
              <div key={i} className="position-card">
                <div className="position-header">
                  <span className="position-holder">{pos.holder}</span>
                </div>
                <p className="position-view">{pos.position}</p>
                {pos.reasoning && (
                  <p className="position-reasoning">
                    <em>Reasoning:</em> {pos.reasoning}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resolution */}
      {resolution && (
        <div className="summary-section resolution-section">
          <h4>✓ Resolution</h4>
          <p>{resolution}</p>
        </div>
      )}

      {/* Bottom Line */}
      {bottomLine && (
        <div className="bottom-line-box">
          <span className="bottom-line-icon">🎯</span>
          <p>{bottomLine}</p>
        </div>
      )}

      {/* Key Terms */}
      {keyTerms && keyTerms.length > 0 && (
        <div className="summary-section terms-section">
          <h4>🔤 Key Terms</h4>
          <div className="key-terms-grid">
            {keyTerms.map((term, i) => (
              <div key={i} className="key-term-item">
                <span className="term-word" dir="rtl">{term.term}</span>
                <span className="term-meaning">{term.meaning}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Passage Analysis Result Component (multi-verse IYUN)
// Enhanced professional layout with visual chiasm
export const PassageAnalysisResult = ({ data }) => {
  const {
    summary,
    storyArc,
    characters,
    themes,
    chiasm,
    structure,
    keyPoints,
    novelInsight,
    practicalMessage
  } = data;

  // Calculate chiasm visualization - creates mirror effect
  const renderChiasmVisualization = () => {
    if (!chiasm?.structure?.length) return null;
    const items = chiasm.structure;
    const half = Math.ceil(items.length / 2);

    return (
      <div className="chiasm-visual">
        {/* Upper half - increasing indent */}
        <div className="chiasm-upper">
          {items.slice(0, half).map((item, i) => (
            <div
              key={`upper-${i}`}
              className="chiasm-row"
              style={{ '--indent': i, '--level': i }}
            >
              <span className="chiasm-letter">{String.fromCharCode(65 + i)}</span>
              <span className="chiasm-text">{typeof item === 'string' ? item : item.text || JSON.stringify(item)}</span>
            </div>
          ))}
        </div>

        {/* Center point - highlighted */}
        {chiasm.center && (
          <div className="chiasm-center-point">
            <span className="chiasm-center-marker">✦</span>
            <span className="chiasm-center-text">{chiasm.center}</span>
          </div>
        )}

        {/* Lower half - decreasing indent (mirror) */}
        <div className="chiasm-lower">
          {items.slice(half).reverse().map((item, i) => (
            <div
              key={`lower-${i}`}
              className="chiasm-row mirror"
              style={{ '--indent': half - 1 - i, '--level': half - 1 - i }}
            >
              <span className="chiasm-letter">{String.fromCharCode(65 + half - 1 - i)}'</span>
              <span className="chiasm-text">{typeof item === 'string' ? item : item.text || JSON.stringify(item)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="passage-analysis-result">
      {/* Overview Card */}
      {summary && (
        <div className="passage-overview-card">
          <div className="overview-header">
            <span className="overview-icon">📜</span>
            <h3>Passage Overview</h3>
          </div>
          <p className="overview-text">{summary}</p>
        </div>
      )}

      {/* Two-column layout for Story Arc and Characters */}
      <div className="passage-grid">
        {/* Story Arc */}
        {storyArc && (
          <div className="story-arc-card">
            <h4><span className="section-icon">📖</span> Story Arc</h4>
            <div className="arc-timeline">
              {storyArc.beginning && (
                <div className="arc-step beginning">
                  <div className="arc-marker">🌅</div>
                  <div className="arc-content">
                    <span className="arc-label">Beginning</span>
                    <p>{storyArc.beginning}</p>
                  </div>
                </div>
              )}
              {storyArc.conflict && (
                <div className="arc-step conflict">
                  <div className="arc-marker">⚔️</div>
                  <div className="arc-content">
                    <span className="arc-label">Conflict</span>
                    <p>{storyArc.conflict}</p>
                  </div>
                </div>
              )}
              {storyArc.resolution && (
                <div className="arc-step resolution">
                  <div className="arc-marker">✓</div>
                  <div className="arc-content">
                    <span className="arc-label">Resolution</span>
                    <p>{storyArc.resolution}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Characters */}
        {characters && characters.length > 0 && (
          <div className="characters-card">
            <h4><span className="section-icon">👥</span> Characters</h4>
            <div className="characters-list">
              {characters.map((char, i) => (
                <div key={i} className="character-item">
                  <span className="char-name">{char.name}</span>
                  {char.role && <span className="char-role">{char.role}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Themes - Full width cards */}
      {themes && themes.length > 0 && (
        <div className="themes-section">
          <h4><span className="section-icon">🔮</span> Major Themes</h4>
          <div className="themes-cards">
            {themes.map((theme, i) => (
              <div key={i} className="theme-card">
                <div className="theme-header">
                  <span className="theme-name">{theme.name}</span>
                </div>
                <p className="theme-desc">{theme.description}</p>
                {theme.verses && theme.verses.length > 0 && (
                  <div className="theme-refs">
                    {theme.verses.map((v, j) => (
                      <span key={j} className="verse-ref">{v}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chiastic Structure - Visual representation */}
      {chiasm && (chiasm.structure?.length > 0 || chiasm.center) && (
        <div className="chiasm-section">
          <h4><span className="section-icon">🔄</span> Chiastic Structure</h4>
          {renderChiasmVisualization()}
        </div>
      )}

      {/* Structure Outline */}
      {structure && structure.outline?.length > 0 && (
        <div className="structure-section">
          <h4><span className="section-icon">🏗️</span> Structure</h4>
          <div className="structure-outline">
            {structure.outline.map((item, i) => (
              <div key={i} className="outline-item">
                <span className="outline-bullet">•</span>
                <span className="outline-text">{typeof item === 'string' ? item : JSON.stringify(item)}</span>
              </div>
            ))}
          </div>
          {structure.keyThemes && structure.keyThemes.length > 0 && (
            <div className="structure-themes">
              {structure.keyThemes.map((theme, i) => (
                <span key={i} className="theme-tag">{theme}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Key Points */}
      {keyPoints && keyPoints.length > 0 && (
        <div className="keypoints-section">
          <h4><span className="section-icon">📝</span> Key Points</h4>
          <KeyPointsList points={keyPoints} />
        </div>
      )}

      {/* Novel Insight - Highlighted */}
      {novelInsight && (
        <div className="insight-card">
          <div className="insight-header">
            <span className="insight-icon">💡</span>
            <span className="insight-label">Novel Insight</span>
          </div>
          <p className="insight-text">{novelInsight}</p>
        </div>
      )}

      {/* Practical Message - Bottom highlight */}
      {practicalMessage && (
        <div className="practical-message">
          <span className="practical-icon">🎯</span>
          <p>{practicalMessage}</p>
        </div>
      )}
    </div>
  );
};

// Iyun Result Component (standard IYUN with structure/chavrusaQuestions)
export const DeepStudyResult = ({ data }) => {
  const {
    summary,
    methodology,
    structure,
    historicalContext,
    creationThemes,
    textualBasis,
    keyPoints,
    novelInsight,
    connections
  } = data;

  return (
    <div className="deep-study-result">
      {/* Summary */}
      {summary && (
        <ResultSection title="Summary" icon="📋" color="#6366f1">
          <p className="result-text">{summary}</p>
        </ResultSection>
      )}

      {/* Methodology */}
      {methodology && (
        <ResultSection title="Methodology" icon="🔧" color="#8b5cf6">
          <p>{methodology}</p>
        </ResultSection>
      )}

      {/* Structure */}
      {structure && (structure.outline?.length > 0 || structure.keyThemes?.length > 0) && (
        <ResultSection title="Structure" icon="🏗️" color="#10b981">
          {structure.outline && structure.outline.length > 0 && (
            <div className="outline-list">
              {structure.outline.map((item, i) => (
                <div key={i} className="outline-item">{typeof item === 'string' ? item : JSON.stringify(item)}</div>
              ))}
            </div>
          )}
          {structure.keyThemes && structure.keyThemes.length > 0 && (
            <div className="key-themes">
              {structure.keyThemes.map((theme, i) => (
                <span key={i} className="theme-tag">{theme}</span>
              ))}
            </div>
          )}
        </ResultSection>
      )}

      {/* Historical Context */}
      {historicalContext && (
        <ResultSection title="Historical Context" icon="🏛️" color="#b45309">
          <p>{historicalContext}</p>
        </ResultSection>
      )}

      {/* Creation Themes (Genesis) */}
      {creationThemes && creationThemes.length > 0 && (
        <ResultSection title="Creation Themes" icon="🌅" color="#059669">
          <div className="creation-themes">
            {creationThemes.map((theme, i) => (
              <div key={i} className="creation-theme">{typeof theme === 'string' ? theme : JSON.stringify(theme)}</div>
            ))}
          </div>
        </ResultSection>
      )}

      {/* Textual Basis */}
      {textualBasis && textualBasis.length > 0 && (
        <ResultSection title="Textual Basis" icon="📖" color="#6366f1">
          <div className="textual-basis">
            {textualBasis.map((item, i) => (
              <div key={i} className="basis-item">{typeof item === 'string' ? item : JSON.stringify(item)}</div>
            ))}
          </div>
        </ResultSection>
      )}

      {/* Key Points */}
      {keyPoints && keyPoints.length > 0 && (
        <ResultSection title="Key Points" icon="📝" color="#3b82f6">
          <KeyPointsList points={keyPoints} />
        </ResultSection>
      )}

      {/* Novel Insight */}
      {novelInsight && (
        <ResultSection title="Novel Insight" icon="💡" color="#fbbf24">
          <p>{novelInsight}</p>
        </ResultSection>
      )}

      {/* Connections */}
      {connections && connections.length > 0 && (
        <ResultSection title="Connections" icon="🔗" color="#059669">
          <div className="connections-list">
            {connections.map((conn, i) => (
              <div key={i} className="connection-item">{typeof conn === 'string' ? conn : JSON.stringify(conn)}</div>
            ))}
          </div>
        </ResultSection>
      )}
    </div>
  );
};

// ============================================================================
// NEW MODE RESULT COMPONENTS
// ============================================================================

// TaamimResult - Cantillation Analysis Result
export const TaamimResult = ({ data }) => {
  const { summary, verseStructure, cantillationAnalysis, interpretiveInsights, rareMarks, deeperMeaning } = data;

  const typeColors = {
    'Disjunctive': '#ef4444',
    'Conjunctive': '#10b981'
  };

  return (
    <div className="taamim-result">
      <div className="taamim-header">
        <span className="taamim-icon">🎵</span>
        <h3>טעמי המקרא - Cantillation Analysis</h3>
      </div>

      {summary && (
        <div className="taamim-summary">
          <p>{summary}</p>
        </div>
      )}

      {verseStructure && (
        <div className="verse-structure">
          <h4>📖 Verse Structure</h4>
          {verseStructure.primaryDivision && (
            <div className="structure-item primary">
              <span className="label">Primary Division (Atnach):</span>
              <span className="value">{verseStructure.primaryDivision}</span>
            </div>
          )}
          {verseStructure.firstHalf && (
            <div className="structure-item">
              <span className="label">First Half:</span>
              <span className="value">{verseStructure.firstHalf}</span>
            </div>
          )}
          {verseStructure.secondHalf && (
            <div className="structure-item">
              <span className="label">Second Half:</span>
              <span className="value">{verseStructure.secondHalf}</span>
            </div>
          )}
        </div>
      )}

      {cantillationAnalysis && cantillationAnalysis.length > 0 && (
        <div className="cantillation-marks">
          <h4>🎼 Cantillation Marks</h4>
          <div className="marks-grid">
            {cantillationAnalysis.map((item, idx) => (
              <div key={idx} className="mark-card" style={{ '--type-color': typeColors[item.type] || '#888' }}>
                <div className="mark-header">
                  <span className="mark-word" dir="rtl">{item.word}</span>
                  <span className="mark-type">{item.type}</span>
                </div>
                <div className="mark-name">{item.mark}</div>
                {item.rank && <div className="mark-rank">Rank: {item.rank}</div>}
                {item.significance && <p className="mark-significance">{item.significance}</p>}
                {item.melodicCharacter && (
                  <div className="mark-melody">🎵 {item.melodicCharacter}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {interpretiveInsights && interpretiveInsights.length > 0 && (
        <div className="interpretive-insights">
          <h4>💡 Interpretive Insights</h4>
          {interpretiveInsights.map((insight, idx) => (
            <div key={idx} className="insight-card">
              <p className="observation">{insight.observation}</p>
              {insight.textualBasis && (
                <span className="textual-basis">Based on: {insight.textualBasis}</span>
              )}
              {insight.commentarySupport && (
                <span className="commentary-support">📚 {insight.commentarySupport}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {rareMarks && rareMarks.length > 0 && (
        <div className="rare-marks">
          <h4>✨ Rare Marks</h4>
          {rareMarks.map((mark, idx) => (
            <div key={idx} className="rare-mark-card">
              <span className="rare-mark-name">{mark.mark}</span>
              <p className="rare-mark-meaning">{mark.meaning}</p>
              {mark.emotionalSignificance && (
                <p className="emotional-sig">💭 {mark.emotionalSignificance}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {deeperMeaning && (
        <div className="deeper-meaning">
          <h4>🔮 Deeper Meaning</h4>
          <p>{deeperMeaning}</p>
        </div>
      )}
    </div>
  );
};

// ShoreshResult - Root Analysis Result
export const ShoreshResult = ({ data }) => {
  const { summary, rootAnalysis, thematicInsights, studyNote } = data;

  return (
    <div className="shoresh-result">
      <div className="shoresh-header">
        <span className="shoresh-icon">🌳</span>
        <h3>שורש - Root Analysis</h3>
      </div>

      {summary && (
        <div className="shoresh-summary">
          <p>{summary}</p>
        </div>
      )}

      {rootAnalysis && rootAnalysis.length > 0 && (
        <div className="roots-grid">
          {rootAnalysis.map((root, idx) => (
            <div key={idx} className="root-card">
              <div className="root-header">
                <span className="root-letters" dir="rtl">{root.root}</span>
                <span className="root-transliteration">({root.transliteration})</span>
              </div>
              <div className="root-meaning">{root.coreMeaning}</div>

              {root.wordInVerse && (
                <div className="word-in-verse">
                  <span className="label">In verse:</span>
                  <span className="word" dir="rtl">{root.wordInVerse}</span>
                  {root.binyan && <span className="binyan">{root.binyan}</span>}
                </div>
              )}

              {root.morphology && (
                <div className="morphology">
                  {root.morphology.tense && <span className="morph-tag">{root.morphology.tense}</span>}
                  {root.morphology.person && <span className="morph-tag">{root.morphology.person}</span>}
                  {root.morphology.gender && <span className="morph-tag">{root.morphology.gender}</span>}
                  {root.morphology.number && <span className="morph-tag">{root.morphology.number}</span>}
                </div>
              )}

              {root.occurrences && (
                <div className="occurrences">
                  <div className="occ-header">
                    <span className="occ-total">{root.occurrences.total}× in Tanakh</span>
                  </div>
                  {root.occurrences.firstOccurrence && (
                    <div className="first-occ">
                      First: <span className="ref">{root.occurrences.firstOccurrence}</span>
                    </div>
                  )}
                  {root.occurrences.keyOccurrences && root.occurrences.keyOccurrences.length > 0 && (
                    <div className="key-occs">
                      {root.occurrences.keyOccurrences.slice(0, 3).map((occ, i) => (
                        <div key={i} className="key-occ">
                          <span className="ref">{occ.reference}</span>
                          <span className="context">{occ.context}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {root.usagePatterns && root.usagePatterns.length > 0 && (
                <div className="usage-patterns">
                  <h5>📊 Usage Patterns</h5>
                  {root.usagePatterns.map((pattern, i) => (
                    <div key={i} className="pattern">
                      <span className="pattern-name">{pattern.pattern}</span>
                      <p className="pattern-desc">{pattern.description}</p>
                      {pattern.theologicalImplication && (
                        <p className="pattern-implication">💡 {pattern.theologicalImplication}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {root.wordFamily && root.wordFamily.length > 0 && (
                <div className="word-family">
                  <h5>👨‍👩‍👧‍👦 Word Family</h5>
                  <div className="family-chips">
                    {root.wordFamily.map((w, i) => (
                      <span key={i} className="family-chip" dir="rtl" title={w.meaning}>
                        {w.word}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {root.cognates && (
                <div className="cognates">
                  <span className="label">Cognates:</span>
                  <span className="cognate-text">{root.cognates}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {thematicInsights && thematicInsights.length > 0 && (
        <div className="thematic-insights">
          <h4>🎯 Thematic Insights</h4>
          {thematicInsights.map((insight, idx) => (
            <div key={idx} className="thematic-card">
              <span className="theme-name">{insight.theme}</span>
              <p className="theme-insight">{insight.insight}</p>
            </div>
          ))}
        </div>
      )}

      {studyNote && (
        <div className="study-note">
          <h4>📝 Study Note</h4>
          <p>{studyNote}</p>
        </div>
      )}
    </div>
  );
};

// ChavrutaResult - Devil's Advocate / Chavruta Mode Result
export const ChavrutaResult = ({ data }) => {
  const { standardView, challenges, devilsAdvocate, textualProblems, dialecticConclusion, chavrutaChallenge } = data;

  return (
    <div className="chavruta-result">
      <div className="chavruta-header">
        <span className="chavruta-icon">🤝</span>
        <h3>חברותא - Study Partner Challenge</h3>
      </div>

      {standardView && (
        <div className="standard-view">
          <div className="view-header">
            <span className="view-icon">📖</span>
            <h4>Standard Interpretation</h4>
          </div>
          <p className="view-text">{standardView.interpretation}</p>
          {standardView.proponents && standardView.proponents.length > 0 && (
            <div className="proponents">
              <span className="label">Held by:</span>
              {standardView.proponents.map((p, i) => (
                <span key={i} className="proponent-chip">{p}</span>
              ))}
            </div>
          )}
          {standardView.reasoning && (
            <p className="reasoning">{standardView.reasoning}</p>
          )}
        </div>
      )}

      {challenges && challenges.length > 0 && (
        <div className="challenges">
          <div className="challenges-header">
            <span className="challenges-icon">⚔️</span>
            <h4>Challenges</h4>
          </div>
          {challenges.map((ch, idx) => (
            <div key={idx} className="challenge-card">
              <div className="challenger">
                <span className="challenger-name">{ch.challenger}</span>
                {ch.hebrewName && (
                  <span className="challenger-hebrew">{ch.hebrewName}</span>
                )}
              </div>
              <p className="challenge-text">{ch.challenge}</p>
              {ch.source && (
                <span className="challenge-source">📍 {ch.source}</span>
              )}
              {ch.strength && (
                <div className="challenge-strength">
                  <span className="label">Why compelling:</span>
                  <p>{ch.strength}</p>
                </div>
              )}
              {ch.yourResponse && (
                <div className="your-response">
                  <span className="label">🤔 How would you respond?</span>
                  <p>{ch.yourResponse}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {devilsAdvocate && (
        <div className="devils-advocate">
          <div className="da-header">
            <span className="da-icon">😈</span>
            <h4>Devil's Advocate</h4>
          </div>
          {devilsAdvocate.hardQuestion && (
            <div className="hard-question">
              <span className="q-label">The Hard Question:</span>
              <p className="q-text">{devilsAdvocate.hardQuestion}</p>
            </div>
          )}
          {devilsAdvocate.whyItMatters && (
            <p className="why-matters">{devilsAdvocate.whyItMatters}</p>
          )}
          {devilsAdvocate.possibleResolutions && devilsAdvocate.possibleResolutions.length > 0 && (
            <div className="resolutions">
              <h5>Possible Approaches:</h5>
              {devilsAdvocate.possibleResolutions.map((res, i) => (
                <div key={i} className="resolution-item">
                  <p className="approach">✓ {res.approach}</p>
                  <p className="weakness">✗ But: {res.weakness}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {textualProblems && textualProblems.length > 0 && (
        <div className="textual-problems">
          <h4>📜 Textual Difficulties</h4>
          {textualProblems.map((prob, idx) => (
            <div key={idx} className="problem-card">
              <p className="problem-text">{prob.problem}</p>
              {prob.whoNotices && (
                <span className="who-notices">Raised by: {prob.whoNotices}</span>
              )}
              {prob.proposedSolutions && prob.proposedSolutions.length > 0 && (
                <div className="solutions">
                  {prob.proposedSolutions.map((sol, i) => (
                    <span key={i} className="solution-chip">{sol}</span>
                  ))}
                </div>
              )}
              {prob.unresolved && (
                <p className="unresolved">❓ Remains difficult: {prob.unresolved}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {dialecticConclusion && (
        <div className="dialectic-conclusion">
          <h4>🎯 Dialectic Conclusion</h4>
          {dialecticConclusion.synthesis && (
            <p className="synthesis">{dialecticConclusion.synthesis}</p>
          )}
          {dialecticConclusion.remainingTension && (
            <p className="tension">⚡ Tension: {dialecticConclusion.remainingTension}</p>
          )}
          {dialecticConclusion.forFurtherStudy && (
            <p className="further-study">📚 For further study: {dialecticConclusion.forFurtherStudy}</p>
          )}
        </div>
      )}

      {chavrutaChallenge && (
        <div className="chavruta-challenge">
          <div className="challenge-header">
            <span className="icon">🤔</span>
            <span className="label">Chavruta Challenge</span>
          </div>
          <p className="challenge-text">{chavrutaChallenge}</p>
        </div>
      )}
    </div>
  );
};

// Shiur Preparation Result Component
export const ShiurResult = ({ data }) => {
  const {
    summary,
    shiurOutline,
    openingHook,
    keyTeachingPoints,
    boardNotes,
    discussionQuestions,
    potentialChallenges,
    practicalTakeaway,
    closingMessage,
    additionalResources
  } = data;

  return (
    <div className="shiur-result">
      {/* Summary */}
      {summary && (
        <div className="shiur-summary">
          <p>{summary}</p>
        </div>
      )}

      {/* Shiur Outline */}
      {shiurOutline && (
        <div className="shiur-outline">
          <h4>📋 Shiur Outline</h4>
          <div className="outline-card">
            <h5 className="shiur-title">{shiurOutline.title}</h5>
            <div className="outline-meta">
              {shiurOutline.duration && <span className="meta-item">⏱️ {shiurOutline.duration}</span>}
              {shiurOutline.level && <span className="meta-item level">{shiurOutline.level}</span>}
            </div>
            {shiurOutline.objectives && shiurOutline.objectives.length > 0 && (
              <div className="objectives">
                <span className="obj-label">Learning Objectives:</span>
                <ul>
                  {shiurOutline.objectives.map((obj, i) => (
                    <li key={i}>{obj}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Opening Hook */}
      {openingHook && (
        <div className="opening-hook">
          <h4>🎣 Opening Hook</h4>
          {openingHook.question && (
            <div className="hook-question">
              <span className="icon">❓</span>
              <p>{openingHook.question}</p>
            </div>
          )}
          {openingHook.storyOrMashal && (
            <div className="hook-story">
              <span className="icon">📖</span>
              <p>{openingHook.storyOrMashal}</p>
            </div>
          )}
        </div>
      )}

      {/* Key Teaching Points */}
      {keyTeachingPoints && keyTeachingPoints.length > 0 && (
        <div className="teaching-points">
          <h4>📌 Key Teaching Points</h4>
          {keyTeachingPoints.map((point, idx) => (
            <div key={idx} className="teaching-point">
              <div className="point-header">
                <span className="point-num">{idx + 1}</span>
                <span className="point-main">{point.point}</span>
              </div>
              {point.explanation && (
                <p className="point-explanation">{point.explanation}</p>
              )}
              {point.sources && point.sources.length > 0 && (
                <div className="point-sources">
                  {point.sources.map((src, i) => (
                    <span key={i} className="source-tag">📜 {src}</span>
                  ))}
                </div>
              )}
              {point.applicationQuestion && (
                <div className="application-q">
                  <span className="icon">💬</span>
                  <span>{point.applicationQuestion}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Board Notes */}
      {boardNotes && (
        <div className="board-notes">
          <h4>📝 Board Notes</h4>
          {boardNotes.hebrewTerms && boardNotes.hebrewTerms.length > 0 && (
            <div className="hebrew-terms">
              <span className="label">Hebrew terms to write:</span>
              <div className="terms-list">
                {boardNotes.hebrewTerms.map((term, i) => (
                  <span key={i} className="term-chip">{term}</span>
                ))}
              </div>
            </div>
          )}
          {boardNotes.structureOutline && (
            <div className="structure-outline">
              <span className="label">Structure:</span>
              <p>{boardNotes.structureOutline}</p>
            </div>
          )}
        </div>
      )}

      {/* Discussion Questions */}
      {discussionQuestions && discussionQuestions.length > 0 && (
        <div className="discussion-questions">
          <h4>💬 Discussion Questions</h4>
          {discussionQuestions.map((q, idx) => (
            <div key={idx} className="discussion-item">
              <p className="question">{q.question}</p>
              {q.possibleAnswers && q.possibleAnswers.length > 0 && (
                <div className="possible-answers">
                  <span className="label">Possible answers:</span>
                  {q.possibleAnswers.map((ans, i) => (
                    <span key={i} className="answer-chip">→ {ans}</span>
                  ))}
                </div>
              )}
              {q.followUp && (
                <p className="follow-up">📢 Follow up: {q.followUp}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Potential Challenges */}
      {potentialChallenges && potentialChallenges.length > 0 && (
        <div className="challenges">
          <h4>⚠️ Potential Challenges</h4>
          {potentialChallenges.map((challenge, idx) => (
            <div key={idx} className="challenge-item">
              <p className="difficulty">❓ {challenge.difficulty}</p>
              {challenge.response && (
                <p className="response">✓ {challenge.response}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Practical Takeaway */}
      {practicalTakeaway && (
        <div className="practical-takeaway">
          <h4>💡 Practical Takeaway</h4>
          {practicalTakeaway.actionItem && (
            <p className="action-item">
              <span className="icon">✓</span> {practicalTakeaway.actionItem}
            </p>
          )}
          {practicalTakeaway.dailyApplication && (
            <p className="daily-app">
              <span className="icon">🔄</span> {practicalTakeaway.dailyApplication}
            </p>
          )}
        </div>
      )}

      {/* Closing Message */}
      {closingMessage && (
        <div className="closing-message">
          <h4>🎯 Closing Message</h4>
          <p>{closingMessage}</p>
        </div>
      )}

      {/* Additional Resources */}
      {additionalResources && additionalResources.length > 0 && (
        <div className="additional-resources">
          <h4>📚 Additional Resources</h4>
          <ul>
            {additionalResources.map((resource, i) => (
              <li key={i}>{resource}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// Nafka Mina Result Component - Practical Differences Analysis
// THE key yeshiva question: "Mai nafka mina?"
// =============================================================================
export const NafkaMinaResult = ({ data }) => {
  const {
    summary,
    disputes,
    interpretiveDifferences,
    practicalSummary,
    overallNafkaMina,
    chainToHalacha,
    whyItMatters,
    actionItem,
    studyTakeaway
  } = data;

  return (
    <div className="nafka-mina-result">
      {/* Header */}
      <div className="nafka-mina-header">
        <span className="nafka-icon">🎯</span>
        <h3>מאי נפקא מינה? — What's the Practical Difference?</h3>
      </div>

      {/* Summary */}
      {summary && (
        <div className="nafka-summary">
          <p>{summary}</p>
        </div>
      )}

      {/* Disputes (Talmud mode) */}
      {disputes && disputes.length > 0 && (
        <div className="nafka-disputes">
          {disputes.map((dispute, idx) => (
            <div key={idx} className="dispute-card">
              <div className="dispute-header">
                <span className="dispute-icon">⚖️</span>
                <h4>{dispute.topic}</h4>
              </div>

              {/* Positions */}
              {dispute.positions && dispute.positions.length > 0 && (
                <div className="positions-grid">
                  {dispute.positions.map((pos, i) => (
                    <div key={i} className="position-card" style={{ '--position-color': i === 0 ? '#3b82f6' : '#10b981' }}>
                      <div className="position-header">
                        <span className="position-holder">{pos.holder}</span>
                      </div>
                      <p className="position-view">{pos.view}</p>
                      {pos.reasoning && (
                        <p className="position-reasoning"><em>Why: {pos.reasoning}</em></p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* The Nafka Mina */}
              {dispute.nafkaMina && (
                <div className="nafka-mina-box">
                  <div className="nafka-label">
                    <span className="nafka-badge">נ״מ</span>
                    <span>Practical Difference</span>
                  </div>
                  {dispute.nafkaMina.scenario && (
                    <p className="scenario"><strong>Scenario:</strong> {dispute.nafkaMina.scenario}</p>
                  )}
                  {dispute.nafkaMina.accordingTo && dispute.nafkaMina.accordingTo.map((view, j) => (
                    <div key={j} className="according-to">
                      <span className="view-marker">→</span>
                      <strong>{view.position}:</strong> {view.outcome}
                      {view.example && <span className="example"> (e.g., {view.example})</span>}
                    </div>
                  ))}
                  {dispute.nafkaMina.halachicConclusion && (
                    <div className="halachic-conclusion">
                      <span className="conclusion-icon">⚖️</span>
                      <strong>Halacha:</strong> {dispute.nafkaMina.halachicConclusion}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Interpretive Differences (Torah mode) */}
      {interpretiveDifferences && interpretiveDifferences.length > 0 && (
        <div className="interpretive-differences">
          {interpretiveDifferences.map((diff, idx) => (
            <div key={idx} className="difference-card">
              <div className="diff-header">
                <span className="diff-icon">📖</span>
                <h4>{diff.topic}</h4>
              </div>

              {/* Interpretations side by side */}
              {diff.interpretations && diff.interpretations.length > 0 && (
                <div className="interpretations-grid">
                  {diff.interpretations.map((interp, i) => (
                    <div key={i} className="interpretation-card">
                      <div className="interp-header">
                        <span className="commentator-name">{interp.commentator}</span>
                        {interp.hebrewName && (
                          <span className="commentator-hebrew" dir="rtl">{interp.hebrewName}</span>
                        )}
                      </div>
                      <p className="interp-reading">{interp.reading}</p>
                      {interp.basis && (
                        <p className="interp-basis"><em>Based on: {interp.basis}</em></p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Nafka Mina for this difference */}
              {diff.nafkaMina && (
                <div className="diff-nafka-mina">
                  <div className="nafka-label">
                    <span className="nafka-badge">נ״מ</span>
                    <span>So What Changes?</span>
                  </div>
                  {diff.nafkaMina.theological && (
                    <div className="nafka-row">
                      <span className="nafka-type">🔮 Theological:</span>
                      <span>{diff.nafkaMina.theological}</span>
                    </div>
                  )}
                  {diff.nafkaMina.behavioral && (
                    <div className="nafka-row">
                      <span className="nafka-type">🚶 Behavioral:</span>
                      <span>{diff.nafkaMina.behavioral}</span>
                    </div>
                  )}
                  {diff.nafkaMina.characterDevelopment && (
                    <div className="nafka-row">
                      <span className="nafka-type">💎 Character:</span>
                      <span>{diff.nafkaMina.characterDevelopment}</span>
                    </div>
                  )}
                  {diff.nafkaMina.concreteExample && (
                    <div className="nafka-row example">
                      <span className="nafka-type">📌 Example:</span>
                      <span>{diff.nafkaMina.concreteExample}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Overall Nafka Mina (Torah mode) */}
      {overallNafkaMina && (
        <div className="overall-nafka-mina">
          <h4>🎯 The Bottom Line</h4>
          {overallNafkaMina.majorTakeaway && (
            <p className="major-takeaway">{overallNafkaMina.majorTakeaway}</p>
          )}
          {overallNafkaMina.forDailyLife && (
            <div className="for-daily">
              <span className="daily-icon">📅</span>
              <span><strong>For Daily Life:</strong> {overallNafkaMina.forDailyLife}</span>
            </div>
          )}
          {overallNafkaMina.forCharacter && (
            <div className="for-character">
              <span className="char-icon">💎</span>
              <span><strong>For Character:</strong> {overallNafkaMina.forCharacter}</span>
            </div>
          )}
        </div>
      )}

      {/* Practical Summary (Talmud mode) */}
      {practicalSummary && (
        <div className="practical-summary">
          <h4>⚖️ Practical Summary</h4>
          {practicalSummary.whatToDo && (
            <div className="what-to-do">
              <span className="todo-icon">✓</span>
              <span>{practicalSummary.whatToDo}</span>
            </div>
          )}
          {practicalSummary.commonMistakes && practicalSummary.commonMistakes.length > 0 && (
            <div className="common-mistakes">
              <strong>⚠️ Common Mistakes:</strong>
              <ul>
                {practicalSummary.commonMistakes.map((mistake, i) => (
                  <li key={i}>{mistake}</li>
                ))}
              </ul>
            </div>
          )}
          {practicalSummary.realLifeApplication && (
            <div className="real-life">
              <span className="life-icon">🏠</span>
              <span>{practicalSummary.realLifeApplication}</span>
            </div>
          )}
        </div>
      )}

      {/* Chain to Halacha (Talmud mode) */}
      {chainToHalacha && (
        <div className="chain-to-halacha">
          <h4>📜 From Source to Practice</h4>
          <div className="halacha-chain">
            {chainToHalacha.talmud && (
              <div className="chain-step">
                <span className="chain-icon">📖</span>
                <div className="chain-content">
                  <span className="chain-label">Talmud</span>
                  <p>{chainToHalacha.talmud}</p>
                </div>
              </div>
            )}
            {chainToHalacha.rishonim && (
              <div className="chain-step">
                <span className="chain-icon">📚</span>
                <div className="chain-content">
                  <span className="chain-label">Rishonim</span>
                  <p>{chainToHalacha.rishonim}</p>
                </div>
              </div>
            )}
            {chainToHalacha.shulchanAruch && (
              <div className="chain-step">
                <span className="chain-icon">⚖️</span>
                <div className="chain-content">
                  <span className="chain-label">Shulchan Aruch</span>
                  <p>{chainToHalacha.shulchanAruch}</p>
                </div>
              </div>
            )}
            {chainToHalacha.modernPractice && (
              <div className="chain-step modern">
                <span className="chain-icon">🏠</span>
                <div className="chain-content">
                  <span className="chain-label">Modern Practice</span>
                  <p>{chainToHalacha.modernPractice}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Why It Matters */}
      {whyItMatters && (
        <div className="why-it-matters">
          <span className="why-icon">💡</span>
          <p>{whyItMatters}</p>
        </div>
      )}

      {/* Action Item */}
      {actionItem && (
        <div className="action-item-box">
          <span className="action-icon">🎯</span>
          <strong>Action Item:</strong> {actionItem}
        </div>
      )}

      {/* Study Takeaway */}
      {studyTakeaway && (
        <div className="study-takeaway">
          <span className="takeaway-icon">📝</span>
          <p>{studyTakeaway}</p>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// Mekabilot Result Component - Related Passages & Intertextual Connections
// =============================================================================
export const MekabilotResult = ({ data }) => {
  const {
    summary,
    keyTermsAndConcepts,
    parallelNarratives,
    talmudDiscussions,
    midrashicExpansions,
    halachicApplications,
    suggestedStudyPath,
    thematicWeb
  } = data;

  return (
    <div className="mekabilot-result">
      {/* Header */}
      <div className="mekabilot-header">
        <span className="mekabilot-icon">🔗</span>
        <h3>מקבילות — Related Passages</h3>
      </div>

      {/* Summary */}
      {summary && (
        <div className="mekabilot-summary">
          <p>{summary}</p>
        </div>
      )}

      {/* Key Terms and Where They Appear */}
      {keyTermsAndConcepts && keyTermsAndConcepts.length > 0 && (
        <div className="key-terms-section">
          <h4>🔤 Key Terms & Concepts</h4>
          {keyTermsAndConcepts.map((item, idx) => (
            <div key={idx} className="term-card">
              <div className="term-header">
                <span className="term-name" dir="auto">{item.term}</span>
              </div>
              {item.whereElse && item.whereElse.length > 0 && (
                <div className="term-occurrences">
                  {item.whereElse.map((occ, i) => (
                    <div key={i} className="occurrence-item">
                      <span className="occ-ref">📖 {occ.reference}</span>
                      {occ.context && <p className="occ-context">{occ.context}</p>}
                      {occ.connection && <p className="occ-connection"><em>Connection:</em> {occ.connection}</p>}
                      {occ.insight && <p className="occ-insight">💡 {occ.insight}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Parallel Narratives */}
      {parallelNarratives && parallelNarratives.length > 0 && (
        <div className="parallels-section">
          <h4>📜 Parallel Narratives</h4>
          <div className="parallels-grid">
            {parallelNarratives.map((parallel, idx) => (
              <div key={idx} className="parallel-card">
                <div className="parallel-ref">
                  <span className="ref-icon">📖</span>
                  <span>{parallel.reference}</span>
                </div>
                {parallel.similarity && (
                  <div className="parallel-row same">
                    <span className="row-label">✓ Same:</span>
                    <span>{parallel.similarity}</span>
                  </div>
                )}
                {parallel.difference && (
                  <div className="parallel-row diff">
                    <span className="row-label">✗ Different:</span>
                    <span>{parallel.difference}</span>
                  </div>
                )}
                {parallel.lesson && (
                  <div className="parallel-lesson">
                    <span className="lesson-icon">💡</span>
                    <span>{parallel.lesson}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Talmud Discussions */}
      {talmudDiscussions && talmudDiscussions.length > 0 && (
        <div className="talmud-section">
          <h4>📚 Talmud Discussions</h4>
          <div className="talmud-list">
            {talmudDiscussions.map((discussion, idx) => (
              <div key={idx} className="talmud-item">
                <div className="talmud-ref">
                  <span className="tractate">{discussion.tractate}</span>
                  <span className="daf">{discussion.daf}</span>
                </div>
                <p className="talmud-topic">{discussion.topic}</p>
                {discussion.relevance && (
                  <p className="talmud-relevance"><em>Relevance:</em> {discussion.relevance}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Midrashic Expansions */}
      {midrashicExpansions && midrashicExpansions.length > 0 && (
        <div className="midrash-section">
          <h4>📖 Midrashic Expansions</h4>
          {midrashicExpansions.map((midrash, idx) => (
            <div key={idx} className="midrash-item">
              <span className="midrash-source">{midrash.source}</span>
              <p className="midrash-teaching">{midrash.teaching}</p>
              {midrash.insight && (
                <p className="midrash-insight">💡 {midrash.insight}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Halachic Applications */}
      {halachicApplications && halachicApplications.length > 0 && (
        <div className="halachic-section">
          <h4>⚖️ Halachic Applications</h4>
          <div className="halachic-list">
            {halachicApplications.map((app, idx) => (
              <div key={idx} className="halachic-item">
                <span className="halachic-topic">{app.topic}</span>
                <span className="halachic-source">{app.source}</span>
                {app.connection && <p className="halachic-connection">{app.connection}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggested Study Path */}
      {suggestedStudyPath && suggestedStudyPath.length > 0 && (
        <div className="study-path-section">
          <h4>📚 Suggested Study Path</h4>
          <div className="study-path">
            {suggestedStudyPath.map((step, idx) => (
              <div key={idx} className="path-step">
                <span className="step-number">{step.order || idx + 1}</span>
                <div className="step-content">
                  <span className="step-source">{step.source}</span>
                  {step.reason && <span className="step-reason">{step.reason}</span>}
                </div>
                {idx < suggestedStudyPath.length - 1 && <div className="path-connector">→</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Thematic Web */}
      {thematicWeb && (
        <div className="thematic-web-section">
          <h4>🕸️ Thematic Web</h4>
          {thematicWeb.centralTheme && (
            <div className="central-theme">
              <span className="theme-icon">🎯</span>
              <strong>Central Theme:</strong> {thematicWeb.centralTheme}
            </div>
          )}
          {thematicWeb.relatedThemes && thematicWeb.relatedThemes.length > 0 && (
            <div className="related-themes">
              {thematicWeb.relatedThemes.map((theme, i) => (
                <span key={i} className="theme-tag">{theme}</span>
              ))}
            </div>
          )}
          {thematicWeb.bigPicture && (
            <div className="big-picture">
              <span className="big-icon">🌐</span>
              <p>{thematicWeb.bigPicture}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// RAGIndicator imported from ./renderers/SharedComponents

// Generic AI Result Renderer - Main component that selects appropriate renderer
export const AIResult = ({ result, mode }) => {
  if (!result) return null;

  // Handle MACHLOKET mode - Use DisagreementVisualization
  if (mode === ANALYSIS_MODES.MACHLOKET && (result.mainMachloket || result.positions)) {
    return (
      <div className="ai-result">
        {result.ragEnhanced && <RAGIndicator ragMetadata={result.ragMetadata} />}
        <DisagreementVisualization machloketData={result} />
      </div>
    );
  }

  // Handle HALACHA mode - Use HalachicChainVisualization
  if (mode === ANALYSIS_MODES.HALACHA && (result.chainOfTransmission || result.practicalApplication)) {
    return (
      <div className="ai-result">
        {result.ragEnhanced && <RAGIndicator ragMetadata={result.ragMetadata} />}
        <HalachicChainVisualization halachaData={result} />
      </div>
    );
  }

  // Handle TAAMIM mode - Cantillation Analysis
  if (mode === ANALYSIS_MODES.TAAMIM && (result.cantillationAnalysis || result.verseStructure)) {
    return (
      <div className="ai-result">
        {result.ragEnhanced && <RAGIndicator ragMetadata={result.ragMetadata} />}
        <TaamimResult data={result} />
      </div>
    );
  }

  // Handle SHORESH mode - Root Analysis
  if (mode === ANALYSIS_MODES.SHORESH && result.rootAnalysis) {
    return (
      <div className="ai-result">
        {result.ragEnhanced && <RAGIndicator ragMetadata={result.ragMetadata} />}
        <ShoreshResult data={result} />
      </div>
    );
  }

  // Handle CHAVRUTA mode - Devil's Advocate
  if (mode === ANALYSIS_MODES.CHAVRUTA && (result.standardView || result.challenges)) {
    return (
      <div className="ai-result">
        {result.ragEnhanced && <RAGIndicator ragMetadata={result.ragMetadata} />}
        <ChavrutaResult data={result} />
      </div>
    );
  }

  // Handle SHIUR mode - Lesson Preparation
  if (mode === ANALYSIS_MODES.SHIUR && (result.shiurOutline || result.keyTeachingPoints)) {
    return (
      <div className="ai-result">
        {result.ragEnhanced && <RAGIndicator ragMetadata={result.ragMetadata} />}
        <ShiurResult data={result} />
      </div>
    );
  }

  // Handle NAFKA_MINA mode - Practical Differences
  if (mode === ANALYSIS_MODES.NAFKA_MINA && (result.disputes || result.interpretiveDifferences || result.nafkaMina || result.overallNafkaMina)) {
    return (
      <div className="ai-result">
        {result.ragEnhanced && <RAGIndicator ragMetadata={result.ragMetadata} />}
        <NafkaMinaResult data={result} />
      </div>
    );
  }

  // Handle MEKABILOT mode - Related Passages
  if (mode === ANALYSIS_MODES.MEKABILOT && (result.keyTermsAndConcepts || result.parallelNarratives || result.talmudDiscussions || result.thematicWeb)) {
    return (
      <div className="ai-result">
        {result.ragEnhanced && <RAGIndicator ragMetadata={result.ragMetadata} />}
        <MekabilotResult data={result} />
      </div>
    );
  }

  // Handle IYUN with Talmud context (has sugyaOverview or discourseFlow)
  if (mode === ANALYSIS_MODES.IYUN && (result.sugyaOverview || result.discourseFlow)) {
    return (
      <div className="ai-result">
        {result.ragEnhanced && <RAGIndicator ragMetadata={result.ragMetadata} />}
        <SugyaFlowResult data={result} />
      </div>
    );
  }

  // Handle IYUN with passage context (has storyArc or chiasm or themes)
  if (mode === ANALYSIS_MODES.IYUN && (result.storyArc || result.chiasm || result.themes)) {
    return (
      <div className="ai-result">
        {result.ragEnhanced && <RAGIndicator ragMetadata={result.ragMetadata} />}
        <PassageAnalysisResult data={result} />
      </div>
    );
  }

  // Handle IYUN standard context (has structure or chavrusaQuestions)
  if (mode === ANALYSIS_MODES.IYUN && (result.structure || result.chavrusaQuestions)) {
    return (
      <div className="ai-result">
        {result.ragEnhanced && <RAGIndicator ragMetadata={result.ragMetadata} />}
        <DeepStudyResult data={result} />
      </div>
    );
  }

  const modeInfo = ALL_MODES.find(m => m.id === mode) || {};

  return (
    <div className="ai-result">
      {/* RAG Enhancement Indicator */}
      {result.ragEnhanced && <RAGIndicator ragMetadata={result.ragMetadata} />}

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

      {/* Topics */}
      {result.topics && result.topics.length > 0 && (
        <div className="result-topics">
          {result.topics.map((topic, i) => (
            <span key={i} className="topic-tag">{topic}</span>
          ))}
        </div>
      )}

      {/* PaRDeS Levels - Enhanced scholarly format */}
      {result.pshat && (
        <div className="pardes-levels">
          {/* פְּשָׁט - Pshat (Plain meaning) */}
          <ResultSection title="פְּשָׁט (Pshat) — Plain Meaning" icon="📖" color="#3b82f6">
            <p className="pardes-interpretation">
              {typeof result.pshat === 'string' ? result.pshat : result.pshat.interpretation}
            </p>
            {result.pshat.sources && result.pshat.sources.length > 0 && (
              <div className="pardes-sources">
                <strong>Sources:</strong> {result.pshat.sources.join(', ')}
              </div>
            )}
            {result.pshat.grammaticalNotes && (
              <div className="pardes-notes">
                <em>Grammar:</em> {result.pshat.grammaticalNotes}
              </div>
            )}
          </ResultSection>

          {/* רֶמֶז - Remez (Hint/Allegory) */}
          {result.remez && (
            <ResultSection title="רֶמֶז (Remez) — Hint/Allegory" icon="🔮" color="#10b981">
              <p className="pardes-interpretation">
                {typeof result.remez === 'string' ? result.remez : result.remez.interpretation}
              </p>
              {result.remez.sources && result.remez.sources.length > 0 && (
                <div className="pardes-sources">
                  <strong>Sources:</strong> {result.remez.sources.join(', ')}
                </div>
              )}
              {result.remez.symbolism && (
                <div className="pardes-notes">
                  <em>Symbolism:</em> {result.remez.symbolism}
                </div>
              )}
            </ResultSection>
          )}

          {/* דְּרַשׁ - Drash (Homiletical) */}
          {result.drash && (
            <ResultSection title="דְּרַשׁ (Drash) — Midrashic" icon="📚" color="#8b5cf6">
              <p className="pardes-interpretation">
                {typeof result.drash === 'string' ? result.drash : result.drash.interpretation}
              </p>
              {result.drash.midrashim && result.drash.midrashim.length > 0 && (
                <div className="pardes-sources">
                  <strong>Midrashim:</strong> {result.drash.midrashim.join(', ')}
                </div>
              )}
              {result.drash.ethicalLesson && (
                <div className="pardes-notes">
                  <em>Ethical lesson:</em> {result.drash.ethicalLesson}
                </div>
              )}
            </ResultSection>
          )}

          {/* סוֹד - Sod (Secret/Mystical) */}
          {result.sod && (
            <ResultSection title="סוֹד (Sod) — Mystical" icon="✨" color="#a855f7">
              <p className="pardes-interpretation">
                {typeof result.sod === 'string' ? result.sod : result.sod.interpretation}
              </p>
              {result.sod.sources && result.sod.sources.length > 0 && (
                <div className="pardes-sources">
                  <strong>Sources:</strong> {result.sod.sources.join(', ')}
                </div>
              )}
              {result.sod.sefirot && (
                <div className="pardes-notes">
                  <em>Sefirot:</em> {result.sod.sefirot}
                </div>
              )}
              {result.sod.spiritualInsight && (
                <div className="pardes-notes">
                  <em>Spiritual insight:</em> {result.sod.spiritualInsight}
                </div>
              )}
            </ResultSection>
          )}

          {/* Synthesis */}
          {result.synthesis && (
            <ResultSection title="Synthesis" icon="🔗" color="#059669">
              <p>{result.synthesis}</p>
            </ResultSection>
          )}

          {/* Study Questions */}
          {result.studyQuestions && result.studyQuestions.length > 0 && (
            <ResultSection title="Questions for Study" icon="❓" color="#f59e0b">
              <div className="questions-list">
                {result.studyQuestions.map((q, i) => (
                  <div key={i} className="question-item">
                    <span className="q-num">{i + 1}.</span>
                    <span className="q-text">{q}</span>
                  </div>
                ))}
              </div>
            </ResultSection>
          )}
        </div>
      )}

      {/* GRAMMAR: words array - Professional Steinsaltz-style lexicon layout */}
      {result.words && result.words.length > 0 && (
        <div className="grammar-lexicon">
          <div className="lexicon-header">
            <span className="lexicon-icon">📖</span>
            <h4>Lexical Analysis</h4>
            <span className="word-count">{result.words.length} words</span>
          </div>
          <div className="lexicon-entries">
            {result.words.map((word, i) => (
              <div key={i} className="lexicon-entry">
                {/* Primary Hebrew word */}
                <div className="entry-headword">
                  <span className="headword-hebrew" dir="rtl">{word.hebrew}</span>
                  {word.transliteration && <span className="headword-translit">({word.transliteration})</span>}
                </div>

                {/* Root analysis */}
                {word.root && (
                  <div className="entry-root">
                    <span className="root-label">שׁרשׁ</span>
                    <span className="root-hebrew" dir="rtl">{word.root}</span>
                    {word.rootMeaning && <span className="root-meaning">"{word.rootMeaning}"</span>}
                  </div>
                )}

                {/* Grammatical form - Binyan & morphology */}
                <div className="entry-grammar">
                  {word.binyan && (
                    <span className="grammar-binyan" title="Verb pattern">
                      <strong>Binyan:</strong> {word.binyan}
                    </span>
                  )}
                  {word.form && (
                    <span className="grammar-form">
                      <strong>Form:</strong> {word.form}
                    </span>
                  )}
                  {word.tense && <span className="grammar-tense">{word.tense}</span>}
                  {word.person && <span className="grammar-person">{word.person}</span>}
                  {word.gender && <span className="grammar-gender">{word.gender}</span>}
                  {word.number && <span className="grammar-number">{word.number}</span>}
                </div>

                {/* Definitions - numbered for clarity */}
                {word.definitions && word.definitions.length > 0 && (
                  <div className="entry-definitions">
                    {word.definitions.map((def, j) => (
                      <div key={j} className="definition-item">
                        <span className="def-number">{j + 1}.</span>
                        <span className="def-text">{def}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Usage notes */}
                {word.usage && (
                  <div className="entry-usage">
                    <span className="usage-label">Usage:</span> {word.usage}
                  </div>
                )}

                {/* Related words */}
                {word.relatedWords && word.relatedWords.length > 0 && (
                  <div className="entry-related">
                    <span className="related-label">Cf.</span>
                    {word.relatedWords.map((rw, k) => (
                      <span key={k} className="related-word" dir="rtl">{rw}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* GRAMMAR: grammaticalNotes - Scholarly notes section */}
      {result.grammaticalNotes && (
        <div className="grammar-notes">
          <div className="notes-header">
            <span className="notes-icon">✏️</span>
            <h4>Grammatical Notes</h4>
          </div>
          <div className="notes-content">
            {typeof result.grammaticalNotes === 'string' ? (
              <p>{result.grammaticalNotes}</p>
            ) : Array.isArray(result.grammaticalNotes) ? (
              result.grammaticalNotes.map((note, i) => (
                <div key={i} className="note-item">
                  {typeof note === 'string' ? note : note.note || note.text}
                </div>
              ))
            ) : null}
          </div>
        </div>
      )}

      {/* GRAMMAR: syntaxAnalysis - Sentence structure */}
      {result.syntaxAnalysis && (
        <div className="syntax-analysis">
          <div className="syntax-header">
            <span className="syntax-icon">🔍</span>
            <h4>Syntax Analysis</h4>
          </div>
          <div className="syntax-content">
            {result.syntaxAnalysis.structure && (
              <p><strong>Structure:</strong> {result.syntaxAnalysis.structure}</p>
            )}
            {result.syntaxAnalysis.clauses && (
              <div className="syntax-clauses">
                {result.syntaxAnalysis.clauses.map((clause, i) => (
                  <div key={i} className="clause-item">{clause}</div>
                ))}
              </div>
            )}
          </div>
        </div>
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

      {/* ═══════════════════════════════════════════════════════════════════════
          IYUN (עיון) MODE - Chavrusa-style deep study
          ═══════════════════════════════════════════════════════════════════════ */}

      {/* What needs explanation */}
      {result.whatNeedsExplanation && (
        <ResultSection title="מה קשה - What Needs Explanation" icon="🤔" color="#8b5cf6">
          <p className="what-needs-explanation">{result.whatNeedsExplanation}</p>
        </ResultSection>
      )}

      {/* Chavrusa Questions with full analysis */}
      {result.chavrusaQuestions && result.chavrusaQuestions.length > 0 && (
        <ResultSection title="Chavrusa Questions" icon="🔍" color="#8b5cf6">
          <div className="chavrusa-questions-list">
            {result.chavrusaQuestions.map((q, i) => (
              <div key={i} className="chavrusa-question-card">
                <div className="cq-header">
                  <span className="cq-num">{i + 1}</span>
                  <span className="cq-type">{q.questionType || q.hebrewTerm || ''}</span>
                </div>
                <p className="cq-question"><strong>Q:</strong> {q.question}</p>
                {q.approaches && q.approaches.length > 0 && (
                  <div className="cq-approaches">
                    {q.approaches.map((a, j) => (
                      <div key={j} className="cq-approach">
                        <span className="approach-source">{a.commentator || a.approach || `Approach ${j + 1}`}</span>
                        <span className="approach-text">{a.explanation || a.reasoning || a}</span>
                      </div>
                    ))}
                  </div>
                )}
                {q.possibleAnswers && q.possibleAnswers.length > 0 && (
                  <div className="cq-approaches">
                    {q.possibleAnswers.map((a, j) => (
                      <div key={j} className="cq-approach">
                        <span className="approach-source">{a.approach}</span>
                        <span className="approach-text">{a.reasoning}</span>
                        {a.problems && <span className="approach-problems">⚠️ {a.problems}</span>}
                      </div>
                    ))}
                  </div>
                )}
                {q.resolution && (
                  <div className="cq-resolution">
                    <span className="resolution-label">✓ Resolution:</span>
                    <span className="resolution-text">{q.resolution}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ResultSection>
      )}

      {/* Chiddush - Novel insight */}
      {result.chiddush && (
        <ResultSection title="חידוש - Novel Insight" icon="💡" color="#fbbf24" highlight>
          <p className="chiddush-text">{result.chiddush}</p>
        </ResultSection>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MUSSAR (מוסר) MODE - Character development
          ═══════════════════════════════════════════════════════════════════════ */}

      {/* Middot Identified */}
      {result.middotIdentified && result.middotIdentified.length > 0 && (
        <ResultSection title="Middot (Character Traits)" icon="💎" color="#10b981">
          <div className="middot-list">
            {result.middotIdentified.map((m, i) => (
              <div key={i} className="middah-card">
                <div className="middah-header">
                  <span className="middah-hebrew" dir="rtl">{m.middah}</span>
                  {m.transliteration && <span className="middah-translit">({m.transliteration})</span>}
                </div>
                {m.meaning && <p className="middah-meaning">{m.meaning}</p>}
                {m.textualBasis && <p className="middah-basis"><em>In the text:</em> {m.textualBasis}</p>}
                {m.mussorSource && <p className="middah-source"><strong>Source:</strong> {m.mussorSource}</p>}
                {m.practicalSteps && m.practicalSteps.length > 0 && (
                  <div className="middah-steps">
                    <span className="steps-label">Practical Steps:</span>
                    <ol className="steps-list">
                      {m.practicalSteps.map((step, j) => (
                        <li key={j}>{step}</li>
                      ))}
                    </ol>
                  </div>
                )}
                {m.obstacle && <p className="middah-obstacle"><span className="obstacle-icon">⚠️</span> Obstacle: {m.obstacle}</p>}
                {m.remedy && <p className="middah-remedy"><span className="remedy-icon">💊</span> Remedy: {m.remedy}</p>}
              </div>
            ))}
          </div>
        </ResultSection>
      )}

      {/* Self Examination Questions */}
      {result.selfExamination && result.selfExamination.length > 0 && (
        <ResultSection title="Self-Examination Questions" icon="🪞" color="#10b981">
          <div className="self-exam-list">
            {result.selfExamination.map((q, i) => (
              <div key={i} className="self-exam-item">
                <span className="exam-bullet">→</span>
                <span className="exam-question">{q}</span>
              </div>
            ))}
          </div>
        </ResultSection>
      )}

      {/* Daily Practice */}
      {result.dailyPractice && (
        <ResultSection title="Today's Practice" icon="📅" color="#10b981" highlight>
          <p className="daily-practice">{result.dailyPractice}</p>
        </ResultSection>
      )}

      {/* Weekly Goal */}
      {result.weeklyGoal && (
        <ResultSection title="Weekly Goal" icon="🎯" color="#10b981">
          <p className="weekly-goal">{result.weeklyGoal}</p>
        </ResultSection>
      )}

      {/* Chassidic Insight */}
      {result.chassidicInsight && (
        <ResultSection title="Chassidic Insight" icon="✨" color="#10b981">
          <p className="chassidic-insight">{result.chassidicInsight}</p>
        </ResultSection>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MACHLOKET (מחלוקת) MODE - Understanding disputes
          ═══════════════════════════════════════════════════════════════════════ */}

      {/* Main Machloket */}
      {result.mainMachloket && (
        <ResultSection title="Main Dispute" icon="⚔️" color="#7c3aed">
          <div className="machloket-card">
            <h5 className="machloket-topic">{result.mainMachloket.topic}</h5>
            {result.mainMachloket.positions && result.mainMachloket.positions.length > 0 && (
              <div className="machloket-positions">
                {result.mainMachloket.positions.map((p, i) => (
                  <div key={i} className="position-card">
                    <div className="position-header">
                      <span className="position-sage">{p.sage || p.commentator}</span>
                      {p.hebrewName && <span className="position-hebrew" dir="rtl">{p.hebrewName}</span>}
                    </div>
                    <p className="position-view">{p.position || p.view}</p>
                    {p.reasoning && <p className="position-reasoning"><em>Reasoning:</em> {p.reasoning}</p>}
                    {p.textualBasis && <p className="position-basis"><em>Basis:</em> {p.textualBasis}</p>}
                    {p.methodology && <p className="position-method"><em>Method:</em> {p.methodology}</p>}
                  </div>
                ))}
              </div>
            )}
            {result.mainMachloket.rootCause && (
              <div className="machloket-root">
                <strong>Root Cause:</strong> {result.mainMachloket.rootCause}
              </div>
            )}
            {result.mainMachloket.nafkaMina && (
              <div className="machloket-nafka">
                <strong>נפקא מינה (Practical Difference):</strong> {result.mainMachloket.nafkaMina}
              </div>
            )}
            {result.mainMachloket.halachicConclusion && (
              <div className="machloket-conclusion">
                <strong>Halachic Conclusion:</strong> {result.mainMachloket.halachicConclusion}
              </div>
            )}
          </div>
        </ResultSection>
      )}

      {/* Lesson from Dispute */}
      {result.lessonFromDispute && (
        <ResultSection title="Lesson from Dispute" icon="📖" color="#7c3aed">
          <p>{result.lessonFromDispute}</p>
        </ResultSection>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MAREI_MEKOMOT (מראי מקומות) MODE - Cross-references
          ═══════════════════════════════════════════════════════════════════════ */}

      {/* Direct Parallels */}
      {result.directParallels && result.directParallels.length > 0 && (
        <ResultSection title="Direct Parallels" icon="🔗" color="#059669">
          <div className="parallels-list">
            {result.directParallels.map((p, i) => (
              <div key={i} className="parallel-card">
                <div className="parallel-ref">
                  <a href={`https://www.sefaria.org/${p.reference?.replace(/\s/g, '_')}`}
                     target="_blank" rel="noopener noreferrer" className="ref-link">
                    {p.reference}
                  </a>
                  {p.hebrewRef && <span className="ref-hebrew" dir="rtl">{p.hebrewRef}</span>}
                  <span className="connection-type">{p.connectionType}</span>
                </div>
                {p.sharedLanguage && <p className="shared-language"><em>Shared:</em> {p.sharedLanguage}</p>}
                {p.significance && <p className="parallel-significance">{p.significance}</p>}
              </div>
            ))}
          </div>
        </ResultSection>
      )}

      {/* Talmud Sources */}
      {result.talmudSources && result.talmudSources.length > 0 && (
        <ResultSection title="Talmud Sources" icon="📜" color="#059669">
          <div className="talmud-sources-list">
            {result.talmudSources.map((s, i) => (
              <div key={i} className="talmud-source-card">
                <a href={`https://www.sefaria.org/${s.reference?.replace(/\s/g, '_')}`}
                   target="_blank" rel="noopener noreferrer" className="talmud-ref">
                  {s.reference}
                </a>
                {s.topic && <span className="talmud-topic">{s.topic}</span>}
                {s.keyPoint && <p className="talmud-keypoint">{s.keyPoint}</p>}
              </div>
            ))}
          </div>
        </ResultSection>
      )}

      {/* Midrash Sources */}
      {result.midrashSources && result.midrashSources.length > 0 && (
        <ResultSection title="Midrash Sources" icon="📚" color="#059669">
          <div className="midrash-sources-list">
            {result.midrashSources.map((m, i) => (
              <div key={i} className="midrash-source-card">
                <span className="midrash-ref">{m.reference}</span>
                {m.teaching && <p className="midrash-teaching">{m.teaching}</p>}
              </div>
            ))}
          </div>
        </ResultSection>
      )}

      {/* Leitwort Analysis */}
      {result.leitwort && (
        <ResultSection title="Leitwort (Leading Word)" icon="🔤" color="#059669">
          <div className="leitwort-card">
            <div className="leitwort-word" dir="rtl">{result.leitwort.word}</div>
            {result.leitwort.occurrences && result.leitwort.occurrences.length > 0 && (
              <div className="leitwort-occurrences">
                {result.leitwort.occurrences.map((o, i) => (
                  <div key={i} className="occurrence-item">
                    <span className="occurrence-ref">{o.reference}</span>
                    <span className="occurrence-context">{o.context}</span>
                  </div>
                ))}
              </div>
            )}
            {result.leitwort.pattern && <p className="leitwort-pattern"><strong>Pattern:</strong> {result.leitwort.pattern}</p>}
          </div>
        </ResultSection>
      )}

      {/* Thematic Web */}
      {result.thematicWeb && result.thematicWeb.length > 0 && (
        <ResultSection title="Thematic Connections" icon="🕸️" color="#059669">
          <div className="thematic-web">
            {result.thematicWeb.map((t, i) => (
              <div key={i} className="theme-card">
                <h5 className="theme-name">{t.theme}</h5>
                {t.sources && <p className="theme-sources">{t.sources.join(' • ')}</p>}
                {t.development && <p className="theme-dev">{t.development}</p>}
              </div>
            ))}
          </div>
        </ResultSection>
      )}

      {/* Study Path */}
      {result.studyPath && (
        <ResultSection title="Suggested Study Path" icon="🛤️" color="#059669">
          <p className="study-path">{result.studyPath}</p>
        </ResultSection>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          HALACHA (הלכה) MODE - Chain of transmission
          ═══════════════════════════════════════════════════════════════════════ */}

      {/* Chain of Transmission */}
      {result.chainOfTransmission && (
        <ResultSection title="Chain of Transmission" icon="⛓️" color="#dc2626">
          <div className="chain-of-transmission">
            {result.chainOfTransmission.torahSource && (
              <div className="chain-step torah-source">
                <span className="chain-icon">📖</span>
                <span className="chain-label">Torah Source:</span>
                <span className="chain-content">{result.chainOfTransmission.torahSource}</span>
              </div>
            )}
            {result.chainOfTransmission.talmudic && (
              <div className="chain-step talmud-step">
                <span className="chain-icon">📜</span>
                <span className="chain-label">Talmud ({result.chainOfTransmission.talmudic.location}):</span>
                <span className="chain-content">{result.chainOfTransmission.talmudic.derivation}</span>
                {result.chainOfTransmission.talmudic.disputes && (
                  <span className="chain-disputes">Disputes: {result.chainOfTransmission.talmudic.disputes}</span>
                )}
              </div>
            )}
            {result.chainOfTransmission.rishonim && result.chainOfTransmission.rishonim.length > 0 && (
              <div className="chain-step rishonim-step">
                <span className="chain-icon">📚</span>
                <span className="chain-label">Rishonim:</span>
                <div className="rishonim-list">
                  {result.chainOfTransmission.rishonim.map((r, i) => (
                    <div key={i} className="rishon-item">
                      <strong>{r.authority}</strong> ({r.location}): {r.ruling}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {result.chainOfTransmission.shulchanAruch && (
              <div className="chain-step shulchan-step">
                <span className="chain-icon">⚖️</span>
                <span className="chain-label">Shulchan Aruch ({result.chainOfTransmission.shulchanAruch.location}):</span>
                <span className="chain-content">{result.chainOfTransmission.shulchanAruch.ruling}</span>
                {result.chainOfTransmission.shulchanAruch.rema && (
                  <span className="chain-rema">Rema: {result.chainOfTransmission.shulchanAruch.rema}</span>
                )}
              </div>
            )}
            {result.chainOfTransmission.contemporary && (
              <div className="chain-step contemporary-step">
                <span className="chain-icon">📝</span>
                <span className="chain-label">Contemporary:</span>
                {result.chainOfTransmission.contemporary.mishnaBrurah && (
                  <div className="mb-ruling">Mishnah Berurah: {result.chainOfTransmission.contemporary.mishnaBrurah}</div>
                )}
                {result.chainOfTransmission.contemporary.modernPoskim && (
                  <div className="modern-poskim">Modern Poskim: {result.chainOfTransmission.contemporary.modernPoskim}</div>
                )}
              </div>
            )}
          </div>
        </ResultSection>
      )}

      {/* Practical Application */}
      {result.practicalApplication && typeof result.practicalApplication === 'object' && (
        <ResultSection title="Practical Application" icon="✋" color="#dc2626">
          <div className="practical-application">
            {result.practicalApplication.whoIsObligated && (
              <p><strong>Who:</strong> {result.practicalApplication.whoIsObligated}</p>
            )}
            {result.practicalApplication.when && (
              <p><strong>When:</strong> {result.practicalApplication.when}</p>
            )}
            {result.practicalApplication.how && (
              <p><strong>How:</strong> {result.practicalApplication.how}</p>
            )}
            {result.practicalApplication.exceptions && (
              <p><strong>Exceptions:</strong> {result.practicalApplication.exceptions}</p>
            )}
            {result.practicalApplication.commonMistakes && (
              <p><strong>⚠️ Common Mistakes:</strong> {result.practicalApplication.commonMistakes}</p>
            )}
          </div>
        </ResultSection>
      )}

      {/* Lesson Beyond Law */}
      {result.lessonBeyondLaw && (
        <ResultSection title="Deeper Meaning" icon="✨" color="#dc2626">
          <p className="lesson-beyond">{result.lessonBeyondLaw}</p>
        </ResultSection>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}

      {/* Key Terms (legacy) */}
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

      {/* MACHLOKET: commentators array */}
      {result.commentators && result.commentators.length > 0 && (
        <ResultSection title="Mefarshim Views" icon="📚" color="#7c3aed">
          {result.commentators.map((comm, i) => (
            <div key={i} className="commentator-view">
              <div className="commentator-name">
                {comm.name}
                {comm.period && <span className="commentator-period">({comm.period})</span>}
              </div>
              <p className="commentator-view-text">{comm.approach || comm.view || comm.interpretation}</p>
              {comm.keyPoint && <p className="commentator-keypoint"><strong>Key Point:</strong> {comm.keyPoint}</p>}
              {comm.methodology && <p className="commentator-method"><em>Method:</em> {comm.methodology}</p>}
            </div>
          ))}
        </ResultSection>
      )}

      {/* MACHLOKET: disagreements */}
      {result.disagreements && result.disagreements.length > 0 && (
        <ResultSection title="Disagreements" icon="⚔️" color="#ef4444">
          {result.disagreements.map((d, i) => (
            <div key={i} className="disagreement-item">
              {typeof d === 'string' ? d : d.description || JSON.stringify(d)}
            </div>
          ))}
        </ResultSection>
      )}

      {/* MACHLOKET: tosafotFocus, maharshaInsight, synthesis */}
      {result.tosafotFocus && (
        <ResultSection title="Tosafot Focus" icon="📜" color="#7c3aed">
          <p>{result.tosafotFocus}</p>
        </ResultSection>
      )}

      {result.maharshaInsight && (
        <ResultSection title="Maharsha Insight" icon="💡" color="#7c3aed">
          <p>{result.maharshaInsight}</p>
        </ResultSection>
      )}

      {/* HALACHA: mitzvot, talmudSources, modernApplication */}
      {result.mitzvot && result.mitzvot.length > 0 && (
        <ResultSection title="Mitzvot" icon="⚖️" color="#dc2626">
          <div className="mitzvot-list">
            {result.mitzvot.map((m, i) => (
              <div key={i} className="mitzvah-item">
                {typeof m === 'string' ? m : m.name || m.mitzvah || JSON.stringify(m)}
              </div>
            ))}
          </div>
        </ResultSection>
      )}

      {result.talmudSources && result.talmudSources.length > 0 && (
        <ResultSection title="Talmud Sources" icon="📜" color="#dc2626">
          <div className="talmud-sources">
            {result.talmudSources.map((s, i) => (
              <div key={i} className="talmud-source-item">
                {typeof s === 'string' ? s : s.reference || s.source || JSON.stringify(s)}
              </div>
            ))}
          </div>
        </ResultSection>
      )}

      {result.modernApplication && (
        <ResultSection title="Modern Application" icon="🏠" color="#dc2626">
          <p>{result.modernApplication}</p>
        </ResultSection>
      )}

      {/* Halacha (legacy format) */}
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

      {/* INTERTEXTUAL: parallels with rich data */}
      {result.parallels && result.parallels.length > 0 && (
        <ResultSection title="Parallel Texts" icon="📖" color="#059669">
          <div className="parallels-list">
            {result.parallels.map((p, i) => (
              <div key={i} className="parallel-card">
                {typeof p === 'string' ? (
                  <p>{p}</p>
                ) : (
                  <>
                    <div className="parallel-header">
                      {p.reference && <span className="parallel-ref">📍 {p.reference}</span>}
                      {p.type && <span className="parallel-type">{p.type}</span>}
                    </div>
                    {p.text && <blockquote className="parallel-text">{p.text}</blockquote>}
                    {p.relationship && <p className="parallel-relationship"><strong>Relationship:</strong> {p.relationship}</p>}
                    {p.significance && <p className="parallel-significance"><em>{p.significance}</em></p>}
                  </>
                )}
              </div>
            ))}
          </div>
        </ResultSection>
      )}

      {/* MAREI_MEKOMOT: connections with categories */}
      {result.connections && result.connections.length > 0 && mode === ANALYSIS_MODES.MAREI_MEKOMOT && (
        <ResultSection title="Connections" icon="🔗" color="#059669">
          <div className="connections-list">
            {result.connections.map((c, i) => (
              <div key={i} className="connection-card">
                {typeof c === 'string' ? (
                  <p>{c}</p>
                ) : (
                  <>
                    {c.category && <span className="connection-category">{c.category}</span>}
                    {c.references && c.references.length > 0 && (
                      <div className="connection-refs">
                        {c.references.map((ref, j) => (
                          <span key={j} className="ref-tag">{ref}</span>
                        ))}
                      </div>
                    )}
                    {c.description && <p className="connection-desc">{c.description}</p>}
                    {c.insight && <p className="connection-insight"><strong>Insight:</strong> {c.insight}</p>}
                  </>
                )}
              </div>
            ))}
          </div>
        </ResultSection>
      )}

      {/* MAREI_MEKOMOT: keyPhrases */}
      {result.keyPhrases && result.keyPhrases.length > 0 && (
        <ResultSection title="Key Phrases" icon="🔤" color="#059669">
          <div className="keyphrases-list">
            {result.keyPhrases.map((kp, i) => (
              <div key={i} className="keyphrase-item">
                {kp.phrase && <span className="keyphrase-text" dir="rtl">{kp.phrase}</span>}
                {kp.occurrences && kp.occurrences.length > 0 && (
                  <div className="keyphrase-occurrences">
                    <strong>Also appears in:</strong> {kp.occurrences.join(', ')}
                  </div>
                )}
                {kp.pattern && <p className="keyphrase-pattern"><em>Pattern:</em> {kp.pattern}</p>}
              </div>
            ))}
          </div>
        </ResultSection>
      )}

      {/* MAREI_MEKOMOT: significance */}
      {result.significance && (
        <ResultSection title="Significance" icon="✨" color="#059669">
          <p>{result.significance}</p>
        </ResultSection>
      )}

      {/* MAREI_MEKOMOT: practicalInsight */}
      {result.practicalInsight && (
        <ResultSection title="Practical Insight" icon="💡" color="#059669">
          <p>{result.practicalInsight}</p>
        </ResultSection>
      )}

      {/* Historical Context */}
      {result.historicalContext && (
        <ResultSection title="Historical Context" icon="🏛️" color="#b45309">
          <p>{result.historicalContext}</p>
        </ResultSection>
      )}

      {/* Cross-references (legacy) */}
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

      {/* IYUN: novelInsight / chiddush */}
      {result.novelInsight && (
        <ResultSection title="Novel Insight" icon="💡" color="#fbbf24">
          <p>{result.novelInsight}</p>
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

      {/* Practical Lesson / Message */}
      {(result.practicalLesson || result.practicalMessage) && (
        <div className="practical-lesson">
          <span className="lesson-icon">🎯</span>
          <p>{result.practicalLesson || result.practicalMessage}</p>
        </div>
      )}

      {/* Synthesis (from MUSSAR or MACHLOKET) */}
      {result.synthesis && !result.pshat && (
        <ResultSection title="Synthesis" icon="🔗" color="#059669">
          <p>{result.synthesis}</p>
        </ResultSection>
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

export default AIResult;
