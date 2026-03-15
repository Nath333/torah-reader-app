/**
 * LexiconTab - Hebrew/Aramaic word lookup from scholarly lexicons
 * Sources: BDB, Jastrow, Strong's Concordance
 */
import React, { useState } from 'react';
import { scholarlyLookup, getEtymology, SCHOLARLY_SOURCES } from '../../services/scholarlyLexiconService';

const LexiconTab = React.memo(({ onClose }) => {
  const [word, setWord] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [etymology, setEtymology] = useState(null);
  const [error, setError] = useState(null);

  const handleLookup = async () => {
    if (!word.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setEtymology(null);

    try {
      const [lookupResult, etymResult] = await Promise.all([
        scholarlyLookup(word),
        getEtymology(word)
      ]);

      if (lookupResult) {
        setResult(lookupResult);
        setEtymology(etymResult);
      } else {
        setError('Word not found in scholarly lexicons');
      }
    } catch (err) {
      setError(err.message || 'Lookup failed');
    }

    setLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleLookup();
  };

  return (
    <div className="lexicon-tab">
      <div className="lookup-header">
        <span className="lookup-icon">📖</span>
        <h4>Hebrew Word Lookup</h4>
        <span className="lookup-sources">BDB • Jastrow • Strong's</span>
        {onClose && <button className="lookup-close" onClick={onClose}>×</button>}
      </div>

      <div className="lookup-input-group">
        <input
          type="text"
          value={word}
          onChange={(e) => setWord(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Enter Hebrew word..."
          className="hebrew-input"
          dir="rtl"
        />
        <button
          onClick={handleLookup}
          disabled={loading || !word.trim()}
          className="lookup-btn"
        >
          {loading ? '...' : '🔍'}
        </button>
      </div>

      {error && <div className="lookup-error">{error}</div>}

      {result && (
        <div className="lookup-result">
          <div className="lookup-word-header">
            <span className="lookup-headword">{result.cleaned}</span>
            {result.root && <span className="lookup-root">שורש: {result.root}</span>}
            <span className="lookup-lang">{result.language}</span>
          </div>

          {result.primaryDefinition && (
            <div className="lookup-primary-def">
              {result.primaryDefinition}
            </div>
          )}

          {/* BDB Entry */}
          {result.sources?.bdb && (
            <div className="lexicon-entry bdb-entry">
              <div className="lexicon-header">
                <span className="lexicon-name">{SCHOLARLY_SOURCES.BDB.abbreviation}</span>
                <span className="lexicon-full">{SCHOLARLY_SOURCES.BDB.name}</span>
                {result.sources.bdb.strongNumber && (
                  <span className="strong-num">H{result.sources.bdb.strongNumber}</span>
                )}
              </div>
              {result.sources.bdb.definitions?.slice(0, 3).map((def, i) => (
                <div key={i} className="lexicon-def">
                  <span className="def-num">{i + 1}.</span>
                  <span className="def-text">{def.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* Jastrow Entry (Aramaic) */}
          {result.sources?.jastrow && (
            <div className="lexicon-entry jastrow-entry">
              <div className="lexicon-header">
                <span className="lexicon-name">{SCHOLARLY_SOURCES.JASTROW.abbreviation}</span>
                <span className="lexicon-full">{SCHOLARLY_SOURCES.JASTROW.name}</span>
                <span className="lexicon-lang">Aramaic</span>
              </div>
              {result.sources.jastrow.definitions?.slice(0, 2).map((def, i) => (
                <div key={i} className="lexicon-def">
                  <span className="def-text">{def.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* Strong's Entry */}
          {result.sources?.strongs && (
            <div className="lexicon-entry strongs-entry">
              <div className="lexicon-header">
                <span className="lexicon-name">{SCHOLARLY_SOURCES.STRONGS.abbreviation}</span>
                <span className="lexicon-full">{SCHOLARLY_SOURCES.STRONGS.name}</span>
                {result.sources.strongs.number && (
                  <span className="strong-num">H{result.sources.strongs.number}</span>
                )}
              </div>
              {result.sources.strongs.definition && (
                <div className="lexicon-def">
                  <span className="def-text">{result.sources.strongs.definition}</span>
                </div>
              )}
            </div>
          )}

          {/* Cognate Information */}
          {etymology?.analysis && (
            <div className="etymology-section">
              <div className="etymology-header">
                <span className="etym-icon">🌍</span>
                <span className="etym-title">Cognate Languages</span>
              </div>
              {etymology.analysis.semanticCore && (
                <div className="semantic-core">
                  Core meaning: <strong>{etymology.analysis.semanticCore}</strong>
                </div>
              )}
              {etymology.analysis.relatedWords && (
                <div className="cognate-list">
                  {etymology.analysis.relatedWords.map((cog, i) => (
                    <span key={i} className="cognate-chip">{cog}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Grammar Info */}
          {result.grammar && (
            <div className="grammar-info">
              {result.grammar.partOfSpeech && (
                <span className="grammar-tag pos">{result.grammar.partOfSpeech}</span>
              )}
              {result.grammar.gender && (
                <span className="grammar-tag gender">{result.grammar.gender}</span>
              )}
              {result.grammar.number && (
                <span className="grammar-tag number">{result.grammar.number}</span>
              )}
            </div>
          )}
        </div>
      )}

      {!result && !loading && !error && (
        <div className="lookup-hint">
          <p>Enter a Hebrew word to look up definitions from:</p>
          <div className="source-badges">
            <span className="source-badge">📘 BDB (Biblical)</span>
            <span className="source-badge">📗 Jastrow (Talmudic)</span>
            <span className="source-badge">📕 Strong's Concordance</span>
          </div>
        </div>
      )}
    </div>
  );
});

export default LexiconTab;
