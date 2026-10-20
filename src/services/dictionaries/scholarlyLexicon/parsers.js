// =============================================================================
// Parsing des entrées de lexique — filtrage headword, tri par source, sens
// (extrait de scholarlyLexiconService.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

import { createLogger } from '../../../utils/debug';
import { cleanWord } from './rootUtils';
import { cleanDefinitionText, extractJastrowMeaning } from './textCleaning';

const log = createLogger('ScholarlyLexicon');

/**
 * SMART headword filtering - algorithmic string matching
 * Uses normalized edit distance with position-aware scoring
 * Added error handling and length limits for safety
 */
export const filterByHeadwordMatch = (data, searchedWord) => {
  // Defensive checks
  if (!data || !Array.isArray(data) || !searchedWord) return data || [];

  try {
    const search = cleanWord(searchedWord);
    if (!search) return data;

// Limit word length to prevent memory issues with large strings
    const MAX_WORD_LENGTH = 50;

    // Levenshtein distance with length limit
    const editDist = (a, b) => {
      // Safety: limit input length to prevent memory overflow
      if (a.length > MAX_WORD_LENGTH || b.length > MAX_WORD_LENGTH) {
        return Math.abs(a.length - b.length); // Fallback to simple length difference
      }
      const m = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
      for (let i = 0; i <= a.length; i++) m[0][i] = i;
      for (let j = 0; j <= b.length; j++) m[j][0] = j;
      for (let j = 1; j <= b.length; j++) {
        for (let i = 1; i <= a.length; i++) {
          m[j][i] = Math.min(m[j][i-1] + 1, m[j-1][i] + 1, m[j-1][i-1] + (a[i-1] === b[j-1] ? 0 : 1));
        }
      }
      return m[b.length][a.length];
    };

  // Longest Common Subsequence length
  const lcsLength = (a, b) => {
    const m = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(0));
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        m[j][i] = a[i-1] === b[j-1] ? m[j-1][i-1] + 1 : Math.max(m[j][i-1], m[j-1][i]);
      }
    }
    return m[b.length][a.length];
  };

  // Score each entry
  const scored = data.map(entry => {
    const head = cleanWord(entry.headword || entry.word || entry.term || '');
    if (!head) return { entry, score: 0 };

    // Perfect match
    if (head === search) return { entry, score: 1, head };

    const maxLen = Math.max(search.length, head.length);
    const minLen = Math.min(search.length, head.length);

    // Core metrics
    const dist = editDist(search, head);
    const lcs = lcsLength(search, head);

    // Normalized scores (0-1)
    const editSim = 1 - dist / maxLen;           // How few edits needed?
    const lcsRatio = lcs / maxLen;               // How much sequence preserved?
    const lenRatio = minLen / maxLen;            // How similar in length?

    // Combined score with emphasis on LCS (preserves character order)
    let score = (editSim * 0.35) + (lcsRatio * 0.45) + (lenRatio * 0.2);

    // Penalize when search is longer and head is strict prefix
    // (search has extra chars that might be meaningful root letters)
    if (search.startsWith(head) && head.length < search.length) {
      const extraRatio = (search.length - head.length) / search.length;
      score *= (1 - extraRatio * 0.8); // Strong penalty for prefix matches
    }

    return { entry, score, head };
  });

  // Sort by score
  scored.sort((a, b) => b.score - a.score);

  // Dynamic threshold: 70% of best score, minimum 0.5
  const maxScore = scored[0]?.score || 0;
  const threshold = Math.max(0.6, maxScore * 0.75);

  return scored.filter(s => s.score >= threshold).map(s => s.entry);
  } catch (err) {
// Graceful fallback on any matching error
    log.debug('[HeadwordFilter] Matching failed, returning unfiltered:', err?.message);
    return data || [];
  }
};

/**
 * Parse lexicon entries by source
 * Handles all Sefaria lexicon naming conventions
 */
