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
  const funcWordDirect = FUNCTION_WORDS[cleaned];
  const funcWordLookup = lookupFunctionWord(cleaned);
  // DEBUG: Trace function word lookup
  if (cleaned === 'משה' || cleaned === 'ויעבירו' || cleaned === 'וגו') {
    console.log(`[DEBUG analyzeStructure] "${cleaned}": FUNCTION_WORDS direct=`, funcWordDirect, ', lookupFunctionWord=', funcWordLookup, ', FUNCTION_WORDS type=', typeof FUNCTION_WORDS, ', keys sample=', Object.keys(FUNCTION_WORDS || {}).slice(0, 5));
  }
  if (funcWordDirect || funcWordLookup) {
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
  // DEBUG: Trace word lookup
  if (cleaned === 'משה' || cleaned === 'ויעבירו' || cleaned === 'וגו') {
    console.log(`[DEBUG] Word: "${cleaned}", FUNCTION_WORDS lookup:`, FUNCTION_WORDS[cleaned], 'lookupFunctionWord:', functionWordTranslation);
  }
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
  // DEBUG: Trace preClassify
  if (cleaned === 'משה' || cleaned === 'ויעבירו' || cleaned === 'וגו') {
    console.log(`[DEBUG] preClassify("${cleaned}"):`, preClassResult);
  }
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

  // === ALWAYS QUERY ALL SOURCES (PRO SCHOLAR MODE) ===

  // 1. Check RASHI_VOCABULARY (quick Talmudic terms)
  const rashiMatch = checkRashiWithPrefixes(cleaned);
  if (rashiMatch) {
    const fullDef = rashiMatch.prefix
      ? `${rashiMatch.prefix} ${rashiMatch.definition}`
      : rashiMatch.definition;
    addResult({
      source: 'Talmudic',
      definition: fullDef,
      isAcademic: true,
      priority: 1,
    });
  }

  // 2. Check Halachic terms (always check, not just when empty)
  if (cleaned) {
    const halachicResult = lookupHalachicWithPrefix(cleaned);
    if (halachicResult?.definition) {
      addResult({
        source: halachicResult.source || 'Halachic',
        definition: halachicResult.definition,
        isAcademic: true,
        priority: 2,
      });
    }
  }

  // 3. ALWAYS query main dictionaries (Jastrow, BDB, Strong's, Klein, CAL)
  try {
    const lookup = lookupWordSync(word);

    // Add all sources from combined service (PRO SCHOLAR: show ALL)
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
            addResult({
              source: src.name || 'Dictionary',
              definition: cleanedDef,
              fullDefinition: src.definition,
              year: src.year,
              strongNumber: src.strongNumber,
              isAcademic: isAcademicSource(src.name),
              priority: isAcademicSource(src.name) ? 3 : 5,
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
        addResult({
          source: lookup.source || 'Dictionary',
          definition: cleanedDef,
          isAcademic: isAcademicSource(lookup.source),
          priority: 4,
        });
      }
    }
  } catch (e) {
    // Ignore lookup errors
  }

  // 4. If has prefixes, ALSO try root lookup (adds more scholarly sources)
  if (structure.prefixes.length > 0 && structure.root.length >= 2) {
    // Check RASHI_VOCABULARY for the root
    if (RASHI_VOCABULARY[structure.root]) {
      addResult({
        source: 'Talmudic (root)',
        definition: RASHI_VOCABULARY[structure.root],
        isRoot: true,
        isAcademic: true,
        priority: 6,
      });
    }

    try {
      const rootLookup = lookupWordSync(structure.root);
      if (rootLookup?.sources) {
        for (const src of rootLookup.sources) {
          if (src.definition) {
            // CRITICAL: Use strictQuality to filter garbage definitions like "intermission", "daughter"
            const cleanedDef = cleanDefinition(src.definition, {
              maxLength: 120,
              removeReferences: true,
              removeHebrew: true,
              strictQuality: true,  // FIXED: Was missing, allowing garbage through
            });
            if (cleanedDef && cleanedDef.length > 2) {
              addResult({
                source: `${src.name || 'Dict'} (root)`,
                definition: cleanedDef,
                year: src.year,
                isRoot: true,
                isAcademic: isAcademicSource(src.name),
                priority: 7,
              });
            }
          }
        }
      }
    } catch (e) {
      // Ignore
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
 * Source badge with reliability
 */
const SourceBadge = ({ source, year, small = false }) => {
  const info = getSourceInfo(source);
  const reliability = RELIABILITY_TIERS[info?.reliability];

  return (
    <span
      className={`scholar-source ${small ? 'small' : ''} ${reliability?.level === 1 ? 'gold' : ''}`}
      style={{ backgroundColor: info?.color || '#6b7280' }}
      title={`${info?.fullName || source}${year ? ` (${year})` : ''}\n${info?.specialization || ''}`}
    >
      {reliability?.icon && <span className="rel-icon">{reliability.icon}</span>}
      {info?.name || source}
      {year && <span className="src-year">({year})</span>}
    </span>
  );
};

/**
 * Single glossary entry
 */
const GlossaryEntry = ({ word, data, expanded, onToggle }) => {
  const { results, isAbbrev, structure } = data;
  const hasMultiple = results.length > 1;
  const primary = results[0];

  // Sort by academic quality
  const sortedResults = [...results].sort((a, b) => {
    if (a.isAcademic && !b.isAcademic) return -1;
    if (!a.isAcademic && b.isAcademic) return 1;
    return 0;
  });

  const displayPrimary = sortedResults[0] || primary;

  if (!displayPrimary) {
    return (
      <div className="glossary-entry no-trans">
        <span className="gl-word" dir="rtl">{word}</span>
        <span className="gl-dash">—</span>
        <span className="gl-none">not in dictionary</span>
      </div>
    );
  }

  return (
    <div className={`glossary-entry ${expanded ? 'expanded' : ''} ${hasMultiple ? 'clickable' : ''}`}>
      <div className="gl-main" onClick={() => hasMultiple && onToggle()}>
        <span className="gl-word" dir="rtl">{word}</span>

        {isAbbrev && <span className="gl-tag abbrev">abbr</span>}

        {structure.prefixes.length > 0 && (
          <span className="gl-morph">
            {structure.prefixes.map(p => p.meaning).join('+')}+
          </span>
        )}

        <span className="gl-arrow">→</span>
        <span className="gl-def">{displayPrimary.definition}</span>

        <SourceBadge source={displayPrimary.source} year={displayPrimary.year} small />

        {hasMultiple && (
          <span className="gl-more" title="Click to see more sources">
            +{results.length - 1}
          </span>
        )}
      </div>

      {expanded && hasMultiple && (
        <div className="gl-alternatives">
          <div className="gl-alt-header">📖 All dictionary sources ({results.length}):</div>
          {sortedResults.slice(1).map((r, i) => (
            <div key={i} className={`gl-alt ${r.isAcademic ? 'academic' : ''}`}>
              <SourceBadge source={r.source} year={r.year} />
              {r.strongNumber && (
                <span className="gl-strong" title="Strong's Concordance Number">
                  {r.strongNumber}
                </span>
              )}
              <span className="gl-alt-def">{r.definition}</span>
              {r.isRoot && <span className="gl-root-tag">root</span>}
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

    for (const word of words) {
      const data = getAllDictionaryResults(word);
      entries.push({ word, data });

      if (data.results.length > 0) {
        translated++;
        for (const r of data.results) {
          sources[r.source] = (sources[r.source] || 0) + 1;
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
        <span className="scholar-title">📚 Dictionary-Based Glossary</span>
        <span className={`coverage-badge ${coverage >= 70 ? 'high' : coverage >= 40 ? 'med' : 'low'}`}>
          {coverage}% ({stats.translated}/{stats.total})
        </span>
      </div>

      {/* Sources used - sorted by reliability */}
      <div className="scholar-sources">
        <span className="sources-label">Sources:</span>
        {sources.map(({ name, count, isAcademic }) => (
          <span key={name} className={`source-with-count ${isAcademic ? 'academic' : ''}`}>
            <SourceBadge source={name} />
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

      <div className="scholar-tip">
        🥇 Academic sources: Jastrow (1903), BDB (1906), CAL • Click <strong>+N</strong> to compare definitions
      </div>

      {/* DEBUG: Visible debug output for specific words */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#ffffcc', fontSize: '11px', border: '1px solid #ccc' }}>
          <strong>DEBUG:</strong>
          <div>FUNCTION_WORDS type: {typeof FUNCTION_WORDS}</div>
          <div>FUNCTION_WORDS['משה']: {String(FUNCTION_WORDS?.['משה'])}</div>
          <div>FUNCTION_WORDS['ויעבירו']: {String(FUNCTION_WORDS?.['ויעבירו'])}</div>
          <div>lookupFunctionWord('משה'): {String(lookupFunctionWord('משה'))}</div>
          <div>lookupFunctionWord('ויעבירו'): {String(lookupFunctionWord('ויעבירו'))}</div>
          <div>Sample keys: {Object.keys(FUNCTION_WORDS || {}).slice(0, 10).join(', ')}</div>
        </div>
      )}
    </div>
  );
};

export default DictionaryTranslation;
