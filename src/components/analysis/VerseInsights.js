/**
 * VerseInsights - Compact scholarly metadata display
 *
 * Shows cross-references, topics, and rabbinic sources in a non-intrusive way.
 * Data loads lazily after the main content to avoid blocking.
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getCrossReferences, getTopicsForRef } from '../../services/sefariaApi';
import { getReferencesForVerse } from '../../services/rabbinicReferencesService';
import { analyzeVerseStructure } from '../../services/textual/cantillationService';
import './VerseInsights.css';

// Cache for cross-refs and topics (persists across renders)
const insightsCache = new Map();

const VerseInsights = ({
  book,
  chapter,
  verse,
  hebrewText,
  onNavigateToRef,
  compact = true,
  showCantillation = false
}) => {
  const [crossRefs, setCrossRefs] = useState(null);
  const [topics, setTopics] = useState(null);
  const [rabbinicRefs, setRabbinicRefs] = useState(null);
  const [cantillation, setCantillation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('refs');

  const reference = useMemo(() => `${book}.${chapter}.${verse}`, [book, chapter, verse]);
  const cacheKey = useMemo(() => `insights:${reference}`, [reference]);

  // Lazy load data after mount
  useEffect(() => {
    let cancelled = false;

    const loadInsights = async () => {
      // Check cache first
      const cached = insightsCache.get(cacheKey);
      if (cached) {
        setCrossRefs(cached.crossRefs);
        setTopics(cached.topics);
        setRabbinicRefs(cached.rabbinicRefs);
        setCantillation(cached.cantillation);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        // Load all data in parallel
        const [refsData, topicsData, rabbinicData] = await Promise.all([
          getCrossReferences(book, chapter).catch(() => []),
          getTopicsForRef(reference).catch(() => []),
          Promise.resolve(getReferencesForVerse ? getReferencesForVerse(reference) : null)
        ]);

        if (cancelled) return;

        // Filter cross-refs for this specific verse
        const verseRefs = (refsData || []).filter(ref => {
          const refParts = ref.ref?.split('.') || [];
          return refParts[2] === String(verse) || !refParts[2]; // Chapter-level refs count too
        }).slice(0, 10); // Limit to 10 most relevant

        // Get cantillation if Hebrew text provided (synchronous function)
        let cantData = null;
        if (showCantillation && hebrewText) {
          try {
            cantData = analyzeVerseStructure(hebrewText);
          } catch { /* ignore */ }
        }

        // Cache the results
        const results = {
          crossRefs: verseRefs,
          topics: topicsData?.slice(0, 5) || [], // Limit topics
          rabbinicRefs: rabbinicData,
          cantillation: cantData
        };
        insightsCache.set(cacheKey, results);

        setCrossRefs(results.crossRefs);
        setTopics(results.topics);
        setRabbinicRefs(results.rabbinicRefs);
        setCantillation(results.cantillation);
      } catch (error) {
        console.warn('Failed to load verse insights:', error);
      }

      setLoading(false);
    };

    // Delay load slightly to prioritize main content
    const timer = setTimeout(loadInsights, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [cacheKey, book, chapter, verse, reference, hebrewText, showCantillation]);

  // Count total references
  const totalRefs = useMemo(() => {
    let count = crossRefs?.length || 0;
    if (rabbinicRefs?.talmud?.length) count += rabbinicRefs.talmud.length;
    if (rabbinicRefs?.midrash?.length) count += rabbinicRefs.midrash.length;
    return count;
  }, [crossRefs, rabbinicRefs]);

  const hasData = totalRefs > 0 || topics?.length > 0;

  const handleRefClick = useCallback((ref) => {
    if (onNavigateToRef) {
      onNavigateToRef(ref);
    }
  }, [onNavigateToRef]);

  // Don't render if no data and not loading
  if (!loading && !hasData) return null;

  // Compact mode - just show badges
  if (compact && !expanded) {
    return (
      <div className="verse-insights compact">
        {loading ? (
          <span className="insights-loading">•••</span>
        ) : (
          <div className="insights-badges" onClick={() => setExpanded(true)}>
            {totalRefs > 0 && (
              <span className="insight-badge refs-badge" title={`${totalRefs} rabbinic references`}>
                📚 {totalRefs}
              </span>
            )}
            {topics?.length > 0 && (
              <span className="insight-badge topics-badge" title="Topics">
                🏷️ {topics.length}
              </span>
            )}
            {cantillation?.structure && (
              <span className="insight-badge cant-badge" title="Cantillation structure">
                🎵
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  // Expanded mode - show full details
  return (
    <div className="verse-insights expanded">
      <div className="insights-header">
        <div className="insights-tabs">
          {totalRefs > 0 && (
            <button
              className={`tab-btn ${activeTab === 'refs' ? 'active' : ''}`}
              onClick={() => setActiveTab('refs')}
            >
              References ({totalRefs})
            </button>
          )}
          {topics?.length > 0 && (
            <button
              className={`tab-btn ${activeTab === 'topics' ? 'active' : ''}`}
              onClick={() => setActiveTab('topics')}
            >
              Topics ({topics.length})
            </button>
          )}
          {cantillation?.structure && (
            <button
              className={`tab-btn ${activeTab === 'cant' ? 'active' : ''}`}
              onClick={() => setActiveTab('cant')}
            >
              Trope
            </button>
          )}
        </div>
        <button className="collapse-btn" onClick={() => setExpanded(false)} title="Collapse">
          ▲
        </button>
      </div>

      <div className="insights-content">
        {/* Cross-References Tab */}
        {activeTab === 'refs' && (
          <div className="refs-panel">
            {/* Talmud References */}
            {crossRefs?.filter(r => r.category?.toLowerCase().includes('talmud')).length > 0 && (
              <div className="ref-group">
                <span className="ref-group-label">📖 Talmud</span>
                <div className="ref-list">
                  {crossRefs
                    .filter(r => r.category?.toLowerCase().includes('talmud'))
                    .slice(0, 5)
                    .map((ref, i) => (
                      <button
                        key={i}
                        className="ref-chip"
                        onClick={() => handleRefClick(ref.ref)}
                        title={ref.text?.substring(0, 100)}
                      >
                        {ref.heRef || ref.ref}
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* Midrash References */}
            {crossRefs?.filter(r => r.category?.toLowerCase().includes('midrash')).length > 0 && (
              <div className="ref-group">
                <span className="ref-group-label">📜 Midrash</span>
                <div className="ref-list">
                  {crossRefs
                    .filter(r => r.category?.toLowerCase().includes('midrash'))
                    .slice(0, 5)
                    .map((ref, i) => (
                      <button
                        key={i}
                        className="ref-chip"
                        onClick={() => handleRefClick(ref.ref)}
                        title={ref.text?.substring(0, 100)}
                      >
                        {ref.heRef || ref.ref}
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* Other References */}
            {crossRefs?.filter(r =>
              !r.category?.toLowerCase().includes('talmud') &&
              !r.category?.toLowerCase().includes('midrash')
            ).length > 0 && (
              <div className="ref-group">
                <span className="ref-group-label">📎 Other</span>
                <div className="ref-list">
                  {crossRefs
                    .filter(r =>
                      !r.category?.toLowerCase().includes('talmud') &&
                      !r.category?.toLowerCase().includes('midrash')
                    )
                    .slice(0, 5)
                    .map((ref, i) => (
                      <button
                        key={i}
                        className="ref-chip"
                        onClick={() => handleRefClick(ref.ref)}
                        title={ref.text?.substring(0, 100)}
                      >
                        {ref.heRef || ref.ref}
                      </button>
                    ))}
                </div>
              </div>
            )}

            {totalRefs === 0 && (
              <div className="no-data">No cross-references found</div>
            )}
          </div>
        )}

        {/* Topics Tab */}
        {activeTab === 'topics' && (
          <div className="topics-panel">
            <div className="topic-chips">
              {topics?.map((topic, i) => (
                <span key={i} className="topic-chip" title={topic.description}>
                  {topic.title?.en || topic.slug}
                </span>
              ))}
            </div>
            {topics?.length === 0 && (
              <div className="no-data">No topics tagged</div>
            )}
          </div>
        )}

        {/* Cantillation Tab */}
        {activeTab === 'cant' && cantillation && (
          <div className="cant-panel">
            {/* Quick Stats */}
            <div className="cant-stats-row">
              <span className="cant-stat-item">
                <span className="stat-num">{cantillation.disjunctiveCount || 0}</span>
                <span className="stat-label">Disjunctive</span>
              </span>
              <span className="cant-stat-item">
                <span className="stat-num">{cantillation.conjunctiveCount || 0}</span>
                <span className="stat-label">Conjunctive</span>
              </span>
            </div>

            {/* Structure */}
            <div className="cant-structure">
              <span className="cant-label">Structure:</span>
              <span className="cant-value">{cantillation.structure || 'Standard'}</span>
            </div>

            {/* Primary Break (Etnachta) */}
            {cantillation.primaryBreak && (
              <div className="cant-break">
                <span className="cant-label">Main Pause (אתנחתא):</span>
                <span className="cant-value" dir="rtl">{cantillation.primaryBreak}</span>
              </div>
            )}

            {/* Hierarchy Display */}
            {cantillation.hierarchy && (
              <div className="cant-hierarchy">
                <span className="cant-label">Hierarchy:</span>
                <div className="hierarchy-bars">
                  {cantillation.hierarchy.level1?.length > 0 && (
                    <div className="hierarchy-bar level-1" title="Primary disjunctives">
                      <span className="bar-fill" style={{ width: `${Math.min(100, (cantillation.hierarchy.level1?.length || 0) * 25)}%` }} />
                      <span className="bar-label">L1: {cantillation.hierarchy.level1?.length || 0}</span>
                    </div>
                  )}
                  {cantillation.hierarchy.level2?.length > 0 && (
                    <div className="hierarchy-bar level-2" title="Secondary disjunctives">
                      <span className="bar-fill" style={{ width: `${Math.min(100, (cantillation.hierarchy.level2?.length || 0) * 20)}%` }} />
                      <span className="bar-label">L2: {cantillation.hierarchy.level2?.length || 0}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Trope Marks */}
            {cantillation.marks?.length > 0 && (
              <div className="cant-marks">
                <span className="cant-label">Trope Marks ({cantillation.marks.length}):</span>
                <div className="mark-chips">
                  {cantillation.marks.slice(0, 8).map((mark, i) => (
                    <span
                      key={i}
                      className={`mark-chip ${mark.type || ''}`}
                      title={`${mark.name}: ${mark.meaning || 'pause/connector'}`}
                    >
                      <span className="mark-symbol">{mark.symbol || ''}</span>
                      <span className="mark-name">{mark.hebrewName || mark.name}</span>
                    </span>
                  ))}
                  {cantillation.marks.length > 8 && (
                    <span className="mark-chip more">+{cantillation.marks.length - 8}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(VerseInsights);
