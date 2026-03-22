/**
 * KushyaTracker - Question Tracking System
 *
 * In yeshiva learning, tracking "kushyot" (questions/difficulties) is essential.
 * A good learner raises questions, marks them, and returns to resolve them.
 *
 * Features:
 * - Add questions (kushyot) while learning
 * - Mark as resolved with terutz (answer)
 * - Defer for later investigation
 * - Track where questions came from
 * - Filter by status, context, priority
 */

import React, { useState, useCallback } from 'react';
import { useStudyMode } from '../../context/StudyModeContext';
import './KushyaTracker.css';

// =============================================================================
// Kushya Item Component
// =============================================================================

const KushyaItem = ({ kushya, onResolve, onDefer, onDelete, expanded, onToggle }) => {
  const [terutz, setTerutz] = useState('');
  const [source, setSource] = useState('');
  const [showResolveForm, setShowResolveForm] = useState(false);

  const statusIcons = {
    open: '❓',
    resolved: '✅',
    deferred: '⏳'
  };

  const priorityColors = {
    low: '#95a5a6',
    normal: '#3498db',
    high: '#e67e22',
    critical: '#e74c3c'
  };

  const handleResolve = () => {
    if (terutz.trim()) {
      onResolve(kushya.id, terutz.trim(), source.trim() || null);
      setTerutz('');
      setSource('');
      setShowResolveForm(false);
    }
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('he-IL', {
      day: 'numeric',
      month: 'short'
    });
  };

  const formatReference = (context) => {
    if (!context) return '';
    const { book, chapter, verse } = context;
    return `${book} ${chapter}:${verse}`;
  };

  return (
    <div className={`kushya-item status-${kushya.status}`}>
      <div className="kushya-header" onClick={onToggle}>
        <span className="status-icon">{statusIcons[kushya.status]}</span>
        <div className="kushya-main">
          <p className="kushya-text">{kushya.text}</p>
          <div className="kushya-meta">
            <span
              className="priority-badge"
              style={{ backgroundColor: priorityColors[kushya.priority] }}
            >
              {kushya.priority}
            </span>
            {kushya.context && (
              <span className="context-ref">{formatReference(kushya.context)}</span>
            )}
            <span className="kushya-date">{formatDate(kushya.createdAt)}</span>
          </div>
        </div>
        <span className="expand-icon">{expanded ? '▼' : '▶'}</span>
      </div>

      {expanded && (
        <div className="kushya-body">
          {kushya.context?.selectedText && (
            <div className="selected-text">
              <strong>From text:</strong> "{kushya.context.selectedText}"
            </div>
          )}

          {kushya.status === 'resolved' && (
            <div className="terutz-display">
              <div className="terutz-label">תירוץ (Resolution):</div>
              <p className="terutz-text">{kushya.terutz}</p>
              {kushya.source && (
                <div className="terutz-source">Source: {kushya.source}</div>
              )}
              <div className="resolved-date">
                Resolved: {formatDate(kushya.resolvedAt)}
              </div>
            </div>
          )}

          {kushya.status === 'open' && !showResolveForm && (
            <div className="kushya-actions">
              <button
                className="action-btn resolve"
                onClick={() => setShowResolveForm(true)}
              >
                ✅ Resolve
              </button>
              <button
                className="action-btn defer"
                onClick={() => onDefer(kushya.id)}
              >
                ⏳ Defer
              </button>
              <button
                className="action-btn delete"
                onClick={() => onDelete(kushya.id)}
              >
                🗑️ Delete
              </button>
            </div>
          )}

          {kushya.status === 'open' && showResolveForm && (
            <div className="resolve-form">
              <textarea
                value={terutz}
                onChange={(e) => setTerutz(e.target.value)}
                placeholder="Enter the terutz (answer/resolution)..."
                rows={3}
              />
              <input
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="Source (optional) - e.g., Rashi, Tosafot..."
              />
              <div className="form-actions">
                <button
                  className="btn-primary"
                  onClick={handleResolve}
                  disabled={!terutz.trim()}
                >
                  Save Resolution
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setShowResolveForm(false);
                    setTerutz('');
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {kushya.status === 'deferred' && (
            <div className="kushya-actions">
              <button
                className="action-btn resolve"
                onClick={() => setShowResolveForm(true)}
              >
                ✅ Resolve Now
              </button>
              <button
                className="action-btn delete"
                onClick={() => onDelete(kushya.id)}
              >
                🗑️ Delete
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// Main Component
// =============================================================================

const KushyaTracker = ({
  currentContext,
  showAddForm = true,
  filterByContext = false,
  compact = false
}) => {
  const {
    kushyot,
    addKushya,
    resolveKushya,
    deferKushya,
    deleteKushya,
    getKushyotForContext,
    getOpenKushyot
  } = useStudyMode();

  const [newKushya, setNewKushya] = useState('');
  const [priority, setPriority] = useState('normal');
  const [filter, setFilter] = useState('all'); // all, open, resolved, deferred
  const [expandedId, setExpandedId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  // Get filtered kushyot
  const displayKushyot = filterByContext && currentContext
    ? getKushyotForContext(currentContext.book, currentContext.chapter, currentContext.verse)
    : kushyot;

  const filteredKushyot = displayKushyot.filter(k => {
    if (filter === 'all') return true;
    return k.status === filter;
  });

  const openCount = getOpenKushyot().length;

  // =============================================================================
  // Handlers
  // =============================================================================

  const handleAddKushya = useCallback(() => {
    if (newKushya.trim() && currentContext) {
      addKushya(newKushya.trim(), {
        ...currentContext,
        priority
      });
      setNewKushya('');
      setPriority('normal');
      setShowForm(false);
    }
  }, [newKushya, currentContext, priority, addKushya]);

  // =============================================================================
  // Compact Mode
  // =============================================================================

  if (compact) {
    return (
      <div className="kushya-tracker-compact">
        <button
          className="kushya-badge"
          onClick={() => setShowForm(!showForm)}
        >
          ❓ {openCount > 0 && <span className="count">{openCount}</span>}
        </button>

        {showForm && (
          <div className="quick-add-form">
            <input
              type="text"
              value={newKushya}
              onChange={(e) => setNewKushya(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddKushya()}
              placeholder="What's your question?"
              autoFocus
            />
            <button onClick={handleAddKushya} disabled={!newKushya.trim()}>
              Add
            </button>
          </div>
        )}
      </div>
    );
  }

  // =============================================================================
  // Full Mode
  // =============================================================================

  return (
    <div className="kushya-tracker">
      {/* Header */}
      <div className="kushya-header-bar">
        <div className="header-title">
          <h3>קושיות - Kushyot</h3>
          <span className="open-count">{openCount} open</span>
        </div>

        {showAddForm && (
          <button
            className="add-kushya-btn"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? '✕' : '+ Add Question'}
          </button>
        )}
      </div>

      {/* Add Form */}
      {showAddForm && showForm && (
        <div className="add-kushya-form">
          <textarea
            value={newKushya}
            onChange={(e) => setNewKushya(e.target.value)}
            placeholder="מה הקושיא? What's your question about this text?"
            rows={3}
          />
          <div className="form-row">
            <div className="priority-selector">
              <label>Priority:</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div className="form-buttons">
              <button
                className="btn-primary"
                onClick={handleAddKushya}
                disabled={!newKushya.trim()}
              >
                Add Kushya
              </button>
              <button
                className="btn-secondary"
                onClick={() => {
                  setShowForm(false);
                  setNewKushya('');
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="kushya-filters">
        {['all', 'open', 'resolved', 'deferred'].map(f => (
          <button
            key={f}
            className={`filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f !== 'all' && (
              <span className="filter-count">
                {displayKushyot.filter(k => k.status === f).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Kushyot List */}
      <div className="kushyot-list">
        {filteredKushyot.length === 0 ? (
          <div className="empty-state">
            {filter === 'all' ? (
              <>
                <span className="empty-icon">📚</span>
                <p>No questions yet. Learning without questions is like a garden without flowers.</p>
                <p className="hebrew-quote">אין לומדין תורה אלא מתוך קושיא</p>
              </>
            ) : (
              <p>No {filter} questions.</p>
            )}
          </div>
        ) : (
          filteredKushyot.map(kushya => (
            <KushyaItem
              key={kushya.id}
              kushya={kushya}
              expanded={expandedId === kushya.id}
              onToggle={() => setExpandedId(expandedId === kushya.id ? null : kushya.id)}
              onResolve={resolveKushya}
              onDefer={deferKushya}
              onDelete={deleteKushya}
            />
          ))
        )}
      </div>

      {/* Stats Footer */}
      {kushyot.length > 0 && (
        <div className="kushya-stats">
          <span>Total: {kushyot.length}</span>
          <span>Resolved: {kushyot.filter(k => k.status === 'resolved').length}</span>
          <span>Rate: {Math.round((kushyot.filter(k => k.status === 'resolved').length / kushyot.length) * 100)}%</span>
        </div>
      )}
    </div>
  );
};

export default KushyaTracker;
