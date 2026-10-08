import React, { memo } from 'react';

export const LexiconSkeleton = memo(() => (
  <div className="lexicon-skeleton">
    <div className="skeleton-header">
      <div className="skeleton-bar skeleton-word"></div>
      <div className="skeleton-bar skeleton-badge"></div>
    </div>
    <div className="skeleton-bar skeleton-def-primary"></div>
    <div className="lexicon-entry skeleton-entry">
      <div className="skeleton-bar skeleton-source"></div>
      <div className="skeleton-bar skeleton-def"></div>
      <div className="skeleton-bar skeleton-def-short"></div>
    </div>
    <div className="lexicon-entry skeleton-entry">
      <div className="skeleton-bar skeleton-source"></div>
      <div className="skeleton-bar skeleton-def"></div>
    </div>
  </div>
));
LexiconSkeleton.displayName = 'LexiconSkeleton';

/**
 * Displays word frequency with color-coded badge
 */
