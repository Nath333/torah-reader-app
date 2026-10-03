/**
 * persistedStore — le couple initializeX()/persistX() qui était copié-collé
 * dans les quatre services d'apprentissage (srsService, aiMemoryService,
 * learningRecommendationService, wordRelationshipService), une fois pour
 * toutes.
 *
 * Sémantique identique à l'original : lecture JSON une fois au démarrage,
 * écriture muette en cas d'échec (navigation privée, quota dépassé) — un
 * échec de persistance ne doit jamais casser la session d'étude.
 *
 * @example
 * const store = createPersistedStore('srs_store', DEFAULT_DATA, { name: 'SRS' });
 * const data = store.load();      // lit localStorage, sinon données par défaut
 * store.save(nextData);           // persiste (silencieux en cas d'échec)
 */
import { createLogger } from './debug';

const log = createLogger('persistedStore');

export const createPersistedStore = (key, defaultData, options = {}) => {
  // serialize retourne un OBJET (par défaut identité) ; le helper fait le
  // JSON.stringify — un seul endroit encode, jamais deux.
  const { name = key, serialize = (d) => d, deserialize = JSON.parse } = options;
  let data = defaultData;

  const load = () => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) data = deserialize(raw);
    } catch (err) {
      log.warn(`Failed to load ${name}:`, err);
    }
    return data;
  };

  const save = (value) => {
    if (value !== undefined) data = value;
    try {
      // JSON.stringify s'applique AUSSI au résultat d'un serialize custom
      // (celui-ci retourne un objet plat, ex. Map/Set -> arrays) : sans lui,
      // setItem stockerait "[object Object]" et la lecture perdrait tout.
      localStorage.setItem(key, JSON.stringify(serialize(data)));
    } catch (err) {
      log.warn(`Failed to persist ${name}:`, err);
    }
    return data;
  };

  return {
    load,
    save,
    /** Données courantes en mémoire (sans toucher au storage). */
    get: () => data,
  };
};
