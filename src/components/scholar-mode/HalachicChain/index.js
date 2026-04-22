/**
 * HalachicChain Main Component
 *
 * Orchestrates the complete 7-layer שושלת הוראה:
 * משנה → גמרא → ראשונים → טור/בית יוסף → שולחן ערוך → אחרונים → פוסקים
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
  const {
    chain,
    fullChain,
    stats,
    klaleiPesika,
    opinionFlows,
    focusedFlow,
    isLoading,
    isBackgroundRefreshing,
    error,
    focusedOpinion,
    educationalMode,
    toggleLayer,
    selectOpinion,
    toggleEducationalMode,
    refresh,
    isLayerVisible
  } = useHalachicChain(text, reference, options);

  const [activeView, setActiveView] = useState('timeline');

  if (error && onError) onError(error);

  if (isLoading && !chain) {
    return (
      <div className="halachic-chain-loading" dir="rtl">
        <div className="loading-spinner" />
        <span>בונה שושלת הוראה...</span>
        {isBackgroundRefreshing && (
          <span className="refreshing-indicator">(מרענן נתונים)</span>
        )}
      </div>
    );
  }

  if (!chain) {
    return (
      <div className="halachic-chain-empty" dir="rtl">
        <span className="empty-icon">⛓️</span>
        <span className="empty-text">בחר טקסט כדי לצפות בשושלת ההוראה</span>
      </div>
    );
  }

  const handleOpinionClick = (opinion) => {
    selectOpinion(opinion);
    if (onOpinionFocus) onOpinionFocus(opinion);
  };

  return (
    <div className="halachic-chain" dir="rtl">
      {/* Header Controls */}
      <div className="chain-header">
        <div className="header-left">
          <h2 className="chain-title">⛓️ שושלת הוראה</h2>
          {stats && (
            <div className="chain-stats">
              <span className="stat-item">{stats.totalOpinions} דעות</span>
              <span className="stat-item">{stats.rishonimCount} ראשונים</span>
              {stats.hasTur && <span className="stat-item tur">טור</span>}
              {stats.acharonimCount > 0 && (
                <span className="stat-item">{stats.acharonimCount} אחרונים</span>
              )}
              {stats.hasPsak && (
                <span className={`stat-item psak ${!stats.traditionsAgree ? 'disputed' : ''}`}>
                  {stats.traditionsAgree ? '✅ פסק מוסכם' : '⚔️ מסורות חלוקות'}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="header-controls">
          {/* Layer Toggles — full שושלת הוראה */}
          <div className="layer-toggles">
            <LayerToggleButton
              hebrew="משנה"
              isVisible={isLayerVisible(HALACHIC_LAYERS.MISHNAH)}
              onToggle={() => toggleLayer(HALACHIC_LAYERS.MISHNAH)}
            />
            <LayerToggleButton
              hebrew="גמרא"
              isVisible={isLayerVisible(HALACHIC_LAYERS.GEMARA)}
              onToggle={() => toggleLayer(HALACHIC_LAYERS.GEMARA)}
            />
            <LayerToggleButton
              hebrew="ראשונים"
              isVisible={isLayerVisible(HALACHIC_LAYERS.RISHONIM)}
              onToggle={() => toggleLayer(HALACHIC_LAYERS.RISHONIM)}
            />
            <LayerToggleButton
              hebrew="טור"
              isVisible={isLayerVisible(HALACHIC_LAYERS.TUR)}
              onToggle={() => toggleLayer(HALACHIC_LAYERS.TUR)}
            />
            <LayerToggleButton
              hebrew="ש״ע"
              isVisible={isLayerVisible(HALACHIC_LAYERS.PSAK)}
              onToggle={() => toggleLayer(HALACHIC_LAYERS.PSAK)}
            />
            <LayerToggleButton
              hebrew="אחרונים"
              isVisible={isLayerVisible(HALACHIC_LAYERS.ACHARONIM)}
              onToggle={() => toggleLayer(HALACHIC_LAYERS.ACHARONIM)}
            />
            <LayerToggleButton
              hebrew="פוסקים"
              isVisible={isLayerVisible(HALACHIC_LAYERS.POSKIM)}
              onToggle={() => toggleLayer(HALACHIC_LAYERS.POSKIM)}
            />
          </div>

          <button
            className="mode-toggle"
            onClick={toggleEducationalMode}
            title={educationalMode ? 'מצב מעשי' : 'מצב לימודי'}
          >
            {educationalMode ? '📖 לימודי' : '⚖️ מעשי'}
          </button>

          <button
            className="refresh-btn"
            onClick={refresh}
            disabled={isLoading}
            title="רענן נתונים"
          >
            🔄 רענן
          </button>
        </div>
      </div>

      {/* View Tabs */}
      <div className="view-tabs">
        <button
          className={`view-tab ${activeView === 'timeline' ? 'active' : ''}`}
          onClick={() => setActiveView('timeline')}
        >
          📊 ציר זמן
        </button>
        <button
          className={`view-tab ${activeView === 'flow' ? 'active' : ''}`}
          onClick={() => setActiveView('flow')}
        >
          🔄 מסלול דעות
          {opinionFlows.length > 0 && (
            <span className="tab-badge">{opinionFlows.length}</span>
          )}
        </button>
        <button
          className={`view-tab ${activeView === 'matrix' ? 'active' : ''}`}
          onClick={() => setActiveView('matrix')}
        >
          📋 מטריצה
        </button>
        <button
          className={`view-tab ${activeView === 'references' ? 'active' : ''}`}
          onClick={() => setActiveView('references')}
        >
          🔗 מקורות
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
            klaleiPesika={klaleiPesika}
          />
        )}

        {activeView === 'flow' && (
          <OpinionFlowView
            flows={opinionFlows}
            focusedFlow={focusedFlow}
            focusedOpinion={focusedOpinion}
            onOpinionClick={handleOpinionClick}
            klaleiPesika={klaleiPesika}
          />
        )}

        {activeView === 'matrix' && (
          <DecisionMatrix
            decisions={fullChain?.layers[HALACHIC_LAYERS.RISHONIM]?.decisions}
            majority={fullChain?.majority}
            acharonimDecisions={fullChain?.layers[HALACHIC_LAYERS.ACHARONIM]?.decisions}
            psak={fullChain?.layers[HALACHIC_LAYERS.PSAK]?.psak}
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
          <span className="status-refreshing">מרענן...</span>
        )}
        {error && <span className="status-error">{error}</span>}
      </div>
    </div>
  );
};

