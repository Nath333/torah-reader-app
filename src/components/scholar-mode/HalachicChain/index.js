/**
 * HalachicChain Main Component
 * 
 * The primary container component that orchestrates the entire halachic decision chain.
 * Combines OpinionTimeline, DecisionMatrix, and CrossReferencePanel into a cohesive interface.
 * 
 * Features:
 * - Layer toggle controls
 * - Educational/Practical mode switch
 * - Integration with useHalachicChain hook
 * - Responsive layout
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useHalachicChain } from './hooks';
import { HALACHIC_LAYERS } from './types';
import OpinionTimeline from './components/OpinionTimeline';
import DecisionMatrix from './components/DecisionMatrix';
import CrossReferencePanel from './components/CrossReferencePanel';
import './HalachicChain.css';

const HalachicChain = ({
  text,
  reference,
  currentBook,
  options = {},
  onOpinionFocus,
  onError
}) => {
  // Use the main hook
  const {
    chain,
    fullChain,
    stats,
    isLoading,
    isBackgroundRefreshing,
    error,
    visibleLayers,
    focusedOpinion,
    educationalMode,
    toggleLayer,
    showAllLayers,
    focusLayer,
    selectOpinion,
    toggleEducationalMode,
    refresh,
    isLayerVisible
  } = useHalachicChain(text, reference, options);

  // Local UI state
  const [activeView, setActiveView] = useState('timeline'); // 'timeline' | 'matrix' | 'references'

  // Handle errors
  if (error && onError) {
    onError(error);
  }

  // Loading state
  if (isLoading && !chain) {
    return (
      <div className="halachic-chain-loading">
        <div className="loading-spinner" />
        <span>Building halachic chain...</span>
        {isBackgroundRefreshing && (
          <span className="refreshing-indicator">(refreshing data)</span>
        )}
      </div>
    );
  }

  // Empty state
  if (!chain) {
    return (
      <div className="halachic-chain-empty">
        <span className="empty-icon">⚖️</span>
        <span className="empty-text">Select text to view halachic chain</span>
      </div>
    );
  }

  const handleOpinionClick = (opinion) => {
    selectOpinion(opinion);
    if (onOpinionFocus) {
      onOpinionFocus(opinion);
    }
  };

  return (
    <div className="halachic-chain">
      {/* Header Controls */}
      <div className="chain-header">
        <div className="header-left">
          <h2 className="chain-title">Halachic Chain</h2>
          {stats && (
            <div className="chain-stats">
              <span className="stat-item">
                {stats.totalOpinions} opinions
              </span>
              {stats.hasPsak && (
                <span className="stat-item psak">
                  ✓ Final psak
                </span>
              )}
            </div>
          )}
        </div>

        <div className="header-controls">
          {/* Layer Toggles */}
          <div className="layer-toggles">
            <LayerToggleButton
              layer={HALACHIC_LAYERS.MISHNAH}
              hebrew="משנה"
              isVisible={isLayerVisible(HALACHIC_LAYERS.MISHNAH)}
              onToggle={() => toggleLayer(HALACHIC_LAYERS.MISHNAH)}
            />
            <LayerToggleButton
              layer={HALACHIC_LAYERS.GEMARA}
              hebrew="גמרא"
              isVisible={isLayerVisible(HALACHIC_LAYERS.GEMARA)}
              onToggle={() => toggleLayer(HALACHIC_LAYERS.GEMARA)}
            />
            <LayerToggleButton
              layer={HALACHIC_LAYERS.RISHONIM}
              hebrew="ראשונים"
              isVisible={isLayerVisible(HALACHIC_LAYERS.RISHONIM)}
              onToggle={() => toggleLayer(HALACHIC_LAYERS.RISHONIM)}
            />
            <LayerToggleButton
              layer={HALACHIC_LAYERS.PSAK}
              hebrew="פסק"
              isVisible={isLayerVisible(HALACHIC_LAYERS.PSAK)}
              onToggle={() => toggleLayer(HALACHIC_LAYERS.PSAK)}
            />
          </div>

          {/* View Mode Toggle */}
          <button
            className="mode-toggle"
            onClick={toggleEducationalMode}
            title={educationalMode ? 'Switch to practical mode' : 'Switch to educational mode'}
          >
            {educationalMode ? '📚 Educational' : '⚖️ Practical'}
          </button>

          {/* Refresh Button */}
          <button
            className="refresh-btn"
            onClick={refresh}
            disabled={isLoading}
            title="Refresh data"
          >
            ⟳
          </button>
        </div>
      </div>

      {/* View Tabs */}
      <div className="view-tabs">
        <button
          className={`view-tab ${activeView === 'timeline' ? 'active' : ''}`}
          onClick={() => setActiveView('timeline')}
        >
          📜 Timeline
        </button>
        <button
          className={`view-tab ${activeView === 'matrix' ? 'active' : ''}`}
          onClick={() => setActiveView('matrix')}
        >
          📊 Matrix
        </button>
        <button
          className={`view-tab ${activeView === 'references' ? 'active' : ''}`}
          onClick={() => setActiveView('references')}
        >
          🔗 References
          {chain.crossReferences?.length > 0 && (
            <span className="tab-badge">{chain.crossReferences.length}</span>
          )}
        </button>
      </div>

      {/* Main Content */}
      <div className="chain-content">
        {activeView === 'timeline' && (
          <OpinionTimeline
            chain={chain}
            focusedOpinion={focusedOpinion}
            onOpinionClick={handleOpinionClick}
            educationalMode={educationalMode}
          />
        )}

        {activeView === 'matrix' && (
          <DecisionMatrix
            decisions={fullChain?.layers[HALACHIC_LAYERS.RISHONIM]?.decisions}
            majority={fullChain?.majority}
            compact={false}
          />
        )}

        {activeView === 'references' && (
          <CrossReferencePanel
            references={chain.crossReferences}
            currentBook={currentBook}
          />
        )}
      </div>

      {/* Status Bar */}
      <div className="chain-status">
        <span className="status-ref">{reference}</span>
        {isBackgroundRefreshing && (
          <span className="status-refreshing">⟳ Refreshing...</span>
        )}
        {error && (
          <span className="status-error">⚠ {error}</span>
        )}
      </div>
    </div>
  );
};

/**
 * Layer toggle button component
 */
const LayerToggleButton = ({ layer, hebrew, isVisible, onToggle }) => (
  <button
    className={`layer-toggle ${isVisible ? 'active' : ''}`}
    onClick={onToggle}
    title={isVisible ? 'Hide layer' : 'Show layer'}
  >
    <span className="toggle-indicator">{isVisible ? '☑' : '☐'}</span>
    <span className="toggle-hebrew">{hebrew}</span>
  </button>
);

HalachicChain.propTypes = {
  text: PropTypes.string.isRequired,
  reference: PropTypes.string.isRequired,
  currentBook: PropTypes.string,
  options: PropTypes.object,
  onOpinionFocus: PropTypes.func,
  onError: PropTypes.func
};

export default HalachicChain;
