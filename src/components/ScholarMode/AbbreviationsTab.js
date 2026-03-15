/**
 * AbbreviationsTab - Talmudic abbreviations lookup
 */
import React, { useMemo } from 'react';
import { findAbbreviations } from '../../services/talmudicAbbreviationsService';

const TYPE_ICONS = {
  source: '📜',
  proof: '✓',
  inference: '💡',
  structure: '📑',
  attribution: '💬',
  name: '👤',
  question: '❓',
  school: '🏛️',
  continuation: '➡️',
  analogy: '↔️',
  citation: '📖',
  hermeneutic: '⚖️',
  argument: '🤔',
  teaching: '📚',
  opinion: '💭',
  application: '📋',
  version: '📝',
  ruling: '⚡'
};

const AbbreviationsTab = React.memo(({ text }) => {
  const abbreviations = useMemo(() => {
    if (!text) return [];
    const found = findAbbreviations(text);
    // Deduplicate by abbreviation
    const seen = new Set();
    return found.filter(abbr => {
      if (seen.has(abbr.abbreviation)) return false;
      seen.add(abbr.abbreviation);
      return true;
    });
  }, [text]);

  if (abbreviations.length === 0) {
    return (
      <div className="tab-empty">
        <span className="empty-icon">א״ב</span>
        <span className="empty-text">No abbreviations detected</span>
      </div>
    );
  }

  // Group by type
  const grouped = abbreviations.reduce((acc, abbr) => {
    const type = abbr.type || 'other';
    if (!acc[type]) acc[type] = [];
    acc[type].push(abbr);
    return acc;
  }, {});

  return (
    <div className="abbreviations-tab">
      <div className="abbreviations-header">
        <span className="abbreviations-count">
          Found <strong>{abbreviations.length}</strong> abbreviations (ראשי תיבות)
        </span>
      </div>

      {Object.entries(grouped).map(([type, items]) => (
        <div key={type} className="abbreviation-group">
          <h4 className="group-title">
            <span className="group-icon">{TYPE_ICONS[type] || '📌'}</span>
            <span className="group-name">{type.charAt(0).toUpperCase() + type.slice(1)}</span>
            <span className="group-count">{items.length}</span>
          </h4>

          <div className="abbreviation-list">
            {items.map((abbr, i) => (
              <div key={i} className="abbreviation-item">
                <div className="abbr-main">
                  <span className="abbr-short" dir="rtl">{abbr.abbreviation}</span>
                  <span className="abbr-arrow">→</span>
                  <span className="abbr-expansion" dir="rtl">{abbr.expansion}</span>
                </div>
                <div className="abbr-english">{abbr.english}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
});

export default AbbreviationsTab;
