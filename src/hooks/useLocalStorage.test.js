import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from './useLocalStorage';

describe('useLocalStorage', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
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
    // On REMPLIT la propriété window.localStorage (configurable) par un storage
    // factice : espionner setItem sur l'objet storage est avalé en silence par
    // certains environnements (jsdom sous Node 22/Linux — assignment sans effet).
    const fakeStorage = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('Quota exceeded', 'QuotaExceededError');
      },
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    };
    const originalDesc = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      enumerable: true,
      get: () => fakeStorage,
    });

    try {
      const { result } = renderHook(() => useLocalStorage('quotaKey', 'initial'));

      act(() => {
        result.current[1]('newValue');
      });

      // Should return error info
      expect(result.current[2].isQuotaExceeded).toBe(true);
    } finally {
      // Restore original descriptor
      Object.defineProperty(window, 'localStorage', originalDesc);
    }
  });

});
