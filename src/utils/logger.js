// =============================================================================
// Simple Logger Utility
// =============================================================================

const isDev = process.env.NODE_ENV === 'development';

export const createLogger = (name) => ({
  debug: (...args) => isDev && console.debug(`[${name}]`, ...args),
  info: (...args) => isDev && console.info(`[${name}]`, ...args),
  warn: (...args) => console.warn(`[${name}]`, ...args),
  error: (...args) => console.error(`[${name}]`, ...args),
});

export default createLogger;
