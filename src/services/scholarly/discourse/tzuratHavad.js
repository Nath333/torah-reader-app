// discoursePatternService — Génération Tzurat HaDaf (HTML, ASCII, styles, props) (split phase 2, 03/10/2026)
import { analyzeDiscourseStructure } from './detection';
import { applyLayerColoring, segmentIntoSugyaUnits } from './layers';

export function generateTzuratHaDaf(options = {}) {
  const {
    mainText = '',
    rashiText = '',
    tosafotText = '',
    dafNumber = '',
    masechet = '',
    additionalCommentaries = []
  } = options;

  // Analyze main text for discourse markers
  const mainAnalysis = mainText ? analyzeDiscourseStructure(mainText) : null;
  const mainMarkers = mainText ? detectStructuralMarkers(mainText) : [];

  // Segment main text into Mishna/Gemara sections
  const segments = mainText ? segmentIntoSugyaUnits(mainText) : [];

  // Find Mishna and Gemara sections
  const mishnaSegments = segments.filter(s => s.type === 'mishna' || s.sectionType === 'mishna');
  const gemaraSegments = segments.filter(s => s.type === 'gemara' || s.sectionType === 'gemara');

  return {
    // Page header
    header: {
      masechet,
      dafNumber,
      fullRef: masechet && dafNumber ? `${masechet} ${dafNumber}` : '',
      amud: dafNumber?.includes('a') ? 'א' : dafNumber?.includes('b') ? 'ב' : ''
    },

    // Main text area (center column)
    mainColumn: {
      text: mainText,
      htmlWithMarkers: mainText ? applyLayerColoring(mainText) : '',
      segments,
      mishnaSegments,
      gemaraSegments,
      analysis: mainAnalysis,
      markers: mainMarkers
    },

    // Inner margin (Rashi - right side in Hebrew)
    innerMargin: {
      commentator: 'רש"י',
      commentatorEn: 'Rashi',
      text: rashiText,
      style: {
        fontFamily: 'Rashi',
        fontSize: '0.85em',
        direction: 'rtl'
      }
    },

    // Outer margin (Tosafot - left side in Hebrew)
    outerMargin: {
      commentator: 'תוספות',
      commentatorEn: 'Tosafot',
      text: tosafotText,
      style: {
        fontFamily: 'Tosafot',
        fontSize: '0.85em',
        direction: 'rtl'
      }
    },

    // Additional commentaries (bottom or side panels)
    additionalCommentaries: additionalCommentaries.map(c => ({
      name: c.name || '',
      hebrewName: c.hebrewName || '',
      text: c.text || '',
      position: c.position || 'bottom'
    })),

    // Layout configuration
    layout: {
      type: 'tzurat-hadaf',
      columns: 3,
      mainColumnWidth: '50%',
      marginWidth: '25%',
      direction: 'rtl'
    },

    // Visual indicators for discourse structure
    discourseIndicators: mainMarkers.map(m => ({
      type: m.type,
      position: m.position,
      icon: m.icon,
      color: m.color,
      label: m.hebrewLabel
    }))
  };
}

/**
 * Generate ASCII representation of Tzurat HaDaf
 * For console/text display of traditional layout
 * @param {Object} options - Same options as generateTzuratHaDaf
 * @returns {string} ASCII art representation
 */
