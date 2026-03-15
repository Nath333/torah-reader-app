/**
 * useScholarMode - Hook for integrating Scholar Mode features
 *
 * Provides easy access to all scholarly analysis features:
 * - Discourse pattern detection
 * - Named entity recognition
 * - Flow visualization data
 * - Scholarly API data fetching
 * - Vocalization toggle
 *
 * @example
 * const { isOpen, openScholarMode, closeScholarMode, analysisData } = useScholarMode();
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { getFlowDiagram, analyzeDiscourseStructure, detectDiscoursePatterns } from '../services/discoursePatternService';
import { getCompleteScholarlyAnalysis, addVocalization } from '../services/scholarlyApiService';
import { detectEntities, getEntityStatistics } from '../services/namedEntityService';

/**
 * useScholarMode Hook
 *
 * @param {Object} options
 * @param {string} options.text - Hebrew/Aramaic text to analyze
 * @param {string} options.reference - Sefaria reference (e.g., "Shabbat.2a")
 * @param {boolean} options.autoFetch - Auto-fetch scholarly data when reference changes
 */
export function useScholarMode(options = {}) {
  const { text = '', reference = '', autoFetch = true } = options;

  // Panel state
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('discourse');

  // Data state
  const [scholarlyData, setScholarlyData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Vocalization state
  const [isVocalized, setIsVocalized] = useState(false);
  const [vocalizedText, setVocalizedText] = useState(null);
  const [originalText, setOriginalText] = useState(text);

  // Local analysis (computed, no API needed)
  const discourseAnalysis = useMemo(() => {
    return text ? analyzeDiscourseStructure(text) : null;
  }, [text]);

  const flowData = useMemo(() => {
    return text ? getFlowDiagram(text) : null;
  }, [text]);

  const patterns = useMemo(() => {
    return text ? detectDiscoursePatterns(text) : [];
  }, [text]);

  const entities = useMemo(() => {
    return text ? detectEntities(text) : null;
  }, [text]);

  const entityStats = useMemo(() => {
    return text ? getEntityStatistics(text) : null;
  }, [text]);

  // Open/close handlers
  const openScholarMode = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeScholarMode = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleScholarMode = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  // Fetch scholarly data from Sefaria
  const fetchScholarlyData = useCallback(async () => {
    if (!reference) {
      setScholarlyData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getCompleteScholarlyAnalysis(reference, text);
      setScholarlyData(data);
    } catch (err) {
      console.error('Failed to fetch scholarly data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [reference, text]);

  // Auto-fetch when reference changes
  useEffect(() => {
    if (autoFetch && reference && isOpen) {
      fetchScholarlyData();
    }
  }, [autoFetch, reference, isOpen, fetchScholarlyData]);

  // Update original text when text prop changes
  useEffect(() => {
    if (!isVocalized) {
      setOriginalText(text);
    }
  }, [text, isVocalized]);

  // Vocalization handlers
  const addNikud = useCallback(async () => {
    if (!text || isVocalized) return text;

    try {
      setOriginalText(text);
      const vocalized = await addVocalization(text, 'rabbinic');
      setVocalizedText(vocalized);
      setIsVocalized(true);
      return vocalized;
    } catch (err) {
      console.error('Vocalization failed:', err);
      return text;
    }
  }, [text, isVocalized]);

  const removeNikud = useCallback(() => {
    if (!isVocalized) return originalText;

    setVocalizedText(null);
    setIsVocalized(false);
    return originalText;
  }, [isVocalized, originalText]);

  const toggleNikud = useCallback(async () => {
    if (isVocalized) {
      return removeNikud();
    } else {
      return addNikud();
    }
  }, [isVocalized, addNikud, removeNikud]);

  // Get current text (original or vocalized)
  const displayText = useMemo(() => {
    return isVocalized && vocalizedText ? vocalizedText : text;
  }, [isVocalized, vocalizedText, text]);

  // Check if text has Talmudic structure
  const hasTalmudicStructure = useMemo(() => {
    return patterns.length > 0;
  }, [patterns]);

  // Summary statistics
  const summary = useMemo(() => {
    return {
      // Discourse stats
      patterns: patterns.length,
      questions: discourseAnalysis?.statistics?.questions || 0,
      objections: discourseAnalysis?.statistics?.objections || 0,
      proofs: discourseAnalysis?.statistics?.proofs || 0,
      resolutions: discourseAnalysis?.statistics?.resolutions || 0,
      complexity: discourseAnalysis?.complexityLevel || 'unknown',

      // Entity stats
      rabbis: entityStats?.rabbis?.unique || 0,
      biblicalFigures: entityStats?.biblicalFigures?.unique || 0,
      places: entityStats?.places?.unique || 0,
      citations: entityStats?.citations?.total || 0,

      // Scholarly data stats (from API)
      commentaries: scholarlyData?.summary?.commentaryCount || 0,
      topics: scholarlyData?.topics?.length || 0,
      crossRefs: scholarlyData?.summary?.crossRefCount || 0,

      // Overall
      hasTalmudicStructure,
      hasScholarlyData: !!scholarlyData
    };
  }, [patterns, discourseAnalysis, entityStats, scholarlyData, hasTalmudicStructure]);

  return {
    // Panel state
    isOpen,
    activeTab,
    setActiveTab,
    openScholarMode,
    closeScholarMode,
    toggleScholarMode,

    // Loading state
    loading,
    error,

    // Local analysis (no API)
    discourseAnalysis,
    flowData,
    patterns,
    entities,
    entityStats,
    hasTalmudicStructure,

    // API data
    scholarlyData,
    fetchScholarlyData,

    // Vocalization
    isVocalized,
    displayText,
    addNikud,
    removeNikud,
    toggleNikud,

    // Summary
    summary,

    // Original text (for reference)
    originalText
  };
}

/**
 * useDiscoursePatterns - Lightweight hook for just discourse pattern detection
 *
 * @param {string} text - Text to analyze
 */
export function useDiscoursePatterns(text) {
  const patterns = useMemo(() => {
    return text ? detectDiscoursePatterns(text) : [];
  }, [text]);

  const analysis = useMemo(() => {
    return text ? analyzeDiscourseStructure(text) : null;
  }, [text]);

  const flowData = useMemo(() => {
    return text ? getFlowDiagram(text) : null;
  }, [text]);

  return {
    patterns,
    analysis,
    flowData,
    hasTalmudicStructure: patterns.length > 0,
    complexity: analysis?.complexityLevel || 'unknown',
    statistics: analysis?.statistics || {}
  };
}

/**
 * useNamedEntities - Lightweight hook for named entity detection
 *
 * @param {string} text - Text to analyze
 */
export function useNamedEntities(text) {
  const entities = useMemo(() => {
    return text ? detectEntities(text) : { rabbis: [], biblicalFigures: [], places: [], citations: [] };
  }, [text]);

  const statistics = useMemo(() => {
    return text ? getEntityStatistics(text) : null;
  }, [text]);

  return {
    ...entities,
    statistics,
    totalEntities: statistics?.totalEntities || 0
  };
}

export default useScholarMode;
