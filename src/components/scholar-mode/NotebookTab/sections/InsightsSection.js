import React, { useState, useCallback } from 'react';
import useLocalStorage from '../../../../hooks/useLocalStorage';

// =============================================================================
// Insights Section (Chiddushim from LimmudLog)
// =============================================================================
export const InsightsSection = ({ currentBook, currentChapter }) => {
  const [learningLog, setLearningLog] = useLocalStorage('limmudLog', {
    entries: [],
    chiddushim: []
  });

  const [newInsight, setNewInsight] = useState('');
  const [source, setSource] = useState('');

  const addInsight = useCallback(() => {
    if (!newInsight.trim()) return;

    const insight = {
      id: `insight_${Date.now()}`,
      text: newInsight.trim(),
      source: source.trim() || null,
      reference: currentBook && currentChapter
        ? `${currentBook} ${currentChapter}`
        : 'General',
      timestamp: Date.now()
    };

    setLearningLog(prev => ({
      ...prev,
      chiddushim: [insight, ...prev.chiddushim]
    }));

    setNewInsight('');
    setSource('');
  }, [newInsight, source, currentBook, currentChapter, setLearningLog]);

  const deleteInsight = useCallback((id) => {
    setLearningLog(prev => ({
      ...prev,
      chiddushim: prev.chiddushim.filter(c => c.id !== id)
    }));
  }, [setLearningLog]);

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('he-IL', {
      day: 'numeric',
      month: 'short'
    });
  };

  return (
    <div className="insights-section">
      {/* Add Insight Form */}
      <div className="add-form">
        <textarea
          value={newInsight}
          onChange={(e) => setNewInsight(e.target.value)}
          placeholder="Write your chiddush (novel insight)..."
          rows={3}
        />
        <input
          type="text"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="Source/Inspiration (optional)"
        />
        <button
          className="btn-primary"
          onClick={addInsight}
          disabled={!newInsight.trim()}
        >
          ✨ Save Insight
        </button>
      </div>

      {/* Insights List */}
      <div className="insights-list">
        {learningLog.chiddushim.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">✨</span>
            <p>No insights recorded yet.</p>
            <p className="hebrew-quote">אין בית המדרש בלא חידוש</p>
            <p className="translation">"No study hall without novel insights"</p>
          </div>
        ) : (
          learningLog.chiddushim.map(insight => (
            <div key={insight.id} className="insight-item">
              <div className="insight-header">
                <span className="insight-ref">{insight.reference}</span>
                <span className="insight-date">{formatDate(insight.timestamp)}</span>
              </div>
              <p className="insight-text">{insight.text}</p>
              {insight.source && (
                <div className="insight-source">Based on: {insight.source}</div>
              )}
              <button
                className="delete-btn"
                onClick={() => deleteInsight(insight.id)}
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
