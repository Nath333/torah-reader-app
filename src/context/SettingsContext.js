import React, { createContext, useContext, useMemo, useCallback } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { useToggleSetting } from '../hooks/useToggleSetting';
import { TRADITIONS } from '../services/pronunciationService';
import { AI_PROVIDERS } from '../services/providers/aiProviderFactory';

const SettingsContext = createContext(null);

// Dictionary source priority presets
export const DICT_PRIORITY_PRESETS = {
  ACADEMIC: ['BDB', 'HALOT', 'Strong\'s', 'Klein', 'Jastrow'],
  TALMUDIC: ['Jastrow', 'Steinsaltz', 'BDB', 'Strong\'s', 'Klein'],
  PRACTICAL: ['Strong\'s', 'BDB', 'Jastrow', 'Klein', 'HALOT'],
  ARAMAIC: ['Jastrow', 'CAL', 'BDB Aramaic', 'Steinsaltz', 'BDB']
};

export function SettingsProvider({ children, darkMode, toggleDarkMode }) {
  // ============================================================================
  // Display settings - using useToggleSetting for cleaner code
  // ============================================================================
  const [showFrench, toggleFrench, setShowFrench] = useToggleSetting('showFrenchTranslation', false);
  const [showOnkelos, toggleOnkelos] = useToggleSetting('showOnkelosTranslation', true);
  const [showRashi, toggleRashi, setShowRashi] = useToggleSetting('showRashiCommentary', false);

  // Hebrew text display options (vowels/niqqud and cantillation/taamim)
  const [showVowels, toggleVowels] = useToggleSetting('showHebrewVowels', true);
  const [showCantillation, toggleCantillation] = useToggleSetting('showHebrewCantillation', true);
  const [showTosafot, toggleTosafot, setShowTosafot] = useToggleSetting('showTosafotCommentary', false);
  const [showMaharsha, toggleMaharsha, setShowMaharsha] = useToggleSetting('showMaharshaCommentary', false);
  const [showSoncino, toggleSoncino] = useToggleSetting('showSoncinoTranslation', false);
  const [showRamban, toggleRamban, setShowRamban] = useToggleSetting('showRambanCommentary', false);
  const [showIbnEzra, toggleIbnEzra, setShowIbnEzra] = useToggleSetting('showIbnEzraCommentary', false);
  const [showSforno, toggleSforno, setShowSforno] = useToggleSetting('showSfornoCommentary', false);

  // Non-boolean settings (need useLocalStorage directly)
  const [tradition, setTradition] = useLocalStorage('pronunciationTradition', TRADITIONS.SEPHARDIC);

  // ============================================================================
  // UI settings
  // ============================================================================
  const [focusMode, toggleFocusMode] = useToggleSetting('focusMode', false);
  const [sidebarCollapsed, toggleSidebar] = useToggleSetting('sidebarCollapsed', false);
  const [showTraditionalView, toggleTraditionalView] = useToggleSetting('showTraditionalView', false);

  // Non-boolean UI settings
  const [commentaryPosition, setCommentaryPosition] = useLocalStorage('commentaryPosition', 'split');
  const [fontSize, setFontSize] = useLocalStorage('fontSize', 'medium');

  // ============================================================================
  // AI Provider settings
  // ============================================================================
  const [showAiSettings, toggleAiSettings, setShowAiSettings] = useToggleSetting('showAiSettings', false);

  // Non-boolean AI settings
  const [aiProvider, setAiProvider] = useLocalStorage('ai_provider', AI_PROVIDERS.GROQ);
  const [ollamaModel, setOllamaModel] = useLocalStorage('ollama_model', 'llama3.1:8b');

  // ============================================================================
  // Scholarly/Dictionary settings
  // ============================================================================
  const [showMorphology, , setShowMorphology] = useToggleSetting('showMorphology', true);
  const [showStrongsNumber, , setShowStrongsNumber] = useToggleSetting('showStrongsNumber', true);
  const [showEtymology, , setShowEtymology] = useToggleSetting('showEtymology', false);
  const [showSourceBadges, , setShowSourceBadges] = useToggleSetting('showSourceBadges', true);
  const [showInlineGlosses, toggleInlineGlosses, setShowInlineGlosses] = useToggleSetting('showInlineGlosses', false);

  // Non-boolean scholarly settings
  const [dictionaryPriority, setDictionaryPriority] = useLocalStorage('dictionaryPriority', 'ACADEMIC');

  // ============================================================================
  // Batch toggle for commentaries (convenience function)
  // ============================================================================
  const toggleAllCommentaries = useCallback((show) => {
    // Set all commentaries to the desired state
    setShowRashi(show);
    setShowTosafot(show);
    setShowMaharsha(show);
    setShowRamban(show);
    setShowIbnEzra(show);
    setShowSforno(show);
  }, [setShowRashi, setShowTosafot, setShowMaharsha, setShowRamban, setShowIbnEzra, setShowSforno]);

  // ============================================================================
  // Context value - memoized to prevent unnecessary re-renders
  // ============================================================================
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
    showSoncino,
    showRamban,
    showIbnEzra,
    showSforno,
    tradition,

    // Hebrew text display
    showVowels,
    showCantillation,
    toggleVowels,
    toggleCantillation,

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
    toggleSoncino,
    toggleRamban,
    toggleIbnEzra,
    toggleSforno,
    toggleFocusMode,
    toggleSidebar,
    toggleTraditionalView,
    toggleAllCommentaries,

    // AI Provider settings
    aiProvider,
    setAiProvider,
    ollamaModel,
    setOllamaModel,
    showAiSettings,
    setShowAiSettings,
    toggleAiSettings,

    // Scholarly/Dictionary settings
    dictionaryPriority,
    setDictionaryPriority,
    showMorphology,
    setShowMorphology,
    showStrongsNumber,
    setShowStrongsNumber,
    showEtymology,
    setShowEtymology,
    showSourceBadges,
    setShowSourceBadges,
    showInlineGlosses,
    setShowInlineGlosses,
    toggleInlineGlosses
  }), [
    darkMode, toggleDarkMode,
    showFrench, showOnkelos, showRashi, showTosafot, showMaharsha, showSoncino, showRamban, showIbnEzra, showSforno, tradition,
    showVowels, showCantillation, toggleVowels, toggleCantillation,
    focusMode, sidebarCollapsed, commentaryPosition, fontSize, showTraditionalView,
    setShowFrench, setTradition, setCommentaryPosition, setFontSize,
    toggleFrench, toggleOnkelos, toggleRashi, toggleTosafot, toggleMaharsha, toggleSoncino, toggleRamban, toggleIbnEzra, toggleSforno,
    toggleFocusMode, toggleSidebar, toggleTraditionalView, toggleAllCommentaries,
    aiProvider, setAiProvider, ollamaModel, setOllamaModel, showAiSettings, setShowAiSettings, toggleAiSettings,
    dictionaryPriority, setDictionaryPriority, showMorphology, setShowMorphology,
    showStrongsNumber, setShowStrongsNumber, showEtymology, setShowEtymology, showSourceBadges, setShowSourceBadges,
    showInlineGlosses, setShowInlineGlosses, toggleInlineGlosses
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
