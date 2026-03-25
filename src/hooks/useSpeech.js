import { useState, useCallback, useEffect, useRef } from 'react';
import { stripCantillation } from '../utils/hebrewUtils';

/**
 * Smart Hebrew Text-to-Speech Hook
 * Uses Google Translate TTS as primary (reliable for Hebrew)
 * Falls back to Web Speech API if available
 */
const useSpeech = () => {
  const [speaking, setSpeaking] = useState(false);
  const [rate, setRate] = useState(0.8);

  // Always supported - we have Google TTS fallback
  const supported = true;
  const voicesLoaded = true;

  const audioRef = useRef(null);
  const utteranceRef = useRef(null);
  // Track pending timeouts for cleanup (fixes race condition)
  const timeoutRef = useRef(null);
  // Track stopped state to prevent playback after stop
  const stoppedRef = useRef(false);
  // Track mounted state
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      stoppedRef.current = true;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  /**
   * Clean Hebrew text for TTS - remove cantillation marks
   */
  const cleanHebrewText = useCallback((text) => {
    if (!text) return '';
    return stripCantillation(text)
      .replace(/[\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7]/g, '') // Remove other marks
      .replace(/[׃׀]/g, '') // Remove Hebrew punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }, []);

  /**
   * Split text into chunks for Google TTS (max ~200 chars)
   */
  const splitTextIntoChunks = useCallback((text, maxLength = 180) => {
    const words = text.split(' ');
    const chunks = [];
    let currentChunk = '';

    for (const word of words) {
      if ((currentChunk + ' ' + word).length > maxLength) {
        if (currentChunk) chunks.push(currentChunk.trim());
        currentChunk = word;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + word;
      }
    }
    if (currentChunk) chunks.push(currentChunk.trim());

    return chunks;
  }, []);

  /**
   * Play Hebrew text using Google Translate TTS
   */
  const playWithGoogleTTS = useCallback((text) => {
    return new Promise((resolve, reject) => {
      const cleanText = cleanHebrewText(text);
      if (!cleanText) {
        reject(new Error('No text to speak'));
        return;
      }

      // Reset stopped flag when starting new playback
      stoppedRef.current = false;

      // Split into chunks if too long
      const chunks = splitTextIntoChunks(cleanText);
      let currentIndex = 0;

      const playNextChunk = () => {
        // Check if stopped or unmounted before continuing
        if (stoppedRef.current || !isMountedRef.current) {
          resolve();
          return;
        }

        if (currentIndex >= chunks.length) {
          if (isMountedRef.current) {
            setSpeaking(false);
          }
          resolve();
          return;
        }

        const chunk = chunks[currentIndex];
        const encodedText = encodeURIComponent(chunk);

        // Google Translate TTS URL - works for Hebrew
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=he&client=tw-ob&q=${encodedText}`;

        const audio = new Audio(url);
        audioRef.current = audio;

        // Adjust playback rate
        audio.playbackRate = rate;

        audio.onplay = () => {
          if (isMountedRef.current && !stoppedRef.current) {
            setSpeaking(true);
          }
        };

        audio.onended = () => {
          // Check if stopped before scheduling next chunk
          if (stoppedRef.current || !isMountedRef.current) {
            resolve();
            return;
          }

          currentIndex++;
          if (currentIndex < chunks.length) {
            // Small pause between chunks - track timeout for cleanup
            timeoutRef.current = setTimeout(playNextChunk, 200);
          } else {
            if (isMountedRef.current) {
              setSpeaking(false);
            }
            resolve();
          }
        };

        audio.onerror = (e) => {
          console.error('Google TTS error:', e);
          if (stoppedRef.current || !isMountedRef.current) {
            resolve();
            return;
          }

          currentIndex++;
          // Try next chunk even if one fails
          if (currentIndex < chunks.length) {
            playNextChunk();
          } else {
            if (isMountedRef.current) {
              setSpeaking(false);
            }
            reject(new Error('Audio playback failed'));
          }
        };

        audio.play().catch((err) => {
          console.error('Play failed:', err);
          if (stoppedRef.current || !isMountedRef.current) {
            resolve();
            return;
          }

          // Try Web Speech API as fallback
          playWithWebSpeech(chunk)
            .then(() => {
              if (stoppedRef.current || !isMountedRef.current) {
                resolve();
                return;
              }
              currentIndex++;
              if (currentIndex < chunks.length) {
                playNextChunk();
              } else {
                resolve();
              }
            })
            .catch(reject);
        });
      };

      playNextChunk();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleanHebrewText, splitTextIntoChunks, rate]);

  /**
   * Fallback: Play using Web Speech API
   */
  const playWithWebSpeech = useCallback((text) => {
    return new Promise((resolve, reject) => {
      if (!window.speechSynthesis) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }

      const cleanText = cleanHebrewText(text);
      if (!cleanText) {
        reject(new Error('No text to speak'));
        return;
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'he-IL';
      utterance.rate = rate;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Try to find Hebrew voice
      const voices = window.speechSynthesis.getVoices();
      const hebrewVoice = voices.find(v =>
        v.lang.startsWith('he') || v.name.toLowerCase().includes('hebrew')
      );
      if (hebrewVoice) {
        utterance.voice = hebrewVoice;
      }

      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => {
        setSpeaking(false);
        resolve();
      };
      utterance.onerror = (e) => {
        setSpeaking(false);
        reject(e);
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    });
  }, [cleanHebrewText, rate]);

  /**
   * Main speak function - tries Google TTS first, then Web Speech API
   */
  const speak = useCallback(async (text, lang = 'he-IL') => {
    if (!text) {
      console.warn('No text to speak');
      return;
    }

    // Stop any ongoing speech
    stop();

    try {
      // Try Google TTS first (most reliable for Hebrew)
      await playWithGoogleTTS(text);
    } catch (err) {
      console.warn('Google TTS failed, trying Web Speech API:', err);
      try {
        await playWithWebSpeech(text);
      } catch (err2) {
        console.error('All TTS methods failed:', err2);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playWithGoogleTTS, playWithWebSpeech]);

  /**
   * Stop speaking
   */
  const stop = useCallback(() => {
    // Set stopped flag to prevent any pending callbacks from continuing
    stoppedRef.current = true;

    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  }, []);

  /**
   * Toggle speaking
   */
  const toggle = useCallback((text, lang) => {
    if (speaking) {
      stop();
    } else {
      speak(text, lang);
    }
  }, [speaking, speak, stop]);

  /**
   * Adjust speech rate
   */
  const adjustRate = useCallback((newRate) => {
    setRate(Math.max(0.5, Math.min(2.0, newRate)));
  }, []);

  const speedUp = useCallback(() => adjustRate(rate + 0.1), [rate, adjustRate]);
  const slowDown = useCallback(() => adjustRate(rate - 0.1), [rate, adjustRate]);

  return {
    speak,
    stop,
    toggle,
    speaking,
    supported,
    voicesLoaded,
    hebrewVoiceAvailable: true, // Always true with Google TTS
    hebrewVoiceName: 'Google Translate Hebrew',
    rate,
    adjustRate,
    speedUp,
    slowDown,
    // Compatibility with existing code
    pause: stop,
    resume: () => {},
  };
};

export default useSpeech;
