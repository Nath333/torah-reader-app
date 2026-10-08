import React, { memo } from 'react';

export const ConstructChainDisplay = memo(({ constructs }) => {
  if (!constructs || constructs.length === 0) return null;
  return (
    <div className="construct-chain-section">
      <div className="section-header">
        <span className="section-icon">🔗</span>
        <span className="section-title">Construct Chains (סמיכות)</span>
      </div>
      <div className="construct-list">
        {constructs.slice(0, 5).map((c, i) => (
          <div key={i} className="construct-item">
            <span className="construct-hebrew" dir="rtl">{c.phrase}</span>
            <span className="construct-parsed">{c.parsed}</span>
            <span className="construct-type">{c.type?.replace(/_/g, ' ')}</span>
          </div>
        ))}
      </div>
    </div>
  );
});
ConstructChainDisplay.displayName = 'ConstructChainDisplay';

/**
 * Displays root occurrences in Tanakh and derived words
 */
