import { useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { getReadPath, parseBookSlug } from '../config/routes';

/**
 * Sync app state with clean URL paths using React Router
 * Format: /read/Genesis/1 or /read/Genesis/1/5 (with verse)
 */
const useUrlState = (book, chapter, goTo) => {
  const navigate = useNavigate();
  const params = useParams();
  const location = useLocation();
  const isInternalUpdate = useRef(false);
  const initialLoad = useRef(true);
  // Track the last book/chapter we set to prevent URL sync from reverting
  const lastSetState = useRef({ book: null, chapter: null });

  // Update URL when state changes (only on reader view paths)
  // This effect runs FIRST to update the URL before the sync effect
  useEffect(() => {
    if (!book || !chapter || initialLoad.current) return;

    const currentPath = location.pathname;

    // Don't update URL if user is on a dedicated view page
    const viewPaths = ['/search', '/bookmarks', '/history', '/vocabulary', '/discover', '/study'];
    if (viewPaths.some(p => currentPath.startsWith(p))) {
      return;
    }

    const newPath = getReadPath(book, chapter);

    // Only update if on a reader-type path and it needs updating
    const isReaderPath = currentPath === '/' || currentPath.startsWith('/read') ||
                         currentPath.startsWith('/split') || currentPath.startsWith('/traditional') ||
                         currentPath.startsWith('/versions');

    if (isReaderPath && currentPath !== newPath && !currentPath.startsWith('/split') &&
        !currentPath.startsWith('/traditional') && !currentPath.startsWith('/versions')) {
      isInternalUpdate.current = true;
      lastSetState.current = { book, chapter };
      navigate(newPath, { replace: true });
    }
  }, [book, chapter, navigate, location.pathname]);

  // Parse URL params on mount and when params change
  // This syncs URL -> state (e.g., when user navigates via browser back/forward)
  useEffect(() => {
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }

    // Skip URL sync when chapter is empty (category change in progress)
    if (!chapter) {
      return;
    }

    const urlBook = parseBookSlug(params.book);
    const urlChapter = params.chapter;

    // Skip if URL matches what we just set programmatically
    // This prevents reverting during category/book changes
    if (lastSetState.current.book === book && lastSetState.current.chapter === chapter) {
      return;
    }

    if (urlBook && urlChapter && goTo) {
      // Only navigate if URL differs from current state AND URL is valid
      if (urlBook !== book || urlChapter !== String(chapter)) {
        goTo(urlBook, urlChapter, params.verse);
      }
    }
    initialLoad.current = false;
  }, [params, goTo, book, chapter]);

  // Generate shareable link with full URL (including basename for GitHub Pages)
  const getShareLink = useCallback((verse = null) => {
    const path = getReadPath(book, chapter, verse);
    const basename = process.env.PUBLIC_URL || '';
    return window.location.origin + basename + path;
  }, [book, chapter]);

  return { getShareLink };
};

export default useUrlState;
