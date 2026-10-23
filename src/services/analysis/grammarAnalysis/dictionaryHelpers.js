// =============================================================================
// Helpers d'accès aux dictionnaires — lexiques araméens lazy + validation
// de mot + résolution de source (Jastrow → BDB araméen → CAL → Gesenius…).
// (extrait de grammarAnalysisService.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

import {
  lookupJastrowSync,
  lookupBDBSync,
  lookupStrongsSync,
  getCALAramaicData,
  getJastrowAramaicData,
  getBDBAramaicData,
  getGeseniusLexiconData
} from '../../dictionaries/dictionaryLoader';

// Helper functions to access lazy-loaded lexicons (returns null if not loaded yet)
import { cleanHebrewWordStrict as cleanHebrewWord } from '../../../utils/hebrewUtils';

const getCAL = () => getCALAramaicData();
const getJastrowAramaic = () => getJastrowAramaicData();
const getBDBAramaic = () => getBDBAramaicData();
const getGesenius = () => getGeseniusLexiconData();


/**
 * SMART: Check if a word exists in ANY of our dictionaries
 * This validates that prefix stripping produced a REAL word
 *
 * For TALMUD/ARAMAIC context (Gemara, Rashi on Talmud):
 *   1. Jastrow (via sync lookup) - 25K entries, best for Talmud
 *   2. CAL_ARAMAIC - Comprehensive Aramaic Lexicon
 *   3. BDB_ARAMAIC - Aramaic section
 *   4. JASTROW_ARAMAIC - Small subset
 *
 * For TORAH/HEBREW context (Chumash, Tanakh):
 *   5. BDB (via sync lookup) - Biblical Hebrew
 *   6. Gesenius - Classical Hebrew grammar
 *   7. Strong's (via sync lookup) - Last resort (often wrong for Talmud)
 */
export const isValidDictionaryWord = (word) => {
  if (!word || word.length < 2) return false;

  // === ARAMAIC DICTIONARIES (check first for Talmud) ===

  // 1. Jastrow Complete - PRIMARY for Talmudic Aramaic (25K entries)
  if (lookupJastrowSync(word)) return true;

  // 2. CAL - Comprehensive Aramaic Lexicon (lazy-loaded)
  const calData = getCAL();
  if (calData?.[word]) return true;

  // 3. BDB Aramaic section (lazy-loaded)
  const bdbAramaicData = getBDBAramaic();
  if (bdbAramaicData?.[word]) return true;

  // 4. Jastrow Aramaic subset (lazy-loaded)
  const jastrowAramaicData = getJastrowAramaic();
  if (jastrowAramaicData?.[word]) return true;

  // === HEBREW DICTIONARIES ===

  // 5. BDB - Biblical Hebrew
  if (lookupBDBSync(word)) return true;

  // 6. Gesenius - Classical Hebrew (lazy-loaded)
  const geseniusData = getGesenius();
  if (geseniusData?.[word]) return true;

  // 7. Strong's - Biblical (skip for Talmud, but include for validation)
  if (lookupStrongsSync(word)) return true;

  return false;
};

/**
 * Get the dictionary source for a word
 * Returns: { source: string, entry: object, isAramaic: boolean }
 */
export const getDictionarySource = (word) => {
  if (!word || word.length < 2) return null;

  // Aramaic sources (for Talmud) - use sync lookups for main dictionaries
  const jastrowEntry = lookupJastrowSync(word);
  if (jastrowEntry) return { source: 'Jastrow', entry: jastrowEntry, isAramaic: true };

  // Lazy-loaded lexicons
  const calData = getCAL();
  if (calData?.[word]) return { source: 'CAL', entry: calData[word], isAramaic: true };

  const bdbAramaicData = getBDBAramaic();
  if (bdbAramaicData?.[word]) return { source: 'BDB-Aramaic', entry: bdbAramaicData[word], isAramaic: true };

  const jastrowAramaicData = getJastrowAramaic();
  if (jastrowAramaicData?.[word]) return { source: 'Jastrow', entry: jastrowAramaicData[word], isAramaic: true };

  // Hebrew sources (for Torah) - use sync lookups for main dictionaries
  const bdbEntry = lookupBDBSync(word);
  if (bdbEntry) return { source: 'BDB', entry: bdbEntry, isAramaic: false };

  const geseniusData = getGesenius();
  if (geseniusData?.[word]) return { source: 'Gesenius', entry: geseniusData[word], isAramaic: false };

  const strongsEntry = lookupStrongsSync(word);
  if (strongsEntry) return { source: "Strong's", entry: strongsEntry, isAramaic: false };

  return null;
};

