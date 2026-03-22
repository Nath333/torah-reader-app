// =============================================================================
// Conjugation Table Component - PRO SCHOLAR v3
// Shows full verb paradigm for Hebrew/Aramaic binyanim
// =============================================================================

import React, { useState, useMemo } from 'react';
import './ConjugationTable.css';

/**
 * Hebrew verb conjugation paradigms by binyan
 * Each entry shows: perfect (past), imperfect (future), imperative, participle
 */
const HEBREW_PARADIGMS = {
  qal: {
    name: 'Qal',
    hebrew: 'קַל',
    pattern: 'פָּעַל',
    perfect: {
      '3ms': { suffix: '', example: 'שָׁמַר' },
      '3fs': { suffix: 'ה', example: 'שָׁמְרָה' },
      '2ms': { suffix: 'תָּ', example: 'שָׁמַרְתָּ' },
      '2fs': { suffix: 'תְּ', example: 'שָׁמַרְתְּ' },
      '1cs': { suffix: 'תִּי', example: 'שָׁמַרְתִּי' },
      '3cp': { suffix: 'וּ', example: 'שָׁמְרוּ' },
      '2mp': { suffix: 'תֶּם', example: 'שְׁמַרְתֶּם' },
      '2fp': { suffix: 'תֶּן', example: 'שְׁמַרְתֶּן' },
      '1cp': { suffix: 'נוּ', example: 'שָׁמַרְנוּ' },
    },
    imperfect: {
      '3ms': { prefix: 'יִ', suffix: '', example: 'יִשְׁמֹר' },
      '3fs': { prefix: 'תִּ', suffix: '', example: 'תִּשְׁמֹר' },
      '2ms': { prefix: 'תִּ', suffix: '', example: 'תִּשְׁמֹר' },
      '2fs': { prefix: 'תִּ', suffix: 'י', example: 'תִּשְׁמְרִי' },
      '1cs': { prefix: 'אֶ', suffix: '', example: 'אֶשְׁמֹר' },
      '3mp': { prefix: 'יִ', suffix: 'וּ', example: 'יִשְׁמְרוּ' },
      '3fp': { prefix: 'תִּ', suffix: 'נָה', example: 'תִּשְׁמֹרְנָה' },
      '2mp': { prefix: 'תִּ', suffix: 'וּ', example: 'תִּשְׁמְרוּ' },
      '2fp': { prefix: 'תִּ', suffix: 'נָה', example: 'תִּשְׁמֹרְנָה' },
      '1cp': { prefix: 'נִ', suffix: '', example: 'נִשְׁמֹר' },
    },
    imperative: {
      '2ms': { prefix: '', suffix: '', example: 'שְׁמֹר' },
      '2fs': { prefix: '', suffix: 'י', example: 'שִׁמְרִי' },
      '2mp': { prefix: '', suffix: 'וּ', example: 'שִׁמְרוּ' },
      '2fp': { prefix: '', suffix: 'נָה', example: 'שְׁמֹרְנָה' },
    },
    participle: {
      'ms': { pattern: 'שֹׁמֵר', label: 'active' },
      'fs': { pattern: 'שֹׁמֶרֶת', label: 'active' },
      'mp': { pattern: 'שֹׁמְרִים', label: 'active' },
      'fp': { pattern: 'שֹׁמְרוֹת', label: 'active' },
      'passive-ms': { pattern: 'שָׁמוּר', label: 'passive' },
    },
    infinitive: {
      construct: 'לִשְׁמֹר',
      absolute: 'שָׁמוֹר',
    }
  },
  hifil: {
    name: 'Hifil',
    hebrew: 'הִפְעִיל',
    pattern: 'הִפְעִיל',
    perfect: {
      '3ms': { prefix: 'הִ', suffix: '', example: 'הִשְׁמִיר' },
      '3fs': { prefix: 'הִ', suffix: 'ה', example: 'הִשְׁמִירָה' },
      '2ms': { prefix: 'הִ', suffix: 'תָּ', example: 'הִשְׁמַרְתָּ' },
      '1cs': { prefix: 'הִ', suffix: 'תִּי', example: 'הִשְׁמַרְתִּי' },
      '3cp': { prefix: 'הִ', suffix: 'וּ', example: 'הִשְׁמִירוּ' },
      '1cp': { prefix: 'הִ', suffix: 'נוּ', example: 'הִשְׁמַרְנוּ' },
    },
    imperfect: {
      '3ms': { prefix: 'יַ', suffix: '', example: 'יַשְׁמִיר' },
      '3fs': { prefix: 'תַּ', suffix: '', example: 'תַּשְׁמִיר' },
      '2ms': { prefix: 'תַּ', suffix: '', example: 'תַּשְׁמִיר' },
      '1cs': { prefix: 'אַ', suffix: '', example: 'אַשְׁמִיר' },
      '3mp': { prefix: 'יַ', suffix: 'וּ', example: 'יַשְׁמִירוּ' },
      '1cp': { prefix: 'נַ', suffix: '', example: 'נַשְׁמִיר' },
    },
    imperative: {
      '2ms': { prefix: 'הַ', suffix: '', example: 'הַשְׁמֵר' },
      '2mp': { prefix: 'הַ', suffix: 'וּ', example: 'הַשְׁמִירוּ' },
    },
    participle: {
      'ms': { pattern: 'מַשְׁמִיר', label: 'active' },
      'fs': { pattern: 'מַשְׁמֶרֶת', label: 'active' },
    },
    infinitive: {
      construct: 'לְהַשְׁמִיר',
    }
  },
  piel: {
    name: 'Piel',
    hebrew: 'פִּעֵל',
    pattern: 'פִּעֵל',
    perfect: {
      '3ms': { suffix: '', example: 'שִׁמֵּר', doubling: true },
      '3fs': { suffix: 'ה', example: 'שִׁמְּרָה', doubling: true },
      '2ms': { suffix: 'תָּ', example: 'שִׁמַּרְתָּ', doubling: true },
      '1cs': { suffix: 'תִּי', example: 'שִׁמַּרְתִּי', doubling: true },
      '3cp': { suffix: 'וּ', example: 'שִׁמְּרוּ', doubling: true },
    },
    imperfect: {
      '3ms': { prefix: 'יְ', suffix: '', example: 'יְשַׁמֵּר', doubling: true },
      '2ms': { prefix: 'תְּ', suffix: '', example: 'תְּשַׁמֵּר', doubling: true },
      '1cs': { prefix: 'אֲ', suffix: '', example: 'אֲשַׁמֵּר', doubling: true },
    },
    imperative: {
      '2ms': { suffix: '', example: 'שַׁמֵּר', doubling: true },
    },
    participle: {
      'ms': { pattern: 'מְשַׁמֵּר', label: 'active', doubling: true },
    },
    infinitive: {
      construct: 'לְשַׁמֵּר',
    }
  },
  hitpael: {
    name: 'Hitpael',
    hebrew: 'הִתְפַּעֵל',
    pattern: 'הִתְפַּעֵל',
    perfect: {
      '3ms': { prefix: 'הִתְ', suffix: '', example: 'הִשְׁתַּמֵּר' },
      '3fs': { prefix: 'הִתְ', suffix: 'ה', example: 'הִשְׁתַּמְּרָה' },
      '1cs': { prefix: 'הִתְ', suffix: 'תִּי', example: 'הִשְׁתַּמַּרְתִּי' },
    },
    imperfect: {
      '3ms': { prefix: 'יִתְ', suffix: '', example: 'יִשְׁתַּמֵּר' },
      '2ms': { prefix: 'תִּתְ', suffix: '', example: 'תִּשְׁתַּמֵּר' },
      '1cs': { prefix: 'אֶתְ', suffix: '', example: 'אֶשְׁתַּמֵּר' },
    },
    imperative: {
      '2ms': { prefix: 'הִתְ', suffix: '', example: 'הִשְׁתַּמֵּר' },
    },
    participle: {
      'ms': { pattern: 'מִשְׁתַּמֵּר', label: 'reflexive' },
    },
    infinitive: {
      construct: 'לְהִשְׁתַּמֵּר',
    }
  },
  nifal: {
    name: 'Nifal',
    hebrew: 'נִפְעַל',
    pattern: 'נִפְעַל',
    perfect: {
      '3ms': { prefix: 'נִ', suffix: '', example: 'נִשְׁמַר' },
      '3fs': { prefix: 'נִ', suffix: 'ה', example: 'נִשְׁמְרָה' },
      '1cs': { prefix: 'נִ', suffix: 'תִּי', example: 'נִשְׁמַרְתִּי' },
    },
    imperfect: {
      '3ms': { prefix: 'יִ', infix: 'ּ', suffix: '', example: 'יִשָּׁמֵר' },
      '2ms': { prefix: 'תִּ', infix: 'ּ', suffix: '', example: 'תִּשָּׁמֵר' },
    },
    imperative: {
      '2ms': { prefix: 'הִ', infix: 'ּ', suffix: '', example: 'הִשָּׁמֵר' },
    },
    participle: {
      'ms': { pattern: 'נִשְׁמָר', label: 'passive/reflexive' },
    },
    infinitive: {
      construct: 'לְהִשָּׁמֵר',
    }
  }
};

