/**
 * PardesView Component
 * PaRDeS - Four Levels of Interpretation (Mussar mode)
 */

import React, { memo } from 'react';
import MermaidDiagram from '../MermaidDiagram';
import { InfoCard, ClickableElement, SefariaLink } from '../SharedComponents';

// PaRDeS levels configuration
const PARDES_LEVELS = [
  { key: 'pshat', hebrew: 'פְּשָׁט', color: '#3b82f6', icon: '📖' },
  { key: 'remez', hebrew: 'רֶמֶז', color: '#8b5cf6', icon: '🔮' },
  { key: 'drash', hebrew: 'דְּרָשׁ', color: '#10b981', icon: '📜' },
  { key: 'sod', hebrew: 'סוֹד', color: '#f59e0b', icon: '✨' }
];

/**
 * PaRDeS View - Four Levels of Interpretation
 */
function PardesView({
  data,
  showDiagram,
  diagramId,
  onWordLookup,
  onSourceClick
}) {
  const handleKeywordClick = (word) => {
    onWordLookup?.(word);
  };

  const handleKeywordKeyDown = (e, word) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onWordLookup?.(word);
    }
  };

  return (
    <div className="pardes-view">
      {data.summary && (
        <div className="context-banner pardes-banner">
          <span className="pardes-title">🌳 פַּרְדֵּס - The Four Levels</span>
          <p>{data.summary}</p>
        </div>
      )}

      <div className="pardes-levels">
        {PARDES_LEVELS.map(({ key, hebrew, color, icon }) => {
          const levelData = data[key];
          if (!levelData) return null;

          return (
            <div key={key} className="pardes-level" style={{ '--level-color': color }}>
              <div className="level-header">
                <span className="level-icon">{icon}</span>
                <span className="level-hebrew">{hebrew}</span>
                <span className="level-name">{levelData.level}</span>
              </div>
              <div className="level-content">
                <p className="level-interpretation">{levelData.interpretation}</p>

                {levelData.keyWords && levelData.keyWords.length > 0 && (
                  <div className="level-keywords">
                    {levelData.keyWords.map((word, i) => (
                      <span
                        key={i}
                        className={`keyword-chip ${onWordLookup ? 'clickable' : ''}`}
                        onClick={() => handleKeywordClick(word)}
                        onKeyDown={(e) => handleKeywordKeyDown(e, word)}
                        role={onWordLookup ? 'button' : undefined}
                        tabIndex={onWordLookup ? 0 : undefined}
                        title={onWordLookup ? `Look up "${word}"` : undefined}
                      >
                        {word}
                      </span>
                    ))}
                  </div>
                )}

                {levelData.hints && levelData.hints.length > 0 && (
                  <div className="level-hints">
                    <strong>Hints:</strong> {levelData.hints.join(', ')}
                  </div>
                )}

                {levelData.midrash && (
                  <div className="level-midrash">
                    <strong>Midrash:</strong> {levelData.midrash}
                  </div>
                )}

                {levelData.lesson && (
                  <div className="level-lesson">
                    <strong>Lesson:</strong> {levelData.lesson}
                  </div>
                )}

                {levelData.concept && (
                  <div className="level-concept">
                    <strong>Mystical Concept:</strong> {levelData.concept}
                  </div>
                )}

                {levelData.commentator && (
                  <div className="level-source">
                    <ClickableElement
                      className="source-badge"
                      onClick={() => onSourceClick?.(levelData.commentator)}
                      title={`Learn about ${levelData.commentator}`}
                    >
                      📚 {levelData.commentator}
                    </ClickableElement>
                  </div>
                )}

                {levelData.source && (
                  <div className="level-source">
                    <SefariaLink reference={levelData.source} className="source-badge">
                      📚 {levelData.source}
                    </SefariaLink>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {data.synthesis && (
        <InfoCard icon="🔗" title="Synthesis - How the Levels Connect" highlight>
          <p>{data.synthesis}</p>
        </InfoCard>
      )}

      {showDiagram && data.diagram && (
        <div className="diagram-section">
          <h4>🗺️ PaRDeS Structure</h4>
          <MermaidDiagram chart={data.diagram} id={diagramId} explanation={data.diagramExplanation} />
        </div>
      )}
    </div>
  );
}

export default memo(PardesView);
