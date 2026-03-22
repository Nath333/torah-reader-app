/**
 * ChavrutaTab - Unified Study Partner Experience
 *
 * Consolidates all interactive study features:
 * - Chat: AI study partner (from TutorChat)
 * - Quiz: Test your understanding (from QuizMode)
 * - Challenge: Devil's advocate mode (from ChavrutaAI)
 * - Compare: Side-by-side commentators + Chain of Tradition
 *
 * This is how you learn in a real yeshiva - with a chavruta!
 */

import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { TutorChat, QuizMode } from '../ai-tutor';
import ChavrutaAI from '../ai-tutor/ChavrutaAI';
import SourceChainView from '../shared/SourceChainView';
import './ChavrutaTab.css';

// =============================================================================
// Sub-tab configurations
// =============================================================================
const SUB_TABS = [
  { id: 'chat', label: 'שיחה', sublabel: 'Chat', icon: '💬', description: 'Ask questions, get explanations' },
  { id: 'quiz', label: 'בחינה', sublabel: 'Quiz', icon: '🎯', description: 'Test your understanding' },
  { id: 'challenge', label: 'אתגר', sublabel: 'Challenge', icon: '⚔️', description: "Devil's advocate mode" },
  { id: 'compare', label: 'השוואה', sublabel: 'Compare', icon: '👥', description: 'Side-by-side commentators' }
];

