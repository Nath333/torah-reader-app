import { useEffect, useCallback } from 'react';

const useKeyboardShortcuts = (shortcuts) => {
  const handleKeyDown = useCallback((e) => {
    for (const shortcut of shortcuts) {
      const { key, ctrl, meta, shift, alt, handler, preventDefault = true } = shortcut;

      const ctrlMatch = ctrl ? (e.ctrlKey || e.metaKey) : (!e.ctrlKey && !e.metaKey);
      const shiftMatch = shift ? e.shiftKey : !e.shiftKey;
      const altMatch = alt ? e.altKey : !e.altKey;

      // Handle meta key separately if specified
      const metaMatch = meta !== undefined ? (meta ? e.metaKey : !e.metaKey) : true;

      if (e.key.toLowerCase() === key.toLowerCase() && ctrlMatch && shiftMatch && altMatch && metaMatch) {
        if (preventDefault) {
          e.preventDefault();
        }
        handler(e);
        break;
      }
    }
  }, [shortcuts]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
};

export default useKeyboardShortcuts;
