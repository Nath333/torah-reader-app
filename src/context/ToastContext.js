/**
 * ToastContext - Global notification/toast system
 *
 * Provides achievements, streaks, and general notifications
 */
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const ToastContext = createContext(null);

// Toast types with their icons and colors
const TOAST_TYPES = {
  success: { icon: '✓', color: '#10B981' },
  error: { icon: '✕', color: '#EF4444' },
  warning: { icon: '⚠', color: '#F59E0B' },
  info: { icon: 'ℹ', color: '#3B82F6' },
  achievement: { icon: '🏆', color: '#8B5CF6' },
  streak: { icon: '🔥', color: '#F97316' },
  vocabulary: { icon: '📚', color: '#06B6D4' },
  bookmark: { icon: '🔖', color: '#EC4899' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);

  // Add a new toast
  const addToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = ++toastIdRef.current;
    const toast = {
      id,
      message,
      type,
      ...TOAST_TYPES[type] || TOAST_TYPES.info,
      createdAt: Date.now()
    };

    setToasts(prev => [...prev, toast]);

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }

    return id;
  }, []);

  // Remove a specific toast
  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Clear all toasts
  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Convenience methods
  const success = useCallback((message, duration) => addToast(message, 'success', duration), [addToast]);
  const error = useCallback((message, duration) => addToast(message, 'error', duration), [addToast]);
  const warning = useCallback((message, duration) => addToast(message, 'warning', duration), [addToast]);
  const info = useCallback((message, duration) => addToast(message, 'info', duration), [addToast]);

  // Special toast types for the Torah app
  const achievement = useCallback((message, duration = 4000) => addToast(message, 'achievement', duration), [addToast]);
  const streak = useCallback((message, duration = 4000) => addToast(message, 'streak', duration), [addToast]);
  const vocabulary = useCallback((message, duration = 3000) => addToast(message, 'vocabulary', duration), [addToast]);
  const bookmark = useCallback((message, duration = 2500) => addToast(message, 'bookmark', duration), [addToast]);

  const value = {
    toasts,
    addToast,
    removeToast,
    clearToasts,
    success,
    error,
    warning,
    info,
    achievement,
    streak,
    vocabulary,
    bookmark
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

// Toast Container Component
function ToastContainer({ toasts, onRemove }) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" role="alert" aria-live="polite">
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

// Individual Toast Component
function Toast({ toast, onRemove }) {
  const handleClick = () => onRemove(toast.id);

  return (
    <div
      className={`toast toast-${toast.type}`}
      style={{ '--toast-color': toast.color }}
      onClick={handleClick}
      role="status"
    >
      <span className="toast-icon">{toast.icon}</span>
      <span className="toast-message">{toast.message}</span>
      <button className="toast-close" onClick={handleClick} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}

// Hook to use toast
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export default ToastContext;
