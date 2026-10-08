/**
 * Kit hors-ligne Sefaria — Torah + Rashi + Onkelos, par chapitre.
 *
 * Source : l'export officiel Sefaria (bucket GCS public « sefaria-export »,
 * index books.json régénéré le 2 de chaque mois), généré par
 * scripts/sefaria-kit.mjs au format API : text = [chapitres][verses] —
 * le même découpage que /texts/{Book}.{chapter} que consomme l'app.
 *
 * Le fichier (public/data/sefaria-kit-torah.json, ~7 Mo) est pré-caché par
 * le service worker (PRECACHE_DATA hebdomadaire, cf. src/index.js) : il est
 * donc disponible hors-ligne. Consulté UNIQUEMENT en repli quand le réseau
 * échoue — zéro coût en ligne.
 */

const KIT_URL = `${process.env.PUBLIC_URL || ''}/data/sefaria-kit-torah.json`;

let kitPromise = null;
let kitData = null;

/**
 * Charge (une seule fois) le kit. Résout null si indisponible (offline
 * sans pré-cache, fichier absent).
 * @returns {Promise<Object|null>}
 */
export function loadKit() {
  if (kitData) return Promise.resolve(kitData);
  if (!kitPromise) {
    kitPromise = fetch(KIT_URL)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        kitData = data;
        return data;
      })
      .catch(() => {
        kitData = null;
        return null;
      });
  }
  return kitPromise;
}

/**
 * Renvoie une réponse au format API Sefaria ({he: [...verses], text: [...]})
 * pour un chapitre du kit, ou null.
 * @param {string} apiBook - clé du kit, ex. « Genesis », « Rashi_on_Genesis »
 * @param {number|string} chapter - 1-based
 * @returns {Promise<{he: string[], text: string[]}|null>}
 */
export async function getChapter(apiBook, chapter) {
  const kit = await loadKit();
  if (!kit?.books?.[apiBook]) return null;
  const idx = parseInt(chapter, 10) - 1;
  if (!Number.isInteger(idx) || idx < 0) return null;

  const hebrew = kit.books[apiBook].versions.find((v) => v.lang === 'Hebrew');
  const english = kit.books[apiBook].versions.find((v) => v.lang === 'English');
  if (!hebrew?.chapters?.[idx]) return null;

  const chapterHe = hebrew.chapters[idx];
  const chapterText = english?.chapters?.[idx];
  // Les commentaires (Rashi) sont [chapitres][verses][commentaires] : l'app
  // consomme la même forme que l'API pour ce verset — on renvoie brut.
  return {
    he: chapterHe,
    text: chapterText !== undefined ? chapterText : chapterHe,
  };
}

/** Le kit connaît-il ce livre ? (sync, nécessite un kit déjà chargé) */
export function hasBook(apiBook) {
  return !!kitData?.books?.[apiBook];
}

/** Métadonnées pour l'UI (taille approximative affichable). */
export function kitInfo() {
  return {
    url: KIT_URL,
    loaded: !!kitData,
    books: kitData ? Object.keys(kitData.books).length : 0,
    generatedAt: kitData?.generatedAt || null,
  };
}

const sefariaOfflineKit = { loadKit, getChapter, hasBook, kitInfo };
export default sefariaOfflineKit;
