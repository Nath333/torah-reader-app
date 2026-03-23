/**
 * Torah Reader App - Core Type Definitions
 *
 * This file contains TypeScript type definitions for the main entities
 * and interfaces used throughout the application.
 *
 * Usage:
 * - Import types: import type { Verse, WordLookupResult } from '../types';
 * - For JSDoc: @type {import('../types').Verse}
 */

// =============================================================================
// CORE ENTITIES
// =============================================================================

/**
 * A single verse of text
 */
export interface Verse {
  verse: number;
  text: string;
  textWithVowels?: string;
  english?: string;
  french?: string;
  reference?: string;
}

/**
 * Book/Chapter selection
 */
export interface TextSelection {
  category: 'Torah' | 'Prophets' | 'Writings' | 'Talmud' | 'Mishnah';
  book: string;
  chapter: string | number;
  verse?: number;
}

/**
 * Reading position for persistence
 */
export interface ReadingPosition {
  book: string;
  chapter: string | number;
  verse?: number;
  scrollPosition?: number;
  timestamp: number;
}

// =============================================================================
// WORD LOOKUP
// =============================================================================

/**
 * Result from word lookup
 */
export interface WordLookupResult {
  word: string;
  cleanedWord: string;
  english: string | null;
  french: string | null;
  translation?: string | null;
  source: string;
  sources: string[];
  language: 'Hebrew' | 'Aramaic' | 'Unknown';
  headword: string | null;
  root: string | null;
  confidence: number;
  lookupPath?: string | null;

  // Morphological analysis
  morphology?: MorphologyAnalysis;
  binyan?: BinyanAnalysis;

  // Enhanced data (V6)
  dialect?: string;
  historicalLayer?: string;
  cognates?: Cognate[];
  semanticField?: string;
  frequency?: FrequencyData;
}

/**
 * Morphological breakdown of a word
 */
export interface MorphologyAnalysis {
  prefix?: string[];
  suffix?: string[];
  root?: string;
  pattern?: string;
  tense?: string;
  person?: string;
  gender?: 'masculine' | 'feminine' | 'common';
  number?: 'singular' | 'plural' | 'dual';
  state?: 'absolute' | 'construct';
}

/**
 * Binyan (verbal stem) analysis
 */
export interface BinyanAnalysis {
  binyan: string;
  hebrewName: string;
  meaning: string;
  active: boolean;
  passive: boolean;
  reflexive: boolean;
  causative: boolean;
  intensive: boolean;
}

/**
 * Cognate word in related language
 */
export interface Cognate {
  language: string;
  word: string;
  meaning: string;
  relationship: string;
}

/**
 * Word frequency data
 */
export interface FrequencyData {
  count: number;
  band: 'very_common' | 'common' | 'moderate' | 'rare' | 'very_rare';
  percentile: number;
}

// =============================================================================
// COMMENTARY
// =============================================================================

/**
 * Commentary data for a verse
 */
export interface CommentaryData {
  rashi: CommentaryEntry[];
  tosafot: CommentaryEntry[];
  maharsha: CommentaryEntry[];
  ramban: CommentaryEntry[];
  ibnEzra: CommentaryEntry[];
  sforno: CommentaryEntry[];
  soncino: SoncinoFootnote[];
}

/**
 * A single commentary entry
 */
export interface CommentaryEntry {
  text: string;
  hebrewText?: string;
  englishText?: string;
  source?: string;
  reference?: string;
  dibur?: string; // Opening phrase (dibur hamaschil)
}

/**
 * Soncino footnote
 */
export interface SoncinoFootnote {
  id: string;
  text: string;
  marker?: string;
  type: 'explanation' | 'reference' | 'translation';
}

// =============================================================================
// STUDY FEATURES
// =============================================================================

/**
 * Bookmark entry
 */
export interface Bookmark {
  id: string;
  reference: string;
  book: string;
  chapter: string | number;
  verse?: number;
  note?: string;
  tags?: string[];
  createdAt: number;
  updatedAt?: number;
}

