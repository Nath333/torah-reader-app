import { useState, useCallback, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './App.css';
import { getReadPath, getSplitPath, getTraditionalPath, getVersionsPath } from './config/routes';

// Components
import TorahReader from './components/TorahReader';
import SearchBar from './components/SearchBar';
import SearchResults from './components/SearchResults';
import Bookmarks from './components/Bookmarks';
import SefarimSelector from './components/SefarimSelector';
import DailyParsha from './components/DailyParsha';
import ReadingHistory from './components/ReadingHistory';
import KeyboardHelp from './components/KeyboardHelp';
import VocabularyBank from './components/VocabularyBank';
import PronunciationSettings from './components/PronunciationSettings';
import AudioPlayer from './components/AudioPlayer';
import DiscoverPanel from './components/DiscoverPanel';
import TextVersions from './components/TextVersions';
import ChapterHeader from './components/ChapterHeader';
import ReadingStats from './components/ReadingStats';
import Sidebar from './components/Sidebar';
import SplitPaneView from './components/SplitPaneView';
import FocusMode from './components/FocusMode';
import ApiKeySettings from './components/ApiKeySettings';
import WelcomeBanner from './components/WelcomeBanner';
import TraditionalPageView from './components/TraditionalPageView';
import StudyDashboard from './components/StudyDashboard';
import QuickActions from './components/QuickActions';
import Breadcrumb from './components/Breadcrumb';
import FloatingActionButton from './components/FloatingActionButton';

// Context hooks
import { useTorah } from './context/TorahContext';
import { useSettings } from './context/SettingsContext';
import { useStudy } from './context/StudyContext';

// Services & hooks
import { searchTorah } from './services/sefariaApi';
import { TRADITIONS } from './services/pronunciationService';
import useKeyboardShortcuts from './hooks/useKeyboardShortcuts';
import useOnlineStatus from './hooks/useOnlineStatus';
import useUrlState from './hooks/useUrlState';

function App() {
  const searchBarRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Get state from contexts
  const torah = useTorah();
  const settings = useSettings();
  const study = useStudy();

  // Local hooks
  const isOnline = useOnlineStatus();

  // URL sync
  const { getShareLink } = useUrlState(torah.book, torah.chapter, torah.goTo);

  // Derive view from URL path
  const view = useMemo(() => {
    const path = location.pathname;
    if (path.startsWith('/search')) return 'search';
    if (path.startsWith('/bookmarks')) return 'bookmarks';
    if (path.startsWith('/history')) return 'history';
    if (path.startsWith('/vocabulary')) return 'vocabulary';
    if (path.startsWith('/discover')) return 'discover';
    if (path.startsWith('/study')) return 'study';
    if (path.startsWith('/versions')) return 'versions';
    if (path.startsWith('/split')) return 'splitPane';
    if (path.startsWith('/traditional')) return 'traditional';
    return 'reader';
  }, [location.pathname]);

  // Navigate to a specific view
  const setView = useCallback((newViewOrFn) => {
    const newView = typeof newViewOrFn === 'function' ? newViewOrFn(view) : newViewOrFn;

    switch (newView) {
      case 'search':
        navigate('/search');
        break;
      case 'bookmarks':
        navigate('/bookmarks');
        break;
      case 'history':
        navigate('/history');
        break;
      case 'vocabulary':
        navigate('/vocabulary');
        break;
      case 'discover':
        navigate('/discover');
        break;
      case 'study':
        navigate('/study');
        break;
      case 'versions':
        navigate(getVersionsPath(torah.book, torah.chapter));
        break;
      case 'splitPane':
        navigate(getSplitPath(torah.book, torah.chapter));
        break;
      case 'traditional':
        navigate(getTraditionalPath(torah.book, torah.chapter));
        break;
      default:
        navigate(getReadPath(torah.book, torah.chapter));
    }
  }, [navigate, view, torah.book, torah.chapter]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showPronunciationSettings, setShowPronunciationSettings] = useState(false);
  const [showAudioPlayer, setShowAudioPlayer] = useState(false);
  const [showFocusMode, setShowFocusMode] = useState(false);
  const [showAiSettings, setShowAiSettings] = useState(false);
  const [selectedVerse, setSelectedVerse] = useState(null);

  // Navigate to reader view
  const goToReader = useCallback(() => {
    navigate(getReadPath(torah.book, torah.chapter));
  }, [navigate, torah.book, torah.chapter]);

  // Keyboard shortcuts
  const shortcuts = useMemo(() => [
    { key: 'k', ctrl: true, handler: () => searchBarRef.current?.focus() },
    { key: 'b', ctrl: true, handler: () => navigate(view === 'bookmarks' ? getReadPath(torah.book, torah.chapter) : '/bookmarks') },
    { key: 'h', ctrl: true, handler: () => navigate(view === 'history' ? getReadPath(torah.book, torah.chapter) : '/history') },
    { key: 'd', ctrl: true, handler: () => settings.toggleDarkMode?.() },
    { key: 'f', ctrl: true, handler: () => setShowFocusMode(f => !f) },
    { key: 'ArrowLeft', ctrl: true, handler: () => torah.prevChapter?.() },
    { key: 'ArrowRight', ctrl: true, handler: () => torah.nextChapter?.() },
    { key: '?', ctrl: false, shift: true, handler: () => setShowHelp(h => !h) },
    { key: 'Escape', ctrl: false, handler: () => {
      goToReader();
      setShowHelp(false);
      setShowPronunciationSettings(false);
      setShowAudioPlayer(false);
      setShowFocusMode(false);
      setShowAiSettings(false);
    }, preventDefault: false }
  ], [settings, torah, navigate, view, goToReader]);
  useKeyboardShortcuts(shortcuts);

  // Handlers
  const handleSearch = useCallback(async (query) => {
    setSearchLoading(true);
    setSearchError(null);
    try {
      const results = await searchTorah(query);
      setSearchResults(results);
      navigate('/search');
    } catch {
      setSearchError('Search failed');
    } finally {
      setSearchLoading(false);
    }
  }, [navigate]);

  const handleNavigate = useCallback((book, chapter) => {
    torah.goTo(book, chapter);
    navigate(getReadPath(book, chapter));
  }, [torah, navigate]);

  // Bookmark handlers - delegate to StudyContext
  const handleBookmark = useCallback((verse) => {
    study.addBookmark(verse, torah.book, torah.chapter);
  }, [study, torah.book, torah.chapter]);

  const handleSaveWord = useCallback((word, english, french) => {
    study.saveWord(word, english, french, torah.book, torah.chapter);
  }, [study, torah.book, torah.chapter]);

  // Render content based on view
  const content = useMemo(() => {
    switch (view) {
      case 'search':
        return (
          <SearchResults
            results={searchResults}
            onSelectResult={(r) => handleNavigate(r.book, r.chapter)}
            loading={searchLoading}
            error={searchError}
          />
        );
      case 'bookmarks':
        return (
          <Bookmarks
            bookmarks={study.bookmarks}
            onRemoveBookmark={study.removeBookmark}
            onSelectBookmark={(b) => handleNavigate(b.book, b.chapter)}
            onImportBookmarks={study.importBookmarks}
          />
        );
      case 'history':
        return (
          <ReadingHistory
            history={study.history}
            onSelect={handleNavigate}
            onClear={study.clearHistory}
          />
        );
      case 'vocabulary':
        return (
          <VocabularyBank
            vocabulary={study.vocabulary}
            onRemoveWord={study.removeWord}
            onUpdateWord={study.updateWord}
            onMarkReviewed={study.markReviewed}
            onClear={study.clearVocabulary}
            onExport={study.exportVocabulary}
            onImport={study.importVocabulary}
            getWordsForReview={study.getWordsForReview}
            getStats={study.getStats}
          />
        );
      case 'discover':
        return (
          <DiscoverPanel
            onNavigateToRef={handleNavigate}
            onClose={goToReader}
          />
        );
      case 'versions':
        return (
          <TextVersions
            book={torah.book}
            chapter={torah.chapter}
            onClose={goToReader}
          />
        );
      case 'splitPane':
        return (
          <SplitPaneView
            verses={torah.verses}
            selectedBook={torah.book}
            selectedChapter={torah.chapter}
            selectedVerse={selectedVerse}
            onSelectVerse={setSelectedVerse}
            showOnkelos={settings.showOnkelos}
            onkelos={torah.onkelos}
            isTalmud={torah.isTalmudBook}
          />
        );
      case 'traditional':
        return (
          <TraditionalPageView
            verses={torah.verses}
            onkelos={torah.onkelos}
            selectedBook={torah.book}
            selectedChapter={torah.chapter}
            isTorahBook={torah.isTorahBook}
            isTalmud={torah.isTalmudBook}
            isMishnah={torah.isMishnahBook}
            enableClickableText={true}
            showTranslation={settings.showFrench || false}
            onToggleTranslation={(show) => settings.setShowFrench?.(show)}
            onSaveWord={handleSaveWord}
            hasWord={study.hasWord}
            onClose={goToReader}
            onPrevChapter={torah.prevChapter}
            onNextChapter={torah.nextChapter}
            hasPrevChapter={torah.chapter > 1}
            hasNextChapter={torah.chapter < (torah.chapters?.length || 1)}
          />
        );
      case 'study':
        return (
          <StudyDashboard
            onNavigateToText={(ref) => {
              // Parse reference like "Genesis 1" or "Berakhot 2a"
              const parts = ref.split(' ');
              const book = parts.slice(0, -1).join(' ');
              const chapter = parts[parts.length - 1];
              handleNavigate(book, parseInt(chapter) || chapter);
            }}
            onOpenVocabulary={() => setView('vocabulary')}
            onOpenBookmarks={() => setView('bookmarks')}
            onOpenNotes={() => setView('reader')}
          />
        );
      default:
        return (
          <>
            <SefarimSelector
              categories={torah.categories}
              selectedCategory={torah.category}
              onCategoryChange={torah.setCategory}
              selectedBook={torah.book}
              onBookChange={torah.setBook}
              chapters={torah.chapters}
              selectedChapter={torah.chapter}
              onChapterChange={torah.setChapter}
            />
            {torah.error ? (
              <div className="error-message">Error: {torah.error}</div>
            ) : (
              <>
                <ChapterHeader
                  book={torah.book}
                  chapter={torah.chapter}
                  totalChapters={torah.chapters?.length}
                  verseCount={torah.verses?.length || 0}
                  onPrevChapter={torah.prevChapter}
                  onNextChapter={torah.nextChapter}
                  onNavigateToRef={handleNavigate}
                />
                <TorahReader
                  verses={torah.verses}
                  onkelos={torah.onkelos}
                  loading={torah.loading}
                  onBookmarkVerse={handleBookmark}
                  selectedBook={torah.book}
                  selectedChapter={torah.chapter}
                  isTorahBook={torah.isTorahBook}
                  getShareLink={getShareLink}
                  verseNotes={study.verseNotes}
                  onSaveWord={handleSaveWord}
                  hasWord={study.hasWord}
                  showFrench={settings.showFrench}
                  onToggleFrench={settings.toggleFrench}
                  showOnkelos={settings.showOnkelos}
                  onToggleOnkelos={settings.toggleOnkelos}
                  showRashi={settings.showRashi}
                  onToggleRashi={settings.toggleRashi}
                  showTosafot={settings.showTosafot}
                  onToggleTosafot={settings.toggleTosafot}
                  showMaharsha={settings.showMaharsha}
                  onToggleMaharsha={settings.toggleMaharsha}
                  showRamban={settings.showRamban}
                  onToggleRamban={settings.toggleRamban}
                  onNavigateToRef={handleNavigate}
                />
                <ReadingStats
                  book={torah.book}
                  chapter={torah.chapter}
                  totalChapters={torah.chapters?.length}
                  verseCount={torah.verses?.length || 0}
                  readingHistory={study.history}
                />
              </>
            )}
          </>
        );
    }
  }, [view, searchResults, searchLoading, searchError, handleNavigate,
      study, torah, handleBookmark, getShareLink, handleSaveWord,
      settings, selectedVerse, goToReader, setView]);

  return (
    <div className={`app ${settings.darkMode ? 'dark-mode' : ''} ${settings.sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Skip to main content link for accessibility */}
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>

      {/* Focus Mode Overlay */}
      <FocusMode
        verses={torah.verses}
        onkelos={torah.onkelos}
        selectedBook={torah.book}
        selectedChapter={torah.chapter}
        showOnkelos={settings.showOnkelos}
        isActive={showFocusMode}
        onClose={() => setShowFocusMode(false)}
        onPrevChapter={torah.prevChapter}
        onNextChapter={torah.nextChapter}
        onBookmarkVerse={handleBookmark}
      />

      {/* Sidebar Navigation */}
      <Sidebar
        categories={torah.categories}
        selectedCategory={torah.category}
        onCategoryChange={torah.setCategory}
        selectedBook={torah.book}
        onBookChange={torah.setBook}
        chapters={torah.chapters}
        selectedChapter={torah.chapter}
        onChapterChange={torah.setChapter}
        isCollapsed={settings.sidebarCollapsed}
        onToggleCollapse={settings.toggleSidebar}
        bookmarks={study.bookmarks}
        history={study.history}
        onNavigate={handleNavigate}
        onOpenVocabulary={() => setView('vocabulary')}
      />

      {/* Main Content Area */}
      <main id="main-content" className="app-main" role="main">
        {!isOnline && (
          <div className="offline-banner">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.58 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0M12 20h.01" />
            </svg>
            You are offline - some features may be limited
          </div>
        )}

        {/* Header */}
        <header className="app-header">
          <div className="header-brand">
            <button className="sidebar-toggle-btn" onClick={settings.toggleSidebar} title="Toggle sidebar" aria-label="Toggle sidebar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            </button>
            <h1>Sefarim Reader</h1>
            <span className="header-subtitle" lang="he">{torah.isTalmudBook ? 'גמרא' : 'תנ״ך'}</span>
          </div>

          <div className="header-toolbar">
            {/* Primary Actions */}
            <div className="toolbar-group primary">
              <button
                onClick={() => setView(v => v === 'splitPane' ? 'reader' : 'splitPane')}
                className={`toolbar-btn ${view === 'splitPane' ? 'active' : ''}`}
                title="Split View: Text + Commentary"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <line x1="12" y1="3" x2="12" y2="21" />
                </svg>
                <span className="btn-label">Split</span>
              </button>
              <button
                onClick={() => setView(v => v === 'traditional' ? 'reader' : 'traditional')}
                className={`toolbar-btn ${view === 'traditional' ? 'active' : ''}`}
                title="Traditional Page Layout (Tzurat HaDaf / Mikraot Gedolot)"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <line x1="3" y1="9" x2="21" y2="9" />
                  <line x1="9" y1="9" x2="9" y2="21" />
                  <line x1="15" y1="9" x2="15" y2="21" />
                </svg>
                <span className="btn-label">צורת הדף</span>
              </button>
              <button
                onClick={() => setShowFocusMode(true)}
                className="toolbar-btn"
                title="Focus Mode (Ctrl+F)"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                </svg>
                <span className="btn-label">Focus</span>
              </button>
            </div>

            <div className="toolbar-divider" />

            {/* Quick Actions Dropdown - Consolidates secondary actions */}
            <QuickActions
              onOpenDiscover={() => setView(v => v === 'discover' ? 'reader' : 'discover')}
              onOpenVersions={() => setView(v => v === 'versions' ? 'reader' : 'versions')}
              onOpenAudio={() => setShowAudioPlayer(true)}
              onOpenVocabulary={() => setView(v => v === 'vocabulary' ? 'reader' : 'vocabulary')}
              onOpenStudy={() => setView(v => v === 'study' ? 'reader' : 'study')}
              onOpenBookmarks={() => setView(v => v === 'bookmarks' ? 'reader' : 'bookmarks')}
              onOpenHistory={() => setView(v => v === 'history' ? 'reader' : 'history')}
              onOpenHelp={() => setShowHelp(true)}
              vocabularyCount={study.vocabulary.length}
              isDiscoverActive={view === 'discover'}
              isVersionsActive={view === 'versions'}
              isVocabularyActive={view === 'vocabulary'}
              isStudyActive={view === 'study'}
            />

            <div className="toolbar-divider" />

            {/* Settings */}
            <div className="toolbar-group settings">
              <button
                onClick={() => setShowPronunciationSettings(true)}
                className="toolbar-btn pronunciation"
                title="Pronunciation Settings"
              >
                <span className="hebrew-label">{settings.tradition === TRADITIONS.ASHKENAZIC ? 'אשכנז' : 'ספרד'}</span>
              </button>
              <button
                onClick={() => setShowAiSettings(true)}
                className="toolbar-btn ai-settings"
                title="AI Summary Settings (Configure Groq API)"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </button>
              <button
                onClick={settings.toggleDarkMode}
                className="toolbar-btn icon-only theme-toggle"
                aria-label="Toggle dark mode"
                title={settings.darkMode ? 'Light Mode' : 'Dark Mode'}
              >
                {settings.darkMode ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="5" />
                    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                  </svg>
                )}
              </button>
              <button
                onClick={() => setShowHelp(true)}
                className="toolbar-btn icon-only help-btn"
                aria-label="Help"
                title="Keyboard Shortcuts (?)"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* Reading Progress Bar */}
        {torah.verses.length > 0 && view === 'reader' && (
          <div className="reading-progress-container">
            <div
              className="reading-progress-bar"
              style={{ width: `${(torah.chapter / (torah.chapters?.length || 1)) * 100}%` }}
            />
          </div>
        )}

        {/* Breadcrumb Navigation */}
        {view === 'reader' && torah.book && (
          <div className="breadcrumb-wrapper">
            <Breadcrumb
              category={torah.category}
              book={torah.book}
              chapter={torah.chapter}
              onNavigateHome={goToReader}
              onNavigateCategory={() => torah.setCategory(torah.category)}
              onNavigateBook={() => torah.setBook(torah.book)}
              isTalmud={torah.isTalmudBook}
            />
          </div>
        )}

        {/* Main Content */}
        <div className="main-content">
          {/* Welcome Banner - only show on reader view */}
          {view === 'reader' && (
            <WelcomeBanner
              continueReading={study.history.length > 0 ? {
                book: study.history[0]?.book,
                chapter: study.history[0]?.chapter,
                onClick: () => handleNavigate(study.history[0]?.book, study.history[0]?.chapter)
              } : null}
            />
          )}

          <div className="content-header">
            <DailyParsha onNavigate={handleNavigate} tradition={settings.tradition} />
            <SearchBar ref={searchBarRef} onSearch={handleSearch} loading={searchLoading} />
          </div>
          {content}
        </div>
      </main>

      {/* Floating Action Button for Mobile */}
      <FloatingActionButton
        onFocusMode={() => setShowFocusMode(true)}
        onSplitView={() => setView(v => v === 'splitPane' ? 'reader' : 'splitPane')}
        onTraditional={() => setView(v => v === 'traditional' ? 'reader' : 'traditional')}
        onBookmark={() => setView(v => v === 'bookmarks' ? 'reader' : 'bookmarks')}
        onSearch={() => searchBarRef.current?.focus()}
        isVisible={view === 'reader'}
      />

      {/* Modals */}
      <KeyboardHelp isOpen={showHelp} onClose={() => setShowHelp(false)} />

      <PronunciationSettings
        currentTradition={settings.tradition}
        onTraditionChange={settings.setTradition}
        isOpen={showPronunciationSettings}
        onClose={() => setShowPronunciationSettings(false)}
      />

      <AudioPlayer
        verses={torah.verses}
        selectedBook={torah.book}
        selectedChapter={torah.chapter}
        isOpen={showAudioPlayer}
        onClose={() => setShowAudioPlayer(false)}
      />

      {/* AI Settings Modal */}
      {showAiSettings && (
        <div className="api-key-modal-overlay" onClick={() => setShowAiSettings(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <ApiKeySettings onClose={() => setShowAiSettings(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
