import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';

/**
 * ModalContext - Centralized modal state management
 *
 * Features:
 * - Auto-generated handlers from MODALS constant
 * - Modal data support (pass data when opening)
 * - Escape key handling
 * - Modal stack with z-index management
 * - onOpen/onClose callbacks
 * - "Exclusive" mode (only one modal at a time)
 *
 * @example
 * // Open with data
 * openModal('confirm', { message: 'Delete this?', onConfirm: handleDelete });
 *
 * // Access data in modal
 * const { modalData } = useModals();
 * const message = modalData.confirm?.message;
 */

const ModalContext = createContext(null);

// =============================================================================
// Modal Registry - Single source of truth
// =============================================================================

/**
 * Modal definitions - add new modals here only
 * Each modal can have default options
 */
export const MODALS = {
  HELP: 'help',
  PRONUNCIATION: 'pronunciation',
  AUDIO: 'audio',
  FOCUS: 'focus',
  AI_SETTINGS: 'aiSettings',
  SMART_SEARCH: 'smartSearch',
  WORD_DETAIL: 'wordDetail',      // New: Word intelligence card modal
  CONFIRM: 'confirm',              // New: Confirmation dialog
  RABBI_INFO: 'rabbiInfo',         // New: Rabbi information popup
  KNOWLEDGE_GRAPH: 'knowledgeGraph', // New: Knowledge graph visualization
};

// Modal options (can be extended per-modal)
const MODAL_OPTIONS = {
  [MODALS.HELP]: { escapeClose: true, exclusive: false },
  [MODALS.PRONUNCIATION]: { escapeClose: true, exclusive: true },
  [MODALS.AUDIO]: { escapeClose: true, exclusive: false },
  [MODALS.FOCUS]: { escapeClose: true, exclusive: true },
  [MODALS.AI_SETTINGS]: { escapeClose: true, exclusive: true },
  [MODALS.SMART_SEARCH]: { escapeClose: true, exclusive: true },
  [MODALS.WORD_DETAIL]: { escapeClose: true, exclusive: false },
  [MODALS.CONFIRM]: { escapeClose: false, exclusive: true }, // Confirm shouldn't close on escape
  [MODALS.RABBI_INFO]: { escapeClose: true, exclusive: false },
  [MODALS.KNOWLEDGE_GRAPH]: { escapeClose: true, exclusive: true },
};

// Get all modal names from MODALS constant
const ALL_MODAL_NAMES = Object.values(MODALS);

// Create initial state from registry
const createInitialState = () =>
  Object.fromEntries(ALL_MODAL_NAMES.map(name => [name, false]));

// =============================================================================
// Provider Component
// =============================================================================

