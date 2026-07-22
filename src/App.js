/**
 * App - Main Application Component
 *
 * Professional Torah study application with code splitting,
 * error boundaries, and optimized performance.
 */

import { useCallback, useMemo, useEffect, lazy, Suspense, memo } from 'react';
import './App.css';

// Services - PRO SCHOLAR V8: Use dictionaryLoader (consolidated from dictionaryPreloader)
import { initializePreload, preloadForBook } from './services/dictionaries/dictionaryLoader';
// PRO SCHOLAR V7: Preload common words for faster lookup
import { preloadCommonWords } from './services/unifiedLookupService';
import { FEATURES } from './services/featureFlags';
// Semantic search index (populates the corpus that SmartSearch queries)
import { indexVerses } from './services/ai/semanticSearchService';

// Context
import { useTorah } from './context/TorahContext';
import { useSettings } from './context/SettingsContext';
import { useStudy } from './context/StudyContext';

// Hooks
import useKeyboardShortcuts from './hooks/useKeyboardShortcuts';
import useOnlineStatus from './hooks/useOnlineStatus';
import useUrlState from './hooks/useUrlState';
import useViewRouting from './hooks/useViewRouting';

// Modal context (replaces useModals hook)
import { useModals } from './context/ModalContext';

// Components - Critical path (loaded immediately)
import TorahReader from './components/core/TorahReader';
import ErrorBoundary from './components/shared/ErrorBoundary';
import LoadingSkeleton from './components/shared/LoadingSkeleton';
import { MenuIcon, SearchIcon, GridIcon, FocusIcon, SunIcon, MoonIcon, OfflineIcon } from './components/shared/Icons';

// Components - Shared (loaded immediately for header)
import HeaderGreeting from './components/shared/HeaderGreeting';
import ConnectivityIndicator from './components/shared/ConnectivityIndicator';
import FriendlyError from './components/shared/FriendlyError';

// Components - Navigation (loaded immediately)
import Sidebar from './components/navigation/Sidebar';
import QuickActions from './components/navigation/QuickActions';
import Breadcrumb from './components/navigation/Breadcrumb';
import FloatingActionButton from './components/navigation/FloatingActionButton';

// =============================================================================
// Lazy-loaded Components (Code Splitting for Performance)
// =============================================================================

// Study views - loaded on demand
const Bookmarks = lazy(() => import('./components/shared/Bookmarks'));
const ReadingHistory = lazy(() => import('./components/study/ReadingHistory'));
const VocabularyBank = lazy(() => import('./components/study/VocabularyBank'));
const StudyDashboard = lazy(() => import('./components/study/StudyDashboard'));

// Layout views - loaded on demand
const FocusMode = lazy(() => import('./components/layout/FocusMode'));
const TraditionalPageView = lazy(() => import('./components/layout/TraditionalPageView'));

// Navigation panels - loaded on demand
const DiscoverPanel = lazy(() => import('./components/navigation/DiscoverPanel'));
const SmartSearch = lazy(() => import('./components/navigation/SmartSearch'));

// Analysis - loaded on demand
const TextVersions = lazy(() => import('./components/analysis/TextVersions'));

// Settings modals - loaded on demand
const KeyboardHelp = lazy(() => import('./components/settings/KeyboardHelp'));
const PronunciationSettings = lazy(() => import('./components/settings/PronunciationSettings'));
const ApiKeySettings = lazy(() => import('./components/settings/ApiKeySettings'));
const AudioPlayer = lazy(() => import('./components/shared/AudioPlayer'));

// Study stats - loaded after main content
const ReadingStats = lazy(() => import('./components/study/ReadingStats'));
const ReadingProgressBar = lazy(() => import('./components/study/ReadingProgressBar'));

// Dictionary modals - loaded on demand
const WordIntelligenceModal = lazy(() => import('./components/dictionary/WordIntelligenceModal'));

// =============================================================================
// Loading Fallbacks for Lazy Components
// =============================================================================

const ViewLoadingFallback = memo(() => (
  <div className="view-loading-container">
    <LoadingSkeleton type="card" count={3} />
  </div>
));

const ModalLoadingFallback = memo(() => (
  <div className="modal-loading-container">
    <LoadingSkeleton type="spinner" message={{ hebrew: 'טוען...', english: 'Loading...' }} />
  </div>
));

const PanelLoadingFallback = memo(() => (
  <LoadingSkeleton type="panel" count={5} />
));

// =============================================================================
// Main App Component
// =============================================================================

