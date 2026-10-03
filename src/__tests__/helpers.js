/**
 * Test Helper Utilities
 *
 * Shared utilities for test setup, mocking, and common test patterns.
 * Import these in your test files to reduce boilerplate.
 */

// =============================================================================
// LOCAL STORAGE MOCK
// =============================================================================

/**
 * Create a localStorage mock with full API
 * @returns {Object} Mock localStorage object
 */
export function createLocalStorageMock() {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] ?? null),
    setItem: vi.fn((key, value) => {
      store[key] = String(value);
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index) => Object.keys(store)[index] ?? null),
    // Helper to inspect store contents
    __getStore: () => ({ ...store }),
    __setStore: (newStore) => {
      store = { ...newStore };
    }
  };
}

/**
 * Setup localStorage mock on global/window
 * @returns {Object} The mock object for assertions
 */
export function setupLocalStorageMock() {
  const mock = createLocalStorageMock();
  Object.defineProperty(window, 'localStorage', { value: mock, writable: true });
  return mock;
}

// =============================================================================
// MATCH MEDIA MOCK
// =============================================================================

/**
 * Create a matchMedia mock
 * @param {boolean} matches - Whether the media query matches
 * @returns {Function} Mock matchMedia function
 */
export function createMatchMediaMock(matches = false) {
  return vi.fn((query) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }));
}

/**
 * Setup matchMedia mock on window
 * @param {boolean} matches - Whether dark mode is preferred
 * @returns {Function} The mock function for assertions
 */
export function setupMatchMediaMock(matches = false) {
  const mock = createMatchMediaMock(matches);
  Object.defineProperty(window, 'matchMedia', { value: mock, writable: true });
  return mock;
}

// =============================================================================
// TIMER UTILITIES
// =============================================================================

/**
 * Setup fake timers and return cleanup function
 * @returns {Function} Cleanup function to restore real timers
 */
export function setupTimers() {
  vi.useFakeTimers();
  return () => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  };
}

/**
 * Advance timers and flush promises
 * @param {number} ms - Milliseconds to advance
 */
export async function advanceTimersAndFlush(ms) {
  vi.advanceTimersByTime(ms);
  // Flush microtasks
  await Promise.resolve();
}

// =============================================================================
// FETCH MOCK
// =============================================================================

/**
 * Create a fetch mock that returns JSON data
 * @param {Object} data - Data to return
 * @param {Object} options - Optional response options
 * @returns {Function} Mock fetch function
 */
export function createFetchMock(data, options = {}) {
  const { status = 200, ok = true } = options;
  return vi.fn(() =>
    Promise.resolve({
      ok,
      status,
      json: () => Promise.resolve(data),
      text: () => Promise.resolve(JSON.stringify(data))
    })
  );
}

/**
 * Setup fetch mock on global
 * @param {Object} data - Data to return
 * @returns {Function} The mock function for assertions
 */
export function setupFetchMock(data) {
  const mock = createFetchMock(data);
  global.fetch = mock;
  return mock;
}

// =============================================================================
// INTERSECTION OBSERVER MOCK
// =============================================================================

/**
 * Create IntersectionObserver mock
 * @returns {Function} Mock constructor
 */
export function createIntersectionObserverMock() {
  return vi.fn(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
    takeRecords: vi.fn(() => [])
  }));
}

/**
 * Setup IntersectionObserver mock on window
 */
export function setupIntersectionObserverMock() {
  const mock = createIntersectionObserverMock();
  window.IntersectionObserver = mock;
  return mock;
}

// =============================================================================
// RESIZE OBSERVER MOCK
// =============================================================================

/**
 * Create ResizeObserver mock
 * @returns {Function} Mock constructor
 */
export function createResizeObserverMock() {
  return vi.fn(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn()
  }));
}

/**
 * Setup ResizeObserver mock on window
 */
export function setupResizeObserverMock() {
  const mock = createResizeObserverMock();
  window.ResizeObserver = mock;
  return mock;
}

