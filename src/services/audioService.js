// Audio Service for Torah verse playback
// Provides multiple audio sources for Torah reading

// Audio source configurations
const AUDIO_SOURCES = {
  // Chabad.org has audio for parsha readings
  chabad: {
    name: 'Chabad',
    baseUrl: 'https://www.chabad.org/media/audio',
    available: ['Torah'],
    format: 'mp3'
  },
  // TorahClass has verse-by-verse audio (requires lookup)
  torahClass: {
    name: 'TorahClass',
    baseUrl: 'https://torahclass.com/audio',
    available: ['Torah'],
    format: 'mp3'
  },
  // Web Speech API as fallback
  speechSynthesis: {
    name: 'Text-to-Speech',
    available: ['All'],
    format: 'synthetic'
  }
};

// Hebrew voice names to prefer
const PREFERRED_HEBREW_VOICES = [
  'Microsoft David',
  'Google Hebrew',
  'Hebrew',
  'he-IL',
  'he_IL'
];

/**
 * Get the best available Hebrew voice for speech synthesis
 * @returns {SpeechSynthesisVoice|null} Best Hebrew voice or null
 */
export const getBestHebrewVoice = () => {
  if (!window.speechSynthesis) return null;

  const voices = window.speechSynthesis.getVoices();

  // First try to find a dedicated Hebrew voice
  for (const prefName of PREFERRED_HEBREW_VOICES) {
    const voice = voices.find(v =>
      v.name.toLowerCase().includes(prefName.toLowerCase()) ||
      v.lang.toLowerCase().includes('he')
    );
    if (voice) return voice;
  }

  // Fallback to any Hebrew voice
  const hebrewVoice = voices.find(v => v.lang.startsWith('he'));
  if (hebrewVoice) return hebrewVoice;

  // Last resort: use default voice
  return voices[0] || null;
};

/**
 * Speak Hebrew text using Web Speech API
 * @param {string} text - Hebrew text to speak
 * @param {Object} options - Speech options
 * @returns {Promise<void>}
 */
export const speakHebrew = (text, options = {}) => {
  return new Promise((resolve, reject) => {
    if (!window.speechSynthesis) {
      reject(new Error('Speech synthesis not supported'));
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    // Get best Hebrew voice
    const voice = getBestHebrewVoice();
    if (voice) {
      utterance.voice = voice;
    }

    // Set language
    utterance.lang = 'he-IL';

    // Apply options
    utterance.rate = options.rate || 0.85; // Slightly slower for clarity
    utterance.pitch = options.pitch || 1.0;
    utterance.volume = options.volume || 1.0;

    utterance.onend = () => resolve();
    utterance.onerror = (error) => reject(error);

    window.speechSynthesis.speak(utterance);
  });
};

/**
 * Stop any ongoing speech
 */
export const stopSpeech = () => {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
};

/**
 * Pause speech
 */
export const pauseSpeech = () => {
  if (window.speechSynthesis) {
    window.speechSynthesis.pause();
  }
};

/**
 * Resume speech
 */
export const resumeSpeech = () => {
  if (window.speechSynthesis) {
    window.speechSynthesis.resume();
  }
};

/**
 * Check if speech is currently playing
 * @returns {boolean}
 */
export const isSpeaking = () => {
  return window.speechSynthesis?.speaking || false;
};

/**
 * Check if speech is paused
 * @returns {boolean}
 */
export const isPaused = () => {
  return window.speechSynthesis?.paused || false;
};

// Audio player state
let currentAudio = null;
let audioContext = null;

/**
 * Play audio from URL
 * @param {string} url - Audio URL
 * @returns {Promise<HTMLAudioElement>}
 */
export const playAudioUrl = (url) => {
  return new Promise((resolve, reject) => {
    // Stop current audio
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }

    const audio = new Audio(url);
    currentAudio = audio;

    audio.oncanplaythrough = () => {
      audio.play()
        .then(() => resolve(audio))
        .catch(reject);
    };

    audio.onerror = () => {
      reject(new Error('Failed to load audio'));
    };

    audio.load();
  });
};

/**
 * Stop current audio playback
 */
export const stopAudio = () => {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  stopSpeech();
};

/**
 * Cantillation (trop/taamim) audio configurations
 * Maps taamim to audio files or descriptions
 */
