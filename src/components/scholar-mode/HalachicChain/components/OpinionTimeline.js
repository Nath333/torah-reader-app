/**
 * OpinionTimeline Component
 * 
 * Vertical timeline showing the progression of halachic opinions
 * through history: Tannaim → Amoraim → Rishonim → Achronim
 * 
 * Features:
 * - Color-coded by authority type
 * - Expandable opinion cards
 * - Visual connection lines
 * - Status indicators (accepted/rejected/minority)
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { HALACHIC_LAYERS, AUTHORITY_COLORS, AUTHORITY_TYPES } from '../types';
import './OpinionTimeline.css';

const OpinionTimeline = ({ 
  chain, 
  focusedOpinion, 
  onOpinionClick, 
  educationalMode = true 
}) => {
  const [expandedOpinions, setExpandedOpinions] = useState(new Set());

  if (!chain?.layers) {
    return <div className="opinion-timeline-empty">No halachic chain data</div>;
  }

  const toggleExpand = (authority) => {
    setExpandedOpinions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(authority)) {
        newSet.delete(authority);
      } else {
        newSet.add(authority);
      }
      return newSet;
    });
  };

  // Collect all authorities by type
  const authoritiesByType = collectAuthoritiesByType(chain);

  return (
    <div className="opinion-timeline">
      <div className="timeline-header">
        <h3 className="timeline-title">Opinion Timeline</h3>
        <div className="timeline-legend">
          <LegendItem color={AUTHORITY_COLORS[AUTHORITY_TYPES.TANNA]} label="Tannaim" />
          <LegendItem color={AUTHORITY_COLORS[AUTHORITY_TYPES.AMORA]} label="Amoraim" />
          <LegendItem color={AUTHORITY_COLORS[AUTHORITY_TYPES.RISHON]} label="Rishonim" />
          <LegendItem color={AUTHORITY_COLORS[AUTHORITY_TYPES.ACHRON]} label="Achronim" />
        </div>
      </div>

      <div className="timeline-content">
        {/* Mishnah Layer - Tannaim */}
        {chain.layers[HALACHIC_LAYERS.MISHNAH]?.opinions?.length > 0 && (
          <TimelineSection
            title="Mishnah"
            hebrewTitle="משנה"
            layer={chain.layers[HALACHIC_LAYERS.MISHNAH]}
            type={AUTHORITY_TYPES.TANNA}
            expandedOpinions={expandedOpinions}
            onToggleExpand={toggleExpand}
            focusedOpinion={focusedOpinion}
            onOpinionClick={onOpinionClick}
            educationalMode={educationalMode}
          />
        )}

        {/* Gemara Layer - Analysis */}
        {chain.layers[HALACHIC_LAYERS.GEMARA]?.analysis?.length > 0 && (
          <TimelineSection
            title="Gemara Analysis"
            hebrewTitle="גמרא"
            layer={chain.layers[HALACHIC_LAYERS.GEMARA]}
            type="analysis"
            expandedOpinions={expandedOpinions}
            onToggleExpand={toggleExpand}
            focusedOpinion={focusedOpinion}
            onOpinionClick={onOpinionClick}
            educationalMode={educationalMode}
          />
        )}

        {/* Rishonim Layer */}
        {chain.layers[HALACHIC_LAYERS.RISHONIM]?.decisions?.length > 0 && (
          <TimelineSection
            title="Rishonim"
            hebrewTitle="ראשונים"
            layer={chain.layers[HALACHIC_LAYERS.RISHONIM]}
            type={AUTHORITY_TYPES.RISHON}
            expandedOpinions={expandedOpinions}
            onToggleExpand={toggleExpand}
            focusedOpinion={focusedOpinion}
            onOpinionClick={onOpinionClick}
            educationalMode={educationalMode}
          />
        )}

        {/* Psak Layer */}
        {chain.layers[HALACHIC_LAYERS.PSAK]?.psak && (
          <PsakCard 
            psak={chain.layers[HALACHIC_LAYERS.PSAK].psak}
            type={AUTHORITY_TYPES.ACHRON}
          />
        )}
      </div>
    </div>
  );
};

/**
 * Legend item component
 */
