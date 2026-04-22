/**
 * WordsTab - Split Architecture
 * 
 * Main container component that switches between 4 sub-tabs:
 * 1. LookupTab - Dictionary search (BDB, Jastrow, CAL, Strong's)
 * 2. VocabularyTab - SRS flashcards and vocabulary management
 * 3. TropTab - Cantillation marks analysis
 * 4. TextAnalysisTab - Grammar, Masoretic text, Manuscripts
 */

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useVocabulary } from '../../../hooks';
import LookupTab from './components/LookupTab';
import VocabularyTab from './components/VocabularyTab';
import TropTab from './components/TropTab';
import TextAnalysisTab from './components/TextAnalysisTab';
import './WordsTab.css';

const WordsTab = React.memo(function WordsTab({ 
  onClose, 
  showFrench = false, 
  verseText = '', 
  verseRef = '', 
  initialWord = null, 
  onWordLookupComplete = null 
}) {
  const [activeSubTab, setActiveSubTab] = useState('lookup');
  const { dueToday } = useVocabulary();

  // Switch to lookup tab when initialWord is provided
  useEffect(() => {
    if (initialWord) {
      setActiveSubTab('lookup');
    }
  }, [initialWord]);

  return (
    <div className="words-tab">
      <div className="words-subtab-nav">
        <button 
          className={`words-subtab ${activeSubTab === 'lookup' ? 'active' : ''}`} 
          onClick={() => setActiveSubTab('lookup')}
        >
          <span className="subtab-icon">🔍</span>
          <span className="subtab-label">Lookup</span>
        </button>
        
        <button 
          className={`words-subtab ${activeSubTab === 'vocabulary' ? 'active' : ''}`} 
          onClick={() => setActiveSubTab('vocabulary')}
        >
          <span className="subtab-icon">📚</span>
          <span className="subtab-label">Words</span>
          {dueToday > 0 && <span className="due-badge">{dueToday}</span>}
        </button>
        
        <button 
          className={`words-subtab ${activeSubTab === 'trop' ? 'active' : ''}`} 
          onClick={() => setActiveSubTab('trop')}
        >
          <span className="subtab-icon">🎵</span>
          <span className="subtab-label">Trop</span>
        </button>
        
        <button 
          className={`words-subtab ${activeSubTab === 'text' ? 'active' : ''}`} 
          onClick={() => setActiveSubTab('text')}
        >
          <span className="subtab-icon">📜</span>
          <span className="subtab-label">Text</span>
        </button>
        
        {/* Debug tab (development only) */}
        {process.env.NODE_ENV === 'development' && (
          <button 
            className={`words-subtab words-subtab-debug ${activeSubTab === 'debug' ? 'active' : ''}`} 
            onClick={() => setActiveSubTab('debug')}
          >
            <span className="subtab-icon">📊</span>
            <span className="subtab-label">Debug</span>
          </button>
        )}
      </div>
      
      <div className="words-subtab-content">
        {activeSubTab === 'lookup' && (
          <LookupTab
            onClose={onClose}
            showFrench={showFrench}
            initialWord={initialWord}
            onLookupComplete={onWordLookupComplete}
          />
        )}
        
        {activeSubTab === 'vocabulary' && (
          <VocabularyTab showFrench={showFrench} />
        )}
        
        {activeSubTab === 'trop' && (
          <TropTab verseText={verseText} verseRef={verseRef} />
        )}
        
        {activeSubTab === 'text' && (
          <TextAnalysisTab verseText={verseText} verseRef={verseRef} />
        )}
        
        {/* Debug panel (development only) */}
        {activeSubTab === 'debug' && process.env.NODE_ENV === 'development' && (
          <div className="debug-section">
            <p>Debug mode active</p>
          </div>
        )}
      </div>
    </div>
  );
});

WordsTab.propTypes = {
  onClose: PropTypes.func,
  showFrench: PropTypes.bool,
  verseText: PropTypes.string,
  verseRef: PropTypes.string,
  initialWord: PropTypes.string,
  onWordLookupComplete: PropTypes.func
};

export default WordsTab;
