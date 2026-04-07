/**
 * DafDiagramSection - Visual Mermaid diagram generation for Talmud pages
 *
 * Extracted from TalmudToolsTab.js (PRO SCHOLAR V33)
 *
 * @module DafDiagramSection
 */
import React, { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { generateDafDiagram, DIAGRAM_TYPES } from '../../../services/scholarly/talmudDiagramService';
import { getTalmudDaf } from '../../../services/sefariaApi';
import { LazyLoadFallback } from '../TalmudSharedUI';
import ProScholarSummary from '../ProScholarSummary';

const MermaidDiagram = lazy(() => import('../../commentary/CommentarySummary/MermaidDiagram'));

// =============================================================================

const DafDiagramSection = React.memo(function DafDiagramSection({ reference, text }) {
  const [diagram, setDiagram] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [diagramType, setDiagramType] = useState(DIAGRAM_TYPES.SUMMARY);
  // PRO SCHOLAR V13: Full daf text state for complete analysis
  const [fullDafText, setFullDafText] = useState(null);
  const [loadingFullText, setLoadingFullText] = useState(false);

  // Parse tractate and daf from reference
  // Handles formats: "Shabbat 2a", "Shabbat.2a", "Bava_Metzia.59b"
  const dafInfo = useMemo(() => {
    if (!reference) return null;

    // Try multiple patterns
    // Pattern 1: "Shabbat 2a" (space separated)
    // Pattern 2: "Shabbat.2a" (dot separated)
    // Pattern 3: "Bava_Metzia.59b" (underscore in name, dot before daf)
    const patterns = [
      /^(.+?)\s+(\d+)([ab])$/i,       // Space: "Shabbat 2a"
      /^(.+?)\.(\d+)([ab])$/i,        // Dot: "Shabbat.2a"
      /^(.+?)[._](\d+)([ab])$/i       // Either: "Shabbat.2a" or "Shabbat_2a"
    ];

    for (const pattern of patterns) {
      const match = reference.match(pattern);
      if (match) {
        // Clean up tractate name (remove underscores, handle multi-word names)
        const tractate = match[1].replace(/_/g, ' ').trim();
        return { tractate, daf: `${match[2]}${match[3]}` };
      }
    }

    return null;
  }, [reference]);

  // PRO SCHOLAR V22: ALWAYS fetch full daf text from Sefaria for complete analysis
  // The text prop often contains only partial content (Mishna + small Gemara snippet)
  useEffect(() => {
    console.log('[DafDiagram V22] useEffect triggered:', { dafInfo, textLen: text?.length });

    if (!dafInfo) {
      console.log('[DafDiagram V22] No dafInfo available');
      setFullDafText(null);
      return;
    }

    let cancelled = false;
    setLoadingFullText(true);
    console.log(`[DafDiagram V22] Fetching ${dafInfo.tractate} ${dafInfo.daf}...`);

    // ALWAYS fetch the complete daf text from Sefaria
    // This ensures we have the full Gemara content for proper analysis
    getTalmudDaf(dafInfo.tractate, dafInfo.daf)
      .then(result => {
        console.log('[DafDiagram V22] API Response:', {
          ref: result?.ref,
          segments: result?.segments?.length,
          hebrewArr: result?.hebrew?.length,
          totalChars: result?.hebrew?.join?.(' ')?.length
        });

        if (!cancelled) {
          // Combine all Hebrew segments into one complete text
          const combinedText = result.hebrew?.join(' ') || '';
          if (combinedText.length > 0) {
            setFullDafText(combinedText);
            console.log(`[DafDiagram V22] SUCCESS: ${combinedText.length} chars, ${result.segments?.length} segments`);
          } else {
            // Fallback to provided text if fetch returns empty
            setFullDafText(text || '');
            console.warn(`[DafDiagram V22] API empty, fallback to text: ${text?.length || 0} chars`);
          }
          setLoadingFullText(false);
        }
      })
      .catch(err => {
        console.error('[DafDiagram V22] FETCH ERROR:', err.message, err);
        if (!cancelled) {
          // Use provided text as fallback
          setFullDafText(text || '');
          setLoadingFullText(false);
        }
      });

    return () => { cancelled = true; };
  }, [dafInfo, text]);

  // Generate diagram when reference or type changes
  useEffect(() => {
    if (!dafInfo) {
      setDiagram(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    // PRO SCHOLAR V12: Generate diagram from tractate/daf reference
    generateDafDiagram(dafInfo.tractate, dafInfo.daf, {
      type: diagramType
    })
      .then(result => {
        if (!cancelled) {
          setDiagram(result);
          setLoading(false);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [dafInfo, diagramType]);

  if (!reference) {
    return (
      <div className="empty-state scholarly">
        <div className="empty-icon">🗺️</div>
        <div className="empty-title">נווט לדף בתלמוד</div>
        <p className="empty-text">בחר מסכת ודף כדי לראות תרשים ויזואלי.</p>
      </div>
    );
  }

  if (!dafInfo) {
    return (
      <div className="empty-state scholarly">
        <div className="empty-icon">⚠️</div>
        <div className="empty-title">לא ניתן לנתח מקור זה</div>
        <p className="empty-text">
          התרשימים זמינים רק עבור דפי תלמוד בבלי.
          <br />
          <small style={{ opacity: 0.6 }}>
            (מקור: {reference || 'לא זוהה'})
          </small>
        </p>
      </div>
    );
  }

  return (
    <div className="daf-diagram-section">
      {/* Diagram Type Selector - Consolidated to 4 essential views */}
      <div className="diagram-type-selector">
        <div className="type-buttons compact">
          <button
            className={`type-btn ${diagramType === DIAGRAM_TYPES.SUMMARY ? 'active' : ''}`}
            onClick={() => setDiagramType(DIAGRAM_TYPES.SUMMARY)}
            type="button"
            title="סיכום הסוגיא - מבנה, מסקנות והלכה"
          >
            <span className="btn-icon">📋</span>
            <span className="btn-label">סיכום</span>
          </button>
          <button
            className={`type-btn ${diagramType === DIAGRAM_TYPES.SUGYA_FLOW ? 'active' : ''}`}
            onClick={() => setDiagramType(DIAGRAM_TYPES.SUGYA_FLOW)}
            type="button"
            title="מהלך הסוגיא - קושיות ותירוצים"
          >
            <span className="btn-icon">🔄</span>
            <span className="btn-label">מהלך</span>
          </button>
          <button
            className={`type-btn ${diagramType === DIAGRAM_TYPES.SPEAKER_NETWORK ? 'active' : ''}`}
            onClick={() => setDiagramType(DIAGRAM_TYPES.SPEAKER_NETWORK)}
            type="button"
            title="חכמי הסוגיא - דורות ויחסים"
          >
            <span className="btn-icon">👥</span>
            <span className="btn-label">חכמים</span>
          </button>
          <button
            className={`type-btn ${diagramType === DIAGRAM_TYPES.OVERVIEW ? 'active' : ''}`}
            onClick={() => setDiagramType(DIAGRAM_TYPES.OVERVIEW)}
            type="button"
            title="מפרשים ומקורות"
          >
            <span className="btn-icon">📚</span>
            <span className="btn-label">מפרשים</span>
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="diagram-loading">
          <div className="loading-spinner" />
          <span>טוען תרשים...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="diagram-error">
          <span className="error-icon">⚠️</span>
          <span className="error-text">{error}</span>
        </div>
      )}

      {/* PRO SCHOLAR V13: Loading state for full text fetch */}
      {diagramType === DIAGRAM_TYPES.SUMMARY && loadingFullText && (
        <div className="diagram-loading">
          <div className="loading-spinner" />
          <span>טוען טקסט מלא של הדף...</span>
        </div>
      )}

      {/* PRO SCHOLAR Summary - Smart text-based analysis with full daf text */}
      {diagramType === DIAGRAM_TYPES.SUMMARY && !loadingFullText && fullDafText && (
        <ProScholarSummary text={fullDafText} reference={reference} />
      )}

      {/* Mermaid Diagram Display - For non-summary types */}
      {diagramType !== DIAGRAM_TYPES.SUMMARY && !loading && !error && diagram && (
        <div className="diagram-container">
          <div className="diagram-header">
            <span className="diagram-title">{diagram.explanation}</span>
          </div>
          <Suspense fallback={<LazyLoadFallback />}>
            <MermaidDiagram
              chart={diagram.mermaid}
              id={`daf-diagram-${dafInfo.tractate}-${dafInfo.daf}-${diagramType}`}
              explanation={diagram.explanation}
            />
          </Suspense>
          {/* Stats */}
          {diagram.stats && (
            <div className="diagram-stats">
              {diagram.stats.commentators > 0 && (
                <span className="stat-item">📜 {diagram.stats.commentators} מפרשים</span>
              )}
              {diagram.stats.speakers > 0 && (
                <span className="stat-item">💬 {diagram.stats.speakers} חכמים</span>
              )}
              {diagram.stats.verses > 0 && (
                <span className="stat-item">📖 {diagram.stats.verses} פסוקים</span>
              )}
              {diagram.stats.parallels > 0 && (
                <span className="stat-item">🔗 {diagram.stats.parallels} מקבילות</span>
              )}
              {diagram.stats.patterns > 0 && (
                <span className="stat-item">📊 {diagram.stats.patterns} סימני מבנה</span>
              )}
              {diagram.stats.disputes > 0 && (
                <span className="stat-item">⚔️ {diagram.stats.disputes} מחלוקות</span>
              )}
              {diagram.stats.concepts > 0 && (
                <span className="stat-item">🧠 {diagram.stats.concepts} מושגים</span>
              )}
              {diagram.stats.relationships > 0 && (
                <span className="stat-item">🔗 {diagram.stats.relationships} קשרים</span>
              )}
              {diagram.stats.famousPairs > 0 && (
                <span className="stat-item">⭐ {diagram.stats.famousPairs} זוגות מפורסמים</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Fallback for SUMMARY without text */}
      {diagramType === DIAGRAM_TYPES.SUMMARY && !loadingFullText && !fullDafText && (
        <div className="pro-summary-empty">
          <span className="empty-icon">📚</span>
          <span>נווט לדף בתלמוד לקבלת סיכום מפורט</span>
        </div>
      )}
    </div>
  );
});


export default DafDiagramSection;
