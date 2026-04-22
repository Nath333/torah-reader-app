/**
 * TextualCriticism.js - Verse-level manuscript comparison component
 *
 * Professional scholarly tool for comparing textual variants across:
 * - Masoretic Text (MT) with vocalization and cantillation
 * - Dead Sea Scrolls (DSS)
 * - Septuagint (LXX) with Greek text
 * - Samaritan Pentateuch (SP)
 * - Targumim (Onkelos, Pseudo-Jonathan, Neofiti)
 * - Peshitta (Syriac)
 * - Vulgate (Latin)
 */

import React, { useState, useMemo } from 'react';
import { getVariantsForVerse } from '../../services/textual/manuscriptVariantsService';
import { getMasoreticNotes } from '../../services/textual/masoreticService';
import './TextualCriticism.css';

// Manuscript display order (primary witnesses first)
const MANUSCRIPT_ORDER = ['MT', 'DSS', 'SP', 'LXX', 'TgO', 'TgPJ', 'TgN', 'Pesh', 'Vg'];

// Manuscript metadata for display
const MANUSCRIPT_INFO = {
  MT: {
    name: 'Masoretic Text',
    language: 'Hebrew',
    date: '6th-10th c. CE',
    tradition: 'Jewish',
    description: 'Standard Hebrew Bible text preserved by Masoretes',
    icon: '📜'
  },
  DSS: {
    name: 'Dead Sea Scrolls',
    language: 'Hebrew',
    date: '3rd c. BCE - 1st c. CE',
    tradition: 'Second Temple',
    description: 'Earliest known Hebrew manuscripts from Qumran',
    icon: '🏺'
  },
  SP: {
    name: 'Samaritan Pentateuch',
    language: 'Samaritan Hebrew',
    date: '2nd c. BCE origin',
    tradition: 'Samaritan',
    description: 'Samaritan community Torah tradition',
    icon: '⛰️'
  },
  LXX: {
    name: 'Septuagint',
    language: 'Greek',
    date: '3rd-2nd c. BCE',
    tradition: 'Hellenistic Jewish',
    description: 'Ancient Greek translation from Alexandria',
    icon: '🇬🇷'
  },
  TgO: {
    name: 'Targum Onkelos',
    language: 'Aramaic',
    date: '2nd c. CE',
    tradition: 'Babylonian',
    description: 'Official Aramaic translation of the Torah',
    icon: '📖'
  },
  TgPJ: {
    name: 'Targum Pseudo-Jonathan',
    language: 'Aramaic',
    date: '7th-8th c. CE',
    tradition: 'Palestinian',
    description: 'Expansive Palestinian Targum with midrashic additions',
    icon: '📚'
  },
  TgN: {
    name: 'Targum Neofiti',
    language: 'Aramaic',
    date: '3rd-4th c. CE',
    tradition: 'Palestinian',
    description: 'Complete Palestinian Targum discovered in Vatican Library',
    icon: '🏛️'
  },
  Pesh: {
    name: 'Peshitta',
    language: 'Syriac',
    date: '1st-2nd c. CE',
    tradition: 'Syriac Christian',
    description: 'Standard Syriac Bible translation',
    icon: '⛪'
  },
  Vg: {
    name: 'Vulgate',
    language: 'Latin',
    date: '4th c. CE',
    tradition: 'Latin Church',
    description: 'Jerome\'s Latin translation from Hebrew and Greek',
    icon: '🕊️'
  }
};

