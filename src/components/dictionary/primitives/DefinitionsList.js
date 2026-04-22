/**
 * DefinitionsList — shared primitive used by both word-display cards.
 *
 * Unifies the two parallel implementations:
 *   - WordIntelligenceCard's <DefinitionsSection> (simple list, "show more" toggle)
 *   - WordDefinitionCard's .wdc-defs wrapper (richer header, sliced to N)
 *
 * Both callers now pass a normalized `definitions` array and pick a variant.
 * Under the hood each item renders through <SourceDefinitionItem>, which
 * gracefully skips tier/credibility/sense chrome when the fields aren't present.
 */

import React, { memo, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import SourceDefinitionItem from '../SourceDefinitionItem';

const normalize = (def) => ({
  ...def,
  text: def.text ?? def.definition ?? '',
});

function DefinitionsList({
  definitions,
  maxItems = null,
  showToggle = false,
  showHeader = true,
  showFrench = false,
  frenchTranslation = null,
  emptyLabel = 'No dictionary entries found',
  className = '',
}) {
  const [expanded, setExpanded] = useState(false);
  const handleToggle = useCallback(() => setExpanded((v) => !v), []);

  if (!definitions || definitions.length === 0) {
    return (
      <div className={`definitions-list empty ${className}`.trim()}>
        <span className="no-def">{emptyLabel}</span>
      </div>
    );
  }

  const normalized = definitions.map(normalize);
  const total = normalized.length;

  const visible = maxItems != null
    ? normalized.slice(0, maxItems)
    : showToggle && !expanded
      ? normalized.slice(0, 1)
      : normalized;

  const hiddenCount = total - visible.length;

  return (
    <div className={`definitions-list ${className}`.trim()}>
      {showHeader && (
        <div className="definitions-list-header">
          <span className="definitions-list-label">📚 Dictionaries</span>
          <span className="definitions-list-count">
            {maxItems != null && total > maxItems
              ? `${visible.length} of ${total} sources`
              : `${total} ${total === 1 ? 'source' : 'sources'}`}
          </span>
        </div>
      )}

      <div className="definitions-list-items">
        {visible.map((def, idx) => (
          <SourceDefinitionItem
            key={`${def.source}-${idx}`}
            def={def}
            showFrench={showFrench}
            frenchTranslation={idx === 0 ? frenchTranslation : null}
            allSenses={def.allSourceSenses || def.allSenses}
          />
        ))}
      </div>

      {showToggle && hiddenCount > 0 && (
        <button className="definitions-list-toggle" onClick={handleToggle} type="button">
          {expanded ? 'Show less' : `Show ${hiddenCount} more source${hiddenCount === 1 ? '' : 's'}`}
        </button>
      )}
    </div>
  );
}

DefinitionsList.propTypes = {
  definitions: PropTypes.arrayOf(PropTypes.shape({
    text: PropTypes.string,
    definition: PropTypes.string,
    source: PropTypes.string.isRequired,
    year: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  })),
  maxItems: PropTypes.number,
  showToggle: PropTypes.bool,
  showHeader: PropTypes.bool,
  showFrench: PropTypes.bool,
  frenchTranslation: PropTypes.string,
  emptyLabel: PropTypes.string,
  className: PropTypes.string,
};

export default memo(DefinitionsList);
