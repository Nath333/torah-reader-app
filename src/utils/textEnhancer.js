/**
 * Text Enhancement Utilities
 * Adds scholarly tooltips for rabbi names and measures
 */

import React from 'react';
import { RABBIS, findRabbi } from '../data/rabbiBiographies';
import { MEASURES, findMeasure } from '../data/realia';

/**
 * Check if a Hebrew name matches a known rabbi
 */
export function isRabbiName(text) {
  return RABBIS.hasOwnProperty(text) || findRabbi(text) !== null;
}

/**
 * Check if a Hebrew term is a known measure
 */
export function isMeasure(text) {
  return MEASURES.hasOwnProperty(text) || findMeasure(text) !== null;
}

/**
 * Split text into segments, identifying rabbi names
 * Returns array of { text, type: 'text'|'rabbi'|'measure', data? }
 */
export function parseTextForEnhancements(text) {
  if (!text || typeof text !== 'string') return [{ text: text || '', type: 'text' }];

  const segments = [];
  let lastIndex = 0;

  // Combined pattern for both rabbis and measures
  const combinedPattern = new RegExp(
    `(${[...Object.keys(RABBIS), ...Object.keys(MEASURES)]
      .sort((a, b) => b.length - a.length)
      .map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|')})`,
    'g'
  );

  let match;
  while ((match = combinedPattern.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      segments.push({
        text: text.slice(lastIndex, match.index),
        type: 'text'
      });
    }

    // Determine if this is a rabbi or measure
    const matchedText = match[1];
    const rabbi = findRabbi(matchedText);
    const measure = findMeasure(matchedText);

    if (rabbi) {
      segments.push({
        text: matchedText,
        type: 'rabbi',
        data: rabbi
      });
    } else if (measure) {
      segments.push({
        text: matchedText,
        type: 'measure',
        data: measure
      });
    } else {
      segments.push({
        text: matchedText,
        type: 'text'
      });
    }

    lastIndex = match.index + matchedText.length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    segments.push({
      text: text.slice(lastIndex),
      type: 'text'
    });
  }

  return segments.length > 0 ? segments : [{ text, type: 'text' }];
}

/**
 * Simple inline tooltip component for rabbi names
 */
export function RabbiInlineTooltip({ rabbi, children }) {
  const [show, setShow] = React.useState(false);

  return (
    <span
      className="rabbi-inline-tooltip"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      style={{ position: 'relative', display: 'inline' }}
    >
      <span style={{
        color: 'var(--primary, #6366f1)',
        cursor: 'help',
        borderBottom: '1px dotted var(--primary, #6366f1)'
      }}>
        {children}
      </span>
      {show && (
        <span style={{
          position: 'absolute',
          bottom: 'calc(100% + 4px)',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '8px 10px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1000,
          whiteSpace: 'nowrap',
          fontSize: '12px',
          minWidth: '150px',
          textAlign: 'center'
        }}>
          <div style={{ fontWeight: 600, color: '#1e293b' }}>{rabbi.english}</div>
          <div style={{ color: '#64748b', fontSize: '11px' }}>{rabbi.dates}</div>
        </span>
      )}
    </span>
  );
}

/**
 * Simple inline tooltip for measures
 */
export function MeasureInlineTooltip({ measure, children }) {
  const [show, setShow] = React.useState(false);

  return (
    <span
      className="measure-inline-tooltip"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      style={{ position: 'relative', display: 'inline' }}
    >
      <span style={{
        color: 'var(--accent, #059669)',
        cursor: 'help',
        borderBottom: '1px dotted var(--accent, #059669)'
      }}>
        {children}
      </span>
      {show && (
        <span style={{
          position: 'absolute',
          bottom: 'calc(100% + 4px)',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '8px 10px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1000,
          whiteSpace: 'nowrap',
          fontSize: '12px',
          minWidth: '150px',
          textAlign: 'center'
        }}>
          <div style={{ fontWeight: 600, color: '#1e293b' }}>{measure.english}</div>
          <div style={{ color: '#64748b', fontSize: '11px' }}>{measure.modern}</div>
        </span>
      )}
    </span>
  );
}

/**
 * Render enhanced text with tooltips
 */
export function EnhancedText({ text, enableTooltips = true }) {
  if (!enableTooltips || !text) {
    return <>{text}</>;
  }

  const segments = parseTextForEnhancements(text);

  return (
    <>
      {segments.map((segment, i) => {
        if (segment.type === 'rabbi' && segment.data) {
          return (
            <RabbiInlineTooltip key={i} rabbi={segment.data}>
              {segment.text}
            </RabbiInlineTooltip>
          );
        }
        if (segment.type === 'measure' && segment.data) {
          return (
            <MeasureInlineTooltip key={i} measure={segment.data}>
              {segment.text}
            </MeasureInlineTooltip>
          );
        }
        return <React.Fragment key={i}>{segment.text}</React.Fragment>;
      })}
    </>
  );
}

export default EnhancedText;
