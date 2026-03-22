/**
 * PersonaSelector - Teaching persona selector for AI Tutor
 * Sephardi-focused teaching styles
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { TEACHING_PERSONAS, PERSONA_CONFIG } from '../../services/aiTutorService';

const PersonaSelector = ({ value, onChange, compact = false }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Order personas with Sephardi ones first
  const orderedPersonas = [
    TEACHING_PERSONAS.BEN_ISH_CHAI,
    TEACHING_PERSONAS.RAV_OVADIA,
    TEACHING_PERSONAS.OHR_HACHAIM,
    TEACHING_PERSONAS.CHIDA,
    TEACHING_PERSONAS.RAMBAM,
    TEACHING_PERSONAS.CHILDREN,
    TEACHING_PERSONAS.DEFAULT
  ];

  if (compact) {
    return (
      <select
        className="persona-selector-compact"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {orderedPersonas.map(persona => {
          const config = PERSONA_CONFIG[persona];
          return (
            <option key={persona} value={persona}>
              {config.icon} {config.name}
            </option>
          );
        })}
      </select>
    );
  }

  const currentConfig = PERSONA_CONFIG[value];

  return (
    <div className="persona-selector">
      <button
        className="persona-current"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="persona-icon">{currentConfig.icon}</span>
        <div className="persona-info">
          <span className="persona-name">{currentConfig.name}</span>
          <span className="persona-desc">{currentConfig.description}</span>
        </div>
        <span className="persona-arrow">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="persona-dropdown">
          {orderedPersonas.map(persona => {
            const config = PERSONA_CONFIG[persona];
            const isSelected = value === persona;

            return (
              <button
                key={persona}
                className={`persona-option ${isSelected ? 'selected' : ''}`}
                onClick={() => {
                  onChange(persona);
                  setIsOpen(false);
                }}
              >
                <span className="persona-icon">{config.icon}</span>
                <div className="persona-info">
                  <span className="persona-name">{config.name}</span>
                  <span className="persona-name-hebrew">{config.nameHebrew}</span>
                  <span className="persona-desc">{config.description}</span>
                </div>
                {isSelected && <span className="persona-check">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

PersonaSelector.propTypes = {
  value: PropTypes.oneOf(Object.values(TEACHING_PERSONAS)).isRequired,
  onChange: PropTypes.func.isRequired,
  compact: PropTypes.bool
};

export default PersonaSelector;
