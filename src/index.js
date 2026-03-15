import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import './utils/initApp'; // Initialize app (API keys, etc.)
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import reportWebVitals from './reportWebVitals';
import useDarkMode from './hooks/useDarkMode';
import { useScrollProgress } from './hooks/useScrollProgress';
import * as serviceWorker from './utils/serviceWorker';
import { TorahProvider, useTorah } from './context/TorahContext';
import { SettingsProvider } from './context/SettingsContext';
import { StudyProvider } from './context/StudyContext';

// Inner wrapper to connect StudyProvider with TorahContext
const StudyWrapper = ({ children }) => {
  const torah = useTorah();
  return (
    <StudyProvider book={torah.book} chapter={torah.chapter}>
      {children}
    </StudyProvider>
  );
};

const Root = () => {
  const { dark, set } = useDarkMode();
  const { progress, showScrollTop, scrollToTop } = useScrollProgress();

  return (
    <SettingsProvider darkMode={dark} toggleDarkMode={() => set('toggle')}>
      <TorahProvider>
        <StudyWrapper>
          <div className="reading-progress-container">
            <div
              className="reading-progress-bar"
              style={{ width: `${progress}%` }}
              role="progressbar"
              aria-valuenow={Math.round(progress)}
              aria-valuemin="0"
              aria-valuemax="100"
            />
          </div>

          <Routes>
            {/* Main reader routes with clean URLs */}
            <Route path="/" element={<App />} />
            <Route path="/read/:book/:chapter/:verse?" element={<App />} />
            <Route path="/search" element={<App />} />
            <Route path="/bookmarks" element={<App />} />
            <Route path="/history" element={<App />} />
            <Route path="/vocabulary" element={<App />} />
            <Route path="/discover" element={<App />} />
            <Route path="/study" element={<App />} />
            <Route path="/versions/:book/:chapter" element={<App />} />
            <Route path="/split/:book/:chapter" element={<App />} />
            <Route path="/traditional/:book/:chapter" element={<App />} />
            {/* Fallback to main app */}
            <Route path="*" element={<App />} />
          </Routes>

          {showScrollTop && (
            <button
              className={`scroll-to-top ${dark ? 'dark-mode' : ''}`}
              onClick={scrollToTop}
              aria-label="Scroll to top"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 15l-6-6-6 6" />
              </svg>
            </button>
          )}
        </StudyWrapper>
      </TorahProvider>
    </SettingsProvider>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
// Get basename for GitHub Pages deployment
const basename = process.env.PUBLIC_URL || '';

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter basename={basename}>
        <Root />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

// Register service worker for offline support
serviceWorker.register({
  onSuccess: () => console.log('[App] Offline support enabled'),
  onUpdate: () => console.log('[App] New version available')
});
