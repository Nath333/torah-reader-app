import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './CommentaryTabs.css';
import { RashiComment, TargumSection } from './StudyVerse';
import { ClickableHebrewText } from './ClickableText';
import { removeHtmlTags } from '../utils/sanitize';
import { getRashiForVerse } from '../services/sefariaApi';
import { getRambanForVerse } from '../services/rambanService';
import { getCommentary } from '../services/sefariaApi';

// Tab definitions with Hebrew names and icons
const COMMENTARY_TABS = {
  targum: {
    id: 'targum',
    label: 'Targum',
    hebrewLabel: 'תרגום',
    icon: '🔤',
    color: '#059669'
  },
  rashi: {
    id: 'rashi',
    label: 'Rashi',
    hebrewLabel: 'רש״י',
    icon: '📖',
    color: '#4f46e5'
  },
  ramban: {
    id: 'ramban',
    label: 'Ramban',
    hebrewLabel: 'רמב״ן',
    icon: '📿',
    color: '#7c3aed'
  },
  ibnEzra: {
    id: 'ibnEzra',
    label: 'Ibn Ezra',
    hebrewLabel: 'אבן עזרא',
    icon: '🌟',
    color: '#2563eb'
  },
  sforno: {
    id: 'sforno',
    label: 'Sforno',
    hebrewLabel: 'ספורנו',
    icon: '💎',
    color: '#0891b2'
  }
};

// Talmud-specific tabs
const TALMUD_TABS = {
  rashi: COMMENTARY_TABS.rashi,
  tosafot: {
    id: 'tosafot',
    label: 'Tosafot',
    hebrewLabel: 'תוספות',
    icon: '📚',
    color: '#dc2626'
  },
  maharsha: {
    id: 'maharsha',
    label: 'Maharsha',
    hebrewLabel: 'מהרש״א',
    icon: '✨',
    color: '#d97706'
  }
};