function App() {
  // Context
  const torah = useTorah();
  const settings = useSettings();
  const study = useStudy();

  // Hooks
  const isOnline = useOnlineStatus();
  const { modals, handlers } = useModals();
  const { view, setView, goToReader, toggleView } = useViewRouting(torah.book, torah.chapter);
  const { getShareLink } = useUrlState(torah.book, torah.chapter, torah.goTo);

  // Initialize dictionary preloading AFTER initial render (deferred for fast startup).
  // Scoped to the current book's category so we don't pull ~78MB of lexicons
  // that are irrelevant to the passage being read.
  useEffect(() => {
    // Use requestIdleCallback to defer preloading until browser is idle
    const schedulePreload = window.requestIdleCallback || ((cb) => setTimeout(cb, 100));

    const preloadId = schedulePreload(() => {
      // Defer dictionary preload to not block initial render
      initializePreload({ book: torah.book });

      // PRO SCHOLAR V7: Preload common words for faster lookups (also deferred)
      setTimeout(() => {
        preloadCommonWords().catch(err => {
          console.debug('[App] Preload error:', err.message);
        });
      }, 500); // Extra delay for word preload
    }, { timeout: 2000 }); // Max 2 seconds before forcing preload

    return () => {
      if (window.cancelIdleCallback) {
        window.cancelIdleCallback(preloadId);
      }
    };
    // Intentionally only runs once at mount; navigation-driven top-ups are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When the user navigates to a different book category, top up the lexicons
  // for that category. Idempotent: no-ops if already loaded.
  useEffect(() => {
    if (!torah.book) return;
    preloadForBook(torah.book).catch(err => {
      console.debug('[App] preloadForBook error:', err?.message);
    });
  }, [torah.book]);

  // Index loaded verses into the semantic search corpus so SmartSearch has something to match.
  // Runs on every chapter load; indexVerse is a cheap idempotent upsert.
  useEffect(() => {
    if (!Array.isArray(torah.verses) || torah.verses.length === 0 || !torah.book) return;
    const payload = torah.verses.map(v => ({
      ref: `${torah.book} ${torah.chapter}:${v.verse}`,
      hebrew: v.hebrewText || '',
      english: v.englishText || ''
    }));
    try {
      indexVerses(payload);
    } catch (err) {
      console.debug('[App] indexVerses error:', err?.message);
    }
  }, [torah.book, torah.chapter, torah.verses]);

  // =============================================================================
  // Event Handlers
  // =============================================================================

  const handleNavigate = useCallback((book, chapter) => {
    torah.goTo(book, chapter);
  }, [torah]);

  const handleBookmark = useCallback((verse) => {
    study.addBookmark(verse, torah.book, torah.chapter);
  }, [study, torah.book, torah.chapter]);

  const handleSaveWord = useCallback((word, english, french) => {
    study.saveWord(word, english, french, torah.book, torah.chapter);
  }, [study, torah.book, torah.chapter]);

  const handleSearchSelect = useCallback((result) => {
    const match = result.ref?.match(/^(.+?)\s+(\d+):(\d+)/);
    if (match) {
      handleNavigate(match[1], parseInt(match[2]));
    }
    handlers.smartSearch.close();
  }, [handleNavigate, handlers.smartSearch]);

  // =============================================================================
  // Keyboard Shortcuts
  // =============================================================================

  const shortcuts = useMemo(() => [
    { key: 'b', ctrl: true, handler: () => toggleView('bookmarks') },
    { key: 'h', ctrl: true, handler: () => toggleView('history') },
    { key: 'd', ctrl: true, handler: () => settings.toggleDarkMode?.() },
    { key: 'f', ctrl: true, handler: handlers.focus.toggle },
    { key: 'ArrowLeft', ctrl: true, handler: () => torah.prevChapter?.() },
    { key: 'ArrowRight', ctrl: true, handler: () => torah.nextChapter?.() },
    { key: '?', ctrl: false, shift: true, handler: handlers.help.toggle },
    { key: 'k', ctrl: true, handler: handlers.smartSearch.toggle },
    {
      key: 'Escape',
      ctrl: false,
      preventDefault: false,
      handler: () => {
        goToReader();
        handlers.help.close();
        handlers.pronunciation.close();
        handlers.audio.close();
        handlers.focus.close();
        handlers.aiSettings.close();
        handlers.smartSearch.close();
      }
    }
  ], [settings, torah, handlers, toggleView, goToReader]);

  useKeyboardShortcuts(shortcuts);

  // =============================================================================
  // View Content Renderer
  // =============================================================================

  const content = useMemo(() => {
    switch (view) {
      case 'bookmarks':
        return (
          <Suspense fallback={<ViewLoadingFallback />}>
            <ErrorBoundary name="Bookmarks">
              <Bookmarks
                bookmarks={study.bookmarks}
                onRemoveBookmark={study.removeBookmark}
                onSelectBookmark={(b) => handleNavigate(b.book, b.chapter)}
                onImportBookmarks={study.importBookmarks}
              />
            </ErrorBoundary>
          </Suspense>
        );

      case 'history':
        return (
          <Suspense fallback={<ViewLoadingFallback />}>
            <ErrorBoundary name="ReadingHistory">
              <ReadingHistory
                history={study.history}
                onSelect={handleNavigate}
                onClear={study.clearHistory}
              />
            </ErrorBoundary>
          </Suspense>
        );

      case 'vocabulary':
        return (
          <Suspense fallback={<ViewLoadingFallback />}>
            <ErrorBoundary name="VocabularyBank">
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
            </ErrorBoundary>
          </Suspense>
        );

      case 'discover':
        return (
          <Suspense fallback={<PanelLoadingFallback />}>
            <ErrorBoundary name="DiscoverPanel">
              <DiscoverPanel onNavigateToRef={handleNavigate} onClose={goToReader} />
            </ErrorBoundary>
          </Suspense>
        );

      case 'versions':
        if (!FEATURES.TEXT_VERSIONS) return null;
        return (
          <Suspense fallback={<ViewLoadingFallback />}>
            <ErrorBoundary name="TextVersions">
              <TextVersions book={torah.book} chapter={torah.chapter} onClose={goToReader} />
            </ErrorBoundary>
          </Suspense>
        );

      case 'traditional':
        return (
          <Suspense fallback={<ViewLoadingFallback />}>
            <ErrorBoundary name="TraditionalPageView">
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
                hasPrevChapter={torah.chapters?.indexOf(torah.chapter) > 0}
                hasNextChapter={torah.chapters?.indexOf(torah.chapter) < (torah.chapters?.length - 1)}
              />
            </ErrorBoundary>
          </Suspense>
        );

      case 'study':
        return (
          <Suspense fallback={<ViewLoadingFallback />}>
            <ErrorBoundary name="StudyDashboard">
              <StudyDashboard
                onNavigateToText={(ref) => {
                  const parts = ref.split(' ');
                  const book = parts.slice(0, -1).join(' ');
                  const chapter = parts[parts.length - 1];
                  handleNavigate(book, parseInt(chapter) || chapter);
                }}
                onOpenVocabulary={() => setView('vocabulary')}
                onOpenBookmarks={() => setView('bookmarks')}
                onOpenNotes={() => setView('reader')}
              />
            </ErrorBoundary>
          </Suspense>
        );

      default:
        return torah.error ? (
          <FriendlyError
            type={
              torah.error.includes('network') || torah.error.includes('fetch') ? 'network' :
              torah.error.includes('not found') ? 'notFound' :
              torah.error.includes('timeout') ? 'timeout' : 'generic'
            }
            message={torah.error}
            onRetry={() => torah.goTo(torah.book, torah.chapter)}
            onGoHome={() => handleNavigate('Genesis', 1)}
          />
        ) : (
          <ErrorBoundary name="TorahReader">
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
              onNavigateToRef={handleNavigate}
              onPrevChapter={torah.prevChapter}
              onNextChapter={torah.nextChapter}
              totalChapters={torah.chapters?.length}
            />
            <Suspense fallback={null}>
              <ReadingStats
                book={torah.book}
                chapter={torah.chapter}
                totalChapters={torah.chapters?.length}
                verseCount={torah.verses?.length || 0}
                readingHistory={study.history}
              />
            </Suspense>
          </ErrorBoundary>
        );
    }
  }, [view, study, torah, settings, handleNavigate, handleBookmark, handleSaveWord, getShareLink, goToReader, setView]);

  // =============================================================================
  // Render
  // =============================================================================

  const appClassName = [
    'app',
    settings.darkMode && 'dark-mode',
    settings.sidebarCollapsed && 'sidebar-collapsed'
  ].filter(Boolean).join(' ');

  return (
    <div className={appClassName}>
      {/* Accessibility: Skip Link */}
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>

      {/* Focus Mode Overlay */}
      {modals.focus && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <ErrorBoundary name="FocusMode">
            <FocusMode
              verses={torah.verses}
              onkelos={torah.onkelos}
              selectedBook={torah.book}
              selectedChapter={torah.chapter}
              showOnkelos={settings.showOnkelos}
              isActive={modals.focus}
              onClose={handlers.focus.close}
              onPrevChapter={torah.prevChapter}
              onNextChapter={torah.nextChapter}
              onBookmarkVerse={handleBookmark}
            />
          </ErrorBoundary>
        </Suspense>
      )}

      {/* Sidebar */}
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

      {/* Main Content */}
      <main id="main-content" className="app-main" role="main">
        {/* Progress Bar */}
        {view === 'reader' && (
          <Suspense fallback={null}>
            <ReadingProgressBar
              currentVerse={torah.selectedVerse || 0}
              totalVerses={torah.verses?.length || 0}
              book={torah.book}
              chapter={torah.chapter}
            />
          </Suspense>
        )}

        {/* Offline Banner */}
        {!isOnline && (
          <div className="offline-banner">
            <OfflineIcon size={16} />
            You are offline - some features may be limited
          </div>
        )}

        {/* Header */}
        <header className="app-header">
          <div className="header-brand">
            <button
              className="sidebar-toggle-btn"
              onClick={settings.toggleSidebar}
              title="Toggle sidebar"
              aria-label="Toggle sidebar"
            >
              <MenuIcon />
            </button>
            <h1>Sefarim Reader</h1>
          </div>

          <div className="header-spacer" />
          <HeaderGreeting />

          {/* Search Button */}
          <button
            className="smart-search-btn"
            onClick={handlers.smartSearch.open}
            title="Smart Search (Ctrl+K)"
          >
            <SearchIcon />
            <span className="search-label">Search...</span>
            <kbd className="search-kbd">⌘K</kbd>
          </button>

          <ConnectivityIndicator compact />
          <div className="header-spacer" />

          {/* Toolbar */}
          <div className="header-toolbar">
            <div className="toolbar-group primary">
              <button
                onClick={() => toggleView('traditional')}
                className={`toolbar-btn ${view === 'traditional' ? 'active' : ''}`}
                title="Traditional Page Layout"
              >
                <GridIcon />
                <span className="btn-label">צורת הדף</span>
              </button>
              <button
                onClick={handlers.focus.open}
                className="toolbar-btn"
                title="Focus Mode (Ctrl+F)"
              >
                <FocusIcon />
                <span className="btn-label">Focus</span>
              </button>
            </div>

            <div className="toolbar-divider" />

            <QuickActions
              onOpenDiscover={() => toggleView('discover')}
              onOpenVersions={() => toggleView('versions')}
              onOpenVocabulary={() => toggleView('vocabulary')}
              onOpenBookmarks={() => toggleView('bookmarks')}
              onOpenHistory={() => toggleView('history')}
              vocabularyCount={study.vocabulary.length}
              isDiscoverActive={view === 'discover'}
              isVersionsActive={view === 'versions'}
              isVocabularyActive={view === 'vocabulary'}
              currentTradition={settings.tradition}
            />

            <div className="toolbar-divider" />

            <button
              onClick={settings.toggleDarkMode}
              className="toolbar-btn icon-only theme-toggle"
              aria-label="Toggle dark mode"
              title={settings.darkMode ? 'Light Mode (Ctrl+D)' : 'Dark Mode (Ctrl+D)'}
            >
              {settings.darkMode ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
        </header>

        {/* Breadcrumb */}
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

        {/* Content */}
        <div className="main-content">{content}</div>
      </main>

      {/* Mobile FAB */}
      <FloatingActionButton
        onTraditional={() => toggleView('traditional')}
        onBookmark={() => toggleView('bookmarks')}
        isVisible={view === 'reader'}
      />

      {/* Modals - Lazy loaded for performance */}
      {modals.help && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <KeyboardHelp isOpen={modals.help} onClose={handlers.help.close} />
        </Suspense>
      )}

      {modals.pronunciation && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <PronunciationSettings
            currentTradition={settings.tradition}
            onTraditionChange={settings.setTradition}
            isOpen={modals.pronunciation}
            onClose={handlers.pronunciation.close}
          />
        </Suspense>
      )}

      {modals.audio && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <AudioPlayer
            verses={torah.verses}
            selectedBook={torah.book}
            selectedChapter={torah.chapter}
            isOpen={modals.audio}
            onClose={handlers.audio.close}
          />
        </Suspense>
      )}

      {modals.aiSettings && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <div className="api-key-modal-overlay" onClick={handlers.aiSettings.close}>
            <div onClick={(e) => e.stopPropagation()}>
              <ApiKeySettings onClose={handlers.aiSettings.close} />
            </div>
          </div>
        </Suspense>
      )}

      {modals.smartSearch && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <div className="smart-search-modal-overlay" onClick={handlers.smartSearch.close}>
            <div className="smart-search-modal" onClick={(e) => e.stopPropagation()}>
              <SmartSearch
                onSelectVerse={handleSearchSelect}
                onClose={handlers.smartSearch.close}
                placeholder="Search Torah verses naturally..."
                showHistory={true}
              />
            </div>
          </div>
        </Suspense>
      )}

      {/* Word Intelligence Modal - globally available */}
      {modals.wordDetail && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <WordIntelligenceModal />
        </Suspense>
      )}
    </div>
  );
}

export default App;
