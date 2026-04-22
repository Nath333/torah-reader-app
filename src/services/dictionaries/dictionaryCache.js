/**
 * Dictionary IndexedDB Persistence
 *
 * Caches parsed dictionary JSON in IndexedDB so subsequent sessions skip the
 * network fetch for ~78 MB of lexicon data. Graceful no-op when IndexedDB is
 * unavailable (SSR, private mode with storage disabled, etc.).
 */

import { createLogger } from '../../utils/debug';

const log = createLogger('DictionaryCache');

const DB_NAME = 'torah-dictionaries';
const DB_VERSION = 1;
const STORE = 'entries';

// Bump this when the shape of cached data or any source file changes to force
// a refetch on next load.
export const CACHE_VERSION = 'v1';

let dbPromise = null;
let unavailable = false;

function isAvailable() {
  return !unavailable && typeof indexedDB !== 'undefined';
}

function openDB() {
  if (dbPromise) return dbPromise;
  if (!isAvailable()) return Promise.resolve(null);

  dbPromise = new Promise((resolve) => {
    let req;
    try {
      req = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (err) {
      log.debug('IndexedDB open threw:', err?.message);
      unavailable = true;
      resolve(null);
      return;
    }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      log.debug('IndexedDB open failed:', req.error?.message);
      unavailable = true;
      resolve(null);
    };
    req.onblocked = () => resolve(null);
  });
  return dbPromise;
}

export async function getCached(fileName) {
  try {
    const db = await openDB();
    if (!db) return null;
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(fileName);
      req.onsuccess = () => {
        const record = req.result;
        if (!record || record.version !== CACHE_VERSION) {
          resolve(null);
        } else {
          resolve(record.data);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    log.debug(`[${fileName}] IDB read failed:`, err?.message);
    return null;
  }
}

export async function putCached(fileName, data) {
  try {
    const db = await openDB();
    if (!db) return;
    await new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(
        { version: CACHE_VERSION, data, storedAt: Date.now() },
        fileName
      );
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    });
  } catch (err) {
    log.debug(`[${fileName}] IDB write failed:`, err?.message);
  }
}

export async function clearCache() {
  try {
    const db = await openDB();
    if (!db) return;
    await new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (err) {
    log.debug('IDB clear failed:', err?.message);
  }
}