/**
 * Aramaic verb conjugation paradigms
 */
const ARAMAIC_PARADIGMS = {
  peal: {
    name: 'Peal',
    hebrew: 'פְּעַל',
    pattern: 'פְּעַל',
    meaning: 'Simple (like Hebrew Qal)',
    perfect: {
      '3ms': { suffix: '', example: 'כְּתַב' },
      '3fs': { suffix: 'ת/א', example: 'כְּתָבַת' },
      '2ms': { suffix: 'תָּ', example: 'כְּתַבְתָּ' },
      '1cs': { suffix: 'ית', example: 'כְּתָבִית' },
      '3mp': { suffix: 'וּ', example: 'כְּתָבוּ' },
      '1cp': { suffix: 'נָא', example: 'כְּתַבְנָא' },
    },
    imperfect: {
      '3ms': { prefix: 'יִ', suffix: '', example: 'יִכְתּוֹב' },
      '2ms': { prefix: 'תִּ', suffix: '', example: 'תִּכְתּוֹב' },
      '1cs': { prefix: 'אֶ', suffix: '', example: 'אֶכְתּוֹב' },
      '3mp': { prefix: 'יִ', suffix: 'וּן', example: 'יִכְתְּבוּן' },
    },
    participle: {
      'ms': { pattern: 'כָּתֵב', label: 'active' },
      'ms-passive': { pattern: 'כְּתִיב', label: 'passive' },
    }
  },
  aphel: {
    name: 'Aphel',
    hebrew: 'אַפְעֵל',
    pattern: 'אַפְעֵל',
    meaning: 'Causative (like Hebrew Hifil)',
    perfect: {
      '3ms': { prefix: 'אַ', suffix: '', example: 'אַפֵּיק' },
      '3fs': { prefix: 'אַ', suffix: 'ת', example: 'אַפְּקַת' },
      '1cs': { prefix: 'אַ', suffix: 'ית', example: 'אַפֵּיקִית' },
      '3mp': { prefix: 'אַ', suffix: 'וּ', example: 'אַפִּיקוּ' },
    },
    imperfect: {
      '3ms': { prefix: 'יַ', suffix: '', example: 'יַפֵּיק' },
      '2ms': { prefix: 'תַּ', suffix: '', example: 'תַּפֵּיק' },
      '2mp': { prefix: 'תַּ', suffix: 'וּן', example: 'תַּפְּקוּן' },
      '1cs': { prefix: 'אַ', suffix: '', example: 'אַפֵּיק' },
    },
    participle: {
      'ms': { pattern: 'מַפֵּיק', label: 'active' },
    }
  },
  pael: {
    name: 'Pael',
    hebrew: 'פַּעֵל',
    pattern: 'פַּעֵל',
    meaning: 'Intensive (like Hebrew Piel)',
    perfect: {
      '3ms': { suffix: '', example: 'קַטֵּל', doubling: true },
      '3mp': { suffix: 'וּ', example: 'קַטְּלוּ', doubling: true },
    },
    imperfect: {
      '3ms': { prefix: 'יְ', suffix: '', example: 'יְקַטֵּל', doubling: true },
    },
    participle: {
      'ms': { pattern: 'מְקַטֵּל', label: 'active', doubling: true },
    }
  },
  itpeel: {
    name: 'Itpeel',
    hebrew: 'אִתְפְּעֵל',
    pattern: 'אִתְפְּעֵל',
    meaning: 'Reflexive (like Hebrew Hitpael)',
    perfect: {
      '3ms': { prefix: 'אִתְ', suffix: '', example: 'אִתְכְּתֵב' },
    },
    imperfect: {
      '3ms': { prefix: 'יִתְ', suffix: '', example: 'יִתְכְּתֵב' },
    },
    participle: {
      'ms': { pattern: 'מִתְכְּתֵב', label: 'reflexive' },
    }
  }
};

