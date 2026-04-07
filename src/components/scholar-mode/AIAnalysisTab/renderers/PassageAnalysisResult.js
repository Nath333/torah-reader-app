/**
 * PassageAnalysisResult - Multi-verse passage analysis with chiasm visualization
 * Enhanced professional layout for Torah passage study
 */
import React, { memo } from 'react';
import { KeyPointsList } from './SharedComponents';

export const PassageAnalysisResult = memo(({ data }) => {
  const {
    summary,
    storyArc,
    characters,
    themes,
    chiasm,
    structure,
    keyPoints,
    novelInsight,
    practicalMessage
  } = data || {};

  // Calculate chiasm visualization - creates mirror effect
  const renderChiasmVisualization = () => {
    if (!chiasm?.structure?.length) return null;
    const items = chiasm.structure;
    const half = Math.ceil(items.length / 2);

    return (
      <div className="chiasm-visual">
        {/* Upper half - increasing indent */}
        <div className="chiasm-upper">
          {items.slice(0, half).map((item, i) => (
            <div
              key={`upper-${i}`}
              className="chiasm-row"
              style={{ '--indent': i, '--level': i }}
            >
              <span className="chiasm-letter">{String.fromCharCode(65 + i)}</span>
              <span className="chiasm-text">{typeof item === 'string' ? item : item.text || JSON.stringify(item)}</span>
            </div>
          ))}
        </div>

        {/* Center point - highlighted */}
        {chiasm.center && (
          <div className="chiasm-center-point">
            <span className="chiasm-center-marker">✦</span>
            <span className="chiasm-center-text">{chiasm.center}</span>
          </div>
        )}

        {/* Lower half - decreasing indent (mirror) */}
        <div className="chiasm-lower">
          {items.slice(half).reverse().map((item, i) => (
            <div
              key={`lower-${i}`}
              className="chiasm-row mirror"
              style={{ '--indent': half - 1 - i, '--level': half - 1 - i }}
            >
              <span className="chiasm-letter">{String.fromCharCode(65 + half - 1 - i)}'</span>
              <span className="chiasm-text">{typeof item === 'string' ? item : item.text || JSON.stringify(item)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="passage-analysis-result">
      {/* Overview Card */}
      {summary && (
        <div className="passage-overview-card">
          <div className="overview-header">
            <span className="overview-icon">📜</span>
            <h3>Passage Overview</h3>
          </div>
          <p className="overview-text">{summary}</p>
        </div>
      )}

      {/* Two-column layout for Story Arc and Characters */}
      <div className="passage-grid">
        {/* Story Arc */}
        {storyArc && (
          <div className="story-arc-card">
            <h4><span className="section-icon">📖</span> Story Arc</h4>
            <div className="arc-timeline">
              {storyArc.beginning && (
                <div className="arc-step beginning">
                  <div className="arc-marker">🌅</div>
                  <div className="arc-content">
                    <span className="arc-label">Beginning</span>
                    <p>{storyArc.beginning}</p>
                  </div>
                </div>
              )}
              {storyArc.conflict && (
                <div className="arc-step conflict">
                  <div className="arc-marker">⚔️</div>
                  <div className="arc-content">
                    <span className="arc-label">Conflict</span>
                    <p>{storyArc.conflict}</p>
                  </div>
                </div>
              )}
              {storyArc.resolution && (
                <div className="arc-step resolution">
                  <div className="arc-marker">✓</div>
                  <div className="arc-content">
                    <span className="arc-label">Resolution</span>
                    <p>{storyArc.resolution}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Characters */}
        {characters && characters.length > 0 && (
          <div className="characters-card">
            <h4><span className="section-icon">👥</span> Characters</h4>
            <div className="characters-list">
              {characters.map((char, i) => (
                <div key={i} className="character-item">
                  <span className="char-name">{char.name}</span>
                  {char.role && <span className="char-role">{char.role}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Themes - Full width cards */}
      {themes && themes.length > 0 && (
        <div className="themes-section">
          <h4><span className="section-icon">🔮</span> Major Themes</h4>
          <div className="themes-cards">
            {themes.map((theme, i) => (
              <div key={i} className="theme-card">
                <div className="theme-header">
                  <span className="theme-name">{theme.name}</span>
                </div>
                <p className="theme-desc">{theme.description}</p>
                {theme.verses && theme.verses.length > 0 && (
                  <div className="theme-refs">
                    {theme.verses.map((v, j) => (
                      <span key={j} className="verse-ref">{v}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chiastic Structure - Visual representation */}
      {chiasm && (chiasm.structure?.length > 0 || chiasm.center) && (
        <div className="chiasm-section">
          <h4><span className="section-icon">🔄</span> Chiastic Structure</h4>
          {renderChiasmVisualization()}
        </div>
      )}

      {/* Structure Outline */}
      {structure && structure.outline?.length > 0 && (
        <div className="structure-section">
          <h4><span className="section-icon">🏗️</span> Structure</h4>
          <div className="structure-outline">
            {structure.outline.map((item, i) => (
              <div key={i} className="outline-item">
                <span className="outline-bullet">•</span>
                <span className="outline-text">{typeof item === 'string' ? item : JSON.stringify(item)}</span>
              </div>
            ))}
          </div>
          {structure.keyThemes && structure.keyThemes.length > 0 && (
            <div className="structure-themes">
              {structure.keyThemes.map((theme, i) => (
                <span key={i} className="theme-tag">{theme}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Key Points */}
      {keyPoints && keyPoints.length > 0 && (
        <div className="keypoints-section">
          <h4><span className="section-icon">📝</span> Key Points</h4>
          <KeyPointsList points={keyPoints} />
        </div>
      )}

      {/* Novel Insight - Highlighted */}
      {novelInsight && (
        <div className="insight-card">
          <div className="insight-header">
            <span className="insight-icon">💡</span>
            <span className="insight-label">Novel Insight</span>
          </div>
          <p className="insight-text">{novelInsight}</p>
        </div>
      )}

      {/* Practical Message - Bottom highlight */}
      {practicalMessage && (
        <div className="practical-message">
          <span className="practical-icon">🎯</span>
          <p>{practicalMessage}</p>
        </div>
      )}
    </div>
  );
});

PassageAnalysisResult.displayName = 'PassageAnalysisResult';

export default PassageAnalysisResult;
