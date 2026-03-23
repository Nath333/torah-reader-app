# Services Architecture

This document describes the service layer architecture for the Torah Reader app.

## Overview

The services layer is organized into functional domains with clear responsibilities.

```
services/
├── Core API
│   ├── sefariaApi.js          # Sefaria project API client
│   └── hebcalService.js       # Jewish calendar API
│
├── Word Lookup (Primary Entry Points)
│   ├── unifiedLookupService.js    # ★ PRIMARY: All word lookup goes through here
│   ├── translationService.js      # Text translation (sentences, commentary)
│   ├── lookupPipeline.js          # Pipeline architecture (LookupContext)
│   ├── lookupStages.js            # Composable pipeline stages
│   └── scholarSourceAggregator.js # ★ Source consensus & parallel fetching
│
├── Dictionaries
│   ├── dictionaryLoader.js    # Lazy load BDB, Jastrow, Strong's
│   ├── hebrewDictionary.js    # Hebrew word analysis
│   ├── babylonianDictionary.js # Aramaic detection
│   ├── calDictionaryService.js # CAL API wrapper
│   └── scholarlyLexiconService.js
│
├── Root & Grammar Analysis
│   ├── rootExtraction.js      # ★ Root extraction (renamed from unifiedRootService)
│   ├── linguisticAnalysis.js  # ★ Linguistic analysis (renamed from proScholarV6)
│   ├── grammarAnalysisService.js
│   └── morphologicalAnalysisService.js
│
├── Commentary
│   ├── commentaryServiceFactory.js # Unified commentary fetcher
│   ├── rashiService.js
│   ├── tosafotService.js
│   └── soncinoService.js
│
├── AI & Analysis
│   ├── groqService.js         # Groq API wrapper
│   ├── aiService.js           # Question answering
│   ├── ragService.js          # RAG context
│   └── smartDataService.js    # Unified intelligence
│
├── Infrastructure
│   ├── cacheOrchestrator.js   # ★ Unified cache management
│   └── telemetryService.js    # Analytics
│
└── index.js                   # Service exports
```

## Service Boundaries

### 1. Word Lookup

**Entry Point:** `unifiedLookupService.js`

```javascript
// ✅ RECOMMENDED: Use the unified lookup service
import { lookupWord, quickLookup, batchLookup } from './services/unifiedLookupService';

const result = await lookupWord('שָׁלוֹם', { contextMode: 'biblical' });

// Quick synchronous lookup (local dictionaries only)
const quick = quickLookup('תורה');

// Batch lookup for multiple words
const results = await batchLookup(['שלום', 'תורה', 'ברכה']);

// ❌ WRONG: Don't call lower-level services directly
// import { scholarlyLookup } from './services/scholarlyLexiconService';
```

The unified lookup service handles:
- Request deduplication (pending promise map)
- Tiered caching via `cacheOrchestrator`
- Pipeline-based lookup with composable stages
- Parallel source aggregation with early return optimization
- Scholarly consensus scoring across multiple dictionaries
- Source reliability tiering (GOLD/SILVER/BRONZE)

### 2. Root Extraction

**Entry Point:** `rootExtraction.js`

```javascript
// ✅ CORRECT: Use root extraction service
import { extractRootsWithDirectValidation } from './services/rootExtraction';

const roots = await extractRootsWithDirectValidation('הִתְקַדֵּשׁ');
```

### 3. Source Aggregation

**Entry Point:** `scholarSourceAggregator.js`

```javascript
// For parallel lookups with early return optimization
import {
  raceWithEarlyReturn,
  calculateConsensus,
  getSourceTier
} from './services/scholarSourceAggregator';

// Race multiple dictionaries, return early when tier-1 source found
const result = await raceWithEarlyReturn(word, {
  'BDB': () => lookupBDB(word),
  'Jastrow': () => lookupJastrow(word),
  'Sefaria': () => lookupSefaria(word)
}, { timeout: 2000, earlyReturnOnTier1: true });
```

