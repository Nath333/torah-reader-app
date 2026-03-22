/**
 * BinyanConjugationPanel - PRO SCHOLAR V6 Verb Paradigm Display
 *
 * Shows complete conjugation paradigm for Hebrew/Aramaic verbs:
 * - All 7 Hebrew binyanim + 5 Aramaic patterns
 * - Perfect/Imperfect/Imperative/Infinitive/Participle forms
 * - Person/number/gender breakdown
 * - Root highlighting in conjugated forms
 * - Click-to-lookup for any form
 *
 * @module BinyanConjugationPanel
 */

import React, { useState, memo, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import './BinyanConjugationPanel.css';

// =============================================================================
// BINYAN DATA - Complete paradigm patterns
// =============================================================================

/** Hebrew Binyanim with full conjugation patterns */
const HEBREW_BINYANIM = {
  qal: {
    name: 'Qal',
    hebrew: 'קַל',
    meaning: 'Simple active',
    color: '#3b82f6',
    pattern: 'קָטַל',
    forms: {
      perfect: {
        '3ms': 'קָטַל', '3fs': 'קָטְלָה', '3cp': 'קָטְלוּ',
        '2ms': 'קָטַלְתָּ', '2fs': 'קָטַלְתְּ', '2mp': 'קְטַלְתֶּם', '2fp': 'קְטַלְתֶּן',
        '1cs': 'קָטַלְתִּי', '1cp': 'קָטַלְנוּ'
      },
      imperfect: {
        '3ms': 'יִקְטֹל', '3fs': 'תִּקְטֹל', '3mp': 'יִקְטְלוּ', '3fp': 'תִּקְטֹלְנָה',
        '2ms': 'תִּקְטֹל', '2fs': 'תִּקְטְלִי', '2mp': 'תִּקְטְלוּ', '2fp': 'תִּקְטֹלְנָה',
        '1cs': 'אֶקְטֹל', '1cp': 'נִקְטֹל'
      },
      imperative: {
        '2ms': 'קְטֹל', '2fs': 'קִטְלִי', '2mp': 'קִטְלוּ', '2fp': 'קְטֹלְנָה'
      },
      infinitive: { construct: 'קְטֹל', absolute: 'קָטוֹל' },
      participle: { ms: 'קֹטֵל', fs: 'קֹטֶלֶת', mp: 'קֹטְלִים', fp: 'קֹטְלוֹת' }
    }
  },
  nifal: {
    name: "Nif'al",
    hebrew: 'נִפְעַל',
    meaning: 'Simple passive/reflexive',
    color: '#ec4899',
    pattern: 'נִקְטַל',
    forms: {
      perfect: {
        '3ms': 'נִקְטַל', '3fs': 'נִקְטְלָה', '3cp': 'נִקְטְלוּ',
        '2ms': 'נִקְטַלְתָּ', '2fs': 'נִקְטַלְתְּ', '2mp': 'נִקְטַלְתֶּם', '2fp': 'נִקְטַלְתֶּן',
        '1cs': 'נִקְטַלְתִּי', '1cp': 'נִקְטַלְנוּ'
      },
      imperfect: {
        '3ms': 'יִקָּטֵל', '3fs': 'תִּקָּטֵל', '3mp': 'יִקָּטְלוּ', '3fp': 'תִּקָּטַלְנָה',
        '2ms': 'תִּקָּטֵל', '2fs': 'תִּקָּטְלִי', '2mp': 'תִּקָּטְלוּ', '2fp': 'תִּקָּטַלְנָה',
        '1cs': 'אֶקָּטֵל', '1cp': 'נִקָּטֵל'
      },
      imperative: { '2ms': 'הִקָּטֵל', '2fs': 'הִקָּטְלִי', '2mp': 'הִקָּטְלוּ' },
      infinitive: { construct: 'הִקָּטֵל', absolute: 'נִקְטוֹל / הִקָּטֵל' },
      participle: { ms: 'נִקְטָל', fs: 'נִקְטֶלֶת', mp: 'נִקְטָלִים', fp: 'נִקְטָלוֹת' }
    }
  },
  piel: {
    name: "Pi'el",
    hebrew: 'פִּעֵל',
    meaning: 'Intensive active',
    color: '#f59e0b',
    pattern: 'קִטֵּל',
    forms: {
      perfect: {
        '3ms': 'קִטֵּל', '3fs': 'קִטְּלָה', '3cp': 'קִטְּלוּ',
        '2ms': 'קִטַּלְתָּ', '2fs': 'קִטַּלְתְּ', '2mp': 'קִטַּלְתֶּם', '2fp': 'קִטַּלְתֶּן',
        '1cs': 'קִטַּלְתִּי', '1cp': 'קִטַּלְנוּ'
      },
      imperfect: {
        '3ms': 'יְקַטֵּל', '3fs': 'תְּקַטֵּל', '3mp': 'יְקַטְּלוּ', '3fp': 'תְּקַטֵּלְנָה',
        '2ms': 'תְּקַטֵּל', '2fs': 'תְּקַטְּלִי', '2mp': 'תְּקַטְּלוּ', '2fp': 'תְּקַטֵּלְנָה',
        '1cs': 'אֲקַטֵּל', '1cp': 'נְקַטֵּל'
      },
      imperative: { '2ms': 'קַטֵּל', '2fs': 'קַטְּלִי', '2mp': 'קַטְּלוּ' },
      infinitive: { construct: 'קַטֵּל', absolute: 'קַטֵּל' },
      participle: { ms: 'מְקַטֵּל', fs: 'מְקַטֶּלֶת', mp: 'מְקַטְּלִים', fp: 'מְקַטְּלוֹת' }
    }
  },
  pual: {
    name: "Pu'al",
    hebrew: 'פֻּעַל',
    meaning: 'Intensive passive',
    color: '#6366f1',
    pattern: 'קֻטַּל',
    forms: {
      perfect: {
        '3ms': 'קֻטַּל', '3fs': 'קֻטְּלָה', '3cp': 'קֻטְּלוּ',
        '2ms': 'קֻטַּלְתָּ', '2fs': 'קֻטַּלְתְּ', '2mp': 'קֻטַּלְתֶּם', '2fp': 'קֻטַּלְתֶּן',
        '1cs': 'קֻטַּלְתִּי', '1cp': 'קֻטַּלְנוּ'
      },
      imperfect: {
        '3ms': 'יְקֻטַּל', '3fs': 'תְּקֻטַּל', '3mp': 'יְקֻטְּלוּ', '3fp': 'תְּקֻטַּלְנָה',
        '2ms': 'תְּקֻטַּל', '2fs': 'תְּקֻטְּלִי', '2mp': 'תְּקֻטְּלוּ', '2fp': 'תְּקֻטַּלְנָה',
        '1cs': 'אֲקֻטַּל', '1cp': 'נְקֻטַּל'
      },
      participle: { ms: 'מְקֻטָּל', fs: 'מְקֻטֶּלֶת', mp: 'מְקֻטָּלִים', fp: 'מְקֻטָּלוֹת' }
    }
  },
  hifil: {
    name: "Hif'il",
    hebrew: 'הִפְעִיל',
    meaning: 'Causative active',
    color: '#16a34a',
    pattern: 'הִקְטִיל',
    forms: {
      perfect: {
        '3ms': 'הִקְטִיל', '3fs': 'הִקְטִילָה', '3cp': 'הִקְטִילוּ',
        '2ms': 'הִקְטַלְתָּ', '2fs': 'הִקְטַלְתְּ', '2mp': 'הִקְטַלְתֶּם', '2fp': 'הִקְטַלְתֶּן',
        '1cs': 'הִקְטַלְתִּי', '1cp': 'הִקְטַלְנוּ'
      },
      imperfect: {
        '3ms': 'יַקְטִיל', '3fs': 'תַּקְטִיל', '3mp': 'יַקְטִילוּ', '3fp': 'תַּקְטֵלְנָה',
        '2ms': 'תַּקְטִיל', '2fs': 'תַּקְטִילִי', '2mp': 'תַּקְטִילוּ', '2fp': 'תַּקְטֵלְנָה',
        '1cs': 'אַקְטִיל', '1cp': 'נַקְטִיל'
      },
      imperative: { '2ms': 'הַקְטֵל', '2fs': 'הַקְטִילִי', '2mp': 'הַקְטִילוּ' },
      infinitive: { construct: 'הַקְטִיל', absolute: 'הַקְטֵל' },
      participle: { ms: 'מַקְטִיל', fs: 'מַקְטִילָה', mp: 'מַקְטִילִים', fp: 'מַקְטִילוֹת' }
    }
  },
  hufal: {
    name: "Huf'al",
    hebrew: 'הֻפְעַל',
    meaning: 'Causative passive',
    color: '#a855f7',
    pattern: 'הֻקְטַל',
    forms: {
      perfect: {
        '3ms': 'הֻקְטַל', '3fs': 'הֻקְטְלָה', '3cp': 'הֻקְטְלוּ',
        '2ms': 'הֻקְטַלְתָּ', '2fs': 'הֻקְטַלְתְּ', '2mp': 'הֻקְטַלְתֶּם', '2fp': 'הֻקְטַלְתֶּן',
        '1cs': 'הֻקְטַלְתִּי', '1cp': 'הֻקְטַלְנוּ'
      },
      imperfect: {
        '3ms': 'יֻקְטַל', '3fs': 'תֻּקְטַל', '3mp': 'יֻקְטְלוּ', '3fp': 'תֻּקְטַלְנָה',
        '2ms': 'תֻּקְטַל', '2fs': 'תֻּקְטְלִי', '2mp': 'תֻּקְטְלוּ', '2fp': 'תֻּקְטַלְנָה',
        '1cs': 'אֻקְטַל', '1cp': 'נֻקְטַל'
      },
      participle: { ms: 'מֻקְטָל', fs: 'מֻקְטֶלֶת', mp: 'מֻקְטָלִים', fp: 'מֻקְטָלוֹת' }
    }
  },
  hitpael: {
    name: "Hitpa'el",
    hebrew: 'הִתְפַּעֵל',
    meaning: 'Reflexive/reciprocal',
    color: '#ef4444',
    pattern: 'הִתְקַטֵּל',
    forms: {
      perfect: {
        '3ms': 'הִתְקַטֵּל', '3fs': 'הִתְקַטְּלָה', '3cp': 'הִתְקַטְּלוּ',
        '2ms': 'הִתְקַטַּלְתָּ', '2fs': 'הִתְקַטַּלְתְּ', '2mp': 'הִתְקַטַּלְתֶּם', '2fp': 'הִתְקַטַּלְתֶּן',
        '1cs': 'הִתְקַטַּלְתִּי', '1cp': 'הִתְקַטַּלְנוּ'
      },
      imperfect: {
        '3ms': 'יִתְקַטֵּל', '3fs': 'תִּתְקַטֵּל', '3mp': 'יִתְקַטְּלוּ', '3fp': 'תִּתְקַטֵּלְנָה',
        '2ms': 'תִּתְקַטֵּל', '2fs': 'תִּתְקַטְּלִי', '2mp': 'תִּתְקַטְּלוּ', '2fp': 'תִּתְקַטֵּלְנָה',
        '1cs': 'אֶתְקַטֵּל', '1cp': 'נִתְקַטֵּל'
      },
      imperative: { '2ms': 'הִתְקַטֵּל', '2fs': 'הִתְקַטְּלִי', '2mp': 'הִתְקַטְּלוּ' },
      infinitive: { construct: 'הִתְקַטֵּל', absolute: 'הִתְקַטֵּל' },
      participle: { ms: 'מִתְקַטֵּל', fs: 'מִתְקַטֶּלֶת', mp: 'מִתְקַטְּלִים', fp: 'מִתְקַטְּלוֹת' }
    }
  }
};

/** Aramaic verb patterns */
const ARAMAIC_PATTERNS = {
  peal: {
    name: "Pe'al",
    hebrew: 'פְּעַל',
    meaning: 'Simple active (=Qal)',
    color: '#0891b2',
    pattern: 'קְטַל'
  },
  pael: {
    name: "Pa'el",
    hebrew: 'פַּעֵל',
    meaning: 'Intensive active (=Piel)',
    color: '#d97706',
    pattern: 'קַטֵּל'
  },
  afel: {
    name: "Af'el",
    hebrew: 'אַפְעֵל',
    meaning: 'Causative active (=Hifil)',
    color: '#059669',
    pattern: 'אַקְטֵל'
  },
  itpeel: {
    name: "Itpe'el",
    hebrew: 'אִתְפְּעֵל',
    meaning: 'Passive/reflexive',
    color: '#7c3aed',
    pattern: 'אִתְקְטֵל'
  },
  itpaal: {
    name: "Itpa'al",
    hebrew: 'אִתְפַּעַל',
    meaning: 'Intensive reflexive',
    color: '#be185d',
    pattern: 'אִתְקַטַּל'
  }
};

/** Person/number labels */
const PERSON_LABELS = {
  '3ms': { short: '3ms', long: '3rd masc. sing.', hebrew: 'הוא' },
  '3fs': { short: '3fs', long: '3rd fem. sing.', hebrew: 'היא' },
  '3cp': { short: '3cp', long: '3rd common pl.', hebrew: 'הם/הן' },
  '3mp': { short: '3mp', long: '3rd masc. pl.', hebrew: 'הם' },
  '3fp': { short: '3fp', long: '3rd fem. pl.', hebrew: 'הן' },
  '2ms': { short: '2ms', long: '2nd masc. sing.', hebrew: 'אתה' },
  '2fs': { short: '2fs', long: '2nd fem. sing.', hebrew: 'את' },
  '2mp': { short: '2mp', long: '2nd masc. pl.', hebrew: 'אתם' },
  '2fp': { short: '2fp', long: '2nd fem. pl.', hebrew: 'אתן' },
  '1cs': { short: '1cs', long: '1st common sing.', hebrew: 'אני' },
  '1cp': { short: '1cp', long: '1st common pl.', hebrew: 'אנחנו' },
  'ms': { short: 'ms', long: 'masc. sing.', hebrew: 'זכר יחיד' },
  'fs': { short: 'fs', long: 'fem. sing.', hebrew: 'נקבה יחיד' },
  'mp': { short: 'mp', long: 'masc. pl.', hebrew: 'זכר רבים' },
  'fp': { short: 'fp', long: 'fem. pl.', hebrew: 'נקבה רבות' },
  'construct': { short: 'const.', long: 'Construct', hebrew: 'סמיכות' },
  'absolute': { short: 'abs.', long: 'Absolute', hebrew: 'מוחלט' }
};

/** Tense/aspect labels */
const TENSE_LABELS = {
  perfect: { name: 'Perfect', hebrew: 'עבר', description: 'Completed action' },
  imperfect: { name: 'Imperfect', hebrew: 'עתיד', description: 'Incomplete action' },
  imperative: { name: 'Imperative', hebrew: 'ציווי', description: 'Command' },
  infinitive: { name: 'Infinitive', hebrew: 'שם הפועל', description: 'Verbal noun' },
  participle: { name: 'Participle', hebrew: 'בינוני', description: 'Verbal adjective' }
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Binyan selector tabs
 */
const BinyanTabs = memo(function BinyanTabs({ selected, onSelect, isAramaic }) {
  const patterns = isAramaic ? ARAMAIC_PATTERNS : HEBREW_BINYANIM;

  return (
    <div className="binyan-tabs">
      {Object.entries(patterns).map(([key, binyan]) => (
        <button
          key={key}
          className={`binyan-tab ${selected === key ? 'active' : ''}`}
          onClick={() => onSelect(key)}
          style={{ '--binyan-color': binyan.color }}
        >
          <span className="tab-hebrew" dir="rtl">{binyan.hebrew}</span>
          <span className="tab-name">{binyan.name}</span>
        </button>
      ))}
    </div>
  );
});

/**
 * Single conjugation form cell
 */
const ConjugationCell = memo(function ConjugationCell({ form, person, onClick, isHighlighted }) {
  const personInfo = PERSON_LABELS[person] || { short: person };

  return (
    <td
      className={`conj-cell ${isHighlighted ? 'highlighted' : ''}`}
      onClick={() => onClick?.(form, person)}
      title={personInfo.long}
    >
      <span className="cell-form" dir="rtl">{form}</span>
      <span className="cell-person">{personInfo.short}</span>
    </td>
  );
});

/**
 * Tense section with conjugation table
 */
const TenseSection = memo(function TenseSection({ tense, forms, onFormClick, highlightedForm }) {
  const tenseInfo = TENSE_LABELS[tense];

  if (!forms || Object.keys(forms).length === 0) return null;

  // Group forms by category for better layout
  const formEntries = Object.entries(forms);

  return (
    <div className="tense-section">
      <div className="tense-header">
        <span className="tense-name">{tenseInfo?.name || tense}</span>
        <span className="tense-hebrew" dir="rtl">{tenseInfo?.hebrew || ''}</span>
        {tenseInfo?.description && (
          <span className="tense-desc">{tenseInfo.description}</span>
        )}
      </div>
      <table className="conj-table">
        <tbody>
          {/* Render in rows of 3-4 */}
          {Array.from({ length: Math.ceil(formEntries.length / 3) }).map((_, rowIdx) => (
            <tr key={rowIdx}>
              {formEntries.slice(rowIdx * 3, (rowIdx + 1) * 3).map(([person, form]) => (
                <ConjugationCell
                  key={person}
                  form={form}
                  person={person}
                  onClick={onFormClick}
                  isHighlighted={highlightedForm === form}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

/**
 * Binyan info header
 */
const BinyanHeader = memo(function BinyanHeader({ binyan }) {
  if (!binyan) return null;

  return (
    <div className="binyan-header" style={{ '--binyan-color': binyan.color }}>
      <div className="binyan-title">
        <span className="binyan-name">{binyan.name}</span>
        <span className="binyan-hebrew" dir="rtl">{binyan.hebrew}</span>
      </div>
      <div className="binyan-meta">
        <span className="binyan-meaning">{binyan.meaning}</span>
        <span className="binyan-pattern" dir="rtl">{binyan.pattern}</span>
      </div>
    </div>
  );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * BinyanConjugationPanel - Complete verb paradigm display
 *
 * @param {Object} props
 * @param {string} [props.binyan='qal'] - Initial binyan to display
 * @param {string} [props.root] - Root to highlight in forms
 * @param {boolean} [props.isAramaic=false] - Show Aramaic patterns
 * @param {string} [props.highlightForm] - Form to highlight
 * @param {Function} [props.onFormClick] - Callback when clicking a form
 * @param {boolean} [props.compact=false] - Use compact layout
 * @param {string} [props.className=''] - Additional CSS classes
 */
function BinyanConjugationPanel({
  binyan: initialBinyan = 'qal',
  root,
  isAramaic = false,
  highlightForm,
  onFormClick,
  compact = false,
  className = ''
}) {
  const [selectedBinyan, setSelectedBinyan] = useState(initialBinyan);

  // Get binyan data
  const binyanData = useMemo(() => {
    const patterns = isAramaic ? ARAMAIC_PATTERNS : HEBREW_BINYANIM;
    return patterns[selectedBinyan] || patterns[Object.keys(patterns)[0]];
  }, [selectedBinyan, isAramaic]);

  // Handle form click
  const handleFormClick = useCallback((form, person) => {
    onFormClick?.(form, {
      binyan: selectedBinyan,
      person,
      root,
      isAramaic
    });
  }, [onFormClick, selectedBinyan, root, isAramaic]);

  // Panel class names
  const panelClassName = useMemo(
    () => `binyan-conjugation-panel ${compact ? 'compact' : ''} ${className}`.trim(),
    [compact, className]
  );

  return (
    <div className={panelClassName}>
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* BINYAN TABS */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <BinyanTabs
        selected={selectedBinyan}
        onSelect={setSelectedBinyan}
        isAramaic={isAramaic}
      />

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* BINYAN HEADER */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <BinyanHeader binyan={binyanData} />

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ROOT DISPLAY */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {root && (
        <div className="root-display">
          <span className="root-label">Conjugating root:</span>
          <span className="root-value" dir="rtl">{root}</span>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* CONJUGATION TABLES */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {binyanData.forms && (
        <div className="conjugation-tables">
          {Object.entries(binyanData.forms).map(([tense, forms]) => (
            <TenseSection
              key={tense}
              tense={tense}
              forms={forms}
              onFormClick={handleFormClick}
              highlightedForm={highlightForm}
            />
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* FOOTER */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="panel-footer">
        <span className="language-indicator">
          {isAramaic ? 'Aramaic' : 'Biblical Hebrew'}
        </span>
        <span className="paradigm-note">
          Pattern forms shown with model root ק-ט-ל
        </span>
      </div>
    </div>
  );
}

BinyanConjugationPanel.propTypes = {
  binyan: PropTypes.string,
  root: PropTypes.string,
  isAramaic: PropTypes.bool,
  highlightForm: PropTypes.string,
  onFormClick: PropTypes.func,
  compact: PropTypes.bool,
  className: PropTypes.string
};

BinyanConjugationPanel.defaultProps = {
  binyan: 'qal',
  root: null,
  isAramaic: false,
  highlightForm: null,
  onFormClick: null,
  compact: false,
  className: ''
};

// Export binyan data for external use
export { HEBREW_BINYANIM, ARAMAIC_PATTERNS, PERSON_LABELS, TENSE_LABELS };

export default memo(BinyanConjugationPanel);