// Sample texts for demonstration (in production, would fetch from database)
const getSampleTextForManuscript = (reference, manuscriptId) => {
  // This would connect to a real database of manuscript readings
  // For now, return placeholder showing the concept
  const sampleTexts = {
    'Genesis.1.1': {
      MT: 'בְּרֵאשִׁ֖ית בָּרָ֣א אֱלֹהִ֑ים אֵ֥ת הַשָּׁמַ֖יִם וְאֵ֥ת הָאָֽרֶץ׃',
      DSS: 'בראשית ברא אלהים את השמים ואת הארץ',
      SP: 'בראשית ברא אלהים את השמים ואת הארץ',
      LXX: 'Ἐν ἀρχῇ ἐποίησεν ὁ θεὸς τὸν οὐρανὸν καὶ τὴν γῆν.',
      TgO: 'בְּקַדְמִין בְּרָא יְיָ יָת שְׁמַיָּא וְיָת אַרְעָא',
      TgPJ: 'מִן אֲוָלָא בְּחָכְמָא בְּרָא דַיְיָ וְשַׁכְלֵיל יָת שְׁמַיָּא וְיָת אַרְעָא',
      TgN: 'מלקדמין בחכמה ברא ייי ית שמיא וית ארעא',
      Pesh: 'ܒܪܫܝܬ ܒܪܐ ܐܠܗܐ ܝܬ ܫܡܝܐ ܘܝܬ ܐܪܥܐ',
      Vg: 'In principio creavit Deus caelum et terram.'
    },
    'Genesis.1.2': {
      MT: 'וְהָאָ֗רֶץ הָיְתָ֥ה תֹ֙הוּ֙ וָבֹ֔הוּ וְחֹ֖שֶׁךְ עַל־פְּנֵ֣י תְה֑וֹם וְר֣וּחַ אֱלֹהִ֔ים מְרַחֶ֖פֶת עַל־פְּנֵ֥י הַמָּֽיִם׃',
      LXX: 'ἡ δὲ γῆ ἦν ἀόρατος καὶ ἀκατασκεύαστος, καὶ σκότος ἐπάνω τῆς ἀβύσσου, καὶ πνεῦμα θεοῦ ἐπεφέρετο ἐπάνω τοῦ ὕδατος.',
      TgO: 'וְאַרְעָא הֲוָת צָדְיָא וְרֵיקַנְיָא וַחֲשׁוֹכָא עַל אַפֵּי תְהוֹמָא וְרוּחָא מִן קֳדָם יְיָ מְנַשְּׁבָא עַל אַפֵּי מַיָּא',
      Vg: 'Terra autem erat inanis et vacua, et tenebrae erant super faciem abyssi, et spiritus Dei ferebatur super aquas.'
    },
    'Genesis.4.8': {
      MT: 'וַיֹּ֥אמֶר קַ֖יִן אֶל־הֶ֣בֶל אָחִ֑יו וַֽיְהִי֙ בִּהְיוֹתָ֣ם בַּשָּׂדֶ֔ה וַיָּ֥קָם קַ֛יִן אֶל־הֶ֥בֶל אָחִ֖יו וַיַּהַרְגֵֽהוּ׃',
      DSS: 'ויאמר קין אל הבל אחיו [נלכה השדה] ויהי בהיותם בשדה ויקם קין אל הבל אחיו ויהרגהו',
      SP: 'ויאמר קין אל הבל אחיו נלכה השדה ויהי בהיותם בשדה ויקם קין על הבל אחיו ויהרגהו',
      LXX: 'καὶ εἶπεν Καιν πρὸς Αβελ τὸν ἀδελφὸν αὐτοῦ Διέλθωμεν εἰς τὸ πεδίον. καὶ ἐγένετο ἐν τῷ εἶναι αὐτοὺς ἐν τῷ πεδίῳ καὶ ἀνέστη Καιν ἐπὶ Αβελ τὸν ἀδελφὸν αὐτοῦ καὶ ἀπέκτεινεν αὐτόν.',
      TgO: 'וַאֲמַר קַיִן לְוָת הֶבֶל אֲחוּהִי וַהֲוָה כַּד הֲוֹו בְחַקְלָא וְקָם קַיִן עַל הֶבֶל אֲחוּהִי וּקְטָלֵיהּ',
      Vg: 'Dixitque Cain ad Abel fratrem suum: Egrediamur foras. Cumque essent in agro, consurrexit Cain adversus fratrem suum Abel et interfecit eum.'
    },
    'Deuteronomy.32.8': {
      MT: 'בְּהַנְחֵ֤ל עֶלְיוֹן֙ גּוֹיִ֔ם בְּהַפְרִיד֖וֹ בְּנֵ֣י אָדָ֑ם יַצֵּב֙ גְּבֻלֹ֣ת עַמִּ֔ים לְמִסְפַּ֖ר בְּנֵ֥י יִשְׂרָאֵֽל׃',
      DSS: 'בהנחל עליון גוים בהפרידו בני אדם יצב גבולת עמים למספר בני אלהים',
      LXX: 'ὅτε διεμέριζεν ὁ ὕψιστος ἔθνη, ὡς διέσπειρεν υἱοὺς Αδαμ, ἔστησεν ὅρια ἐθνῶν κατὰ ἀριθμὸν ἀγγέλων θεοῦ.',
      TgO: 'בְּאַחֲסָנוּת עִלָּאָה עַמְמַיָּא בְּאַפְרָשׁוּתֵיהּ בְּנֵי נָשָׁא אַקֵּים תְּחוּמֵי עַמְמַיָּא לְמִנְיַן בְּנֵי יִשְׂרָאֵל',
      Vg: 'Quando dividebat Altissimus gentes, quando separabat filios Adam, constituit terminos populorum iuxta numerum filiorum Israel.'
    }
  };

  return sampleTexts[reference]?.[manuscriptId] || null;
};

