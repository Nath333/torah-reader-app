import React, { useState, useEffect, useCallback } from 'react';
import { getRashiForVerse } from '../services/rashiService';
import { getTosafotForDaf } from '../services/tosafotService';
import { getCommentary } from '../services/sefariaApi';
import './SplitPaneView.css';

function SplitPaneView({
  verses,
  selectedBook,
  selectedChapter,
  selectedVerse,
  onSelectVerse,
  showOnkelos,
  onkelos,
  isTalmud
}) {
  const [commentary, setCommentary] = useState(null);
  const [commentaryLoading, setCommentaryLoading] = useState(false);
  const [activeCommentator, setActiveCommentator] = useState('rashi');
  const [paneWidth, setPaneWidth] = useState(50); // percentage
  const [isDragging, setIsDragging] = useState(false);

  // Available commentators
  const commentators = [
    { id: 'rashi', name: 'Rashi', hebrew: 'רש״י' },
    { id: 'tosafot', name: 'Tosafot', hebrew: 'תוספות', talmudOnly: true },
    { id: 'ramban', name: 'Ramban', hebrew: 'רמב״ן' },
    { id: 'ibn_ezra', name: 'Ibn Ezra', hebrew: 'אבן עזרא' },
    { id: 'sforno', name: 'Sforno', hebrew: 'ספורנו' },
    { id: 'onkelos', name: 'Onkelos', hebrew: 'אונקלוס', torahOnly: true }
  ];

  // Fetch commentary when verse or commentator changes
  useEffect(() => {
    if (!selectedVerse || !selectedBook || !selectedChapter) {
      setCommentary(null);
      return;
    }

    const fetchCommentary = async () => {
      setCommentaryLoading(true);
      try {
        let result = null;

        if (activeCommentator === 'rashi') {
          result = await getRashiForVerse(selectedBook, selectedChapter, selectedVerse);
        } else if (activeCommentator === 'tosafot' && isTalmud) {
          // Tosafot for Talmud uses daf (selectedChapter represents the daf)
          const tosafotComments = await getTosafotForDaf(selectedBook, selectedChapter);
          if (tosafotComments?.length > 0) {
            result = {
              source: 'Tosafot',
              sourceHebrew: 'תוספות',
              comments: tosafotComments
            };
          }
        } else if (activeCommentator === 'onkelos') {
          const onkelosVerse = onkelos?.find(o => o.verse === selectedVerse);
          if (onkelosVerse) {
            result = {
              source: 'Onkelos',
              sourceHebrew: 'אונקלוס',
              comments: [{
                verse: selectedVerse,
                hebrew: onkelosVerse.aramaic,
                english: onkelosVerse.english || 'Aramaic translation'
              }]
            };
          }
        } else {
          // Fetch other commentaries from general API
          const allCommentary = await getCommentary(selectedBook, selectedChapter, selectedVerse);
          const found = allCommentary?.find(c =>
            c.source?.toLowerCase().includes(activeCommentator.replace('_', ' '))
          );
          if (found) {
            result = found;
          }
        }

        setCommentary(result);
      } catch (err) {
        console.error('Error fetching commentary:', err);
        setCommentary(null);
      } finally {
        setCommentaryLoading(false);
      }
    };

    fetchCommentary();
  }, [selectedVerse, selectedBook, selectedChapter, activeCommentator, isTalmud, onkelos]);

  // Handle pane resize
  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();
    const newWidth = ((e.clientX - rect.left) / rect.width) * 100;
    setPaneWidth(Math.min(Math.max(newWidth, 30), 70));
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Get verse to display
  const currentVerse = verses?.find(v => v.verse === selectedVerse);

  return (
    <div
      className={`split-pane-view ${isDragging ? 'dragging' : ''}`}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Text Pane */}
      <div className="text-pane" style={{ width: `${paneWidth}%` }}>
        <div className="pane-header">
          <h3>{selectedBook} {selectedChapter}</h3>
          <span className="verse-indicator">
            {selectedVerse ? `Verse ${selectedVerse}` : 'Select a verse'}
          </span>
        </div>

        <div className="verses-container">
          {verses?.map((verse) => (
            <div
              key={verse.verse}
              className={`verse-block ${selectedVerse === verse.verse ? 'selected' : ''}`}
              onClick={() => onSelectVerse(verse.verse)}
            >
              <span className="verse-number">{verse.verse}</span>
              <div className="verse-content">
                <p className="hebrew-text" dir="rtl">{verse.hebrew}</p>
                <p className="english-text">{verse.english}</p>
                {showOnkelos && onkelos && (
                  <p className="onkelos-text" dir="rtl">
                    {onkelos.find(o => o.verse === verse.verse)?.aramaic}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Resize handle */}
      <div
        className="pane-divider"
        onMouseDown={handleMouseDown}
      >
        <div className="divider-handle" />
      </div>

      {/* Commentary Pane */}
      <div className="commentary-pane" style={{ width: `${100 - paneWidth}%` }}>
        <div className="pane-header">
          <h3>Commentary</h3>
          <div className="commentator-tabs">
            {commentators
              .filter(c => (!c.talmudOnly || isTalmud) && (!c.torahOnly || !isTalmud))
              .map(c => (
                <button
                  key={c.id}
                  className={`commentator-tab ${activeCommentator === c.id ? 'active' : ''}`}
                  onClick={() => setActiveCommentator(c.id)}
                  title={c.name}
                >
                  <span className="commentator-hebrew">{c.hebrew}</span>
                </button>
              ))
            }
          </div>
        </div>

        <div className="commentary-container">
          {!selectedVerse ? (
            <div className="commentary-placeholder">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <p>Click on a verse to see commentary</p>
              <span>Select any verse from the left pane to view {commentators.find(c => c.id === activeCommentator)?.name} commentary</span>
            </div>
          ) : commentaryLoading ? (
            <div className="commentary-loading">
              <div className="loading-spinner" />
              <p>Loading {commentators.find(c => c.id === activeCommentator)?.name}...</p>
            </div>
          ) : commentary?.comments?.length > 0 ? (
            <div className="commentary-content">
              <div className="selected-verse-preview">
                <span className="preview-label">On verse {selectedVerse}:</span>
                <p className="preview-text" dir="rtl">{currentVerse?.hebrew?.substring(0, 80)}...</p>
              </div>

              {commentary.comments.map((comment, idx) => (
                <div key={idx} className="comment-block">
                  {comment.dibbur && (
                    <div className="dibbur-haMatchil" dir="rtl">
                      <span className="dibbur-label">ד״ה</span>
                      <span className="dibbur-text">{comment.dibbur}</span>
                    </div>
                  )}
                  <div
                    className="comment-hebrew"
                    dir="rtl"
                    dangerouslySetInnerHTML={{ __html: comment.hebrew }}
                  />
                  {comment.english && (
                    <div
                      className="comment-english"
                      dangerouslySetInnerHTML={{ __html: comment.english }}
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="commentary-empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <p>No {commentators.find(c => c.id === activeCommentator)?.name} commentary available</p>
              <span>Try selecting a different verse or commentator</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SplitPaneView;
