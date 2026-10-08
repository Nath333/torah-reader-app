import React, { useState, useCallback } from 'react';
import { useStudyMode } from '../../../../context/StudyModeContext';

// =============================================================================
// Questions Section (from KushyaTracker)
// =============================================================================
export const QuestionsSection = ({ currentContext }) => {
  const {
    kushyot = [],
    addKushya,
    resolveKushya,
    deferKushya,
    deleteKushya,
    getOpenKushyot
  } = useStudyMode();

  const [newQuestion, setNewQuestion] = useState('');
  const [priority, setPriority] = useState('normal');
  const [filter, setFilter] = useState('open');
  const [expandedId, setExpandedId] = useState(null);
  const [resolvingId, setResolvingId] = useState(null);
  const [terutz, setTerutz] = useState('');

  const filteredKushyot = kushyot.filter(k => {
    if (filter === 'all') return true;
    return k.status === filter;
  });

  const openCount = getOpenKushyot?.()?.length || 0;

  const handleAddQuestion = useCallback(() => {
    if (newQuestion.trim() && addKushya) {
      addKushya(newQuestion.trim(), { ...currentContext, priority });
      setNewQuestion('');
      setPriority('normal');
    }
  }, [newQuestion, currentContext, priority, addKushya]);

  const handleResolve = useCallback((id) => {
    if (terutz.trim() && resolveKushya) {
      resolveKushya(id, terutz.trim());
      setTerutz('');
      setResolvingId(null);
    }
  }, [terutz, resolveKushya]);

  const formatRef = (ctx) => {
    if (!ctx) return '';
    return `${ctx.book} ${ctx.chapter}:${ctx.verse}`;
  };

  const priorityColors = {
    low: '#94a3b8',
    normal: '#3b82f6',
    high: '#f59e0b',
    critical: '#ef4444'
  };

  return (
    <div className="questions-section">
      {/* Add Question Form */}
      <div className="add-form">
        <textarea
          value={newQuestion}
          onChange={(e) => setNewQuestion(e.target.value)}
          placeholder="מה הקושיא? What's your question about this text?"
          rows={2}
        />
        <div className="form-row">
          <select value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          <button
            className="btn-primary"
            onClick={handleAddQuestion}
            disabled={!newQuestion.trim()}
          >
            Add Question
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        {['open', 'resolved', 'deferred', 'all'].map(f => (
          <button
            key={f}
            className={`filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f === 'open' && openCount > 0 && (
              <span className="count">{openCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Questions List */}
      <div className="questions-list">
        {filteredKushyot.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📚</span>
            <p>No {filter === 'all' ? '' : filter} questions.</p>
            <p className="hebrew-quote">אין לומדין תורה אלא מתוך קושיא</p>
          </div>
        ) : (
          filteredKushyot.map(k => (
            <div
              key={k.id}
              className={`question-item status-${k.status}`}
            >
              <div
                className="question-header"
                onClick={() => setExpandedId(expandedId === k.id ? null : k.id)}
              >
                <span className="status-icon">
                  {k.status === 'resolved' ? '✅' : k.status === 'deferred' ? '⏳' : '❓'}
                </span>
                <div className="question-main">
                  <p className="question-text">{k.text}</p>
                  <div className="question-meta">
                    <span
                      className="priority-badge"
                      style={{ backgroundColor: priorityColors[k.priority] }}
                    >
                      {k.priority}
                    </span>
                    {k.context && (
                      <span className="context-ref">{formatRef(k.context)}</span>
                    )}
                  </div>
                </div>
                <span className="expand-icon">{expandedId === k.id ? '▼' : '▶'}</span>
              </div>

              {expandedId === k.id && (
                <div className="question-body">
                  {k.status === 'resolved' && k.terutz && (
                    <div className="terutz-display">
                      <div className="terutz-label">תירוץ:</div>
                      <p>{k.terutz}</p>
                    </div>
                  )}

                  {k.status === 'open' && resolvingId !== k.id && (
                    <div className="question-actions">
                      <button onClick={() => setResolvingId(k.id)}>✅ Resolve</button>
                      <button onClick={() => deferKushya?.(k.id)}>⏳ Defer</button>
                      <button onClick={() => deleteKushya?.(k.id)}>🗑️ Delete</button>
                    </div>
                  )}

                  {resolvingId === k.id && (
                    <div className="resolve-form">
                      <textarea
                        value={terutz}
                        onChange={(e) => setTerutz(e.target.value)}
                        placeholder="Enter the terutz (answer)..."
                        rows={2}
                      />
                      <div className="form-actions">
                        <button onClick={() => handleResolve(k.id)} disabled={!terutz.trim()}>
                          Save
                        </button>
                        <button onClick={() => { setResolvingId(null); setTerutz(''); }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