// =============================================================================
// Commentator Comparison Component (from KnowledgeGraph ChavrusaView)
// Enhanced with SourceChainView for Chain of Tradition
// =============================================================================
const CommentatorComparison = ({ commentaries, reference }) => {
  const [selected, setSelected] = useState(['rashi', 'ramban']);
  const [viewMode, setViewMode] = useState('texts'); // 'texts' | 'chain' | 'both'

  // Extract unique commentators from commentaries
  const availableCommentators = React.useMemo(() => {
    if (!commentaries || commentaries.length === 0) return [];

    const commentatorMap = {};
    commentaries.forEach(c => {
      const name = c.commentator || c.collectiveTitle || 'Unknown';
      const key = name.toLowerCase().replace(/[^a-z]/g, '');
      if (!commentatorMap[key]) {
        commentatorMap[key] = {
          id: key,
          name: name,
          text: c.he || c.text || '',
          english: c.text || ''
        };
      }
    });
    return Object.values(commentatorMap);
  }, [commentaries]);

  const selectedCommentators = availableCommentators.filter(c =>
    selected.includes(c.id)
  );

  const toggleCommentator = (id) => {
    if (selected.includes(id)) {
      if (selected.length > 1) {
        setSelected(selected.filter(s => s !== id));
      }
    } else if (selected.length < 3) {
      setSelected([...selected, id]);
    }
  };

  // Extract commentator names for SourceChainView
  const commentatorNames = React.useMemo(() => {
    return availableCommentators.map(c => c.name);
  }, [availableCommentators]);

  if (availableCommentators.length === 0) {
    return (
      <div className="compare-empty">
        <div className="empty-icon">👥</div>
        <h4>No Commentaries Available</h4>
        <p>Select verses with commentaries to compare different approaches.</p>
        {/* Show all commentators for learning */}
        <div className="show-all-chain">
          <h5>📜 Explore Chain of Tradition</h5>
          <SourceChainView
            commentaries={[]}
            showAll={true}
            viewMode="list"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="commentator-comparison">
      {/* View mode toggle */}
      <div className="compare-view-toggle">
        <button
          className={`toggle-btn ${viewMode === 'texts' ? 'active' : ''}`}
          onClick={() => setViewMode('texts')}
          title="Compare commentary texts"
        >
          📝 Texts
        </button>
        <button
          className={`toggle-btn ${viewMode === 'chain' ? 'active' : ''}`}
          onClick={() => setViewMode('chain')}
          title="View chain of tradition"
        >
          📜 Chain
        </button>
        <button
          className={`toggle-btn ${viewMode === 'both' ? 'active' : ''}`}
          onClick={() => setViewMode('both')}
          title="Show both views"
        >
          ⚡ Both
        </button>
      </div>

      {/* Chain of Tradition View */}
      {(viewMode === 'chain' || viewMode === 'both') && (
        <div className="chain-section">
          <SourceChainView
            commentaries={commentatorNames}
            showAll={false}
            viewMode="timeline"
            onSelectCommentator={(comm) => {
              // Add to selected for text comparison
              if (comm && !selected.includes(comm.key) && selected.length < 3) {
                setSelected([...selected, comm.key]);
              }
            }}
          />
        </div>
      )}

      {/* Text Comparison View */}
      {(viewMode === 'texts' || viewMode === 'both') && (
        <>
          {/* Commentator selector */}
          <div className="commentator-selector">
            <span className="selector-label">Compare texts (select up to 3):</span>
            <div className="commentator-chips">
              {availableCommentators.slice(0, 10).map(c => (
                <button
                  key={c.id}
                  className={`commentator-chip ${selected.includes(c.id) ? 'selected' : ''}`}
                  onClick={() => toggleCommentator(c.id)}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Side-by-side comparison */}
          <div className="comparison-grid" style={{ gridTemplateColumns: `repeat(${selectedCommentators.length}, 1fr)` }}>
            {selectedCommentators.map(c => (
              <div key={c.id} className="commentary-column">
                <div className="column-header">
                  <span className="commentator-name">{c.name}</span>
                </div>
                <div className="column-content">
                  {c.text && (
                    <div className="hebrew-text" dir="rtl">
                      {c.text.length > 500 ? c.text.substring(0, 500) + '...' : c.text}
                    </div>
                  )}
                  {c.english && c.english !== c.text && (
                    <div className="english-text">
                      {c.english.length > 400 ? c.english.substring(0, 400) + '...' : c.english}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Quick comparison questions */}
          <div className="comparison-questions">
            <h4>🤔 Questions to Consider</h4>
            <ul>
              <li>Where do these commentators agree?</li>
              <li>What's the root cause of their disagreement?</li>
              <li>What's the נפקא מינה (practical difference)?</li>
              <li>Which approach resonates more with you?</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
};

// =============================================================================
// Main ChavrutaTab Component
// =============================================================================
const ChavrutaTab = ({
  text,
  reference,
  hebrewText,
  commentaries = [],
  selectedBook,
  selectedChapter,
  selectedVerse
}) => {
  const [activeSubTab, setActiveSubTab] = useState('chat');
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Handle sub-tab switch with brief transition
  const handleSubTabSwitch = useCallback((newTab) => {
    if (newTab === activeSubTab) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveSubTab(newTab);
      setIsTransitioning(false);
    }, 150);
  }, [activeSubTab]);

  // Validate we have content
  const hasContent = text && text.trim().length > 0;

  // Empty state
  if (!hasContent) {
    return (
      <div className="chavruta-tab">
        <div className="chavruta-empty-state">
          <div className="empty-icon">🎓</div>
          <h3>Select Text to Study</h3>
          <p>Choose verses to begin your chavruta session.</p>
          <div className="empty-features">
            {SUB_TABS.map(tab => (
              <div key={tab.id} className="feature">
                <span className="feature-icon">{tab.icon}</span>
                <span className="feature-text">{tab.sublabel} - {tab.description}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chavruta-tab">
      {/* Sub-tab navigation */}
      <div className="chavruta-sub-tabs">
        {SUB_TABS.map(tab => (
          <button
            key={tab.id}
            className={`sub-tab-btn ${activeSubTab === tab.id ? 'active' : ''}`}
            onClick={() => handleSubTabSwitch(tab.id)}
            disabled={isTransitioning}
          >
            <span className="sub-tab-icon">{tab.icon}</span>
            <span className="sub-tab-label">{tab.label}</span>
            <span className="sub-tab-sublabel">{tab.sublabel}</span>
          </button>
        ))}
      </div>

      {/* Context bar */}
      {reference && (
        <div className="chavruta-context-bar">
          <span className="context-icon">📜</span>
          <span className="context-ref">{reference}</span>
          {hebrewText && (
            <span className="context-preview" dir="rtl">
              {hebrewText.substring(0, 50)}{hebrewText.length > 50 ? '...' : ''}
            </span>
          )}
        </div>
      )}

      {/* Content area */}
      <div className={`chavruta-content ${isTransitioning ? 'transitioning' : ''}`}>
        {/* Chat - AI Study Partner */}
        {activeSubTab === 'chat' && (
          <TutorChat
            textContent={text}
            textRef={reference || 'Selected Text'}
            hebrewText={hebrewText}
          />
        )}

        {/* Quiz - Test Understanding */}
        {activeSubTab === 'quiz' && (
          <QuizMode
            textContent={text}
            textRef={reference || 'Selected Text'}
          />
        )}

        {/* Challenge - Devil's Advocate */}
        {activeSubTab === 'challenge' && (
          <ChavrutaAI
            currentText={text}
            currentReference={reference}
            commentaries={commentaries}
          />
        )}

        {/* Compare - Side-by-side Commentators */}
        {activeSubTab === 'compare' && (
          <CommentatorComparison
            commentaries={commentaries}
            reference={reference}
          />
        )}
      </div>
    </div>
  );
};

ChavrutaTab.propTypes = {
  text: PropTypes.string,
  reference: PropTypes.string,
  hebrewText: PropTypes.string,
  commentaries: PropTypes.array,
  selectedBook: PropTypes.string,
  selectedChapter: PropTypes.number,
  selectedVerse: PropTypes.object
};

export default ChavrutaTab;
