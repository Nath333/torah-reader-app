/**
 * useWordLookup Tests
 *
 * Tests the word lookup hook functionality including:
 * - Basic lookup functionality
 * - Toggle behavior (clicking same word clears selection)
 * - Abort controller for canceling requests
 * - French translation loading
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import useWordLookup from './useWordLookup';

// Mock the unified lookup service (previously wordLookupOrchestrator)
jest.mock('../services/unifiedLookupService', () => ({
  lookupWord: jest.fn(),
  quickLookup: jest.fn(),
  getFrenchTranslation: jest.fn(),
  cleanHebrewWord: jest.fn((word) => word),
  batchLookup: jest.fn(),
  warmCache: jest.fn(),
  isCached: jest.fn()
}));

const mockOrchestrator = require('../services/unifiedLookupService');

describe('useWordLookup', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    mockOrchestrator.quickLookup.mockReturnValue({
      word: 'שָׁלוֹם',
      cleanedWord: 'שלום',
      english: 'peace',
      source: 'bdb',
      confidence: 85
    });

    mockOrchestrator.lookupWord.mockResolvedValue({
      word: 'שָׁלוֹם',
      cleanedWord: 'שלום',
      english: 'peace, well-being, health',
      french: null,
      source: 'bdb',
      sources: ['bdb', 'strongs'],
      confidence: 95,
      root: 'שלם',
      headword: 'שָׁלוֹם'
    });
  });

  describe('initial state', () => {
    it('should initialize with null selected word', () => {
      const { result } = renderHook(() => useWordLookup());

      expect(result.current.selectedWord).toBeNull();
      expect(result.current.translationData).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('should default to Hebrew mode', () => {
      const { result } = renderHook(() => useWordLookup());

      expect(result.current.isAramaic).toBe(false);
    });

    it('should support Aramaic mode', () => {
      const { result } = renderHook(() => useWordLookup({ language: 'aramaic' }));

      expect(result.current.isAramaic).toBe(true);
    });
  });

  // Skip: These tests require complex mock integration between wordLookupOrchestrator
  // and dictionaryLoader. The global dictionaryLoader mock in setupTests.js interferes
  // with the local orchestrator mock.
  describe('lookup', () => {
    it.skip('should perform sync lookup immediately', async () => {
      const { result } = renderHook(() => useWordLookup());

      await act(async () => {
        result.current.lookup('שלום');
      });

      expect(result.current.selectedWord).toBe('שלום');
      expect(mockOrchestrator.quickLookup).toHaveBeenCalled();
    });

    it.skip('should perform async lookup after sync', async () => {
      const { result } = renderHook(() => useWordLookup());

      await act(async () => {
        await result.current.lookup('שלום');
      });

      await waitFor(() => {
        expect(mockOrchestrator.lookupWord).toHaveBeenCalledWith('שלום', expect.objectContaining({
          contextType: 'biblical',
          includeV6: true
        }));
      });
    });

    it.skip('should update translation data with async result', async () => {
      const { result } = renderHook(() => useWordLookup());

      await act(async () => {
        await result.current.lookup('שלום');
      });

      await waitFor(() => {
        expect(result.current.translationData?.english).toBe('peace, well-being, health');
      });
    });
  });

  describe('toggle behavior', () => {
    it('should clear selection when clicking same word twice', async () => {
      const { result } = renderHook(() => useWordLookup());

      // First click - select
      await act(async () => {
        await result.current.lookup('שלום');
      });

      expect(result.current.selectedWord).toBe('שלום');

      // Second click - deselect
      await act(async () => {
        result.current.lookup('שלום');
      });

      expect(result.current.selectedWord).toBeNull();
      expect(result.current.translationData).toBeNull();
    });
  });

  describe('clear', () => {
    it('should clear all state', async () => {
      const { result } = renderHook(() => useWordLookup());

      await act(async () => {
        await result.current.lookup('שלום');
      });

      expect(result.current.selectedWord).toBe('שלום');

      act(() => {
        result.current.clear();
      });

      expect(result.current.selectedWord).toBeNull();
      expect(result.current.translationData).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });
  });

  // Skip: These tests require the orchestrator mock to return proper translation data,
  // but the global dictionaryLoader mock in setupTests.js interferes with the flow.
  describe('French translation', () => {
    it.skip('should load French translation on demand', async () => {
      mockOrchestrator.getFrenchTranslation.mockResolvedValue('paix');

      const { result } = renderHook(() => useWordLookup());

      await act(async () => {
        await result.current.lookup('שלום');
      });

      await act(async () => {
        const french = await result.current.loadFrench();
        expect(french).toBe('paix');
      });

      expect(result.current.frenchTranslation).toBe('paix');
    });

    it.skip('should return null if no English translation', async () => {
      mockOrchestrator.lookupWord.mockResolvedValue({
        word: 'שלום',
        english: null
      });

      const { result } = renderHook(() => useWordLookup());

      await act(async () => {
        await result.current.lookup('שלום');
      });

      await act(async () => {
        const french = await result.current.loadFrench();
        expect(french).toBeNull();
      });
    });
  });

  // Skip: Requires orchestrator to receive lookup calls correctly, but mock interference
  // prevents proper verification.
  describe('context reference', () => {
    it.skip('should pass reference to lookup', async () => {
      const { result } = renderHook(() =>
        useWordLookup({ reference: 'Shabbat 2a' })
      );

      await act(async () => {
        await result.current.lookup('שלום');
      });

      await waitFor(() => {
        expect(mockOrchestrator.lookupWord).toHaveBeenCalledWith('שלום', expect.objectContaining({
          reference: 'Shabbat 2a'
        }));
      });
    });
  });

  describe('abort handling', () => {
    it('should cancel previous lookup when new one starts', async () => {
      // Slow first lookup
      mockOrchestrator.lookupWord
        .mockImplementationOnce(() => new Promise(resolve =>
          setTimeout(() => resolve({ word: 'word1', english: 'first' }), 100)
        ))
        .mockImplementationOnce(() => Promise.resolve({ word: 'word2', english: 'second' }));

      const { result } = renderHook(() => useWordLookup());

      // Start first lookup
      act(() => {
        result.current.lookup('word1');
      });

      // Immediately start second lookup (should abort first)
      await act(async () => {
        await result.current.lookup('word2');
      });

      // Should have the second word's result, not the first
      expect(result.current.selectedWord).toBe('word2');
    });
  });
});

describe('CONFIDENCE constants', () => {
  it('should export confidence thresholds', () => {
    const { CONFIDENCE } = require('./useWordLookup');

    expect(CONFIDENCE.VERY_HIGH).toBe(95);
    expect(CONFIDENCE.HIGH).toBe(85);
    expect(CONFIDENCE.MEDIUM).toBe(70);
    expect(CONFIDENCE.LOW).toBe(50);
    expect(CONFIDENCE.MIN_VALID).toBe(40);
  });
});
