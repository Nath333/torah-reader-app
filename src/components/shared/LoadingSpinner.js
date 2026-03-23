/**
 * LoadingSpinner - Reusable animated loading spinner
 *
 * Consolidates the many inline SVG spinners across the codebase into
 * a single, configurable component with consistent styling.
 *
 * @example
 * // Basic usage
 * <LoadingSpinner />
 *
 * // With text
 * <LoadingSpinner text="Loading Rashi..." />
 *
 * // Different sizes
 * <LoadingSpinner size="sm" />
 * <LoadingSpinner size="lg" />
 *
 * // Custom color
 * <LoadingSpinner color="#3b82f6" />
 */
import React, { memo } from 'react';
import PropTypes from 'prop-types';

const SIZES = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 32,
  xl: 48,
};

const LoadingSpinner = memo(function LoadingSpinner({
  size = 'md',
  color = 'currentColor',
  strokeWidth = 2,
  text = '',
  className = '',
  inline = false,
}) {
  const dimension = typeof size === 'number' ? size : (SIZES[size] || SIZES.md);

  const spinnerStyle = {
    animation: 'spin 1s linear infinite',
    width: dimension,
    height: dimension,
    flexShrink: 0,
  };

  const containerStyle = inline
    ? { display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }
    : { display: 'flex', alignItems: 'center', gap: '0.5rem' };

  return (
    <span className={`loading-spinner-container ${className}`} style={containerStyle}>
      <svg
        className="loading-spinner"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        style={spinnerStyle}
        aria-hidden="true"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          strokeDasharray="32"
          strokeLinecap="round"
        />
      </svg>
      {text && <span className="loading-spinner-text">{text}</span>}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </span>
  );
});

LoadingSpinner.propTypes = {
  size: PropTypes.oneOfType([
    PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'xl']),
    PropTypes.number,
  ]),
  color: PropTypes.string,
  strokeWidth: PropTypes.number,
  text: PropTypes.string,
  className: PropTypes.string,
  inline: PropTypes.bool,
};

/**
 * FullPageLoader - Centered loading spinner for full page states
 */
export const FullPageLoader = memo(function FullPageLoader({ text = 'Loading...' }) {
  return (
    <div
      className="full-page-loader"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '200px',
        gap: '1rem',
      }}
    >
      <LoadingSpinner size="lg" />
      {text && <span style={{ color: 'var(--text-secondary, #6b7280)' }}>{text}</span>}
    </div>
  );
});

FullPageLoader.propTypes = {
  text: PropTypes.string,
};

/**
 * InlineLoader - Small inline loading indicator for buttons/text
 */
export const InlineLoader = memo(function InlineLoader({ text = '' }) {
  return <LoadingSpinner size="sm" text={text} inline />;
});

InlineLoader.propTypes = {
  text: PropTypes.string,
};

export default LoadingSpinner;
