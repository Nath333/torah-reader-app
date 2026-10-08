import React, { memo } from 'react';
import { SEMANTIC_DOMAINS } from '../../../../../../services/scholarly/semanticFieldService';

export const SemanticFieldDisplay = memo(({ semantics }) => {
  if (!semantics) return null;
  return (
    <div className="semantic-field-section">
      <div className="section-header">
        <span className="section-icon">🌐</span>
        <span className="section-title">Semantic Fields</span>
      </div>
      <div className="semantic-domains">
        {semantics.domains?.map(domain => (
          <span key={domain} className="domain-chip" title={SEMANTIC_DOMAINS[domain]?.description}>
            {SEMANTIC_DOMAINS[domain]?.label || domain}
          </span>
        ))}
      </div>
      {semantics.synonyms?.length > 0 && (
        <div className="semantic-row">
          <span className="semantic-label">Synonyms:</span>
          <div className="semantic-words">
            {semantics.synonyms.slice(0, 5).map((syn, i) => (
              <span key={i} className="synonym-chip">{syn}</span>
            ))}
          </div>
        </div>
      )}
      {semantics.antonyms?.length > 0 && (
        <div className="semantic-row">
          <span className="semantic-label">Antonyms:</span>
          <div className="semantic-words">
            {semantics.antonyms.slice(0, 3).map((ant, i) => (
              <span key={i} className="antonym-chip">{ant}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});
SemanticFieldDisplay.displayName = 'SemanticFieldDisplay';

/**
 * Displays construct chains (smichut) containing the word
 */
