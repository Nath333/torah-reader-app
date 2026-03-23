/**
 * Shared Proxy Helpers for Lazy-Loaded Data
 *
 * Provides consistent Proxy implementations for data that is loaded on-demand
 * from JSON files. This reduces code duplication across data modules.
 */

/**
 * Create a lazy proxy that delegates to a data getter function
 * @param {Function} dataGetter - Function that returns the cached data (or null if not loaded)
 * @returns {Proxy} A proxy object that lazily accesses the data
 */
export function createLazyProxy(dataGetter) {
  return new Proxy({}, {
    get: (_, prop) => {
      // Handle special symbols
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

      // Handle object methods
      if (prop === 'toJSON') {
        return () => dataGetter() || {};
      }

      // Access the data
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
 * Create a simple lazy proxy (minimal implementation)
 * @param {Function} dataGetter - Function that returns the cached data
 * @returns {Proxy} A proxy object
 */
export function createSimpleLazyProxy(dataGetter) {
  return new Proxy({}, {
    get: (_, prop) => dataGetter()?.[prop],
    has: (_, prop) => {
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

const proxyHelpers = {
  createLazyProxy,
  createSimpleLazyProxy
};
export default proxyHelpers;
