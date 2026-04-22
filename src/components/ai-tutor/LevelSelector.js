/**
 * LevelSelector - Difficulty level selector for AI Tutor
 */

import React from 'react';
import PropTypes from 'prop-types';
import { DIFFICULTY_LEVELS, LEVEL_CONFIG } from '../../services/ai/aiTutorService';

const LevelSelector = ({ value, onChange, compact = false }) => {
  const levels = Object.values(DIFFICULTY_LEVELS);

  if (compact) {
    return (
      <select
        className="level-selector-compact"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {levels.map(level => {
          const config = LEVEL_CONFIG[level];
          return (
            <option key={level} value={level}>
              {config.icon} {config.name}
            </option>
          );
        })}
      </select>
    );
  }

  return (
    <div className="level-selector">
      {levels.map(level => {
        const config = LEVEL_CONFIG[level];
        const isSelected = value === level;

        return (
          <button
            key={level}
            className={`level-option ${isSelected ? 'selected' : ''}`}
            onClick={() => onChange(level)}
            title={config.description}
          >
            <span className="level-icon">{config.icon}</span>
            <span className="level-name">{config.name}</span>
            <span className="level-name-hebrew">{config.nameHebrew}</span>
          </button>
        );
      })}
    </div>
  );
};

LevelSelector.propTypes = {
  value: PropTypes.oneOf(Object.values(DIFFICULTY_LEVELS)).isRequired,
  onChange: PropTypes.func.isRequired,
  compact: PropTypes.bool
};

export default LevelSelector;
