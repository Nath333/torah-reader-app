/**
 * RashiTosafotAnalysisPro - PRO SCHOLAR V31 Rishonim Commentary Panel
 *
 * Displays Rashi and Tosafot commentaries for Talmud study with three view modes:
 * - Quick View: Side-by-side dibburim (opening words) with expandable text
 * - Split View: Full panels for each commentary
 * - Deep View: Tabbed analysis (רש״י / תוספות / השוואה)
 *
 * Features:
 * - Lazy loading from Sefaria API with caching
 * - Hebrew text with RTL support
 * - Dibbur HaMatchil (opening words) highlighting
 * - English translations when available
 * - Comparison view to find matching Rashi/Tosafot on same phrase
 * - Responsive design with dark mode support
 *
 * @module RashiTosafotAnalysisPro
 * @version 31.0.0
 */

import React, { memo, useState, useEffect, useMemo, useCallback } from 'react';
import { getRashiOnTalmud, getTosafotOnTalmud, isTosafotAvailable } from '../../../services/sefariaApi';
import { stripAllDiacritics as stripNikud } from '../../../utils/hebrewUtils';
import { parseReference } from '../../../constants/talmudStudy';
import './RashiTosafotAnalysisPro.css';

// =============================================================================
// CONSTANTS
// =============================================================================

// Deep view tab configuration
const DEEP_TABS = [
  { id: 'rashi', label: 'רש״י', icon: '📖' },
  { id: 'tosafot', label: 'תוספות', icon: '📚' },
  { id: 'compare', label: 'השוואה', icon: '🔗' }
];

// View mode labels for toggle buttons
const VIEW_MODES = {
  quick: { label: 'מהיר', title: 'תצוגה מהירה - דיבורים המתחילים' },
  split: { label: 'פיצול', title: 'תצוגה מפוצלת - פאנלים מלאים' },
  deep: { label: 'מעמיק', title: 'ניתוח מעמיק - טאבים והשוואה' }
};

// DRY: parseReference imported from constants/talmudStudy.js (single source of truth)

// Extract dibbur (opening words) from comment
const extractDibbur = (comment) => {
  if (comment.dibbur) return comment.dibbur;
  if (!comment.hebrew) return '';

  // Take first few words (up to dash or period)
  const text = comment.hebrew;
  const dashMatch = text.match(/^(.{5,50})\s*[-–—]/);
  if (dashMatch) return dashMatch[1].trim();

  // Otherwise take first 5-6 words
  const words = text.split(/\s+/).slice(0, 6);
  return words.join(' ') + (words.length < text.split(/\s+/).length ? '...' : '');
};

// Truncate text for preview
const truncateText = (text, maxLength = 150) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
};

// =============================================================================
// SUBCOMPONENTS
// =============================================================================

// Loading skeleton
const LoadingState = () => (
  <div className="rishonim-loading">
    <div className="loading-bar" />
    <div className="loading-bar short" />
    <div className="loading-bar medium" />
  </div>
);

// Empty state
const EmptyState = ({ message }) => (
  <div className="rishonim-empty">
    <span className="empty-icon">📜</span>
    <span className="empty-text">{message || 'אין פירושים זמינים'}</span>
  </div>
);

/**
 * CommentCard - Single expandable comment card
 * Shows dibbur (opening words) with expand/collapse for full text
 */
const CommentCard = memo(({ comment, index, source, expanded, onToggle }) => {
  const dibbur = extractDibbur(comment);
  const hasEnglish = comment.english && comment.english.trim();

  return (
    <div
      className={`comment-card ${source.toLowerCase()} ${expanded ? 'expanded' : ''}`}
      onClick={onToggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onToggle()}
    >
      <div className="comment-header">
        <span className="comment-num">{index + 1}</span>
        <span className="comment-dibbur" dir="rtl">{dibbur}</span>
        <span className="expand-icon">{expanded ? '▼' : '◀'}</span>
      </div>

      {expanded && (
        <div className="comment-body">
          <div className="comment-hebrew" dir="rtl">
            {comment.hebrew}
          </div>
          {hasEnglish && (
            <div className="comment-english">
              {comment.english}
            </div>
          )}
        </div>
      )}
    </div>
  );
});
CommentCard.displayName = 'CommentCard';

