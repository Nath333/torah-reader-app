/**
 * CrossReferencesSection Component
 * Shows where the word appears in other texts with caching for performance
 */

import React, { useState, useEffect, useCallback, memo, useRef } from 'react';

// =============================================================================
// PERFORMANCE: Cross-Refs Cache (avoids repeated API calls)
// TTL-based with lazy eviction on get/set (no leaked intervals)
// =============================================================================
const _crossRefsCache = new Map();
const CROSS_REFS_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const CROSS_REFS_CACHE_MAX = 100;

const getCachedCrossRefs = (key) => {
  const cached = _crossRefsCache.get(key);
  if (cached && Date.now() - cached.timestamp < CROSS_REFS_CACHE_TTL) {
    return cached.data;
  }
  if (cached) _crossRefsCache.delete(key);
  return null;
};

const setCachedCrossRefs = (key, data) => {
  // Evict expired entries lazily when cache is full
  if (_crossRefsCache.size >= CROSS_REFS_CACHE_MAX) {
    const now = Date.now();
    for (const [k, entry] of _crossRefsCache.entries()) {
      if (now - entry.timestamp >= CROSS_REFS_CACHE_TTL) {
        _crossRefsCache.delete(k);
      }
    }
    // If still over limit, remove oldest entry
    if (_crossRefsCache.size >= CROSS_REFS_CACHE_MAX) {
      const oldestKey = _crossRefsCache.keys().next().value;
      _crossRefsCache.delete(oldestKey);
    }
  }
  _crossRefsCache.set(key, { data, timestamp: Date.now() });
};

/** Cross-reference categories for text sources */
const REFERENCE_CATEGORIES = [
  { key: 'tanakh', label: '📖 Tanakh' },
  { key: 'talmud', label: '📚 Talmud' },
  { key: 'midrash', label: '✨ Midrash' },
];

/**
 * Cross-References Section - Shows where the word appears in other texts
 * NOW WITH CACHING for better performance
 * @param {Object} props
 * @param {string} props.word - Hebrew word
 * @param {string} props.root - Root string
 * @param {Function} [props.onReferenceClick] - Callback when clicking a reference
 */
const CrossReferencesSection = memo(function CrossReferencesSection({ word, root, onReferenceClick }) {
  const [references, setReferences] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const abortControllerRef = useRef(null);

  const cacheKey = root || word;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Fetch cross-references on demand WITH CACHING
  const fetchReferences = useCallback(async () => {
    if (references || loading) return;

    // Check cache first
    const cached = getCachedCrossRefs(cacheKey);
    if (cached) {
      setReferences(cached);
      setFromCache(true);
      return;
    }

    // Abort any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    setLoading(true);
    setFromCache(false);

    try {
      // Try to fetch from Sefaria API
      const response = await fetch(
        `https://www.sefaria.org/api/words/${encodeURIComponent(cacheKey)}`,
        { signal: abortController.signal }
      );
      if (response.ok) {
        const data = await response.json();
        if (!abortController.signal.aborted) {
          const refs = {
            tanakh: data.tanakh_refs?.slice(0, 5) || [],
            talmud: data.talmud_refs?.slice(0, 5) || [],
            midrash: data.midrash_refs?.slice(0, 3) || [],
          };
          setReferences(refs);
          // Cache the result
          setCachedCrossRefs(cacheKey, refs);
        }
      }
    } catch (e) {
      // Don't update state if aborted
      if (abortController.signal.aborted) return;
      // Fallback: show placeholder
      const emptyRefs = { tanakh: [], talmud: [], midrash: [] };
      setReferences(emptyRefs);
      setCachedCrossRefs(cacheKey, emptyRefs);
    } finally {
      if (!abortController.signal.aborted) {
        setLoading(false);
      }
    }
  }, [cacheKey, references, loading]);

  const handleExpand = () => {
    if (!expanded && !references) {
      fetchReferences();
    }
    setExpanded(!expanded);
  };

  const totalRefs = references
    ? references.tanakh.length + references.talmud.length + references.midrash.length
    : 0;

  return (
    <div className="wic-cross-refs">
      <button className="cross-refs-toggle" onClick={handleExpand}>
        <span className="cross-refs-icon">📜</span>
        <span className="cross-refs-title">Cross-References</span>
        {loading && <span className="cross-refs-loading">...</span>}
        {!loading && references && (
          <span className="cross-refs-count">
            {totalRefs} refs{fromCache && ' ⚡'}
          </span>
        )}
        <span className={`cross-refs-arrow ${expanded ? 'expanded' : ''}`}>▼</span>
      </button>

      {expanded && references && (
        <div className="cross-refs-content">
          {/* DRY: Use REFERENCE_CATEGORIES constant */}
          {REFERENCE_CATEGORIES.map(({ key, label }) => {
            const refs = references[key] || [];
            if (refs.length === 0) return null;
            return (
              <div key={key} className="refs-group">
                <span className="refs-group-label">{label}</span>
                <div className="refs-list">
                  {refs.map((ref, i) => (
                    <button
                      key={i}
                      className="ref-item"
                      onClick={() => onReferenceClick?.(ref)}
                    >
                      {ref}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          {totalRefs === 0 && (
            <div className="refs-empty">No cross-references found</div>
          )}
        </div>
      )}
    </div>
  );
});

export default CrossReferencesSection;
