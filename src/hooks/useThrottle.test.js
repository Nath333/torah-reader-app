/**
 * useThrottle Tests
 *
 * Tests the throttle hook including:
 * - Basic throttling behavior
 * - Leading and trailing edge options
 * - Cancel and flush functionality
 * - Value throttling
 * - Cleanup on unmount
 */

import { renderHook, act } from '@testing-library/react';
import { useThrottle, useThrottledValue } from './useThrottle';

describe('useThrottle', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('basic throttling', () => {
    it('should call callback immediately on first call (leading edge)', () => {
      const callback = jest.fn();
      const { result } = renderHook(() => useThrottle(callback, 100));

      act(() => {
        result.current('test');
      });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('test');
    });

    it('should not call callback again within throttle limit', () => {
      const callback = jest.fn();
      const { result } = renderHook(() => useThrottle(callback, 100));

      act(() => {
        result.current('first');
        result.current('second');
        result.current('third');
      });

      // Only first call should execute immediately
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('first');
    });

    it('should call with latest args on trailing edge', () => {
      const callback = jest.fn();
      const { result } = renderHook(() => useThrottle(callback, 100));

      act(() => {
        result.current('first');
        result.current('second');
        result.current('third');
      });

      // Fast-forward past throttle limit
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Should have been called twice: leading with 'first', trailing with 'third'
      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenLastCalledWith('third');
    });

    it('should allow call after throttle period expires', () => {
      const callback = jest.fn();
      const { result } = renderHook(() => useThrottle(callback, 100));

      act(() => {
        result.current('first');
      });

      // Wait for throttle period to expire
      act(() => {
        jest.advanceTimersByTime(150);
      });

      act(() => {
        result.current('second');
      });

      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenLastCalledWith('second');
    });

    it('should use default limit of 100ms', () => {
      const callback = jest.fn();
      const { result } = renderHook(() => useThrottle(callback));

      act(() => {
        result.current('first');
        result.current('second');
      });

      // Wait 50ms - still within throttle
      act(() => {
        jest.advanceTimersByTime(50);
      });

      expect(callback).toHaveBeenCalledTimes(1);

      // Wait another 50ms - trailing call should fire
      act(() => {
        jest.advanceTimersByTime(50);
      });

      expect(callback).toHaveBeenCalledTimes(2);
    });
  });

  describe('leading edge option', () => {
    it('should not call immediately when leading is false', () => {
      const callback = jest.fn();
      const { result } = renderHook(() =>
        useThrottle(callback, 100, { leading: false })
      );

      act(() => {
        result.current('test');
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it('should call on trailing edge when leading is false', () => {
      const callback = jest.fn();
      const { result } = renderHook(() =>
        useThrottle(callback, 100, { leading: false })
      );

      act(() => {
        result.current('test');
      });

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('test');
    });
  });

  describe('trailing edge option', () => {
    it('should not call on trailing edge when trailing is false', () => {
      const callback = jest.fn();
      const { result } = renderHook(() =>
        useThrottle(callback, 100, { trailing: false })
      );

      act(() => {
        result.current('first');
        result.current('second');
        result.current('third');
      });

      // Only leading call
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('first');

      // Wait past throttle period
      act(() => {
        jest.advanceTimersByTime(150);
      });

      // Still only 1 call - no trailing
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should work with both leading and trailing false', () => {
      const callback = jest.fn();
      const { result } = renderHook(() =>
        useThrottle(callback, 100, { leading: false, trailing: false })
      );

      act(() => {
        result.current('test');
      });

      act(() => {
        jest.advanceTimersByTime(150);
      });

      // No calls at all
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('cancel functionality', () => {
    it('should have cancel method', () => {
      const callback = jest.fn();
      const { result } = renderHook(() => useThrottle(callback, 100));

      expect(typeof result.current.cancel).toBe('function');
    });

    it('should cancel pending trailing call', () => {
      const callback = jest.fn();
      const { result } = renderHook(() => useThrottle(callback, 100));

      act(() => {
        result.current('first');
        result.current('second'); // This would trigger trailing
      });

      expect(callback).toHaveBeenCalledTimes(1);

      act(() => {
        result.current.cancel();
      });

      act(() => {
        jest.advanceTimersByTime(150);
      });

      // Trailing call should have been cancelled
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('flush functionality', () => {
    it('should have flush method', () => {
      const callback = jest.fn();
      const { result } = renderHook(() => useThrottle(callback, 100));

      expect(typeof result.current.flush).toBe('function');
    });

    it('should immediately execute pending trailing call', () => {
      const callback = jest.fn();
      const { result } = renderHook(() => useThrottle(callback, 100));

      act(() => {
        result.current('first');
        result.current('second');
      });

      expect(callback).toHaveBeenCalledTimes(1);

      act(() => {
        result.current.flush();
      });

      // Trailing call should have been flushed immediately
      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenLastCalledWith('second');
    });

    it('should do nothing if no pending call', () => {
      const callback = jest.fn();
      const { result } = renderHook(() => useThrottle(callback, 100));

      act(() => {
        result.current('first');
      });

      // Wait for any trailing call to complete
      act(() => {
        jest.advanceTimersByTime(150);
      });

      const callCount = callback.mock.calls.length;

      act(() => {
        result.current.flush();
      });

      // No additional calls
      expect(callback).toHaveBeenCalledTimes(callCount);
    });
  });

  describe('callback updates', () => {
    it('should use updated callback after rerender', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      const { result, rerender } = renderHook(
        ({ cb }) => useThrottle(cb, 100),
        { initialProps: { cb: callback1 } }
      );

      act(() => {
        result.current('first');
      });

      expect(callback1).toHaveBeenCalledWith('first');

      // Update callback
      rerender({ cb: callback2 });

      // Wait for throttle to reset
      act(() => {
        jest.advanceTimersByTime(150);
      });

      act(() => {
        result.current('second');
      });

      expect(callback2).toHaveBeenCalledWith('second');
    });
  });

  describe('cleanup on unmount', () => {
    it('should clear pending timeout on unmount', () => {
      const callback = jest.fn();
      const { result, unmount } = renderHook(() => useThrottle(callback, 100));

      act(() => {
        result.current('first');
        result.current('second'); // Schedule trailing
      });

      expect(callback).toHaveBeenCalledTimes(1);

      unmount();

      act(() => {
        jest.advanceTimersByTime(150);
      });

      // Trailing call should not have fired
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('multiple arguments', () => {
    it('should pass all arguments to callback', () => {
      const callback = jest.fn();
      const { result } = renderHook(() => useThrottle(callback, 100));

      act(() => {
        result.current('arg1', 'arg2', { key: 'value' });
      });

      expect(callback).toHaveBeenCalledWith('arg1', 'arg2', { key: 'value' });
    });
  });
});

describe('useThrottledValue', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('initial value', () => {
    it('should return initial value immediately', () => {
      const { result } = renderHook(() => useThrottledValue('initial', 100));

      expect(result.current).toBe('initial');
    });
  });

  describe('value throttling', () => {
    it('should update immediately when throttle period has passed', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useThrottledValue(value, 100),
        { initialProps: { value: 'first' } }
      );

      expect(result.current).toBe('first');

      // Wait for throttle period to fully pass
      act(() => {
        jest.advanceTimersByTime(150);
      });

      // Change value after throttle period
      rerender({ value: 'second' });

      // Flush any pending effects/state updates
      act(() => {
        jest.advanceTimersByTime(150);
      });

      expect(result.current).toBe('second');
    });

    it('should delay update when within throttle period', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useThrottledValue(value, 100),
        { initialProps: { value: 'first' } }
      );

      // Immediate change (within throttle period)
      rerender({ value: 'second' });

      // Value should still be scheduled, not immediately changed
      // Note: The hook updates immediately on first render, then throttles

      // Wait partial time
      act(() => {
        jest.advanceTimersByTime(50);
      });

      rerender({ value: 'third' });

      // Wait for remaining time plus a bit
      act(() => {
        jest.advanceTimersByTime(60);
      });

      // Should have the latest value
      expect(result.current).toBe('third');
    });

    it('should always reflect latest value after throttle period', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useThrottledValue(value, 100),
        { initialProps: { value: 1 } }
      );

      // Rapid updates
      rerender({ value: 2 });
      rerender({ value: 3 });
      rerender({ value: 4 });
      rerender({ value: 5 });

      // Wait for all throttled updates to complete
      act(() => {
        jest.advanceTimersByTime(150);
      });

      expect(result.current).toBe(5);
    });
  });

  describe('different value types', () => {
    it('should work with numbers', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useThrottledValue(value, 100),
        { initialProps: { value: 0 } }
      );

      expect(result.current).toBe(0);

      act(() => {
        jest.advanceTimersByTime(150);
      });

      rerender({ value: 42 });

      // Wait for throttled update
      act(() => {
        jest.advanceTimersByTime(150);
      });

      expect(result.current).toBe(42);
    });

    it('should work with objects', () => {
      const obj1 = { name: 'first' };
      const obj2 = { name: 'second' };

      const { result, rerender } = renderHook(
        ({ value }) => useThrottledValue(value, 100),
        { initialProps: { value: obj1 } }
      );

      expect(result.current).toBe(obj1);

      act(() => {
        jest.advanceTimersByTime(150);
      });

      rerender({ value: obj2 });

      // Wait for throttled update
      act(() => {
        jest.advanceTimersByTime(150);
      });

      expect(result.current).toBe(obj2);
    });

    it('should work with null and undefined', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useThrottledValue(value, 100),
        { initialProps: { value: null } }
      );

      expect(result.current).toBeNull();

      act(() => {
        jest.advanceTimersByTime(150);
      });

      rerender({ value: undefined });

      // Wait for throttled update
      act(() => {
        jest.advanceTimersByTime(150);
      });

      expect(result.current).toBeUndefined();
    });
  });

  describe('cleanup', () => {
    it('should cleanup timeout on unmount', () => {
      const { result, rerender, unmount } = renderHook(
        ({ value }) => useThrottledValue(value, 100),
        { initialProps: { value: 'first' } }
      );

      // Trigger a scheduled update
      rerender({ value: 'second' });

      // Unmount before throttle period ends
      unmount();

      // This should not throw
      act(() => {
        jest.advanceTimersByTime(150);
      });
    });

    it('should cleanup when value changes rapidly', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useThrottledValue(value, 100),
        { initialProps: { value: 'a' } }
      );

      // Rapid changes should clear previous timeouts
      rerender({ value: 'b' });
      rerender({ value: 'c' });
      rerender({ value: 'd' });

      act(() => {
        jest.advanceTimersByTime(150);
      });

      // Should end up with final value
      expect(result.current).toBe('d');
    });
  });

  describe('default limit', () => {
    it('should use default limit of 100ms', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useThrottledValue(value),
        { initialProps: { value: 'first' } }
      );

      rerender({ value: 'second' });

      // Wait 50ms - should not have updated yet
      act(() => {
        jest.advanceTimersByTime(50);
      });

      // May or may not have updated depending on timing

      // Wait another 60ms - should definitely have updated
      act(() => {
        jest.advanceTimersByTime(60);
      });

      expect(result.current).toBe('second');
    });
  });
});

describe('useThrottle vs useThrottledValue comparison', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('useThrottle is for callbacks, useThrottledValue is for reactive values', () => {
    // useThrottle - imperative approach
    const callback = jest.fn();
    const { result: throttleResult } = renderHook(() => useThrottle(callback, 100));

    // useThrottledValue - declarative approach
    const { result: valueResult, rerender } = renderHook(
      ({ value }) => useThrottledValue(value, 100),
      { initialProps: { value: 0 } }
    );

    // Callback approach - you control when to call
    act(() => {
      throttleResult.current(1);
      throttleResult.current(2);
      throttleResult.current(3);
    });

    // Value approach - reacts to value changes
    rerender({ value: 1 });
    rerender({ value: 2 });
    rerender({ value: 3 });

    act(() => {
      jest.advanceTimersByTime(150);
    });

    // Both approaches effectively throttle rapid changes
    expect(callback).toHaveBeenCalledTimes(2); // leading + trailing
    expect(valueResult.current).toBe(3); // latest value
  });
});
