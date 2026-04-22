/**
 * CommentaryTab - Kollel/Yeshiva-Style Commentary Study
 *
 * Designed for serious Torah learning with features for:
 * - Dibur HaMatchil extraction (opening words)
 * - Study mode with questions and insights
 * - Commentary approach classification (Pshat/Drash)
 * - Personal notes and chiddushim
 * - Progress tracking (mark as learned)
 * - Comparison view for multiple commentaries
 * - Source citations and cross-references
 */
import { useState, useCallback, useEffect, useMemo } from 'react';
import RabbinicReferences from '../analysis/RabbinicReferences';
import {
  COMMENTATOR_INFO,
  APPROACH_COLORS,
  STUDY_PATH,
  COLORS,
  styles,
  spinnerKeyframes,
  fetchLinks,
  categorizeLinks,
  getLearnedCommentaries,
  clearCommentaryCache
} from './CommentaryTab.constants';
import { StudyCard } from './CommentaryTab.sections';

// Re-export clearCommentaryCache so existing imports keep working
export { clearCommentaryCache };

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function CommentaryTab({ commentaries, reference, book, chapter, verse }) {
  const [view, setView] = useState('commentary');
  const [studyMode, setStudyMode] = useState(true); // Default to study mode
  const [category, setCategory] = useState('primary');
  const [openItems, setOpenItems] = useState(new Set());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [learnedCount, setLearnedCount] = useState(0);
  // New: Comparison View state
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState(new Set());
  const [showCompareView, setShowCompareView] = useState(false);
  // New: Study Path state
  const [showStudyPath, setShowStudyPath] = useState(false);
  const [studyPathLevel, setStudyPathLevel] = useState('intermediate');

  // Parse reference
  const parsed = useMemo(() => {
    if (book && chapter && verse) return { book, chapter, verse };
    if (!reference) return null;
    const m = reference.match(/^([A-Za-z\s]+)[\s._](\d+)[.:_](\d+)/);
    if (m) return { book: m[1].trim(), chapter: parseInt(m[2]), verse: parseInt(m[3]) };
    return null;
  }, [reference, book, chapter, verse]);

  // Fetch commentaries
  useEffect(() => {
    if (commentaries && Object.values(commentaries).flat().length > 0) {
      setData(commentaries);
      return;
    }

    if (!parsed && !reference) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    fetchLinks(parsed?.book || book, parsed?.chapter || chapter, parsed?.verse || verse, reference)
      .then(links => {
        const organized = categorizeLinks(links);
        const total = Object.values(organized).flat().length;
        if (total === 0) setError('No commentaries found');
        setData(organized);
      })
      .catch(err => {
        setError(err.message);
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [commentaries, reference, book, chapter, verse, parsed]);

  // Update learned count
  useEffect(() => {
    const learned = getLearnedCommentaries();
    const allItems = data ? Object.values(data).flat() : [];
    const count = allItems.filter(item => learned[item.ref]).length;
    setLearnedCount(count);
  }, [data, openItems]); // Re-check when items change

  // Category counts
  const counts = useMemo(() => ({
    primary: data?.primary?.length || 0,
    rishonim: data?.rishonim?.length || 0,
    acharonim: data?.acharonim?.length || 0,
    modern: data?.modern?.length || 0,
    other: data?.other?.length || 0
  }), [data]);

  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0);

  // Auto-select first available category
  useEffect(() => {
    if (counts[category] === 0) {
      const first = ['primary', 'rishonim', 'acharonim', 'modern', 'other'].find(c => counts[c] > 0);
      if (first) setCategory(first);
    }
  }, [counts, category]);

  const currentItems = data?.[category] || [];

  const toggleItem = useCallback((idx) => {
    setOpenItems(prev => {
      const next = new Set(prev);
      const key = `${category}-${idx}`;
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, [category]);

  // Toggle comparison selection for an item
  const toggleCompareSelect = useCallback((itemRef) => {
    setSelectedForCompare(prev => {
      const next = new Set(prev);
      if (next.has(itemRef)) {
        next.delete(itemRef);
      } else if (next.size < 4) { // Max 4 items for comparison
        next.add(itemRef);
      }
      return next;
    });
  }, []);

  // Get all items flat for comparison view
  const allItems = useMemo(() => {
    if (!data) return [];
    return Object.values(data).flat();
  }, [data]);

  // Get selected items for comparison
  const compareItems = useMemo(() => {
    return allItems.filter(item => selectedForCompare.has(item.ref));
  }, [allItems, selectedForCompare]);

  // Get study path items that are available in current commentaries
  const availableStudyPath = useMemo(() => {
    const path = STUDY_PATH[studyPathLevel] || [];
    const available = [];
    const learned = getLearnedCommentaries();

    for (const step of path) {
      const foundItem = allItems.find(item =>
        item.nameKey === step.name || item.name.toLowerCase().includes(step.name)
      );
      if (foundItem) {
        available.push({
          ...step,
          item: foundItem,
          isComplete: !!learned[foundItem.ref],
          displayName: COMMENTATOR_INFO[step.name]?.heName || step.name
        });
      }
    }
    return available;
  }, [allItems, studyPathLevel]);

  const refDisplay = parsed ? `${parsed.book} ${parsed.chapter}:${parsed.verse}` : reference || 'Select a verse';

  const categoryLabels = {
    primary: { icon: '⭐', label: 'ראשונים' },
    rishonim: { icon: '📜', label: 'Rishonim' },
    acharonim: { icon: '📖', label: 'אחרונים' },
    modern: { icon: '📚', label: 'Modern' },
    other: { icon: '📝', label: 'Other' }
  };

  const progressPercent = totalCount > 0 ? Math.round((learnedCount / totalCount) * 100) : 0;

  return (
    <>
      <style>{spinnerKeyframes}</style>
      <div style={styles.container}>
        {/* Header with Mode Toggle */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <span style={styles.headerIcon}>📖</span>
            <span style={styles.headerText}>{refDisplay}</span>
          </div>

          <div style={styles.modeToggle}>
            <button
              style={{ ...styles.modeBtn, ...(studyMode ? styles.modeBtnActive : {}) }}
              onClick={() => setStudyMode(true)}
            >
              📚 Study
            </button>
            <button
              style={{ ...styles.modeBtn, ...(!studyMode ? styles.modeBtnActive : {}) }}
              onClick={() => setStudyMode(false)}
            >
              👁 Browse
            </button>
          </div>
        </div>

        {/* Tools Bar - Study Path & Compare */}
        <div style={{
          display: 'flex',
          gap: '6px',
          padding: '8px 12px',
          background: COLORS.parchmentDark,
          borderBottom: `1px solid ${COLORS.border}`
        }}>
          <button
            style={{
              ...styles.modeBtn,
              background: showStudyPath ? COLORS.gold : 'transparent',
              color: showStudyPath ? COLORS.ink : COLORS.inkMuted,
              border: `1px solid ${showStudyPath ? COLORS.gold : COLORS.border}`,
              borderRadius: '6px'
            }}
            onClick={() => setShowStudyPath(!showStudyPath)}
          >
            🛤️ Study Path
          </button>
          <button
            style={{
              ...styles.modeBtn,
              background: compareMode ? COLORS.gold : 'transparent',
              color: compareMode ? COLORS.ink : COLORS.inkMuted,
              border: `1px solid ${compareMode ? COLORS.gold : COLORS.border}`,
              borderRadius: '6px'
            }}
            onClick={() => {
              setCompareMode(!compareMode);
              if (compareMode) {
                setSelectedForCompare(new Set());
                setShowCompareView(false);
              }
            }}
          >
            ⚖️ Compare {compareMode && selectedForCompare.size > 0 ? `(${selectedForCompare.size})` : ''}
          </button>
          {compareMode && selectedForCompare.size >= 2 && (
            <button
              style={{
                ...styles.modeBtn,
                background: COLORS.primary,
                color: COLORS.cream,
                borderRadius: '6px',
                marginLeft: 'auto'
              }}
              onClick={() => setShowCompareView(true)}
            >
              View Comparison →
            </button>
          )}
        </div>

        {/* View Toggle */}
        <div style={styles.viewToggle}>
          <button
            style={{ ...styles.viewBtn, ...(view === 'commentary' ? styles.viewBtnActive : {}) }}
            onClick={() => setView('commentary')}
          >
            <span>📚</span>
            <span>מפרשים</span>
            {totalCount > 0 && <span style={styles.badge}>{totalCount}</span>}
          </button>
          <button
            style={{ ...styles.viewBtn, ...(view === 'rabbinic' ? styles.viewBtnActive : {}) }}
            onClick={() => setView('rabbinic')}
          >
            <span>📜</span>
            <span>תלמוד ומדרש</span>
          </button>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {/* Comparison View Modal */}
          {showCompareView && compareItems.length >= 2 && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.7)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}>
              <div style={{
                background: COLORS.cream,
                borderRadius: '16px',
                width: '100%',
                maxWidth: '1200px',
                maxHeight: '90vh',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`,
                  color: COLORS.cream
                }}>
                  <span style={{ fontWeight: '600', fontSize: '1rem' }}>
                    ⚖️ Commentary Comparison
                  </span>
                  <button
                    onClick={() => setShowCompareView(false)}
                    style={{
                      background: 'rgba(255,255,255,0.2)',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      color: COLORS.cream,
                      cursor: 'pointer'
                    }}
                  >
                    ✕ Close
                  </button>
                </div>
                <div style={styles.comparisonContainer}>
                  {compareItems.map((item, idx) => (
                    <div key={idx} style={styles.comparisonCard}>
                      <div style={styles.comparisonHeader}>
                        <span>{item.info?.icon || '📖'} {item.name}</span>
                        <span style={{
                          ...styles.approachBadge,
                          background: 'rgba(255,255,255,0.2)',
                          color: COLORS.cream
                        }}>
                          {APPROACH_COLORS[item.approach]?.label || 'פשט'}
                        </span>
                      </div>
                      <div style={styles.comparisonBody}>
                        {item.he && (
                          <div style={{ ...styles.textHe, marginTop: 0 }} dir="rtl">
                            {item.he}
                          </div>
                        )}
                        {item.en && (
                          <div style={{ ...styles.textEn, marginTop: '8px' }}>
                            {item.en}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Study Path Panel */}
          {showStudyPath && availableStudyPath.length > 0 && (
            <div style={styles.studyPathPanel}>
              <div style={styles.studyPathTitle}>
                <span>🛤️</span>
                <span>Recommended Study Path</span>
              </div>

              {/* Level Toggle */}
              <div style={styles.studyPathLevelToggle}>
                {['beginner', 'intermediate', 'advanced'].map(level => (
                  <button
                    key={level}
                    style={{
                      ...styles.studyPathLevelBtn,
                      ...(studyPathLevel === level ? styles.studyPathLevelActive : {})
                    }}
                    onClick={() => setStudyPathLevel(level)}
                  >
                    {level === 'beginner' ? '🌱' : level === 'intermediate' ? '🌿' : '🌳'}
                    {' '}{level.charAt(0).toUpperCase() + level.slice(1)}
                  </button>
                ))}
              </div>

              {/* Study Steps */}
              {availableStudyPath.map((step, idx) => (
                <div
                  key={idx}
                  style={{
                    ...styles.studyPathStep,
                    ...(step.isComplete ? styles.studyPathStepComplete : {})
                  }}
                  onClick={() => {
                    // Find the item in categories and open it
                    for (const [cat, items] of Object.entries(data || {})) {
                      const itemIdx = items.findIndex(i => i.ref === step.item.ref);
                      if (itemIdx >= 0) {
                        setCategory(cat);
                        setOpenItems(new Set([`${cat}-${itemIdx}`]));
                        setShowStudyPath(false);
                        break;
                      }
                    }
                  }}
                >
                  <div style={{
                    ...styles.studyPathNumber,
                    background: step.isComplete ? COLORS.success : COLORS.primary
                  }}>
                    {step.isComplete ? '✓' : idx + 1}
                  </div>
                  <div style={styles.studyPathStepInfo}>
                    <div style={styles.studyPathStepName}>
                      {step.displayName} - {step.item.name}
                    </div>
                    <div style={styles.studyPathStepReason}>{step.reason}</div>
                  </div>
                  <span style={{ color: COLORS.inkMuted }}>→</span>
                </div>
              ))}
            </div>
          )}

          {view === 'commentary' && (
            <>
              {loading ? (
                <div style={styles.state}>
                  <div style={styles.spinner} />
                  <span style={styles.stateText}>Loading commentaries...</span>
                </div>
              ) : error && totalCount === 0 ? (
                <div style={styles.state}>
                  <span style={styles.stateIcon}>📚</span>
                  <span style={styles.stateText}>{error}</span>
                  <span style={styles.stateSub}>{refDisplay}</span>
                </div>
              ) : totalCount === 0 ? (
                <div style={styles.state}>
                  <span style={styles.stateIcon}>📭</span>
                  <span style={styles.stateText}>Select a verse to begin learning</span>
                  <span style={styles.stateSub}>Choose a verse from the text above to see commentaries</span>
                </div>
              ) : (
                <>
                  {/* Study Progress */}
                  {studyMode && (
                    <div style={styles.studyStats}>
                      <div style={styles.statItem}>
                        <span>📖</span>
                        <span style={styles.statValue}>{totalCount}</span>
                        <span>commentaries</span>
                      </div>
                      <div style={styles.statItem}>
                        <span>✓</span>
                        <span style={styles.statValue}>{learnedCount}</span>
                        <span>learned</span>
                        <div style={styles.progressBar}>
                          <div style={{ ...styles.progressFill, width: `${progressPercent}%` }} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Category Tabs */}
                  <div style={styles.categoryTabs}>
                    {Object.entries(counts).filter(([, c]) => c > 0).map(([id, count]) => (
                      <button
                        key={id}
                        style={{ ...styles.catTab, ...(category === id ? styles.catTabActive : {}) }}
                        onClick={() => setCategory(id)}
                      >
                        <span>{categoryLabels[id].icon}</span>
                        <span>{categoryLabels[id].label}</span>
                        <span style={styles.catCount}>{count}</span>
                      </button>
                    ))}
                  </div>

                  {/* Commentary List */}
                  <div style={styles.list}>
                    {currentItems.map((item, idx) => (
                      <StudyCard
                        key={`${item.ref}-${idx}`}
                        item={item}
                        isOpen={openItems.has(`${category}-${idx}`)}
                        onToggle={() => toggleItem(idx)}
                        studyMode={studyMode}
                        showCompare={compareMode}
                        isCompareSelected={selectedForCompare.has(item.ref)}
                        onCompareToggle={() => toggleCompareSelect(item.ref)}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {view === 'rabbinic' && (
            parsed ? (
              <RabbinicReferences book={parsed.book} chapter={parsed.chapter} verse={parsed.verse} />
            ) : (
              <div style={styles.state}>
                <span style={styles.stateIcon}>📜</span>
                <span style={styles.stateText}>Select a verse to view Talmud & Midrash</span>
              </div>
            )
          )}
        </div>
      </div>
    </>
  );
}
