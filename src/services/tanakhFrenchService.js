/**
 * tanakhFrenchService — traduction française OFFICIELLE du Tanakh.
 *
 * Source : Louis Segond (1910), domaine public, données open data
 * getbible.net (v2, translation ls1910) — pré-téléchargées dans
 * public/data/tanakh-fr/{nr}.json (39 livres, 23 212 versets).
 *
 * C'est la source PRIMAIRE du français pour les livres du Tanakh :
 * traduction humaine de référence, instantanée, hors-ligne après le
 * premier chargement. La chaîne Lingva/IA ne sert qu'en secours pour
 * les livres sans version française (Talmud, Onkelos, Rashi…).
 */

const BASE = `${process.env.PUBLIC_URL || ''}/data/tanakh-fr`;

// Noms Sefaria (bookConstants) → n° getbible ls1910
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

const bookCache = new Map();      // nr → { name, chapters: { ch: { v: text } } }
const bookPromises = new Map();   // nr → Promise (dédup des loads en vol)

export const isTanakhBook = (book) => Boolean(SEFARIA_TO_NR[book]);

const loadBook = async (book) => {
  const nr = SEFARIA_TO_NR[book];
  if (!nr) return null;
  if (bookCache.has(nr)) return bookCache.get(nr);
  if (bookPromises.has(nr)) return bookPromises.get(nr);

  const promise = fetch(`${BASE}/${nr}.json`)
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      bookCache.set(nr, data);
      bookPromises.delete(nr);
      return data;
    })
    .catch(() => {
      bookPromises.delete(nr);
      return null;
    });
  bookPromises.set(nr, promise);
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

export default { isTanakhBook, getFrenchVerse, getFrenchChapter };
