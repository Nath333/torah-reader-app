import React, { Component } from 'react';
import PropTypes from 'prop-types';
import './ErrorBoundary.css';

/**
 * ErrorBoundary - Catches JavaScript errors in child components
 * and displays a fallback UI instead of crashing the whole app.
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
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);

    // Call optional onError callback for logging/tracking
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <svg
              className="error-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>

            <h2>Something went wrong</h2>
            <p>We encountered an unexpected error. Please try again.</p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="error-details">
                <summary>Error details</summary>
                <pre>{this.state.error.toString()}</pre>
              </details>
            )}

            <div className="error-actions">
              <button
                onClick={this.handleReset}
                className="error-btn secondary"
              >
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="error-btn primary"
              >
                Reload Page
              </button>
            </div>
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
  name: PropTypes.string
};

ErrorBoundary.defaultProps = {
  fallback: null,
  onError: null,
  name: 'ErrorBoundary'
};

export default ErrorBoundary;
