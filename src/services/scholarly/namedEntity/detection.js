// =============================================================================
// Détection d'entités nommées — rabbis (patterns d'attribution), figures
// bibliques, lieux, citations bibliques, statistiques, surbrillance.
// (extrait de namedEntityService.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

import { stripAllDiacritics as stripNikud } from '../../../utils/hebrewUtils';
import {
  ENTITY_TYPES,
  RABBI_DATABASE, RABBI_PATTERNS, BIBLICAL_CITATION_PATTERNS,
  BIBLICAL_FIGURES, PLACES
} from './data';

// =============================================================================
// DETECTION FUNCTIONS
// =============================================================================

/**
 * Detect all named entities in text
 * @param {string} text - Hebrew/Aramaic text
 * @returns {Object} Detected entities by type
 */
export function detectEntities(text) {
  if (!text || typeof text !== 'string') {
    return { rabbis: [], biblicalFigures: [], places: [], citations: [] };
  }

  return {
    rabbis: detectRabbis(text),
    biblicalFigures: detectBiblicalFigures(text),
    places: detectPlaces(text),
    citations: detectBiblicalCitations(text)
  };
}

/**
 * PRO SCHOLAR V30: Detect rabbi mentions in text with nikud support
 *
 * CONTRAT DIFFÉRENT de discourse/detection.detectRabbis : celle-ci est
 * enrichie (RABBI_DATABASE : english/period/generation/location, base
 * tannaim+amoraim — pour UnifiedSugyaAnalysis et TalmudBrowsers) ; celle de
 * discourse/detection est structurelle (patternKey/type/position, pour le
 * flux du discours). Deux usages, pas un doublon.
 *
 * @param {string} text
 * @returns {Array}
 */
