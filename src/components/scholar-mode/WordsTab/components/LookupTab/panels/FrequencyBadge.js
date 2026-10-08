import React, { memo } from 'react';

export const FrequencyBadge = memo(({ frequency }) => {
  if (!frequency) return null;
  const band = frequency.band;
  return (
    <div className="frequency-badge" style={{ '--freq-color': band.color }}>
      <span className="freq-count">{frequency.count.toLocaleString()}×</span>
      <span className="freq-label">{band.label.split(' ')[0]}</span>
      <span className="freq-percentile">(top {frequency.percentile}%)</span>
    </div>
  );
});
FrequencyBadge.displayName = 'FrequencyBadge';

/**
 * Displays semantic fields, synonyms, and antonyms
 */
