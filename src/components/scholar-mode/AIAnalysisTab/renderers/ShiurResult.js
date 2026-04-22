/**
 * ShiurResult - Lesson Preparation Renderer
 */
import React from 'react';

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
      {summary && (
        <div className="shiur-summary">
          <p>{summary}</p>
        </div>
      )}

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

      {closingMessage && (
        <div className="closing-message">
          <h4>🎯 Closing Message</h4>
          <p>{closingMessage}</p>
        </div>
      )}

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
