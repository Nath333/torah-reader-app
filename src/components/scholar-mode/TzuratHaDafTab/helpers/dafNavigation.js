/**
 * Daf navigation + word-cleaning utilities for TzuratHaDafTab.
 * Also hosts getQuickDefinition (local-only dictionary lookup for the preview popup).
 */
import { lookupBDBByWord } from '../../../../data/bdbComplete';
import { lookupJastrowLocal } from '../../../../data/jastrowAramaic';
import { stripCantillation, stripVowels, removeMaqaf } from '../../../../utils/hebrewUtils';

/**
 * Clean Hebrew word for dictionary lookup
 * Removes cantillation (טעמים), nikud (ניקוד), punctuation, and HTML
 */
export const cleanHebrewWord = (word) => {
  if (!word) return '';

  const noHtml = word.replace(/<[^>]*>/g, '');
  return removeMaqaf(stripVowels(stripCantillation(noHtml)))
    .replace(/[.,;:!?׃׀־–—\-()[\]{}״"'`]/g, '')
    .trim();
};

// Parse daf number for navigation (e.g., "2a" -> { num: 2, side: 'a' })
export const parseDaf = (daf) => {
  if (!daf) return null;
  const match = daf.match(/^(\d+)([ab])?$/);
  if (!match) return null;
  return { num: parseInt(match[1], 10), side: match[2] || 'a' };
};

// Get next daf (e.g., "2a" -> "2b", "2b" -> "3a")
export const getNextDaf = (daf) => {
  const parsed = parseDaf(daf);
  if (!parsed) return null;
  if (parsed.side === 'a') return `${parsed.num}b`;
  return `${parsed.num + 1}a`;
};

// Get previous daf (e.g., "2b" -> "2a", "3a" -> "2b")
export const getPrevDaf = (daf) => {
  const parsed = parseDaf(daf);
  if (!parsed) return null;
  if (parsed.side === 'b') return `${parsed.num}a`;
  if (parsed.num <= 2) return null; // First daf is usually 2a
  return `${parsed.num - 1}b`;
};

/**
 * Quick lookup for inline preview (uses local data only - fast)
 */
export const getQuickDefinition = (word) => {
  if (!word) return null;

  const bdb = lookupBDBByWord(word);
  if (bdb?.definition) {
    return { source: 'BDB', definition: bdb.definition, pos: bdb.pos };
  }

  const jastrow = lookupJastrowLocal(word);
  if (jastrow?.definition) {
    return { source: 'Jastrow', definition: jastrow.definition };
  }

  return null;
};
