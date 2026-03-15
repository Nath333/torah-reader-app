import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from './useLocalStorage';

describe('useLocalStorage', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    jest.clearAllMocks();
  });

  test('returns initial value when localStorage is empty', () => {
    const { result } = renderHook(() => useLocalStorage('testKey', 'initialValue'));
    expect(result.current[0]).toBe('initialValue');
  });

  test('returns stored value when localStorage has data', () => {
    localStorage.setItem('testKey', JSON.stringify('storedValue'));
    const { result } = renderHook(() => useLocalStorage('testKey', 'initialValue'));
    expect(result.current[0]).toBe('storedValue');
  });

  test('updates localStorage when value changes', () => {
    const { result } = renderHook(() => useLocalStorage('testKey', 'initialValue'));

    act(() => {
      result.current[1]('newValue');
    });

    expect(result.current[0]).toBe('newValue');
  });

  test('handles objects as values', () => {
    const initialObject = { name: 'test', count: 0 };
    const { result } = renderHook(() => useLocalStorage('objectKey', initialObject));

    expect(result.current[0]).toEqual(initialObject);

    act(() => {
      result.current[1]({ name: 'updated', count: 1 });
    });

    expect(result.current[0]).toEqual({ name: 'updated', count: 1 });
  });

  test('handles function updates', () => {
    const { result } = renderHook(() => useLocalStorage('counterKey', 0));

    act(() => {
      result.current[1](prev => prev + 1);
    });

    expect(result.current[0]).toBe(1);
  });

  test('handles arrays as values', () => {
    const { result } = renderHook(() => useLocalStorage('arrayKey', []));

    act(() => {
      result.current[1](['item1', 'item2']);
    });

    expect(result.current[0]).toEqual(['item1', 'item2']);
  });

  test('returns error state on quota exceeded', () => {
    // Mock localStorage.setItem to throw quota error
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = jest.fn(() => {
      const error = new DOMException('Quota exceeded', 'QuotaExceededError');
      throw error;
    });

    const { result } = renderHook(() => useLocalStorage('quotaKey', 'initial'));

    act(() => {
      result.current[1]('newValue');
    });

    // Should return error info
    expect(result.current[2].isQuotaExceeded).toBe(true);

    // Restore original
    Storage.prototype.setItem = originalSetItem;
  });
});
