/**
 * AIBekiusMode - AI-Enhanced Overview (בקיאות)
 *
 * Parallel to TalmudToolsTab's Bekius mode, but with AI enhancement:
 * - AI natural language summary
 * - AI extracts key halacha
 * - AI identifies main points
 * - AI provides quick reference
 */
import React, { useState, useEffect } from 'react';
import {
  ModeHeader,
  ModeError,
  ModeEmptyState,
  ModeResultText,
  ActionButton,
  WaitingState,
  useAIAnalysis,
  modePropTypes
} from './shared';

// =============================================================================
// PROMPT - Bekius analysis prompt
// =============================================================================

const BEKIUS_PROMPT = `Provide a quick overview (בקיאות) of this text in Hebrew:

1. **סיכום בשורה אחת**: One sentence summary
2. **נושא עיקרי**: Main topic/subject
3. **דמויות מרכזיות**: Key figures mentioned (if any)
4. **עיקר ההלכה**: Main halachic point (if applicable)
5. **נקודות מפתח**: 3-5 bullet points of key takeaways
6. **קשרים**: Related topics or texts to explore

Format clearly with headers. Be concise but comprehensive. Respond in Hebrew.`;

// =============================================================================
// HELPER - Parse AI result into sections
// =============================================================================

function parseResultSections(text) {
  if (!text) return null;

  const sections = {
    summary: null,
    keyPoints: []
  };

  // Try to extract one-line summary
  const summaryMatch = text.match(/סיכום בשורה אחת[:\s]*([^\n]+)/i) ||
                       text.match(/סיכום[:\s]*([^\n]+)/i);
  if (summaryMatch) {
    sections.summary = summaryMatch[1].trim();
  }

  // Extract bullet points (• - or *)
  const bulletMatches = text.match(/[•*-]\s*([^\n]+)/g);
  if (bulletMatches) {
    sections.keyPoints = bulletMatches
      .map(m => m.replace(/^[•*-]\s*/, '').trim())
      .filter(p => p.length > 5)
      .slice(0, 6);
  }

  return sections;
}

// =============================================================================
// COMPONENT
// =============================================================================

const AIBekiusMode = ({ text, reference, onResult, loading, setLoading }) => {
  const [autoRun, setAutoRun] = useState(false);

  // Use shared hook for AI analysis (DRY)
  const { result, error, runAnalysis, clearResult } = useAIAnalysis({
    text,
    reference,
    onResult,
    setLoading
  });

  // Auto-run analysis when text changes (if enabled)
  useEffect(() => {
    if (autoRun && text && !loading && !result) {
      runAnalysis(BEKIUS_PROMPT, 'summary');
    }
  }, [text, autoRun, loading, result, runAnalysis]);

  // Parse result into sections
  const parsedSections = parseResultSections(result);

  return (
    <div className="ai-bekius-mode">
      <ModeHeader mode="bekius" />

      {/* Action buttons */}
      <div className="bekius-actions">
        <ActionButton
          onClick={() => runAnalysis(BEKIUS_PROMPT, 'summary')}
          disabled={!text}
          loading={loading}
          icon="🤖"
          loadingText="מנתח..."
          className="bekius-btn"
        >
          צור סיכום AI
        </ActionButton>

        {result && (
          <ActionButton
            onClick={clearResult}
            variant="secondary"
            icon="🗑️"
            className="bekius-btn"
          >
            נקה
          </ActionButton>
        )}

        <label className="auto-run-toggle">
          <input
            type="checkbox"
            checked={autoRun}
            onChange={(e) => setAutoRun(e.target.checked)}
          />
          <span>הפעל אוטומטית</span>
        </label>
      </div>

      <ModeError error={error} className="bekius-error" />

      {/* Result display */}
      {parsedSections && (
        <div className="bekius-result">
          {/* One-line summary - highlighted */}
          {parsedSections.summary && (
            <div className="bekius-section summary-section">
              <div className="section-icon">📋</div>
              <div className="section-content">
                <span className="summary-text">{parsedSections.summary}</span>
              </div>
            </div>
          )}

          {/* Key points as checklist */}
          {parsedSections.keyPoints?.length > 0 && (
            <div className="bekius-section keypoints-section">
              <div className="section-header">
                <span className="section-icon">✓</span>
                <span className="section-title">נקודות מפתח</span>
              </div>
              <ul className="keypoints-list">
                {parsedSections.keyPoints.map((point, i) => (
                  <li key={i} className="keypoint-item">
                    <span className="keypoint-bullet">•</span>
                    <span className="keypoint-text">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Full result */}
          <details className="full-result-details">
            <summary>
              <span className="details-icon">📄</span>
              <span>הצג תוצאה מלאה</span>
            </summary>
            <div className="full-result-content">
              <ModeResultText text={result} />
            </div>
          </details>
        </div>
      )}

      {!text && <ModeEmptyState mode="bekius" />}

      {text && !result && !loading && (
        <WaitingState actionText='לחץ "צור סיכום AI" להתחיל' />
      )}
    </div>
  );
};

AIBekiusMode.propTypes = modePropTypes;

export default AIBekiusMode;
