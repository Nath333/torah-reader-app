/**
 * tanakhFrenchService — traductions françaises OFFICIELLES du Tanakh.
 *
 * Deux versions du domaine public, pré-téléchargées dans public/data/ :
 *  - segond   : Louis Segond (1910) — open data getbible.net (ls1910)
 *  - rabbinat : La Bible du Rabbinat (1899, Rabbinat français) — Wikisource
 *
 * Le choix est persisté (localStorage) et lu par le hook de traduction :
 * le Tanakh affiche le français officiel (instantané, hors-ligne) ; la
 * chaîne Lingva/IA ne sert qu'en secours (Talmud, Onkelos, Rashi…).
 */

const VERSIONS = {
  segond: { dir: 'tanakh-fr', label: 'Segond 1910' },
  rabbinat: { dir: 'tanakh-fr-rabbinat', label: 'Rabbinat 1899' },
  martin: { dir: 'tanakh-fr-martin', label: 'Martin 1744' }
};
const VERSION_ORDER = ['segond', 'rabbinat', 'martin'];

const PREF_KEY = 'torah_fr_tanakh_version';

export const getTanakhVersion = () => {
  try {
    const v = localStorage.getItem(PREF_KEY);
    if (VERSION_ORDER.includes(v)) return v;
  } catch { /* localStorage indisponible */ }
  return 'segond';
};

export const setTanakhVersion = (version) => {
  const v = VERSION_ORDER.includes(version) ? version : 'segond';
  try { localStorage.setItem(PREF_KEY, v); } catch { /* noop */ }
  return v;
};

export const getTanakhVersionLabel = () => VERSIONS[getTanakhVersion()].label;

export const getTanakhVersions = () => VERSION_ORDER.map(v => ({ id: v, label: VERSIONS[v].label }));

export const switchTanakhVersionPref = () => {
  const next = VERSION_ORDER[(VERSION_ORDER.indexOf(getTanakhVersion()) + 1) % VERSION_ORDER.length];
  return setTanakhVersion(next);
};

// Noms Sefaria (bookConstants) → n° de fichier getbible/segment Wikisource
const SEFARIA_TO_NR = {
  Genesis: 1,
  Exodus: 2,
  Leviticus: 3,
  Numbers: 4,
  Deuteronomy: 5,
  Joshua: 6,
  Judges: 7,
  Ruth: 8,
  'I Samuel': 9,
  'II Samuel': 10,
  'I Kings': 11,
  'II Kings': 12,
  'I Chronicles': 13,
  'II Chronicles': 14,
  Ezra: 15,
  Nehemiah: 16,
  Esther: 17,
  Job: 18,
  Psalms: 19,
  Proverbs: 20,
  Ecclesiastes: 21,
  'Song of Songs': 22,
  Isaiah: 23,
  Jeremiah: 24,
  Lamentations: 25,
  Ezekiel: 26,
  Daniel: 27,
  Hosea: 28,
  Joel: 29,
  Amos: 30,
  Obadiah: 31,
  Jonah: 32,
  Micah: 33,
  Nahum: 34,
  Habakkuk: 35,
  Zephaniah: 36,
  Haggai: 37,
  Zechariah: 38,
  Malachi: 39
};

const bookCache = new Map();      // `${version}:${nr}` → données
const bookPromises = new Map();   // dédup des loads en vol

export const isTanakhBook = (book) => Boolean(SEFARIA_TO_NR[book]);

const loadBook = async (book) => {
  const nr = SEFARIA_TO_NR[book];
  const version = getTanakhVersion();
  if (!nr) return null;
  const cacheKey = `${version}:${nr}`;
  if (bookCache.has(cacheKey)) return bookCache.get(cacheKey);
  if (bookPromises.has(cacheKey)) return bookPromises.get(cacheKey);

  const promise = fetch(`${process.env.PUBLIC_URL || ''}/data/${VERSIONS[version].dir}/${nr}.json`)
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      bookCache.set(cacheKey, data);
      bookPromises.delete(cacheKey);
      return data;
    })
    .catch(() => {
      bookPromises.delete(cacheKey);
      return null;
    });
  bookPromises.set(cacheKey, promise);
  return promise;
};

/** Texte français d'un verset du Tanakh — null si absent (→ secours IA). */
export const getFrenchVerse = async (book, chapter, verse) => {
  const data = await loadBook(book);
  if (!data) return null;
  return data.chapters?.[String(chapter)]?.[String(verse)] || null;
};

/** Chapitre entier { verseNum: texte } — null si livre/chapitre inconnu. */
export const getFrenchChapter = async (book, chapter) => {
  const data = await loadBook(book);
  if (!data) return null;
  return data.chapters?.[String(chapter)] || null;
};

export default { isTanakhBook, getFrenchVerse, getFrenchChapter, getTanakhVersion, setTanakhVersion, getTanakhVersionLabel, getTanakhVersions, switchTanakhVersionPref };
