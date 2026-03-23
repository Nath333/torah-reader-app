/**
 * DictionaryTranslation - Pro Scholar Glossary
 *
 * DICTIONARY-DRIVEN approach (no hardcoding):
 * - Uses Jastrow for Aramaic (1903, academic standard)
 * - Uses BDB for Biblical Hebrew
 * - Uses CAL for Aramaic variants
 * - Uses Klein for etymology
 * - Detects abbreviations by ׳ character
 * - Shows ALL dictionary sources for each word
 */

import React, { useMemo, useState } from 'react';
import { splitIntoWords, cleanHebrewWord } from '../../services/hebrewDictionary';
import { lookupWordSync } from '../../services/combinedTranslationService';
import { getSourceInfo, RELIABILITY_TIERS, isAcademicSource } from '../../constants/dictionarySources';
import { cleanDefinition } from '../../utils/definitionCleaner';
import { lookupHalachicWithPrefix, RASHI_VOCABULARY } from '../../utils/commentaryUtils';
import { STOP_WORDS, lookupFunctionWord, FUNCTION_WORDS } from '../../constants/morphology';
// PRO SCHOLAR V5: Pre-classification for proper nouns, abbreviations, technical terms
import { preClassify } from '../../services/preClassificationService';
import './DictionaryTranslation.css';

// Hebrew prefixes (grammatical, from standard Hebrew grammar)
const GRAMMATICAL_PREFIXES = {
  'ו': 'and',
  'ה': 'the',
  'ב': 'in',
  'ל': 'to',
  'מ': 'from',
  'כ': 'like',
  'ש': 'that',
  'ד': 'that (Aram.)',
};

/**
 * Detect if word is likely an abbreviation (contains ׳ or ״)
 */
