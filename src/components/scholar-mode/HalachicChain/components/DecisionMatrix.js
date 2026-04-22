/**
 * DecisionMatrix Component
 *
 * Multi-layer decision visualization showing:
 * - Rishonim voting grid with Beit Yosef 3-pillar analysis
 * - Acharonim support mapping (who supports Mechaber vs Rema)
 * - Tradition split visualization
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { formatMajorityResult, PRIMARY_DECISORS } from '../utils/majorityCalculator';
import './DecisionMatrix.css';

const DecisionMatrix = ({
  decisions,
  majority,
  acharonimDecisions,
  psak,
  compact = false
}) => {
  const [activeTab, setActiveTab] = useState('rishonim');

  if (!decisions || decisions.length === 0) {
    return (
      <div className="decision-matrix-empty">
        <span className="empty-text">אין הכרעות זמינות</span>
      </div>
    );
  }

  const formattedMajority = formatMajorityResult(majority);

  return (
    <div className={`decision-matrix ${compact ? 'compact' : ''}`} dir="rtl">
      {/* Tab selector */}
      <div className="matrix-tabs">
        <button
          className={`matrix-tab ${activeTab === 'rishonim' ? 'active' : ''}`}
          onClick={() => setActiveTab('rishonim')}
        >
          ראשונים ({decisions.length})
        </button>
        {acharonimDecisions?.length > 0 && (
          <button
            className={`matrix-tab ${activeTab === 'acharonim' ? 'active' : ''}`}
            onClick={() => setActiveTab('acharonim')}
          >
            אחרונים ({acharonimDecisions.length})
          </button>
        )}
        {psak && (
          <button
            className={`matrix-tab ${activeTab === 'traditions' ? 'active' : ''}`}
            onClick={() => setActiveTab('traditions')}
          >
            מסורות
          </button>
        )}
      </div>

      {/* Rishonim Matrix */}
      {activeTab === 'rishonim' && (
        <RishonimMatrix
          decisions={decisions}
          majority={majority}
          formattedMajority={formattedMajority}
          compact={compact}
        />
      )}

      {/* Acharonim Matrix */}
      {activeTab === 'acharonim' && acharonimDecisions && (
        <AcharonimMatrix decisions={acharonimDecisions} />
      )}

      {/* Tradition Split */}
      {activeTab === 'traditions' && psak && (
        <TraditionMatrix psak={psak} acharonim={acharonimDecisions} />
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// Rishonim Matrix (original + enhanced)
// ═══════════════════════════════════════════════════════════

const RishonimMatrix = ({ decisions, majority, formattedMajority, compact }) => {
  const groupedDecisions = decisions.reduce((acc, d) => {
    const ruling = d.ruling || 'unknown';
    if (!acc[ruling]) acc[ruling] = [];
    acc[ruling].push(d);
    return acc;
  }, {});
  const rulings = Object.keys(groupedDecisions).sort();

  return (
    <>
      <div className="matrix-header">
        <h3 className="matrix-title">טבלת הכרעות הראשונים</h3>
        <div className={`majority-summary ${formattedMajority.color}`}>
          <span className="majority-icon">{formattedMajority.icon}</span>
          <span className="majority-text">{formattedMajority.text}</span>
        </div>
      </div>

      {/* 3-Pillar Visual */}
      <div className="three-pillars">
        <div className="pillar-title">שלושת עמודי ההוראה</div>
        <div className="pillar-row">
          {PRIMARY_DECISORS.map(name => {
            const decision = decisions.find(d => d.authority === name);
            return (
              <div key={name} className={`pillar ${decision ? 'has-vote' : 'no-vote'}`}>
                <span className="pillar-name">{name}</span>
                <span className="pillar-hebrew">
                  {decision?.hebrewName || ''}
                </span>
                <span className={`pillar-vote ${decision?.ruling === majority?.ruling ? 'agrees' : 'disagrees'}`}>
                  {decision?.ruling || '—'}
                </span>
              </div>
            );
          })}
        </div>
        <div className="pillar-result">
          {majority?.primaryDecisors?.agree || 0}/3 מסכימים עם הרוב
        </div>
      </div>

      {!compact && (
        <div className="matrix-grid">
          {rulings.map((ruling, i) => (
            <RulingGroup
              key={ruling}
              ruling={ruling}
              decisions={groupedDecisions[ruling]}
              isMajority={ruling === majority?.ruling}
              index={i}
            />
          ))}
        </div>
      )}

      {/* Minority positions */}
      {majority?.minorityPositions?.length > 0 && (
        <div className="matrix-minorities">
          <h4 className="minorities-title">דעות מיעוט</h4>
          {majority.minorityPositions.map((pos, i) => (
            <div key={i} className={`minority-row ${pos.isSignificant ? 'significant' : ''}`}>
              <span className="minority-ruling">{pos.ruling}</span>
              <span className="minority-count">({pos.count})</span>
              <span className="minority-names">
                {pos.authorities.map(a => a.hebrewName).join(', ')}
              </span>
              {pos.isSignificant && <span className="significant-tag">משמעותי</span>}
            </div>
          ))}
        </div>
      )}

      <div className="matrix-stats">
        <div className="stat-row primary-decisors">
          <span className="stat-label">עמודי הוראה (רי"ף/רמב"ם/ר"אש):</span>
          <span className="stat-value">
            {majority?.primaryDecisors?.agree || 0} / {majority?.primaryDecisors?.total || 3} מסכימים
          </span>
        </div>
        <div className="stat-row total-decisors">
          <span className="stat-label">סה"כ:</span>
          <span className="stat-value">
            {majority?.allDecisors?.agree || 0} / {majority?.allDecisors?.total || decisions.length}
          </span>
        </div>
      </div>
    </>
  );
};

// ═══════════════════════════════════════════════════════════
// Acharonim Matrix
// ═══════════════════════════════════════════════════════════

const AcharonimMatrix = ({ decisions }) => {
  const byTradition = {
    ashkenazi: decisions.filter(d => d.tradition === 'ashkenazi'),
    sephardic: decisions.filter(d => d.tradition === 'sephardic'),
    both: decisions.filter(d => d.tradition === 'both' || !d.tradition)
  };

  return (
    <>
      <div className="matrix-header">
        <h3 className="matrix-title">אחרונים לפי מסורת</h3>
      </div>

      <div className="tradition-grid">
        {/* Ashkenazi */}
        <div className="tradition-group ashkenazi-group">
          <div className="tradition-group-header">אשכנז ({byTradition.ashkenazi.length})</div>
          {byTradition.ashkenazi.map((d, i) => (
            <div key={i} className="acharon-chip">
              <span className="chip-hebrew">{d.hebrewName}</span>
              <span className="chip-ruling">{d.ruling}</span>
            </div>
          ))}
        </div>

        {/* Shared */}
        <div className="tradition-group shared-group">
          <div className="tradition-group-header">משותף ({byTradition.both.length})</div>
          {byTradition.both.map((d, i) => (
            <div key={i} className="acharon-chip">
              <span className="chip-hebrew">{d.hebrewName}</span>
              <span className="chip-ruling">{d.ruling}</span>
            </div>
          ))}
        </div>

        {/* Sephardic */}
        <div className="tradition-group sephardic-group">
          <div className="tradition-group-header">ספרד ({byTradition.sephardic.length})</div>
          {byTradition.sephardic.map((d, i) => (
            <div key={i} className="acharon-chip">
              <span className="chip-hebrew">{d.hebrewName}</span>
              <span className="chip-ruling">{d.ruling}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

// ═══════════════════════════════════════════════════════════
// Tradition Split Matrix
// ═══════════════════════════════════════════════════════════

const TraditionMatrix = ({ psak, acharonim }) => (
  <>
    <div className="matrix-header">
      <h3 className="matrix-title">
        {psak.traditionsAgree ? 'מסורת אחידה' : 'השוואת מסורות'}
      </h3>
    </div>

    <div className="tradition-comparison-matrix">
      <div className="tcm-column">
        <div className="tcm-header sephardic-bg">מחבר (ספרדי)</div>
        <div className="tcm-ruling">{psak.mechaber?.ruling || psak.ruling}</div>
        {psak.mechaber?.supportedBy?.length > 0 && (
          <div className="tcm-supporters">
            {psak.mechaber.supportedBy.map((s, i) => (
              <span key={i} className="tcm-chip">{s}</span>
            ))}
          </div>
        )}
      </div>

      <div className="tcm-vs">
        {psak.traditionsAgree ? '=' : 'vs'}
      </div>

      <div className="tcm-column">
        <div className="tcm-header ashkenazi-bg">רמ"א (אשכנזי)</div>
        <div className="tcm-ruling">{psak.rema?.ruling || psak.mechaber?.ruling || 'agrees'}</div>
        {psak.rema?.supportedBy?.length > 0 && (
          <div className="tcm-supporters">
            {psak.rema.supportedBy.map((s, i) => (
              <span key={i} className="tcm-chip">{s}</span>
            ))}
          </div>
        )}
      </div>
    </div>

    {psak.halachaLemaaseh && (
      <div className="tcm-lemaaseh">
        <span className="tcm-lemaaseh-label">הלכה למעשה:</span>
        <span className="tcm-lemaaseh-text">{psak.halachaLemaaseh}</span>
      </div>
    )}
  </>
);

// ═══════════════════════════════════════════════════════════
// Shared sub-components
// ═══════════════════════════════════════════════════════════

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
        <span className="ruling-count">{decisions.length} פוסקים</span>
        {isMajority && <span className="majority-badge">רוב</span>}
      </div>
      <div className="ruling-authorities">
        {decisions.map((d, i) => (
          <AuthorityChip
            key={i}
            decision={d}
            isPrimary={PRIMARY_DECISORS.includes(d.authority)}
          />
        ))}
      </div>
    </div>
  );
};

const AuthorityChip = ({ decision, isPrimary }) => (
  <div className={`authority-chip ${isPrimary ? 'primary' : ''}`}>
    <span className="chip-hebrew">{decision.hebrewName}</span>
    {isPrimary && <span className="chip-badge">עמוד</span>}
  </div>
);

DecisionMatrix.propTypes = {
  decisions: PropTypes.array,
  majority: PropTypes.object,
  acharonimDecisions: PropTypes.array,
  psak: PropTypes.object,
  compact: PropTypes.bool
};

export default DecisionMatrix;