/**
 * CommentList - List of comment cards for a single source (Rashi or Tosafot)
 */
const CommentList = memo(({ comments, source, expandedIds, onToggle }) => {
  if (!comments || comments.length === 0) {
    return <EmptyState message={`אין פירושי ${source} זמינים לדף זה`} />;
  }

  return (
    <div className="comment-list">
      {comments.map((comment, index) => (
        <CommentCard
          key={`${source}-${index}`}
          comment={comment}
          index={index}
          source={source}
          expanded={expandedIds.has(index)}
          onToggle={() => onToggle(index)}
        />
      ))}
    </div>
  );
});
CommentList.displayName = 'CommentList';

/**
 * DibburGrid - Side-by-side dibbur comparison (Quick View)
 * Shows opening words from both Rashi and Tosafot for quick navigation
 */
const DibburGrid = memo(({ rashiComments, tosafotComments, onSelect }) => {
  return (
    <div className="dibbur-grid">
      <div className="dibbur-column rashi">
        <div className="column-header">
          <span className="header-icon">📖</span>
          <span className="header-title">רש״י</span>
          <span className="header-count">{rashiComments.length}</span>
        </div>
        <div className="dibbur-list">
          {rashiComments.map((comment, i) => (
            <button
              key={i}
              className="dibbur-chip rashi"
              onClick={() => onSelect('rashi', i)}
              dir="rtl"
            >
              {extractDibbur(comment)}
            </button>
          ))}
          {rashiComments.length === 0 && (
            <span className="no-comments">אין פירושים</span>
          )}
        </div>
      </div>

      <div className="dibbur-column tosafot">
        <div className="column-header">
          <span className="header-icon">📚</span>
          <span className="header-title">תוספות</span>
          <span className="header-count">{tosafotComments.length}</span>
        </div>
        <div className="dibbur-list">
          {tosafotComments.map((comment, i) => (
            <button
              key={i}
              className="dibbur-chip tosafot"
              onClick={() => onSelect('tosafot', i)}
              dir="rtl"
            >
              {extractDibbur(comment)}
            </button>
          ))}
          {tosafotComments.length === 0 && (
            <span className="no-comments">אין פירושים</span>
          )}
        </div>
      </div>
    </div>
  );
});
DibburGrid.displayName = 'DibburGrid';

/**
 * ComparisonView - Find and display matching Rashi/Tosafot on same dibbur
 * Compares opening words to identify where both comment on the same phrase
 */
