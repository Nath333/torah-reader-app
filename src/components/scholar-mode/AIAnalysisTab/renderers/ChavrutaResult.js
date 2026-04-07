/**
 * ChavrutaResult - Study partner challenge / Devil's advocate mode
 * Shows standard view, challenges, textual problems, and dialectic conclusion
 */
import React, { memo } from 'react';

export const ChavrutaResult = memo(({ data }) => {
  const { standardView, challenges, devilsAdvocate, textualProblems, dialecticConclusion, chavrutaChallenge } = data || {};

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
});

ChavrutaResult.displayName = 'ChavrutaResult';

export default ChavrutaResult;
