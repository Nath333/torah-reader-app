// =============================================================================
// Styles du module Commentary — couleurs, feuille de styles inline, keyframes.
// (extrait de CommentaryTab.constants.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

// =============================================================================
// SCHOLARLY COLOR PALETTE
// =============================================================================

export const COLORS = {
  primary: '#8B2635',
  primaryLight: '#A63446',
  primaryDark: '#6B1D2A',
  gold: '#C49A3D',
  goldLight: '#D4AA4D',
  goldDark: '#A67C2E',
  parchment: '#FAF6F0',
  parchmentDark: '#F0EBE3',
  cream: '#FFFDF8',
  ink: '#2C1810',
  inkLight: '#4A3328',
  inkMuted: '#7A6A5A',
  border: '#E5DDD4',
  borderDark: '#D4C9BC',
  shadow: 'rgba(44, 24, 16, 0.08)',
  shadowDark: 'rgba(44, 24, 16, 0.15)',
  success: '#2E7D32',
  successBg: '#E8F5E9'
};

// =============================================================================
// STYLES
// =============================================================================

export const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: `linear-gradient(180deg, ${COLORS.parchment} 0%, ${COLORS.cream} 100%)`,
    borderRadius: '12px',
    overflow: 'hidden',
    border: `1px solid ${COLORS.border}`
  },
  header: {
    padding: '12px 16px',
    background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`,
    color: COLORS.cream,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: `3px solid ${COLORS.gold}`
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  headerIcon: {
    fontSize: '1.2rem'
  },
  headerText: {
    fontFamily: 'var(--font-hebrew, "SBL Hebrew", serif)',
    fontSize: '0.95rem',
    fontWeight: '600'
  },
  modeToggle: {
    display: 'flex',
    gap: '4px',
    background: 'rgba(255,255,255,0.15)',
    borderRadius: '8px',
    padding: '3px'
  },
  modeBtn: {
    padding: '6px 12px',
    border: 'none',
    borderRadius: '6px',
    background: 'transparent',
    color: 'rgba(255,255,255,0.7)',
    fontSize: '0.78rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  modeBtnActive: {
    background: 'rgba(255,255,255,0.95)',
    color: COLORS.primary
  },
  viewToggle: {
    display: 'flex',
    gap: '4px',
    padding: '8px 10px',
    background: COLORS.parchmentDark,
    borderBottom: `1px solid ${COLORS.border}`
  },
  viewBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '10px 12px',
    border: `1px solid ${COLORS.border}`,
    borderRadius: '8px',
    background: COLORS.cream,
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: '500',
    color: COLORS.inkMuted,
    transition: 'all 0.2s'
  },
  viewBtnActive: {
    background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryLight} 100%)`,
    color: COLORS.cream,
    borderColor: COLORS.primaryDark
  },
  badge: {
    background: COLORS.gold,
    color: COLORS.ink,
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '0.72rem',
    fontWeight: '700'
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: '12px'
  },
  categoryTabs: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginBottom: '12px'
  },
  catTab: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    padding: '8px 12px',
    border: `1px solid ${COLORS.border}`,
    borderRadius: '20px',
    background: COLORS.cream,
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: '500',
    color: COLORS.inkLight,
    transition: 'all 0.2s'
  },
  catTabActive: {
    background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryLight} 100%)`,
    color: COLORS.cream,
    borderColor: COLORS.primaryDark
  },
  catCount: {
    background: 'rgba(255,255,255,0.25)',
    padding: '1px 6px',
    borderRadius: '10px',
    fontSize: '0.72rem',
    fontWeight: '600'
  },
  studyStats: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
    marginBottom: '12px',
    background: COLORS.cream,
    borderRadius: '10px',
    border: `1px solid ${COLORS.border}`,
    fontSize: '0.82rem'
  },
  statItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: COLORS.inkMuted
  },
  statValue: {
    fontWeight: '600',
    color: COLORS.ink
  },
  progressBar: {
    flex: 1,
    maxWidth: '120px',
    height: '6px',
    background: COLORS.border,
    borderRadius: '3px',
    overflow: 'hidden',
    marginLeft: '12px'
  },
  progressFill: {
    height: '100%',
    background: `linear-gradient(90deg, ${COLORS.gold} 0%, ${COLORS.goldLight} 100%)`,
    borderRadius: '3px',
    transition: 'width 0.3s'
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  // Study Card Styles
  card: {
    background: COLORS.cream,
    borderRadius: '12px',
    border: `1px solid ${COLORS.border}`,
    overflow: 'hidden',
    transition: 'all 0.2s'
  },
  cardLearned: {
    borderColor: COLORS.success,
    borderLeftWidth: '4px'
  },
  cardOpen: {
    boxShadow: `0 6px 20px ${COLORS.shadowDark}`,
    borderColor: COLORS.gold
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '12px 14px',
    border: 'none',
    background: 'transparent',
    width: '100%',
    cursor: 'pointer',
    textAlign: 'left'
  },
  cardIcon: {
    fontSize: '1.3rem',
    lineHeight: 1
  },
  cardMain: {
    flex: 1,
    minWidth: 0
  },
  cardNameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap'
  },
  cardName: {
    fontWeight: '600',
    fontSize: '0.92rem',
    color: COLORS.primary
  },
  cardHeName: {
    fontFamily: 'var(--font-hebrew, "SBL Hebrew", serif)',
    fontSize: '0.88rem',
    color: COLORS.inkLight
  },
  approachBadge: {
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '0.7rem',
    fontWeight: '600'
  },
  difficultyDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%'
  },
  cardDibur: {
    marginTop: '6px',
    padding: '6px 10px',
    background: COLORS.parchmentDark,
    borderRadius: '6px',
    fontFamily: 'var(--font-hebrew, "SBL Hebrew", serif)',
    fontSize: '0.88rem',
    color: COLORS.ink,
    direction: 'rtl',
    borderRight: `3px solid ${COLORS.gold}`
  },
  cardMeta: {
    marginTop: '4px',
    fontSize: '0.75rem',
    color: COLORS.inkMuted
  },
  cardRight: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '6px'
  },
  cardArrow: {
    fontSize: '0.7rem',
    color: COLORS.gold,
    transition: 'transform 0.2s'
  },
  learnedCheck: {
    color: COLORS.success,
    fontSize: '1rem'
  },
  cardBody: {
    padding: '0 14px 14px',
    borderTop: `1px solid ${COLORS.border}`,
    background: `linear-gradient(180deg, ${COLORS.parchment} 0%, ${COLORS.cream} 100%)`
  },
  // Study Mode Elements
  studySection: {
    marginTop: '14px',
    padding: '12px',
    background: COLORS.cream,
    borderRadius: '10px',
    border: `1px solid ${COLORS.border}`
  },
  sectionTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '10px',
    fontSize: '0.85rem',
    fontWeight: '600',
    color: COLORS.primary
  },
  questionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  questionItem: {
    padding: '10px 12px',
    background: COLORS.parchment,
    borderRadius: '8px',
    fontSize: '0.88rem',
    lineHeight: 1.5,
    borderLeft: `3px solid ${COLORS.gold}`
  },
  noteArea: {
    width: '100%',
    minHeight: '80px',
    padding: '10px 12px',
    border: `1px solid ${COLORS.border}`,
    borderRadius: '8px',
    fontFamily: 'inherit',
    fontSize: '0.88rem',
    resize: 'vertical',
    background: COLORS.cream
  },
  noteActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    marginTop: '8px'
  },
  actionBtn: {
    padding: '6px 14px',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.8rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  primaryBtn: {
    background: COLORS.primary,
    color: COLORS.cream
  },
  secondaryBtn: {
    background: COLORS.parchment,
    color: COLORS.inkLight,
    border: `1px solid ${COLORS.border}`
  },
  learnedBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    border: `2px solid ${COLORS.success}`,
    borderRadius: '8px',
    background: 'transparent',
    color: COLORS.success,
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  learnedBtnActive: {
    background: COLORS.successBg,
    borderColor: COLORS.success
  },
  textHe: {
    fontFamily: 'var(--font-hebrew, "SBL Hebrew", serif)',
    fontSize: '1.1rem',
    lineHeight: 2,
    color: COLORS.ink,
    marginTop: '12px',
    padding: '14px',
    background: COLORS.cream,
    borderRadius: '10px',
    borderRight: `4px solid ${COLORS.gold}`,
    direction: 'rtl'
  },
  textEn: {
    fontSize: '0.92rem',
    lineHeight: 1.75,
    color: COLORS.inkLight,
    marginTop: '10px',
    paddingLeft: '14px',
    borderLeft: `2px solid ${COLORS.border}`,
    fontStyle: 'italic'
  },
  infoBox: {
    marginTop: '12px',
    padding: '12px',
    background: COLORS.parchmentDark,
    borderRadius: '10px',
    fontSize: '0.82rem',
    lineHeight: 1.6
  },
  infoRow: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap'
  },
  infoItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  infoLabel: {
    color: COLORS.inkMuted
  },
  infoValue: {
    fontWeight: '500',
    color: COLORS.ink
  },
  // Empty/Loading States
  state: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 24px',
    textAlign: 'center',
    gap: '12px'
  },
  stateIcon: {
    fontSize: '3rem',
    opacity: 0.6
  },
  stateText: {
    fontSize: '1rem',
    fontWeight: '600',
    color: COLORS.ink
  },
  stateSub: {
    fontSize: '0.88rem',
    color: COLORS.inkMuted,
    maxWidth: '280px'
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: `3px solid ${COLORS.border}`,
    borderTopColor: COLORS.primary,
    borderRadius: '50%',
    animation: 'spin 0.9s linear infinite'
  },
  fallbackLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 0',
    color: COLORS.primary,
    textDecoration: 'none',
    fontSize: '0.88rem',
    fontWeight: '500'
  },
  // Comparison View Styles
  comparisonContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '12px',
    padding: '12px'
  },
  comparisonCard: {
    background: COLORS.cream,
    borderRadius: '12px',
    border: `2px solid ${COLORS.border}`,
    overflow: 'hidden'
  },
  comparisonCardSelected: {
    borderColor: COLORS.gold,
    boxShadow: `0 0 0 2px ${COLORS.gold}33`
  },
  comparisonHeader: {
    padding: '10px 14px',
    background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryLight} 100%)`,
    color: COLORS.cream,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  comparisonBody: {
    padding: '12px',
    maxHeight: '300px',
    overflow: 'auto'
  },
  // Cross-reference badges
  crossRefBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '3px 8px',
    borderRadius: '12px',
    fontSize: '0.72rem',
    fontWeight: '600',
    marginRight: '6px',
    marginBottom: '4px'
  },
  crossRefAgree: {
    background: '#E3F2FD',
    color: '#1565C0'
  },
  crossRefDisagree: {
    background: '#FFEBEE',
    color: '#C62828'
  },
  // Study Path Styles
  studyPathPanel: {
    padding: '14px',
    background: `linear-gradient(135deg, ${COLORS.parchment} 0%, ${COLORS.cream} 100%)`,
    borderRadius: '12px',
    border: `1px solid ${COLORS.border}`,
    marginBottom: '16px'
  },
  studyPathTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
    fontSize: '0.95rem',
    fontWeight: '600',
    color: COLORS.primary
  },
  studyPathLevelToggle: {
    display: 'flex',
    gap: '6px',
    marginBottom: '12px'
  },
  studyPathLevelBtn: {
    flex: 1,
    padding: '8px 12px',
    border: `1px solid ${COLORS.border}`,
    borderRadius: '8px',
    background: COLORS.cream,
    fontSize: '0.8rem',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  studyPathLevelActive: {
    background: COLORS.primary,
    color: COLORS.cream,
    borderColor: COLORS.primaryDark
  },
  studyPathStep: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    background: COLORS.cream,
    borderRadius: '8px',
    marginBottom: '8px',
    border: `1px solid ${COLORS.border}`,
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  studyPathStepActive: {
    borderColor: COLORS.gold,
    background: `${COLORS.gold}15`
  },
  studyPathStepComplete: {
    borderColor: COLORS.success,
    background: COLORS.successBg
  },
  studyPathNumber: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    background: COLORS.primary,
    color: COLORS.cream,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    fontWeight: '700'
  },
  studyPathStepInfo: {
    flex: 1
  },
  studyPathStepName: {
    fontWeight: '600',
    fontSize: '0.88rem',
    color: COLORS.ink
  },
  studyPathStepReason: {
    fontSize: '0.78rem',
    color: COLORS.inkMuted,
    marginTop: '2px'
  },
  // Summary Styles
  summaryBox: {
    padding: '10px 12px',
    background: `linear-gradient(135deg, ${COLORS.gold}15 0%, ${COLORS.gold}08 100%)`,
    borderRadius: '8px',
    border: `1px solid ${COLORS.gold}40`,
    marginTop: '10px'
  },
  summaryTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.8rem',
    fontWeight: '600',
    color: COLORS.goldDark,
    marginBottom: '8px'
  },
  summaryPoint: {
    fontSize: '0.85rem',
    lineHeight: 1.5,
    color: COLORS.ink,
    padding: '6px 0',
    borderBottom: `1px solid ${COLORS.border}`
  },
  // Compare selection checkbox
  compareCheckbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
    accentColor: COLORS.gold
  },
  compareBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    background: `linear-gradient(90deg, ${COLORS.gold}20 0%, ${COLORS.gold}10 100%)`,
    borderBottom: `1px solid ${COLORS.gold}40`
  },
  compareBarText: {
    fontSize: '0.85rem',
    fontWeight: '500',
    color: COLORS.ink
  },
  compareBarBtn: {
    padding: '6px 14px',
    border: 'none',
    borderRadius: '6px',
    background: COLORS.gold,
    color: COLORS.ink,
    fontSize: '0.82rem',
    fontWeight: '600',
    cursor: 'pointer'
  }
};

export const spinnerKeyframes = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

