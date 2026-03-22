import { useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getReadPath, getTraditionalPath, getVersionsPath } from '../config/routes';

/**
 * useViewRouting - Manages view state based on URL routing
 */
const useViewRouting = (book, chapter) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Derive current view from URL path
  const view = useMemo(() => {
    const path = location.pathname;
    const viewMap = {
      '/bookmarks': 'bookmarks',
      '/history': 'history',
      '/vocabulary': 'vocabulary',
      '/discover': 'discover',
      '/study': 'study',
      '/versions': 'versions',
      '/traditional': 'traditional'
    };

    for (const [prefix, viewName] of Object.entries(viewMap)) {
      if (path.startsWith(prefix)) return viewName;
    }
    return 'reader';
  }, [location.pathname]);

  // Navigate to a specific view
  const setView = useCallback((newViewOrFn) => {
    const newView = typeof newViewOrFn === 'function' ? newViewOrFn(view) : newViewOrFn;

    const routes = {
      bookmarks: '/bookmarks',
      history: '/history',
      vocabulary: '/vocabulary',
      discover: '/discover',
      study: '/study',
      versions: getVersionsPath(book, chapter),
      traditional: getTraditionalPath(book, chapter),
      reader: getReadPath(book, chapter)
    };

    navigate(routes[newView] || routes.reader);
  }, [navigate, view, book, chapter]);

  // Navigate to reader view
  const goToReader = useCallback(() => {
    navigate(getReadPath(book, chapter));
  }, [navigate, book, chapter]);

  // Navigate to a specific book/chapter
  const navigateTo = useCallback((newBook, newChapter) => {
    navigate(getReadPath(newBook, newChapter));
  }, [navigate]);

  // Toggle between current view and reader
  const toggleView = useCallback((viewName) => {
    setView(v => v === viewName ? 'reader' : viewName);
  }, [setView]);

  return {
    view,
    setView,
    goToReader,
    navigateTo,
    toggleView,
    isReader: view === 'reader'
  };
};

export default useViewRouting;
