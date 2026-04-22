import React, { Component } from 'react';
import PropTypes from 'prop-types';
import './ErrorBoundary.css';

/**
 * ErrorBoundary - Catches JavaScript errors in child components
 * and displays a fallback UI instead of crashing the whole app.
 * PRO SCHOLAR V5: Enhanced with Hebrew context, accessibility, and compact mode.
 *
 * @example
 * // Basic usage
 * <ErrorBoundary>
 *   <MyComponent />
 * </ErrorBoundary>
 *
 * @example
 * // With custom fallback
 * <ErrorBoundary fallback={<p>Something went wrong</p>}>
 *   <MyComponent />
 * </ErrorBoundary>
 *
 * @example
 * // With error callback
 * <ErrorBoundary onError={(error) => logToService(error)}>
 *   <MyComponent />
 * </ErrorBoundary>
 *
 * @example
 * // Compact mode for inline errors
 * <ErrorBoundary compact>
 *   <InlineComponent />
 * </ErrorBoundary>
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error(`[ErrorBoundary:${this.props.name}] Caught error:`, error, errorInfo);
    this.setState({ errorInfo });

    // Call optional onError callback for logging/tracking
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  // PRO SCHOLAR V5: Copy error for bug reports
  handleCopyError = () => {
    const { error, errorInfo } = this.state;
    const errorText = `Error: ${error?.toString() || 'Unknown error'}
Component: ${this.props.name || 'Unknown'}
Stack: ${errorInfo?.componentStack || 'No stack trace'}
Time: ${new Date().toISOString()}
URL: ${window.location.href}`;

    navigator.clipboard.writeText(errorText)
      .catch(() => {
        // Clipboard API failed - no action needed, error is already visible in UI
      });
  };

  render() {
    if (this.state.hasError) {
      const { compact } = this.props;

      // PRO SCHOLAR V5: Compact mode for inline errors
      if (compact) {
        return (
          <div
            className="error-boundary-compact"
            role="alert"
            aria-live="assertive"
          >
            <span className="error-compact-icon" aria-hidden="true">⚠️</span>
            <span className="error-compact-text">
              <span className="error-hebrew" dir="rtl">שגיאה</span>
              {' • '}
              <span>Error loading component</span>
            </span>
            <button
              onClick={this.handleReset}
              className="error-compact-btn"
              aria-label="Try again"
            >
              ↻
            </button>
          </div>
        );
      }

      return (
        <div
          className="error-boundary"
          role="alert"
          aria-live="assertive"
          aria-labelledby="error-title"
          aria-describedby="error-description"
        >
          <div className="error-boundary-content">
            <svg
              className="error-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>

            {/* PRO SCHOLAR V5: Bilingual header for Torah study context */}
            <h2 id="error-title" className="error-title-bilingual">
              <span className="error-hebrew" dir="rtl">משהו השתבש</span>
              <span className="error-english">Something went wrong</span>
            </h2>
            <p id="error-description">
              We encountered an unexpected error. Please try again.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="error-details">
                <summary>Error details ({this.props.name})</summary>
                <pre>{this.state.error.toString()}</pre>
                {this.state.errorInfo?.componentStack && (
                  <pre className="error-stack">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </details>
            )}

            <div className="error-actions">
              <button
                onClick={this.handleReset}
                className="error-btn secondary"
                type="button"
              >
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="error-btn primary"
                type="button"
              >
                Reload Page
              </button>
            </div>

            {/* PRO SCHOLAR V5: Copy error for bug reports */}
            {process.env.NODE_ENV === 'development' && (
              <button
                onClick={this.handleCopyError}
                className="error-copy-btn"
                type="button"
                title="Copy error details for bug report"
              >
                📋 Copy Error Details
              </button>
            )}
          </div>
        </div>
      );
    }

    // Custom fallback if provided
    if (this.props.fallback) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

/**
 * withErrorBoundary - Higher-Order Component to wrap components with ErrorBoundary
 *
 * @param {React.ComponentType} WrappedComponent - Component to wrap
 * @param {Object} [errorBoundaryProps] - Props to pass to ErrorBoundary
 * @returns {React.ComponentType} Wrapped component with error boundary
 *
 * @example
 * // Wrap a component
 * export default withErrorBoundary(MyComponent);
 *
 * @example
 * // With custom props
 * export default withErrorBoundary(MyComponent, {
 *   onError: (error) => logError(error)
 * });
 */
export const withErrorBoundary = (WrappedComponent, errorBoundaryProps = {}) => {
  const WithErrorBoundary = (props) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  WithErrorBoundary.displayName = `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return WithErrorBoundary;
};

ErrorBoundary.propTypes = {
  /** Child components to wrap with error boundary */
  children: PropTypes.node.isRequired,
  /** Custom fallback UI to show when an error occurs */
  fallback: PropTypes.node,
  /** Callback called when an error is caught */
  onError: PropTypes.func,
  /** Optional name for this boundary (useful for logging) */
  name: PropTypes.string,
  /** PRO SCHOLAR V5: Use compact inline mode for smaller components */
  compact: PropTypes.bool
};

ErrorBoundary.defaultProps = {
  fallback: null,
  onError: null,
  name: 'ErrorBoundary',
  compact: false
};

export default ErrorBoundary;