export const parseBySource = (data, searchedWord = null) => {
  if (!data || !Array.isArray(data)) {
    return { bdb: [], jastrow: [], strong: [], klein: [], steinsaltz: [], sefaria: [], halot: [], gesenius: [], twot: [], djba: [], djpa: [], other: [] };
  }

  // Clean the searched word for validation
  const cleanedSearch = searchedWord ? cleanWord(searchedWord) : null;
  const searchLen = cleanedSearch ? cleanedSearch.length : 0;

  // Filter entries to prefer exact headword matches
  const filteredData = searchedWord ? filterByHeadwordMatch(data, searchedWord) : data;

  /**
   * Algorithmic headword validation using LCS similarity
   */
  const isValidHeadwordMatch = (entry) => {
    if (!cleanedSearch || searchLen < 2) return true;

    // Extract headword from entry
    let head = cleanWord(entry.headword || entry.word || entry.term || entry.form || '');

    // Try content if no headword
    if (!head && entry.content) {
      const str = typeof entry.content === 'string' ? entry.content : JSON.stringify(entry.content);
      const match = str.match(/[\u05D0-\u05EA]{2,}/);
      if (match) head = cleanWord(match[0]);
    }

    if (!head) return false; // No headword = reject

    if (head === cleanedSearch) return true; // Exact match

    // LCS-based similarity check
    const lcs = (a, b) => {
      const m = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(0));
      for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
          m[j][i] = a[i-1] === b[j-1] ? m[j-1][i-1] + 1 : Math.max(m[j][i-1], m[j-1][i]);
        }
      }
      return m[b.length][a.length];
    };

    const maxLen = Math.max(searchLen, head.length);
    const lcsRatio = lcs(cleanedSearch, head) / maxLen;
    const lenRatio = Math.min(searchLen, head.length) / maxLen;

    // Combined similarity score
    let score = (lcsRatio * 0.6) + (lenRatio * 0.4);

    // Penalize if search is longer and head is prefix (stronger penalty)
    if (cleanedSearch.startsWith(head) && head.length < searchLen) {
      score *= (1 - ((searchLen - head.length) / searchLen) * 0.8);
    }

    return score >= 0.6; // Minimum 60% similarity required
  };

  const bySource = {
    bdb: [],
    jastrow: [],
    strong: [],
    klein: [],
    kleinRelated: [], // Related words for Klein (looser filter) - scholarly transparency
    steinsaltz: [],
    sefaria: [],
    halot: [],
    gesenius: [],
    twot: [],
    djba: [],
    djpa: [],
    other: []
  };

  // FIRST PASS: Categorize unfiltered Klein entries for "related word" feature
  // This allows us to show Klein entries even when they're for similar but different words
  for (const entry of data) {
    const lexicon = (entry.parent_lexicon || '').toLowerCase();
    if (lexicon.includes('klein') || lexicon.includes('etymolog')) {
      bySource.kleinRelated.push(entry);
    }
  }

  for (const entry of filteredData) {
    // CRITICAL: Skip entries with mismatched headwords
    if (!isValidHeadwordMatch(entry)) {
      continue; // Skip this entry - wrong word!
    }

    const lexicon = (entry.parent_lexicon || '').toLowerCase();
    let matched = false;

    // Handle combined sources first (e.g., "BDB Augmented Strong")
    // These should be added to MULTIPLE categories

    // Check for Strong's number - if present, always add to Strong's
    if (lexicon.includes('strong') || entry.strong_number) {
      bySource.strong.push(entry);
      matched = true;
    }

    // BDB - Brown-Driver-Briggs (various naming formats)
    if (lexicon.includes('bdb') || lexicon.includes('brown') ||
        lexicon.includes('driver') || lexicon.includes('briggs') ||
        lexicon.includes('hebrew and english lexicon') ||
        lexicon.includes('augmented')) {
      bySource.bdb.push(entry);
      matched = true;
    }

    // Jastrow - Aramaic/Talmudic dictionary
    if (lexicon.includes('jastrow')) {
      bySource.jastrow.push(entry);
      matched = true;
    }

    // Klein's Etymological Dictionary
    if (lexicon.includes('klein') || lexicon.includes('etymolog')) {
      bySource.klein.push(entry);
      matched = true;
    }

    // Steinsaltz - Modern Talmud translation
    if (lexicon.includes('steinsaltz') || lexicon.includes('koren')) {
      bySource.steinsaltz.push(entry);
      matched = true;
    }

    // HALOT - Hebrew and Aramaic Lexicon of the Old Testament
    if (lexicon.includes('halot') || lexicon.includes('hebrew and aramaic lexicon')) {
      bySource.halot.push(entry);
      matched = true;
    }

    // Gesenius - Hebrew Grammar and Lexicon
    if (lexicon.includes('gesenius') || lexicon.includes('gkc')) {
      bySource.gesenius.push(entry);
      matched = true;
    }

    // TWOT - Theological Wordbook of the Old Testament
    if (lexicon.includes('twot') || lexicon.includes('theological wordbook')) {
      bySource.twot.push(entry);
      matched = true;
    }

    // DJBA - Sokoloff, Dictionary of Jewish Babylonian Aramaic (Talmud Bavli)
    if (lexicon.includes('djba') ||
        lexicon.includes('jewish babylonian aramaic') ||
        (lexicon.includes('sokoloff') && lexicon.includes('babylonian'))) {
      bySource.djba.push(entry);
      matched = true;
    }

    // DJPA - Sokoloff, Dictionary of Jewish Palestinian Aramaic (Talmud Yerushalmi, Midrash)
    if (lexicon.includes('djpa') ||
        lexicon.includes('jewish palestinian aramaic') ||
        (lexicon.includes('sokoloff') && lexicon.includes('palestinian'))) {
      bySource.djpa.push(entry);
      matched = true;
    }

    // Sefaria's own lexicon
    if (lexicon.includes('sefaria')) {
      bySource.sefaria.push(entry);
      matched = true;
    }

    // Targum/Talmud/Midrash sources (likely Aramaic) - add to Jastrow if not already there
    if (!matched && (lexicon.includes('targum') || lexicon.includes('talmud') || lexicon.includes('midrash'))) {
      bySource.jastrow.push(entry);
      matched = true;
    }

    // Other sources - fallback
    if (!matched) {
      bySource.other.push(entry);
    }
  }

  return bySource;
};