const PERSON_LABELS = {
  '3ms': '3rd masc sing',
  '3fs': '3rd fem sing',
  '2ms': '2nd masc sing',
  '2fs': '2nd fem sing',
  '1cs': '1st common sing',
  '3mp': '3rd masc plur',
  '3fp': '3rd fem plur',
  '3cp': '3rd common plur',
  '2mp': '2nd masc plur',
  '2fp': '2nd fem plur',
  '1cp': '1st common plur',
  'ms': 'masc sing',
  'fs': 'fem sing',
  'mp': 'masc plur',
  'fp': 'fem plur',
  'passive-ms': 'passive masc sing',
  'ms-passive': 'passive masc sing',
};

const PERSON_LABELS_SHORT = {
  '3ms': 'הוּא',
  '3fs': 'הִיא',
  '2ms': 'אַתָּה',
  '2fs': 'אַתְּ',
  '1cs': 'אֲנִי',
  '3mp': 'הֵם',
  '3fp': 'הֵן',
  '3cp': 'הֵם/הֵן',
  '2mp': 'אַתֶּם',
  '2fp': 'אַתֶּן',
  '1cp': 'אֲנַחְנוּ',
};

/**
 * Conjugation Table Component
 * Shows verb paradigm for the detected binyan
 */
const ConjugationTable = ({ binyanName, language = 'Hebrew', root }) => {
  const [activeTense, setActiveTense] = useState('perfect');
  const [showAll, setShowAll] = useState(false);

  const paradigm = useMemo(() => {
    if (language === 'Aramaic') {
      return ARAMAIC_PARADIGMS[binyanName?.toLowerCase()] || null;
    }
    return HEBREW_PARADIGMS[binyanName?.toLowerCase()] || null;
  }, [binyanName, language]);

  if (!paradigm) return null;

  const tenses = ['perfect', 'imperfect', 'imperative', 'participle', 'infinitive'];
  const availableTenses = tenses.filter(t => paradigm[t] && Object.keys(paradigm[t]).length > 0);

  const currentForms = paradigm[activeTense] || {};
  const formEntries = Object.entries(currentForms);
  const displayForms = showAll ? formEntries : formEntries.slice(0, 4);

  return (
    <div className="conjugation-table">
      <div className="conj-header">
        <span className="conj-icon">📊</span>
        <span className="conj-title">Conjugation Paradigm</span>
        <span className="conj-binyan">{paradigm.hebrew} ({paradigm.name})</span>
      </div>

      {/* Tense selector tabs */}
      <div className="tense-tabs">
        {availableTenses.map(tense => (
          <button
            key={tense}
            className={`tense-tab ${activeTense === tense ? 'active' : ''}`}
            onClick={() => setActiveTense(tense)}
          >
            {tense === 'perfect' && 'עָבַר'}
            {tense === 'imperfect' && 'עָתִיד'}
            {tense === 'imperative' && 'צִוּוּי'}
            {tense === 'participle' && 'בֵּינוֹנִי'}
            {tense === 'infinitive' && 'מָקוֹר'}
            <span className="tense-english">{tense}</span>
          </button>
        ))}
      </div>

      {/* Forms table */}
      <div className="conj-forms">
        {activeTense === 'infinitive' ? (
          <div className="infinitive-forms">
            {currentForms.construct && (
              <div className="inf-form">
                <span className="inf-label">Construct:</span>
                <span className="inf-value" dir="rtl">{currentForms.construct}</span>
              </div>
            )}
            {currentForms.absolute && (
              <div className="inf-form">
                <span className="inf-label">Absolute:</span>
                <span className="inf-value" dir="rtl">{currentForms.absolute}</span>
              </div>
            )}
          </div>
        ) : (
          <>
            <table className="forms-table">
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Hebrew</th>
                  <th>Form</th>
                </tr>
              </thead>
              <tbody>
                {displayForms.map(([person, data]) => (
                  <tr key={person}>
                    <td className="person-cell">
                      <span className="person-hebrew">{PERSON_LABELS_SHORT[person] || ''}</span>
                      <span className="person-label">{PERSON_LABELS[person]}</span>
                    </td>
                    <td className="form-cell" dir="rtl">
                      {data.example || data.pattern}
                      {data.doubling && <span className="doubling-mark" title="Middle radical doubled">ּ</span>}
                    </td>
                    <td className="affix-cell">
                      {data.prefix && <span className="prefix-mark">+{data.prefix}</span>}
                      {data.suffix && <span className="suffix-mark">{data.suffix}+</span>}
                      {data.label && <span className="form-label">{data.label}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {formEntries.length > 4 && (
              <button className="show-all-btn" onClick={() => setShowAll(!showAll)}>
                {showAll ? 'Show less' : `Show all ${formEntries.length} forms`}
              </button>
            )}
          </>
        )}
      </div>

      {/* Pattern note */}
      <div className="pattern-note">
        <span className="note-icon">💡</span>
        <span className="note-text">
          Pattern: <strong dir="rtl">{paradigm.pattern}</strong>
          {paradigm.meaning && ` — ${paradigm.meaning}`}
        </span>
      </div>
    </div>
  );
};

export default ConjugationTable;
