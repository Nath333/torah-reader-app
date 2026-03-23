/**
 * useAsyncOperation Tests
 *
 * Tests the async operation hook including:
 * - Loading states
 * - Error handling
 * - Abort controller support
 * - Success/error callbacks
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useAsyncOperation, useAsyncCallback } from './useAsyncOperation';

describe('useAsyncOperation', () => {
  describe('initial state', () => {
    it('should have correct initial state', () => {
      const asyncFn = jest.fn();
      const { result } = renderHook(() => useAsyncOperation(asyncFn));

      expect(result.current.data).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);
    });

    it('should use custom initialData', () => {
      const asyncFn = jest.fn();
      const { result } = renderHook(() =>
        useAsyncOperation(asyncFn, { initialData: { foo: 'bar' } })
      );

      expect(result.current.data).toEqual({ foo: 'bar' });
    });
  });

  describe('execute', () => {
    it('should set loading state during execution', async () => {
      const asyncFn = jest.fn(() => new Promise(resolve =>
        setTimeout(() => resolve('result'), 50)
      ));

      const { result } = renderHook(() => useAsyncOperation(asyncFn));

      act(() => {
        result.current.execute();
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should set data on success', async () => {
      const asyncFn = jest.fn().mockResolvedValue('success data');
      const { result } = renderHook(() => useAsyncOperation(asyncFn));

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.data).toBe('success data');
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.isError).toBe(false);
    });

    it('should set error on failure', async () => {
      const error = new Error('Test error');
      const asyncFn = jest.fn().mockRejectedValue(error);
      const { result } = renderHook(() => useAsyncOperation(asyncFn));

      await act(async () => {
        try {
          await result.current.execute();
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe(error);
      expect(result.current.isError).toBe(true);
      expect(result.current.isSuccess).toBe(false);
    });

    it('should pass arguments to async function', async () => {
      const asyncFn = jest.fn().mockResolvedValue('result');
      const { result } = renderHook(() => useAsyncOperation(asyncFn));

      await act(async () => {
        await result.current.execute('arg1', 'arg2');
      });

      expect(asyncFn).toHaveBeenCalledWith('arg1', 'arg2', expect.objectContaining({
        signal: expect.any(AbortSignal)
      }));
    });

    it('should pass abort signal to async function', async () => {
      const asyncFn = jest.fn().mockResolvedValue('result');
      const { result } = renderHook(() => useAsyncOperation(asyncFn));

      await act(async () => {
        await result.current.execute();
      });

      const callArgs = asyncFn.mock.calls[0];
      const lastArg = callArgs[callArgs.length - 1];
      expect(lastArg.signal).toBeInstanceOf(AbortSignal);
    });
  });

  describe('callbacks', () => {
    it('should call onSuccess callback', async () => {
      const onSuccess = jest.fn();
      const asyncFn = jest.fn().mockResolvedValue('data');

      const { result } = renderHook(() =>
        useAsyncOperation(asyncFn, { onSuccess })
      );

      await act(async () => {
        await result.current.execute();
      });

      expect(onSuccess).toHaveBeenCalledWith('data');
    });

    it('should call onError callback', async () => {
      const onError = jest.fn();
      const error = new Error('Test');
      const asyncFn = jest.fn().mockRejectedValue(error);

      const { result } = renderHook(() =>
        useAsyncOperation(asyncFn, { onError })
      );

      await act(async () => {
        try {
          await result.current.execute();
        } catch {
          // Expected
        }
      });

      expect(onError).toHaveBeenCalledWith(error);
    });
  });

  describe('abort handling', () => {
    it('should abort previous request when new one starts', async () => {
      let resolveFirst;
      const slowFn = jest.fn()
        .mockImplementationOnce(() => new Promise(resolve => {
          resolveFirst = resolve;
        }))
        .mockImplementationOnce(() => Promise.resolve('second'));

      const { result } = renderHook(() => useAsyncOperation(slowFn));

      // Start first request
      act(() => {
        result.current.execute();
      });

      // Start second request (should abort first)
      await act(async () => {
        await result.current.execute();
      });

      // First request's abort signal should be aborted
      const firstCallArgs = slowFn.mock.calls[0];
      const firstSignal = firstCallArgs[firstCallArgs.length - 1].signal;
      expect(firstSignal.aborted).toBe(true);
    });

    it('should ignore abort errors', async () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';

      const asyncFn = jest.fn().mockRejectedValue(abortError);
      const { result } = renderHook(() => useAsyncOperation(asyncFn));

      await act(async () => {
        try {
          await result.current.execute();
        } catch {
          // May or may not throw
        }
      });

      // Should not set error state for abort errors
      expect(result.current.isError).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset to initial state', async () => {
      const asyncFn = jest.fn().mockResolvedValue('data');
      const { result } = renderHook(() =>
        useAsyncOperation(asyncFn, { initialData: 'initial' })
      );

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.data).toBe('data');

      act(() => {
        result.current.reset();
      });

      expect(result.current.data).toBe('initial');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
    });
  });

  describe('setData', () => {
    it('should allow manual data updates', () => {
      const asyncFn = jest.fn();
      const { result } = renderHook(() => useAsyncOperation(asyncFn));

      act(() => {
        result.current.setData('manual data');
      });

      expect(result.current.data).toBe('manual data');
    });

    it('should support updater function', () => {
      const asyncFn = jest.fn();
      const { result } = renderHook(() =>
        useAsyncOperation(asyncFn, { initialData: { count: 0 } })
      );

      act(() => {
        result.current.setData(prev => ({ count: prev.count + 1 }));
      });

      expect(result.current.data).toEqual({ count: 1 });
    });
  });

  describe('immediate execution', () => {
    it('should execute immediately when configured', async () => {
      const asyncFn = jest.fn().mockResolvedValue('immediate result');

      renderHook(() =>
        useAsyncOperation(asyncFn, { immediate: true })
      );

      await waitFor(() => {
        expect(asyncFn).toHaveBeenCalled();
      });
    });

    it('should pass args for immediate execution', async () => {
      const asyncFn = jest.fn().mockResolvedValue('result');

      renderHook(() =>
        useAsyncOperation(asyncFn, { immediate: true, args: ['arg1'] })
      );

      await waitFor(() => {
        expect(asyncFn).toHaveBeenCalledWith('arg1', expect.anything());
      });
    });
  });
});

describe('useAsyncCallback', () => {
  it('should return callback and loading state', () => {
    const asyncFn = jest.fn();
    const { result } = renderHook(() => useAsyncCallback(asyncFn));

    expect(typeof result.current[0]).toBe('function');
    expect(result.current[1].isLoading).toBe(false);
    expect(result.current[1].error).toBeNull();
  });

  it('should set loading during execution', async () => {
    const asyncFn = jest.fn(() => new Promise(resolve =>
      setTimeout(() => resolve('result'), 50)
    ));

    const { result } = renderHook(() => useAsyncCallback(asyncFn));

    act(() => {
      result.current[0]();
    });

    expect(result.current[1].isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current[1].isLoading).toBe(false);
    });
  });

  it('should capture errors', async () => {
    const error = new Error('Callback error');
    const asyncFn = jest.fn().mockRejectedValue(error);

    const { result } = renderHook(() => useAsyncCallback(asyncFn));

    await act(async () => {
      try {
        await result.current[0]();
      } catch {
        // Expected
      }
    });

    expect(result.current[1].error).toBe(error);
  });
});
