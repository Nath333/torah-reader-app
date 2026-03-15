import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import './Tooltip.css';

/**
 * Tooltip - Accessible tooltip component with keyboard shortcut support
 * Shows helpful hints on hover/focus with optional keyboard shortcuts
 */
const Tooltip = ({
  children,
  content,
  shortcut,
  position,
  delay,
  disabled,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);
  const timeoutRef = useRef(null);

  const showTooltip = () => {
    if (disabled) return;

    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      updatePosition();
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  const updatePosition = () => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const padding = 8;

    let x = rect.left + rect.width / 2;
    let y;

    switch (position) {
      case 'top':
        y = rect.top - padding;
        break;
      case 'bottom':
        y = rect.bottom + padding;
        break;
      case 'left':
        x = rect.left - padding;
        y = rect.top + rect.height / 2;
        break;
      case 'right':
        x = rect.right + padding;
        y = rect.top + rect.height / 2;
        break;
      default:
        y = rect.top - padding;
    }

    setCoords({ x, y });
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Format shortcut keys for display
  const formatShortcut = (keys) => {
    if (!keys) return null;
    return keys.split('+').map((key, i, arr) => (
      <span key={key}>
        <kbd>{key.trim()}</kbd>
        {i < arr.length - 1 && <span className="tooltip-key-separator">+</span>}
      </span>
    ));
  };

  return (
    <div
      className="tooltip-wrapper"
      ref={triggerRef}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}

      {isVisible && (
        <div
          ref={tooltipRef}
          className={`tooltip tooltip-${position}`}
          style={{
            '--tooltip-x': `${coords.x}px`,
            '--tooltip-y': `${coords.y}px`,
          }}
          role="tooltip"
          aria-hidden={!isVisible}
        >
          <div className="tooltip-content">
            <span className="tooltip-text">{content}</span>
            {shortcut && (
              <span className="tooltip-shortcut">
                {formatShortcut(shortcut)}
              </span>
            )}
          </div>
          <div className="tooltip-arrow" />
        </div>
      )}
    </div>
  );
};

Tooltip.propTypes = {
  /** The element that triggers the tooltip */
  children: PropTypes.node.isRequired,
  /** The tooltip content text */
  content: PropTypes.string.isRequired,
  /** Optional keyboard shortcut to display */
  shortcut: PropTypes.string,
  /** Position of the tooltip relative to trigger */
  position: PropTypes.oneOf(['top', 'bottom', 'left', 'right']),
  /** Delay before showing tooltip (ms) */
  delay: PropTypes.number,
  /** Disable the tooltip */
  disabled: PropTypes.bool,
};

Tooltip.defaultProps = {
  shortcut: null,
  position: 'top',
  delay: 400,
  disabled: false,
};

export default Tooltip;
