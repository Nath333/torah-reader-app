/**
 * Toast - Professional notification system
 *
 * Provides non-intrusive feedback for user actions with
 * animated entry/exit, auto-dismiss, and multiple variants.
 */

import React, { memo, useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

// Toast Icons
const SuccessIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

const ErrorIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M15 9l-6 6M9 9l6 6" />
  </svg>
);

const WarningIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    <path d="M12 9v4M12 17h.01" />
  </svg>
);

const InfoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4M12 8h.01" />
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

const iconMap = {
  success: SuccessIcon,
  error: ErrorIcon,
  warning: WarningIcon,
  info: InfoIcon,
};

/**
 * Individual Toast Item
 */
const ToastItem = memo(({ toast, onDismiss }) => {
  const [isExiting, setIsExiting] = useState(false);
  const Icon = iconMap[toast.type] || InfoIcon;

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => onDismiss(toast.id), 200);
  }, [toast.id, onDismiss]);

  // Auto-dismiss timer
  useEffect(() => {
    if (toast.duration > 0) {
      const timer = setTimeout(handleDismiss, toast.duration);
      return () => clearTimeout(timer);
    }
  }, [toast.duration, handleDismiss]);

  return (
    <div
      className={`toast toast--${toast.type} ${isExiting ? 'toast-exit' : ''}`}
      role="alert"
      aria-live="polite"
    >
      <span className="toast-icon">
        <Icon />
      </span>
      <div className="toast-content">
        {toast.title && <p className="toast-title">{toast.title}</p>}
        <p className="toast-message">{toast.message}</p>
      </div>
      <button
        className="toast-close"
        onClick={handleDismiss}
        aria-label="Dismiss notification"
      >
        <CloseIcon />
      </button>
      {toast.showProgress && toast.duration > 0 && (
        <div
          className="toast-progress"
          style={{ animationDuration: `${toast.duration}ms` }}
        />
      )}
    </div>
  );
});

ToastItem.displayName = 'ToastItem';

/**
 * Toast Container - Renders all active toasts
 */
const ToastContainer = memo(({ toasts, onDismiss }) => {
  if (!toasts.length) return null;

  return createPortal(
    <div className="toast-container" aria-label="Notifications">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>,
    document.body
  );
});

ToastContainer.displayName = 'ToastContainer';

/**
 * useToast Hook - Manages toast state
 *
 * @example
 * const { toasts, showToast, dismissToast } = useToast();
 *
 * // Show a success toast
 * showToast({ type: 'success', message: 'Saved successfully!' });
 *
 * // Show an error toast with title
 * showToast({ type: 'error', title: 'Error', message: 'Failed to save.' });
 */
export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback(({
    type = 'info',
    title = '',
    message = '',
    duration = 5000,
    showProgress = true,
  }) => {
    const id = Date.now() + Math.random();
    const newToast = { id, type, title, message, duration, showProgress };

    setToasts((prev) => [...prev, newToast]);

    return id;
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  // Convenience methods
  const success = useCallback((message, title = '') =>
    showToast({ type: 'success', message, title }), [showToast]);

  const error = useCallback((message, title = 'Error') =>
    showToast({ type: 'error', message, title, duration: 7000 }), [showToast]);

  const warning = useCallback((message, title = '') =>
    showToast({ type: 'warning', message, title }), [showToast]);

  const info = useCallback((message, title = '') =>
    showToast({ type: 'info', message, title }), [showToast]);

  return {
    toasts,
    showToast,
    dismissToast,
    dismissAll,
    success,
    error,
    warning,
    info,
  };
};

export { ToastContainer };
export default ToastContainer;
