/**
 * Sanitize HTML string by removing all tags and decoding entities
 * This is a safe alternative to dangerouslySetInnerHTML for text content
 * @param {string} html - HTML string to sanitize
 * @returns {string} - Plain text with HTML removed
 */
export const sanitizeHtml = (html) => {
  if (!html || typeof html !== 'string') return '';

  // Create a temporary element to decode HTML entities
  const doc = new DOMParser().parseFromString(html, 'text/html');

  // Get text content (removes all tags)
  return doc.body.textContent || '';
};

/**
 * Clean HTML from API responses - removes footnotes, sup tags, and normalizes whitespace
 * Use this for Sefaria API responses
 * @param {string} text - Text with potential HTML
 * @returns {string} - Clean text
 */
export const cleanHtml = (text) => {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/<sup[^>]*>.*?<\/sup>/gi, '') // Remove footnote markers
    .replace(/<i[^>]*class="footnote"[^>]*>.*?<\/i>/gi, '') // Remove footnote content
    .replace(/<[^>]*>/g, '') // Remove remaining HTML tags
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Remove specific tags while keeping text content
 * @param {string} html - HTML string to process
 * @param {string[]} tagsToRemove - Array of tag names to remove (e.g., ['i', 'sup'])
 * @returns {string} - Text with specified tags removed
 */
export const removeHtmlTags = (html, tagsToRemove = []) => {
  if (!html || typeof html !== 'string') return '';

  let result = html;

  // Remove specified tags and their content
  tagsToRemove.forEach(tag => {
    const regex = new RegExp(`<${tag}[^>]*>.*?</${tag}>`, 'gi');
    result = result.replace(regex, '');
  });

  // Remove any remaining HTML tags but keep content
  result = result.replace(/<[^>]+>/g, '');

  // Clean up extra whitespace
  result = result.replace(/\s+/g, ' ').trim();

  // Remove translation notes
  result = result.replace(/\[Translated from Hebrew commentary\]/g, '');

  return result;
};

/**
 * Render text with safe HTML spans for RTL Hebrew text
 * Only allows <span dir="rtl"> tags for embedding Hebrew in translations
 * @param {string} text - Text that may contain <span dir="rtl">...</span>
 * @returns {Array} - Array of React elements/strings for rendering
 */
export const renderWithHebrewSpans = (text) => {
  if (!text || typeof text !== 'string') return [''];

  // Pattern to match <span dir="rtl">content</span>
  const spanPattern = /<span\s+dir="rtl">(.*?)<\/span>/gi;
  const parts = [];
  let lastIndex = 0;
  let match;
  let keyIndex = 0;

  while ((match = spanPattern.exec(text)) !== null) {
    // Add text before the span
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    // Add the Hebrew content as an object to be rendered as span
    parts.push({
      type: 'hebrew-span',
      content: match[1],
      key: keyIndex++
    });
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after last match
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  // If no spans found, return original text
  if (parts.length === 0) {
    parts.push(text);
  }

  return parts;
};

/**
 * Parse translation text preserving <b>, <strong>, <big> tags or bold markers
 * Sefaria uses these tags to mark direct translations vs explanatory text
 * Also handles 【B】...【/B】 or [B]...[/B] markers from French translations
 * @param {string} html - HTML string with b/strong/big tags or markers
 * @returns {Array} - Array of objects for rendering: { type: 'text'|'bold', content: string }
 */
export const parseAnnotatedTranslation = (html) => {
  if (!html || typeof html !== 'string') return [{ type: 'text', content: '' }];

  // First clean footnotes and other unwanted tags
  let cleaned = html
    .replace(/<sup[^>]*>.*?<\/sup>/gi, '')
    .replace(/<i[^>]*class="footnote"[^>]*>.*?<\/i>/gi, '')
    // Unwrap <big> tags but keep content - they often wrap <strong>
    .replace(/<big[^>]*>/gi, '')
    .replace(/<\/big>/gi, '')
    // Convert bold markers to HTML - comprehensive pattern matching
    // Handles: 【B】 [B] 【B] [B】 and all closing variants
    .replace(/[【[]B[】\]]/gi, '<strong>')
    .replace(/[【[]\/B[】\]]/gi, '</strong>')
    // Also handle escaped or URL-encoded variants
    .replace(/%5BB%5D/gi, '<strong>')
    .replace(/%5B\/B%5D/gi, '</strong>');

  // Pattern to match <b>content</b> or <strong>content</strong>
  const boldPattern = /<(b|strong)[^>]*>([\s\S]*?)<\/\1>/gi;
  const parts = [];
  let lastIndex = 0;
  let match;
  let keyIndex = 0;

  while ((match = boldPattern.exec(cleaned)) !== null) {
    // Add text before the bold tag
    if (match.index > lastIndex) {
      const textBefore = cleaned.slice(lastIndex, match.index)
        .replace(/<[^>]+>/g, '') // Remove any other tags
        .replace(/\s+/g, ' ');
      if (textBefore.trim()) {
        parts.push({
          type: 'text',
          content: textBefore,
          key: `text-${keyIndex++}`
        });
      }
    }
    // Add the bold content
    const boldContent = match[2]
      .replace(/<[^>]+>/g, '') // Remove nested tags
      .replace(/\s+/g, ' ');
    if (boldContent.trim()) {
      parts.push({
        type: 'bold',
        content: boldContent,
        key: `bold-${keyIndex++}`
      });
    }
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after last match
  if (lastIndex < cleaned.length) {
    const remaining = cleaned.slice(lastIndex)
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ');
    if (remaining.trim()) {
      parts.push({
        type: 'text',
        content: remaining,
        key: `text-${keyIndex++}`
      });
    }
  }

  // If no parts found, return plain text
  if (parts.length === 0) {
    return [{
      type: 'text',
      content: cleaned.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(),
      key: 'text-0'
    }];
  }

  return parts;
};

/**
 * Check if translation has annotation markup (b/strong/big tags or bold markers)
 * @param {string} html - HTML string to check
 * @returns {boolean} - True if contains bold markup or markers
 */
export const hasAnnotationMarkup = (html) => {
  if (!html || typeof html !== 'string') return false;
  // Check for HTML tags
  if (/<(b|strong|big)[^>]*>/i.test(html)) return true;
  // Check for bold markers (fullwidth or regular brackets)
  if (/【B】|\[B\]/i.test(html)) return true;
  return false;
};

const sanitizeUtils = { sanitizeHtml, removeHtmlTags, cleanHtml, renderWithHebrewSpans, parseAnnotatedTranslation, hasAnnotationMarkup };
export default sanitizeUtils;
