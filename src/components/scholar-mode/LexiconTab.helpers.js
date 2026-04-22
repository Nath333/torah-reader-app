/**
 * LexiconTab helpers - Constants and utility functions for LexiconTab
 */
import { safeGet, safeSet } from '../../utils/safeLocalStorage';

// LocalStorage key for search history
export const HISTORY_KEY = 'lexicon-search-history';
export const MAX_HISTORY = 10;

// Load/save history helpers - using safeLocalStorage
export const loadHistory = () => safeGet(HISTORY_KEY, []);
export const saveHistory = (history) => safeSet(HISTORY_KEY, history);
