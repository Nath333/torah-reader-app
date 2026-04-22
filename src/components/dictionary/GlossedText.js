/**
 * GlossedText - Inline Word Glossing Component
 *
 * Displays Hebrew/Aramaic text with English translations directly beneath each word
 * using CSS ruby annotations for instant understanding.
 *
 * Features:
 * - Instant lookup using 42k+ local dictionary entries
 * - Word-level caching to avoid repeated lookups
 * - French translation support
 * - Keyboard navigation between words
 * - Source-based color coding
 */

import React, { useMemo, useCallback, useRef, useState } from 'react';
import { splitIntoWords } from '../../services/dictionaries/hebrewDictionary';
import { lookupWordSync, clearCaches as clearServiceCaches } from '../../services/unifiedLookupService';
import { useSettings } from '../../context/SettingsContext';
import {
  getSourceReliability,
  isAcademicLexicon,
  isLocalSource,
  formatSourceDisplay
} from '../../constants/dictionarySources';
import { lookupFunctionWord } from '../../constants/morphology';
import { preClassify } from '../../services/analysis/preClassificationService';
import { analyzeVerbGrammar, formatVerbGrammar, calculateConfidence } from '../../utils/morphologyAnalyzer';
import './GlossedText.css';

// Cache version - increment to force cache clear on code updates
// This ensures users get fresh lookups when filtering logic changes
// v3: Added function word priority lookup for correct translations
// v4: Added Aramaic verb patterns, emphatic state detection, Aphel conjugations
// v5: Fixed cleanGloss to remove trailing numbers (house4→house) and (b. h.) notation
// v6: Added verb grammar parsing (binyan, tense, person) and confidence scores
// v7: PRO SCHOLAR V6 - Extended FUNCTION_WORDS, daf reference detection, proper noun fixes
// v8: PRO SCHOLAR V4 - Fixed preClassify priority: ברישיה, והכנסה, משה, להו etc.
const CACHE_VERSION = 8;

// Global cache for word glosses (persists across renders)
const glossCache = new Map();
let cacheVersion = 0;

// Clear cache if version changed (new filtering logic deployed)
const ensureFreshCache = () => {
  if (cacheVersion !== CACHE_VERSION) {
    glossCache.clear();
    clearServiceCaches(); // Also clear service-level cache
    cacheVersion = CACHE_VERSION;
  }
};

/**
 * Truncate gloss to max length with ellipsis
 * Now using 40 chars to show more complete translations
 */
const truncateGloss = (text, maxLength = 40) => {
  if (!text || text.length <= maxLength) return text;
  // Try to truncate at word boundary
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > maxLength * 0.7) {
    return truncated.substring(0, lastSpace) + '…';
  }
  return truncated + '…';
};

/**
 * Clean and normalize a gloss for inline display
 * Removes dictionary artifacts and extracts the core meaning
 */
const cleanGloss = (gloss) => {
  if (!gloss) return null;

  let cleaned = gloss
    // Remove dictionary notation prefixes like "(b. h.)", "(Aram.)", "[lit.]" etc.
    .replace(/^\([^)]{1,15}\)\s*/g, '')
    .replace(/^\[[^\]]{1,15}\]\s*/g, '')
    // Remove dictionary notation ANYWHERE in string (b. h.), (Aram.), (coll.), etc.
    .replace(/\s*\([a-zA-Z.]{1,10}\)\s*/g, ' ')
    // Remove numbered definitions like "1) ", "1. ", "I. "
    .replace(/^[0-9IVXivx]+[.)]\s*/g, '')
    // Remove "m. " or "f. " gender markers at start
    .replace(/^[mfMF]\.\s*/g, '')
    // Remove "to " prefix for verbs (gloss should be the meaning itself)
    .replace(/^(to |a |an |the )/i, '')
    // Take first meaning only (before semicolon or comma with space)
    .replace(/[;,]\s.*/g, '')
    // Remove trailing numbers (footnote markers, Strong's numbers, etc.)
    // e.g., "house4" → "house", "outside2" → "outside"
    .replace(/[0-9]+$/, '')
    // Remove trailing punctuation and reference markers
    .replace(/[.:;,\s]+$/, '')
    // Clean up extra whitespace
    .replace(/\s+/g, ' ')
    .trim();

  // If after cleaning we have something too short or garbage, return null
  if (!cleaned || cleaned.length < 2) return null;

  return cleaned;
};