export function detectRabbis(text) {
  if (!text || typeof text !== 'string') return [];

  const results = [];
  const seen = new Set();

  // PRO SCHOLAR V30: Strip nikud for better matching
  const cleanText = stripNikud(text);

  // Check for known rabbis from database (search in clean text)
  const allRabbis = { ...RABBI_DATABASE.tannaim, ...RABBI_DATABASE.amoraim };

  for (const [hebrew, info] of Object.entries(allRabbis)) {
    const cleanHebrew = stripNikud(hebrew);
    const regex = new RegExp(cleanHebrew.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    let match;

    while ((match = regex.exec(cleanText)) !== null) {
      const key = `${match.index}-${cleanHebrew}`;
      if (seen.has(key)) continue;
      seen.add(key);

      results.push({
        type: ENTITY_TYPES.RABBI,
        hebrew,
        name: hebrew, // V30: Add name field for compatibility
        english: info.name,
        position: match.index,
        endPosition: match.index + match[0].length,
        period: info.period,
        generation: info.generation,
        location: info.location,
        note: info.note
      });
    }
  }

  // PRO SCHOLAR V30: Enhanced pattern-based detection on clean text
  for (const { pattern, type, isGroup } of RABBI_PATTERNS) {
    let match;
    while ((match = pattern.exec(cleanText)) !== null) {
      const fullMatch = match[0];
      const key = `${match.index}-${type}`;

      if (!seen.has(key)) {
        seen.add(key);

        // Handle group references (תנו רבנן, איתמר, etc.)
        if (isGroup) {
          results.push({
            type: ENTITY_TYPES.RABBI,
            hebrew: fullMatch,
            name: fullMatch,
            english: type === 'baraita' ? 'The Rabbis' : 'Sages',
            position: match.index,
            endPosition: match.index + fullMatch.length,
            period: 'collective',
            statementType: type,
            isGroup: true
          });
        } else {
          // Try to identify from database
          const title = match[1] || '';
          const name = match[2] || match[1] || fullMatch;
          const fullName = title && name ? `${title} ${name}` : name;

          // Look up in database
          const dbEntry = allRabbis[fullName] || allRabbis[name] || allRabbis[stripNikud(name)];

          results.push({
            type: ENTITY_TYPES.RABBI,
            hebrew: fullMatch,
            name: fullName || fullMatch,
            english: dbEntry?.name || name || fullMatch,
            position: match.index,
            endPosition: match.index + fullMatch.length,
            period: dbEntry?.period || 'unknown',
            generation: dbEntry?.generation,
            statementType: type
          });
        }
      }
    }
    pattern.lastIndex = 0;
  }

  return results.sort((a, b) => a.position - b.position);
}

/**
 * Detect biblical figure mentions
 * @param {string} text
 * @returns {Array}
 */
export function detectBiblicalFigures(text) {
  const results = [];
  const seen = new Set();

  for (const [hebrew, info] of Object.entries(BIBLICAL_FIGURES)) {
    const regex = new RegExp(hebrew.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    let match;

    while ((match = regex.exec(text)) !== null) {
      const key = `${match.index}-${hebrew}`;
      if (seen.has(key)) continue;
      seen.add(key);

      results.push({
        type: ENTITY_TYPES.BIBLICAL_FIGURE,
        hebrew,
        english: info.name,
        category: info.category,
        position: match.index,
        endPosition: match.index + match[0].length
      });
    }
  }

  return results.sort((a, b) => a.position - b.position);
}

/**
 * Detect place mentions
 * @param {string} text
 * @returns {Array}
 */
export function detectPlaces(text) {
  const results = [];
  const seen = new Set();

  for (const [hebrew, info] of Object.entries(PLACES)) {
    const regex = new RegExp(hebrew.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    let match;

    while ((match = regex.exec(text)) !== null) {
      const key = `${match.index}-${hebrew}`;
      if (seen.has(key)) continue;
      seen.add(key);

      results.push({
        type: ENTITY_TYPES.PLACE,
        hebrew,
        english: info.name,
        placeType: info.type,
        significance: info.significance,
        position: match.index,
        endPosition: match.index + match[0].length
      });
    }
  }

  return results.sort((a, b) => a.position - b.position);
}

/**
 * Detect biblical citations
 * @param {string} text
 * @returns {Array}
 */
export function detectBiblicalCitations(text) {
  const results = [];

  for (const { pattern, type } of BIBLICAL_CITATION_PATTERNS) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const citedText = match[1]?.trim();
      if (!citedText || citedText.length < 3) continue;

      results.push({
        type: ENTITY_TYPES.BIBLICAL_CITATION,
        fullMatch: match[0],
        citedText: citedText,
        citationType: type,
        position: match.index,
        endPosition: match.index + match[0].length
      });
    }
    pattern.lastIndex = 0;
  }

  return results.sort((a, b) => a.position - b.position);
}

/**
 * Get entity statistics for a text
 * @param {string} text
 * @returns {Object}
 */
export function getEntityStatistics(text) {
  const entities = detectEntities(text);

  // Count unique rabbis
  const uniqueRabbis = new Set(entities.rabbis.map(r => r.english || r.hebrew));
  const uniquePlaces = new Set(entities.places.map(p => p.english || p.hebrew));
  const uniqueFigures = new Set(entities.biblicalFigures.map(f => f.english || f.hebrew));

  // Group rabbis by period
  const rabbisByPeriod = {};
  for (const rabbi of entities.rabbis) {
    const period = rabbi.period || 'unknown';
    if (!rabbisByPeriod[period]) rabbisByPeriod[period] = new Set();
    rabbisByPeriod[period].add(rabbi.english || rabbi.hebrew);
  }

  return {
    totalEntities: entities.rabbis.length + entities.biblicalFigures.length + entities.places.length + entities.citations.length,
    rabbis: {
      total: entities.rabbis.length,
      unique: uniqueRabbis.size,
      byPeriod: Object.fromEntries(
        Object.entries(rabbisByPeriod).map(([k, v]) => [k, v.size])
      )
    },
    biblicalFigures: {
      total: entities.biblicalFigures.length,
      unique: uniqueFigures.size
    },
    places: {
      total: entities.places.length,
      unique: uniquePlaces.size
    },
    citations: {
      total: entities.citations.length
    }
  };
}

/**
 * Get highlighted text with entity markers
 * @param {string} text
 * @param {Object} options
 * @returns {string} HTML with entity spans
 */
export function getHighlightedEntities(text, options = {}) {
  const { includeRabbis = true, includeFigures = true, includePlaces = true, includeCitations = true } = options;

  const entities = detectEntities(text);
  const allEntities = [];

  if (includeRabbis) allEntities.push(...entities.rabbis);
  if (includeFigures) allEntities.push(...entities.biblicalFigures);
  if (includePlaces) allEntities.push(...entities.places);
  if (includeCitations) allEntities.push(...entities.citations);

  if (allEntities.length === 0) return text;

  // Sort by position descending to insert from end
  allEntities.sort((a, b) => b.position - a.position);

  let result = text;
  for (const entity of allEntities) {
    const before = result.slice(0, entity.position);
    const match = result.slice(entity.position, entity.endPosition);
    const after = result.slice(entity.endPosition);

    const cssClass = `entity-${entity.type}`;
    const title = entity.english || entity.hebrew;

    result = `${before}<span class="${cssClass}" data-type="${entity.type}" title="${title}">${match}</span>${after}`;
  }

  return result;
}

