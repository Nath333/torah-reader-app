# Torah Reader App (Limud)

A modern, feature-rich React application for reading and studying Torah, Talmud, and Mishnah — with a multi-source scholarly dictionary (Pro Scholar), AI-powered analysis, and seamless integration with the Sefaria Project API.

> Last updated: 2026-10-03 (README rewritten to match the code; the previous version dated from March 2026).

## Features

### Text Library (via Sefaria API)
- **Torah** — all 5 books with Hebrew text and English translations
- **Nevi'im (Prophets)** — 21 books including Joshua, Isaiah, Jeremiah
- **Ketuvim (Writings)** — 13 books including Psalms, Proverbs, Job
- **Talmud Bavli** — tractates with traditional *Tzurat HaDaf* page layout
- **Mishnah** — all 6 orders (63 tractates)

### Commentaries
- **Rashi** (with French translation support), **Ramban**, **Tosafot**, **Maharsha**, **Onkelos**, **Ibn Ezra**, **Sforno**, **Radak** and more, fetched from Sefaria with local caching.

### Scholar Mode — Study Center
Tabbed interface that adapts to the book being read:
- **לימוד Learn** — AI analysis modes (Summary, Iyun, Mussar, Machloket/PaRDeS, Gematria, intertextual…) in 3 categories
- **מילים Words** — dictionary lookup (see Pro Scholar below)
- **פירושים Commentary** — multi-commentary view with summaries and disagreement visualization
- **חברותא Chavruta** — AI study partner (Chat, Quiz, Challenge, Compare)
- **מחברת Notebook** — personal journal (questions, insights, progress)
- Talmud mode adds **גמרא Talmud tools** (Iyun/Bekius/Chazara, abbreviations, sages) and **צורת הדף** traditional layout

### Pro Scholar — Multi-Source Dictionary
- Tiered scholarly sources: **BDB, Jastrow, Strong's, CAL Aramaic, Gesenius, Klein** — aggregated with consensus scoring and per-source citations
- Morphological analysis (binyanim detection, conjugation tables, weak verbs), root family trees, etymology chains, cognate languages (comparative Semitic)
- Aramaic detection for Talmudic text, hapax legomena, dialect/period analysis, semantic fields
- Word lookup works offline on preloaded local dictionaries; online sources enrich in background
- Scholarly exports: JSON-LD, Markdown, flashcards (SRS)

### Study Features
- **Bookmarks** — save and organize favorite verses with import/export
- **Reading history & statistics**
- **Verse notes** and vocabulary bank
- **Cross-references** between related texts

### Navigation
- **Weekly Parsha** and **Daf Yomi** (Hebcal API, with offline fallback)
- Full-text search, URL sharing of specific verses
- Keyboard shortcuts (Ctrl+K search, Ctrl+B bookmarks, Ctrl+D dark mode)

### Accessibility & UX
- Dark/light mode, adjustable font sizes, responsive design (desktop & mobile)
- Text-to-speech for Hebrew with voice selection, Ashkenazi/Sephardic pronunciation guide
- Offline support via Service Worker + locally served dictionary data

### Translations
- **English** — full translations
- **French** — AI-powered translation of definitions and commentaries

## Technical Stack

- **React 19** — hooks-based architecture, 8 contexts (Torah, Settings, Study, Commentary…)
- **Vite 6** — dev server and production build (esbuild/rollup); **Vitest 3** for the test suite (19 suites, 746+ tests)
- **Sefaria API** — authentic Jewish text data, with caching layers
- **Groq AI** (Llama 3.3 70B) — analysis, summaries and translations
- **CSS Variables** theming; **LocalStorage** persistence

## Project Structure

```
src/
├── components/       # ~210 files in 12 domain folders
│   ├── core/         #   TorahReader, verse display, reader controls
│   ├── scholar-mode/ #   Study Center tabs (Learn, Words, Commentary, Chavruta…)
│   ├── dictionary/   #   Pro Scholar panels, morphology, etymology
│   ├── commentary/   #   Commentary viewer, summaries, Rashi French
│   ├── analysis/     #   Cantillation, textual criticism, rabbinic refs
│   ├── ai-tutor/     #   Chavruta AI (chat, quiz, personas)
│   ├── layout/       #   Tzurat HaDaf, Mikraot Gedolot layouts
│   └── …             #   ai-tutor, navigation, settings, shared, study, visualization
├── services/         # ~80 modules: Sefaria, Groq, unified lookup pipeline,
│   │                 #   dictionary loaders (lazy JSON), cache orchestrator,
│   │                 #   scholarly aggregators, hebcal, audio…
├── context/          # 8 React contexts
├── hooks/            # ~40 custom hooks
├── constants/        # Books, morphology, function words, citations
├── utils/            # Cache, sanitization (DOMPurify), Hebrew text utils
└── styles/           # CSS design system
```

Dictionary data is served from `public/data/` and lazy-loaded per source.

Copyrighted scans (Koren Talmud Bavli / Steinsaltz PDFs, historical Talmud prints) are **not** part of the repository — they were purged from the git history on 2026-10-03 and must stay outside git. Texts are read from the Sefaria API instead.

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Start the development server: `npm start` (Vite, http://localhost:3000/torah-reader-app/)
4. Run the tests: `npm test` (Vitest)
5. Production build: `npm run build` → `dist/`

## API Keys

### Groq AI (optional)
AI features need a free [Groq](https://console.groq.com/) API key.

**Enter it in the app (Réglages / AI settings panel).** The key lives in the browser only, via `safeStorage` (XSS-sanitized localStorage wrapper) — it is **never** bundled in the application. The old `.env` / `REACT_APP_GROQ_API_KEY` mechanism was removed for security (a build-time key ends up in plain text in the public JS bundle); a key left by an older version is migrated automatically on first use.

Other security notes:
- No third-party CORS proxy: Sefaria calls go direct (`api.allorigins.win` fallback was removed).
- CI (`.github/workflows/ci.yml`): npm ci → dictionary quality → vitest → production build.
- `npm run knip` reports dead code (false positives possible — use as a report, not an auto-delete list).

## Deployment

Hosted on GitHub Pages: https://Nath333.github.io/torah-reader-app

```bash
npm run deploy    # build (predeploy) + publish dist/ to GitHub Pages
```

## License

MIT
