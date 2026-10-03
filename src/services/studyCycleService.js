// =============================================================================
// STUDY CYCLE SERVICE — les études du jour (Daf Yomi, Mishnah, Rambam…)
// =============================================================================
// Source de vérité : l'endpoint calendriers de Sefaria (le même amont que le
// texte de l'app, mis en cache par limud-proxy quand configuré).
// Choix de design : PAS de calcul local du Daf Yomi — une table non calibrée
// afficherait la mauvaise page, ce qui est pire que pas d'item. Sans réseau,
// getDailyStudy() renvoie simplement [] (l'item de la palette disparaît).
// =============================================================================

import { viaProxy } from './proxyConfig';

const CACHE_KEY = 'limud_daily_study_v1';
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 h : l'item du jour ne change pas sous nos pieds

/**
 * Parse un ref d'étude du jour en cible de navigation.
 * « Bekhorot 15 » -> { book: 'Bekhorot', chapter: 15 }
 * « Mishnah Oholot 7:5-6 » -> { book: 'Mishnah Oholot', chapter: 7 }
 * « Divorce 12 » -> { book: 'Divorce', chapter: 12 } (goTo refusera gracieusement si inconnu)
 * @returns {{ book: string, chapter: number } | null}
 */
export const parseStudyRef = (ref) => {
  const match = String(ref || '').match(/^(.+?)\s+(\d+)/);
  if (!match) return null;
  return { book: match[1].trim(), chapter: parseInt(match[2], 10) };
};

const readCache = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.fetchedAt > CACHE_TTL) return null;
    return parsed.items;
  } catch {
    return null;
  }
};

const writeCache = (items) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ fetchedAt: Date.now(), items }));
  } catch {
    /* quota / privé : le cache est un accélérateur, pas une dépendance */
  }
};

/**
 * Les études du jour, prêtes pour la palette.
 * @returns {Promise<Array<{ id: string, type: string, label: string, book: string, chapter: number }>>}
 *   [] si indisponible (offline, API en rade, refs non navigables).
 */
export const getDailyStudy = async () => {
  const cached = readCache();
  if (cached) return cached;

  try {
    const url = viaProxy(
      '/sefaria/api/calendars',
      'https://www.sefaria.org/api/calendars'
    );
    const response = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!response.ok) return [];
    const data = await response.json();

    const wanted = [
      { title: 'Daf Yomi', type: 'Daf Yomi', id: 'daily:daf' },
      { title: 'Daily Mishnah', type: 'Mishna', id: 'daily:mishna' },
      { title: 'Daily Rambam', type: 'Rambam', id: 'daily:rambam' }
    ];

    const items = [];
    for (const want of wanted) {
      const entry = (data.calendar_items || []).find(
        (ci) => ci?.title?.en === want.title && ci?.displayValue?.en
      );
      if (!entry) continue;
      const ref = entry.displayValue.en;
      const target = parseStudyRef(ref);
      if (!target) continue;
      items.push({
        id: want.id,
        type: want.type,
        label: `${want.type} du jour — ${ref}`,
        book: target.book,
        chapter: target.chapter
      });
    }

    if (items.length) writeCache(items);
    return items;
  } catch {
    return [];
  }
};

const studyCycleService = { getDailyStudy, parseStudyRef };
export default studyCycleService;
