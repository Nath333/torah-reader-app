/**
 * TreeResultComponent - Concept tree visualization for Torah analysis
 * Bilingual support with language toggle (EN/HE/Both)
 */
import React, { useState } from 'react';

const colorMap = {
  blue: '#6ba3d6',
  green: '#7eb88a',
  purple: '#a78bfa',
  gold: '#c9a227',
  pink: '#d6a3b5',
  red: '#ef4444'
};

export const TreeResultComponent = ({ data }) => {
  const [lang, setLang] = useState('both');
  const showEn = lang === 'en' || lang === 'both';
  const showHe = lang === 'he' || lang === 'both';

  return (
    <div className="tree-result">
      <div className="tree-header">
        <span className="tree-badge">🌲 Concept Tree</span>
        <div className="tree-titles">
          {showEn && data.title && <span className="tree-title">{data.title}</span>}
          {showHe && data.titleHebrew && <span className="tree-title-hebrew" dir="rtl">{data.titleHebrew}</span>}
        </div>
        {data.verseRange && <span className="tree-verse-range">📖 {data.verseRange}</span>}
        <div className="tree-lang-toggle">
          <button className={`lang-btn ${lang === 'en' ? 'active' : ''}`} onClick={() => setLang('en')}>EN</button>
          <button className={`lang-btn ${lang === 'both' ? 'active' : ''}`} onClick={() => setLang('both')}>EN/עב</button>
          <button className={`lang-btn ${lang === 'he' ? 'active' : ''}`} onClick={() => setLang('he')}>עב</button>
        </div>
      </div>
      {data.root && (
        <div className="tree-root">
          <div className="root-content">
            {data.root.hebrew && <span className="root-hebrew" dir="rtl">{data.root.hebrew}</span>}
            {showEn && <span className="root-concept">{data.root.concept}</span>}
            {showHe && data.root.conceptHebrew && <span className="root-concept-hebrew" dir="rtl">{data.root.conceptHebrew}</span>}
          </div>
          {showEn && data.root.description && <p className="root-description">{data.root.description}</p>}
          {showHe && data.root.descriptionHebrew && <p className="root-description-hebrew" dir="rtl">{data.root.descriptionHebrew}</p>}
        </div>
      )}
      {data.branches?.map((branch, i) => (
        <div key={branch.id || i} className="tree-branch" style={{ '--branch-color': colorMap[branch.color] || colorMap.gold }}>
          <div className="branch-header">
            <span>{branch.icon || '📌'}</span>
            {showEn && <span className="branch-theme">{branch.theme}</span>}
            {showHe && branch.themeHebrew && <span className="branch-theme-hebrew" dir="rtl">{branch.themeHebrew}</span>}
            <span className="branch-id">{branch.id}</span>
            {branch.verseRef && <span className="branch-verse-ref">📖 {branch.verseRef}</span>}
          </div>
          {showEn && branch.description && <p className="branch-description">{branch.description}</p>}
          {showHe && branch.descriptionHebrew && <p dir="rtl">{branch.descriptionHebrew}</p>}
          {branch.leaves?.map((leaf, j) => (
            <div key={j} className="tree-leaf">
              <span>└─</span>
              {showEn && <span>{leaf.point}</span>}
              {showHe && leaf.pointHebrew && <span dir="rtl">{leaf.pointHebrew}</span>}
              {leaf.source && <span className="leaf-source">— {leaf.source}</span>}
            </div>
          ))}
        </div>
      ))}
      {data.connections?.map((conn, i) => (
        <div key={i} className="tree-connection">
          <span>{conn.from} ↔ {conn.to}</span>
          {showEn && <span>{conn.relationship}</span>}
        </div>
      ))}
      {data.practicalRoot && <div className="tree-practical">💡 {showEn ? data.practicalRoot : data.practicalRootHebrew}</div>}
      {data.studyPath && <div className="tree-study-path">📚 {showEn ? data.studyPath : data.studyPathHebrew}</div>}
    </div>
  );
};

export default TreeResultComponent;
