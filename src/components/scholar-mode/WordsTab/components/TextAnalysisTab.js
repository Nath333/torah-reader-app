/**
 * TextAnalysisTab Component
 *
 * Textual analysis including:
 * - Grammar analysis (morphological breakdown)
 * - Masoretic text variants (ketiv/qere, tiqqun soferim)
 * - Manuscript comparisons (Dead Sea Scrolls, Septuagint, etc.)
 */

import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import TextualCriticism from '../../../analysis/TextualCriticism';
import { getMasoreticNotes, KETIV_QERE_TYPE_LABELS } from '../../../../services/textual/masoreticService';
import { analyzePhrase, GRAMMAR_CONSTANTS } from '../../../../services/analysis/grammarAnalysisService';
import './TextAnalysisTab.css';

const TextAnalysisTab = React.memo(function TextAnalysisTab({ verseText, verseRef }) {
  const [activeView, setActiveView] = useState('grammar');
  
  const grammarAnalysis = useMemo(() => 
    verseText ? analyzePhrase(verseText) : [], 
    [verseText]
  );
  
  const masoreticData = useMemo(() => 
    verseRef ? getMasoreticNotes(verseRef) : null, 
    [verseRef]
  );

  // Parse verseRef to get book, chapter, verse for TextualCriticism
  const parsedRef = useMemo(() => {
    if (!verseRef) return null;
    // Parse "Genesis 1:1" or "Genesis.1.1" format
    const match = verseRef.match(/^(\w+)[\s.](\d+)[:.](\d+)/);
    if (match) {
      return { 
        book: match[1], 
        chapter: parseInt(match[2]), 
        verse: parseInt(match[3]) 
      };
    }
    return null;
  }, [verseRef]);

  if (!verseText && !verseRef) {
    return (
      <div className="text-analysis-tab empty">
        <span className="empty-icon">📜</span>
        <h5>No Verse Selected</h5>
        <p>Select a verse for textual analysis including grammar, Masoretic notes, and manuscript variants.</p>
      </div>
    );
  }

  return (
    <div className="text-analysis-tab">
      <div className="textual-view-toggle">
        <button 
          className={activeView === 'grammar' ? 'active' : ''} 
          onClick={() => setActiveView('grammar')}
        >
          📝 Grammar
        </button>
        <button 
          className={activeView === 'masoretic' ? 'active' : ''} 
          onClick={() => setActiveView('masoretic')}
        >
          ✡️ Masorah
        </button>
        <button 
          className={activeView === 'manuscripts' ? 'active' : ''} 
          onClick={() => setActiveView('manuscripts')}
        >
          📜 MSS
        </button>
      </div>

      {activeView === 'grammar' && (
        <div className="grammar-view">
          <h5>Morphological Analysis</h5>
          {grammarAnalysis.length > 0 ? (
            <div className="grammar-words">
              {grammarAnalysis.map((w, i) => (
                <div key={i} className="grammar-word-card">
                  <span className="word-hebrew" dir="rtl">{w.word}</span>
                  <div className="word-info">
                    {w.prefixes?.length > 0 && (
                      <span className="prefixes">
                        {w.prefixes.map(p => 
                          `${p.letter}(${p.meaning?.split('/')[0] || p.letter})`
                        ).join('+')}
                      </span>
                    )}
                    {w.root && w.rootInfo && (
                      <span className="root" title={w.rootInfo.category || ''}>
                        שורש: {w.root} ({w.rootInfo.meaning})
                        {w.rootInfo.isAramaic && (
                          <span className="aramaic-badge">ארמ׳</span>
                        )}
                      </span>
                    )}
                    {w.root && !w.rootInfo && !w.uncertain && (
                      <span className="root">שורש: {w.root}</span>
                    )}
                    {w.isTalmudicTerm && (
                      <span className="talmudic-term-badge" title="Talmudic term">📜</span>
                    )}
                    <span className="pos">
                      {w.partOfSpeech?.abbr || 
                        (w.partOfSpeech?.name ? w.partOfSpeech.name[0] : '')}
                    </span>
                    {w.binyan && <span className="binyan">{w.binyan.hebrew}</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-data">No grammar data available for this text.</p>
          )}
          
          <details className="binyan-ref">
            <summary>Binyanim Reference</summary>
            <div className="binyan-grid">
              {Object.entries(GRAMMAR_CONSTANTS.BINYANIM).map(([k, b]) => (
                <div key={k}>
                  <b>{b.hebrew}</b> {b.name} - {b.meaning}
                </div>
              ))}
            </div>
          </details>
        </div>
      )}

      {activeView === 'masoretic' && (
        <div className="masoretic-view">
          <h5>Masoretic Notes</h5>
          {masoreticData?.hasVariants ? (
            <div className="masoretic-content">
              {masoreticData.ketivQere.map((kq, i) => (
                <div key={i} className="kq-item">
                  <div>
                    <b>כתיב:</b> <span dir="rtl">{kq.ketiv}</span> → 
                    <b>קרי:</b> <span dir="rtl">{kq.qere}</span>
                  </div>
                  <div className="kq-type">{KETIV_QERE_TYPE_LABELS[kq.type]}</div>
                  {kq.notes && <p className="notes">{kq.notes}</p>}
                </div>
              ))}
              {masoreticData.tiqqunSoferim && (
                <div className="tiqqun">
                  <b>Tiqqun Soferim:</b> {masoreticData.tiqqunSoferim.reason}
                </div>
              )}
            </div>
          ) : (
            <div className="no-variants">
              ✓ No Masoretic variants for this verse
            </div>
          )}
        </div>
      )}

      {activeView === 'manuscripts' && parsedRef && (
        <TextualCriticism
          book={parsedRef.book}
          chapter={parsedRef.chapter}
          verse={parsedRef.verse}
        />
      )}

      {activeView === 'manuscripts' && !parsedRef && (
        <div className="no-variants">
          Select a verse to see manuscript variants
        </div>
      )}
    </div>
  );
});

TextAnalysisTab.propTypes = {
  verseText: PropTypes.string,
  verseRef: PropTypes.string
};

export default TextAnalysisTab;
