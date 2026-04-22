/**
 * AIResult - Main dispatcher that selects the appropriate renderer based on analysis mode
 */
import React from 'react';
import { ANALYSIS_MODES } from '../../../../services/groqService';
import { ALL_MODES } from '../ModeGrid';
import DisagreementVisualization from '../../DisagreementVisualization';
import HalachicChainVisualization from '../../HalachicChainVisualization';
import '../../DisagreementVisualization.css';
import '../../HalachicChainVisualization.css';

import { ResultSection, KeyPointsList, RAGIndicator } from './SharedComponents';
import { TreeResultComponent } from './TreeResultComponent';
import { SugyaFlowResult } from './SugyaFlowResult';
import { ShaklaVetaryaResult } from './ShaklaVetaryaResult';
import { SugyaSummaryResult } from './SugyaSummaryResult';
import { PassageAnalysisResult } from './PassageAnalysisResult';
import { DeepStudyResult } from './DeepStudyResult';
import { TaamimResult } from './TaamimResult';
import { ShoreshResult } from './ShoreshResult';
import { ChavrutaResult } from './ChavrutaResult';
import { ShiurResult } from './ShiurResult';
import { NafkaMinaResult } from './NafkaMinaResult';
import { MekabilotResult } from './MekabilotResult';

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
      {result.ragEnhanced && <RAGIndicator ragMetadata={result.ragMetadata} />}

      {result.summary && (
        <ResultSection title="Summary" icon="📋" color={modeInfo.color}>
          <p className="result-text">{result.summary}</p>
        </ResultSection>
      )}

      {result.oneLineSummary && (
        <div className="result-highlight">
          <p className="result-oneline">{result.oneLineSummary}</p>
        </div>
      )}

      {result.keyPoints && result.keyPoints.length > 0 && (
        <ResultSection title="Key Points" icon="📝" color="#3b82f6">
          <KeyPointsList points={result.keyPoints} />
        </ResultSection>
      )}

      {result.topics && result.topics.length > 0 && (
        <div className="result-topics">
          {result.topics.map((topic, i) => (
            <span key={i} className="topic-tag">{topic}</span>
          ))}
        </div>
      )}

      {result.pshat && (
        <div className="pardes-levels">
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

          {result.synthesis && (
            <ResultSection title="Synthesis" icon="🔗" color="#059669">
              <p>{result.synthesis}</p>
            </ResultSection>
          )}

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
                <div className="entry-headword">
                  <span className="headword-hebrew" dir="rtl">{word.hebrew}</span>
                  {word.transliteration && <span className="headword-translit">({word.transliteration})</span>}
                </div>
                {word.root && (
                  <div className="entry-root">
                    <span className="root-label">שׁרשׁ</span>
                    <span className="root-hebrew" dir="rtl">{word.root}</span>
                    {word.rootMeaning && <span className="root-meaning">"{word.rootMeaning}"</span>}
                  </div>
                )}
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
                {word.usage && (
                  <div className="entry-usage">
                    <span className="usage-label">Usage:</span> {word.usage}
                  </div>
                )}
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

      {result.whatNeedsExplanation && (
        <ResultSection title="מה קשה - What Needs Explanation" icon="🤔" color="#8b5cf6">
          <p className="what-needs-explanation">{result.whatNeedsExplanation}</p>
        </ResultSection>
      )}

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

      {result.chiddush && (
        <ResultSection title="חידוש - Novel Insight" icon="💡" color="#fbbf24" highlight>
          <p className="chiddush-text">{result.chiddush}</p>
        </ResultSection>
      )}

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

      {result.dailyPractice && (
        <ResultSection title="Today's Practice" icon="📅" color="#10b981" highlight>
          <p className="daily-practice">{result.dailyPractice}</p>
        </ResultSection>
      )}

      {result.weeklyGoal && (
        <ResultSection title="Weekly Goal" icon="🎯" color="#10b981">
          <p className="weekly-goal">{result.weeklyGoal}</p>
        </ResultSection>
      )}

      {result.chassidicInsight && (
        <ResultSection title="Chassidic Insight" icon="✨" color="#10b981">
          <p className="chassidic-insight">{result.chassidicInsight}</p>
        </ResultSection>
      )}

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

      {result.lessonFromDispute && (
        <ResultSection title="Lesson from Dispute" icon="📖" color="#7c3aed">
          <p>{result.lessonFromDispute}</p>
        </ResultSection>
      )}

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

      {result.studyPath && (
        <ResultSection title="Suggested Study Path" icon="🛤️" color="#059669">
          <p className="study-path">{result.studyPath}</p>
        </ResultSection>
      )}

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
              <p><strong>Common Mistakes:</strong> {result.practicalApplication.commonMistakes}</p>
            )}
          </div>
        </ResultSection>
      )}

      {result.lessonBeyondLaw && (
        <ResultSection title="Deeper Meaning" icon="✨" color="#dc2626">
          <p className="lesson-beyond">{result.lessonBeyondLaw}</p>
        </ResultSection>
      )}

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

      {result.disagreements && result.disagreements.length > 0 && (
        <ResultSection title="Disagreements" icon="⚔️" color="#ef4444">
          {result.disagreements.map((d, i) => (
            <div key={i} className="disagreement-item">
              {typeof d === 'string' ? d : d.description || JSON.stringify(d)}
            </div>
          ))}
        </ResultSection>
      )}

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

      {result.significance && (
        <ResultSection title="Significance" icon="✨" color="#059669">
          <p>{result.significance}</p>
        </ResultSection>
      )}

      {result.practicalInsight && (
        <ResultSection title="Practical Insight" icon="💡" color="#059669">
          <p>{result.practicalInsight}</p>
        </ResultSection>
      )}

      {result.historicalContext && (
        <ResultSection title="Historical Context" icon="🏛️" color="#b45309">
          <p>{result.historicalContext}</p>
        </ResultSection>
      )}

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

      {result.novelInsight && (
        <ResultSection title="Novel Insight" icon="💡" color="#fbbf24">
          <p>{result.novelInsight}</p>
        </ResultSection>
      )}

      {result.insights && result.insights.length > 0 && (
        <ResultSection title="Quick Insights" icon="💡" color="#fbbf24">
          <KeyPointsList points={result.insights} />
        </ResultSection>
      )}

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

      {(result.practicalLesson || result.practicalMessage) && (
        <div className="practical-lesson">
          <span className="lesson-icon">🎯</span>
          <p>{result.practicalLesson || result.practicalMessage}</p>
        </div>
      )}

      {result.synthesis && !result.pshat && (
        <ResultSection title="Synthesis" icon="🔗" color="#059669">
          <p>{result.synthesis}</p>
        </ResultSection>
      )}

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
