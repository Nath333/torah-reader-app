/**
 * WordIntelligenceCard - Research Tools
 * Cross-references, construct chain, cantillation, manuscript variants, knowledge graph
 */

import React, { memo, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { REFERENCE_CATEGORIES, getCachedCrossRefs, setCachedCrossRefs } from '../constants';
import { extractCantillation } from '../../../../services/textual/cantillationService';
import { analyzeConstructChain, findConstructsWithWord } from '../../../../services/constructChainService';
import { getVariantsForVerse, MANUSCRIPT_SOURCES } from '../../../../services/textual/manuscriptVariantsService';

// =============================================================================
// CROSS-REFERENCES SECTION
// =============================================================================

export const CrossReferencesSection = memo(function CrossReferencesSection({ word, root, onReferenceClick }) {
  const [references, setReferences] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const abortControllerRef = useRef(null);

  const cacheKey = root || word;

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const fetchReferences = useCallback(async () => {
    if (references || loading) return;

    const cached = getCachedCrossRefs(cacheKey);
    if (cached) {
      setReferences(cached);
      setFromCache(true);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    setLoading(true);
    setFromCache(false);

    try {
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
          setCachedCrossRefs(cacheKey, refs);
        }
      }
    } catch (e) {
      if (abortController.signal.aborted) return;
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

// =============================================================================
// CONSTRUCT CHAIN DISPLAY
// =============================================================================

export const ConstructChainDisplay = memo(function ConstructChainDisplay({ word, onWordClick }) {
  const analysis = useMemo(() => {
    try {
      return analyzeConstructChain?.(word);
    } catch {
      return null;
    }
  }, [word]);

  const relatedConstructs = useMemo(() => {
    if (!analysis?.isConstruct) return [];
    try {
      return findConstructsWithWord?.(word)?.slice(0, 3) || [];
    } catch {
      return [];
    }
  }, [word, analysis]);

  if (!analysis?.isConstruct) return null;

  return (
    <div className="wic-construct-chain">
      <div className="construct-header">
        <span className="construct-icon">🔗</span>
        <span className="construct-title">Construct Chain (סמיכות)</span>
        {analysis.confidence && (
          <span className="construct-confidence">{analysis.confidence}%</span>
        )}
      </div>

      {analysis.known ? (
        <div className="construct-known">
          <div className="construct-parsed">
            <span className="parsed-hebrew" dir="rtl">{analysis.phrase}</span>
            <span className="parsed-arrow">→</span>
            <span className="parsed-english">{analysis.parsed}</span>
          </div>
          <div className="construct-parts">
            <span className="part-label">Nomen Regens:</span>
            <span className="part-value" dir="rtl">{analysis.nomen_regens}</span>
            <span className="part-label">Nomen Rectum:</span>
            <span className="part-value" dir="rtl">{analysis.nomen_rectum}</span>
          </div>
          <div className="construct-type">
            <span className="type-badge">{analysis.type}</span>
            {analysis.semanticFunction && (
              <span className="semantic-function">{analysis.semanticFunction}</span>
            )}
          </div>
        </div>
      ) : (
        <div className="construct-detected">
          <span className="detected-text">Possible construct pattern detected</span>
          {analysis.possibleType && (
            <span className="possible-type">Type: {analysis.possibleType}</span>
          )}
          {analysis.explanation && (
            <span className="detection-reason">{analysis.explanation}</span>
          )}
        </div>
      )}

      {relatedConstructs.length > 0 && (
        <div className="construct-related">
          <span className="related-label">Related constructs:</span>
          <div className="related-list">
            {relatedConstructs.map((c, i) => (
              <button
                key={i}
                className="related-construct"
                onClick={() => onWordClick?.(c.phrase)}
                dir="rtl"
              >
                {c.phrase}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

// =============================================================================
// CANTILLATION DISPLAY
// =============================================================================

export const CantillationDisplay = memo(function CantillationDisplay({ word }) {
  const marks = useMemo(() => {
    try {
      return extractCantillation?.(word) || [];
    } catch {
      return [];
    }
  }, [word]);

  if (marks.length === 0) return null;

  return (
    <div className="wic-cantillation">
      <div className="cant-header">
        <span className="cant-icon">🎵</span>
        <span className="cant-title">Cantillation</span>
        <span className="cant-count">{marks.length} mark{marks.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="cant-marks">
        {marks.slice(0, 3).map((mark, i) => (
          <div key={i} className={`cant-mark ${mark.type || 'unknown'}`}>
            <span className="mark-symbol">{mark.symbol}</span>
            <div className="mark-info">
              <span className="mark-name">{mark.name || 'Unknown'}</span>
              <span className="mark-hebrew">{mark.hebrewName || ''}</span>
            </div>
            {mark.type && (
              <span className={`mark-type-badge ${mark.type}`}>
                {mark.type === 'disjunctive' ? '⬢ pause' : '◆ connect'}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
});

// =============================================================================
// MANUSCRIPT VARIANTS INDICATOR
// =============================================================================

export const ManuscriptVariantsIndicator = memo(function ManuscriptVariantsIndicator({ verseRef }) {
  const [expanded, setExpanded] = useState(false);

  const variantData = useMemo(() => {
    if (!verseRef) return null;
    try {
      return getVariantsForVerse?.(verseRef);
    } catch {
      return null;
    }
  }, [verseRef]);

  if (!variantData || !variantData.variants?.length) return null;

  const hasSignificant = variantData.hasSignificantVariants;
  const variantCount = variantData.variants.length;

  return (
    <div className={`wic-variants ${hasSignificant ? 'significant' : ''}`}>
      <button
        className="variants-toggle"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-label={`Manuscript variants: ${variantCount} variant${variantCount !== 1 ? 's' : ''}${hasSignificant ? ' with significant differences' : ''}`}
      >
        <span className="variants-icon" aria-hidden="true">📜</span>
        <span className="variants-title">Manuscript Variants</span>
        <span className={`variants-count ${hasSignificant ? 'significant' : ''}`}>
          {variantCount} variant{variantCount !== 1 ? 's' : ''}
          {hasSignificant && <span aria-hidden="true"> ⚠️</span>}
        </span>
        <span className={`variants-arrow ${expanded ? 'expanded' : ''}`} aria-hidden="true">▼</span>
      </button>

      {expanded && (
        <div className="variants-content">
          <div className="variants-mt">
            <span className="mt-label">Masoretic Text:</span>
            <span className="mt-text" dir="rtl">{variantData.masoreticText}</span>
          </div>

          <div className="variants-list">
            {variantData.variants.map((variant, i) => {
              const sourceInfo = variant.sourceInfo || MANUSCRIPT_SOURCES[variant.source?.toUpperCase()] || {};
              return (
                <div key={i} className={`variant-item ${variant.significance}`}>
                  <div className="variant-source">
                    <span className="source-abbrev">{sourceInfo.abbreviation || variant.source}</span>
                    <span className="source-name">{sourceInfo.name || variant.source}</span>
                    {sourceInfo.date && (
                      <span className="source-date">{sourceInfo.date}</span>
                    )}
                  </div>
                  <div className="variant-reading">
                    <span className="reading-text">{variant.reading}</span>
                  </div>
                  <div className="variant-meta">
                    <span className={`significance-badge ${variant.significance}`}>
                      {variant.significance}
                    </span>
                    {variant.notes && (
                      <span className="variant-notes">{variant.notes}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});

// =============================================================================
// KNOWLEDGE GRAPH MINI
// =============================================================================

export const KnowledgeGraphMini = memo(function KnowledgeGraphMini({ word, root, synonyms = [], antonyms = [], onShowFullGraph }) {
  const connections = [
    ...synonyms.slice(0, 2).map(s => ({ word: s.word || s, type: 'synonym' })),
    ...antonyms.slice(0, 2).map(a => ({ word: a.word || a, type: 'antonym' })),
  ];

  if (connections.length === 0) return null;

  return (
    <div className="wic-graph-mini">
      <div className="graph-mini-header">
        <span className="graph-mini-icon">🕸️</span>
        <span className="graph-mini-title">Word Connections</span>
        {onShowFullGraph && (
          <button className="graph-expand-btn" onClick={() => onShowFullGraph(word, root)}>
            Expand
          </button>
        )}
      </div>
      <div className="graph-mini-visual">
        <div className="graph-center">
          <span className="graph-center-word" dir="rtl">{word}</span>
          {root && <span className="graph-center-root" dir="rtl">{root}</span>}
        </div>
        <div className="graph-connections">
          {connections.map((conn, i) => (
            <div
              key={i}
              className={`graph-connection ${conn.type}`}
              style={{ '--angle': `${(i * 360) / connections.length}deg` }}
            >
              <div className="connection-line" />
              <span className="connection-word" dir="rtl">{conn.word}</span>
              <span className="connection-type">
                {conn.type === 'synonym' ? '≈' : '↔'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
