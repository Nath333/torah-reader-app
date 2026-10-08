import React from 'react';

// Panneau extrait de FocusMode.js — bloc JSX copié tel quel (recette filet).
export const StatsPanel = ({showStats, setShowStats, studyStats, verses, versesStudied, currentVerse}) => (
  <>
          {showStats && (
            <div className="study-stats-panel">
              <div className="stats-header">
                <h4>📊 Study Statistics</h4>
                <button className="close-stats" onClick={() => setShowStats(false)}>×</button>
              </div>
              <div className="stats-content">
                <div className="stat-item">
                  <span className="stat-label">Verses Studied</span>
                  <span className="stat-value">{studyStats.versesStudied} / {studyStats.totalVerses}</span>
                </div>
                <div className="stat-progress">
                  <div className="stat-progress-fill" style={{ width: `${studyStats.percentComplete}%` }} />
                </div>
                <div className="stat-item">
                  <span className="stat-label">Progress</span>
                  <span className="stat-value">{studyStats.percentComplete}%</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Highlighted</span>
                  <span className="stat-value">{studyStats.highlightedCount} verses</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Study Time</span>
                  <span className="stat-value">{studyStats.readingTimeFormatted}</span>
                </div>
                {studyStats.currentVerseWords > 0 && (
                  <>
                    <div className="stat-divider" />
                    <div className="stat-item">
                      <span className="stat-label">Verse Words</span>
                      <span className="stat-value">{studyStats.currentVerseWords} ({studyStats.currentVerseUniqueWords} unique)</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Verse Letters</span>
                      <span className="stat-value">{studyStats.currentVerseLetters}</span>
                    </div>
                  </>
                )}
                {studyStats.chapterTotalWords > 0 && (
                  <>
                    <div className="stat-item">
                      <span className="stat-label">Chapter Words</span>
                      <span className="stat-value">{studyStats.chapterTotalWords} ({studyStats.chapterUniqueWords} unique)</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Avg Words/Verse</span>
                      <span className="stat-value">{studyStats.chapterAvgWordsPerVerse}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
  </>
);
