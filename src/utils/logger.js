// =============================================================================
// Simple Logger Utility
// =============================================================================
// Single source of truth for the dev flag lives in utils/debug.js.

import { IS_DEV } from './debug';

export const createLogger = (name) => ({
  debug: (...args) => IS_DEV && console.debug(`[${name}]`, ...args),
  info: (...args) => IS_DEV && console.info(`[${name}]`, ...args),
  warn: (...args) => console.warn(`[${name}]`, ...args),
  error: (...args) => console.error(`[${name}]`, ...args),
});

export default createLogger;