// Get translation/gloss for non-Hebrew texts
const getTranslation = (manuscriptId, reference) => {
  const translations = {
    'Genesis.1.1': {
      LXX: 'In the beginning God made the heaven and the earth.',
      TgO: 'In the beginning the Lord created the heavens and the earth.',
      TgPJ: 'From the beginning with wisdom the Lord created and completed the heavens and the earth.',
      Pesh: 'In the beginning God created the heavens and the earth.',
      Vg: 'In the beginning God created heaven and earth.'
    },
    'Genesis.4.8': {
      LXX: 'And Cain said to Abel his brother, "Let us go out to the field." And it came to pass when they were in the field, Cain rose up against Abel his brother and killed him.',
      SP: '[Contains "Let us go to the field" - missing in MT]',
      DSS: '[Contains "Let us go to the field" - missing in MT]'
    },
    'Deuteronomy.32.8': {
      LXX: 'When the Most High divided the nations, when he separated the sons of Adam, he set the bounds of the nations according to the number of the angels of God.',
      DSS: '[Reads "sons of God/divine beings" instead of "sons of Israel"]'
    }
  };

  return translations[reference]?.[manuscriptId] || null;
};

const TextualCriticism = ({ book, chapter, verse, onClose }) => {
  const [selectedManuscripts, setSelectedManuscripts] = useState(['MT', 'LXX', 'TgO']);
  const [showTranslations, setShowTranslations] = useState(true);
  const [expandedMs, setExpandedMs] = useState(null);
  const [comparisonMode, setComparisonMode] = useState('parallel'); // 'parallel' | 'highlight'

  const reference = useMemo(() => `${book}.${chapter}.${verse}`, [book, chapter, verse]);

  // Get variant data
  const variantData = useMemo(() => getVariantsForVerse(reference), [reference]);
  const masoreticData = useMemo(() => getMasoreticNotes(reference), [reference]);

  // Toggle manuscript selection
  const toggleManuscript = (msId) => {
    setSelectedManuscripts(prev => {
      if (prev.includes(msId)) {
        return prev.filter(id => id !== msId);
      }
      return [...prev, msId];
    });
  };

  // Get significance class for variant
  const getSignificanceClass = (significance) => {
    switch (significance) {
      case 'major': return 'significance-major';
      case 'theological': return 'significance-theological';
      case 'messianic': return 'significance-messianic';
      case 'moderate': return 'significance-moderate';
      default: return 'significance-minor';
    }
  };

  return (
    <div className="textual-criticism-panel">
      {/* Header */}
      <div className="tc-header">
        <div className="tc-header-title">
          <span className="tc-icon">📊</span>
          <h3>Textual Criticism</h3>
          <span className="tc-reference">{book} {chapter}:{verse}</span>
        </div>
        <div className="tc-header-actions">
          <button
            className={`tc-mode-btn ${comparisonMode === 'parallel' ? 'active' : ''}`}
            onClick={() => setComparisonMode('parallel')}
            title="Side-by-side view"
          >
            ⊞ Parallel
          </button>
          <button
            className={`tc-mode-btn ${comparisonMode === 'highlight' ? 'active' : ''}`}
            onClick={() => setComparisonMode('highlight')}
            title="Highlight differences"
          >
            🔍 Highlight
          </button>
          <button
            className={`tc-toggle-btn ${showTranslations ? 'active' : ''}`}
            onClick={() => setShowTranslations(!showTranslations)}
            title="Toggle translations"
          >
            🌐 Translations
          </button>
          {onClose && (
            <button className="tc-close-btn" onClick={onClose} title="Close">×</button>
          )}
        </div>
      </div>

      {/* Manuscript Selector */}
      <div className="tc-manuscript-selector">
        <div className="tc-selector-label">Select Witnesses:</div>
        <div className="tc-manuscript-chips">
          {MANUSCRIPT_ORDER.map(msId => {
            const msInfo = MANUSCRIPT_INFO[msId];
            const isSelected = selectedManuscripts.includes(msId);
            const hasVariant = variantData?.variants?.some(v => v.source === msId);

            return (
              <button
                key={msId}
                className={`tc-ms-chip ${isSelected ? 'selected' : ''} ${hasVariant ? 'has-variant' : ''}`}
                onClick={() => toggleManuscript(msId)}
                title={`${msInfo.name} (${msInfo.language}, ${msInfo.date})`}
              >
                <span className="ms-chip-icon">{msInfo.icon}</span>
                <span className="ms-chip-label">{msId}</span>
                {hasVariant && <span className="ms-variant-dot" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Masoretic Notes */}
      {masoreticData?.hasVariants && (
        <div className="tc-masoretic-section">
          <div className="tc-section-header">
            <span className="tc-section-icon">📖</span>
            <span className="tc-section-title">Masoretic Notes</span>
          </div>

          {masoreticData.ketivQere?.length > 0 && (
            <div className="tc-masoretic-item kq">
              <div className="tc-kq-header">Ketiv/Qere (כתיב/קרי)</div>
              {masoreticData.ketivQere.map((kq, idx) => (
                <div key={idx} className="tc-kq-row">
                  <div className="tc-kq-pair">
                    <span className="tc-kq-label">Written:</span>
                    <span className="tc-kq-text hebrew">{kq.ketiv}</span>
                  </div>
                  <div className="tc-kq-pair">
                    <span className="tc-kq-label">Read:</span>
                    <span className="tc-kq-text hebrew">{kq.qere}</span>
                  </div>
                  {kq.notes && <div className="tc-kq-notes">{kq.notes}</div>}
                </div>
              ))}
            </div>
          )}

          {masoreticData.tiqqunSoferim && (
            <div className="tc-masoretic-item tiqqun">
              <div className="tc-tiqqun-header">Tiqqun Soferim (תיקון סופרים)</div>
              <div className="tc-tiqqun-row">
                <div className="tc-kq-pair">
                  <span className="tc-kq-label">Original:</span>
                  <span className="tc-kq-text hebrew">{masoreticData.tiqqunSoferim.original}</span>
                </div>
                <div className="tc-kq-pair">
                  <span className="tc-kq-label">Corrected:</span>
                  <span className="tc-kq-text hebrew">{masoreticData.tiqqunSoferim.corrected}</span>
                </div>
                {masoreticData.tiqqunSoferim.reason && (
                  <div className="tc-tiqqun-reason">{masoreticData.tiqqunSoferim.reason}</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manuscript Comparison Grid */}
      <div className={`tc-comparison-grid ${comparisonMode}`}>
        {selectedManuscripts.map(msId => {
          const msInfo = MANUSCRIPT_INFO[msId];
          const text = getSampleTextForManuscript(reference, msId);
          const translation = showTranslations ? getTranslation(msId, reference) : null;
          const hasVariant = variantData?.variants?.find(v => v.source === msId);

          return (
            <div
              key={msId}
              className={`tc-manuscript-card ${expandedMs === msId ? 'expanded' : ''} ${hasVariant ? getSignificanceClass(hasVariant.significance) : ''}`}
              onClick={() => setExpandedMs(expandedMs === msId ? null : msId)}
            >
              <div className="tc-card-header">
                <div className="tc-card-title">
                  <span className="tc-card-icon">{msInfo.icon}</span>
                  <span className="tc-card-name">{msInfo.name}</span>
                  <span className="tc-card-abbrev">({msId})</span>
                </div>
                <div className="tc-card-meta">
                  <span className="tc-meta-lang">{msInfo.language}</span>
                  <span className="tc-meta-date">{msInfo.date}</span>
                </div>
              </div>

              <div className="tc-card-content">
                {text ? (
                  <>
                    <div className={`tc-text-primary ${msId === 'MT' || msId === 'DSS' || msId === 'SP' ? 'hebrew' : msId === 'LXX' ? 'greek' : msId.startsWith('Tg') ? 'aramaic' : msId === 'Pesh' ? 'syriac' : ''}`}>
                      {text}
                    </div>
                    {translation && (
                      <div className="tc-text-translation">
                        {translation}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="tc-no-data">
                    {msId === 'MT' ? (
                      <span className="tc-mt-note">See main text display</span>
                    ) : (
                      <span className="tc-no-variant">No variant reading for this verse</span>
                    )}
                  </div>
                )}

                {hasVariant && (
                  <div className="tc-variant-note">
                    <span className={`tc-significance-badge ${getSignificanceClass(hasVariant.significance)}`}>
                      {hasVariant.significance}
                    </span>
                    {hasVariant.notes && <span className="tc-variant-notes">{hasVariant.notes}</span>}
                  </div>
                )}
              </div>

              {expandedMs === msId && (
                <div className="tc-card-expanded">
                  <div className="tc-expanded-row">
                    <span className="tc-expanded-label">Tradition:</span>
                    <span className="tc-expanded-value">{msInfo.tradition}</span>
                  </div>
                  <div className="tc-expanded-row">
                    <span className="tc-expanded-label">Description:</span>
                    <span className="tc-expanded-value">{msInfo.description}</span>
                  </div>
                  {hasVariant?.type && (
                    <div className="tc-expanded-row">
                      <span className="tc-expanded-label">Variant Type:</span>
                      <span className="tc-expanded-value">{hasVariant.type}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Variant Summary */}
      {variantData?.hasVariants && (
        <div className="tc-variant-summary">
          <div className="tc-section-header">
            <span className="tc-section-icon">📋</span>
            <span className="tc-section-title">Scholarly Analysis</span>
          </div>

          {variantData.analysis && (
            <div className="tc-analysis-content">
              {variantData.analysis.explanation && (
                <p className="tc-analysis-text">{variantData.analysis.explanation}</p>
              )}
              {variantData.analysis.implications?.length > 0 && (
                <div className="tc-implications">
                  <strong>Implications:</strong>
                  <ul>
                    {variantData.analysis.implications.map((impl, idx) => (
                      <li key={idx}>{impl}</li>
                    ))}
                  </ul>
                </div>
              )}
              {variantData.analysis.scholarship?.length > 0 && (
                <div className="tc-scholarship">
                  <strong>Scholarly References:</strong>
                  <ul>
                    {variantData.analysis.scholarship.map((ref, idx) => (
                      <li key={idx}>{ref}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="tc-footer">
        <div className="tc-footer-note">
          💡 Click manuscript cards for more details. Variants highlighted by scholarly significance.
        </div>
        <div className="tc-footer-legend">
          <span className="tc-legend-item major">Major</span>
          <span className="tc-legend-item theological">Theological</span>
          <span className="tc-legend-item messianic">Messianic</span>
          <span className="tc-legend-item moderate">Moderate</span>
          <span className="tc-legend-item minor">Minor</span>
        </div>
      </div>
    </div>
  );
};

export default TextualCriticism;
