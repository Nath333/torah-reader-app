import React from 'react';
import { MEFORSHIM } from '../data';

// Panneau extrait de FocusMode.js — bloc JSX copié tel quel (recette filet).
export const MeforshimPanel = ({showMeforshimPanel, setShowMeforshimPanel, selectedMeforshim, setSelectedMeforshim, currentVerse, currentOnkelos, onkelos, selectedBook, selectedChapter}) => (
  <>
          {showMeforshimPanel && (
            <div className="meforshim-panel">
              <div className="meforshim-header">
                <h4>📚 מפרשים - Meforshim</h4>
                <button className="close-meforshim" onClick={() => setShowMeforshimPanel(false)}>×</button>
              </div>
              <div className="meforshim-selector">
                {Object.entries(MEFORSHIM).map(([key, info]) => (
                  <button
                    key={key}
                    className={`mefaresh-btn ${selectedMeforshim.includes(key) ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedMeforshim(prev =>
                        prev.includes(key)
                          ? prev.filter(m => m !== key)
                          : [...prev, key]
                      );
                    }}
                    title={info.description}
                  >
                    <span className="mefaresh-name">{info.name}</span>
                    <span className="mefaresh-era">{info.era.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
              <div className="meforshim-content">
                {selectedMeforshim.map(key => {
                  const info = MEFORSHIM[key];
                  return (
                    <div key={key} className="mefaresh-section">
                      <div className="mefaresh-title">
                        <span className="mefaresh-hebrew">{info.name}</span>
                        <span className="mefaresh-english">{info.fullName}</span>
                        <span className="mefaresh-style">{info.style}</span>
                      </div>
                      <div className="mefaresh-text" dir="rtl">
                        {key === 'onkelos' && currentOnkelos ? (
                          <p>{currentOnkelos.aramaic}</p>
                        ) : (
                          <p className="mefaresh-placeholder">
                            {info.description}
                            <br />
                            <span className="mefaresh-note">
                              Commentary text for {selectedBook} {selectedChapter}:{currentVerse?.verse}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
  </>
);
