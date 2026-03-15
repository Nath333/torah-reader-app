/**
 * RabbiTooltip - Displays rabbi information on hover
 */
import React, { useState, useCallback } from 'react';
import { lookupRabbi } from '../../services/namedEntityService';

const RabbiTooltip = React.memo(({ rabbiName, children }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipData, setTooltipData] = useState(null);

  const handleMouseEnter = useCallback(() => {
    if (!tooltipData) {
      const info = lookupRabbi(rabbiName);
      setTooltipData(info);
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
        </div>
      )}
    </div>
  );
});

export default RabbiTooltip;
