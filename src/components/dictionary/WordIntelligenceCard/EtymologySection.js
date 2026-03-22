/**
 * EtymologySection Component
 * Etymology section with cognates and proto-semitic info
 */

import React, { memo } from 'react';

/**
 * Etymology section with cognates and proto-semitic info
 * @param {Object} props
 * @param {Object} props.rootData - Root data from ROOT_MEANINGS
 * @param {string} props.root - Root string
 */
function EtymologySection({ rootData, root }) {
  if (!rootData) return null;

  const { etymology, cognates, notes, semanticField, frequency } = rootData;

  return (
    <div className="wic-etymology">
      <div className="ety-header">
        <span className="ety-icon">*</span>
        <span className="ety-title">Etymology</span>
        {semanticField && <span className="ety-field">{semanticField}</span>}
      </div>

      {etymology && (
        <div className="ety-proto">
          <span className="ety-label">Proto-Semitic:</span>
          <span className="ety-value">{etymology}</span>
        </div>
      )}

      {cognates && Object.keys(cognates).length > 0 && (
        <div className="ety-cognates">
          <span className="ety-label">Cognates:</span>
          <div className="cognate-list">
            {Object.entries(cognates).map(([lang, word]) => (
              <span key={lang} className="cognate-item">
                <span className="cognate-lang">{lang}:</span>
                <span className="cognate-word">{word}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {frequency && (
        <div className="ety-frequency">
          <div className="freq-item">
            <span className="freq-icon">📜</span>
            <span className="freq-number">{frequency.tanakh || 0}</span>
            <span className="freq-desc">Tanakh</span>
          </div>
          <div className="freq-item">
            <span className="freq-icon">📚</span>
            <span className="freq-number">{frequency.talmud || 0}</span>
            <span className="freq-desc">Talmud</span>
          </div>
        </div>
      )}

      {notes && <div className="ety-notes">{notes}</div>}
    </div>
  );
}

export default memo(EtymologySection);
