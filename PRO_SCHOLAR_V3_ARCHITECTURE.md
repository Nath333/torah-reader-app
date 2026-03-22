# PRO SCHOLAR V3 - Professional Scholarly Dictionary Architecture

## Executive Summary

The current system has all the infrastructure for context-aware scholarly dictionary lookup, but the pieces aren't connected. This document outlines PRO SCHOLAR V3: a complete rewrite of the lookup workflow to deliver professional-grade Hebrew/Aramaic lexicography.

---

## Current Problems (Root Causes)

### Problem 1: Context Pipeline Broken
```
CommentaryBlock has reference "Shabbat 2a"
    ↓ (reference NOT passed)
useWordLookup.lookup(word)
    ↓ (no context)
lookupWordSync(word, {})  ← contextMode = null
    ↓
Strong's included for Talmudic text → WRONG DEFINITIONS
```

**Result:** משה returns "to pull" instead of "Moses"

### Problem 2: Classification Happens Too Late
```
Dictionary returns multiple entries for משה:
  1. משה (verb) = "to draw out, pull"
  2. משה (proper noun) = "Moses"

Current: Returns verb first (alphabetically?)
Needed: Detect proper noun BEFORE dictionary lookup
```

### Problem 3: Morphology Misses Binyan Patterns
```
להביא = ל + הביא (Hiphil of בוא)
         ↓
Current: Strips ל, looks up הביא, finds הב (love) → WRONG
Needed: Recognize Hiphil pattern הXXיX before stripping
```

### Problem 4: Aramaic Possessives Not Handled
```
ברישיה = ב + רישא + יה (in + head + his)
              ↓
Current: CAL returns "to create" (wrong entry)
Needed: Recognize יה suffix, find רישא root
```

---

## PRO SCHOLAR V3 Architecture

### Phase 0: CONTEXT ESTABLISHMENT (NEW)

Before any lookup, establish context from the reference:

```javascript
// In CommentaryBlock or parent component
const context = {
  reference: "Shabbat 2a",
  textType: getContextFromReference("Shabbat 2a"), // → "talmudic"
  language: "aramaic", // Detected from text analysis
  commentator: "Rashi", // If applicable
};

// Pass to lookup
useWordLookup(word, { context });
```

**Source Priority by Context:**

| Context | Primary Sources | Secondary | Skip |
|---------|----------------|-----------|------|
| Talmudic | Jastrow, CAL | BDB | Strong's |
| Biblical | BDB, Strong's | Jastrow | - |
| Mishnaic | Jastrow, BDB | Klein | Strong's |
| Rashi on Talmud | Jastrow | BDB | Strong's |
| Rashi on Torah | BDB, Rashi Lexicon | Jastrow | - |

---

### Phase 1: PRE-CLASSIFICATION (Before Any Dictionary Lookup)

**Order of checks:**

```
1. IS_ABBREVIATION?
   ├── מרה"י → "מרשות היחיד" (from private domain)
   ├── לר"ה → "לרשות הרבים" (to public domain)
   └── Return expanded form + meaning

2. IS_PROPER_NAME?
   ├── משה → "Moses" (Biblical figure)
   ├── רב הונא → "Rav Huna" (Talmudic sage)
   └── Return name + biographical note

3. IS_TECHNICAL_TERM?
   ├── הוצאה → "carrying out" (Shabbat melakha)
   ├── כרת → "excision" (divine punishment)
   └── Return specialized definition

4. CONTINUE TO DICTIONARY LOOKUP
```

**Implementation:**

```javascript
// NEW: src/services/preClassificationService.js

export const preClassify = (word, context) => {
  // Check abbreviations first
  const abbrev = expandAbbreviation(word);
  if (abbrev) return { type: 'abbreviation', ...abbrev };

  // Check proper names (context-aware)
  const name = identifyProperName(word, context);
  if (name) return { type: 'proper_name', ...name };

  // Check technical terms
  const term = lookupTechnicalTerm(word, context);
  if (term) return { type: 'technical_term', ...term };

  // Continue to regular lookup
  return null;
};
```

---

### Phase 2: INTELLIGENT MORPHOLOGY

**NEW: Binyan-Aware Prefix Stripping**

Before stripping prefixes, check if the remaining word is a known verb pattern:

```javascript
// Hiphil pattern: הXXיX (causative)
const HIPHIL_PATTERN = /^ה.{2,3}י./;

// For להביא:
// 1. Strip ל → הביא
// 2. Check: Does הביא match Hiphil pattern? YES
// 3. Extract root: ב-ו-א (not ה-ב)
// 4. Meaning: Hiphil of בוא = "to bring" (causative of "come")
```

**NEW: Aramaic Possessive Recognition**

```javascript
const ARAMAIC_POSSESSIVE_SUFFIXES = {
  'יה': { person: 3, gender: 'm', number: 's', meaning: 'his' },
  'ה': { person: 3, gender: 'f', number: 's', meaning: 'her' },
  'הון': { person: 3, gender: 'm', number: 'p', meaning: 'their' },
  'נא': { type: 'emphatic', meaning: 'the' },
};

// For ברישיה:
// 1. Detect suffix יה → "his"
// 2. Strip → ברישא → ב + רישא
// 3. Strip prefix ב → רישא
// 4. Lookup רישא → "head, beginning"
// 5. Combine: "in" + "head" + "his" = "at its head/beginning"
```

---

### Phase 3: PARALLEL MULTI-SOURCE LOOKUP

Query ALL context-appropriate sources in parallel:

```javascript
const lookupParallel = async (word, context) => {
  const sources = getSourcesForContext(context.textType);

  // Parallel queries
  const results = await Promise.all(
    sources.map(source => lookupInSource(word, source))
  );

  // Merge and deduplicate
  return mergeResults(results, context);
};
```