/**
 * Prioritize and FILTER Jastrow entries based on alignment with BDB definitions
 * When multiple Jastrow entries exist (e.g., ברא = "create" vs "son" vs "outside"),
 * ONLY return entries whose definitions align with BDB, filtering out homographs
 * @param {Array} jastrowEntries - All Jastrow entries
 * @param {Array} bdbEntries - BDB entries for cross-reference
 * @returns {Array} - Filtered Jastrow entries matching BDB meaning
 */
export const prioritizeJastrowEntries = (jastrowEntries, bdbEntries) => {
  if (!jastrowEntries || jastrowEntries.length <= 1) return jastrowEntries;
  if (!bdbEntries || bdbEntries.length === 0) return jastrowEntries;

  // Extract BDB definition keywords for matching (key semantic words)
  const bdbKeywords = new Set();
  const bdbRoots = new Set(); // Root concepts like "create", "make", "form"
  for (const entry of bdbEntries) {
    const defs = extractDefinitions(entry, false);
    for (const def of defs) {
      if (def.text) {
        const text = def.text.toLowerCase();
        // Extract significant words (3+ letters, not common words)
        const words = text.split(/\s+/);
        for (const word of words) {
          const cleaned = word.replace(/[^a-z]/g, '');
          if (cleaned.length >= 3 && !['the', 'and', 'for', 'with', 'from', 'that', 'this'].includes(cleaned)) {
            bdbKeywords.add(cleaned);
            // Extract root forms (remove -ing, -ed, -s, etc.)
            const root = cleaned.replace(/(ing|ed|es|s|ly|tion|ness)$/, '');
            if (root.length >= 3) bdbRoots.add(root);
          }
        }
      }
    }
  }

  if (bdbKeywords.size === 0) return jastrowEntries;

  // Score each Jastrow entry based on keyword matches with BDB
  const scored = jastrowEntries.map(entry => {
    const defs = extractDefinitions(entry, true);
    let score = 0;
    let hasDirectMatch = false;

    for (const def of defs) {
      if (def.text) {
        const text = def.text.toLowerCase();
        const words = text.split(/\s+/);
        for (const word of words) {
          const cleaned = word.replace(/[^a-z]/g, '');
          // Direct keyword match
          if (bdbKeywords.has(cleaned)) {
            score += 15;
            hasDirectMatch = true;
          }
          // Root match (create/creation, form/forming)
          const root = cleaned.replace(/(ing|ed|es|s|ly|tion|ness)$/, '');
          if (root.length >= 3 && bdbRoots.has(root)) {
            score += 12;
            hasDirectMatch = true;
          }
          // Partial match
          for (const keyword of bdbKeywords) {
            if (cleaned.length >= 4 && keyword.length >= 4) {
              if (cleaned.startsWith(keyword.slice(0, 4)) || keyword.startsWith(cleaned.slice(0, 4))) {
                score += 5;
              }
            }
          }
        }
      }
    }
    return { entry, score, hasDirectMatch };
  });

  // FILTER: Only keep entries with keyword matches (score > 0)
  // This removes homographs like "son" when BDB says "create"
  const matched = scored.filter(s => s.score > 0 && s.hasDirectMatch);

  // If we have matches, use them; otherwise fall back to all entries
  const filtered = matched.length > 0 ? matched : scored;

  // Sort by score (highest first)
  filtered.sort((a, b) => b.score - a.score);

  return filtered.map(s => s.entry);
};