### 3. Caching

**Entry Point:** `cacheOrchestrator.js`

```javascript
// ✅ CORRECT: Use managed caches
import { createManagedCache } from './services/cacheOrchestrator';

const myCache = createManagedCache('myService', {
  maxSize: 500,
  ttl: 30 * 60 * 1000 // 30 minutes
});

// ❌ WRONG: Don't create standalone caches
// const cache = new Map(); // No telemetry, no memory management
```

### 4. Commentary

**Entry Point:** `commentaryServiceFactory.js` or use hooks

```javascript
// ✅ CORRECT: Use the factory or hook
import { getCommentary } from './services/commentaryServiceFactory';
import { useCommentaryLoader } from './hooks/useCommentaryLoader';
```

## Data Flow

```
Component
    │
    ▼
useWordLookup (Hook)
    │
    ▼
unifiedLookupService
    ├─► Check cache (cacheOrchestrator)
    ├─► Pre-classify word
    └─► lookupPipeline (stages)
        ├─► scholarlyLexiconService (Sefaria)
        ├─► dictionaryLoader (BDB/Jastrow)
        ├─► rootExtraction
        ├─► grammarAnalysisService
        └─► englishToFrenchService (optional)
```

## Adding New Services

1. **Create the service** in `services/` with clear responsibility
2. **Export from `index.js`** with descriptive comments
3. **Use `createManagedCache`** for any caching needs
4. **Document the entry point** and usage patterns

## Deprecated/Removed Services

The following have been consolidated or removed:

| Removed/Deprecated | Replaced By |
|------------|-------------|
| `combinedTranslationService` | `unifiedLookupService` (word lookup) + `translationService` (text translation) |
| `wordLookupOrchestrator` | `unifiedLookupService` |
| `dictionaryPreloader` | `dictionaryLoader` |
| `getCached/setCached` (proScholarV4) | `createManagedCache` |
| `unifiedRootService` | `rootExtraction` (renamed) |
| `proScholarV6` | `linguisticAnalysis` (renamed) |
| `wordLookupCache` | `cacheOrchestrator` |

## Pipeline Architecture

The lookup system uses a composable pipeline architecture:

```
LookupContext (state carrier)
    │
    ▼
┌─────────────────────────────────────────────────────┐
│ STAGE 1: PreClassification                          │
│ → Catches proper nouns (משה=Moses), abbreviations   │
└─────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────┐
│ STAGE 2: HebrewVerbAnalysis                         │
│ → Detects verb patterns (להביא = Hiphil of בוא)     │
└─────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────┐
│ STAGE 3-4: HalachicLookup, FunctionWordLookup       │
│ → Talmudic terms, common particles (את, אל, על)     │
└─────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────┐
│ STAGE 5: LocalDictionaries (parallel aggregation)   │
│ → BDB, Jastrow, Strong's, Klein, CAL               │
│ → Sorted by scholarly tier (GOLD > SILVER > BRONZE) │
│ → Expert consensus scoring                          │
└─────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────┐
│ STAGES 6-9: Fallback analysis                       │
│ → Aramaic patterns, morphological decomposition    │
│ → Multi-hypothesis root extraction                 │
└─────────────────────────────────────────────────────┘
    │
    ▼
Final Result with consensus + all sources
```

## Performance Considerations

1. **Use the orchestrator** - It handles deduplication and caching
2. **Batch operations** - Use `batchLookup` for multiple words
3. **Lazy load dictionaries** - Use `dictionaryLoader` instead of importing data
4. **Monitor with telemetry** - Check `getTelemetry()` for bottlenecks

## Future Improvements

- [x] Merge overlapping services (combinedTranslationService + wordLookupOrchestrator) → **DONE: unifiedLookupService**
- [ ] Add TypeScript types for all services
- [ ] Implement service worker caching for offline
- [ ] Add comprehensive test coverage
