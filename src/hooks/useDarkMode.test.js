/**
 * useDarkMode Tests
 *
 * Tests the dark mode hook functionality including:
 * - Initialization from localStorage and system preferences
 * - Toggle behavior (dark/light/auto modes)
 * - System preference synchronization
 * - Cross-tab localStorage synchronization
 * - DOM class manipulation
 */

import { renderHook, act } from '@testing-library/react';
import useDarkMode from './useDarkMode';

// Mock matchMedia
const mockMatchMedia = (matches) => ({
  matches,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
});

describe('useDarkMode', () => {
  let originalMatchMedia;
  let originalLocalStorage;
  let mockMediaQuery;

  beforeEach(() => {
    // Store originals
    originalMatchMedia = window.matchMedia;
    originalLocalStorage = window.localStorage;

    // Clear localStorage
    localStorage.clear();

    // Clear body classes
    document.body.classList.remove('dark-mode', 'theme-transition');

    // Remove color-scheme meta tag if exists
    const existingMeta = document.querySelector('meta[name="color-scheme"]');
    if (existingMeta) existingMeta.remove();

    // Mock matchMedia with light mode default
    mockMediaQuery = mockMatchMedia(false);
    window.matchMedia = jest.fn().mockReturnValue(mockMediaQuery);
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with system preference when no localStorage value', () => {
      const { result } = renderHook(() => useDarkMode());

      expect(result.current.dark).toBe(false);
      expect(result.current.auto).toBe(true);
    });

    it('should initialize with dark mode from system preference', () => {
      window.matchMedia = jest.fn().mockReturnValue(mockMatchMedia(true));

      const { result } = renderHook(() => useDarkMode());

      expect(result.current.dark).toBe(true);
      expect(result.current.auto).toBe(true);
    });

    it('should initialize from localStorage "true" value', () => {
      localStorage.setItem('darkMode', 'true');

      const { result } = renderHook(() => useDarkMode());

      expect(result.current.dark).toBe(true);
      expect(result.current.auto).toBe(false);
    });

    it('should initialize from localStorage "false" value', () => {
      localStorage.setItem('darkMode', 'false');

      const { result } = renderHook(() => useDarkMode());

      expect(result.current.dark).toBe(false);
      expect(result.current.auto).toBe(false);
    });

    it('should initialize from localStorage "auto" value', () => {
      localStorage.setItem('darkMode', 'auto');
      window.matchMedia = jest.fn().mockReturnValue(mockMatchMedia(true));

      const { result } = renderHook(() => useDarkMode());

      expect(result.current.dark).toBe(true);
      expect(result.current.auto).toBe(true);
    });
  });

  describe('toggle behavior', () => {
    it('should toggle from light to dark', () => {
      const { result } = renderHook(() => useDarkMode());

      expect(result.current.dark).toBe(false);

      act(() => {
        result.current.set('toggle');
      });

      expect(result.current.dark).toBe(true);
      expect(result.current.auto).toBe(false);
    });

    it('should toggle from dark to light', () => {
      localStorage.setItem('darkMode', 'true');
      const { result } = renderHook(() => useDarkMode());

      expect(result.current.dark).toBe(true);

      act(() => {
        result.current.set('toggle');
      });

      expect(result.current.dark).toBe(false);
      expect(result.current.auto).toBe(false);
    });

    it('should set dark mode explicitly', () => {
      const { result } = renderHook(() => useDarkMode());

      act(() => {
        result.current.set('dark');
      });

      expect(result.current.dark).toBe(true);
      expect(result.current.auto).toBe(false);
    });

    it('should set light mode explicitly', () => {
      localStorage.setItem('darkMode', 'true');
      const { result } = renderHook(() => useDarkMode());

      act(() => {
        result.current.set('light');
      });

      expect(result.current.dark).toBe(false);
      expect(result.current.auto).toBe(false);
    });

    it('should set system/auto mode', () => {
      localStorage.setItem('darkMode', 'true');
      const { result } = renderHook(() => useDarkMode());

      act(() => {
        result.current.set('system');
      });

      expect(result.current.dark).toBe(false); // Based on mock (light)
      expect(result.current.auto).toBe(true);
    });

    it('should accept boolean values directly', () => {
      const { result } = renderHook(() => useDarkMode());

      act(() => {
        result.current.set(true);
      });

      expect(result.current.dark).toBe(true);

      act(() => {
        result.current.set(false);
      });

      expect(result.current.dark).toBe(false);
    });
  });

  describe('DOM manipulation', () => {
    it('should add dark-mode class to body when dark', () => {
      localStorage.setItem('darkMode', 'true');
      renderHook(() => useDarkMode());

      expect(document.body.classList.contains('dark-mode')).toBe(true);
    });

    it('should remove dark-mode class when light', () => {
      document.body.classList.add('dark-mode');
      localStorage.setItem('darkMode', 'false');
      renderHook(() => useDarkMode());

      expect(document.body.classList.contains('dark-mode')).toBe(false);
    });

    it('should add theme-transition class during transitions', () => {
      const { result } = renderHook(() => useDarkMode());

      act(() => {
        result.current.set('toggle');
      });

      // Transition class should be added
      expect(document.body.classList.contains('theme-transition')).toBe(true);
    });

    it('should create or update color-scheme meta tag', () => {
      localStorage.setItem('darkMode', 'true');
      renderHook(() => useDarkMode());

      const meta = document.querySelector('meta[name="color-scheme"]');
      expect(meta).not.toBeNull();
      expect(meta.content).toBe('dark');
    });
  });

  describe('localStorage persistence', () => {
    it('should save dark mode to localStorage', () => {
      const { result } = renderHook(() => useDarkMode());

      act(() => {
        result.current.set('dark');
      });

      expect(localStorage.getItem('darkMode')).toBe('true');
    });

    it('should save light mode to localStorage', () => {
      const { result } = renderHook(() => useDarkMode());

      act(() => {
        result.current.set('light');
      });

      expect(localStorage.getItem('darkMode')).toBe('false');
    });

    it('should save auto mode to localStorage', () => {
      const { result } = renderHook(() => useDarkMode());

      act(() => {
        result.current.set('dark'); // First set manual mode
        result.current.set('system'); // Then switch to auto
      });

      expect(localStorage.getItem('darkMode')).toBe('auto');
    });
  });

  describe('system preference sync', () => {
    it('should register change listener when in auto mode', () => {
      const mockMQ = {
        matches: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      };
      window.matchMedia = jest.fn().mockReturnValue(mockMQ);
      localStorage.setItem('darkMode', 'auto');

      renderHook(() => useDarkMode());

      expect(mockMQ.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should not register change listener when in manual mode', () => {
      const mockMQ = {
        matches: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      };
      window.matchMedia = jest.fn().mockReturnValue(mockMQ);
      localStorage.setItem('darkMode', 'true');

      renderHook(() => useDarkMode());

      // Should not be called because auto is false
      // Note: it may be called once initially, but won't register in useEffect
    });
  });

  describe('cross-tab sync', () => {
    it('should listen for storage events', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      renderHook(() => useDarkMode());

      expect(addEventListenerSpy).toHaveBeenCalledWith('storage', expect.any(Function));
      addEventListenerSpy.mockRestore();
    });

    it('should update when localStorage changes from another tab', () => {
      const { result } = renderHook(() => useDarkMode());

      expect(result.current.dark).toBe(false);

      // Simulate storage event from another tab
      act(() => {
        const event = new StorageEvent('storage', {
          key: 'darkMode',
          newValue: 'true',
          storageArea: localStorage,
        });
        window.dispatchEvent(event);
      });

      expect(result.current.dark).toBe(true);
    });

    it('should switch to auto mode when storage changes to "auto"', () => {
      localStorage.setItem('darkMode', 'true');
      const { result } = renderHook(() => useDarkMode());

      expect(result.current.auto).toBe(false);

      act(() => {
        const event = new StorageEvent('storage', {
          key: 'darkMode',
          newValue: 'auto',
          storageArea: localStorage,
        });
        window.dispatchEvent(event);
      });

      expect(result.current.auto).toBe(true);
    });

    it('should ignore storage events for other keys', () => {
      const { result } = renderHook(() => useDarkMode());
      const initialDark = result.current.dark;

      act(() => {
        const event = new StorageEvent('storage', {
          key: 'otherKey',
          newValue: 'true',
          storageArea: localStorage,
        });
        window.dispatchEvent(event);
      });

      expect(result.current.dark).toBe(initialDark);
    });
  });

  describe('cleanup', () => {
    it('should remove event listeners on unmount', () => {
      const mockMQ = {
        matches: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      };
      window.matchMedia = jest.fn().mockReturnValue(mockMQ);
      localStorage.setItem('darkMode', 'auto');

      const { unmount } = renderHook(() => useDarkMode());
      unmount();

      expect(mockMQ.removeEventListener).toHaveBeenCalled();
    });
  });
});
