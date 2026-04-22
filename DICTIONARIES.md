# Dictionary & Lexicon Architecture

This document describes how Torah Reader stores, loads, and looks up dictionary data (BDB, Jastrow, Strong's, CAL, Gesenius, Klein, HALOT, DJBA, TWOT, root meanings, rabbi biographies, realia, etc.).

If you are adding a new dictionary, or debugging a "dictionary not loading" issue, read this first.

---

## 1. Where files live

| Location | Purpose | Loaded |
|----------|---------|--------|
| `public/data/*.json` | **Source of truth.** All dictionary data lives here as JSON. These files are served as static assets. | Lazily over `fetch()` |
| `src/services/dictionaries/dictionaryLoader.js` | **The only module that reads JSON files.** Owns the cache, in-flight dedup, load status, and all `get*()` / `lookup*()` / `preload*()` functions. | Imported everywhere |
| `src/services/unifiedLookupService.js` | High-level API. Queries many dictionaries at once and aggregates results. | Imported by components |
| `src/data/*.js` | **Thin wrappers.** Expose a legacy per-dictionary API (e.g. `JASTROW_COMPLETE`, `BDB_BY_WORD`) by re-exporting from `dictionaryLoader`. No data logic lives here. | Imported by legacy callers |
| `src/data/proxyHelpers.js` | Shared `createLazyProxy` / `createDeprecatedLookupProxy` factories used by every wrapper in `src/data/`. | Imported by wrappers |

**Rule:** `src/data/*.js` files must not contain dictionary data. If a wrapper grows real logic, that logic belongs in `dictionaryLoader.js` or a sibling service.

---

## 2. Import rules

There are only three valid ways to reach dictionary data:

1. **From app code:** `import { lookupBDBByWord } from 'services/dictionaries/dictionaryLoader'` — use the async function.
2. **From app code (cross-dictionary):** `import { lookupAllDictionaries } from 'services/unifiedLookupService'` — prefer this for word-intelligence features.
3. **From legacy code:** `import { lookupBDBByWord } from 'data/bdbComplete'` — the wrapper re-exports from the loader. Acceptable, but new code should skip the wrapper.

**Never:**
- `import bdbData from 'public/data/bdbComplete.json'` — bundles the JSON into the app (defeats lazy loading).
- `fetch('/data/bdbComplete.json')` from a component — the loader already handles this with caching and dedup.
- Direct property access on `BDB_BY_WORD[word]` in new code — this triggers a deprecation warning and an async load you can't await. Use `lookupBDBByWord(word)` instead.

---

## 3. How to add a new dictionary

1. **Place the JSON** at `public/data/<name>_lexicon.json` (or similar). Use the shape `{ "<lemma>": { "definition": "...", ... }, ... }`. If you need metadata, prefix keys with `_` (e.g. `_meta`) — the verifier skips those.
2. **Register a loader** in `src/services/dictionaries/dictionaryLoader.js`:
   - Add a cache slot to the `cache` object.
   - Add `getXxx()` (async, dedup-aware) and `getXxxData()` (sync, cache read).
   - Add `lookupXxxByWord(word)` and `lookupXxxSync(word)` if it's a word dictionary.
   - If it should preload with the lexicon group, add it to `preloadLexicons()`.
3. **Register in the verifier** at `scripts/verifyDictionaryQuality.js`: add an entry to the `dictionaries` array with the file name and the entries key (or `null` if entries are at the top level).
4. **(Optional) Add a wrapper** at `src/data/xxx.js` only if legacy code needs the old-style `XXX_BY_WORD` proxy. New dictionaries usually don't need one — import from the loader directly.
5. **Update `unifiedLookupService.js`** if the new dictionary should participate in cross-dictionary lookups.

---

## 4. Pre-build validation

`npm run build` automatically runs `scripts/verifyDictionaryQuality.js` via the npm `prebuild` lifecycle. The build fails if:

- Any referenced dictionary file is missing from `public/data/`.
- Any dictionary has more than **5%** empty/stub entries.
- Total definitions across all dictionaries fall below **60,000**.

To run the check manually: `node scripts/verifyDictionaryQuality.js`.

---

## 5. Wrapper conventions (`src/data/`)

All wrappers in `src/data/` follow one of two patterns, both provided by `src/data/proxyHelpers.js`:

- **`createLazyProxy(dataGetter)`** — for wrappers that expose the full dictionary object (e.g. `JASTROW_ARAMAIC`, `CAL_ARAMAIC`, `BDB_LEXICON`). The proxy transparently reads from the sync cache getter and supports `in`, `Object.keys()`, iteration.
- **`createDeprecatedLookupProxy({ syncLookup, triggerLoad, isLoaded, name, apiName, preferredFn })`** — for legacy per-key access APIs like `BDB_BY_WORD[word]`. Returns cached entries synchronously, warns once on first miss, and triggers an async load for next time.

New wrappers **must** use one of these helpers. Don't write bespoke `new Proxy({}, ...)` inline — we've had four different Proxy shapes in the past and it was a maintenance burden.

---

## 6. Cache & preload behavior

- Every `getXxx()` returns the cached object if available, or a shared in-flight promise if a load is already underway. Concurrent callers never trigger duplicate fetches.
- Call `preloadDictionaries()` / `preloadLexicons()` / `initializePreload()` on app startup to warm the cache. After that, `lookupXxxSync(word)` is reliable.
- `clearCache(name)` is available for tests.
- `getCacheStatus()` / `getLoadingStatus()` return diagnostic info.
