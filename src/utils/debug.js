// Debug utilities for conditional logging
// Only logs in development mode to reduce console noise in production

const isDev = process.env.NODE_ENV === 'development';

// Verbose logging - only in dev mode
// Use for detailed debugging that should never appear in production
export const logVerbose = (tag, ...args) => {
  if (isDev && localStorage.getItem('debug:verbose') === 'true') {
    console.log(`[${tag}]`, ...args);
  }
};

// Debug logging - only in dev mode
// Use for general debugging info
export const logDebug = (tag, ...args) => {
  if (isDev) {
    console.log(`[${tag}]`, ...args);
  }
};

// Info logging - appears in dev, hidden in prod unless enabled
// Use for important operational info
export const logInfo = (tag, ...args) => {
  if (isDev || localStorage.getItem('debug:info') === 'true') {
    console.log(`[${tag}]`, ...args);
  }
};

// Warning logging - always appears
// Use for non-critical issues that should be investigated
export const logWarn = (tag, ...args) => {
  console.warn(`[${tag}]`, ...args);
};

// Error logging - always appears
// Use for errors that need attention
export const logError = (tag, ...args) => {
  console.error(`[${tag}]`, ...args);
};

// Create a namespaced logger for a specific module
export const createLogger = (moduleName) => ({
  verbose: (...args) => logVerbose(moduleName, ...args),
  debug: (...args) => logDebug(moduleName, ...args),
  info: (...args) => logInfo(moduleName, ...args),
  warn: (...args) => logWarn(moduleName, ...args),
  error: (...args) => logError(moduleName, ...args),
});

// Enable/disable verbose logging (call from browser console)
export const enableVerboseLogging = () => {
  localStorage.setItem('debug:verbose', 'true');
  console.log('Verbose logging enabled. Refresh to see detailed logs.');
};

export const disableVerboseLogging = () => {
  localStorage.removeItem('debug:verbose');
  console.log('Verbose logging disabled.');
};

// Expose to window for easy toggling from browser console
if (typeof window !== 'undefined') {
  window.enableVerboseLogging = enableVerboseLogging;
  window.disableVerboseLogging = disableVerboseLogging;
}

// Default export for convenience
const debug = {
  verbose: logVerbose,
  debug: logDebug,
  info: logInfo,
  warn: logWarn,
  error: logError,
  createLogger,
  enableVerboseLogging,
  disableVerboseLogging,
  isDev,
};

export default debug;