const LegendItem = ({ color, label }) => (
  <div className="legend-item">
    <span className="legend-dot" style={{ backgroundColor: color }} />
    <span className="legend-label">{label}</span>
  </div>
);

/**
 * Timeline section component
 */
const TimelineSection = ({ 
  title, 
  hebrewTitle, 
  layer, 
  type,
  expandedOpinions,
  onToggleExpand,
  focusedOpinion,
  onOpinionClick,
  educationalMode
}) => {
  const color = type === 'analysis' ? '#6b7280' : AUTHORITY_COLORS[type];

  return (
    <div className="timeline-section" style={{ '--section-color': color }}>
      <div className="section-header">
        <div className="section-line" style={{ backgroundColor: color }} />
        <div className="section-title">
          <span className="hebrew">{hebrewTitle}</span>
          <span className="english">{title}</span>
        </div>
      </div>

      <div className="section-content">
        {type === 'analysis' ? (
          // Gemara analysis cards
          layer.analysis.map((analysis, index) => (
            <AnalysisCard 
              key={index}
              analysis={analysis}
              index={index}
            />
          ))
        ) : type === AUTHORITY_TYPES.RISHON ? (
          // Rishonim decision cards
          layer.decisions.map((decision, index) => (
            <RishonCard
              key={index}
              decision={decision}
              isExpanded={expandedOpinions.has(decision.authority)}
              onToggle={() => onToggleExpand(decision.authority)}
              isFocused={focusedOpinion?.authority === decision.authority}
              onClick={() => onOpinionClick?.(decision)}
            />
          ))
        ) : (
          // Mishnah opinion cards
          layer.opinions?.map((opinion, index) => (
            <OpinionCard
              key={index}
              opinion={opinion}
              isExpanded={expandedOpinions.has(opinion.authority)}
              onToggle={() => onToggleExpand(opinion.authority)}
              isFocused={focusedOpinion?.authority === opinion.authority}
              onClick={() => onOpinionClick?.(opinion)}
              showStatus={educationalMode}
            />
          ))
        )}
      </div>
    </div>
  );
};

/**
 * Opinion card for Tannaim
 */
