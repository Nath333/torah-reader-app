/**
 * YeshivaTab - Unified Yeshiva-Style Learning Tools
 *
 * @deprecated PRO SCHOLAR V31: This component's features have been consolidated into:
 *   - NotebookTab: Questions (KushyaTracker), Insights, Progress
 *   - AIAnalysisTab: AI analysis with study modes
 *   - ChavrutaTab: Chavruta AI functionality
 *
 * This file is kept for reference but is not actively used in ScholarModePanel.
 * Consider importing from the consolidated components instead.
 *
 * Original features:
 * - Study Mode Selector (Iyun/Bekiut/Chazara) -> AIAnalysisTab
 * - Chavruta AI (study partner) -> ChavrutaTab
 * - Kushya Tracker (question tracking) -> NotebookTab/Questions
 * - Source Chain (commentator relationships) -> CommentaryTab
 * - Limmud Log (progress tracking) -> NotebookTab/Progress
 */

import React, { useState } from 'react';
import { useStudyMode, STUDY_MODES } from '../../context/StudyModeContext';
import StudyModeSelector from '../study/StudyModeSelector';
import ChavrutaAI from '../ai-tutor/ChavrutaAI';
import KushyaTracker from '../study/KushyaTracker';
import SourceChainView from '../shared/SourceChainView';
import LimmudLog from '../study/LimmudLog';
import './YeshivaTab.css';

const YeshivaTab = ({
  text,
  reference,
  selectedBook,
  selectedChapter,
  selectedVerse,
  commentaries = []
}) => {
  const { currentMode, features, addKushya } = useStudyMode();
  const [activeSection, setActiveSection] = useState('overview'); // overview, chavruta, kushyot, sources, log

  // Get current context for kushya tracking
  const currentContext = {
    book: selectedBook,
    chapter: selectedChapter,
    verse: selectedVerse?.verse,
    selectedText: null
  };

  // Handler for raising kushyot from Chavruta
  const handleKushyaRaised = (questionText) => {
    addKushya(questionText, currentContext);
    // Optionally switch to kushyot view
    setActiveSection('kushyot');
  };

  // Section navigation tabs
  const sections = [
    { id: 'overview', label: 'סקירה', icon: '📋', english: 'Overview' },
    { id: 'chavruta', label: 'חברותא', icon: '🎓', english: 'Chavruta' },
    { id: 'kushyot', label: 'קושיות', icon: '❓', english: 'Questions' },
    { id: 'sources', label: 'מקורות', icon: '📜', english: 'Sources' },
    { id: 'log', label: 'יומן', icon: '📚', english: 'Log' }
  ];

  return (
    <div className="yeshiva-tab">
      {/* Study Mode Selector - Always visible at top */}
      <StudyModeSelector compact={false} showDescription={true} />

      {/* Section Navigation */}
      <div className="section-nav">
        {sections.map(section => (
          <button
            key={section.id}
            className={`section-btn ${activeSection === section.id ? 'active' : ''}`}
            onClick={() => setActiveSection(section.id)}
          >
            <span className="section-icon">{section.icon}</span>
            <span className="section-label">{section.label}</span>
          </button>
        ))}
      </div>

      {/* Section Content */}
      <div className="section-content">
        {/* Overview Section */}
        {activeSection === 'overview' && (
          <div className="overview-section">
            <div className="mode-summary">
              <h3>Current Learning Mode</h3>
              <div className={`current-mode mode-${currentMode}`}>
                <span className="mode-name">
                  {currentMode === STUDY_MODES.IYUN && '🔬 עיון - Deep Study'}
                  {currentMode === STUDY_MODES.BEKIUS && '📖 בקיאות - Broad Coverage'}
                  {currentMode === STUDY_MODES.CHAZARA && '🔄 חזרה - Review Mode'}
                </span>
              </div>

              <div className="feature-list">
                <h4>Active Features:</h4>
                <ul>
                  {features.showAllCommentaries && <li>✅ Full Commentaries</li>}
                  {features.enableAI && <li>✅ AI Analysis</li>}
                  {features.showCrossRefs && <li>✅ Cross References</li>}
                  {features.showGrammar && <li>✅ Grammar Analysis</li>}
                  {features.enableChavruta && <li>✅ Chavruta Partner</li>}
                  {features.trackKushyot && <li>✅ Question Tracking</li>}
                  {features.enableSRS && <li>✅ Spaced Repetition</li>}
                  {features.enableTesting && <li>✅ Test Mode</li>}
                </ul>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="quick-stats">
              <h4>Today's Study</h4>
              <div className="stats-grid">
                <div className="stat-item">
                  <span className="stat-value">—</span>
                  <span className="stat-label">Minutes</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">—</span>
                  <span className="stat-label">Verses</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">—</span>
                  <span className="stat-label">Kushyot</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="quick-actions">
              <button
                className="action-card"
                onClick={() => setActiveSection('chavruta')}
              >
                <span className="action-icon">🎓</span>
                <span className="action-text">Start Chavruta</span>
              </button>
              <button
                className="action-card"
                onClick={() => setActiveSection('kushyot')}
              >
                <span className="action-icon">❓</span>
                <span className="action-text">Add Question</span>
              </button>
              <button
                className="action-card"
                onClick={() => setActiveSection('log')}
              >
                <span className="action-icon">✨</span>
                <span className="action-text">Log Chiddush</span>
              </button>
            </div>
          </div>
        )}

        {/* Chavruta Section */}
        {activeSection === 'chavruta' && (
          <div className="chavruta-section">
            <ChavrutaAI
              currentText={text}
              currentReference={reference}
              commentaries={commentaries}
              onKushyaRaised={handleKushyaRaised}
            />
          </div>
        )}

        {/* Kushyot Section */}
        {activeSection === 'kushyot' && (
          <div className="kushyot-section">
            <KushyaTracker
              currentContext={currentContext}
              showAddForm={true}
              filterByContext={false}
            />
          </div>
        )}

        {/* Sources Section */}
        {activeSection === 'sources' && (
          <div className="sources-section">
            <SourceChainView
              commentaries={commentaries}
              showAll={commentaries.length === 0}
              viewMode="timeline"
            />
          </div>
        )}

        {/* Log Section */}
        {activeSection === 'log' && (
          <div className="log-section">
            <LimmudLog
              currentBook={selectedBook}
              currentChapter={selectedChapter}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default YeshivaTab;
