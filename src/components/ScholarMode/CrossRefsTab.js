/**
 * CrossRefsTab - Cross-references display
 */
import React, { useState, useEffect, useMemo } from 'react';

const CrossRefsTab = React.memo(({ crossReferences, halacha, midrash }) => {
  const [activeSection, setActiveSection] = useState('talmud');

  const sections = useMemo(() => [
    { id: 'talmud', label: 'Talmud', items: crossReferences?.talmud || [], icon: '📜' },
    { id: 'tanakh', label: 'Tanakh', items: crossReferences?.tanakh || [], icon: '📖' },
    { id: 'halacha', label: 'Halacha', items: halacha || [], icon: '⚖️' },
    { id: 'midrash', label: 'Midrash', items: midrash || [], icon: '📚' },
    { id: 'mishnah', label: 'Mishnah', items: crossReferences?.mishnah || [], icon: '📋' },
    { id: 'other', label: 'Other', items: crossReferences?.other || [], icon: '🔗' }
  ].filter(s => s.items.length > 0), [crossReferences, halacha, midrash]);

  // Update active section if current doesn't exist
  useEffect(() => {
    if (sections.length > 0 && !sections.find(s => s.id === activeSection)) {
      setActiveSection(sections[0].id);
    }
  }, [sections, activeSection]);

  if (sections.length === 0) {
    return (
      <div className="tab-empty">
        <span className="empty-icon">🔗</span>
        <span className="empty-text">No cross-references found</span>
      </div>
    );
  }

  const activeItems = sections.find(s => s.id === activeSection)?.items || [];

  return (
    <div className="crossrefs-tab">
      {/* Section Tabs */}
      <div className="section-tabs">
        {sections.map(section => (
          <button
            key={section.id}
            className={`section-tab ${activeSection === section.id ? 'active' : ''}`}
            onClick={() => setActiveSection(section.id)}
          >
            <span className="section-icon">{section.icon}</span>
            <span className="section-label">{section.label}</span>
            <span className="section-count">{section.items.length}</span>
          </button>
        ))}
      </div>

      {/* References List */}
      <div className="crossrefs-list">
        {activeItems.slice(0, 20).map((item, index) => (
          <div key={index} className="crossref-item">
            <span className="crossref-ref">{item.heRef || item.ref}</span>
            {item.he && (
              <p className="crossref-text-hebrew" dir="rtl" lang="he">
                {item.he.slice(0, 150)}{item.he.length > 150 ? '...' : ''}
              </p>
            )}
            {item.text && !item.he && (
              <p className="crossref-text-english">
                {item.text.slice(0, 150)}{item.text.length > 150 ? '...' : ''}
              </p>
            )}
          </div>
        ))}
        {activeItems.length > 20 && (
          <div className="crossrefs-more">
            +{activeItems.length - 20} more references
          </div>
        )}
      </div>
    </div>
  );
});

export default CrossRefsTab;
