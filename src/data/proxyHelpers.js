/**
 * Shared Proxy Helpers for Lazy-Loaded Dictionary Data
 *
 * All wrappers in src/data/ must use one of the helpers below.
 * Do not hand-roll Proxies for dictionary access (see DICTIONARIES.md §5).
 */

// Properties React Fast Refresh and certain frameworks probe on any object.
// We don't want to print deprecation warnings for these.
const REACT_INTERNAL_PROPS = new Set([
  '$$typeof', 'prototype', 'render', 'displayName', 'name', 'length',
  'propTypes', 'defaultProps', 'contextTypes', 'childContextTypes',
  'getDerivedStateFromProps', 'getDerivedStateFromError', 'type',
  'then', 'constructor'
]);

const isInternalProp = (prop) =>
  typeof prop === 'symbol' || REACT_INTERNAL_PROPS.has(prop);

/**
 * Create a lazy proxy that exposes the full dictionary object for reads.
 * Use when callers legitimately need `OBJ[key]`, `key in OBJ`, `Object.keys(OBJ)`.
 *
 * @param {Function} dataGetter - sync getter that returns the cached object, or null if not loaded
 * @returns {Proxy}
 */
export function createLazyProxy(dataGetter) {
  return new Proxy({}, {
    get: (_, prop) => {
      if (prop === Symbol.iterator) {
        const data = dataGetter();
        if (!data) return undefined;
        return function* () {
          for (const key of Object.keys(data)) {
            yield [key, data[key]];
          }
        };
      }
      if (prop === Symbol.toStringTag) return 'LazyProxy';
      if (typeof prop === 'symbol') return undefined;
      if (prop === 'toJSON') return () => dataGetter() || {};

      const data = dataGetter();
      return data?.[prop];
    },

    has: (_, prop) => {
      if (typeof prop === 'symbol') return false;
      const data = dataGetter();
      return data ? prop in data : false;
    },

    ownKeys: () => {
      const data = dataGetter();
      return data ? Object.keys(data) : [];
    },

    getOwnPropertyDescriptor: (_, prop) => {
      const data = dataGetter();
      if (data && prop in data) {
        return {
          value: data[prop],
          writable: false,
          enumerable: true,
          configurable: true
        };
      }
      return undefined;
    }
  });
}

/**
 * Minimal variant — same API but no Symbol.iterator / toJSON sugar.
 * Kept for rare callers that rely on the exact shape.
 */
export function createSimpleLazyProxy(dataGetter) {
  return new Proxy({}, {
    get: (_, prop) => (typeof prop === 'symbol' ? undefined : dataGetter()?.[prop]),
    has: (_, prop) => {
      if (typeof prop === 'symbol') return false;
      const data = dataGetter();
      return data ? prop in data : false;
    },
    ownKeys: () => {
      const data = dataGetter();
      return data ? Object.keys(data) : [];
    },
    getOwnPropertyDescriptor: (_, prop) => {
      const data = dataGetter();
      if (data && prop in data) {
        return {
          value: data[prop],
          writable: false,
          enumerable: true,
          configurable: true
        };
      }
      return undefined;
    }
  });
}

/**
 * Create a deprecated lookup proxy for legacy per-key APIs (BDB_BY_WORD,
 * JASTROW_COMPLETE, STRONGS_BY_WORD, etc.).
 *
 * Behavior:
 *   - Reads the sync cache via syncLookup(prop). If hit, returns the entry.
 *   - If miss and the dictionary is not yet loaded, warns once and triggers
 *     an async load (so the *next* access succeeds).
 *   - Returns undefined on miss.
 *   - React Fast Refresh internal prop probes are ignored silently.
 *   - `ownKeys` returns [] and warns — enumeration is not supported.
 *
 * @param {Object} opts
 * @param {Function} [opts.syncLookup] - (prop) => cached entry or null
 * @param {Function} [opts.triggerLoad] - () => Promise<void>, called on cache miss
 * @param {Function} [opts.isLoaded] - () => boolean
 * @param {string} opts.name - Dictionary label for warnings (e.g. "BDB")
 * @param {string} opts.apiName - Exported symbol name (e.g. "BDB_BY_WORD")
 * @param {string} opts.preferredFn - Preferred function to suggest (e.g. "lookupBDBByWord()")
 * @returns {Proxy}
 */
export function createDeprecatedLookupProxy({
  syncLookup,
  triggerLoad,
  isLoaded,
  name,
  apiName,
  preferredFn
}) {
  let warnedAccess = false;
  let warnedEnum = false;

  return new Proxy({}, {
    get(_, prop) {
      if (isInternalProp(prop)) return undefined;

      if (syncLookup) {
        const cached = syncLookup(prop);
        if (cached) return cached;
      }

      if (!isLoaded?.()) {
        if (!warnedAccess) {
          console.warn(
            `[${name}] Direct access to ${apiName} is deprecated. Use ${preferredFn} instead.`
          );
          warnedAccess = true;
        }
        triggerLoad?.();
      }
      return undefined;
    },

    has(_, prop) {
      if (isInternalProp(prop)) return false;
      return syncLookup ? syncLookup(prop) != null : false;
    },

    ownKeys() {
      if (!warnedEnum) {
        console.warn(
          `[${name}] Enumerating ${apiName} is not supported with dynamic loading.`
        );
        warnedEnum = true;
      }
      return [];
    }
  });
}

const proxyHelpers = {
  createLazyProxy,
  createSimpleLazyProxy,
  createDeprecatedLookupProxy
};
export default proxyHelpers;
