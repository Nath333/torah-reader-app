import React from 'react';

// Panneau extrait de FocusMode.js — bloc JSX copié tel quel (recette filet).
export const GematriaPanel = ({showGematria, setShowGematria, verseGematria, readingTime, formatTime, selectedWord, setSelectedWord}) => (
  <>
          {showGematria && (
            <div className="gematria-panel">
              <div className="gematria-header">
                <h4>🔢 גימטריא - Gematria</h4>
                <button className="close-gematria" onClick={() => setShowGematria(false)}>×</button>
              </div>
              <div className="gematria-content">
                <div className="gematria-total">
                  <span className="gematria-label">סה"כ פסוק</span>
                  <span className="gematria-value">{verseGematria.total}</span>
                </div>
                <div className="gematria-words">
                  {verseGematria.words.map((item, idx) => (
                    <div
                      key={idx}
                      className={`gematria-word ${selectedWord === idx ? 'selected' : ''}`}
                      onClick={() => setSelectedWord(selectedWord === idx ? null : idx)}
                    >
                      <span className="gematria-word-text">{item.word}</span>
                      <span className="gematria-word-value">{item.value}</span>
                    </div>
                  ))}
                </div>
                {selectedWord !== null && verseGematria.words[selectedWord] && (
                  <div className="gematria-breakdown">
                    <span className="breakdown-title">Letter breakdown:</span>
                    <div className="breakdown-letters">
                      {verseGematria.words[selectedWord].word.split('').map((char, i) => (
                        <span key={i} className="breakdown-letter">
                          <span className="letter">{char}</span>
                          <span className="letter-value">{GEMATRIA_VALUES[char] || 0}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
  </>
);
