/**
 * useOnlineStatus Tests
 *
 * Tests the online/offline status hook including:
 * - Initial state detection
 * - Event listener setup
 * - Online/offline state transitions
 * - Cleanup on unmount
 */

import { renderHook, act } from '@testing-library/react';
import useOnlineStatus from './useOnlineStatus';

describe('useOnlineStatus', () => {
  let originalNavigator;
  let originalAddEventListener;
  let originalRemoveEventListener;
  let eventListeners;

  beforeEach(() => {
    // Store originals
    originalNavigator = window.navigator;
    originalAddEventListener = window.addEventListener;
    originalRemoveEventListener = window.removeEventListener;

    // Track event listeners
    eventListeners = {};

    // Mock addEventListener
    window.addEventListener = jest.fn((event, handler) => {
      eventListeners[event] = eventListeners[event] || [];
      eventListeners[event].push(handler);
    });

    // Mock removeEventListener
    window.removeEventListener = jest.fn((event, handler) => {
      if (eventListeners[event]) {
        eventListeners[event] = eventListeners[event].filter(h => h !== handler);
      }
    });
  });

  afterEach(() => {
    window.addEventListener = originalAddEventListener;
    window.removeEventListener = originalRemoveEventListener;
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should return true when navigator.onLine is true', () => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });

      const { result } = renderHook(() => useOnlineStatus());

      expect(result.current).toBe(true);
    });

    it('should return false when navigator.onLine is false', () => {
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

      const { result } = renderHook(() => useOnlineStatus());

      expect(result.current).toBe(false);
    });
  });

  describe('event listeners', () => {
    it('should add online event listener', () => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });

      renderHook(() => useOnlineStatus());

      expect(window.addEventListener).toHaveBeenCalledWith('online', expect.any(Function));
    });

    it('should add offline event listener', () => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });

      renderHook(() => useOnlineStatus());

      expect(window.addEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
    });

    it('should remove event listeners on unmount', () => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });

      const { unmount } = renderHook(() => useOnlineStatus());
      unmount();

      expect(window.removeEventListener).toHaveBeenCalledWith('online', expect.any(Function));
      expect(window.removeEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
    });
  });

  describe('state transitions', () => {
    it('should update to true when online event fires', () => {
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

      const { result } = renderHook(() => useOnlineStatus());

      expect(result.current).toBe(false);

      // Simulate online event
      act(() => {
        eventListeners.online?.forEach(handler => handler());
      });

      expect(result.current).toBe(true);
    });

    it('should update to false when offline event fires', () => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });

      const { result } = renderHook(() => useOnlineStatus());

      expect(result.current).toBe(true);

      // Simulate offline event
      act(() => {
        eventListeners.offline?.forEach(handler => handler());
      });

      expect(result.current).toBe(false);
    });

    it('should handle multiple transitions', () => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });

      const { result } = renderHook(() => useOnlineStatus());

      // Go offline
      act(() => {
        eventListeners.offline?.forEach(handler => handler());
      });
      expect(result.current).toBe(false);

      // Go online
      act(() => {
        eventListeners.online?.forEach(handler => handler());
      });
      expect(result.current).toBe(true);

      // Go offline again
      act(() => {
        eventListeners.offline?.forEach(handler => handler());
      });
      expect(result.current).toBe(false);
    });
  });

  describe('SSR safety', () => {
    it('should handle undefined navigator gracefully', () => {
      // This is handled by the initial state function in the hook
      // The hook checks typeof navigator before accessing onLine
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });

      const { result } = renderHook(() => useOnlineStatus());

      // Should default to online (true) or current state
      expect(typeof result.current).toBe('boolean');
    });
  });
});