// Generic Commentary Display
const CommentaryContent = React.memo(({
  comments,
  source,
  enableClickableText = true,
  showTranslation = true
}) => {
  if (!comments || comments.length === 0) {
    return (
      <div className="no-commentary">
        <div className="no-commentary-icon">📭</div>
        <p>No {source} commentary available for this verse</p>
      </div>
    );
  }

  return (
    <div className="commentary-entries">
      {comments.map((comment, idx) => (
        <div key={idx} className="commentary-entry">
          {/* Dibbur HaMatchil if present */}
          {comment.dibbur && (
            <div className="entry-dibbur">
              <span className="dibbur-badge">דיבור המתחיל</span>
              <strong className="dibbur-text" dir="rtl" lang="he">
                {comment.dibbur}
              </strong>
            </div>
          )}

          {/* Hebrew Text */}
          <div className="entry-hebrew">
            {enableClickableText ? (
              <ClickableHebrewText
                text={removeHtmlTags(comment.hebrew || comment.text)}
                className="commentary-hebrew-text"
              />
            ) : (
              <div className="commentary-hebrew-text" dir="rtl" lang="he">
                {removeHtmlTags(comment.hebrew || comment.text)}
              </div>
            )}
          </div>

          {/* English Translation */}
          {showTranslation && comment.english && (
            <div className="entry-translation">
              <span className="translation-label">Translation:</span>
              <p className="translation-text">{comment.english}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
});

// Main CommentaryTabs Component
const CommentaryTabs = React.memo(({
  verse,
  verseNumber,
  book,
  chapter,
  // Data props
  onkelosData = null,
  // Display options
  enableClickableText = true,
  showTranslation = true,
  showFrench = false,
  // Text type
  isTalmud = false,
  isTorahBook = true,
  // Initial active tab
  initialTab = 'rashi'
}) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [commentaryData, setCommentaryData] = useState({});
  const [loading, setLoading] = useState({});
  const [errors, setErrors] = useState({});

  // Determine which tabs to show based on text type
  const availableTabs = useMemo(() => {
    if (isTalmud) {
      return Object.values(TALMUD_TABS);
    }
    // Torah books get all Torah tabs
    const tabs = [];
    if (isTorahBook && onkelosData) {
      tabs.push(COMMENTARY_TABS.targum);
    }
    tabs.push(COMMENTARY_TABS.rashi);
    if (isTorahBook) {
      tabs.push(COMMENTARY_TABS.ramban);
      tabs.push(COMMENTARY_TABS.ibnEzra);
      tabs.push(COMMENTARY_TABS.sforno);
    }
    return tabs;
  }, [isTalmud, isTorahBook, onkelosData]);

  // Load commentary data when tab changes
  const loadCommentary = useCallback(async (tabId) => {
    const cacheKey = `${tabId}:${book}:${chapter}:${verseNumber}`;

    // Check cache
    if (commentaryData[cacheKey]) return;

    setLoading(prev => ({ ...prev, [tabId]: true }));
    setErrors(prev => ({ ...prev, [tabId]: null }));

    try {
      let data = [];

      switch (tabId) {
        case 'rashi':
          data = await getRashiForVerse(book, chapter, verseNumber);
          break;
        case 'ramban':
          const rambanResult = await getRambanForVerse(book, chapter, verseNumber);
          data = rambanResult?.comments || [];
          break;
        case 'ibnEzra':
        case 'sforno':
        case 'tosafot':
        case 'maharsha':
          // Use generic commentary API
          const allCommentary = await getCommentary(book, chapter, verseNumber);
          const sourceMap = {
            ibnEzra: 'Ibn Ezra',
            sforno: 'Sforno',
            tosafot: 'Tosafot',
            maharsha: 'Maharsha'
          };
          data = allCommentary.filter(c => c.source === sourceMap[tabId]);
          break;
        default:
          break;
      }

      setCommentaryData(prev => ({ ...prev, [cacheKey]: data }));
    } catch (error) {
      console.error(`Failed to load ${tabId}:`, error);
      setErrors(prev => ({ ...prev, [tabId]: error.message }));
    } finally {
      setLoading(prev => ({ ...prev, [tabId]: false }));
    }
  }, [book, chapter, verseNumber, commentaryData]);

  // Load data when active tab changes
  useEffect(() => {
    if (activeTab && activeTab !== 'targum') {
      loadCommentary(activeTab);
    }
  }, [activeTab, loadCommentary]);

  // Get current tab's data
  const currentCacheKey = `${activeTab}:${book}:${chapter}:${verseNumber}`;
  const currentData = commentaryData[currentCacheKey] || [];
  const isLoading = loading[activeTab];
  const hasError = errors[activeTab];

  return (
    <div className="commentary-tabs">
      {/* Tab Header */}
      <div className="tabs-header">
        <div className="tabs-list" role="tablist">
          {availableTabs.map(tab => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              style={{ '--tab-color': tab.color }}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
              <span className="tab-hebrew">{tab.hebrewLabel}</span>
            </button>
          ))}
        </div>

        {/* Translation Toggle */}
        <button
          className={`translation-toggle ${showTranslation ? 'active' : ''}`}
          title="Toggle translation"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10" />
          </svg>
        </button>
      </div>

      {/* Tab Content */}
      <div className="tabs-content" role="tabpanel">
        {/* Loading State */}
        {isLoading && (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading {availableTabs.find(t => t.id === activeTab)?.label}...</p>
          </div>
        )}

        {/* Error State */}
        {hasError && !isLoading && (
          <div className="error-state">
            <p>Failed to load commentary: {hasError}</p>
            <button onClick={() => loadCommentary(activeTab)}>Retry</button>
          </div>
        )}

        {/* Targum Tab */}
        {activeTab === 'targum' && onkelosData && !isLoading && (
          <TargumSection onkelos={onkelosData} showFrench={showFrench} />
        )}

        {/* Rashi Tab - Special rendering with dual fonts */}
        {activeTab === 'rashi' && !isLoading && !hasError && (
          <div className="rashi-tab-content">
            {currentData.length > 0 ? (
              currentData.map((comment, idx) => (
                <RashiComment
                  key={idx}
                  comment={comment}
                  enableClickableText={enableClickableText}
                  showTranslation={showTranslation}
                />
              ))
            ) : (
              <div className="no-commentary">
                <div className="no-commentary-icon">📭</div>
                <p>No Rashi commentary available for this verse</p>
              </div>
            )}
          </div>
        )}

        {/* Other Commentary Tabs */}
        {!['targum', 'rashi'].includes(activeTab) && !isLoading && !hasError && (
          <CommentaryContent
            comments={currentData}
            source={availableTabs.find(t => t.id === activeTab)?.label || activeTab}
            enableClickableText={enableClickableText}
            showTranslation={showTranslation}
          />
        )}
      </div>
    </div>
  );
});

export default CommentaryTabs;
export { COMMENTARY_TABS, TALMUD_TABS };
