/**
 * useDebounce Tests
 *
 * Tests the debounce hook functionality including:
 * - Callback debouncing with delay
 * - Value debouncing
 * - Cleanup on unmount
 * - Multiple rapid calls
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useDebounce, useDebouncedValue } from './useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('useDebounce (callback)', () => {
    it('should return a debounced function', () => {
      const callback = jest.fn();
      const { result } = renderHook(() => useDebounce(callback, 300));

      expect(typeof result.current).toBe('function');
    });

    it('should not call callback immediately', () => {
      const callback = jest.fn();
      const { result } = renderHook(() => useDebounce(callback, 300));

      act(() => {
        result.current('test');
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it('should call callback after delay', () => {
      const callback = jest.fn();
      const { result } = renderHook(() => useDebounce(callback, 300));

      act(() => {
        result.current('test');
      });

      expect(callback).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(callback).toHaveBeenCalledWith('test');
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should reset timer on rapid calls', () => {
      const callback = jest.fn();
      const { result } = renderHook(() => useDebounce(callback, 300));

      act(() => {
        result.current('first');
        jest.advanceTimersByTime(100);
        result.current('second');
        jest.advanceTimersByTime(100);
        result.current('third');
      });

      expect(callback).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(callback).toHaveBeenCalledWith('third');
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should pass multiple arguments to callback', () => {
      const callback = jest.fn();
      const { result } = renderHook(() => useDebounce(callback, 300));

      act(() => {
        result.current('arg1', 'arg2', 'arg3');
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(callback).toHaveBeenCalledWith('arg1', 'arg2', 'arg3');
    });

    it('should use default delay of 300ms', () => {
      const callback = jest.fn();
      const { result } = renderHook(() => useDebounce(callback));

      act(() => {
        result.current('test');
      });

      act(() => {
        jest.advanceTimersByTime(299);
      });

      expect(callback).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(1);
      });

      expect(callback).toHaveBeenCalled();
    });

    it('should use custom delay', () => {
      const callback = jest.fn();
      const { result } = renderHook(() => useDebounce(callback, 500));

      act(() => {
        result.current('test');
      });

      act(() => {
        jest.advanceTimersByTime(499);
      });

      expect(callback).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(1);
      });

      expect(callback).toHaveBeenCalled();
    });

    it('should cleanup timeout on unmount', () => {
      const callback = jest.fn();
      const { result, unmount } = renderHook(() => useDebounce(callback, 300));

      act(() => {
        result.current('test');
      });

      unmount();

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it('should update callback reference when callback changes', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      const { result, rerender } = renderHook(
        ({ cb }) => useDebounce(cb, 300),
        { initialProps: { cb: callback1 } }
      );

      act(() => {
        result.current('test');
      });

      // Change callback before timeout fires
      rerender({ cb: callback2 });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledWith('test');
    });

    it('should allow multiple separate debounced calls after delay', () => {
      const callback = jest.fn();
      const { result } = renderHook(() => useDebounce(callback, 300));

      // First call
      act(() => {
        result.current('first');
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(callback).toHaveBeenCalledWith('first');
      expect(callback).toHaveBeenCalledTimes(1);

      // Second call (after first completed)
      act(() => {
        result.current('second');
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(callback).toHaveBeenCalledWith('second');
      expect(callback).toHaveBeenCalledTimes(2);
    });
  });

  describe('useDebouncedValue', () => {
    it('should return initial value immediately', () => {
      const { result } = renderHook(() => useDebouncedValue('initial', 300));

      expect(result.current).toBe('initial');
    });

    it('should not update value immediately when input changes', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebouncedValue(value, 300),
        { initialProps: { value: 'initial' } }
      );

      rerender({ value: 'updated' });

      expect(result.current).toBe('initial');
    });

    it('should update value after delay', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebouncedValue(value, 300),
        { initialProps: { value: 'initial' } }
      );

      rerender({ value: 'updated' });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(result.current).toBe('updated');
    });

    it('should only reflect final value after rapid changes', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebouncedValue(value, 300),
        { initialProps: { value: 'initial' } }
      );

      rerender({ value: 'first' });
      act(() => jest.advanceTimersByTime(100));

      rerender({ value: 'second' });
      act(() => jest.advanceTimersByTime(100));

      rerender({ value: 'third' });
      act(() => jest.advanceTimersByTime(100));

      // Still shows initial because no 300ms has passed without change
      expect(result.current).toBe('initial');

      act(() => {
        jest.advanceTimersByTime(200);
      });

      expect(result.current).toBe('third');
    });

    it('should handle object values', () => {
      const initial = { name: 'test', count: 0 };
      const updated = { name: 'updated', count: 1 };

      const { result, rerender } = renderHook(
        ({ value }) => useDebouncedValue(value, 300),
        { initialProps: { value: initial } }
      );

      expect(result.current).toEqual(initial);

      rerender({ value: updated });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(result.current).toEqual(updated);
    });

    it('should handle null and undefined values', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebouncedValue(value, 300),
        { initialProps: { value: 'initial' } }
      );

      rerender({ value: null });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(result.current).toBeNull();

      rerender({ value: undefined });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(result.current).toBeUndefined();
    });

    it('should handle numeric values', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebouncedValue(value, 300),
        { initialProps: { value: 0 } }
      );

      expect(result.current).toBe(0);

      rerender({ value: 42 });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(result.current).toBe(42);
    });

    it('should use default delay of 300ms', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebouncedValue(value),
        { initialProps: { value: 'initial' } }
      );

      rerender({ value: 'updated' });

      act(() => {
        jest.advanceTimersByTime(299);
      });

      expect(result.current).toBe('initial');

      act(() => {
        jest.advanceTimersByTime(1);
      });

      expect(result.current).toBe('updated');
    });

    it('should cleanup timeout on unmount', () => {
      const { result, rerender, unmount } = renderHook(
        ({ value }) => useDebouncedValue(value, 300),
        { initialProps: { value: 'initial' } }
      );

      rerender({ value: 'updated' });

      // Unmount before timeout fires - should not cause errors
      unmount();

      // This should not throw
      act(() => {
        jest.advanceTimersByTime(300);
      });
    });
  });
});
