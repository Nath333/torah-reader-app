import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  speakHebrew,
  stopSpeech,
  pauseSpeech,
  resumeSpeech,
  createAudioQueue,
  getBestHebrewVoice
} from '../services/audioService';
import './AudioPlayer.css';

const AudioPlayer = ({
  verses,
  selectedBook,
  selectedChapter,
  isOpen,
  onClose
}) => {
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(0.85);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [repeatMode, setRepeatMode] = useState('none'); // 'none', 'one', 'all'
  const [voiceAvailable, setVoiceAvailable] = useState(false);
  const queueRef = useRef(null);

  // Check for Hebrew voice availability
  useEffect(() => {
    const checkVoice = () => {
      const voice = getBestHebrewVoice();
      setVoiceAvailable(!!voice);
    };

    // Voices may load asynchronously
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = checkVoice;
      checkVoice();
    }

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // Cleanup on unmount or close
  useEffect(() => {
    return () => {
      stopSpeech();
      if (queueRef.current) {
        queueRef.current.stop();
      }
    };
  }, []);

  const playVerse = useCallback(async (index) => {
    if (!verses || !verses[index]) return;

    setCurrentVerseIndex(index);
    setPlaying(true);
    setPaused(false);

    try {
      await speakHebrew(verses[index].hebrewText, { rate: playbackSpeed });

      // Handle repeat and auto-advance
      if (repeatMode === 'one') {
        playVerse(index);
      } else if (autoAdvance && index < verses.length - 1) {
        playVerse(index + 1);
      } else if (repeatMode === 'all' && index === verses.length - 1) {
        playVerse(0);
      } else {
        setPlaying(false);
      }
    } catch (error) {
      console.error('Speech error:', error);
      setPlaying(false);
    }
  }, [verses, playbackSpeed, autoAdvance, repeatMode]);

  const playAll = useCallback(() => {
    if (!verses || verses.length === 0) return;

    const texts = verses.map(v => v.hebrewText);
    const queue = createAudioQueue(texts, { rate: playbackSpeed });

    queue.onProgress((index, total) => {
      setCurrentVerseIndex(index);
    });

    queue.onComplete(() => {
      setPlaying(false);
      if (repeatMode === 'all') {
        playAll();
      }
    });

    queueRef.current = queue;
    setPlaying(true);
    setPaused(false);
    queue.play();
  }, [verses, playbackSpeed, repeatMode]);

  const handlePlayPause = useCallback(() => {
    if (playing) {
      if (paused) {
        resumeSpeech();
        if (queueRef.current) queueRef.current.resume();
        setPaused(false);
      } else {
        pauseSpeech();
        if (queueRef.current) queueRef.current.pause();
        setPaused(true);
      }
    } else {
      playVerse(currentVerseIndex);
    }
  }, [playing, paused, currentVerseIndex, playVerse]);

  const handleStop = useCallback(() => {
    stopSpeech();
    if (queueRef.current) {
      queueRef.current.stop();
    }
    setPlaying(false);
    setPaused(false);
    setCurrentVerseIndex(0);
  }, []);

  const handleNext = useCallback(() => {
    if (currentVerseIndex < verses.length - 1) {
      stopSpeech();
      if (queueRef.current) queueRef.current.skip();
      else playVerse(currentVerseIndex + 1);
    }
  }, [currentVerseIndex, verses.length, playVerse]);

  const handlePrevious = useCallback(() => {
    if (currentVerseIndex > 0) {
      stopSpeech();
      if (queueRef.current) queueRef.current.previous();
      else playVerse(currentVerseIndex - 1);
    }
  }, [currentVerseIndex, playVerse]);

  const handleVerseClick = useCallback((index) => {
    handleStop();
    playVerse(index);
  }, [handleStop, playVerse]);

  const cycleRepeatMode = useCallback(() => {
    setRepeatMode(current => {
      if (current === 'none') return 'one';
      if (current === 'one') return 'all';
      return 'none';
    });
  }, []);

  if (!isOpen) return null;

  return (
    <div className="audio-player-modal-overlay" onClick={onClose}>
      <div className="audio-player-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14" />
            </svg>
            Audio Player
          </h2>
          <button className="close-btn" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="modal-content">
          {!voiceAvailable && (
            <div className="voice-warning">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" />
              </svg>
              <span>Hebrew voice not available on your device. Using default voice.</span>
            </div>
          )}

          <div className="now-playing">
            <div className="chapter-info">
              {selectedBook} Chapter {selectedChapter}
            </div>
            <div className="verse-info">
              {verses && verses[currentVerseIndex] && (
                <>
                  <span className="verse-label">Verse {verses[currentVerseIndex].verse}</span>
                  <div className="verse-preview" dir="rtl" lang="he">
                    {verses[currentVerseIndex].hebrewText?.substring(0, 100)}
                    {verses[currentVerseIndex].hebrewText?.length > 100 && '...'}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="progress-container">
            <div
              className="progress-bar"
              style={{ width: `${((currentVerseIndex + 1) / (verses?.length || 1)) * 100}%` }}
            />
            <span className="progress-text">
              {currentVerseIndex + 1} / {verses?.length || 0}
            </span>
          </div>

          {/* Main controls */}
          <div className="playback-controls">
            <button
              className={`control-btn repeat ${repeatMode !== 'none' ? 'active' : ''}`}
              onClick={cycleRepeatMode}
              title={`Repeat: ${repeatMode}`}
            >
              {repeatMode === 'one' ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 1l4 4-4 4" />
                  <path d="M3 11V9a4 4 0 014-4h14" />
                  <path d="M7 23l-4-4 4-4" />
                  <path d="M21 13v2a4 4 0 01-4 4H3" />
                  <text x="12" y="14" fontSize="8" fill="currentColor" textAnchor="middle">1</text>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 1l4 4-4 4" />
                  <path d="M3 11V9a4 4 0 014-4h14" />
                  <path d="M7 23l-4-4 4-4" />
                  <path d="M21 13v2a4 4 0 01-4 4H3" />
                </svg>
              )}
            </button>

            <button
              className="control-btn"
              onClick={handlePrevious}
              disabled={currentVerseIndex === 0}
              title="Previous verse"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="19 20 9 12 19 4 19 20" />
                <line x1="5" y1="19" x2="5" y2="5" />
              </svg>
            </button>

            <button
              className="control-btn play-pause"
              onClick={handlePlayPause}
              title={playing ? (paused ? 'Resume' : 'Pause') : 'Play'}
            >
              {playing && !paused ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              )}
            </button>

            <button
              className="control-btn"
              onClick={handleStop}
              disabled={!playing && currentVerseIndex === 0}
              title="Stop"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <rect x="4" y="4" width="16" height="16" rx="2" />
              </svg>
            </button>

            <button
              className="control-btn"
              onClick={handleNext}
              disabled={currentVerseIndex >= (verses?.length || 0) - 1}
              title="Next verse"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="5 4 15 12 5 20 5 4" />
                <line x1="19" y1="5" x2="19" y2="19" />
              </svg>
            </button>

            <button
              className="control-btn play-all"
              onClick={playAll}
              title="Play all verses"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="5 3 19 12 5 21 5 3" />
                <path d="M20 3v18" />
              </svg>
            </button>
          </div>

          {/* Speed control */}
          <div className="speed-control">
            <label>Speed:</label>
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.05"
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
            />
            <span className="speed-value">{playbackSpeed.toFixed(2)}x</span>
          </div>

          {/* Settings */}
          <div className="playback-settings">
            <label className="setting-toggle">
              <input
                type="checkbox"
                checked={autoAdvance}
                onChange={(e) => setAutoAdvance(e.target.checked)}
              />
              <span>Auto-advance to next verse</span>
            </label>
          </div>

          {/* Verse list */}
          <div className="verse-list">
            <h3>Verses</h3>
            <div className="verses-scroll">
              {verses?.map((verse, index) => (
                <button
                  key={verse.verse}
                  className={`verse-item ${index === currentVerseIndex ? 'active' : ''} ${playing && index === currentVerseIndex ? 'playing' : ''}`}
                  onClick={() => handleVerseClick(index)}
                >
                  <span className="verse-num">{verse.verse}</span>
                  <span className="verse-text" dir="rtl">
                    {verse.hebrewText?.substring(0, 40)}...
                  </span>
                  {playing && index === currentVerseIndex && (
                    <span className="playing-indicator">
                      <span className="bar"></span>
                      <span className="bar"></span>
                      <span className="bar"></span>
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <p className="footer-note">
            Uses text-to-speech synthesis for Hebrew reading.
            Quality depends on your device's Hebrew voice support.
          </p>
        </div>
      </div>
    </div>
  );
};

export default React.memo(AudioPlayer);