/**
 * Extract numbered definition senses from BDB-style definitions
 * Parses patterns like "1) meaning 2) meaning" or "1. meaning 2. meaning"
 * Also extracts semantic categories from parenthetical notes
 * @param {string} text - Raw definition text
 * @returns {Array<object>} - Array of { senseNum, text, semanticField }
 */
export const parseNumberedSenses = (text) => {
  if (!text || typeof text !== 'string') return [];

  const senses = [];
  // Match patterns: "1)" "1." "1:" or "(1)" followed by text
  const sensePattern = /(?:^|\s)(?:\(?\d+[.):\]]\)?)\s*([^0-9(][^)]+?)(?=(?:\s+\(?\d+[.):\]]\)?|$))/gi;

  // Also try to detect semantic categories in parentheses: "(of God)" "(literal)" etc.
  const semanticPattern = /\(([^)]{2,30})\)/g;

  let match;
  let senseNum = 1;

  // Try numbered pattern first
  const text2 = ' ' + text; // Ensure patterns at start match
  while ((match = sensePattern.exec(text2)) !== null) {
    let senseText = cleanDefinitionText(match[1]);
    if (senseText && senseText.length >= 2) {
      // Extract semantic field from parenthetical notes
      let semanticField = null;
      const semMatch = senseText.match(semanticPattern);
      if (semMatch) {
        const potential = semMatch[0].slice(1, -1).toLowerCase();
        // Check if it's a semantic category (not a reference)
        const semanticKeywords = ['lit', 'fig', 'of god', 'divine', 'human', 'physical', 'moral',
          'abstract', 'concrete', 'transitive', 'intransitive', 'causative', 'reflexive'];
        if (semanticKeywords.some(k => potential.includes(k))) {
          semanticField = potential;
        }
      }

      senses.push({
        senseNum: senseNum++,
        text: senseText,
        semanticField: semanticField
      });
    }
  }

  // If no numbered senses found, try splitting by semicolon for multiple meanings
  if (senses.length === 0) {
    const parts = text.split(/;\s*/);
    for (const part of parts) {
      const cleaned = cleanDefinitionText(part);
      if (cleaned && cleaned.length >= 2) {
        senses.push({
          senseNum: senseNum++,
          text: cleaned,
          semanticField: null
        });
      }
    }
  }

  return senses;
};

/**
 * Extract definitions from entry content
 * Handles all Sefaria lexicon entry formats
 * Cleans HTML and scholarly notation from all definitions
 * Uses special extraction for Jastrow entries
 * Enhanced with numbered sense extraction for scholarly display
 * @param {object} entry - Lexicon entry
 * @param {boolean} isJastrow - Whether this is a Jastrow entry (requires special handling)
 */