/**
 * Get gloss for a word using sync lookup with caching
 * Enhanced: Returns multiple sources with reliability tiers for PRO SCHOLAR display
 *
 * PRO SCHOLAR v2: Now accepts contextMode for source prioritization
 * PRO SCHOLAR v2.1: Now accepts reference for auto-context detection
 * @param {string} word - Hebrew/Aramaic word
 * @param {boolean} showFrench - Whether to show French translation
 * @param {string} contextMode - 'talmudic', 'biblical', or 'mixed' (default)
 * @param {string} reference - Sefaria-style reference for auto-context (e.g., "Shabbat 2a")
 */
const getWordGloss = (word, showFrench = false, contextMode = null, reference = null) => {
  // Ensure cache is fresh (clear if filtering logic was updated)
  ensureFreshCache();

  // Check cache first - include contextMode AND reference in cache key for context-specific results
  // Reference is hashed to keep cache key short but unique
  const refKey = reference ? reference.substring(0, 20) : 'none';
  const cacheKey = `${word}:${showFrench ? 'fr' : 'en'}:${contextMode || 'auto'}:${refKey}`;
  if (glossCache.has(cacheKey)) {
    return glossCache.get(cacheKey);
  }

  // PRO SCHOLAR V8: Declare outside try block so catch can access it
  let functionWordSource = null;

  try {
    // === PRO SCHOLAR V8: Check function words + continue to dictionary ===
    // Save function word result but DON'T return early
    // This allows combining curated vocab with academic dictionary sources
    const functionGloss = lookupFunctionWord(word);
    if (functionGloss) {
      functionWordSource = {
        gloss: functionGloss,
        source: 'Rabbinic',
        sources: [{ name: 'Rabbinic', fullName: 'Curated Rabbinic Vocabulary', definition: functionGloss }],
        sourceCount: 1,
        tier: 'bronze', // V8: Downgraded - academic sources get priority
        reliability: { level: 3, name: 'Rabbinic' },
        root: null,
        headword: word,
        isAramaic: false,
        grammar: null,
        confidence: { score: 90, level: 'high', emoji: '✓', factors: ['Curated function word'] }
      };
      // DON'T return - continue to dictionary lookup
    }

    // === PRIORITY 1.5: Pre-classification for proper nouns, abbreviations, daf references ===
    // PRO SCHOLAR V6: Check for משה=Moses, רה"י=private domain, צו:=daf 96b BEFORE dictionary
    // IMPORTANT: Pass ORIGINAL word for daf detection (needs :/) then cleaned for other checks
    const preClassResult = preClassify(word, { textType: 'talmudic' });
    if (preClassResult && preClassResult.skipDictionary) {
      const definition = preClassResult.english || preClassResult.meaning;
      if (definition) {
        const glossData = {
          gloss: definition,
          source: preClassResult.source || 'Pre-Classification',
          sources: [{
            name: preClassResult.source || preClassResult.type,
            fullName: preClassResult.source || `${preClassResult.type} (${preClassResult.subtype || 'detected'})`,
            definition: definition
          }],
          sourceCount: 1,
          tier: 'gold',
          reliability: { level: 1, name: preClassResult.source || 'Pre-Classification' },
          root: null,
          headword: word,
          isAramaic: preClassResult.type === 'aramaic_particle',
          grammar: null,
          confidence: { score: 100, level: 'high', emoji: '✓', factors: [`${preClassResult.type}: ${definition}`] },
          preClassified: true,
          preClassType: preClassResult.type
        };
        glossCache.set(cacheKey, glossData);
        return glossData;
      }
    }

    // === PRIORITY 2: Full dictionary lookup ===
    // PRO SCHOLAR v2.1: Pass contextMode AND reference for auto-context detection
    // Reference-based detection is more accurate (e.g., "Rashi on Shabbat" vs "Rashi on Genesis")
    const result = lookupWordSync(word, { contextMode, reference });
    if (result) {
      const gloss = showFrench && result.french
        ? cleanGloss(result.french)
        : cleanGloss(result.english);

      // Get source reliability for primary source
      const reliability = getSourceReliability(result.source);

      // Count unique sources (PRO SCHOLAR feature)
      const sourceCount = result.sources?.length || (result.source ? 1 : 0);

      // Get primary source tier (gold, silver, bronze, basic)
      const tier = reliability?.level === 1 ? 'gold'
                 : reliability?.level === 2 ? 'silver'
                 : reliability?.level === 3 ? 'bronze'
                 : 'basic';

      // PRO SCHOLAR v3: Analyze verb grammar (binyan, tense, person)
      const verbAnalysis = analyzeVerbGrammar(word, result);
      const grammar = verbAnalysis ? formatVerbGrammar(verbAnalysis) : null;

      // PRO SCHOLAR v3: Calculate confidence score
      const confidence = calculateConfidence(result);

      // PRO SCHOLAR V7: Determine match type for confidence calculation
      const matchType = result._matchType || (result.root ? 'ROOT_DERIVED' : 'EXACT');

      const glossData = {
        gloss: gloss || null,
        source: result.source || 'unknown',
        sources: result.sources || [],
        sourceCount,
        tier,
        reliability,
        root: result.root || null,
        headword: result.headword || null,
        isAramaic: result.isAramaic || result.language === 'Aramaic',
        // PRO SCHOLAR v3: Grammar and confidence
        grammar,
        confidence,
        // PRO SCHOLAR V7: Match type for scholarly display
        matchType
      };

      // === PRO SCHOLAR V8: Merge function word source if available ===
      // Add curated source alongside academic sources (don't override)
      if (functionWordSource && !glossData.sources?.some(s => s.name === 'Rabbinic')) {
        glossData.sources = [...(glossData.sources || []), ...functionWordSource.sources];
        glossData.sourceCount = glossData.sources.length;
      }

      // Cache the result
      glossCache.set(cacheKey, glossData);
      return glossData;
    }

    // === PRO SCHOLAR V8: Use function word source as fallback ===
    // If dictionary lookup found nothing, use our curated translation
    if (functionWordSource) {
      glossCache.set(cacheKey, functionWordSource);
      return functionWordSource;
    }
  } catch (e) {
    // Ignore lookup errors - but still return function word if available
    if (functionWordSource) {
      glossCache.set(cacheKey, functionWordSource);
      return functionWordSource;
    }
  }

  const emptyResult = {
    gloss: null,
    source: null,
    sources: [],
    sourceCount: 0,
    tier: null,
    reliability: null,
    root: null,
    headword: null,
    isAramaic: false,
    grammar: null,
    confidence: null
  };
  glossCache.set(cacheKey, emptyResult);
  return emptyResult;
};

