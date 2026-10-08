import React, { memo } from 'react';
import { extractAramaicRoot } from '../../../../../../constants/morphology';
import { getRootInfo } from '../../../../../../data/rootDatabase';

export const RootFamilyDisplay = memo(function RootFamilyDisplay({ root, word }) {
  const rootInfo = useMemo(() => root ? getRootInfo(root) : null, [root]);

  // Try to extract root from the word if not provided
  const extractedRoot = useMemo(() => {
    if (root) return null;
    const analysis = extractAramaicRoot(word);
    return analysis?.root || null;
  }, [root, word]);

  const displayRoot = root || extractedRoot;
  const displayInfo = rootInfo || (extractedRoot ? getRootInfo(extractedRoot) : null);

  if (!displayRoot && !displayInfo) return null;

  return (
    <div className="root-family-section">
      <div className="root-family-header">
        <span className="rf-icon">🌳</span>
        <span className="rf-title">Root Family</span>
        {displayRoot && (
          <span className="rf-root" dir="rtl">{displayRoot}</span>
        )}
      </div>

      {displayInfo && (
        <div className="root-family-content">
          {/* Base and Causative meanings */}
          <div className="rf-meanings">
            <div className="rf-meaning-pair">
              <span className="rf-label">Base:</span>
              <span className="rf-value">{displayInfo.base}</span>
            </div>
            {displayInfo.causative && displayInfo.causative !== displayInfo.base && (
              <div className="rf-meaning-pair">
                <span className="rf-label">Causative:</span>
                <span className="rf-value">{displayInfo.causative}</span>
              </div>
            )}
          </div>

          {/* Etymology */}
          {displayInfo.etymology && (
            <div className="rf-etymology">
              <span className="rf-etym-label">Etymology:</span>
              <span className="rf-etym-value">{displayInfo.etymology}</span>
            </div>
          )}

          {/* Cognates in sister languages */}
          {displayInfo.cognates && Object.keys(displayInfo.cognates).length > 0 && (
            <div className="rf-cognates">
              <span className="rf-cog-label">Cognates:</span>
              <div className="rf-cog-list">
                {Object.entries(displayInfo.cognates).map(([lang, word]) => (
                  <span key={lang} className="rf-cognate-chip">
                    <span className="cog-lang">{lang}</span>
                    <span className="cog-word">{word}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Frequency data */}
          {displayInfo.frequency && (
            <div className="rf-frequency">
              {displayInfo.frequency.tanakh > 0 && (
                <span className="rf-freq-chip tanakh">
                  תנ״ך: {displayInfo.frequency.tanakh.toLocaleString()}×
                </span>
              )}
              {displayInfo.frequency.talmud > 0 && (
                <span className="rf-freq-chip talmud">
                  תלמוד: {displayInfo.frequency.talmud.toLocaleString()}×
                </span>
              )}
            </div>
          )}

          {/* Semantic field */}
          {displayInfo.semanticField && (
            <div className="rf-semantic">
              <span className="rf-sem-chip">{displayInfo.semanticField}</span>
            </div>
          )}

          {/* Notes */}
          {displayInfo.notes && (
            <div className="rf-notes">
              <span className="rf-note-icon">💡</span>
              <span className="rf-note-text">{displayInfo.notes}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
RootFamilyDisplay.displayName = 'RootFamilyDisplay';

// =============================================================================
// Main LookupTab Component
