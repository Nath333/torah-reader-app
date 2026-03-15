/**
 * Route configuration for the Torah Reader app
 * Clean, semantic URLs for all app views
 */

export const ROUTES = {
  HOME: '/',
  READ: '/read/:book/:chapter',
  READ_VERSE: '/read/:book/:chapter/:verse',
  SEARCH: '/search',
  BOOKMARKS: '/bookmarks',
  HISTORY: '/history',
  VOCABULARY: '/vocabulary',
  DISCOVER: '/discover',
  VERSIONS: '/versions/:book/:chapter',
  SPLIT: '/split/:book/:chapter',
  TRADITIONAL: '/traditional/:book/:chapter',
  STUDY: '/study',
};

/**
 * Generate a URL path for reading a specific text
 */
export const getReadPath = (book, chapter, verse = null) => {
  const bookSlug = encodeURIComponent(book);
  if (verse) {
    return `/read/${bookSlug}/${chapter}/${verse}`;
  }
  return `/read/${bookSlug}/${chapter}`;
};

/**
 * Generate a URL path for versions view
 */
export const getVersionsPath = (book, chapter) => {
  return `/versions/${encodeURIComponent(book)}/${chapter}`;
};

/**
 * Generate a URL path for split view
 */
export const getSplitPath = (book, chapter) => {
  return `/split/${encodeURIComponent(book)}/${chapter}`;
};

/**
 * Generate a URL path for traditional view
 */
export const getTraditionalPath = (book, chapter) => {
  return `/traditional/${encodeURIComponent(book)}/${chapter}`;
};

/**
 * Parse book name from URL slug
 */
export const parseBookSlug = (slug) => {
  return decodeURIComponent(slug || '');
};