/**
 * TEXT SOURCE TYPES for context-aware dictionary lookup
 * PRO SCHOLAR: Knowing the text source lets us pick the RIGHT dictionary
 * - Gemara/Rashi → Use Jastrow (Talmud specialist), SKIP Strong's
 * - Torah/Tanakh → Use BDB/Strong's (Biblical Hebrew specialists)
 */
export const TEXT_SOURCES = {
  GEMARA: 'gemara',       // Talmud Bavli - Aramaic/Mishnaic Hebrew
  MISHNAH: 'mishnah',     // Mishnah - Mishnaic Hebrew
  RASHI: 'rashi',         // Rashi commentary - Talmudic vocabulary
  TOSAFOT: 'tosafot',     // Tosafot - Talmudic vocabulary
  TORAH: 'torah',         // Chumash - Biblical Hebrew
  TANAKH: 'tanakh',       // Nach - Biblical Hebrew
  TARGUM: 'targum',       // Targum Onkelos - Aramaic
  MIDRASH: 'midrash',     // Midrash - Mixed
  UNKNOWN: 'unknown',     // Unknown - use auto-detection
};

/**
 * Map text source to dictionary context mode
 * This tells the lookup system which dictionaries to prioritize/skip
 */
const getContextFromSource = (textSource) => {
  switch (textSource) {
    // Talmudic sources - Jastrow is gold, SKIP Strong's
    case TEXT_SOURCES.GEMARA:
    case TEXT_SOURCES.MISHNAH:
    case TEXT_SOURCES.RASHI:
    case TEXT_SOURCES.TOSAFOT:
    case TEXT_SOURCES.TARGUM:
      return 'talmudic';

    // Biblical sources - BDB/Strong's are gold
    case TEXT_SOURCES.TORAH:
    case TEXT_SOURCES.TANAKH:
      return 'biblical';

    // Mixed sources - use both
    case TEXT_SOURCES.MIDRASH:
    default:
      return 'mixed';
  }
};

