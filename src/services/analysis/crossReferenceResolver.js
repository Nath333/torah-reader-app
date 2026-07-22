// =============================================================================
// CROSS-REFERENCE RESOLVER
// Follow dictionary cross-references (Jastrow "v.", "cmp.", "ch.", "= X", …)
// so that variant / feminine / construct / Chaldee forms resolve to their
// canonical headword and inherit its definition, root and cognate data.
//
// Jastrow entry examples this module handles:
//   שְׁתַּיִם , v. שְׁנַיִם                       → pure redirect
//   אִישְׁתִּי he drank; v. שְׁתִי                 → gloss + redirect
//   אֶישְׁתָּא , אֶשְׁתָּא (= שִׁיתָּא) six            → equivalence (= X)
//   חֲזַק ch. חָזַק                                 → Aramaic↔Hebrew cognate
//   אִישְׁתְּמוֹדַע , v. אִשְׁ׳                       → truncated target (uses headword prefix)
//
// Design:
//   - Pure parsing functions (no I/O, no state).
//   - Pattern detection is intentionally loose: we keep confidence low enough
//     that a single weak hit won't force a redirect — the pipeline stage
//     decides whether consensus is strong enough to follow.
//   - Dictionary keys preserve final Hebrew letters (ם/ן/ץ/ף/ך), so the
//     normalised key we use for cycle detection and lookup must also preserve
//     them. We only strip diacritics.
// =============================================================================

import { stripAllDiacritics } from '../../utils/hebrewUtils';

// =============================================================================
// TYPES
// =============================================================================

/** Kinds of cross-reference markers. */
export const REDIRECT_TYPES = Object.freeze({
  SEE:         'see',          // v. / vide
  COMPARE:     'compare',      // cmp. / cf.
  EQUIVALENT:  'equivalent',   // = X (parenthetical)
  CHALDEE:     'chaldee',      // ch. X (Aramaic equivalent of Hebrew)
  SUB:         'sub'           // sub X (subsumed under)
});

// =============================================================================
// PATTERNS
// =============================================================================

/** Any Hebrew letter (consonants + finals) */
const HE_LETTER = '\\u05D0-\\u05EA';
/** Diacritics (vowels + cantillation) */
const HE_DIAC = '\\u0591-\\u05C7';
/** A "target" token: Hebrew letters with optional diacritics, optional trailing apostrophe (abbrev) */
const HE_TARGET = `[${HE_LETTER}${HE_DIAC}]+[\\u05F3'’]?`;

// Ordered: more specific patterns first so we don't mis-classify.
const PATTERNS = [
  {
    type: REDIRECT_TYPES.CHALDEE,
    // "X ch. Y" — ch. can also stand for "chapter", so we require a Hebrew
    // target immediately after.
    re: new RegExp(`\\bch\\.?\\s+(${HE_TARGET})`, 'u'),
    confidence: 0.7
  },
  {
    type: REDIRECT_TYPES.EQUIVALENT,
    // "(= X)" — inline equivalence
    re: new RegExp(`\\(\\s*=\\s*(${HE_TARGET})\\s*\\)`, 'u'),
    confidence: 0.6
  },
  {
    type: REDIRECT_TYPES.COMPARE,
    re: new RegExp(`\\b(?:cmp|cf)\\.?\\s+(${HE_TARGET})`, 'u'),
    confidence: 0.4
  },
  {
    type: REDIRECT_TYPES.SUB,
    re: new RegExp(`\\bsub\\s+(${HE_TARGET})`, 'u'),
    confidence: 0.5
  },
  {
    type: REDIRECT_TYPES.SEE,
    // "v. X" — must be whitespace-bounded so we don't match "vav" or urls.
    re: new RegExp(`(?:^|[\\s,;:.()])v\\.?\\s+(${HE_TARGET})`, 'u'),
    confidence: 0.9
  }
];

