/**
 * NafkaMinaResult - Practical Differences Analysis
 * THE key yeshiva question: "Mai nafka mina?"
 */
import React from 'react';

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
      <div className="nafka-mina-header">
        <span className="nafka-icon">🎯</span>
        <h3>מאי נפקא מינה? — What's the Practical Difference?</h3>
      </div>

      {summary && (
        <div className="nafka-summary">
          <p>{summary}</p>
        </div>
      )}

      {disputes && disputes.length > 0 && (
        <div className="nafka-disputes">
          {disputes.map((dispute, idx) => (
            <div key={idx} className="dispute-card">
              <div className="dispute-header">
                <span className="dispute-icon">⚖️</span>
                <h4>{dispute.topic}</h4>
              </div>

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

      {interpretiveDifferences && interpretiveDifferences.length > 0 && (
        <div className="interpretive-differences">
          {interpretiveDifferences.map((diff, idx) => (
            <div key={idx} className="difference-card">
              <div className="diff-header">
                <span className="diff-icon">📖</span>
                <h4>{diff.topic}</h4>
              </div>

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

      {whyItMatters && (
        <div className="why-it-matters">
          <span className="why-icon">💡</span>
          <p>{whyItMatters}</p>
        </div>
      )}

      {actionItem && (
        <div className="action-item-box">
          <span className="action-icon">🎯</span>
          <strong>Action Item:</strong> {actionItem}
        </div>
      )}

      {studyTakeaway && (
        <div className="study-takeaway">
          <span className="takeaway-icon">📝</span>
          <p>{studyTakeaway}</p>
        </div>
      )}
    </div>
  );
};