// =============================================================================
// SPEECH SYNTHESIS MOCK
// =============================================================================

/**
 * Create SpeechSynthesis mock
 * @returns {Object} Mock speechSynthesis object
 */
export function createSpeechSynthesisMock() {
  return {
    speak: vi.fn(),
    cancel: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    getVoices: vi.fn(() => [
      { lang: 'he-IL', name: 'Hebrew Voice', default: true },
      { lang: 'en-US', name: 'English Voice', default: false }
    ]),
    speaking: false,
    paused: false,
    pending: false,
    onvoiceschanged: null
  };
}

/**
 * Setup SpeechSynthesis mock on window
 */
export function setupSpeechSynthesisMock() {
  const mock = createSpeechSynthesisMock();
  window.speechSynthesis = mock;
  window.SpeechSynthesisUtterance = vi.fn().mockImplementation((text) => ({
    text,
    voice: null,
    rate: 1,
    pitch: 1,
    volume: 1,
    onend: null,
    onerror: null,
    onstart: null
  }));
  return mock;
}

// =============================================================================
// RENDER HELPERS
// =============================================================================

/**
 * Wait for component to settle (useful after state updates)
 * @param {number} ms - Optional time to wait
 */
export async function waitForSettled(ms = 0) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Flush all promises in the queue
 */
export async function flushPromises() {
  await new Promise((resolve) => setImmediate(resolve));
}

// =============================================================================
// CLEANUP
// =============================================================================

/**
 * Reset all mocks and clear timers
 */
export function cleanupAll() {
  vi.clearAllMocks();
  vi.clearAllTimers();
  if (vi.isMockFunction(global.fetch)) {
    global.fetch.mockClear();
  }
}

export default {
  // LocalStorage
  createLocalStorageMock,
  setupLocalStorageMock,
  // MatchMedia
  createMatchMediaMock,
  setupMatchMediaMock,
  // Timers
  setupTimers,
  advanceTimersAndFlush,
  // Fetch
  createFetchMock,
  setupFetchMock,
  // Observers
  createIntersectionObserverMock,
  setupIntersectionObserverMock,
  createResizeObserverMock,
  setupResizeObserverMock,
  // Speech
  createSpeechSynthesisMock,
  setupSpeechSynthesisMock,
  // Render
  waitForSettled,
  flushPromises,
  // Cleanup
  cleanupAll
};

// =============================================================================
// VALIDATION TESTS FOR HELPERS
// =============================================================================

describe('Test Helpers', () => {
  describe('localStorage mock', () => {
    it('should create a functioning localStorage mock', () => {
      const mock = createLocalStorageMock();
      mock.setItem('key', 'value');
      expect(mock.getItem('key')).toBe('value');
    });
  });

  describe('matchMedia mock', () => {
    it('should create a functioning matchMedia mock', () => {
      const mock = createMatchMediaMock(true);
      const result = mock('(prefers-color-scheme: dark)');
      expect(result.matches).toBe(true);
    });
  });

  describe('fetch mock', () => {
    it('should create a functioning fetch mock', async () => {
      const mock = createFetchMock({ data: 'test' });
      const response = await mock();
      const json = await response.json();
      expect(json.data).toBe('test');
    });
  });

  describe('observer mocks', () => {
    it('should create IntersectionObserver mock', () => {
      const Mock = createIntersectionObserverMock();
      const observer = new Mock();
      expect(observer.observe).toBeDefined();
      expect(observer.disconnect).toBeDefined();
    });

    it('should create ResizeObserver mock', () => {
      const Mock = createResizeObserverMock();
      const observer = new Mock();
      expect(observer.observe).toBeDefined();
      expect(observer.disconnect).toBeDefined();
    });
  });

  describe('speechSynthesis mock', () => {
    it('should create speechSynthesis mock with voices', () => {
      const mock = createSpeechSynthesisMock();
      const voices = mock.getVoices();
      expect(voices.length).toBeGreaterThan(0);
      expect(voices.some(v => v.lang === 'he-IL')).toBe(true);
    });
  });
});