/** Marker used by Jastrow to abbreviate a repeated Hebrew prefix. */
const ABBREV_MARKERS = /[׳'’]$/;

// =============================================================================
// EXTRACTION
// =============================================================================

/**
 * Normalise a Hebrew headword or target for dictionary-key lookup.
 * Strips diacritics but preserves final letters (dictionary keys use them).
 */
export const normalizeKey = (word) => {
  if (!word || typeof word !== 'string') return '';
  return stripAllDiacritics(word).trim();
};

/**
 * If a redirect target is truncated (ends with apostrophe), try to expand it
 * using the headword's prefix.
 *
 * Example: headword="אִישְׁתְּמוֹדַע", target="אִשְׁ׳" → "אִישְׁתְּמוֹדַע"
 *
 * Returns the expanded form, or `null` when expansion fails — a bare prefix
 * like "אִשְׁ" is not a real dictionary key and shouldn't be chased.
 */
const expandAbbrevTarget = (target, headword) => {
  if (!target || !ABBREV_MARKERS.test(target)) return target;
  if (!headword) return null;

  const prefix = target.replace(ABBREV_MARKERS, '');
  const prefixKey = normalizeKey(prefix);
  const headwordKey = normalizeKey(headword);

  if (prefixKey && headwordKey.startsWith(prefixKey)) {
    return headword;
  }
  return null;
};

/**
 * Extract cross-references from a definition body.
 *
 * @param {string} definition - Raw definition text from a lexicon entry.
 * @param {string} [headword] - Entry headword (used to expand truncated targets).
 * @returns {Array<{type: string, target: string, targetKey: string, confidence: number}>}
 */
export const extractCrossReferences = (definition, headword = '') => {
  if (!definition || typeof definition !== 'string') return [];

  const refs = [];
  const seenTargets = new Set();
  const headwordKey = normalizeKey(headword);

  for (const { type, re, confidence } of PATTERNS) {
    const match = definition.match(re);
    if (!match) continue;

    const rawTarget = match[1];
    const expanded = expandAbbrevTarget(rawTarget, headword);
    if (!expanded) continue; // failed abbreviation expansion

    const targetKey = normalizeKey(expanded);

    // Skip self-redirects and duplicates
    if (!targetKey || targetKey === headwordKey) continue;
    if (seenTargets.has(targetKey)) continue;

    seenTargets.add(targetKey);
    refs.push({ type, target: expanded, targetKey, confidence });
  }

  return refs;
};

/**
 * A "pure redirect" is an entry whose body is essentially just
 * "headword, v. target" with no substantive definition. These are the
 * highest-confidence signal to follow.
 */
export const isPureRedirect = (definition, headword = '') => {
  if (!definition) return false;
  const refs = extractCrossReferences(definition, headword);
  const seeRef = refs.find(r => r.type === REDIRECT_TYPES.SEE);
  if (!seeRef) return false;

  let residue = definition;
  if (headword) {
    const hwEsc = headword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    residue = residue.replace(new RegExp(hwEsc, 'gu'), '');
  }
  residue = residue
    .replace(new RegExp(`v\\.?\\s+${HE_TARGET}`, 'gu'), '')
    .replace(/[,;:.()[\]]/g, '')
    .trim();

  // Strip residual Hebrew, diacritics, and whitespace. What remains is the
  // English gloss (if any). A meaningful gloss ("he drank", "six", "fire") is
  // ≥5 characters — tighter than that and it's just residual punctuation.
  const nonHebrew = residue.replace(new RegExp(`[${HE_LETTER}${HE_DIAC}\\s]`, 'gu'), '');
  return nonHebrew.length < 5;
};

// =============================================================================
// CONSENSUS
// =============================================================================

/**
 * Given sources from stage-5 LocalDictionaries, decide whether we should
 * follow a cross-reference.
 *
 * Rule: follow if
 *   (a) ≥2 sources redirect to the same target, OR
 *   (b) a single Tier-1 source is a *pure redirect* (no substantive gloss).
 *
 * SEE ("v.") wins over other marker types on ties.
 *
 * @param {Array} sources - Sources from the aggregator.
 * @returns {{targetKey, target, type, supporters}|null}
 */
export const pickConsensusRedirect = (sources) => {
  if (!Array.isArray(sources) || sources.length === 0) return null;

  const tally = new Map();

  for (const src of sources) {
    if (!src?.definition) continue;
    const headword = src.headword || src._matchedForm;
    const refs = extractCrossReferences(src.definition, headword);
    const pure = isPureRedirect(src.definition, headword);

    for (const ref of refs) {
      const entry = tally.get(ref.targetKey) || {
        target: ref.target,
        targetKey: ref.targetKey,
        types: new Set(),
        supporters: [],
        tierLevels: [],
        pureSources: []
      };
      entry.types.add(ref.type);
      entry.supporters.push(src.name);
      entry.tierLevels.push(typeof src.tier === 'number' ? src.tier : (src.tier?.level ?? 3));
      if (pure && ref.type === REDIRECT_TYPES.SEE) {
        entry.pureSources.push(src.name);
      }
      tally.set(ref.targetKey, entry);
    }
  }

  if (tally.size === 0) return null;

  let best = null;
  for (const entry of tally.values()) {
    const multiSource = entry.supporters.length >= 2;
    const pureTier1 = entry.pureSources.length >= 1 &&
      Math.min(...entry.tierLevels) === 1;

    if (!multiSource && !pureTier1) continue;

    const score =
      entry.supporters.length * 10 +
      (entry.types.has(REDIRECT_TYPES.SEE) ? 5 : 0) +
      entry.pureSources.length * 3 +
      (Math.min(...entry.tierLevels) === 1 ? 2 : 0);

    if (!best || score > best.score) {
      best = { ...entry, score };
    }
  }

  if (!best) return null;
  return {
    targetKey: best.targetKey,
    target: best.target,
    type: best.types.has(REDIRECT_TYPES.SEE)
      ? REDIRECT_TYPES.SEE
      : Array.from(best.types)[0],
    supporters: best.supporters
  };
};

// =============================================================================
// RESOLUTION
// =============================================================================

/**
 * Resolve sources by following a consensus cross-reference chain.
 *
 * Commits a hop to the chain ONLY AFTER the target lookup succeeds, so a
 * failed lookup doesn't falsely report `resolved: true`.
 *
 * @param {Array}    sources
 * @param {Function} lookupFn         - (word, contextMode) => { allSources } or { sources }
 * @param {Object}   [options]
 * @param {string}   [options.contextMode]
 * @param {number}   [options.maxDepth=2]
 * @returns {{
 *   resolved: boolean,
 *   canonical: string|null,
 *   chain: string[],
 *   resolvedSources: Array,
 *   redirectType: string|null,
 *   supporters: string[]
 * }}
 */
export const resolveCanonical = (sources, lookupFn, options = {}) => {
  const { contextMode, maxDepth = 2 } = options;
  const emptyResult = {
    resolved: false,
    canonical: null,
    chain: [],
    resolvedSources: [],
    redirectType: null,
    supporters: []
  };

  if (!Array.isArray(sources) || sources.length === 0 || typeof lookupFn !== 'function') {
    return emptyResult;
  }

  const visited = new Set(
    sources
      .map(s => normalizeKey(s.headword || s._matchedForm || ''))
      .filter(Boolean)
  );

  let currentSources = sources;
  const chain = [];
  let redirectType = null;
  let supporters = [];
  let lastGoodSources = null;

  for (let depth = 0; depth < maxDepth; depth++) {
    const pick = pickConsensusRedirect(currentSources);
    if (!pick) break;
    if (visited.has(pick.targetKey)) break; // cycle

    // Attempt the lookup BEFORE committing to the chain — if it fails we
    // don't want to report resolved=true on an empty target.
    const next = lookupFn(pick.target, contextMode);
    const nextSources = next?.allSources || next?.sources || [];
    if (!nextSources.length) break;

    visited.add(pick.targetKey);
    chain.push(pick.target);
    redirectType = pick.type;
    supporters = pick.supporters;
    currentSources = nextSources;
    lastGoodSources = nextSources;
  }

  if (chain.length === 0 || !lastGoodSources) return emptyResult;

  return {
    resolved: true,
    canonical: chain[chain.length - 1],
    chain,
    resolvedSources: lastGoodSources,
    redirectType,
    supporters
  };
};
