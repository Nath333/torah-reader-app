/**
 * TalmudSharedUI - Reusable UI components for Talmud study panels
 *
 * PRO SCHOLAR V33: Extracted from TalmudToolsTab for reuse.
 * These are general-purpose UI primitives used across scholar-mode.
 *
 * Components:
 * - StatBadge: Compact stat display with icon and count
 * - CollapsibleSection: Expandable accordion section
 * - LazyLoadFallback: Skeleton placeholder for lazy components
 */
import React from 'react';
import PropTypes from 'prop-types';

// =============================================================================
// LazyLoadFallback - Skeleton placeholder for Suspense boundaries
// =============================================================================

export const LazyLoadFallback = () => (
  <div className="lazy-load-skeleton">
    <div className="skeleton-bar" style={{ width: '60%', height: '20px', marginBottom: '8px' }} />
    <div className="skeleton-bar" style={{ width: '80%', height: '16px', marginBottom: '8px' }} />
    <div className="skeleton-bar" style={{ width: '70%', height: '16px' }} />
  </div>
);

// =============================================================================
// StatBadge - Compact stat display with icon, value, and click handler
// =============================================================================

export const StatBadge = React.memo(function StatBadge({ icon, value, label, type, active, onClick }) {
  if (value === 0 && type !== 'progress') return null;
  return (
    <button
      className={`stat-badge stat-${type} ${active ? 'active' : ''}`}
      title={label}
      onClick={onClick}
      type="button"
    >
      <span className="stat-icon">{icon}</span>
      <span className="stat-value">{value}</span>
    </button>
  );
});

StatBadge.propTypes = {
  icon: PropTypes.string.isRequired,
  value: PropTypes.number,
  label: PropTypes.string,
  type: PropTypes.string,
  active: PropTypes.bool,
  onClick: PropTypes.func
};

// =============================================================================
// CollapsibleSection - Expandable accordion with header and content
// =============================================================================

export const CollapsibleSection = React.memo(function CollapsibleSection({
  id, icon, title, count, isOpen, onToggle, children, badge, accentColor, summary
}) {
  return (
    <div
      className={`sugya-section pro-v25 ${isOpen ? 'open' : 'collapsed'}`}
      style={{ '--section-accent': accentColor || '#6366f1' }}
    >
      <button
        className="section-header pro"
        onClick={() => onToggle(id)}
        aria-expanded={isOpen}
        type="button"
      >
        <div className="header-left">
          <span className="section-chevron">{isOpen ? '▼' : '◀'}</span>
          <span className="section-icon">{icon}</span>
          <span className="section-title">{title}</span>
        </div>
        <div className="header-right">
          {summary && !isOpen && <span className="section-summary">{summary}</span>}
          {badge && <span className="section-badge">{badge}</span>}
          {count > 0 && <span className="section-count">{count}</span>}
        </div>
      </button>
      <div className={`section-content ${isOpen ? 'expanded' : ''}`}>
        {children}
      </div>
    </div>
  );
});

CollapsibleSection.propTypes = {
  id: PropTypes.string.isRequired,
  icon: PropTypes.string,
  title: PropTypes.string.isRequired,
  count: PropTypes.number,
  isOpen: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  children: PropTypes.node,
  badge: PropTypes.string,
  accentColor: PropTypes.string,
  summary: PropTypes.string
};