const OpinionCard = ({ opinion, isExpanded, onToggle, isFocused, onClick, showStatus }) => {
  const status = getOpinionStatus(opinion);
  
  return (
    <div 
      className={`opinion-card ${isFocused ? 'focused' : ''} status-${status}`}
      onClick={onClick}
    >
      <div className="opinion-header">
        <div className="opinion-authority">
          <span className="authority-hebrew">{opinion.authority}</span>
          <StatusBadge status={status} show={showStatus} />
        </div>
        <button 
          className="expand-btn"
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
        >
          {isExpanded ? '−' : '+'}
        </button>
      </div>

      <div className="opinion-ruling">
        {opinion.ruling}
      </div>

      {isExpanded && (
        <div className="opinion-details">
          {opinion.reasoning && (
            <div className="detail-row">
              <span className="detail-label">Reasoning:</span>
              <span className="detail-value">{opinion.reasoning}</span>
            </div>
          )}
          {opinion.rejectedBy?.length > 0 && (
            <div className="detail-row">
              <span className="detail-label">Rejected by:</span>
              <span className="detail-value">{opinion.rejectedBy.join(', ')}</span>
            </div>
          )}
          {opinion.supportedBy?.length > 0 && (
            <div className="detail-row">
              <span className="detail-label">Supported by:</span>
              <span className="detail-value">{opinion.supportedBy.join(', ')}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Rishon card component
 */
const RishonCard = ({ decision, isExpanded, onToggle, isFocused, onClick }) => (
  <div 
    className={`rishon-card ${isFocused ? 'focused' : ''}`}
    onClick={onClick}
  >
    <div className="rishon-header">
      <div className="rishon-authority">
        <span className="hebrew">{decision.hebrewName}</span>
        <span className="english">{decision.authority}</span>
      </div>
      <div className="rishon-ruling">{decision.ruling}</div>
      <button 
        className="expand-btn"
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
      >
        {isExpanded ? '−' : '+'}
      </button>
    </div>

    {isExpanded && (
      <div className="rishon-details">
        <div className="detail-row">
          <span className="detail-label">Reasoning:</span>
          <span className="detail-value">{decision.reasoning}</span>
        </div>
        {decision.basedOn?.length > 0 && (
          <div className="detail-row">
            <span className="detail-label">Based on:</span>
            <span className="detail-value">{decision.basedOn.join(', ')}</span>
          </div>
        )}
        <div className="detail-row">
          <span className="detail-label">Source:</span>
          <span className="detail-value source-ref">{decision.sourceRef}</span>
        </div>
      </div>
    )}
  </div>
);

/**
 * Analysis card for Gemara
 */
const AnalysisCard = ({ analysis, index }) => (
  <div className="analysis-card">
    <div className="analysis-number">{index + 1}</div>
    <div className="analysis-content">
      {analysis.question && (
        <div className="analysis-question">
          <span className="label">Q:</span>
          {analysis.question}
        </div>
      )}
      {analysis.resolutions?.length > 0 && (
        <div className="analysis-resolution">
          <span className="label">A:</span>
          {analysis.resolutions[0]}
        </div>
      )}
    </div>
  </div>
);

/**
 * Psak card for final ruling
 */
const PsakCard = ({ psak, type }) => {
  const color = AUTHORITY_COLORS[type];
  
  return (
    <div className="psak-card" style={{ '--psak-color': color }}>
      <div className="psak-header">
        <span className="psak-title">Final Psak</span>
        <span className="psak-source">{psak.source}</span>
      </div>
      
      <div className="psak-ruling">
        {psak.ruling}
      </div>

      <div className="psak-details">
        <div className="majority-indicator">
          <span className="majority-label">Majority:</span>
          <span className="majority-count">
            {psak.majorityCount?.for || 0} / {psak.majorityCount?.for + psak.majorityCount?.against || 0}
          </span>
        </div>
        
        {psak.minorityOpinion && (
          <div className="minority-opinion">
            <span className="minority-label">Minority view:</span>
            <span className="minority-value">{psak.minorityOpinion}</span>
          </div>
        )}

        {psak.location && (
          <div className="psak-location">
            {psak.hebrewLocation} {psak.location}
          </div>
        )}
      </div>

      {psak.isDisputed && (
        <div className="disputed-badge">
          Valid Machloket
        </div>
      )}
    </div>
  );
};

/**
 * Status badge component
 */
const StatusBadge = ({ status, show }) => {
  if (!show) return null;
  
  const badges = {
    accepted: { text: 'Accepted', class: 'accepted' },
    rejected: { text: 'Rejected', class: 'rejected' },
    minority: { text: 'Minority', class: 'minority' },
    unknown: { text: 'Unknown', class: 'unknown' }
  };
  
  const badge = badges[status] || badges.unknown;
  
  return (
    <span className={`status-badge ${badge.class}`}>
      {badge.text}
    </span>
  );
};

/**
 * Collect authorities by type from chain
 */
const collectAuthoritiesByType = (chain) => {
  const byType = {};
  
  Object.values(chain.layers).forEach(layer => {
    if (layer.opinions) {
      layer.opinions.forEach(op => {
        if (!byType[op.authorityType]) {
          byType[op.authorityType] = [];
        }
        if (!byType[op.authorityType].includes(op.authority)) {
          byType[op.authorityType].push(op.authority);
        }
      });
    }
    
    if (layer.decisions) {
      layer.decisions.forEach(dec => {
        if (!byType[dec.type]) {
          byType[dec.type] = [];
        }
        if (!byType[dec.type].includes(dec.authority)) {
          byType[dec.type].push(dec.authority);
        }
      });
    }
  });
  
  return byType;
};

/**
 * Get status of an opinion
 */
const getOpinionStatus = (opinion) => {
  if (opinion.isAccepted) return 'accepted';
  if (opinion.rejectedBy?.length > 0) return 'rejected';
  if (opinion.supportedBy?.length > 0 && !opinion.isAccepted) return 'minority';
  return 'unknown';
};

OpinionTimeline.propTypes = {
  chain: PropTypes.object,
  focusedOpinion: PropTypes.object,
  onOpinionClick: PropTypes.func,
  educationalMode: PropTypes.bool
};

export default OpinionTimeline;