export const CANTILLATION_INFO = {
  'etnachta': { name: 'Etnachta', symbol: '֑', type: 'disjunctive' },
  'sof-pasuk': { name: 'Sof Pasuk', symbol: '׃', type: 'disjunctive' },
  'zakef-katan': { name: 'Zakef Katan', symbol: '֔', type: 'disjunctive' },
  'zakef-gadol': { name: 'Zakef Gadol', symbol: '֕', type: 'disjunctive' },
  'tipcha': { name: 'Tipcha', symbol: '֖', type: 'disjunctive' },
  'mercha': { name: 'Mercha', symbol: '֥', type: 'conjunctive' },
  'munach': { name: 'Munach', symbol: '֣', type: 'conjunctive' },
  'mahpach': { name: 'Mahpach', symbol: '֤', type: 'conjunctive' },
  'darga': { name: 'Darga', symbol: '֧', type: 'conjunctive' },
  'kadma': { name: 'Kadma', symbol: '֨', type: 'conjunctive' },
  'telisha-gedola': { name: 'Telisha Gedola', symbol: '֠', type: 'disjunctive' },
  'telisha-ketana': { name: 'Telisha Ketana', symbol: '֩', type: 'conjunctive' },
  'pazer': { name: 'Pazer', symbol: '֡', type: 'disjunctive' },
  'geresh': { name: 'Geresh', symbol: '֜', type: 'disjunctive' },
  'gershayim': { name: 'Gershayim', symbol: '֞', type: 'disjunctive' },
  'revi\'i': { name: 'Revi\'i', symbol: '֗', type: 'disjunctive' },
  'tevir': { name: 'Tevir', symbol: '֛', type: 'disjunctive' },
  'yetiv': { name: 'Yetiv', symbol: '֚', type: 'disjunctive' },
  'karnei-para': { name: 'Karnei Para', symbol: '֟', type: 'disjunctive' },
  'shalshelet': { name: 'Shalshelet', symbol: '֓', type: 'disjunctive' }
};

/**
 * Create audio queue for reading multiple verses
 * @param {Array<string>} texts - Array of Hebrew texts
 * @param {Object} options - Speech options
 * @returns {Object} Queue controller
 */
export const createAudioQueue = (texts, options = {}) => {
  let currentIndex = 0;
  let isPlaying = false;
  let isPausedState = false;
  let onProgressCallback = null;
  let onCompleteCallback = null;

  const playNext = async () => {
    if (currentIndex >= texts.length || !isPlaying) {
      isPlaying = false;
      if (onCompleteCallback) onCompleteCallback();
      return;
    }

    if (isPausedState) return;

    try {
      if (onProgressCallback) {
        onProgressCallback(currentIndex, texts.length);
      }

      await speakHebrew(texts[currentIndex], options);
      currentIndex++;

      // Small pause between verses
      await new Promise(resolve => setTimeout(resolve, 500));

      playNext();
    } catch (error) {
      console.error('Error playing audio:', error);
      isPlaying = false;
    }
  };

  return {
    play: () => {
      isPlaying = true;
      isPausedState = false;
      playNext();
    },
    pause: () => {
      isPausedState = true;
      pauseSpeech();
    },
    resume: () => {
      isPausedState = false;
      resumeSpeech();
      playNext();
    },
    stop: () => {
      isPlaying = false;
      currentIndex = 0;
      stopSpeech();
    },
    skip: () => {
      stopSpeech();
      currentIndex++;
      if (isPlaying) playNext();
    },
    previous: () => {
      stopSpeech();
      currentIndex = Math.max(0, currentIndex - 1);
      if (isPlaying) playNext();
    },
    onProgress: (callback) => {
      onProgressCallback = callback;
    },
    onComplete: (callback) => {
      onCompleteCallback = callback;
    },
    getCurrentIndex: () => currentIndex,
    isPlaying: () => isPlaying,
    isPaused: () => isPausedState
  };
};

/**
 * Initialize audio context for advanced features
 */
export const initAudioContext = () => {
  if (!audioContext && window.AudioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
};

const audioService = {
  getBestHebrewVoice,
  speakHebrew,
  stopSpeech,
  pauseSpeech,
  resumeSpeech,
  isSpeaking,
  isPaused,
  playAudioUrl,
  stopAudio,
  createAudioQueue,
  initAudioContext,
  CANTILLATION_INFO,
  AUDIO_SOURCES
};

export default audioService;