/**
 * Vocabulary entry
 */
export interface VocabularyEntry {
  id: string;
  word: string;
  translation: string;
  root?: string;
  source: string;
  addedAt: number;
  lastReviewed?: number;
  reviewCount: number;
  mastery: number; // 0-100
  notes?: string;
}

/**
 * Reading history entry
 */
export interface HistoryEntry {
  reference: string;
  book: string;
  chapter: string | number;
  timestamp: number;
  duration?: number; // Reading time in seconds
}

/**
 * Study streak data
 */
export interface StudyStreak {
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: string; // ISO date string
  totalDays: number;
  history: string[]; // Array of ISO date strings
}

// =============================================================================
// SRS (SPACED REPETITION)
// =============================================================================

/**
 * SRS card for vocabulary review
 */
export interface SRSCard {
  id: string;
  word: string;
  translation: string;
  root?: string;
  interval: number; // Days until next review
  easeFactor: number; // Difficulty multiplier (default 2.5)
  repetitions: number;
  nextReview: number; // Timestamp
  lastReview?: number;
  quality?: number; // Last review quality (0-5)
}

/**
 * SRS review quality scores
 */
export type SRSQuality = 0 | 1 | 2 | 3 | 4 | 5;

// =============================================================================
// SETTINGS
// =============================================================================

/**
 * Application settings
 */
export interface AppSettings {
  // Display
  darkMode: boolean;
  fontSize: 'small' | 'medium' | 'large';
  showVowels: boolean;
  showCantillation: boolean;

  // Languages
  showEnglish: boolean;
  showFrench: boolean;
  showOnkelos: boolean;

  // Commentary
  showRashi: boolean;
  showTosafot: boolean;
  showMaharsha: boolean;
  showRamban: boolean;
  showIbnEzra: boolean;
  showSforno: boolean;
  showSoncino: boolean;

  // Dictionary
  dictionaryPriority: string[];

  // Study
  focusMode: boolean;
  autoPlayAudio: boolean;
  srsEnabled: boolean;
}

// =============================================================================
// AI & ANALYSIS
// =============================================================================

/**
 * AI analysis request
 */
export interface AnalysisRequest {
  text: string;
  reference?: string;
  mode: AnalysisMode;
  context?: string;
}

/**
 * Available analysis modes
 */
export type AnalysisMode =
  | 'summary'
  | 'compare'
  | 'halacha'
  | 'hashkafa'
  | 'linguistic'
  | 'historical'
  | 'structure';

/**
 * AI analysis result
 */
export interface AnalysisResult {
  content: string;
  mode: AnalysisMode;
  timestamp: number;
  reference?: string;
  diagram?: string; // Mermaid diagram if applicable
}

// =============================================================================
// CACHE & TELEMETRY
// =============================================================================

/**
 * Cache entry with metadata
 */
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
  memoryEstimate: number;
}

/**
 * Telemetry data
 */
export interface TelemetryData {
  lookups: number;
  cacheHits: number;
  cacheMisses: number;
  avgLookupTime: number;
  errorCount: number;
  lastReset: number;
}

// =============================================================================
// HOOK RETURN TYPES
// =============================================================================

/**
 * useWordLookup hook return type
 */
export interface UseWordLookupReturn {
  selectedWord: string | null;
  translationData: WordLookupResult | null;
  isLoading: boolean;
  isAramaic: boolean;
  frenchTranslation: string | null;
  lookup: (word: string, options?: { reference?: string }) => Promise<void>;
  loadFrench: () => Promise<string | null>;
  clear: () => void;
}

/**
 * useAsyncOperation hook return type
 */
export interface UseAsyncOperationReturn<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  isSuccess: boolean;
  isError: boolean;
  execute: (...args: unknown[]) => Promise<T | void>;
  reset: () => void;
  setData: (data: T | ((prev: T | null) => T)) => void;
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Deep partial type
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Make certain properties required
 */
export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };

/**
 * Extract the value type from a record
 */
export type ValueOf<T> = T[keyof T];
