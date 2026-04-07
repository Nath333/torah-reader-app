/**
 * Safe HTML rendering utilities
 * Provides XSS-safe alternatives to dangerouslySetInnerHTML
 */

import DOMPurify from 'dompurify';

// Configure DOMPurify with strict settings for AI-generated content
const purifyConfig = {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i', 'u', 'span', 'div'],
  ALLOWED_ATTR: ['class', 'dir', 'lang'],
  KEEP_CONTENT: true,
  SANITIZE_DOM: true,
  ALLOW_DATA_ATTR: false,
  ALLOW_ARIA_ATTR: false,
};

/**
 * Sanitize HTML content using DOMPurify
 * @param {string} html - Raw HTML content
 * @returns {string} - Sanitized HTML safe for rendering
 */
export const sanitizeHtmlContent = (html) => {
  if (!html || typeof html !== 'string') return '';
  
  // Use DOMPurify to sanitize the HTML
  return DOMPurify.sanitize(html, purifyConfig);
};

/**
 * Sanitize SVG content (for mermaid diagrams)
 * Removes script tags and event handlers from SVG
 * @param {string} svg - SVG content
 * @returns {string} - Sanitized SVG
 */
export const sanitizeSvgContent = (svg) => {
  if (!svg || typeof svg !== 'string') return '';
  
  const svgConfig = {
    ALLOWED_TAGS: [
      'svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon',
      'text', 'tspan', 'defs', 'marker', 'linearGradient', 'radialGradient', 'stop',
      'pattern', 'clipPath', 'mask', 'use', 'symbol', 'title', 'desc'
    ],
    ALLOWED_ATTR: [
      'viewBox', 'width', 'height', 'xmlns', 'xlink:href', 'd', 'fill', 'stroke',
      'stroke-width', 'transform', 'class', 'id', 'x', 'y', 'cx', 'cy', 'r', 'rx', 'ry',
      'x1', 'y1', 'x2', 'y2', 'points', 'd', 'text-anchor', 'font-size', 'font-family',
      'font-weight', 'style', 'opacity', 'marker-end', 'marker-start', 'gradientUnits',
      'offset', 'stop-color', 'stop-opacity', 'clip-path', 'mask', 'patternUnits'
    ],
    ALLOW_DATA_ATTR: false,
    SANITIZE_DOM: true,
  };
  
  // First pass: DOMPurify
  let sanitized = DOMPurify.sanitize(svg, svgConfig);
  
  // Second pass: Remove any script-related content manually
  sanitized = sanitized
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/data:text\/html/gi, '');
  
  return sanitized;
};

/**
 * Convert markdown to safe HTML
 * Supports: **bold**, *italic*, _italic_
 * @param {string} text - Markdown text
 * @returns {string} - Safe HTML
 */
export const markdownToSafeHtml = (text) => {
  if (!text || typeof text !== 'string') return '';
  
  // First escape HTML entities
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // Convert markdown to HTML
  // Bold: **text** or __text__
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  
  // Italic: *text* or _text_ (but not ** which is already processed)
  html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
  html = html.replace(/(?<!_)_([^_]+)_(?!_)/g, '<em>$1</em>');
  
  // Line breaks
  html = html.replace(/\n/g, '<br/>');
  
  // Sanitize the result
  return sanitizeHtmlContent(html);
};

/**
 * Validate and sanitize mermaid chart syntax
 * @param {string} chart - Mermaid chart syntax
 * @returns {string|null} - Sanitized chart or null if invalid
 */
export const sanitizeMermaidChart = (chart) => {
  if (!chart || typeof chart !== 'string') return null;
  
  // Remove any script tags or suspicious content
  const cleaned = chart
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '');
  
  // Validate it starts with a valid mermaid directive
  const validStart = /^(graph|flowchart|sequenceDiagram|classDiagram|mindmap|gantt|pie|erDiagram|journey|gitgraph|C4Context|stateDiagram)/i;
  
  if (!validStart.test(cleaned.trim())) {
    // Try to fix by adding a default graph type
    return 'graph TD\n' + cleaned;
  }
  
  return cleaned;
};

