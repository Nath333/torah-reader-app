import { useState, useEffect, useRef, useCallback } from 'react';
import { translateWithSource, translateEnglishToFrench, resetApiState } from '../services/dictionaries/englishToFrenchService';
import { createLogger } from '../utils/debug';

const log = createLogger('useTranslationLoading');

/**
 * Custom hook for loading French translations for verses and Onkelos.
 * Handles parallel loading and prevents duplicate translation requests.
 *
 * @param {Object} options
 * @param {Array} options.verses - Array of verse objects
 * @param {Array} options.onkelos - Array of Onkelos translations
 * @param {string} options.selectedBook - Current book
 * @param {string|number} options.selectedChapter - Current chapter
 * @param {boolean} options.showFrench - Whether French is enabled
 * @param {boolean} options.showOnkelos - Whether Onkelos is enabled
 * @returns {Object} Translation data for verses and Onkelos
 */
export default function useTranslationLoading({
  verses = [],
  onkelos = [],
  selectedBook,
  selectedChapter,
  showFrench = false,
  showOnkelos = false
}) {
  // French translations for main verses
  const [verseFrench, setVerseFrench] = useState({});

  // French translations for Onkelos
  const [onkelosFrench, setOnkelosFrench] = useState({});

  // Track which items are being translated to prevent duplicate requests
  const verseTranslatingRef = useRef(new Set());
  const onkelosTranslatingRef = useRef(new Set());

  // Items déjà traduits avec succès : un re-run (bouton Réessayer) ne doit
  // pas repayer les traductions obtenues.
  const verseDoneRef = useRef(new Set());
  const onkelosDoneRef = useRef(new Set());

  // Échecs définitifs (toutes sources épuisées) — l'UI affiche
  // « traduction indisponible » au lieu d'un Chargement éternel.
  const [verseFailed, setVerseFailed] = useState({});
  const [onkelosFailed, setOnkelosFailed] = useState({});

  // Réessai manuel : réarme les disjoncteurs réseau, DRAINE la file (des
  // items gelés ne doivent pas survivre au Réessayer) et rejoue les items
  // en échec (retryTick est dans les deps des effets de chargement).
  const [retryTick, setRetryTick] = useState(0);
  const retryFrench = useCallback(() => {
    resetApiState();
    setVerseFailed({});
    setOnkelosFailed({});
    verseTranslatingRef.current.clear();
    onkelosTranslatingRef.current.clear();
    setRetryTick(t => t + 1);
  }, []);

  // Réessai AUTOMATIQUE borné : quand des items échouent (rafale Lingva,
  // IA capricieuse), deux vagues espacées de 60 s rejouent les échecs sans
  // demander de clic — à condition que l'onglet soit visible (on ne traduit
  // pas pour quelqu'un qui regarde ailleurs). Annulé au changement de
  // chapitre et au démontage.
  const autoRetryRef = useRef({ timer: null, count: 0 });
  const scheduleAutoRetry = useCallback(() => {
    const st = autoRetryRef.current;
    if (st.timer || st.count >= 2) return;
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
    st.timer = setTimeout(() => {
      st.timer = null;
      st.count += 1;
      setVerseFailed({});
      setOnkelosFailed({});
      verseTranslatingRef.current.clear();
      onkelosTranslatingRef.current.clear();
      setRetryTick(t => t + 1);
    }, 60 * 1000);
  }, []);
  const cancelAutoRetry = useCallback(() => {
    if (autoRetryRef.current.timer) {
      clearTimeout(autoRetryRef.current.timer);
      autoRetryRef.current.timer = null;
    }
    autoRetryRef.current.count = 0;
  }, []);

  // Pas de garde mountedRef ici : appeler setState après démontage est un
  // no-op sans danger en React 18+, alors une garde mal placée avale des
  // résultats résolus en silence (versets bloqués à jamais). Chaque item
  // est néanmoins borné par une course contre un timer : un gel quelconque
  // de la file devient un échec VISIBLE au bout de ITEM_TIMEOUT. La borne
  // couvre le pire cas d'un item : relais + tournée miroirs + IA + 2e IA.
  const ITEM_TIMEOUT = 130 * 1000;
  // Échelonnage : 6 items au départ, puis +6 toutes les 1,5 s — un chapitre
  // entier (60+ requêtes versets+Onkelos) ne part plus en rafale.
  const STAGGER_BATCH = 6;
  const STAGGER_DELAY = 1500;
  const withTimeout = (p) => Promise.race([
    p,
    new Promise(res => setTimeout(() => res(null), ITEM_TIMEOUT)),
  ]);

  // Annule la vague automatique au changement de chapitre/livre.
  useEffect(() => cancelAutoRetry, [cancelAutoRetry]);

  // Load French translations for Onkelos (parallel loading)
  useEffect(() => {
    if (!showFrench || !showOnkelos || onkelos.length === 0) return;

    // Filter items that need translation (not already translated or being translated)
    const toTranslate = onkelos.filter(item => {
      return item.english && !onkelosTranslatingRef.current.has(item.verse) && !onkelosDoneRef.current.has(item.verse);
    });

    if (toTranslate.length === 0) return;

    const itemKeys = toTranslate.map(item => item.verse);

    // Mark as translating to prevent duplicate requests
    itemKeys.forEach(k => onkelosTranslatingRef.current.add(k));

    // Application incrémentale + ÉCHELONNÉE : les items partent par petits
    // lots (6 toutes les 1,5 s) — la rafale de 60+ requêtes d'un coup
    // déclenchait le rate-limit de Lingva et vouait la moitié du chapitre
    // à l'IA lente. Chaque item s'affiche dès SA résolution.
    const pendingItems = toTranslate.slice();
    const launchOnkelos = (item) => {
      (async () => {
        let french = null;
        try {
          french = await withTimeout(translateEnglishToFrench(item.english));
        } catch (error) {
          log.warn('Failed to translate Onkelos to French:', error);
        }
        if (french) {
          onkelosDoneRef.current.add(item.verse);
          setOnkelosFrench(prev => ({ ...prev, [item.verse]: french }));
        } else {
          setOnkelosFailed(prev => ({ ...prev, [item.verse]: true }));
          scheduleAutoRetry();
        }
      })();
    };
    pendingItems.splice(0, STAGGER_BATCH).forEach(launchOnkelos);
    const staggerIv = setInterval(() => {
      if (pendingItems.length === 0) { clearInterval(staggerIv); return; }
      pendingItems.splice(0, STAGGER_BATCH).forEach(launchOnkelos);
    }, STAGGER_DELAY);

    return () => {
      clearInterval(staggerIv);
      // Remove in-flight items from tracking ref so they can be retried
      itemKeys.forEach(k => onkelosTranslatingRef.current.delete(k));
    };
  }, [showFrench, showOnkelos, onkelos, retryTick, scheduleAutoRetry]);

  // Load French translations for main verses (parallel loading)
  useEffect(() => {
    if (!showFrench || verses.length === 0) return;

    // Filter verses that need translation (not already being translated)
    const toTranslate = verses.filter(verse => {
      const cacheKey = `${selectedBook}:${selectedChapter}:${verse.verse}`;
      return verse.englishText && !verseTranslatingRef.current.has(cacheKey) && !verseDoneRef.current.has(cacheKey);
    });

    if (toTranslate.length === 0) return;

    const itemKeys = toTranslate.map(verse => `${selectedBook}:${selectedChapter}:${verse.verse}`);

    // Mark as translating to prevent duplicate requests
    itemKeys.forEach(k => verseTranslatingRef.current.add(k));

    // Application incrémentale + ÉCHELONNÉE : les items partent par petits
    // lots (6 toutes les 1,5 s) — la rafale de 60+ requêtes d'un coup
    // déclenchait le rate-limit de Lingva et vouait la moitié du chapitre
    // à l'IA lente. Chaque item s'affiche dès SA résolution.
    const pendingVerses = toTranslate.slice();
    const launchVerse = (verse) => {
      const cacheKey = `${selectedBook}:${selectedChapter}:${verse.verse}`;
      (async () => {
        let result = null;
        try {
          result = await withTimeout(translateWithSource(verse.englishText));
        } catch (error) {
          log.warn('Failed to translate verse to French:', error);
        }
        if (result?.translation) {
          verseDoneRef.current.add(cacheKey);
          setVerseFrench(prev => ({ ...prev, [cacheKey]: result }));
        } else {
          setVerseFailed(prev => ({ ...prev, [cacheKey]: true }));
          scheduleAutoRetry();
        }
      })();
    };
    pendingVerses.splice(0, STAGGER_BATCH).forEach(launchVerse);
    const staggerIv = setInterval(() => {
      if (pendingVerses.length === 0) { clearInterval(staggerIv); return; }
      pendingVerses.splice(0, STAGGER_BATCH).forEach(launchVerse);
    }, STAGGER_DELAY);

    return () => {
      clearInterval(staggerIv);
      // Remove in-flight items from tracking ref so they can be retried
      itemKeys.forEach(k => verseTranslatingRef.current.delete(k));
    };
  }, [showFrench, verses, selectedBook, selectedChapter, retryTick, scheduleAutoRetry]);

  // Clear translations when chapter changes
  useEffect(() => {
    cancelAutoRetry();
    setOnkelosFrench({});
    setVerseFrench({});
    setOnkelosFailed({});
    setVerseFailed({});
    onkelosTranslatingRef.current.clear();
    verseTranslatingRef.current.clear();
    onkelosDoneRef.current.clear();
    verseDoneRef.current.clear();
  }, [selectedBook, selectedChapter, cancelAutoRetry]);

  return {
    verseFrench,
    onkelosFrench,
    verseFailed,
    onkelosFailed,
    retryFrench
  };
}
