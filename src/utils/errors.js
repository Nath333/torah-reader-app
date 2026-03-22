/**
 * Unified Error Handling
 * Consolidates error patterns from groqApi.js, aiService.js, etc.
 */

// Error type constants
export const ERROR_TYPES = {
  // Network errors
  NETWORK: 'network',
  TIMEOUT: 'timeout',
  OFFLINE: 'offline',

  // API errors
  NO_API_KEY: 'no_api_key',
  INVALID_API_KEY: 'invalid_api_key',
  RATE_LIMIT: 'rate_limit',
  QUOTA_EXCEEDED: 'quota_exceeded',
  SERVER_ERROR: 'server_error',

  // Data errors
  NOT_FOUND: 'not_found',
  INVALID_DATA: 'invalid_data',
  PARSE_ERROR: 'parse_error',

  // App errors
  VALIDATION: 'validation',
  UNKNOWN: 'unknown'
};

// Base application error
export class AppError extends Error {
  constructor(message, type = ERROR_TYPES.UNKNOWN, retryable = false, details = null) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.retryable = retryable;
    this.details = details;
    this.timestamp = Date.now();
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      retryable: this.retryable,
      details: this.details
    };
  }
}

// AI-specific error (extends AppError for backward compat)
export class AIError extends AppError {
  constructor(message, type = ERROR_TYPES.UNKNOWN, retryable = false, details = null) {
    super(message, type, retryable, details);
    this.name = 'AIError';
  }
}

// Network error
export class NetworkError extends AppError {
  constructor(message, details = null) {
    super(message, ERROR_TYPES.NETWORK, true, details);
    this.name = 'NetworkError';
  }
}

// Validation error
export class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, ERROR_TYPES.VALIDATION, false, details);
    this.name = 'ValidationError';
  }
}

// Helper functions
export const isRetryable = (error) => {
  if (error?.retryable !== undefined) return error.retryable;
  if (error instanceof AppError) return error.retryable;
  // Network errors are generally retryable
  if (error?.message?.includes('network') || error?.message?.includes('fetch')) return true;
  return false;
};

export const isNetworkError = (error) => {
  return error?.type === ERROR_TYPES.NETWORK ||
    error?.type === ERROR_TYPES.TIMEOUT ||
    error?.type === ERROR_TYPES.OFFLINE ||
    error?.message?.toLowerCase().includes('network') ||
    error?.message?.toLowerCase().includes('fetch');
};

export const isAuthError = (error) => {
  return error?.type === ERROR_TYPES.NO_API_KEY ||
    error?.type === ERROR_TYPES.INVALID_API_KEY;
};

export const isRateLimitError = (error) => {
  return error?.type === ERROR_TYPES.RATE_LIMIT ||
    error?.type === ERROR_TYPES.QUOTA_EXCEEDED;
};

// Get user-friendly message
export const getErrorMessage = (error) => {
  if (!error) return 'An unknown error occurred';

  const messages = {
    [ERROR_TYPES.NETWORK]: 'Network connection failed. Check your internet.',
    [ERROR_TYPES.TIMEOUT]: 'Request timed out. Please try again.',
    [ERROR_TYPES.OFFLINE]: 'You appear to be offline.',
    [ERROR_TYPES.NO_API_KEY]: 'API key not configured. Check settings.',
    [ERROR_TYPES.INVALID_API_KEY]: 'Invalid API key.',
    [ERROR_TYPES.RATE_LIMIT]: 'Too many requests. Please wait.',
    [ERROR_TYPES.QUOTA_EXCEEDED]: 'API quota exceeded.',
    [ERROR_TYPES.SERVER_ERROR]: 'Server error. Please try again.',
    [ERROR_TYPES.NOT_FOUND]: 'Content not found.',
    [ERROR_TYPES.PARSE_ERROR]: 'Failed to process response.'
  };

  return messages[error.type] || error.message || 'An error occurred';
};

// Create error from HTTP response
export const createHttpError = (status, message, details = null) => {
  const mapping = {
    400: [ERROR_TYPES.VALIDATION, false],
    401: [ERROR_TYPES.INVALID_API_KEY, false],
    403: [ERROR_TYPES.INVALID_API_KEY, false],
    404: [ERROR_TYPES.NOT_FOUND, false],
    429: [ERROR_TYPES.RATE_LIMIT, true],
    500: [ERROR_TYPES.SERVER_ERROR, true],
    502: [ERROR_TYPES.SERVER_ERROR, true],
    503: [ERROR_TYPES.SERVER_ERROR, true]
  };

  const [type, retryable] = mapping[status] || [ERROR_TYPES.UNKNOWN, false];
  return new AppError(message, type, retryable, details);
};

// Wrap async function with error handling
export const withErrorHandling = (fn, fallback = null) => async (...args) => {
  try {
    return await fn(...args);
  } catch (error) {
    console.error('[Error]', error.message, error.type || '');
    if (fallback !== null) return fallback;
    throw error instanceof AppError ? error : new AppError(error.message);
  }
};

const errorUtils = {
  ERROR_TYPES,
  AppError,
  AIError,
  NetworkError,
  ValidationError,
  isRetryable,
  isNetworkError,
  isAuthError,
  isRateLimitError,
  getErrorMessage,
  createHttpError,
  withErrorHandling
};

export default errorUtils;