/**
 * Opinion Flow View — traces each opinion's journey through all layers
 */
const OpinionFlowView = ({ flows, focusedFlow, focusedOpinion, onOpinionClick, klaleiPesika }) => {
  if (!flows || flows.length === 0) {
    return (
      <div className="flow-view-empty" dir="rtl">
        <span className="empty-icon">🔄</span>
        <span className="empty-text">לא נמצאו מסלולי דעות. בחר קטע תלמודי עם משנה.</span>
      </div>
    );
  }

  const STATUS_LABELS = {
    originated: { text: 'מקור', cls: 'status-originated' },
    survived: { text: 'שרד', cls: 'status-survived' },
    challenged: { text: 'הוקשה', cls: 'status-challenged' },
    adopted: { text: 'אומץ', cls: 'status-adopted' },
    cited: { text: 'הובא', cls: 'status-cited' },
    not_cited: { text: 'לא הובא', cls: 'status-neutral' },
    codified: { text: 'נפסק', cls: 'status-codified' },
    codified_sephardic: { text: 'פסק ספרדי', cls: 'status-partial' },
    codified_ashkenazi: { text: 'פסק אשכנזי', cls: 'status-partial' },
    not_codified: { text: 'לא נפסק', cls: 'status-rejected' },
    supported: { text: 'נתמך', cls: 'status-supported' },
    not_discussed: { text: 'לא נדון', cls: 'status-neutral' },
    minority: { text: 'מיעוט', cls: 'status-minority' },
    rejected: { text: 'נדחה', cls: 'status-rejected' },
    not_analyzed: { text: 'לא נותח', cls: 'status-neutral' },
    unknown: { text: 'ממתין', cls: 'status-neutral' }
  };

  const FINAL_STATUS_LABELS = {
    accepted: { text: '✅ נפסק להלכה', cls: 'final-accepted' },
    partial: { text: '⚖️ נפסק במסורת אחת', cls: 'final-partial' },
    rejected: { text: '❌ לא נפסק', cls: 'final-rejected' },
    minority: { text: 'דעת מיעוט', cls: 'final-minority' },
    challenged: { text: 'הוקשה', cls: 'final-challenged' },
    pending: { text: 'ממתין לניתוח', cls: 'final-pending' },
    unknown: { text: 'לא ידוע', cls: 'final-unknown' }
  };

  const LAYER_LABELS = {
    mishnah: 'משנה',
    gemara: 'גמרא',
    rishonim: 'ראשונים',
    tur: 'טור',
    psak: 'שולחן ערוך',
    acharonim: 'אחרונים',
    poskim: 'פוסקים'
  };

  return (
    <div className="flow-view" dir="rtl">
      <div className="flow-view-header">
        <h3 className="flow-view-title">🔄 מעקב מסלול דעות</h3>
        <p className="flow-view-subtitle">עקוב אחר כל דעה מהתנא ועד הפסק</p>
      </div>

      {/* Klalei Pesika educational panel */}
      {klaleiPesika?.educationalNotes?.length > 0 && (
        <div className="klalei-pesika-panel">
          <div className="kp-header">📜 כללי פסיקה שהופעלו</div>
          {klaleiPesika.educationalNotes.map((note, i) => (
            <div key={i} className={`kp-note kp-${note.type}`}>
              <span className="kp-title">{note.title}</span>
              <span className="kp-text">{note.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Flow cards */}
      <div className="flow-cards">
        {flows.map((flow, i) => {
          const isFocused = focusedOpinion?.authority === flow.originAuthority;
          const finalLabel = FINAL_STATUS_LABELS[flow.finalStatus] || FINAL_STATUS_LABELS.unknown;

          return (
            <div
              key={i}
              className={`flow-card ${isFocused ? 'focused' : ''} ${finalLabel.cls}`}
              onClick={() => onOpinionClick?.({ authority: flow.originAuthority, ruling: flow.ruling })}
            >
              <div className="flow-card-header">
                <span className="flow-origin">{flow.originAuthority}</span>
                <span className="flow-ruling">{flow.ruling}</span>
                <span className={`flow-final-badge ${finalLabel.cls}`}>{finalLabel.text}</span>
              </div>

              {/* Journey nodes */}
              <div className="flow-journey">
                {flow.journey.map((node, j) => {
                  const label = STATUS_LABELS[node.status] || STATUS_LABELS.unknown;
                  return (
                    <div key={j} className={`flow-node ${label.cls}`}>
                      <div className="flow-node-layer">{LAYER_LABELS[node.layer] || node.layer}</div>
                      <div className="flow-node-status">{label.text}</div>
                      {node.supportedBy?.length > 0 && (
                        <div className="flow-node-supporters">
                          {node.supportedBy.join(', ')}
                        </div>
                      )}
                      {(isFocused || focusedFlow?.originAuthority === flow.originAuthority) && node.reasoning && (
                        <div className="flow-node-reasoning">{node.reasoning}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const LayerToggleButton = ({ hebrew, isVisible, onToggle }) => (
  <button
    className={`layer-toggle ${isVisible ? 'active' : ''}`}
    onClick={onToggle}
    title={isVisible ? 'הסתר שכבה' : 'הצג שכבה'}
  >
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