export function generateTzuratHaDafAscii(options = {}) {
  const { mainText = '', rashiText = '', tosafotText = '', dafNumber = '', masechet = '' } = options;

  const width = 80;
  const mainWidth = 40;
  const marginWidth = 18;

  const border = '═'.repeat(width);

  // Helper to wrap text to width
  const wrapText = (text, maxWidth) => {
    if (!text) return [''];
    const words = text.split(/\s+/);
    const lines = [];
    let currentLine = '';

    for (const word of words) {
      if ((currentLine + ' ' + word).trim().length <= maxWidth) {
        currentLine = (currentLine + ' ' + word).trim();
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines.length ? lines : [''];
  };

  // Wrap each column's text
  const rashiLines = wrapText(rashiText, marginWidth);
  const mainLines = wrapText(mainText, mainWidth);
  const tosafotLines = wrapText(tosafotText, marginWidth);

  // Get max lines
  const maxLines = Math.max(rashiLines.length, mainLines.length, tosafotLines.length, 10);

  // Build the page
  const lines = [];

  // Header
  lines.push(`╔${border}╗`);
  const headerText = masechet && dafNumber ? `${masechet} דף ${dafNumber}` : 'צורת הדף';
  const headerPadding = Math.floor((width - headerText.length) / 2);
  lines.push(`║${' '.repeat(headerPadding)}${headerText}${' '.repeat(width - headerPadding - headerText.length)}║`);
  lines.push(`╠${'═'.repeat(marginWidth)}╦${'═'.repeat(mainWidth)}╦${'═'.repeat(marginWidth)}╣`);

  // Column headers
  const rashiHeader = 'רש"י'.padStart(Math.floor((marginWidth + 4) / 2)).padEnd(marginWidth);
  const mainHeader = 'גמרא'.padStart(Math.floor((mainWidth + 4) / 2)).padEnd(mainWidth);
  const tosafotHeader = 'תוספות'.padStart(Math.floor((marginWidth + 6) / 2)).padEnd(marginWidth);
  lines.push(`║${rashiHeader}║${mainHeader}║${tosafotHeader}║`);
  lines.push(`╠${'─'.repeat(marginWidth)}╬${'─'.repeat(mainWidth)}╬${'─'.repeat(marginWidth)}╣`);

  // Content rows
  for (let i = 0; i < maxLines; i++) {
    const rashiLine = (rashiLines[i] || '').padEnd(marginWidth);
    const mainLine = (mainLines[i] || '').padEnd(mainWidth);
    const tosafotLine = (tosafotLines[i] || '').padEnd(marginWidth);
    lines.push(`║${rashiLine}║${mainLine}║${tosafotLine}║`);
  }

  // Footer
  lines.push(`╚${'═'.repeat(marginWidth)}╩${'═'.repeat(mainWidth)}╩${'═'.repeat(marginWidth)}╝`);

  return lines.join('\n');
}

/**
 * Generate CSS styles for Tzurat HaDaf rendering
 * @returns {string} CSS stylesheet for daf layout
 */
export function getTzuratHaDafStyles() {
  return `
/* Tzurat HaDaf - Traditional Talmud Page Layout */
.tzurat-hadaf {
  display: grid;
  grid-template-columns: 1fr 2fr 1fr;
  grid-template-rows: auto 1fr auto;
  gap: 0;
  direction: rtl;
  font-family: 'David Libre', 'Frank Ruhl Libre', serif;
  background: #faf8f0;
  border: 2px solid #8b7355;
  border-radius: 4px;
  padding: 0;
  max-width: 1200px;
  margin: 0 auto;
}

/* Page Header */
.tzurat-hadaf-header {
  grid-column: 1 / -1;
  text-align: center;
  padding: 12px;
  background: linear-gradient(to bottom, #d4c4a8, #e8dcc8);
  border-bottom: 2px solid #8b7355;
  font-size: 1.4rem;
  font-weight: bold;
}

.tzurat-hadaf-header .masechet {
  font-size: 1.6rem;
  color: #4a3728;
}

.tzurat-hadaf-header .daf-number {
  font-size: 1.2rem;
  color: #6b5344;
  margin-right: 8px;
}

/* Main Gemara Column (Center) */
.tzurat-hadaf-main {
  grid-column: 2;
  padding: 16px 20px;
  font-size: 1.1rem;
  line-height: 1.8;
  text-align: justify;
  border-left: 1px solid #c4b49a;
  border-right: 1px solid #c4b49a;
  background: #fffef8;
}

.tzurat-hadaf-main .mishna-section {
  background: #e8f4fc;
  border-right: 4px solid #4A90D9;
  padding: 12px;
  margin: 8px 0;
  border-radius: 0 4px 4px 0;
}

.tzurat-hadaf-main .gemara-section {
  background: #fdf8f0;
  border-right: 4px solid #8B4513;
  padding: 12px;
  margin: 8px 0;
  border-radius: 0 4px 4px 0;
}

/* Rashi Column (Inner/Right) */
.tzurat-hadaf-rashi {
  grid-column: 1;
  padding: 12px;
  font-family: 'Rashi', 'SBL Hebrew', serif;
  font-size: 0.85rem;
  line-height: 1.6;
  background: #f5f0e6;
}

.tzurat-hadaf-rashi .commentary-header {
  font-weight: bold;
  text-align: center;
  padding: 8px;
  background: #e8dcc8;
  border-bottom: 1px solid #c4b49a;
  margin: -12px -12px 12px -12px;
}

/* Tosafot Column (Outer/Left) */
.tzurat-hadaf-tosafot {
  grid-column: 3;
  padding: 12px;
  font-family: 'Tosafot', 'SBL Hebrew', serif;
  font-size: 0.85rem;
  line-height: 1.6;
  background: #f5f0e6;
}

.tzurat-hadaf-tosafot .commentary-header {
  font-weight: bold;
  text-align: center;
  padding: 8px;
  background: #e8dcc8;
  border-bottom: 1px solid #c4b49a;
  margin: -12px -12px 12px -12px;
}

/* Additional Commentaries Footer */
.tzurat-hadaf-footer {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 12px;
  background: #e8dcc8;
  border-top: 2px solid #8b7355;
}

.tzurat-hadaf-footer .commentary-block {
  flex: 1;
  min-width: 200px;
  padding: 8px;
  background: #f5f0e6;
  border: 1px solid #c4b49a;
  border-radius: 4px;
}

/* Discourse Markers within Tzurat HaDaf */
.tzurat-hadaf .discourse-marker-mishna {
  background-color: #4A90D920;
  border-bottom: 2px solid #4A90D9;
  font-weight: bold;
}

.tzurat-hadaf .discourse-marker-gemara {
  background-color: #8B451320;
  border-bottom: 2px solid #8B4513;
  font-weight: bold;
}

.tzurat-hadaf .discourse-marker-question {
  background-color: #E67E2220;
  border-bottom: 2px solid #E67E22;
}

.tzurat-hadaf .discourse-marker-objection {
  background-color: #E74C3C20;
  border-bottom: 2px solid #E74C3C;
}

.tzurat-hadaf .discourse-marker-proof {
  background-color: #27AE6020;
  border-bottom: 2px solid #27AE60;
}

.tzurat-hadaf .discourse-marker-resolution {
  background-color: #9B59B620;
  border-bottom: 2px solid #9B59B6;
}

/* Responsive Layout */
@media (max-width: 768px) {
  .tzurat-hadaf {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto auto auto auto;
  }

  .tzurat-hadaf-rashi,
  .tzurat-hadaf-tosafot {
    grid-column: 1;
    border-left: none;
    border-right: none;
    border-bottom: 1px solid #c4b49a;
  }

  .tzurat-hadaf-main {
    grid-column: 1;
    border-left: none;
    border-right: none;
  }
}

/* Print Styles */
@media print {
  .tzurat-hadaf {
    border: 1px solid #000;
    background: #fff;
  }

  .tzurat-hadaf-header,
  .tzurat-hadaf-footer {
    background: #f0f0f0;
  }
}
`;
}

/**
 * Generate React-compatible props for Tzurat HaDaf component
 * @param {Object} options - Layout options
 * @returns {Object} Props object for React component
 */
export function getTzuratHaDafProps(options = {}) {
  const layout = generateTzuratHaDaf(options);

  return {
    className: 'tzurat-hadaf',
    style: {
      direction: 'rtl',
      fontFamily: "'David Libre', 'Frank Ruhl Libre', serif"
    },
    header: {
      masechet: layout.header.masechet,
      dafNumber: layout.header.dafNumber,
      amud: layout.header.amud
    },
    columns: {
      rashi: {
        title: layout.innerMargin.commentator,
        content: layout.innerMargin.text,
        style: layout.innerMargin.style
      },
      main: {
        content: layout.mainColumn.htmlWithMarkers,
        segments: layout.mainColumn.segments,
        analysis: layout.mainColumn.analysis
      },
      tosafot: {
        title: layout.outerMargin.commentator,
        content: layout.outerMargin.text,
        style: layout.outerMargin.style
      }
    },
    footer: layout.additionalCommentaries,
    discourseIndicators: layout.discourseIndicators
  };
}

/**
 * Render Tzurat HaDaf as HTML string
 * @param {Object} options - Layout options
 * @returns {string} Complete HTML string for the daf
 */
export function renderTzuratHaDafHtml(options = {}) {
  const layout = generateTzuratHaDaf(options);

  return `
<div class="tzurat-hadaf">
  <header class="tzurat-hadaf-header">
    <span class="masechet">${layout.header.masechet || ''}</span>
    <span class="daf-number">דף ${layout.header.dafNumber || ''}</span>
  </header>

  <aside class="tzurat-hadaf-rashi">
    <div class="commentary-header">${layout.innerMargin.commentator}</div>
    <div class="commentary-content">${layout.innerMargin.text || '<em>אין רש"י</em>'}</div>
  </aside>

  <main class="tzurat-hadaf-main">
    ${layout.mainColumn.segments.map(seg => `
      <div class="${seg.type}-section" data-type="${seg.type}">
        ${seg.icon ? `<span class="section-icon">${seg.icon}</span>` : ''}
        ${seg.content}
      </div>
    `).join('')}
  </main>

  <aside class="tzurat-hadaf-tosafot">
    <div class="commentary-header">${layout.outerMargin.commentator}</div>
    <div class="commentary-content">${layout.outerMargin.text || '<em>אין תוספות</em>'}</div>
  </aside>

  ${layout.additionalCommentaries.length > 0 ? `
  <footer class="tzurat-hadaf-footer">
    ${layout.additionalCommentaries.map(c => `
      <div class="commentary-block">
        <strong>${c.hebrewName || c.name}</strong>
        <p>${c.text}</p>
      </div>
    `).join('')}
  </footer>
  ` : ''}
</div>
`;
}

// =============================================================================
// MISHNA STRUCTURE ANALYSIS (PRO SCHOLAR V13)
// =============================================================================

/**
 * Analyze Mishna structure - detects enumeration, conditions, rulings
 * @param {string} text - Mishna text to analyze
 * @returns {Object} Structured analysis of the Mishna
 */