export function ModalProvider({ children }) {
  // Modal visibility state
  const [modals, setModals] = useState(createInitialState);

  // Modal data (passed when opening)
  const [modalData, setModalData] = useState({});

  // Modal stack for z-index management (most recent = highest)
  const [modalStack, setModalStack] = useState([]);

  // ==========================================================================
  // Core Operations
  // ==========================================================================

  /**
   * Open a modal with optional data
   * @param {string} modalName - Modal identifier
   * @param {Object} data - Optional data to pass to the modal
   */
  const open = useCallback((modalName, data = null) => {
    const options = MODAL_OPTIONS[modalName] || {};

    setModals(prev => {
      // If exclusive, close other modals first
      if (options.exclusive) {
        const newState = createInitialState();
        newState[modalName] = true;
        return newState;
      }
      return { ...prev, [modalName]: true };
    });

    // Store modal data
    if (data !== null) {
      setModalData(prev => ({ ...prev, [modalName]: data }));
    }

    // Add to stack (remove if already exists, then add to top)
    setModalStack(prev => [...prev.filter(m => m !== modalName), modalName]);
  }, []);

  /**
   * Close a modal and clear its data
   */
  const close = useCallback((modalName) => {
    setModals(prev => ({ ...prev, [modalName]: false }));
    setModalData(prev => {
      const next = { ...prev };
      delete next[modalName];
      return next;
    });
    setModalStack(prev => prev.filter(m => m !== modalName));
  }, []);

  /**
   * Toggle a modal
   */
  const toggle = useCallback((modalName, data = null) => {
    setModals(prev => {
      const isCurrentlyOpen = prev[modalName];
      if (isCurrentlyOpen) {
        // Closing - remove from stack
        setModalStack(s => s.filter(m => m !== modalName));
        setModalData(d => {
          const next = { ...d };
          delete next[modalName];
          return next;
        });
      } else {
        // Opening - add to stack
        if (data !== null) {
          setModalData(d => ({ ...d, [modalName]: data }));
        }
        setModalStack(s => [...s.filter(m => m !== modalName), modalName]);
      }
      return { ...prev, [modalName]: !isCurrentlyOpen };
    });
  }, []);

  /**
   * Close all modals
   */
  const closeAll = useCallback(() => {
    setModals(createInitialState());
    setModalData({});
    setModalStack([]);
  }, []);

  /**
   * Close the topmost modal (useful for escape key)
   */
  const closeTop = useCallback(() => {
    if (modalStack.length === 0) return false;

    const topModal = modalStack[modalStack.length - 1];
    const options = MODAL_OPTIONS[topModal] || {};

    // Check if this modal allows escape close
    if (options.escapeClose !== false) {
      close(topModal);
      return true;
    }
    return false;
  }, [modalStack, close]);

  /**
   * Check if a modal is open
   */
  const isOpen = useCallback((modalName) => {
    return modals[modalName] || false;
  }, [modals]);

  /**
   * Get z-index for a modal based on stack position
   */
  const getZIndex = useCallback((modalName) => {
    const index = modalStack.indexOf(modalName);
    return index >= 0 ? 1000 + index : 1000;
  }, [modalStack]);

  /**
   * Check if any modal is open
   */
  const hasOpenModal = useMemo(() => {
    return Object.values(modals).some(Boolean);
  }, [modals]);

  // ==========================================================================
  // Escape Key Handler
  // ==========================================================================

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && hasOpenModal) {
        const closed = closeTop();
        if (closed) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [hasOpenModal, closeTop]);

  // ==========================================================================
  // Auto-generated handlers (no more boilerplate!)
  // ==========================================================================

  const handlers = useMemo(() => {
    const result = {};
    for (const modalName of ALL_MODAL_NAMES) {
      result[modalName] = {
        open: (data) => open(modalName, data),
        close: () => close(modalName),
        toggle: (data) => toggle(modalName, data),
        isOpen: () => modals[modalName] || false,
        data: modalData[modalName] || null,
        zIndex: getZIndex(modalName),
      };
    }
    return result;
  }, [open, close, toggle, modals, modalData, getZIndex]);

  // ==========================================================================
  // Context Value
  // ==========================================================================

  const value = useMemo(() => ({
    // State
    modals,
    modalData,
    modalStack,
    hasOpenModal,

    // Generic operations
    open,
    close,
    toggle,
    closeAll,
    closeTop,
    isOpen,
    getZIndex,

    // Auto-generated handlers
    handlers,

    // Convenience aliases
    openModal: open,
    closeModal: close,
    toggleModal: toggle,
  }), [modals, modalData, modalStack, hasOpenModal, open, close, toggle, closeAll, closeTop, isOpen, getZIndex, handlers]);

  return (
    <ModalContext.Provider value={value}>
      {children}
    </ModalContext.Provider>
  );
}

// =============================================================================
// Hook
// =============================================================================

/**
 * useModals - Hook to access modal state and operations
 *
 * @example
 * const { modals, handlers, openModal } = useModals();
 *
 * // Check if modal is open
 * if (modals.help) { ... }
 *
 * // Open with data
 * openModal('confirm', { message: 'Are you sure?', onConfirm: handleYes });
 *
 * // Use auto-generated handlers
 * handlers.help.open();
 * handlers.audio.close();
 * handlers.confirm.data?.message; // Access passed data
 *
 * // Get z-index for stacking
 * style={{ zIndex: handlers.help.zIndex }}
 */
export function useModals() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModals must be used within a ModalProvider');
  }
  return context;
}

/**
 * useModal - Convenience hook for a single modal
 *
 * @example
 * const { isOpen, open, close, data } = useModal('confirm');
 */
export function useModal(modalName) {
  const { handlers } = useModals();
  return handlers[modalName] || {
    open: () => console.warn(`Modal "${modalName}" not registered`),
    close: () => {},
    toggle: () => {},
    isOpen: () => false,
    data: null,
    zIndex: 1000,
  };
}

export default ModalContext;
