/**
 * FrequencyBar Component
 * Displays word frequency with percentile indicator
 */

import React, { memo } from 'react';

/**
 * Displays frequency bar with percentile indicator
 * @param {Object} props
 * @param {Object} props.frequency - Frequency data object
 * @param {number} [props.frequency.count] - Number of occurrences
 * @param {Object} [props.frequency.band] - Band info with label and color
 * @param {number} [props.frequency.percentile] - Percentile ranking
 */
function FrequencyBar({ frequency }) {
  if (!frequency) return null;

  const { count, band, percentile } = frequency;
  const fillWidth = Math.min(100, percentile || 50);

  return (
    <div className="wic-frequency">
      <div className="freq-header">
        <span className="freq-label">Frequency</span>
        <span className="freq-count">{count?.toLocaleString() || '?'}×</span>
      </div>
      <div className="freq-bar-container">
        <div
          className="freq-bar-fill"
          style={{
            width: `${fillWidth}%`,
            backgroundColor: band?.color || '#6b7280'
          }}
        />
      </div>
      <div className="freq-meta">
        <span className="freq-band" style={{ color: band?.color }}>{band?.label || 'Unknown'}</span>
        <span className="freq-percentile">Top {Math.round(100 - (percentile || 50))}%</span>
      </div>
    </div>
  );
}

export default memo(FrequencyBar);
