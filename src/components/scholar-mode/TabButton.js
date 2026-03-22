/**
 * TabButton - Enhanced tab navigation button component
 * Features: Keyboard navigation, tooltips, animated indicators, accessibility
 */
import React, { useRef, useEffect, useCallback } from 'react';

const TabButton = React.memo(({
  id,
  label,
  icon,
  isActive,
  onClick,
  badge = 0,
  disabled = false,
  shortcut,
  description
}) => {
  const buttonRef = useRef(null);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!shortcut) return;

    const handleKeyDown = (e) => {
      // Alt + number for quick tab switching
      if (e.altKey && e.key === shortcut && !disabled) {
        e.preventDefault();
        onClick(id);
        buttonRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcut, id, onClick, disabled]);

  // Handle click with animation feedback
  const handleClick = useCallback(() => {
    if (disabled) return;
    onClick(id);

    // Trigger ripple effect
    if (buttonRef.current) {
      buttonRef.current.classList.add('clicked');
      setTimeout(() => {
        buttonRef.current?.classList.remove('clicked');
      }, 200);
    }
  }, [id, onClick, disabled]);

  // Handle keyboard navigation within tab bar
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }, [handleClick]);

  // Format badge for display (show 99+ for large numbers)
  const formattedBadge = badge > 99 ? '99+' : badge;

  // Generate tooltip text
  const tooltipText = description
    ? `${description}${shortcut ? ` (Alt+${shortcut})` : ''}`
    : shortcut ? `Alt+${shortcut}` : undefined;

  return (
    <button
      ref={buttonRef}
      className={`scholar-tab ${isActive ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      type="button"
      role="tab"
      aria-selected={isActive}
      aria-disabled={disabled}
      aria-label={`${label}${badge > 0 ? `, ${badge} items` : ''}`}
      title={tooltipText}
      tabIndex={disabled ? -1 : 0}
      data-tab-id={id}
    >
      <span className="tab-icon" aria-hidden="true">{icon}</span>
      <span className="tab-label">{label}</span>
      {badge > 0 && (
        <span
          className={`tab-badge ${badge > 9 ? 'two-digit' : ''}`}
          aria-label={`${badge} items`}
        >
          {formattedBadge}
        </span>
      )}
      {isActive && <span className="tab-indicator" aria-hidden="true" />}
    </button>
  );
});

TabButton.displayName = 'TabButton';

export default TabButton;
