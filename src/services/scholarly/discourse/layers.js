// discoursePatternService — Styles de couches, coloration, segmentation en unités de sugya (split phase 2, 03/10/2026)
import {
  TALMUDIC_PATTERNS
} from './discourseData';

export function getDiscourseLayerStyles() {
  let css = '';

  for (const [type, config] of Object.entries(TALMUDIC_PATTERNS)) {
    css += `
.discourse-layer-${type} {
  background-color: ${config.color}15;
  border-left: 3px solid ${config.color};
  padding-left: 8px;
  margin: 4px 0;
}

.discourse-marker-${type} {
  background-color: ${config.color}25;
  border-bottom: 2px solid ${config.color};
  padding: 0 2px;
  font-weight: bold;
}

.discourse-badge-${type} {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background-color: ${config.color}20;
  color: ${config.color};
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}
`;
  }

  return css;
}

/**
 * Apply layer coloring to text - returns HTML with colored spans
 * @param {string} text - Original Hebrew text
 * @returns {string} HTML with discourse layer styling
 */
export function applyLayerColoring(text) {
  const markers = detectStructuralMarkers(text);
  if (markers.length === 0) return text;

  // Sort by position descending to insert from end to start
  const sortedMarkers = [...markers].sort((a, b) => b.position - a.position);

  let result = text;
  for (const m of sortedMarkers) {
    const before = result.slice(0, m.position);
    const markerText = result.slice(m.position, m.endPosition);
    const after = result.slice(m.endPosition);

    const span = `<span class="discourse-marker-${m.type}"
      style="background-color: ${m.color}25; border-bottom: 2px solid ${m.color};"
      title="${m.icon} ${m.label} (${m.hebrewLabel})"
      data-type="${m.type}"
      data-marker="${m.marker}">${markerText}</span>`;

    result = before + span + after;
  }

  return result;
}

// =============================================================================
// SUGYA SEGMENTATION
// Automatically segment text into logical Talmudic units
// =============================================================================

/**
 * Segment text into logical sugya units based on discourse markers
 * @param {string} text - Full Talmudic text
 * @returns {Array} Array of segments with type and content
 */
export function segmentIntoSugyaUnits(text) {
  const markers = detectStructuralMarkers(text);
  if (markers.length === 0) {
    return [{ type: 'text', content: text, startPos: 0, endPos: text.length }];
  }

  const segments = [];
  let lastPos = 0;
  let currentSection = 'intro';

  for (let i = 0; i < markers.length; i++) {
    const marker = markers[i];
    const nextMarker = markers[i + 1];

    // Add any text before this marker
    if (marker.position > lastPos) {
      const preText = text.slice(lastPos, marker.position).trim();
      if (preText) {
        segments.push({
          type: currentSection,
          content: preText,
          startPos: lastPos,
          endPos: marker.position
        });
      }
    }

    // Determine section boundaries
    if (marker.type === 'mishna') {
      currentSection = 'mishna';
    } else if (marker.type === 'gemara') {
      currentSection = 'gemara';
    }

    // Calculate end position
    const endPos = nextMarker ? nextMarker.position : text.length;
    const content = text.slice(marker.position, endPos).trim();

    segments.push({
      type: marker.type,
      sectionType: currentSection,
      marker: marker.marker,
      label: marker.label,
      hebrewLabel: marker.hebrewLabel,
      icon: marker.icon,
      color: marker.color,
      content,
      startPos: marker.position,
      endPos
    });

    lastPos = endPos;
  }

  return segments;
}

// =============================================================================
// TZURAT HADAF - Traditional Talmud Page Layout
// Visualizes text in the classic Vilna Shas format:
// - Center: Main text (Mishna/Gemara)
// - Inner margin: Rashi commentary
// - Outer margin: Tosafot commentary
// =============================================================================

/**
 * Generate Tzurat HaDaf layout data structure
 * Creates a traditional Talmud page layout with center text and margin commentaries
 * @param {Object} options - Layout options
 * @param {string} options.mainText - Main Gemara/Mishna text
 * @param {string} options.rashiText - Rashi commentary (inner margin)
 * @param {string} options.tosafotText - Tosafot commentary (outer margin)
 * @param {string} options.dafNumber - Page reference (e.g., "2a", "15b")
 * @param {string} options.masechet - Tractate name
 * @returns {Object} Structured layout data for rendering
 */
