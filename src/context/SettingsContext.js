import React, { createContext, useContext, useMemo, useCallback } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { TRADITIONS } from '../services/pronunciationService';

const SettingsContext = createContext(null);

export function SettingsProvider({ children, darkMode, toggleDarkMode }) {
  // Display settings
  const [showFrench, setShowFrench] = useLocalStorage('showFrenchTranslation', false);
  const [showOnkelos, setShowOnkelos] = useLocalStorage('showOnkelosTranslation', true);
  const [showRashi, setShowRashi] = useLocalStorage('showRashiCommentary', false);
  const [showTosafot, setShowTosafot] = useLocalStorage('showTosafotCommentary', false);
  const [showMaharsha, setShowMaharsha] = useLocalStorage('showMaharshaCommentary', false);
  const [showRamban, setShowRamban] = useLocalStorage('showRambanCommentary', false);
  const [tradition, setTradition] = useLocalStorage('pronunciationTradition', TRADITIONS.SEPHARDIC);

  // UI settings
  const [focusMode, setFocusMode] = useLocalStorage('focusMode', false);
  const [sidebarCollapsed, setSidebarCollapsed] = useLocalStorage('sidebarCollapsed', false);
  const [commentaryPosition, setCommentaryPosition] = useLocalStorage('commentaryPosition', 'split');
  const [fontSize, setFontSize] = useLocalStorage('fontSize', 'medium');
  const [showTraditionalView, setShowTraditionalView] = useLocalStorage('showTraditionalView', false);

  // Toggle functions - inline to satisfy ESLint
  const toggleFrench = useCallback(() => setShowFrench(prev => !prev), [setShowFrench]);
  const toggleOnkelos = useCallback(() => setShowOnkelos(prev => !prev), [setShowOnkelos]);
  const toggleRashi = useCallback(() => setShowRashi(prev => !prev), [setShowRashi]);
  const toggleTosafot = useCallback(() => setShowTosafot(prev => !prev), [setShowTosafot]);
  const toggleMaharsha = useCallback(() => setShowMaharsha(prev => !prev), [setShowMaharsha]);
  const toggleRamban = useCallback(() => setShowRamban(prev => !prev), [setShowRamban]);
  const toggleFocusMode = useCallback(() => setFocusMode(prev => !prev), [setFocusMode]);
  const toggleSidebar = useCallback(() => setSidebarCollapsed(prev => !prev), [setSidebarCollapsed]);
  const toggleTraditionalView = useCallback(() => setShowTraditionalView(prev => !prev), [setShowTraditionalView]);

  const value = useMemo(() => ({
    // Dark mode (from props)
    darkMode,
    toggleDarkMode,

    // Display settings
    showFrench,
    showOnkelos,
    showRashi,
    showTosafot,
    showMaharsha,
    showRamban,
    tradition,

    // UI settings
    focusMode,
    sidebarCollapsed,
    commentaryPosition,
    fontSize,
    showTraditionalView,

    // Setters
    setShowFrench,
    setTradition,
    setCommentaryPosition,
    setFontSize,

    // Toggles
    toggleFrench,
    toggleOnkelos,
    toggleRashi,
    toggleTosafot,
    toggleMaharsha,
    toggleRamban,
    toggleFocusMode,
    toggleSidebar,
    toggleTraditionalView
  }), [
    darkMode, toggleDarkMode,
    showFrench, showOnkelos, showRashi, showTosafot, showMaharsha, showRamban, tradition,
    focusMode, sidebarCollapsed, commentaryPosition, fontSize, showTraditionalView,
    setShowFrench, setTradition, setCommentaryPosition, setFontSize,
    toggleFrench, toggleOnkelos, toggleRashi, toggleTosafot, toggleMaharsha, toggleRamban,
    toggleFocusMode, toggleSidebar, toggleTraditionalView
  ]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

export default SettingsContext;
