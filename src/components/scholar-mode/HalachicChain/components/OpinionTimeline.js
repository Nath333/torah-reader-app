/**
 * OpinionTimeline Component
 *
 * Full 7-layer vertical timeline showing the שושלת הוראה:
 * משנה → גמרא → ראשונים → טור/בית יוסף → שולחן ערוך (+רמא) → אחרונים → פוסקים
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { HALACHIC_LAYERS, AUTHORITY_COLORS, AUTHORITY_TYPES } from '../types';
import './OpinionTimeline.css';

const OpinionTimeline = ({
  chain,
  focusedOpinion,
  onOpinionClick,
  educationalMode = true,
  klaleiPesika = null
}) => {
  const [expandedOpinions, setExpandedOpinions] = useState(new Set());

  if (!chain?.layers) {
    return <div className="opinion-timeline-empty">No halachic chain data</div>;
  }

  const toggleExpand = (key) => {
    setExpandedOpinions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) newSet.delete(key);
      else newSet.add(key);
      return newSet;
    });
  };

  return (
    <div className="opinion-timeline" dir="rtl">
      <div className="timeline-header">
        <h3 className="timeline-title">ציר זמן — שושלת הוראה</h3>
        <div className="timeline-legend">
          <LegendItem color={AUTHORITY_COLORS[AUTHORITY_TYPES.TANNA]} label="תנאים" />
          <LegendItem color={AUTHORITY_COLORS[AUTHORITY_TYPES.RISHON]} label="ראשונים" />
          <LegendItem color={AUTHORITY_COLORS[AUTHORITY_TYPES.MECHABER]} label="טור" />
          <LegendItem color={AUTHORITY_COLORS[AUTHORITY_TYPES.ACHRON]} label="אחרונים" />
          <LegendItem color={AUTHORITY_COLORS[AUTHORITY_TYPES.POSEK]} label="פוסקים" />
        </div>
      </div>

      {/* Educational: Klalei Pesika inline notes */}
      {educationalMode && klaleiPesika?.applicableRules?.length > 0 && (
        <div className="klalei-pesika-inline">
          {klaleiPesika.applicableRules.slice(0, 3).map((rule, i) => (
            <div key={i} className={`kp-inline-note kp-layer-${rule.layer}`}>
              <span className="kp-inline-rule">{rule.rule}</span>
              <span className="kp-inline-english">{rule.english}</span>
            </div>
          ))}
        </div>
      )}

      <div className="timeline-content">
        {/* Layer 1: Mishnah */}
        {chain.layers[HALACHIC_LAYERS.MISHNAH]?.opinions?.length > 0 && (
          <TimelineSection
            title="דעות התנאים" hebrewTitle="משנה"
            layer={chain.layers[HALACHIC_LAYERS.MISHNAH]}
            type={AUTHORITY_TYPES.TANNA}
            expandedOpinions={expandedOpinions}
            onToggleExpand={toggleExpand}
            focusedOpinion={focusedOpinion}
            onOpinionClick={onOpinionClick}
            educationalMode={educationalMode}
          />
        )}

        {/* Layer 2: Gemara */}
        {chain.layers[HALACHIC_LAYERS.GEMARA]?.analysis?.length > 0 && (
          <TimelineSection
            title="שקלא וטריא" hebrewTitle="גמרא"
            layer={chain.layers[HALACHIC_LAYERS.GEMARA]}
            type="analysis"
            expandedOpinions={expandedOpinions}
            onToggleExpand={toggleExpand}
            focusedOpinion={focusedOpinion}
            onOpinionClick={onOpinionClick}
            educationalMode={educationalMode}
          />
        )}

        {/* Layer 3: Rishonim */}
        {chain.layers[HALACHIC_LAYERS.RISHONIM]?.decisions?.length > 0 && (
          <TimelineSection
            title="הכרעות הראשונים" hebrewTitle="ראשונים"
            layer={chain.layers[HALACHIC_LAYERS.RISHONIM]}
            type={AUTHORITY_TYPES.RISHON}
            expandedOpinions={expandedOpinions}
            onToggleExpand={toggleExpand}
            focusedOpinion={focusedOpinion}
            onOpinionClick={onOpinionClick}
            educationalMode={educationalMode}
          />
        )}

        {/* Layer 4: Tur / Beit Yosef */}
        {chain.layers[HALACHIC_LAYERS.TUR]?.turAnalysis && (
          <TurBeitYosefSection
            turAnalysis={chain.layers[HALACHIC_LAYERS.TUR].turAnalysis}
            isExpanded={expandedOpinions.has('tur-section')}
            onToggle={() => toggleExpand('tur-section')}
          />
        )}

        {/* Layer 5: Psak — Shulchan Aruch / Rema with tradition comparison */}
        {chain.layers[HALACHIC_LAYERS.PSAK]?.psak && (
          <PsakCard psak={chain.layers[HALACHIC_LAYERS.PSAK].psak} />
        )}

        {/* Layer 6: Acharonim */}
        {chain.layers[HALACHIC_LAYERS.ACHARONIM]?.decisions?.length > 0 && (
          <TimelineSection
            title="פרשני השולחן ערוך" hebrewTitle="אחרונים"
            layer={chain.layers[HALACHIC_LAYERS.ACHARONIM]}
            type={AUTHORITY_TYPES.ACHRON}
            expandedOpinions={expandedOpinions}
            onToggleExpand={toggleExpand}
            focusedOpinion={focusedOpinion}
            onOpinionClick={onOpinionClick}
            educationalMode={educationalMode}
          />
        )}

        {/* Layer 7: Modern Poskim */}
        {chain.layers[HALACHIC_LAYERS.POSKIM]?.decisions?.length > 0 && (
          <TimelineSection
            title="פוסקי זמננו" hebrewTitle="פוסקים"
            layer={chain.layers[HALACHIC_LAYERS.POSKIM]}
            type={AUTHORITY_TYPES.POSEK}
            expandedOpinions={expandedOpinions}
            onToggleExpand={toggleExpand}
            focusedOpinion={focusedOpinion}
            onOpinionClick={onOpinionClick}
            educationalMode={educationalMode}
          />
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// Shared components
// ═══════════════════════════════════════════════════════════

const LegendItem = ({ color, label }) => (
  <div className="legend-item">
    <span className="legend-dot" style={{ backgroundColor: color }} />
    <span className="legend-label">{label}</span>
  </div>
);

const TimelineSection = ({
  title, hebrewTitle, layer, type,
  expandedOpinions, onToggleExpand,
  focusedOpinion, onOpinionClick, educationalMode
}) => {
  const color = type === 'analysis' ? '#6b7280' : (AUTHORITY_COLORS[type] || '#6b7280');

  const renderCards = () => {
    if (type === 'analysis') {
      return layer.analysis.map((analysis, i) => (
        <AnalysisCard key={i} analysis={analysis} index={i} />
      ));
    }
    if (type === AUTHORITY_TYPES.RISHON) {
      return layer.decisions.map((d, i) => (
        <RishonCard key={i} decision={d}
          isExpanded={expandedOpinions.has(d.authority)}
          onToggle={() => onToggleExpand(d.authority)}
          isFocused={focusedOpinion?.authority === d.authority}
          onClick={() => onOpinionClick?.(d)}
        />
      ));
    }
    if (type === AUTHORITY_TYPES.ACHRON) {
      return layer.decisions?.map((d, i) => (
        <AcharonCard key={i} decision={d}
          isExpanded={expandedOpinions.has(d.authority)}
          onToggle={() => onToggleExpand(d.authority)}
          isFocused={focusedOpinion?.authority === d.authority}
          onClick={() => onOpinionClick?.(d)}
        />
      ));
    }
    if (type === AUTHORITY_TYPES.POSEK) {
      return layer.decisions?.map((d, i) => (
        <PosekCard key={i} decision={d}
          isExpanded={expandedOpinions.has(d.authority)}
          onToggle={() => onToggleExpand(d.authority)}
          isFocused={focusedOpinion?.authority === d.authority}
          onClick={() => onOpinionClick?.(d)}
        />
      ));
    }
    // Default: Mishnah opinions
    return layer.opinions?.map((op, i) => (
      <OpinionCard key={i} opinion={op}
        isExpanded={expandedOpinions.has(op.authority)}
        onToggle={() => onToggleExpand(op.authority)}
        isFocused={focusedOpinion?.authority === op.authority}
        onClick={() => onOpinionClick?.(op)}
        showStatus={educationalMode}
      />
    ));
  };

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
        {renderCards()}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// Layer 1: Mishnah — Opinion cards
// ═══════════════════════════════════════════════════════════

const OpinionCard = ({ opinion, isExpanded, onToggle, isFocused, onClick, showStatus }) => {
  const status = getOpinionStatus(opinion);
  return (
    <div className={`opinion-card ${isFocused ? 'focused' : ''} status-${status}`} onClick={onClick}>
      <div className="opinion-header">
        <div className="opinion-authority">
          <span className="authority-hebrew">{opinion.authority}</span>
          <StatusBadge status={status} show={showStatus} />
        </div>
        <button className="expand-btn" onClick={(e) => { e.stopPropagation(); onToggle(); }}>
          {isExpanded ? '\u2212' : '+'}
        </button>
      </div>
      <div className="opinion-ruling">{opinion.ruling}</div>
      {isExpanded && (
        <div className="opinion-details">
          {opinion.reasoning && (
            <div className="detail-row">
              <span className="detail-label">נימוק:</span>
              <span className="detail-value">{opinion.reasoning}</span>
            </div>
          )}
          {opinion.rejectedBy?.length > 0 && (
            <div className="detail-row">
              <span className="detail-label">נדחה ע"י:</span>
              <span className="detail-value">{opinion.rejectedBy.join(', ')}</span>
            </div>
          )}
          {opinion.supportedBy?.length > 0 && (
            <div className="detail-row">
              <span className="detail-label">נתמך ע"י:</span>
              <span className="detail-value">{opinion.supportedBy.join(', ')}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// Layer 2: Gemara — Analysis cards
// ═══════════════════════════════════════════════════════════

const AnalysisCard = ({ analysis, index }) => (
  <div className="analysis-card">
    <div className="analysis-number">{index + 1}</div>
    <div className="analysis-content">
      {analysis.question && (
        <div className="analysis-question">
          <span className="label">Q:</span>{analysis.question}
        </div>
      )}
      {analysis.resolutions?.length > 0 && (
        <div className="analysis-resolution">
          <span className="label">A:</span>{analysis.resolutions[0]}
        </div>
      )}
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════
// Layer 3: Rishonim — Decision cards
// ═══════════════════════════════════════════════════════════

const RishonCard = ({ decision, isExpanded, onToggle, isFocused, onClick }) => (
  <div className={`rishon-card ${isFocused ? 'focused' : ''}`} onClick={onClick}>
    <div className="rishon-header">
      <div className="rishon-authority">
        <span className="hebrew">{decision.hebrewName}</span>
        <span className="english">{decision.authority}</span>
      </div>
      <div className="rishon-ruling">{decision.ruling}</div>
      <button className="expand-btn" onClick={(e) => { e.stopPropagation(); onToggle(); }}>
        {isExpanded ? '\u2212' : '+'}
      </button>
    </div>
    {isExpanded && (
      <div className="rishon-details">
        <div className="detail-row">
          <span className="detail-label">נימוק:</span>
          <span className="detail-value">{decision.reasoning}</span>
        </div>
        {decision.basedOn?.length > 0 && (
          <div className="detail-row">
            <span className="detail-label">מבוסס על:</span>
            <span className="detail-value">{decision.basedOn.join(', ')}</span>
          </div>
        )}
        <div className="detail-row">
          <span className="detail-label">מקור:</span>
          <span className="detail-value source-ref">{decision.sourceRef}</span>
        </div>
      </div>
    )}
  </div>
);

// ═══════════════════════════════════════════════════════════
// Layer 4: Tur / Beit Yosef — Bridge section
// ═══════════════════════════════════════════════════════════

const TurBeitYosefSection = ({ turAnalysis, isExpanded, onToggle }) => {
  const color = AUTHORITY_COLORS[AUTHORITY_TYPES.MECHABER];

  return (
    <div className="timeline-section tur-section" style={{ '--section-color': color }}>
      <div className="section-header">
        <div className="section-line" style={{ backgroundColor: color }} />
        <div className="section-title">
          <span className="hebrew">טור / בית יוסף</span>
          <span className="english">Tur / Beit Yosef</span>
        </div>
      </div>

      <div className="section-content">
        <div className="tur-card">
          {/* Tur Organization */}
          <div className="tur-header" onClick={onToggle}>
            <div className="tur-title-row">
              <span className="tur-icon">T</span>
              <div className="tur-title-text">
                <span className="tur-label-hebrew">טור</span>
                <span className="tur-label-english">
                  {turAnalysis.saSectionHebrew} ({turAnalysis.saSection})
                </span>
              </div>
            </div>
            <button className="expand-btn" onClick={(e) => { e.stopPropagation(); onToggle(); }}>
              {isExpanded ? '\u2212' : '+'}
            </button>
          </div>

          {turAnalysis.turOrganization && (
            <div className="tur-organization">
              {turAnalysis.turOrganization}
            </div>
          )}

          {/* Rishonim as cited by Tur */}
          {turAnalysis.turSummary?.length > 0 && (
            <div className="tur-rishonim-summary">
              <span className="summary-label">ראשונים שהובאו בטור:</span>
              <div className="tur-cited-list">
                {turAnalysis.turSummary.map((r, i) => (
                  <span key={i} className="tur-cited-rishon">
                    {r.hebrewName}: <em>{r.position}</em>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ניתוח הבית יוסף */}
          {isExpanded && turAnalysis.beitYosefAnalysis && (
            <div className="beit-yosef-section">
              <div className="by-header">
                <span className="by-icon">BY</span>
                <span className="by-label">ניתוח הבית יוסף</span>
              </div>
              <div className="by-analysis">
                {turAnalysis.beitYosefAnalysis}
              </div>
              {turAnalysis.beitYosefRef && (
                <div className="by-ref source-ref">{turAnalysis.beitYosefRef}</div>
              )}
            </div>
          )}

          {isExpanded && turAnalysis.turRef && (
            <div className="tur-ref-row">
              <span className="detail-label">מקור בטור:</span>
              <span className="source-ref">{turAnalysis.turRef}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// Layer 5: Psak — Structured מחבר/Rema Comparison
// ═══════════════════════════════════════════════════════════

const PsakCard = ({ psak }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="timeline-section psak-section" style={{ '--section-color': '#eab308' }}>
      <div className="section-header">
        <div className="section-line" style={{ backgroundColor: '#eab308' }} />
        <div className="section-title">
          <span className="hebrew">שולחן ערוך</span>
          <span className="english">Shulchan Aruch</span>
        </div>
      </div>

      <div className="section-content">
        <div className="psak-card-v2">
          {/* Header */}
          <div className="psak-v2-header" onClick={() => setExpanded(!expanded)}>
            <span className="psak-v2-title">
              {psak.traditionsAgree ? 'פסק מוסכם' : 'השוואת מסורות'}
            </span>
            {psak.isDisputed && <span className="disputed-badge-v2">מחלוקת</span>}
            <button className="expand-btn" onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}>
              {expanded ? '\u2212' : '+'}
            </button>
          </div>

          {/* Two-column tradition comparison */}
          <div className={`tradition-comparison ${psak.traditionsAgree ? 'agreed' : 'divergent'}`}>
            {/* מחבר (ספרדי) column */}
            <div className="tradition-column mechaber-column">
              <div className="tradition-header sephardic">
                <span className="tradition-title">מחבר</span>
                <span className="tradition-subtitle">ספרדי</span>
              </div>
              <div className="tradition-ruling">
                {psak.mechaber?.ruling || psak.ruling || 'see text'}
              </div>
              {psak.mechaber?.text && expanded && (
                <div className="tradition-text">{psak.mechaber.text}</div>
              )}
              {psak.mechaber?.supportedBy?.length > 0 && (
                <div className="tradition-supporters">
                  <span className="supporters-label">נתמך ע"י:</span>
                  {psak.mechaber.supportedBy.map((s, i) => (
                    <span key={i} className="supporter-chip">{s}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="tradition-divider">
              <div className="divider-line" />
              <span className="divider-label">
                {psak.traditionsAgree ? '=' : 'vs'}
              </span>
              <div className="divider-line" />
            </div>

            {/* Rema (אשכנזי) column */}
            <div className="tradition-column rema-column">
              <div className="tradition-header ashkenazi">
                <span className="tradition-title">
                  {psak.rema ? 'Rema' : 'Rema'}
                </span>
                <span className="tradition-subtitle">אשכנזי</span>
              </div>
              <div className="tradition-ruling">
                {psak.rema?.ruling || psak.mechaber?.ruling || psak.ruling || 'agrees'}
              </div>
              {psak.rema?.text && expanded && (
                <div className="tradition-text">{psak.rema.text}</div>
              )}
              {psak.rema?.supportedBy?.length > 0 && (
                <div className="tradition-supporters">
                  <span className="supporters-label">נתמך ע"י:</span>
                  {psak.rema.supportedBy.map((s, i) => (
                    <span key={i} className="supporter-chip">{s}</span>
                  ))}
                </div>
              )}
              {!psak.rema && (
                <div className="tradition-note">אין הגה של הרמ"א — הולכים אחר המחבר</div>
              )}
            </div>
          </div>

          {/* Minority Positions */}
          {expanded && psak.minorityPositions?.length > 0 && (
            <div className="minority-positions">
              <span className="minority-title">דעות מיעוט:</span>
              {psak.minorityPositions.map((pos, i) => (
                <div key={i} className="minority-position-row">
                  <span className="minority-ruling-text">{pos.ruling}</span>
                  <span className="minority-authorities">
                    {pos.authorities?.map(a => a.hebrewName || a.name).join(', ')}
                  </span>
                  {pos.isSignificant && (
                    <span className="significant-badge">מיעוט משמעותי</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Halacha Lemaaseh */}
          {psak.halachaLemaaseh && (
            <div className="halacha-lemaaseh">
              <span className="lemaaseh-label">הלכה למעשה:</span>
              <span className="lemaaseh-text">{psak.halachaLemaaseh}</span>
            </div>
          )}

          {/* SA Location */}
          {psak.location && expanded && (
            <div className="psak-v2-location">
              {psak.hebrewLocation} &mdash; {psak.location}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// Layer 6: Acharonim — with tradition badges
// ═══════════════════════════════════════════════════════════

const AcharonCard = ({ decision, isExpanded, onToggle, isFocused, onClick }) => (
  <div className={`rishon-card acharon-card ${isFocused ? 'focused' : ''}`} onClick={onClick}>
    <div className="rishon-header">
      <div className="rishon-authority">
        <span className="hebrew">{decision.hebrewName}</span>
        <span className="english">{decision.authority}</span>
        {decision.tradition && decision.tradition !== 'both' && (
          <span className={`tradition-badge tradition-${decision.tradition}`}>
            {decision.tradition === 'ashkenazi' ? 'אשכנז' : 'ספרד'}
          </span>
        )}
      </div>
      <div className="rishon-ruling">{decision.ruling}</div>
      <button className="expand-btn" onClick={(e) => { e.stopPropagation(); onToggle(); }}>
        {isExpanded ? '\u2212' : '+'}
      </button>
    </div>
    {decision.saSection && (
      <div className="acharon-section-tag">{decision.saSection}</div>
    )}
    {isExpanded && (
      <div className="rishon-details">
        <div className="detail-row">
          <span className="detail-label">פירוש:</span>
          <span className="detail-value">{decision.reasoning}</span>
        </div>
        {decision.sourceRef && (
          <div className="detail-row">
            <span className="detail-label">מקור:</span>
            <span className="detail-value source-ref">{decision.sourceRef}</span>
          </div>
        )}
      </div>
    )}
  </div>
);

// ═══════════════════════════════════════════════════════════
// Layer 7: Modern Poskim — with era and tradition badges
// ═══════════════════════════════════════════════════════════

const PosekCard = ({ decision, isExpanded, onToggle, isFocused, onClick }) => (
  <div className={`rishon-card posek-card ${isFocused ? 'focused' : ''}`} onClick={onClick}>
    <div className="rishon-header">
      <div className="rishon-authority">
        <span className="hebrew">{decision.hebrewName}</span>
        <span className="english">{decision.authority}</span>
        <div className="posek-badges">
          {decision.tradition && decision.tradition !== 'both' && (
            <span className={`tradition-badge tradition-${decision.tradition}`}>
              {decision.tradition === 'ashkenazi' ? 'אשכנז' : 'ספרד'}
            </span>
          )}
          {decision.era && (
            <span className={`era-badge era-${decision.era}`}>
              {decision.era === 'contemporary' ? 'בן זמננו' : 'אחרון'}
            </span>
          )}
        </div>
      </div>
      <div className="rishon-ruling posek-ruling">{decision.ruling}</div>
      <button className="expand-btn" onClick={(e) => { e.stopPropagation(); onToggle(); }}>
        {isExpanded ? '\u2212' : '+'}
      </button>
    </div>
    {isExpanded && (
      <div className="rishon-details">
        <div className="detail-row">
          <span className="detail-label">פסיקה:</span>
          <span className="detail-value">{decision.reasoning}</span>
        </div>
        {decision.sourceRef && (
          <div className="detail-row">
            <span className="detail-label">מקור:</span>
            <span className="detail-value source-ref">{decision.sourceRef}</span>
          </div>
        )}
      </div>
    )}
  </div>
);

// ═══════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════

const StatusBadge = ({ status, show }) => {
  if (!show) return null;
  const badges = {
    accepted: { text: 'נפסק', class: 'accepted' },
    rejected: { text: 'נדחה', class: 'rejected' },
    minority: { text: 'מיעוט', class: 'minority' },
    unknown: { text: 'לא ידוע', class: 'unknown' }
  };
  const badge = badges[status] || badges.unknown;
  return <span className={`status-badge ${badge.class}`}>{badge.text}</span>;
};

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