const ComparisonView = memo(({ rashiComments, tosafotComments }) => {
  // Find potential matches based on similar dibburim
  const matches = useMemo(() => {
    const result = [];

    rashiComments.forEach((rashi, rIndex) => {
      // Strip nikud and normalize for accurate Hebrew comparison
      const rashiDibbur = stripNikud(extractDibbur(rashi)).toLowerCase();

      tosafotComments.forEach((tosafot, tIndex) => {
        const tosafotDibbur = stripNikud(extractDibbur(tosafot)).toLowerCase();

        // Check for word overlap (nikud-normalized)
        const rashiWords = new Set(rashiDibbur.split(/\s+/));
        const tosafotWords = tosafotDibbur.split(/\s+/);
        const overlap = tosafotWords.filter(w => rashiWords.has(w)).length;

        if (overlap >= 2 || rashiDibbur.includes(tosafotDibbur) || tosafotDibbur.includes(rashiDibbur)) {
          result.push({ rashi, tosafot, rashiIndex: rIndex, tosafotIndex: tIndex });
        }
      });
    });

    return result;
  }, [rashiComments, tosafotComments]);

  if (matches.length === 0) {
    return (
      <div className="comparison-empty">
        <span className="empty-icon">🔍</span>
        <span className="empty-text">לא נמצאו התאמות בין רש״י לתוספות על אותו דיבור</span>
      </div>
    );
  }

  return (
    <div className="comparison-list">
      {matches.map((match, i) => (
        <div key={i} className="comparison-item">
          <div className="comparison-header" dir="rtl">
            <span className="match-icon">🔗</span>
            <span className="match-dibbur">{extractDibbur(match.rashi)}</span>
          </div>

          <div className="comparison-row">
            <div className="comparison-panel rashi">
              <div className="panel-label">רש״י</div>
              <div className="panel-text" dir="rtl">{truncateText(match.rashi.hebrew, 300)}</div>
            </div>

            <div className="comparison-panel tosafot">
              <div className="panel-label">תוספות</div>
              <div className="panel-text" dir="rtl">{truncateText(match.tosafot.hebrew, 300)}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
});
ComparisonView.displayName = 'ComparisonView';

// =============================================================================
// RASHI TOSAFOT ANALYSIS PRO - Main Component
// =============================================================================

const RashiTosafotAnalysisPro = memo(({ reference, text, compact = false }) => {
  const [viewMode, setViewMode] = useState('quick'); // 'quick' | 'split' | 'deep'
  const [activeTab, setActiveTab] = useState('rashi'); // 'rashi' | 'tosafot' | 'compare'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rashiData, setRashiData] = useState(null);
  const [tosafotData, setTosafotData] = useState(null);
  const [expandedRashi, setExpandedRashi] = useState(new Set());
  const [expandedTosafot, setExpandedTosafot] = useState(new Set());

  // Parse reference
  const parsedRef = useMemo(() => parseReference(reference), [reference]);
  const tractate = parsedRef?.tractate || null;
  const daf = parsedRef?.daf || null;

  // Fetch commentaries
  useEffect(() => {
    if (!tractate || !daf) {
      setLoading(false);
      return;
    }

    const fetchCommentaries = async () => {
      setLoading(true);
      setError(null);

      try {
        const [rashiResult, tosafotResult] = await Promise.all([
          getRashiOnTalmud(tractate, daf).catch(err => {
            console.warn('Rashi fetch error:', err);
            return { comments: [] };
          }),
          isTosafotAvailable(tractate)
            ? getTosafotOnTalmud(tractate, daf).catch(err => {
                console.warn('Tosafot fetch error:', err);
                return { comments: [] };
              })
            : Promise.resolve({ comments: [] })
        ]);

        setRashiData(rashiResult);
        setTosafotData(tosafotResult);
      } catch (err) {
        console.error('Commentary fetch error:', err);
        setError('שגיאה בטעינת פירושים');
      } finally {
        setLoading(false);
      }
    };

    fetchCommentaries();
  }, [tractate, daf]);

  // Extract comments arrays
  const rashiComments = rashiData?.comments || [];
  const tosafotComments = tosafotData?.comments || [];
  const totalComments = rashiComments.length + tosafotComments.length;

  // Toggle handlers
  const toggleRashiExpand = useCallback((index) => {
    setExpandedRashi(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const toggleTosafotExpand = useCallback((index) => {
    setExpandedTosafot(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  // Handle dibbur selection from quick view
  const handleDibburSelect = useCallback((source, index) => {
    setViewMode('split');
    if (source === 'rashi') {
      setExpandedRashi(new Set([index]));
    } else {
      setExpandedTosafot(new Set([index]));
    }
  }, []);

  // No reference provided
  if (!tractate || !daf) {
    return (
      <div className={`rishonim-pro ${compact ? 'compact' : ''}`}>
        <EmptyState message="נא לבחור דף כדי לראות את פירושי הראשונים" />
      </div>
    );
  }

  return (
    <div className={`rishonim-pro ${compact ? 'compact' : ''}`}>
      {/* Header */}
      <div className="rishonim-header">
        <div className="header-title">
          <span className="header-icon">📜</span>
          <span className="header-text">רש״י ותוספות</span>
          {!loading && totalComments > 0 && (
            <span className="header-badge">{totalComments} פירושים</span>
          )}
        </div>

        {/* View mode toggle - using VIEW_MODES constant */}
        <div className="view-mode-toggle">
          {Object.entries(VIEW_MODES).map(([mode, config]) => (
            <button
              key={mode}
              className={`mode-btn ${viewMode === mode ? 'active' : ''}`}
              onClick={() => setViewMode(mode)}
              type="button"
              title={config.title}
            >
              {config.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats bar - similar to GemaraQAAnalysisPro */}
      {!loading && !error && totalComments > 0 && (
        <div className="rishonim-stats-bar">
          <span className="stat rashi">📖 רש״י: {rashiComments.length}</span>
          <span className="stat tosafot">📚 תוספות: {tosafotComments.length}</span>
          <span className="stat total">📊 סה״כ: {totalComments}</span>
        </div>
      )}

      {/* Loading state */}
      {loading && <LoadingState />}

      {/* Error state */}
      {error && (
        <div className="rishonim-error">
          <span className="error-icon">⚠️</span>
          <span className="error-text">{error}</span>
        </div>
      )}

      {/* Content */}
      {!loading && !error && (
        <>
          {/* Quick View - Side-by-side dibburim */}
          {viewMode === 'quick' && (
            <div className="rishonim-quick-view">
              <DibburGrid
                rashiComments={rashiComments}
                tosafotComments={tosafotComments}
                onSelect={handleDibburSelect}
              />
            </div>
          )}

          {/* Split View - Full panels */}
          {viewMode === 'split' && (
            <div className="rishonim-split-view">
              <div className="split-panel rashi-panel">
                <div className="panel-header">
                  <span className="panel-icon">📖</span>
                  <span className="panel-title">רש״י</span>
                  <span className="panel-count">{rashiComments.length}</span>
                </div>
                <CommentList
                  comments={rashiComments}
                  source="Rashi"
                  expandedIds={expandedRashi}
                  onToggle={toggleRashiExpand}
                />
              </div>

              <div className="split-panel tosafot-panel">
                <div className="panel-header">
                  <span className="panel-icon">📚</span>
                  <span className="panel-title">תוספות</span>
                  <span className="panel-count">{tosafotComments.length}</span>
                </div>
                <CommentList
                  comments={tosafotComments}
                  source="Tosafot"
                  expandedIds={expandedTosafot}
                  onToggle={toggleTosafotExpand}
                />
              </div>
            </div>
          )}

          {/* Deep View - Tabbed analysis */}
          {viewMode === 'deep' && (
            <div className="rishonim-deep-view">
              {/* Deep view tabs - using DEEP_TABS constant */}
              <div className="deep-tabs">
                {DEEP_TABS.map(tab => (
                  <button
                    key={tab.id}
                    className={`deep-tab ${activeTab === tab.id ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab.id)}
                    type="button"
                  >
                    <span className="tab-icon">{tab.icon}</span>
                    <span className="tab-label">{tab.label}</span>
                    {tab.id === 'rashi' && <span className="tab-count">{rashiComments.length}</span>}
                    {tab.id === 'tosafot' && <span className="tab-count">{tosafotComments.length}</span>}
                  </button>
                ))}
              </div>

              <div className="deep-content">
                {activeTab === 'rashi' && (
                  <div className="deep-section">
                    <CommentList
                      comments={rashiComments}
                      source="Rashi"
                      expandedIds={expandedRashi}
                      onToggle={toggleRashiExpand}
                    />
                  </div>
                )}

                {activeTab === 'tosafot' && (
                  <div className="deep-section">
                    <CommentList
                      comments={tosafotComments}
                      source="Tosafot"
                      expandedIds={expandedTosafot}
                      onToggle={toggleTosafotExpand}
                    />
                  </div>
                )}

                {activeTab === 'compare' && (
                  <div className="deep-section">
                    <ComparisonView
                      rashiComments={rashiComments}
                      tosafotComments={tosafotComments}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
});

RashiTosafotAnalysisPro.displayName = 'RashiTosafotAnalysisPro';

export default RashiTosafotAnalysisPro;