/**
 * Create safe HTML element attributes
 * Prevents XSS through attribute injection
 * @param {Object} attrs - Attribute object
 * @returns {Object} - Sanitized attributes
 */
export const sanitizeAttributes = (attrs) => {
  if (!attrs || typeof attrs !== 'object') return {};
  
  const sanitized = {};
  const allowedAttrs = ['class', 'id', 'title', 'alt', 'dir', 'lang', 'role', 'aria-label'];
  
  for (const [key, value] of Object.entries(attrs)) {
    if (allowedAttrs.includes(key) && typeof value === 'string') {
      // Remove any script references
      if (!/javascript:|data:text\/html|on\w+=/i.test(value)) {
        sanitized[key] = value
          .replace(/[<>]/g, '') // Remove angle brackets
          .replace(/"/g, '&quot;'); // Escape quotes
      }
    }
  }
  
  return sanitized;
};

/**
 * Check if content contains potential XSS payloads
 * @param {string} content - Content to check
 * @returns {boolean} - True if suspicious content detected
 */
export const containsXssPayload = (content) => {
  if (!content || typeof content !== 'string') return false;
  
  const xssPatterns = [
    /<script[^>]*>/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /data:text\/html/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /eval\s*\(/i,
    /expression\s*\(/i,
  ];
  
  return xssPatterns.some(pattern => pattern.test(content));
};

/**
 * Safe storage utilities for localStorage
 * Prevents XSS via stored data
 */
export const safeStorage = {
  /**
   * Safely store data to localStorage
   * @param {string} key - Storage key
   * @param {*} data - Data to store
   */
  setItem: (key, data) => {
    try {
      // Ensure key is safe
      const safeKey = String(key).replace(/[^a-zA-Z0-9_-]/g, '');
      const jsonString = JSON.stringify(data);
      localStorage.setItem(safeKey, jsonString);
    } catch (e) {
      console.warn('Failed to store data:', e);
    }
  },
  
  /**
   * Safely retrieve data from localStorage
   * @param {string} key - Storage key
   * @param {*} defaultValue - Default value if not found
   * @returns {*} - Parsed data or default value
   */
  getItem: (key, defaultValue = null) => {
    try {
      const safeKey = String(key).replace(/[^a-zA-Z0-9_-]/g, '');
      const item = localStorage.getItem(safeKey);
      if (!item) return defaultValue;
      
      const parsed = JSON.parse(item);
      
      // Sanitize any string content
      return sanitizeStoredData(parsed);
    } catch (e) {
      console.warn('Failed to retrieve data:', e);
      return defaultValue;
    }
  },
  
  /**
   * Remove item from localStorage
   * @param {string} key - Storage key
   */
  removeItem: (key) => {
    try {
      const safeKey = String(key).replace(/[^a-zA-Z0-9_-]/g, '');
      localStorage.removeItem(safeKey);
    } catch (e) {
      console.warn('Failed to remove data:', e);
    }
  }
};

/**
 * Recursively sanitize stored data
 * @param {*} data - Data to sanitize
 * @returns {*} - Sanitized data
 */
const sanitizeStoredData = (data) => {
  if (typeof data === 'string') {
    // Remove potential XSS from strings
    return data
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  }
  
  if (Array.isArray(data)) {
    return data.map(sanitizeStoredData);
  }
  
  if (typeof data === 'object' && data !== null) {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeStoredData(value);
    }
    return sanitized;
  }
  
  return data;
};

export default {
  sanitizeHtmlContent,
  sanitizeSvgContent,
  markdownToSafeHtml,
  sanitizeMermaidChart,
  sanitizeAttributes,
  containsXssPayload,
  safeStorage,
};
