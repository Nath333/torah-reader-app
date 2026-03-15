# Torah Reader App

A modern, feature-rich React application for reading and studying Torah, Talmud, and Mishnah with AI-powered analysis and seamless integration to the Sefaria Project API.

## Features

### Text Library
- **Torah** - All 5 books with Hebrew text and English translations
- **Nevi'im (Prophets)** - 21 books including Joshua, Isaiah, Jeremiah
- **Ketuvim (Writings)** - 13 books including Psalms, Proverbs, Job
- **Talmud Bavli** - 39 tractates with traditional Tzurat HaDaf layout
- **Mishnah** - All 6 orders (63 tractates)

### Commentaries
- **Rashi** - Primary commentary on Torah and Talmud
- **Ramban (Nachmanides)** - Philosophical and mystical insights
- **Tosafot** - Talmudic discussions and analysis
- **Maharsha** - Deep Talmudic analysis
- **Onkelos** - Aramaic Targum translation
- **Ibn Ezra, Sforno, Radak** - Additional classic commentators

### AI-Powered Study Tools
- **Smart Summaries** - AI-generated summaries of verses and commentaries
- **PaRDeS Analysis** - Four levels of Torah interpretation (Pshat, Remez, Drash, Sod)
- **Mussar Insights** - Character development and ethical teachings
- **Gematria Analysis** - Numerical patterns in Hebrew text
- **Lexicon Mode** - Scholarly dictionary analysis (BDB, Jastrow, HALOT)
- **Intertextual Analysis** - Cross-references across Jewish texts
- **Talmud-Specific Modes** - Sugya flow, Shakla Vetarya dialectic analysis

### Study Features
- **Bookmarks** - Save and organize favorite verses with import/export
- **Reading History** - Track your learning progress
- **Verse Notes** - Personal annotations on any verse
- **Vocabulary Bank** - Learn and review Hebrew/Aramaic words
- **Reading Statistics** - Track your study habits

### Navigation
- **Weekly Parsha** - Jump to current Torah portion
- **Daf Yomi** - Daily Talmud page
- **Cross-References** - Navigate between related texts
- **Powerful Search** - Full-text search across all texts
- **URL Sharing** - Share specific verses via URL

### Accessibility & UX
- **Dark/Light Mode** - System preference detection
- **Adjustable Font Sizes** - Comfortable reading at any size
- **Keyboard Shortcuts** - Efficient navigation (Ctrl+K search, Ctrl+B bookmarks)
- **Text-to-Speech** - Hebrew audio with voice selection
- **Pronunciation Guide** - Ashkenazi and Sephardic traditions
- **Offline Support** - Service Worker for offline access
- **Responsive Design** - Works on desktop and mobile

### Translations
- **English** - Full English translations
- **French** - AI-powered English to French translation

## Technical Stack

- **React 19** - Modern hooks-based architecture
- **Context API** - State management (Torah, Settings, Study contexts)
- **Sefaria API** - Authentic Jewish text data
- **Groq AI** - Llama 3.3 70B for intelligent analysis
- **CSS Variables** - Theming and design system
- **LocalStorage** - Persistent user data

## Project Structure

```
src/
├── components/          # 75+ UI components
│   ├── TorahReader.js   # Main text display
│   ├── AIStudyPanel.js  # AI analysis interface
│   ├── CommentarySelector.js
│   ├── Sidebar.js
│   └── ...
├── services/            # 25 specialized services
│   ├── sefariaApi.js    # API integration & caching
│   ├── groqService.js   # AI analysis
│   ├── rashiService.js  # Rashi commentary
│   └── ...
├── context/             # State management
│   ├── TorahContext.js  # Text data
│   ├── SettingsContext.js # User preferences
│   └── StudyContext.js  # Learning data
├── hooks/               # 14 custom hooks
│   ├── useDarkMode.js
│   ├── useKeyboardShortcuts.js
│   └── ...
├── utils/               # Utilities
│   ├── cache.js         # Unified caching
│   └── ...
└── styles/              # CSS design system
```

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Create `.env` file with your API key (optional):
   ```
   REACT_APP_GROQ_API_KEY=your_groq_api_key
   ```
4. Start the development server: `npm start`
5. Open http://localhost:3000 in your browser

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Open search |
| `Ctrl/Cmd + B` | Toggle bookmarks |
| `Ctrl/Cmd + D` | Toggle dark mode |
| `Escape` | Close modals/panels |
| `←` / `→` | Previous/Next chapter |

## API Keys

### Groq AI (Optional)
For AI-powered analysis features, get a free API key from [Groq](https://console.groq.com/).
You can add it via the app's AI settings panel or in your `.env` file.

## Deployment

```bash
npm run build     # Create production build
npm run deploy    # Deploy to GitHub Pages
```

## License

MIT
