/**
 * DecisionMatrix Component
 * 
 * Visual matrix showing how Rishonim decided and the resulting majority.
 * Displays votes in a clear grid format with majority calculation.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { formatMajorityResult, PRIMARY_DECISORS } from '../utils/majorityCalculator';
import { AUTHORITY_COLORS, AUTHORITY_TYPES } from '../types';
import './DecisionMatrix.css';

const DecisionMatrix = ({ decisions, majority, compact = false }) => {
  if (!decisions || decisions.length === 0) {
    return (
      <div className="decision-matrix-empty">
        <span className="empty-icon">⚖️</span>
        <span className="empty-text">No Rishonim decisions available</span>
      </div>
    );
  }

  const formattedMajority = formatMajorityResult(majority);
  
  // Group decisions by ruling
  const groupedDecisions = decisions.reduce((acc, decision) => {
    const ruling = decision.ruling || 'unknown';
    if (!acc[ruling]) acc[ruling] = [];
    acc[ruling].push(decision);
    return acc;
  }, {});

  const rulings = Object.keys(groupedDecisions).sort();

  return (
    <div className={`decision-matrix ${compact ? 'compact' : ''}`}>
      <div className="matrix-header">
        <h3 className="matrix-title">Decision Matrix</h3>
        <div className={`majority-summary ${formattedMajority.color}`}>
          <span className="majority-icon">{formattedMajority.icon}</span>
          <span className="majority-text">{formattedMajority.text}</span>
        </div>
      </div>

      {!compact && (
        <div className="matrix-grid">
          {rulings.map((ruling, index) => (
            <RulingGroup 
              key={ruling}
              ruling={ruling}
              decisions={groupedDecisions[ruling]}
              isMajority={ruling === majority?.ruling}
              index={index}
            />
          ))}
        </div>
      )}

      <div className="matrix-stats">
        <div className="stat-row primary-decisors">
          <span className="stat-label">Primary Decisors (Rif/Rambam/Rosh):</span>
          <span className="stat-value">
            {majority?.primaryDecisors?.agree || 0} / {majority?.primaryDecisors?.total || 3} agree
          </span>
        </div>
        
        <div className="stat-row total-decisors">
          <span className="stat-label">Total:</span>
          <span className="stat-value">
            {majority?.allDecisors?.agree || 0} / {majority?.allDecisors?.total || decisions.length}
          </span>
        </div>
      </div>

      {!compact && majority?.breakdown && (
        <div className="matrix-breakdown">
          <h4 className="breakdown-title">Detailed Breakdown</h4>
          <div className="breakdown-list">
            {majority.breakdown.map((item, index) => (
              <BreakdownRow key={index} item={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Ruling group component
 */
const RulingGroup = ({ ruling, decisions, isMajority, index }) => {
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
  const color = colors[index % colors.length];
  
  return (
    <div 
      className={`ruling-group ${isMajority ? 'majority' : ''}`}
      style={{ '--group-color': color }}
    >
      <div className="ruling-header">
        <span className="ruling-name">{ruling}</span>
        <span className="ruling-count">{decisions.length} authorities</span>
        {isMajority && <span className="majority-badge">Majority</span>}
      </div>
      
      <div className="ruling-authorities">
        {decisions.map((decision, idx) => (
          <AuthorityChip 
            key={idx}
            decision={decision}
            isPrimary={PRIMARY_DECISORS.includes(decision.authority)}
          />
        ))}
      </div>
    </div>
  );
};

/**
 * Authority chip component
 */
const AuthorityChip = ({ decision, isPrimary }) => (
  <div className={`authority-chip ${isPrimary ? 'primary' : ''}`}>
    <span className="chip-hebrew">{decision.hebrewName}</span>
    {isPrimary && <span className="chip-badge">Primary</span>}
  </div>
);

/**
 * Breakdown row component
 */
const BreakdownRow = ({ item }) => (
  <div className={`breakdown-row ${item.isMajority ? 'majority' : ''}`}>
    <div className="breakdown-ruling">
      <span className="ruling-label">{item.ruling}</span>
      <span className="ruling-count">({item.count})</span>
    </div>
    <div className="breakdown-authorities">
      {item.authorities.map((auth, idx) => (
        <span 
          key={idx} 
          className={`breakdown-authority ${auth.isPrimary ? 'primary' : ''}`}
        >
          {auth.hebrewName}
        </span>
      ))}
    </div>
  </div>
);

DecisionMatrix.propTypes = {
  decisions: PropTypes.arrayOf(PropTypes.shape({
    authority: PropTypes.string,
    hebrewName: PropTypes.string,
    ruling: PropTypes.string,
    sourceRef: PropTypes.string
  })),
  majority: PropTypes.object,
  compact: PropTypes.bool
};

export default DecisionMatrix;
