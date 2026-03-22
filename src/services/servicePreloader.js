/**
 * PRO SCHOLAR V4: Parallel Service Preloader
 *
 * Initializes critical services in parallel on app startup to reduce
 * time-to-interactive. Uses priority-based loading to ensure essential
 * services are ready first.
 *
 * Usage:
 *   import { preloadServices, getPreloadStatus } from './servicePreloader';
 *   await preloadServices(); // In App.js or index.js
 */

import { createLogger } from '../utils/debug';

const log = createLogger('ServicePreloader');

// Service definitions with priorities (lower = higher priority)
const SERVICES = {
  // Priority 1: Core dictionaries (essential for word lookup)
  jastrow: {
    priority: 1,
    loader: () => import('./dictionaryLoader').then(m => m.preloadJastrow?.() || Promise.resolve()),
    critical: true
  },
  bdb: {
    priority: 1,
    loader: () => import('./dictionaryLoader').then(m => m.preloadBDB?.() || Promise.resolve()),
    critical: true
  },

  // Priority 2: Commentary services
  rashiService: {
    priority: 2,
    loader: () => import('./rashiService').then(m => m.initializeCache?.() || Promise.resolve()),
    critical: false
  },

  // Priority 3: Enhanced lookup services
  scholarlyLexicon: {
    priority: 3,
    loader: () => import('./scholarlyLexiconService').then(m => m.initialize?.() || Promise.resolve()),
    critical: false
  },

  // Priority 4: AI/Translation services (can load later)
  translation: {
    priority: 4,
    loader: () => import('./combinedTranslationService').then(m => m.warmCache?.() || Promise.resolve()),
    critical: false
  }
};

// Preload state
const state = {
  initialized: false,
  loading: false,
  loaded: new Set(),
  failed: new Map(),
  startTime: null,
  endTime: null
};

/**
 * Preload all services in parallel, grouped by priority
 * @param {Object} options - Preload options
 * @param {boolean} options.criticalOnly - Only load critical services
 * @param {number} options.maxPriority - Max priority level to load (1-4)
 * @returns {Promise<Object>} - Preload results
 */
export async function preloadServices(options = {}) {
  const { criticalOnly = false, maxPriority = 4 } = options;

  if (state.loading) {
    log.debug('Preload already in progress');
    return { status: 'already_loading' };
  }

  if (state.initialized && !options.force) {
    log.debug('Services already preloaded');
    return { status: 'already_initialized', ...getPreloadStatus() };
  }

  state.loading = true;
  state.startTime = Date.now();

  log.debug('Starting parallel service preload...');

  // Group services by priority
  const servicesByPriority = {};
  Object.entries(SERVICES).forEach(([name, config]) => {
    if (config.priority <= maxPriority) {
      if (!criticalOnly || config.critical) {
        if (!servicesByPriority[config.priority]) {
          servicesByPriority[config.priority] = [];
        }
        servicesByPriority[config.priority].push({ name, ...config });
      }
    }
  });

  // Load by priority groups (parallel within groups, sequential between groups)
  const priorities = Object.keys(servicesByPriority).sort((a, b) => a - b);

  for (const priority of priorities) {
    const services = servicesByPriority[priority];
    log.debug(`Loading priority ${priority} services: ${services.map(s => s.name).join(', ')}`);

    // Load all services in this priority group in parallel
    const results = await Promise.allSettled(
      services.map(async (service) => {
        try {
          await service.loader();
          state.loaded.add(service.name);
          log.debug(`✓ ${service.name} loaded`);
          return { name: service.name, success: true };
        } catch (error) {
          state.failed.set(service.name, error.message);
          log.warn(`✗ ${service.name} failed: ${error.message}`);
          return { name: service.name, success: false, error: error.message };
        }
      })
    );

    // Check if any critical service failed
    const criticalFailures = results.filter(r =>
      r.status === 'rejected' ||
      (r.value && !r.value.success && services.find(s => s.name === r.value?.name)?.critical)
    );

    if (criticalFailures.length > 0 && priority === 1) {
      log.error('Critical service(s) failed to load');
    }
  }

  state.loading = false;
  state.initialized = true;
  state.endTime = Date.now();

  const status = getPreloadStatus();
  log.debug(`Preload complete in ${status.duration}ms: ${status.loaded}/${status.total} services`);

  return status;
}

/**
 * Get current preload status
 */
export function getPreloadStatus() {
  return {
    initialized: state.initialized,
    loading: state.loading,
    loaded: state.loaded.size,
    failed: state.failed.size,
    total: Object.keys(SERVICES).length,
    loadedServices: Array.from(state.loaded),
    failedServices: Object.fromEntries(state.failed),
    duration: state.endTime ? state.endTime - state.startTime : null
  };
}

/**
 * Check if a specific service is loaded
 */
export function isServiceLoaded(serviceName) {
  return state.loaded.has(serviceName);
}

/**
 * Preload only critical services (for faster initial load)
 */
export function preloadCriticalServices() {
  return preloadServices({ criticalOnly: true });
}

/**
 * Preload remaining services in background
 */
export function preloadRemainingServices() {
  return preloadServices({ force: true });
}

const servicePreloader = {
  preloadServices,
  preloadCriticalServices,
  getPreloadStatus,
  isServiceLoaded
};

export default servicePreloader;