/**
 * GlossedText Component
 *
 * @param {string} text - Hebrew/Aramaic text to gloss
 * @param {string} language - 'hebrew' or 'aramaic' (default: 'hebrew')
 * @param {string} textSource - Source type: 'gemara', 'rashi', 'torah', etc. (default: 'unknown')
 * @param {string} reference - Sefaria-style reference for auto-context detection (e.g., "Shabbat 2a", "Genesis 1:1")
 * @param {boolean} showGlosses - Whether to display glosses (default: true)
 * @param {boolean} showRoots - Whether to show roots on hover (default: false)
 * @param {function} onWordClick - Callback when word is clicked
 * @param {string} className - Additional CSS class
 */
const GlossedText = ({
  text,
  language = 'hebrew',
  textSource = TEXT_SOURCES.UNKNOWN,
  reference = null,
  showGlosses = true,
  showRoots = false,
  onWordClick,
  className = ''
}) => {
  // PRO SCHOLAR v2.1: Determine context from text source OR reference
  // Reference takes priority for more accurate context detection
  // e.g., "Rashi on Shabbat 2a" → talmudic, "Rashi on Genesis 1:1" → biblical
  const contextMode = getContextFromSource(textSource);
  const { showFrench } = useSettings();
  const containerRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  // Split text into words
  const words = useMemo(() => {
    if (!text) return [];
    return splitIntoWords(text);
  }, [text]);

  // Pre-compute glosses for all words (memoized with cache)
  // Enhanced: Includes source count and reliability tier for PRO SCHOLAR display
  // PRO SCHOLAR v2.1: Uses contextMode AND reference for source prioritization
  const glossedWords = useMemo(() => {
    // Use a local dedup map for this text block
    const seenWords = new Map();

    return words.map(word => {
      // Check if we've already looked up this exact word in this text
      if (seenWords.has(word)) {
        return { ...seenWords.get(word) };
      }

      // PRO SCHOLAR v2.1: Pass contextMode AND reference to use correct dictionaries
      // Reference provides more accurate context detection:
      // - "Rashi on Shabbat 2a" → talmudic context
      // - "Rashi on Genesis 1:1" → biblical context
      const glossResult = getWordGloss(word, showFrench, contextMode, reference);
      const {
        gloss, source, sources, sourceCount, tier, reliability, root, headword, isAramaic,
        grammar, confidence, matchType
      } = glossResult;

      // PRO SCHOLAR V7: Scholarly source classification
      const sourceDisplay = formatSourceDisplay(source, {
        matchType: matchType || 'EXACT',
        root: root,
        confidence: confidence
      });

      const wordData = {
        word,
        gloss: gloss ? truncateGloss(gloss) : null,
        fullGloss: gloss,
        source,
        sources,
        sourceCount,
        tier,
        reliability,
        root,
        headword,
        isAramaic,
        // PRO SCHOLAR v3: Verb grammar and confidence
        grammar,
        confidence,
        // PRO SCHOLAR V7: Scholarly classification
        sourceDisplay,
        isLexicon: isAcademicLexicon(source),
        isLocal: isLocalSource(source),
        matchType: matchType || 'EXACT'
      };

      seenWords.set(word, wordData);
      return wordData;
    });
  }, [words, showFrench, contextMode, reference]);

  // Track word being looked up for visual feedback
  const [lookingUpIndex, setLookingUpIndex] = useState(-1);

  // Handle word click
  const handleWordClick = useCallback((word, index, e) => {
    e.preventDefault();
    setActiveIndex(index);

    // Add visual feedback - show pulse animation
    setLookingUpIndex(index);
    setTimeout(() => setLookingUpIndex(-1), 600);

    if (onWordClick) {
      onWordClick(word);
    }
  }, [onWordClick]);

  // Handle keyboard navigation (arrow keys + enter)
  const handleKeyDown = useCallback((word, index, e) => {
    const wordElements = containerRef.current?.querySelectorAll('.glossed-word');
    if (!wordElements) return;

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        setActiveIndex(index);
        if (onWordClick) {
          onWordClick(word);
        }
        break;

      case 'ArrowLeft':
        // RTL: Left moves forward
        e.preventDefault();
        if (index < wordElements.length - 1) {
          setActiveIndex(index + 1);
          wordElements[index + 1]?.focus();
        }
        break;

      case 'ArrowRight':
        // RTL: Right moves backward
        e.preventDefault();
        if (index > 0) {
          setActiveIndex(index - 1);
          wordElements[index - 1]?.focus();
        }
        break;

      case 'Escape':
        e.preventDefault();
        setActiveIndex(-1);
        break;

      default:
        break;
    }
  }, [onWordClick]);

  if (!text || words.length === 0) {
    return null;
  }

  // Calculate stats for display (PRO SCHOLAR V7 enhanced)
  const glossedCount = glossedWords.filter(w => w.gloss).length;
  const totalCount = glossedWords.length;
  const coverage = Math.round((glossedCount / totalCount) * 100);

  // PRO SCHOLAR V7: Count by source type (academic lexicon vs local curated)
  const lexiconCount = glossedWords.filter(w => w.isLexicon && w.gloss).length;
  const localCount = glossedWords.filter(w => w.isLocal && w.gloss).length;
  const rootDerivedCount = glossedWords.filter(w => w.matchType === 'ROOT_DERIVED' && w.gloss).length;
  const multiSourceCount = glossedWords.filter(w => w.sourceCount > 1).length;

  return (
    <div className={`glossed-text-wrapper ${language}`}>
      <div
        ref={containerRef}
        className={`glossed-text ${language} ${className}`}
        role="group"
        aria-label="Glossed Hebrew text"
      >
        {glossedWords.map(({ word, gloss, fullGloss, source, sources, sourceCount, tier, root, isAramaic, grammar, confidence, sourceDisplay, isLexicon, isLocal, matchType }, index) => {
          // PRO SCHOLAR V7: Build scholarly tooltip
          const sourceInfo = sourceDisplay?.isAcademic
            ? `📚 ${sourceDisplay.display}`
            : sourceDisplay?.isLocal
            ? `📝 ${sourceDisplay.name} [local]`
            : source;

          const derivationInfo = root && matchType !== 'EXACT'
            ? `\n🔤 Root: ${root} (${matchType === 'ROOT_DERIVED' ? 'derived' : matchType})`
            : root ? `\n🔤 Root: ${root}` : '';

          const sourceList = sources?.length > 0
            ? sources.map(s => `${s.name}: ${s.definition?.substring(0, 60) || '...'}`).join('\n')
            : fullGloss || '';

          // PRO SCHOLAR V7: Build grammar info for tooltip
          const grammarInfo = grammar ? `\n\n📖 Grammar:\n${grammar.summary}` : '';
          const confidenceInfo = confidence ? `\n${confidence.emoji} ${confidence.score}% confident` : '';

          const tooltip = fullGloss
            ? `${word}: ${fullGloss}${derivationInfo}\n\nSource: ${sourceInfo}${grammarInfo}${confidenceInfo}${sourceCount > 1 ? `\n\n📚 ${sourceCount} sources:\n${sourceList}` : ''}`
            : word;

          // PRO SCHOLAR V7: Source type class
          const sourceTypeClass = isLexicon ? 'source-lexicon' : isLocal ? 'source-local' : '';
          const confidenceClass = confidence?.level ? `confidence-${confidence.level}` : '';

          return (
            <ruby
              key={`${word}-${index}`}
              className={`glossed-word ${gloss ? 'has-gloss' : 'no-gloss'} ${activeIndex === index ? 'active' : ''} ${lookingUpIndex === index ? 'looking-up' : ''} ${tier ? `tier-${tier}` : ''} ${isAramaic ? 'aramaic' : ''} ${confidenceClass} ${sourceTypeClass} ${grammar ? 'has-grammar' : ''}`}
              data-source={source}
              data-source-type={isLexicon ? 'lexicon' : isLocal ? 'local' : 'unknown'}
              data-match-type={matchType}
              data-tier={tier}
              data-sources={sourceCount}
              data-root={root}
              data-confidence={confidence?.score}
              data-grammar={grammar?.summary}
              title={tooltip}
              onClick={(e) => handleWordClick(word, index, e)}
              onKeyDown={(e) => handleKeyDown(word, index, e)}
              tabIndex={0}
              role="button"
              aria-label={`${word}${gloss ? `: ${gloss}` : ''}${confidence ? ` (${confidence.score}% confident)` : ''}${sourceCount > 1 ? ` (${sourceCount} sources)` : ''}`}
            >
              {word}
              <rp>(</rp>
              <rt className={!gloss ? 'empty' : ''}>
                {showGlosses ? (gloss || '·') : ''}
                {showRoots && root && <span className="root-indicator">{root}</span>}
                {/* PRO SCHOLAR: Show source count badge for multi-source words */}
                {sourceCount > 1 && gloss && (
                  <span className="source-count-badge" title={`${sourceCount} scholarly sources`}>
                    {sourceCount}
                  </span>
                )}
                {/* PRO SCHOLAR v3: Confidence indicator */}
                {confidence && gloss && confidence.level !== 'high' && (
                  <span className={`confidence-badge confidence-${confidence.level}`} title={`${confidence.score}% - ${confidence.factors.join(', ')}`}>
                    {confidence.emoji}
                  </span>
                )}
                {/* PRO SCHOLAR v3: Grammar indicator (verb) */}
                {grammar && (
                  <span className="grammar-indicator" title={grammar.summary}>
                    פ
                  </span>
                )}
              </rt>
              <rp>)</rp>
            </ruby>
          );
        })}
      </div>
      <div className="glossed-stats">
        {/* Visual progress bar */}
        <div className="glossed-progress-bar" title={`${coverage}% of words have translations`}>
          <div
            className="glossed-progress-fill"
            style={{ width: `${coverage}%` }}
          />
        </div>

        {/* Stats row */}
        <div className="glossed-stats-row">
          <div className="glossed-stats-left">
            <span className="stat-coverage">
              <span className="coverage-icon">✓</span>
              {coverage}%
            </span>
            <span className="stat-count">{glossedCount}/{totalCount} words</span>
          </div>

          <div className="glossed-stats-right">
            {/* PRO SCHOLAR V7: Show source type breakdown */}
            {lexiconCount > 0 && (
              <span className="stat-lexicon" title={`${lexiconCount} words from academic lexicons (Jastrow, BDB, etc.)`}>
                📚 {lexiconCount}
              </span>
            )}
            {localCount > 0 && (
              <span className="stat-local" title={`${localCount} words from curated vocabulary [local]`}>
                📝 {localCount}
              </span>
            )}
            {rootDerivedCount > 0 && (
              <span className="stat-derived" title={`${rootDerivedCount} words derived from root analysis`}>
                🔤 {rootDerivedCount}
              </span>
            )}
            {multiSourceCount > 0 && (
              <span className="stat-multi-source" title={`${multiSourceCount} words have multiple sources`}>
                +{multiSourceCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Export cache clearing function for testing/refresh
export const clearGlossCache = () => glossCache.clear();

export default GlossedText;
