/**
 * Torah Reader App - Entry Point
 *
 * Application bootstrap with providers, routing, and global components
 */

// React
import React, { useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Styles
import './index.css';
import './styles/Toast.css';
import './styles/textLayers.css';
import './styles/cards.css';
import './styles/ui-components.css';

// App initialization
import './utils/initApp';

// Components
import App from './App';
import ErrorBoundary from './components/shared/ErrorBoundary';
import ScrollToTopButton from './components/shared/ScrollToTopButton';
import ReadingProgressIndicator from './components/shared/ReadingProgressIndicator';

// Hooks
import useDarkMode from './hooks/useDarkMode';
import { useScrollProgress } from './hooks/useScrollProgress';

// Context Providers
import { TorahProvider, useTorah } from './context/TorahContext';
import { SettingsProvider } from './context/SettingsContext';
import { StudyProvider } from './context/StudyContext';
import { StudyModeProvider } from './context/StudyModeContext';
import { ToastProvider } from './context/ToastContext';
import { CommentaryProvider } from './context/CommentaryContext';
import { ModalProvider } from './context/ModalContext';

// Utils
import reportWebVitals from './utils/reportWebVitals';
import * as serviceWorker from './utils/serviceWorker';

// =============================================================================
// App Routes Configuration
// =============================================================================

const APP_ROUTES = [
  { path: '/', element: <App /> },
  { path: '/read/:book/:chapter/:verse?', element: <App /> },
  { path: '/bookmarks', element: <App /> },
  { path: '/history', element: <App /> },
  { path: '/vocabulary', element: <App /> },
  { path: '/discover', element: <App /> },
  { path: '/study', element: <App /> },
  { path: '/versions/:book/:chapter', element: <App /> },
  { path: '/split/:book/:chapter', element: <App /> },
  { path: '/traditional/:book/:chapter', element: <App /> },
  { path: '*', element: <App /> }
];

// =============================================================================
// Provider Wrappers
// =============================================================================

/**
 * StudyWrapper - Connects StudyProvider with TorahContext
 */
const StudyWrapper = ({ children }) => {
  const { book, chapter } = useTorah();

  return (
    <StudyProvider book={book} chapter={chapter}>
      <StudyModeProvider>
        <CommentaryProvider>
          <ModalProvider>
            {children}
          </ModalProvider>
        </CommentaryProvider>
      </StudyModeProvider>
    </StudyProvider>
  );
};

// =============================================================================
// Root Component
// =============================================================================

const Root = () => {
  const { dark, set } = useDarkMode();
  const { progress, showScrollTop, scrollToTop } = useScrollProgress();
  const toggleDarkMode = useCallback(() => set('toggle'), [set]);

  return (
    <SettingsProvider darkMode={dark} toggleDarkMode={toggleDarkMode}>
      <ToastProvider>
        <TorahProvider>
          <StudyWrapper>
            <ReadingProgressIndicator progress={progress} />

            <Routes>
              {APP_ROUTES.map(({ path, element }) => (
                <Route key={path} path={path} element={element} />
              ))}
            </Routes>

            <ScrollToTopButton
              visible={showScrollTop}
              onClick={scrollToTop}
              darkMode={dark}
            />
          </StudyWrapper>
        </TorahProvider>
      </ToastProvider>
    </SettingsProvider>
  );
};

// =============================================================================
// App Bootstrap
// =============================================================================

const basename = process.env.PUBLIC_URL || '';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter basename={basename}>
        <Root />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);

// Performance monitoring
reportWebVitals();

// Service worker for offline support
serviceWorker.register({
  onSuccess: () => console.log('[App] Offline support enabled'),
  onUpdate: () => console.log('[App] New version available')
});
