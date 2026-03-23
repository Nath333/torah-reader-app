/**
 * CognateLanguagesPanel - PRO SCHOLAR V6 Comparative Semitic Display
 *
 * Shows cognate words in related Semitic languages:
 * - Akkadian (Ancient Mesopotamia)
 * - Ugaritic (Ancient Canaan)
 * - Arabic (Modern Semitic)
 * - Ethiopic/Ge'ez (Horn of Africa)
 * - Syriac (Aramaic branch)
 *
 * Based on scholarly sources: BDB, HALOT, Jastrow, and comparative Semitic scholarship.
 *
 * @module CognateLanguagesPanel
 */

import React, { memo, useMemo } from 'react';
import PropTypes from 'prop-types';
import './CognateLanguagesPanel.css';

// =============================================================================
// SAFE IMPORTS
// =============================================================================

// PRO SCHOLAR V8: Renamed from proScholarV6 to linguisticAnalysis
let getCognates, ROOT_COGNATES;
try {
  const linguisticAnalysis = require('../../services/linguisticAnalysis');
  getCognates = linguisticAnalysis.getCognates;
  ROOT_COGNATES = linguisticAnalysis.ROOT_COGNATES;
} catch (e) {
  console.debug('[CognateLanguagesPanel] linguisticAnalysis not available:', e.message);
  getCognates = () => null;
  ROOT_COGNATES = {};
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const LANGUAGE_DISPLAY = {
  akkadian: {
    name: 'Akkadian',
    icon: '🏛️',
    description: 'Ancient Mesopotamian',
    script: 'Cuneiform'
  },
  ugaritic: {
    name: 'Ugaritic',
    icon: '🗿',
    description: 'Ancient Canaanite',
    script: 'Cuneiform'
  },
  arabic: {
    name: 'Arabic',
    icon: '🕌',
    description: 'Classical Arabic',
    script: 'Arabic script'
  },
  ethiopic: {
    name: 'Ethiopic',
    icon: '⛪',
    description: "Ge'ez",
    script: 'Fidäl'
  },
  syriac: {
    name: 'Syriac',
    icon: '✝️',
    description: 'Eastern Aramaic',
    script: 'Serto'
  },
  phoenician: {
    name: 'Phoenician',
    icon: '⚓',
    description: 'Northwest Semitic',
    script: 'Phoenician alphabet'
  }
};

const FORM_LABELS = {
  verb: 'Verb',
  noun: 'Noun',
  adjective: 'Adjective',
  particle: 'Particle',
  adverb: 'Adverb'
};

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

/**
 * Single cognate card
 */
const CognateCard = memo(function CognateCard({ cognate, languageKey }) {
  const langInfo = LANGUAGE_DISPLAY[languageKey] || {
    name: languageKey,
    icon: '🔤',
    description: ''
  };

  return (
    <div className="clp-cognate-card" data-language={languageKey}>
      <div className="clp-cognate-header">
        <span className="clp-language-flag">{langInfo.icon}</span>
        <span className="clp-language-name">{langInfo.name}</span>
      </div>
      <div className="clp-cognate-word">{cognate.word}</div>
      <div className="clp-cognate-meaning">"{cognate.meaning}"</div>
      {cognate.form && (
        <div className="clp-cognate-form">
          {FORM_LABELS[cognate.form] || cognate.form}
        </div>
      )}
    </div>
  );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * CognateLanguagesPanel - Comparative Semitic cognates display
 *
 * @param {Object} props
 * @param {string} props.root - Root to look up cognates for (3-letter Hebrew root)
 * @param {boolean} [props.compact=false] - Use compact layout
 * @param {boolean} [props.showNote=true] - Show scholarly note
 * @param {boolean} [props.dark=false] - Use dark mode
 * @param {string} [props.className=''] - Additional CSS classes
 */
function CognateLanguagesPanel({
  root,
  compact = false,
  showNote = true,
  dark = false,
  className = ''
}) {
  // Look up cognates
  const cognateData = useMemo(() => {
    if (!root) return null;

    // Clean the root
    const cleanedRoot = root.replace(/[\u05B0-\u05BD\u05BF-\u05C7]/g, '');

    // Try getCognates function first
    if (getCognates) {
      try {
        const result = getCognates(cleanedRoot);
        if (result?.hasCognates) {
          return result;
        }
      } catch (e) {
        console.debug('[CognateLanguagesPanel] getCognates failed:', e.message);
        // Fall through to direct lookup
      }
    }

    // Direct lookup in ROOT_COGNATES
    if (ROOT_COGNATES?.[cleanedRoot]) {
      return {
        root: cleanedRoot,
        ...ROOT_COGNATES[cleanedRoot],
        hasCognates: true
      };
    }

    return null;
  }, [root]);

  // Panel class names
  const panelClassName = useMemo(
    () => `cognate-languages-panel ${compact ? 'compact' : ''} ${dark ? 'dark' : ''} ${className}`.trim(),
    [compact, dark, className]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  if (!cognateData?.hasCognates) {
    return (
      <div className={panelClassName}>
        <div className="clp-no-data">
          <div className="clp-no-data-icon">🌍</div>
          <div className="clp-no-data-text">
            No cognate data available for root: {root || '(none)'}
          </div>
        </div>
      </div>
    );
  }

  const { cognates = [], meaning, note } = cognateData;

  return (
    <div className={panelClassName}>
      {/* Header */}
      <div className="clp-header">
        <div className="clp-title">
          <span className="clp-icon">🌍</span>
          <span className="clp-title-text">Cognate Languages</span>
        </div>
        <span className="clp-root-badge" dir="rtl">{root}</span>
      </div>

      {/* Root Meaning */}
      {meaning && (
        <div className="clp-meaning">
          <div className="clp-meaning-label">Proto-Semitic Meaning</div>
          <div className="clp-meaning-text">{meaning}</div>
        </div>
      )}

      {/* Cognates Grid */}
      {cognates.length > 0 && (
        <div className="clp-cognates-grid">
          {cognates.map((cognate, idx) => (
            <CognateCard
              key={`${cognate.language}-${idx}`}
              cognate={cognate}
              languageKey={cognate.language}
            />
          ))}
        </div>
      )}

      {/* Scholarly Note */}
      {showNote && note && (
        <div className="clp-note">
          <div className="clp-note-label">
            <span>📖</span>
            <span>Scholarly Note</span>
          </div>
          <div className="clp-note-text">{note}</div>
        </div>
      )}
    </div>
  );
}

CognateLanguagesPanel.propTypes = {
  root: PropTypes.string.isRequired,
  compact: PropTypes.bool,
  showNote: PropTypes.bool,
  dark: PropTypes.bool,
  className: PropTypes.string
};

// Note: Default values are set in function parameters (modern React pattern)

export default memo(CognateLanguagesPanel);
