import { useEffect, useCallback, useRef } from 'react';

const useKeyboardShortcuts = (shortcuts) => {
  // Use ref to store shortcuts to avoid dependency changes triggering re-renders
  const shortcutsRef = useRef(shortcuts);

  // Update ref when shortcuts change (no re-render triggered)
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const handleKeyDown = useCallback((e) => {
    const currentShortcuts = shortcutsRef.current;
    if (!currentShortcuts || !Array.isArray(currentShortcuts)) return;
    if (!e || typeof e.key !== 'string') return;

    const eventKey = e.key.toLowerCase();

    for (const shortcut of currentShortcuts) {
      if (!shortcut || typeof shortcut.key !== 'string' || !shortcut.handler) continue;

      const { key, ctrl, meta, shift, alt, handler, preventDefault = true } = shortcut;
      const shortcutKey = key.toLowerCase();

      const ctrlMatch = ctrl ? (e.ctrlKey || e.metaKey) : (!e.ctrlKey && !e.metaKey);
      const shiftMatch = shift ? e.shiftKey : !e.shiftKey;
      const altMatch = alt ? e.altKey : !e.altKey;
      const metaMatch = meta !== undefined ? (meta ? e.metaKey : !e.metaKey) : true;

      if (eventKey === shortcutKey && ctrlMatch && shiftMatch && altMatch && metaMatch) {
        if (preventDefault) {
          e.preventDefault();
        }
        handler(e);
        break;
      }
    }
  }, []); // Empty deps - always use ref for latest shortcuts

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
};

export default useKeyboardShortcuts;
