/**
 * RabbiTooltip - Displays rabbi information on hover
 */
import React, { useState, useCallback } from 'react';
import {
  lookupRabbi,
  getRabbiRelationships,
  getTeacherChain
} from '../../services/scholarly/namedEntityService';

const RabbiTooltip = React.memo(({ rabbiName, children }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipData, setTooltipData] = useState(null);
  const [relationships, setRelationships] = useState(null);
  const [teacherChain, setTeacherChain] = useState(null);

  const handleMouseEnter = useCallback(() => {
    if (!tooltipData) {
      setTooltipData(lookupRabbi(rabbiName));
      setRelationships(getRabbiRelationships(rabbiName));
      setTeacherChain(getTeacherChain(rabbiName));
    }
    setShowTooltip(true);
  }, [rabbiName, tooltipData]);

  const handleMouseLeave = useCallback(() => {
    setShowTooltip(false);
  }, []);

  return (
    <div
      className="rabbi-tooltip-wrapper"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {showTooltip && tooltipData && (
        <div className="rabbi-tooltip">
          <div className="tooltip-header">
            <span className="tooltip-name">{tooltipData.name}</span>
            {tooltipData.fullName && tooltipData.fullName !== tooltipData.name && (
              <span className="tooltip-fullname">{tooltipData.fullName}</span>
            )}
          </div>

          {tooltipData.note && (
            <div className="tooltip-note">{tooltipData.note}</div>
          )}

          <div className="tooltip-meta">
            {tooltipData.period && (
              <span className={`tooltip-period period-${tooltipData.period}`}>
                {tooltipData.period === 'tanna' ? 'Tanna' : 'Amora'}
              </span>
            )}
            {tooltipData.generation && (
              <span className="tooltip-gen">Gen. {tooltipData.generation}</span>
            )}
            {tooltipData.academy && (
              <span className="tooltip-academy">{tooltipData.academy}</span>
            )}
          </div>

          {tooltipData.teachers && tooltipData.teachers.length > 0 && (
            <div className="tooltip-section">
              <span className="tooltip-label">Teachers:</span>
              <span className="tooltip-value" dir="rtl">{tooltipData.teachers.join(', ')}</span>
            </div>
          )}

          {tooltipData.students && tooltipData.students.length > 0 && (
            <div className="tooltip-section">
              <span className="tooltip-label">Students:</span>
              <span className="tooltip-value" dir="rtl">{tooltipData.students.join(', ')}</span>
            </div>
          )}

          {tooltipData.disputesWith && tooltipData.disputesWith.length > 0 && (
            <div className="tooltip-section">
              <span className="tooltip-label">Disputes with:</span>
              <span className="tooltip-value" dir="rtl">{tooltipData.disputesWith.join(', ')}</span>
            </div>
          )}

          {tooltipData.methodology && (
            <div className="tooltip-section">
              <span className="tooltip-label">Method:</span>
              <span className="tooltip-value">{tooltipData.methodology}</span>
            </div>
          )}

          {tooltipData.famousRulings && tooltipData.famousRulings.length > 0 && (
            <div className="tooltip-section">
              <span className="tooltip-label">Known for:</span>
              <span className="tooltip-value">{tooltipData.famousRulings.join(', ')}</span>
            </div>
          )}

          {relationships?.chavruta && (
            <div className="tooltip-section">
              <span className="tooltip-label">Chavruta:</span>
              <span className="tooltip-value" dir="rtl">
                {relationships.chavruta.hebrew}
                {relationships.chavruta.english && relationships.chavruta.english !== relationships.chavruta.hebrew && (
                  <span className="tooltip-value-en"> ({relationships.chavruta.english})</span>
                )}
              </span>
            </div>
          )}

          {teacherChain && teacherChain.length > 1 && (
            <div className="tooltip-section tooltip-chain">
              <span className="tooltip-label">Transmission:</span>
              <span className="tooltip-value tooltip-chain-value" dir="rtl">
                {teacherChain.map((r, i) => (
                  <React.Fragment key={r.hebrew || i}>
                    {i > 0 && <span className="tooltip-chain-arrow"> → </span>}
                    <span className="tooltip-chain-name">{r.hebrew}</span>
                  </React.Fragment>
                ))}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default RabbiTooltip;
