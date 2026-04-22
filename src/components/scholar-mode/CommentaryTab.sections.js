/**
 * CommentaryTab.sections - Sub-components for commentary display
 *
 * Extracted from CommentaryTab.js to reduce file size.
 * Contains: StudyCard component and related UI elements.
 */
import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import {
  APPROACH_COLORS,
  COLORS,
  styles,
  fetchText,
  detectCrossReferences,
  extractKeySummary,
  generateStudyQuestions,
  getLearnedCommentaries,
  setLearnedCommentary,
  getStudyNotes,
  saveStudyNote
} from './CommentaryTab.constants';

// Lazy-loaded RabbiInfoPanel for commentator biographies
const RabbiInfoPanel = lazy(() => import('./RabbiInfoPanel'));

// =============================================================================
// STUDY CARD COMPONENT
// =============================================================================

export function StudyCard({ item, isOpen, onToggle, studyMode, isCompareSelected, onCompareToggle, showCompare }) {
  const [text, setText] = useState(null);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState('');
  const [isLearned, setIsLearned] = useState(false);
  const [showQuestions, setShowQuestions] = useState(false);
  const [showSummary, setShowSummary] = useState(true);
  const [showRabbiInfo, setShowRabbiInfo] = useState(false);

  // Load learned status and notes
  useEffect(() => {
    const learned = getLearnedCommentaries();
    setIsLearned(!!learned[item.ref]);
    const notes = getStudyNotes();
    setNote(notes[item.ref]?.text || '');
  }, [item.ref]);

  // Fetch text when opened
  useEffect(() => {
    if (isOpen && !item.he && !item.en && !text && !loading) {
      setLoading(true);
      fetchText(item.ref).then(data => {
        setText(data);
        setLoading(false);
      });
    }
  }, [isOpen, item, text, loading]);

  const heContent = text?.he || item.he;
  const enContent = text?.en || item.en;
  const info = item.info;
  const approach = APPROACH_COLORS[item.approach] || APPROACH_COLORS.pshat;
  const questions = useMemo(() =>
    generateStudyQuestions(item.name, heContent, enContent),
    [item.name, heContent, enContent]
  );

  // Detect cross-references to other commentators
  const crossRefs = useMemo(() =>
    detectCrossReferences(heContent, enContent, item.nameKey),
    [heContent, enContent, item.nameKey]
  );

  // Extract key summary points
  const summaryPoints = useMemo(() =>
    extractKeySummary(heContent, enContent),
    [heContent, enContent]
  );

  const handleToggleLearned = (e) => {
    e.stopPropagation();
    const newState = !isLearned;
    setIsLearned(newState);
    setLearnedCommentary(item.ref, newState);
  };

  const handleSaveNote = () => {
    saveStudyNote(item.ref, note);
  };

  const difficultyColor = {
    beginner: '#4CAF50',
    intermediate: '#FF9800',
    advanced: '#F44336'
  };

  return (
    <div style={{
      ...styles.card,
      ...(isOpen ? styles.cardOpen : {}),
      ...(isLearned ? styles.cardLearned : {}),
      ...(isCompareSelected ? styles.comparisonCardSelected : {})
    }}>
      <button style={styles.cardHeader} onClick={onToggle}>
        {showCompare && (
          <input
            type="checkbox"
            checked={isCompareSelected}
            onChange={(e) => {
              e.stopPropagation();
              onCompareToggle?.();
            }}
            onClick={(e) => e.stopPropagation()}
            style={styles.compareCheckbox}
            title="Add to comparison"
          />
        )}
        <span style={styles.cardIcon}>{info?.icon || '📖'}</span>

        <div style={styles.cardMain}>
          <div style={styles.cardNameRow}>
            <span style={styles.cardName}>{item.name}</span>
            {info?.heName && <span style={styles.cardHeName}>({info.heName})</span>}
            <span style={{
              ...styles.approachBadge,
              background: approach.bg,
              color: approach.text
            }}>
              {approach.label}
            </span>
            {info?.difficulty && (
              <span style={{
                ...styles.difficultyDot,
                background: difficultyColor[info.difficulty]
              }} title={info.difficulty} />
            )}
          </div>

          {item.diburHaMatchil && (
            <div style={styles.cardDibur}>
              ד"ה {item.diburHaMatchil}
            </div>
          )}

          {info && (
            <div style={styles.cardMeta}>
              {info.years} • {info.location}
            </div>
          )}
        </div>

        <div style={styles.cardRight}>
          {isLearned && <span style={styles.learnedCheck}>✓</span>}
          <span style={{
            ...styles.cardArrow,
            transform: isOpen ? 'rotate(90deg)' : 'none'
          }}>▶</span>
        </div>
      </button>

      {isOpen && (
        <div style={styles.cardBody}>
          {loading ? (
            <div style={{ ...styles.state, padding: '24px' }}>
              <div style={styles.spinner} />
              <span style={{ fontSize: '0.88rem', color: COLORS.inkMuted }}>Loading...</span>
            </div>
          ) : heContent || enContent ? (
            <>
              {/* Cross-References - Show when this commentator references others */}
              {crossRefs.length > 0 && (
                <div style={{ marginBottom: '10px' }}>
                  {crossRefs.map((ref, i) => (
                    <span
                      key={i}
                      style={{
                        ...styles.crossRefBadge,
                        ...(ref.isDisagreement ? styles.crossRefDisagree : styles.crossRefAgree)
                      }}
                    >
                      {ref.isDisagreement ? '⚔️' : '🔗'}
                      {ref.isDisagreement ? 'Disagrees with' : 'References'} {ref.displayName}
                    </span>
                  ))}
                </div>
              )}

              {/* Commentary Text */}
              {heContent && (
                <div style={styles.textHe} dir="rtl">
                  {heContent}
                </div>
              )}
              {enContent && (
                <div style={styles.textEn}>
                  {enContent}
                </div>
              )}

              {/* Quick Summary - Key Points */}
              {studyMode && summaryPoints.length > 0 && (
                <div style={styles.summaryBox}>
                  <div
                    style={{ ...styles.summaryTitle, cursor: 'pointer' }}
                    onClick={() => setShowSummary(!showSummary)}
                  >
                    <span>💡</span>
                    <span>Key Points</span>
                    <span style={{ marginLeft: 'auto', fontSize: '0.7rem' }}>
                      {showSummary ? '▼' : '▶'}
                    </span>
                  </div>
                  {showSummary && summaryPoints.map((point, i) => (
                    <div key={i} style={styles.summaryPoint}>{point}</div>
                  ))}
                </div>
              )}

              {/* Commentator Info */}
              {info && (
                <div style={styles.infoBox}>
                  <div style={styles.infoRow}>
                    <div style={styles.infoItem}>
                      <span style={styles.infoLabel}>Era:</span>
                      <span style={styles.infoValue}>{info.era}</span>
                    </div>
                    <div style={styles.infoItem}>
                      <span style={styles.infoLabel}>Style:</span>
                      <span style={styles.infoValue}>{info.style}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowRabbiInfo(!showRabbiInfo);
                      }}
                      style={{
                        marginLeft: 'auto',
                        padding: '4px 10px',
                        border: `1px solid ${showRabbiInfo ? COLORS.gold : COLORS.border}`,
                        borderRadius: '6px',
                        background: showRabbiInfo ? `${COLORS.gold}20` : 'transparent',
                        color: showRabbiInfo ? COLORS.goldDark : COLORS.inkMuted,
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <span>📜</span>
                      <span>{showRabbiInfo ? 'Hide' : 'Show'} Biography</span>
                    </button>
                  </div>

                  {/* RabbiInfoPanel - Show detailed biography */}
                  {showRabbiInfo && (
                    <div style={{ marginTop: '12px' }}>
                      <Suspense fallback={
                        <div style={{ padding: '16px', textAlign: 'center', color: COLORS.inkMuted }}>
                          Loading biography...
                        </div>
                      }>
                        <RabbiInfoPanel
                          rabbiName={info.heName || item.name}
                          onClose={() => setShowRabbiInfo(false)}
                          compact={true}
                        />
                      </Suspense>
                    </div>
                  )}
                </div>
              )}

              {/* Study Mode Features */}
              {studyMode && (
                <>
                  {/* Study Questions */}
                  <div style={styles.studySection}>
                    <div
                      style={{ ...styles.sectionTitle, cursor: 'pointer' }}
                      onClick={() => setShowQuestions(!showQuestions)}
                    >
                      <span>🎯</span>
                      <span>Study Questions</span>
                      <span style={{ marginLeft: 'auto', fontSize: '0.75rem' }}>
                        {showQuestions ? '▼' : '▶'}
                      </span>
                    </div>
                    {showQuestions && (
                      <div style={styles.questionList}>
                        {questions.map((q, i) => (
                          <div key={i} style={styles.questionItem}>{q}</div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Personal Notes */}
                  <div style={styles.studySection}>
                    <div style={styles.sectionTitle}>
                      <span>📝</span>
                      <span>My Notes & Chiddushim</span>
                    </div>
                    <textarea
                      style={styles.noteArea}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Write your insights, questions, or connections..."
                    />
                    <div style={styles.noteActions}>
                      <button
                        style={{ ...styles.actionBtn, ...styles.primaryBtn }}
                        onClick={handleSaveNote}
                      >
                        Save Note
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Mark as Learned Button */}
              <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  style={{
                    ...styles.learnedBtn,
                    ...(isLearned ? styles.learnedBtnActive : {})
                  }}
                  onClick={handleToggleLearned}
                >
                  <span>{isLearned ? '✓' : '○'}</span>
                  <span>{isLearned ? 'Learned' : 'Mark as Learned'}</span>
                </button>
              </div>
            </>
          ) : (
            <a
              href={`https://www.sefaria.org/${item.ref?.replace(/ /g, '_')}`}
              target="_blank"
              rel="noopener noreferrer"
              style={styles.fallbackLink}
            >
              View on Sefaria →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