**Source Selection:**

```javascript
const getSourcesForContext = (textType) => {
  switch (textType) {
    case 'talmudic':
      return ['jastrow', 'cal', 'bdb_aramaic', 'steinsaltz'];
      // NOTE: Strong's excluded

    case 'biblical':
      return ['bdb', 'strongs', 'halot', 'klein'];

    case 'mishnaic':
      return ['jastrow', 'bdb', 'klein'];

    default:
      return ['jastrow', 'bdb', 'klein']; // Safe default
  }
};
```

---

### Phase 4: SCHOLARLY RESULT AGGREGATION

**Multi-Source Display Format:**

```javascript
{
  word: "ברישיה",
  context: "talmudic",

  // Primary definition (context-appropriate)
  primary: {
    definition: "at its head/beginning",
    source: "Jastrow",
    confidence: "high"
  },

  // Morphological breakdown
  morphology: {
    prefix: { text: "ב", meaning: "in/at" },
    root: { text: "רישא", meaning: "head, beginning" },
    suffix: { text: "יה", meaning: "his (3ms)" },
    derivation: "ב + רישא + יה = at its head"
  },

  // All scholarly sources
  sources: [
    {
      name: "Jastrow",
      fullName: "Jastrow's Dictionary (1903)",
      tier: "gold",
      definition: "head, top, beginning",
      headword: "רֵישָׁא",
      isContextAppropriate: true
    },
    {
      name: "CAL",
      fullName: "Comprehensive Aramaic Lexicon",
      tier: "gold",
      definition: "head; chief; beginning",
      dialects: ["Jewish Babylonian Aramaic"],
      isContextAppropriate: true
    }
  ],

  // What was NOT included and why
  excludedSources: [
    {
      name: "Strong's",
      reason: "Biblical Hebrew concordance not appropriate for Talmudic Aramaic"
    }
  ]
}
```

---

### Phase 5: SCHOLARLY UI DISPLAY

**WordDefinitionCard enhancements:**

```
┌─────────────────────────────────────────────────┐
│ ברישיה                                          │
│ at its head/beginning                           │
│                                                 │
│ ══ Morphology ══════════════════════════════════│
│ ב (in) + רישא (head) + יה (his)                  │
│                                                 │
│ ══ Sources ═════════════════════════════════════│
│ 🥇 Jastrow (1903) — RECOMMENDED for Talmud      │
│    "head, top, beginning"                       │
│                                                 │
│ 🥇 CAL — Aramaic specialist                     │
│    "head; chief; beginning"                     │
│    Dialects: Jewish Babylonian Aramaic          │
│                                                 │
│ ══ Context ═════════════════════════════════════│
│ Shabbat 2a • Talmudic Aramaic                   │
│ Strong's excluded (Biblical Hebrew only)        │
└─────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Step 1: Fix Context Pipeline (Critical)
Files: `CommentaryBlock.js`, `useWordLookup.js`, `combinedTranslationService.js`

```javascript
// CommentaryBlock.js
<WordGlossary
  reference={currentRef}  // ← ADD THIS
  onWordClick={handleWordClick}
/>

// useWordLookup.js
const lookup = useCallback(async (word, options = {}) => {
  const { reference } = options;  // ← ACCEPT THIS
  const context = getContextFromReference(reference);

  // Pass context through entire pipeline
  const result = await lookupWithContext(word, context);
}, []);

// combinedTranslationService.js
// Already accepts contextMode - just needs to receive it!
```

### Step 2: Add Pre-Classification Service
New file: `src/services/preClassificationService.js`

- Proper name database (Biblical + Talmudic figures)
- Abbreviation expansion
- Technical term detection

### Step 3: Enhance Morphology
File: `src/constants/morphology.js`

- Add Hiphil/Piel/Pual/Hithpael pattern detection
- Add Aramaic possessive suffix handling
- Add weak verb root extraction

### Step 4: Fix Source Selection
File: `src/utils/definitionCleaner.js`

- Enforce `shouldSkipSource()` earlier in pipeline
- Add source exclusion logging for transparency

### Step 5: Update UI
File: `src/components/dictionary/WordDefinitionCard.js`

- Add morphology breakdown section
- Show source tier badges
- Display context information
- Show excluded sources (for transparency)

---

## Quick Wins (Implement First)

### 1. Pass Reference Through Pipeline
```javascript
// useWordLookup.js line ~1098
const localResult = syncLookup(word, { reference: options.reference });
```

### 2. Skip Strong's in Talmudic Context
```javascript
// Already implemented in shouldSkipSource()!
// Just need to pass contextMode through
```

### 3. Add Proper Names to STOP_WORDS Check
```javascript
// morphology.js - already has משה!
// Issue: Check happens AFTER dictionary lookup
// Fix: Check BEFORE dictionary lookup
```

---

## Metrics for Success

| Metric | Current | Target |
|--------|---------|--------|
| Dictionary coverage | 69% | 90%+ |
| Wrong homograph rate | ~15% | <2% |
| Context-appropriate sources | 60% | 100% |
| Proper noun detection | 0% | 100% |
| Abbreviation expansion | 0% | 95% |

---

## Summary

PRO SCHOLAR V3 transforms the dictionary from a word-by-word lookup into a **context-aware scholarly lexicon** that:

1. **Knows the context** before looking up anything
2. **Pre-classifies** names, abbreviations, and technical terms
3. **Uses appropriate sources** for each text type
4. **Shows scholarly provenance** for every definition
5. **Explains its reasoning** (why sources were included/excluded)

The infrastructure already exists - we just need to connect the pipes.
