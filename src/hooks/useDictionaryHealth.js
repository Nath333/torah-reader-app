/**
 * useDictionaryHealth - Subscribe to dictionary load status.
 *
 * Polls getDictionaryHealth() from dictionaryLoader. Polling (rather than an
 * event bus) keeps the loader dependency-free; dictionaries settle within a
 * few seconds on first load so a 2s tick is plenty. The hook returns a
 * memoized snapshot plus a summary so consumers can render a warning badge
 * without reading every dictionary entry.
 */
import { useEffect, useState } from 'react';
import {
  getDictionaryHealth,
  getDictionaryHealthSummary,
  getUnhealthyDictionaries
} from '../services/dictionaries/dictionaryLoader';

const POLL_MS = 2000;

export default function useDictionaryHealth() {
  const [state, setState] = useState(() => ({
    health: getDictionaryHealth(),
    summary: getDictionaryHealthSummary(),
    unhealthy: getUnhealthyDictionaries()
  }));

  useEffect(() => {
    // Skip polling in test environments to avoid open handles.
    if (typeof window === 'undefined') return undefined;

    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      setState({
        health: getDictionaryHealth(),
        summary: getDictionaryHealthSummary(),
        unhealthy: getUnhealthyDictionaries()
      });
    };
    const id = setInterval(tick, POLL_MS);
    // Stop polling once the page is hidden to save a timer tick per tab.
    const onVisibility = () => { if (!document.hidden) tick(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return state;
}
