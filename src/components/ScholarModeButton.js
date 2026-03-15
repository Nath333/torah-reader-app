/**
 * ScholarModeButton - Toggle button for Scholar Mode
 *
 * A simple button component that can be added to the toolbar to
 * toggle the Scholar Mode panel. Shows a badge when there are
 * detected patterns or entities.
 */

import { useMemo } from 'react';
import { useDiscoursePatterns, useNamedEntities } from '../hooks/useScholarMode';

/**
 * ScholarModeButton Component
 *
 * @param {Object} props
 * @param {string} props.text - Current Hebrew/Aramaic text to analyze
 * @param {boolean} props.isActive - Whether Scholar Mode is currently open
 * @param {Function} props.onClick - Click handler to toggle Scholar Mode
 */
const ScholarModeButton = ({ text, isActive, onClick }) => {
  const { hasTalmudicStructure, statistics } = useDiscoursePatterns(text);
  const { totalEntities } = useNamedEntities(text);

  // Calculate badge count
  const badgeCount = useMemo(() => {
    const patternCount = statistics?.questions + statistics?.objections + statistics?.proofs || 0;
    return patternCount + totalEntities;
  }, [statistics, totalEntities]);

  return (
    <button
      onClick={onClick}
      className={`control-button scholar-btn ${isActive ? 'active' : ''} ${hasTalmudicStructure ? 'has-patterns' : ''}`}
      title="Scholar Mode - Study Center, Commentary, Topics"
      aria-pressed={isActive}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="button-icon">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
      Scholar
      {badgeCount > 0 && (
        <span className="badge scholar-badge">{badgeCount > 99 ? '99+' : badgeCount}</span>
      )}
    </button>
  );
};

export default ScholarModeButton;