export const extractDefinitions = (entry, isJastrow = false) => {
  const definitions = [];

  if (!entry) return definitions;

  // Track sense numbers for BDB-style enumeration
  let globalSenseNum = 1;

  /**
   * Add a definition if it's valid and not a duplicate
   */
  const addDefinition = (text, extras = {}) => {
    // Use special Jastrow extraction for Jastrow entries
    const cleaned = isJastrow ? extractJastrowMeaning(text) : cleanDefinitionText(text);
    if (!cleaned || cleaned.length < 2) return;
    // Skip if it's just grammatical markers
    if (/^(?:[mfn]\.|ch\.|adj\.|v\.)$/i.test(cleaned)) return;
    // Skip if already exists (check first 40 chars for dedup)
    const normalized = cleaned.toLowerCase().slice(0, 40);
    if (definitions.find(d => d.text.toLowerCase().slice(0, 40) === normalized)) return;

    // Assign sense number if not provided
    const senseNum = extras.senseNum || globalSenseNum++;

    definitions.push({
      text: cleaned,
      senseNum,
      ...extras
    });
  };

  // First check for short_definition (quick summary) - often the cleanest
  if (entry.short_definition) {
    const shortDef = cleanDefinitionText(entry.short_definition);
    if (shortDef && shortDef.length >= 3) {
      definitions.push({ text: shortDef, isShort: true, senseNum: 0 }); // 0 = summary
    }
  }

  // Handle structured content with senses (BDB Augmented Strong format)
  if (entry.content?.senses) {
    let senseIdx = 1;
    for (const sense of entry.content.senses) {
      if (sense.definition) {
        addDefinition(sense.definition, {
          senseNum: senseIdx,
          grammar: sense.grammar || null,
          notes: sense.notes || null,
          semanticField: sense.semantic_field || sense.category || null
        });
        senseIdx++;
      }
      // Nested senses (e.g., 1a, 1b)
      if (sense.senses) {
        let subIdx = 0;
        for (const subSense of sense.senses) {
          if (subSense.definition) {
            const subLabel = String.fromCharCode(97 + subIdx); // a, b, c...
            addDefinition(subSense.definition, {
              senseNum: senseIdx - 1, // Same parent sense
              subSense: subLabel,
              grammar: subSense.grammar || null,
              notes: subSense.notes || null,
              isSubsense: true
            });
            subIdx++;
          }
        }
      }
    }
    globalSenseNum = senseIdx;
  }

  // Handle direct definition field - try to extract numbered senses
  if (entry.definition) {
    const defText = typeof entry.definition === 'string'
      ? entry.definition
      : JSON.stringify(entry.definition);

    // Try to parse numbered senses from definition text
    const numberedSenses = parseNumberedSenses(defText);
    if (numberedSenses.length > 1) {
      // Multiple senses found - add each with proper numbering
      for (const sense of numberedSenses) {
        addDefinition(sense.text, {
          senseNum: sense.senseNum,
          semanticField: sense.semanticField
        });
      }
    } else {
      // Single definition
      addDefinition(defText);
    }
  }

  // Handle string content (HTML) - common in Jastrow entries
  if (typeof entry.content === 'string') {
    // Try to extract numbered senses from HTML content
    const numberedSenses = parseNumberedSenses(entry.content);
    if (numberedSenses.length > 1) {
      for (const sense of numberedSenses) {
        addDefinition(sense.text, {
          senseNum: sense.senseNum,
          semanticField: sense.semanticField,
          raw: true
        });
      }
    } else {
      addDefinition(entry.content, { raw: true });
    }
  }

  // Handle 'definitions' array if present
  if (Array.isArray(entry.definitions)) {
    for (const def of entry.definitions) {
      const defText = typeof def === 'string' ? def : def?.text;
      const senseNum = typeof def === 'object' ? def?.sense_number : undefined;
      addDefinition(defText, senseNum ? { senseNum } : {});
    }
  }

  // Handle BDB/Jastrow specific fields
  if (entry.BDB) {
    const numberedSenses = parseNumberedSenses(entry.BDB);
    if (numberedSenses.length > 1) {
      for (const sense of numberedSenses) {
        addDefinition(sense.text, {
          source: 'BDB',
          senseNum: sense.senseNum,
          semanticField: sense.semanticField
        });
      }
    } else {
      addDefinition(entry.BDB, { source: 'BDB' });
    }
  }
  if (entry.Jastrow) {
    const jastrowDef = extractJastrowMeaning(entry.Jastrow);
    if (jastrowDef) {
      definitions.push({ text: jastrowDef, source: 'Jastrow', senseNum: globalSenseNum++ });
    }
  }

  return definitions;
};