const isAbbreviation = (word) => /[׳״'"]/.test(word);

/**
 * Analyze word structure (prefixes)
 * CRITICAL: Check STOP_WORDS to avoid wrong parsing like שבת → ש+בת (daughter)
 *
 * For "השבת": strip "ה", root = "שבת" (STOP_WORD protected from further stripping)
 * For "שבת": STOP_WORD, no stripping, root = "שבת"
 */
const analyzeStructure = (word) => {
  const cleaned = cleanHebrewWord(word);
  if (!cleaned || cleaned.length < 3) return { prefixes: [], root: cleaned };

  // PRO SCHOLAR: CRITICAL FIX - Don't strip prefixes from words with complete translations
  // This prevents ויעבירו → ו + יעבירו when we have "and they caused to pass" as complete translation
  // Check FUNCTION_WORDS first - these are complete words that shouldn't be broken down
  if (FUNCTION_WORDS[cleaned] || lookupFunctionWord(cleaned)) {
    return { prefixes: [], root: cleaned };
  }

  // CRITICAL: Don't strip prefixes from known complete words
  // e.g., "שבת" (Shabbat) should NOT become "ש" + "בת" (daughter)
  if (STOP_WORDS.has(cleaned)) {
    return { prefixes: [], root: cleaned };
  }

  const prefixes = [];
  let root = cleaned;

  // Check for common prefix patterns
  for (const [prefix, meaning] of Object.entries(GRAMMATICAL_PREFIXES)) {
    if (root.startsWith(prefix) && root.length > 2) {
      const potentialRoot = root.slice(1);

      // Check if the remaining ROOT itself is in STOP_WORDS
      // If so, this is the END of prefix stripping (root is a complete word)
      // e.g., "השבת" → strip "ה" → "שבת" (stop word) = final root
      if (STOP_WORDS.has(potentialRoot)) {
        prefixes.push({ letter: prefix, meaning });
        root = potentialRoot;
        break; // Stop here - don't strip further from this stop word
      }

      prefixes.push({ letter: prefix, meaning });
      root = potentialRoot;
      // Only strip one or two prefixes max
      if (prefixes.length >= 2) break;
    }
  }

  return { prefixes, root };
};

/**
 * Check RASHI_VOCABULARY with prefix stripping
 * GLOBAL APPROACH: Stop at STOP_WORDS to avoid wrong parsing like שבת → ש+בת
 * Returns { definition, prefix, root } or null
 */
const checkRashiWithPrefixes = (word) => {
  if (!word) return null;

  // 1. Direct match first
  if (RASHI_VOCABULARY[word]) {
    return { definition: RASHI_VOCABULARY[word], prefix: '', root: word };
  }

  // 2. STOP_WORD check: If word itself is a stop word, don't strip any prefixes
  if (STOP_WORDS.has(word)) {
    return null; // Let dictionary lookup handle it
  }

  // 3. Strip 1 prefix
  if (word.length > 2) {
    const p1 = word[0];
    if (GRAMMATICAL_PREFIXES[p1]) {
      const stem1 = word.slice(1);

      // If stem1 is in vocabulary, we found it
      if (RASHI_VOCABULARY[stem1]) {
        return {
          definition: RASHI_VOCABULARY[stem1],
          prefix: GRAMMATICAL_PREFIXES[p1],
          root: stem1
        };
      }

      // CRITICAL: If stem1 is a STOP_WORD, DON'T try stripping more prefixes
      // e.g., "השבת" → stem1="שבת" is STOP_WORD → don't try "בת"
      if (STOP_WORDS.has(stem1)) {
        return null; // Stop here - let dictionary lookup find "שבת"
      }
    }
  }

  // 4. Strip 2 prefixes (only if 1-prefix stem wasn't a stop word)
  if (word.length > 3) {
    const p1 = word[0];
    const p2 = word[1];
    if (GRAMMATICAL_PREFIXES[p1] && GRAMMATICAL_PREFIXES[p2]) {
      const stem2 = word.slice(2);

      if (RASHI_VOCABULARY[stem2]) {
        return {
          definition: RASHI_VOCABULARY[stem2],
          prefix: `${GRAMMATICAL_PREFIXES[p1]} ${GRAMMATICAL_PREFIXES[p2]}`,
          root: stem2
        };
      }

      // If stem2 is a stop word, don't strip further
      if (STOP_WORDS.has(stem2)) {
        return null;
      }
    }
  }

  // 5. Strip 3 prefixes (rare, for completeness)
  if (word.length > 4) {
    const p1 = word[0];
    const p2 = word[1];
    const p3 = word[2];
    if (GRAMMATICAL_PREFIXES[p1] && GRAMMATICAL_PREFIXES[p2] && GRAMMATICAL_PREFIXES[p3]) {
      const stem3 = word.slice(3);
      if (RASHI_VOCABULARY[stem3]) {
        return {
          definition: RASHI_VOCABULARY[stem3],
          prefix: `${GRAMMATICAL_PREFIXES[p1]} ${GRAMMATICAL_PREFIXES[p2]} ${GRAMMATICAL_PREFIXES[p3]}`,
          root: stem3
        };
      }
    }
  }

  return null;
};

// === CRITICAL WORD FALLBACK ===
// High-priority words that MUST have correct translations
// Used as fallback when other lookups fail (e.g., due to Unicode issues)
const CRITICAL_WORDS = {
  // Biblical names
  'משה': 'Moses',
  'אהרן': 'Aaron',
  'אברהם': 'Abraham',
  'יצחק': 'Isaac',
  'יעקב': 'Jacob',
  'דוד': 'David',
  'שלמה': 'Solomon',
  // Shabbat variations (NOT page references - gematria 702 is out of range)
  'שבת': 'Shabbat',
  'שבת:': 'Shabbat',  // With trailing colon (punctuation)
  'השבת': 'the Shabbat',
  // Verb forms
  'ויעבירו': 'and they proclaimed',
  // Abbreviations
  'וגו': 'etc.',
  "וגו'": 'etc.',
  'וגו׳': 'etc.',
  // Aramaic pronouns
  'להו': 'to them',
  // Aramaic/Talmudic terms
  'ברישיה': 'at its beginning',
  'מדבריהם': 'from their words',
  // Domain abbreviations
  'לר"ה': 'to public domain',
  'לרה"י': 'to private domain',
  'מרה"י': 'from private domain',
  'לרה"ר': 'to public domain',
  // Common prefixed words with clean translations
  'בכל': 'in all',
  'לכל': 'to all',
  'מכל': 'from all',
  'וכל': 'and all',
  'ככל': 'like all',
};

/**
 * Get ALL dictionary translations for a word - PRO SCHOLAR MODE
 * ALWAYS queries ALL dictionaries for scholarly comparison
 * Returns array of {source, definition, year, reliability}
 */
const getAllDictionaryResults = (word) => {
  const results = [];
  const seenDefs = new Set(); // Deduplicate by definition
  const isAbbrev = isAbbreviation(word);
  const structure = analyzeStructure(word);
  const cleaned = cleanHebrewWord(word);

  // === PRO SCHOLAR V9: TALMUDIC PAGE REFERENCE DETECTION ===
  // Page references like "צו:" or "צו:)" are daf (page) numbers, not words to translate
  // Hebrew letters represent numbers: א=1, ב=2, ... י=10, כ=20, ל=30, מ=40, נ=50, ס=60, ע=70, פ=80, צ=90, ק=100
  // CRITICAL: Must check BEFORE cleanHebrewWord strips the : and ) punctuation
  const isTalmudicPageRef = (w) => {
    if (!w) return false;
    // Strip only nikud/vowels, keeping punctuation for daf detection
    const noNikud = w.replace(/[\u0591-\u05C7]/g, '');
    // Pattern: Optional opening paren + 1-3 Hebrew letters + : or . + optional closing paren
    // e.g., "צו:" = 96b, "צו." = 96a, "(צו:)" = 96b, "צו:)" = 96b
    const dafPattern = /^[([]*[א-ת]{1,3}[:.][\])]*$/;
    return dafPattern.test(noNikud);
  };

  if (isTalmudicPageRef(word)) {
    // Convert Hebrew letters to number for display
    const hebrewToNum = { 'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9,
      'י': 10, 'כ': 20, 'ך': 20, 'ל': 30, 'מ': 40, 'ם': 40, 'נ': 50, 'ן': 50, 'ס': 60, 'ע': 70,
      'פ': 80, 'ף': 80, 'צ': 90, 'ץ': 90, 'ק': 100, 'ר': 200, 'ש': 300, 'ת': 400 };
    const letters = cleaned.replace(/[^א-ת]/g, '');
    const pageNum = letters.split('').reduce((sum, c) => sum + (hebrewToNum[c] || 0), 0);

    // PRO SCHOLAR V9: Valid daf range check
    // Most tractates have 2-200 pages. Bava Batra (largest) has 176 pages.
    // Numbers above 200 are almost certainly real words (שבת=702), not page refs.
    if (pageNum >= 2 && pageNum <= 200) {
      // Amud notation: : = amud bet (side b), . = amud alef (side a)
      const amud = word.includes(':') ? 'b' : 'a';
      return {
        results: [{
          source: 'Daf Reference',
          definition: `daf ${pageNum}${amud}`,
          isAcademic: false,
          priority: -1,
          isPageRef: true,
        }],
        isAbbrev: false,
        structure: { prefixes: [], root: cleaned },
        isPageRef: true,
      };
    }
    // If page number is out of range, fall through to normal word lookup
  }

  // === CRITICAL WORD FALLBACK (HIGHEST PRIORITY) ===
  // Check for words that MUST have correct translations regardless of lookup issues
  const criticalTranslation = CRITICAL_WORDS[cleaned] || CRITICAL_WORDS[word];
  if (criticalTranslation) {
    return {
      results: [{
        source: 'Core',
        definition: criticalTranslation,
        isAcademic: true,
        priority: -2, // Highest possible priority
      }],
      isAbbrev: isAbbreviation(word),
      structure: { prefixes: [], root: cleaned },
    };
  }

  // Helper to add result with deduplication
  const addResult = (result) => {
    if (!result?.definition) return;
    // Normalize for dedup
    const key = result.definition.toLowerCase().slice(0, 30);
    if (seenDefs.has(key)) return;
    seenDefs.add(key);
    results.push(result);
  };

  // === PRO SCHOLAR V6: FUNCTION WORDS FIRST ===
  // Check for complete verb forms and common words that shouldn't be broken down
  // e.g., ויעבירו → "and they passed/proclaimed" (not "and they ed")
  const functionWordTranslation = lookupFunctionWord(cleaned);
  if (functionWordTranslation) {
    addResult({
      source: 'Talmudic',
      definition: functionWordTranslation,
      isAcademic: true,
      priority: -1, // Highest priority - before pre-classification
    });
    // For function words, return immediately with this result
    // Don't query other sources that might return wrong verb analysis
    return {
      results,
      isAbbrev,
      structure,
    };
  }

  // === PRO SCHOLAR V5: PRE-CLASSIFICATION SECOND ===
  // Check for proper nouns (משה=Moses), abbreviations, technical terms
  // BEFORE dictionary lookup to prevent wrong homograph matches
  const preClassResult = preClassify(cleaned, { textType: 'talmudic' });
  if (preClassResult && preClassResult.skipDictionary) {
    // For proper names, abbreviations, and technical terms - use our definition directly
    const definition = preClassResult.english || preClassResult.meaning;
    if (definition) {
      addResult({
        source: preClassResult.source || 'Pre-Classification',
        definition: definition,
        note: preClassResult.note,
        expansion: preClassResult.expansion,
        isAcademic: true,
        priority: 0, // Highest priority
        isPreClassified: true,
        type: preClassResult.type,
      });
      // For proper names, abbreviations, technical terms, references, particles, and verb forms, return immediately (skip dictionary)
      if (preClassResult.type === 'proper_name' ||
          preClassResult.type === 'abbreviation' ||
          preClassResult.type === 'technical_term' ||
          preClassResult.type === 'reference' ||
          preClassResult.type === 'verb_form' ||
          preClassResult.type === 'aramaic_particle' ||
          preClassResult.type === 'biblical_particle') {
        return {
          results,
          isAbbrev: preClassResult.type === 'abbreviation',
          structure,
          isPreClassified: true,
        };
      }
    }
  }

  // === PRO SCHOLAR V8: ACADEMIC-FIRST PRIORITY SYSTEM ===
  // Priority order: Academic dictionaries (1-2) > Scholarly (3) > Curated vocabulary (5-6)
  // This ensures Jastrow/BDB/CAL show as primary, with local vocab as supplementary

  // 1. FIRST: Query main dictionaries (Jastrow, BDB, Strong's, Klein, CAL)
  // These get HIGHEST priority for scholarly credibility
  try {
    const lookup = lookupWordSync(word);

    // Add all sources from combined service (PRO SCHOLAR V8: academic sources FIRST)
    if (lookup?.sources) {
      for (const src of lookup.sources) {
        if (src.definition) {
          const cleanedDef = cleanDefinition(src.definition, {
            maxLength: 120,
            removeReferences: true,
            removeHebrew: true,
            strictQuality: true,
          });
          if (cleanedDef && cleanedDef.length > 2) {
            // PRO SCHOLAR V8: Academic sources get TOP priority
            const isAcademic = src.isAcademic || isAcademicSource(src.name);
            const tier = src.reliabilityTier || (isAcademic ? 1 : 3);

            addResult({
              // Basic fields
              source: src.shortName || src.name || 'Dictionary',
              fullName: src.fullName || src.name,
              definition: cleanedDef,
              fullDefinition: src.definition,
              year: src.year,
              strongNumber: src.strongNumber,
              // PRO SCHOLAR V7: Enriched scholarly metadata
              author: src.author,
              citations: src.citations,
              specialization: src.specialization,
              // Classification
              reliabilityTier: tier,
              reliabilityLabel: src.reliabilityLabel,
              reliabilityIcon: src.reliabilityIcon,
              // Match information
              matchType: src.matchType,
              matchIcon: src.matchIcon,
              // Confidence scoring
              confidence: src.confidence,
              baseConfidence: src.baseConfidence,
              matchConfidence: src.matchConfidence,
              // Flags
              isAcademic,
              isLocal: src.isLocal,
              isLexicon: src.isLexicon,
              // PRO SCHOLAR V8: Academic-first priority
              // Tier 1 (Jastrow, BDB, CAL): priority 1
              // Tier 2 (Strong's, Klein): priority 2
              // Other: priority 4
              priority: (tier === 1) ? 1 :
                        (tier === 2) ? 2 :
                        isAcademic ? 1 : 4,
            });
          }
        }
      }
    }

    // Also add primary if available
    if (lookup?.english) {
      const cleanedDef = cleanDefinition(lookup.english, {
        maxLength: 120,
        removeReferences: true,
        removeHebrew: true,
      });
      if (cleanedDef) {
        const isAcademic = isAcademicSource(lookup.source);
        addResult({
          source: lookup.source || 'Dictionary',
          definition: cleanedDef,
          isAcademic,
          priority: isAcademic ? 2 : 4,
        });
      }
    }
  } catch (e) {
    // Ignore lookup errors
  }

  // 2. SECOND: Check RASHI_VOCABULARY (curated Talmudic terms) - SUPPLEMENTARY
  // These are useful fallbacks but should NOT override academic dictionaries
  const rashiMatch = checkRashiWithPrefixes(cleaned);
  if (rashiMatch) {
    const fullDef = rashiMatch.prefix
      ? `${rashiMatch.prefix} ${rashiMatch.definition}`
      : rashiMatch.definition;
    addResult({
      source: 'Rabbinic',
      definition: fullDef,
      isAcademic: false,
      isLocal: true,
      reliabilityTier: 3,
      priority: 5,  // Lower priority than academic sources
    });
  }

  // 3. THIRD: Check Halachic terms - SUPPLEMENTARY
  if (cleaned) {
    const halachicResult = lookupHalachicWithPrefix(cleaned);
    if (halachicResult?.definition) {
      addResult({
        source: halachicResult.source || 'Halachic',
        definition: halachicResult.definition,
        isAcademic: false,
        isLocal: true,
        reliabilityTier: 3,
        priority: 5,  // Lower priority than academic sources
      });
    }
  }

  // 4. FOURTH: If has prefixes, try root lookup (adds more scholarly sources)
  if (structure.prefixes.length > 0 && structure.root.length >= 2) {
    // Try dictionary root lookup FIRST (academic sources)
    try {
      const rootLookup = lookupWordSync(structure.root);
      if (rootLookup?.sources) {
        for (const src of rootLookup.sources) {
          if (src.definition) {
            const cleanedDef = cleanDefinition(src.definition, {
              maxLength: 120,
              removeReferences: true,
              removeHebrew: true,
              strictQuality: true,
            });
            if (cleanedDef && cleanedDef.length > 2) {
              const isAcademic = isAcademicSource(src.name);
              addResult({
                source: `${src.name || 'Dict'} (root)`,
                definition: cleanedDef,
                year: src.year,
                isRoot: true,
                isAcademic,
                reliabilityTier: isAcademic ? 1 : 3,
                // Root lookups from academic sources still get good priority
                priority: isAcademic ? 3 : 6,
              });
            }
          }
        }
      }
    } catch (e) {
      // Ignore
    }

    // Check RASHI_VOCABULARY for the root (supplementary)
    if (RASHI_VOCABULARY[structure.root]) {
      addResult({
        source: 'Rabbinic (root)',
        definition: RASHI_VOCABULARY[structure.root],
        isRoot: true,
        isAcademic: false,
        isLocal: true,
        reliabilityTier: 3,
        priority: 7,
      });
    }
  }

  // Sort by priority (lower = better) then academic status
  results.sort((a, b) => {
    if (a.priority !== b.priority) return (a.priority || 10) - (b.priority || 10);
    if (a.isAcademic && !b.isAcademic) return -1;
    if (!a.isAcademic && b.isAcademic) return 1;
    return 0;
  });

  return {
    results,
    isAbbrev,
    structure,
  };
};

/**
 * PRO SCHOLAR V7: Tier Legend Component
 * Explains the source reliability tiers for scholarly transparency
 */
const TierLegend = ({ compact = true }) => {
  const [expanded, setExpanded] = useState(false);

  if (compact && !expanded) {
    return (
      <button
        className="tier-legend-toggle"
        onClick={() => setExpanded(true)}
        title="Show source tier explanation"
      >
        ℹ️ Tier Legend
      </button>
    );
  }

  return (
    <div className="tier-legend">
      <div className="tier-legend-header">
        <span className="tier-legend-title">📊 Source Reliability Tiers</span>
        {compact && (
          <button className="tier-legend-close" onClick={() => setExpanded(false)}>×</button>
        )}
      </div>
      <div className="tier-legend-items">
        <div className="tier-item gold">
          <span className="tier-icon">🥇</span>
          <span className="tier-label">Gold</span>
          <span className="tier-desc">Academic standard (Jastrow, BDB, CAL)</span>
        </div>
        <div className="tier-item silver">
          <span className="tier-icon">🥈</span>
          <span className="tier-label">Silver</span>
          <span className="tier-desc">Reliable reference (Strong's, Klein)</span>
        </div>
        <div className="tier-item bronze">
          <span className="tier-icon">🥉</span>
          <span className="tier-label">Bronze</span>
          <span className="tier-desc">Supplementary (computed/inferred)</span>
        </div>
      </div>
      <div className="tier-legend-match-types">
        <span className="match-legend-title">Match Types:</span>
        <span className="match-item"><span className="match-badge exact">✓</span> Exact</span>
        <span className="match-item"><span className="match-badge morphed">P</span> Prefix stripped</span>
        <span className="match-item"><span className="match-badge root">R</span> Root lookup</span>
        <span className="match-item"><span className="match-badge fuzzy">~</span> Approximate</span>
      </div>
    </div>
  );
};

/**
 * PRO SCHOLAR V7: Enhanced source badge with match type and confidence
 * Shows: Source name, reliability tier, match type (exact/morphological/fuzzy), local indicator
 * Now accepts enriched metadata directly from combinedTranslationService
 */
const SourceBadge = ({
  source,
  year,
  small = false,
  matchType,
  isLocal = true,
  confidence,
  // PRO SCHOLAR V7: Enriched metadata fields
  fullName,
  author,
  reliabilityTier,
  reliabilityIcon,
  reliabilityLabel,
  specialization,
  citations,
  matchIcon,
  color
}) => {
  // Use enriched data if available, otherwise fall back to lookup
  const info = getSourceInfo(source);
  const reliability = RELIABILITY_TIERS[info?.reliability];

  // Determine tier display - prefer enriched data
  const tierLevel = reliabilityTier || reliability?.level || 3;
  const tierClass = tierLevel === 1 ? 'gold' : tierLevel === 2 ? 'silver' : 'bronze';
  const tierIcon = reliabilityIcon || reliability?.icon || '📑';
  const tierLabel = reliabilityLabel || reliability?.label || 'Reference';

  // Match type display - enhanced with enriched matchType
  const matchTypeDisplay = {
    'EXACT': { label: '✓', title: 'Exact dictionary match', class: 'exact' },
    'exact': { label: '✓', title: 'Exact dictionary match', class: 'exact' },
    'NORMALIZED': { label: '≈', title: 'Normalized (finals converted)', class: 'normalized' },
    'normalized': { label: 'N', title: 'Normalized (finals → regular)', class: 'normalized' },
    'PREFIX_STRIPPED': { label: 'P', title: 'Prefix stripped (ו, ה, ב, ל, מ, כ)', class: 'morphed' },
    'prefix-stripped': { label: 'P', title: 'Prefix stripped (ו, ה, ב, ל, מ, כ)', class: 'morphed' },
    'SUFFIX_STRIPPED': { label: 'S', title: 'Suffix stripped', class: 'morphed' },
    'suffix-stripped': { label: 'S', title: 'Suffix stripped', class: 'morphed' },
    'ROOT_DERIVED': { label: 'R', title: 'Root form lookup', class: 'root' },
    'root': { label: 'R', title: 'Root form lookup', class: 'root' },
    'MORPHOLOGICAL': { label: 'M', title: 'Full morphological analysis', class: 'morphed' },
    'morphological': { label: 'M', title: 'Morphological analysis', class: 'morphed' },
    'BINYAN': { label: 'B', title: 'Binyan pattern analysis', class: 'binyan' },
    'CROSSREF': { label: '→', title: 'Cross-reference lookup', class: 'crossref' },
    'fuzzy': { label: '~', title: 'Fuzzy/approximate match', class: 'fuzzy' },
    'inferred': { label: '?', title: 'Algorithmically inferred', class: 'inferred' },
  };

  const matchInfo = matchType ? matchTypeDisplay[matchType] : null;

  // Use enriched icon if available
  const displayMatchIcon = matchIcon || matchInfo?.label;

  // Build detailed tooltip with enriched metadata
  const tooltip = [
    fullName || info?.fullName || source,
    author ? `Author: ${author}` : null,
    year ? `Published: ${year}` : null,
    specialization || info?.specialization || null,
    citations ? `Standard citation: ${citations}` : null,
    '',
    `Tier: ${tierLevel === 1 ? '🥇 Gold (Academic)' : tierLevel === 2 ? '🥈 Silver (Reference)' : '🥉 Bronze (Supplementary)'}`,
    `Level: ${tierLabel}`,
    matchInfo ? `Match: ${matchInfo.title}` : null,
    confidence ? `Confidence: ${confidence}%` : null,
    isLocal !== false ? '📦 Local dictionary (offline capable)' : '🌐 Network lookup',
  ].filter(Boolean).join('\n');

  return (
    <span
      className={`scholar-source ${small ? 'small' : ''} ${tierClass}`}
      style={{ backgroundColor: color || info?.color || '#6b7280' }}
      title={tooltip}
    >
      <span className="rel-icon">{tierIcon}</span>
      {info?.name || source}
      {year && <span className="src-year">({year})</span>}
      {matchInfo && (
        <span className={`match-type-badge ${matchInfo.class}`} title={matchInfo.title}>
          {displayMatchIcon}
        </span>
      )}
      {confidence && confidence < 100 && (
        <span className={`confidence-indicator ${confidence >= 85 ? 'high' : confidence >= 70 ? 'med' : 'low'}`}>
          {confidence}%
        </span>
      )}
    </span>
  );
};

/**
 * PRO SCHOLAR V7: Enhanced glossary entry with confidence scoring
 * Shows: Word, match type, root analysis confidence, dictionary sources
 */
const GlossaryEntry = ({ word, data, expanded, onToggle }) => {
  const { results, isAbbrev, structure, isPreClassified } = data;
  const hasMultiple = results.length > 1;
  const primary = results[0];

  // Sort by academic quality
  const sortedResults = [...results].sort((a, b) => {
    if (a.isAcademic && !b.isAcademic) return -1;
    if (!a.isAcademic && b.isAcademic) return 1;
    return 0;
  });

  const displayPrimary = sortedResults[0] || primary;

  // Determine match type for display
  const getMatchType = () => {
    if (isPreClassified) return 'exact';
    if (displayPrimary?.isRoot) return 'root';
    if (structure.prefixes.length > 0) return 'prefix-stripped';
    return 'exact';
  };

  if (!displayPrimary) {
    return (
      <div className="glossary-entry no-trans">
        <span className="gl-word" dir="rtl">{word}</span>
        <span className="gl-dash">—</span>
        <span className="gl-none">not in dictionary</span>
      </div>
    );
  }

  // PRO SCHOLAR V7: Show derivation path for transparency
  const showDerivation = structure.prefixes.length > 0 || displayPrimary?.isRoot;

  return (
    <div className={`glossary-entry ${expanded ? 'expanded' : ''} ${hasMultiple ? 'clickable' : ''}`}>
      <div className="gl-main" onClick={() => hasMultiple && onToggle()}>
        <span className="gl-word" dir="rtl">{word}</span>

        {/* PRO SCHOLAR V7: Type badges */}
        {data.isPageRef && <span className="gl-tag type-pageref">daf</span>}
        {isAbbrev && !data.isPageRef && <span className="gl-tag abbrev">abbr</span>}
        {isPreClassified && displayPrimary?.type && (
          <span className={`gl-tag type-${displayPrimary.type}`}>
            {displayPrimary.type === 'proper_name' ? 'name' :
             displayPrimary.type === 'technical_term' ? 'tech' :
             displayPrimary.type === 'aramaic_particle' ? 'aram' :
             displayPrimary.type === 'biblical_particle' ? 'bibl' :
             displayPrimary.type === 'verb_form' ? 'verb' :
             displayPrimary.type}
          </span>
        )}

        {/* PRO SCHOLAR V7: Morphological analysis indicator */}
        {structure.prefixes.length > 0 && (
          <span className="gl-morph" title={`Prefix analysis: ${structure.prefixes.map(p => `${p.letter}=${p.meaning}`).join(', ')}`}>
            {structure.prefixes.map(p => p.meaning).join('+')}+
          </span>
        )}

        <span className="gl-arrow">→</span>
        <span className="gl-def">{displayPrimary.definition}</span>

        {/* PRO SCHOLAR V7: Enhanced source badge with full metadata */}
        <SourceBadge
          source={displayPrimary.source}
          year={displayPrimary.year}
          small
          matchType={displayPrimary.matchType || getMatchType()}
          isLocal={displayPrimary.isLocal !== false}
          confidence={displayPrimary.confidence}
          fullName={displayPrimary.fullName}
          author={displayPrimary.author}
          reliabilityTier={displayPrimary.reliabilityTier}
          reliabilityIcon={displayPrimary.reliabilityIcon}
          reliabilityLabel={displayPrimary.reliabilityLabel}
          specialization={displayPrimary.specialization}
          citations={displayPrimary.citations}
          matchIcon={displayPrimary.matchIcon}
          color={displayPrimary.color}
        />

        {hasMultiple && (
          <span className="gl-more" title="Click to see all dictionary sources">
            +{results.length - 1}
          </span>
        )}
      </div>

      {/* PRO SCHOLAR V7: Expanded view with derivation chain */}
      {expanded && hasMultiple && (
        <div className="gl-alternatives">
          <div className="gl-alt-header">📖 All dictionary sources ({results.length}):</div>

          {/* Show derivation if morphological analysis was used */}
          {showDerivation && (
            <div className="gl-derivation">
              <span className="derivation-label">Analysis:</span>
              <span className="derivation-word" dir="rtl">{word}</span>
              {structure.prefixes.length > 0 && (
                <>
                  <span className="derivation-arrow">→</span>
                  <span className="derivation-prefix">
                    {structure.prefixes.map(p => `${p.letter} (${p.meaning})`).join(' + ')}
                  </span>
                  <span className="derivation-plus">+</span>
                </>
              )}
              <span className="derivation-root" dir="rtl">{structure.root}</span>
            </div>
          )}

          {sortedResults.slice(1).map((r, i) => (
            <div key={i} className={`gl-alt ${r.isAcademic ? 'academic' : ''} tier-${r.reliabilityTier || 3}`}>
              <SourceBadge
                source={r.source}
                year={r.year}
                matchType={r.matchType || (r.isRoot ? 'root' : 'exact')}
                isLocal={r.isLocal !== false}
                confidence={r.confidence}
                fullName={r.fullName}
                author={r.author}
                reliabilityTier={r.reliabilityTier}
                reliabilityIcon={r.reliabilityIcon}
                reliabilityLabel={r.reliabilityLabel}
                specialization={r.specialization}
                citations={r.citations}
                matchIcon={r.matchIcon}
                color={r.color}
              />
              {r.strongNumber && (
                <span className="gl-strong" title="Strong's Concordance Number">
                  H{r.strongNumber}
                </span>
              )}
              <span className="gl-alt-def">{r.definition}</span>
              {r.isRoot && <span className="gl-root-tag" title="Definition from root form">root</span>}
              {r.note && <span className="gl-note" title={r.note}>💡</span>}
              {r.confidence && r.confidence < 100 && (
                <span className={`gl-confidence ${r.confidence >= 85 ? 'high' : r.confidence >= 70 ? 'med' : 'low'}`}>
                  {r.confidence}%
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Main component
 */
const DictionaryTranslation = ({ text, className = '' }) => {
  const [expandedWords, setExpandedWords] = useState(new Set());

  const glossaryData = useMemo(() => {
    if (!text) return { entries: [], stats: {}, sources: {} };

    const words = splitIntoWords(text);
    const entries = [];
    const sources = {};
    let translated = 0;

    // PRO SCHOLAR V7: Normalize source names for deduplication
    const normalizeSourceName = (name) => {
      if (!name) return 'Unknown';
      // Remove year suffixes, variants, emojis, and standardize names
      let normalized = name
        .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')  // Remove emojis (tier icons like 🥇🥈🥉)
        .replace(/\s*\(\d{4}\)\s*/g, '')  // Remove (1903), (1906), etc.
        .replace(/\s*\(root\)\s*/gi, '')  // Remove (root)
        .replace(/\s*\(local\)\s*/gi, '') // Remove (local)
        .replace(/\s*\(Aram\.?\)\s*/gi, '') // Remove (Aram) or (Aram.)
        .replace(/\s+\d{4}$/g, '')        // Remove trailing year like "Jastrow 1903"
        .replace(/['']s?\s*/g, '')        // Remove apostrophes and possessives
        .trim();

      // Map variant names to canonical forms for proper aggregation
      const canonicalNames = {
        // Jastrow variants
        'jastrow': 'Jastrow',
        'marcus jastrow': 'Jastrow',
        'jastrows': 'Jastrow',
        'm jastrow': 'Jastrow',
        // BDB variants
        'bdb': 'BDB',
        'brown-driver-briggs': 'BDB',
        'brown driver briggs': 'BDB',
        'browndriverbriggs': 'BDB',
        'brown': 'BDB',
        // CAL variants
        'cal': 'CAL',
        'cal database': 'CAL',
        'comprehensive aramaic lexicon': 'CAL',
        'aramaic lexicon': 'CAL',
        // Strong's variants
        'strong': "Strong's",
        'strongs': "Strong's",
        'strongs concordance': "Strong's",
        'strong concordance': "Strong's",
        // Klein variants
        'klein': 'Klein',
        'ernest klein': 'Klein',
        'e klein': 'Klein',
        // HALOT variants
        'halot': 'HALOT',
        'koehler': 'HALOT',
        'koehler-baumgartner': 'HALOT',
        // Gesenius variants
        'gesenius': 'Gesenius',
        'gks': 'Gesenius',
        // Sefaria
        'sefaria': 'Sefaria',
        // Other
        'rabbinic': 'Rabbinic',
        'talmudic': 'Rabbinic',
        'rashi': 'Rabbinic',
        'halachic': 'Halachic',
        'halacha': 'Halachic',
        'core': 'Core',
        'dict': 'Dictionary',
        'dictionary': 'Dictionary',
        'reference': 'Reference',
        'pre-classification': 'Pre-Classification',
        'preclassification': 'Pre-Classification',
        'function': 'Function Words',
        'function words': 'Function Words',
        'particles': 'Particles',
        'morphology': 'Morphology',
        'morphological': 'Morphology',
        'root': 'Root Analysis',
      };

      // Lookup canonical name (case-insensitive)
      const lowerNormalized = normalized.toLowerCase();
      return canonicalNames[lowerNormalized] || normalized;
    };

    for (const word of words) {
      const data = getAllDictionaryResults(word);
      entries.push({ word, data });

      if (data.results.length > 0) {
        translated++;
        for (const r of data.results) {
          // Use normalized name for counting
          const normalizedName = normalizeSourceName(r.source);
          sources[normalizedName] = (sources[normalizedName] || 0) + 1;
        }
      }
    }

    // Sort sources by reliability then count
    const sortedSources = Object.entries(sources)
      .map(([name, count]) => ({
        name,
        count,
        isAcademic: isAcademicSource(name),
      }))
      .sort((a, b) => {
        if (a.isAcademic && !b.isAcademic) return -1;
        if (!a.isAcademic && b.isAcademic) return 1;
        return b.count - a.count;
      });

    return {
      entries,
      stats: { total: words.length, translated },
      sources: sortedSources,
    };
  }, [text]);

  const toggleWord = (word) => {
    setExpandedWords(prev => {
      const next = new Set(prev);
      next.has(word) ? next.delete(word) : next.add(word);
      return next;
    });
  };

  if (!text) return null;

  const { entries, stats, sources } = glossaryData;
  const coverage = stats.total > 0 ? Math.round((stats.translated / stats.total) * 100) : 0;

  return (
    <div className={`dictionary-translation scholar-glossary ${className}`}>
      {/* Header */}
      <div className="scholar-header">
        <span className="scholar-title">📚 Pro Scholar Glossary</span>
        <span className={`coverage-badge ${coverage >= 70 ? 'high' : coverage >= 40 ? 'med' : 'low'}`}>
          {coverage}% ({stats.translated}/{stats.total})
        </span>
      </div>

      {/* PRO SCHOLAR V7: Source Tier Legend */}
      <TierLegend compact={true} />

      {/* Sources used - sorted by reliability */}
      <div className="scholar-sources">
        <span className="sources-label">Sources:</span>
        {sources.map(({ name, count, isAcademic }) => (
          <span key={name} className={`source-with-count ${isAcademic ? 'academic' : ''}`}>
            <SourceBadge source={name} matchType="exact" isLocal={true} />
            <span className="src-count">×{count}</span>
          </span>
        ))}
      </div>

      {/* Glossary entries */}
      <div className="scholar-entries">
        {entries.map(({ word, data }, idx) => (
          <GlossaryEntry
            key={`${word}-${idx}`}
            word={word}
            data={data}
            expanded={expandedWords.has(word)}
            onToggle={() => toggleWord(word)}
          />
        ))}
      </div>

      {/* PRO SCHOLAR V7: Enhanced scholarly footer */}
      <div className="scholar-footer">
        <div className="scholar-tip">
          <strong>📊 Source Tiers:</strong> 🥇 Gold = Academic standard (Jastrow 1903, BDB 1906, CAL) •
          🥈 Silver = Reliable reference • 🥉 Bronze = Supplementary
        </div>
        <div className="scholar-tip-secondary">
          <strong>Match Types:</strong> ✓ = Exact match • P = Prefix stripped • R = Root lookup • ~ = Approximate
        </div>
        <div className="scholar-tip-tertiary">
          Click <strong>+N</strong> to compare all dictionary definitions for a word
        </div>
      </div>
    </div>
  );
};

export default DictionaryTranslation;
