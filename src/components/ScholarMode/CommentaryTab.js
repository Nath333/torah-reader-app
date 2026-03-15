/**
 * CommentaryTab - Commentary layers display
 */
import React, { useState, useCallback } from 'react';

const CommentaryItem = React.memo(({ item, expanded, onToggle }) => (
  <div className={`commentary-item ${expanded ? 'expanded' : ''}`}>
    <div className="commentary-header" onClick={onToggle}>
      <span className="commentary-name">{item.commentator}</span>
      <span className="commentary-ref">{item.heRef || item.ref}</span>
      <span className="expand-icon">{expanded ? '▼' : '▶'}</span>
    </div>
    {expanded && (
      <div className="commentary-content">
        {item.he && (
          <p className="commentary-hebrew" dir="rtl" lang="he">{item.he}</p>
        )}
        {item.text && (
          <p className="commentary-english">{item.text}</p>
        )}
      </div>
    )}
  </div>
));

const CommentaryTab = React.memo(({ commentaries }) => {
  const [expanded, setExpanded] = useState(new Set());
  const [activeCategory, setActiveCategory] = useState('primary');

  const handleToggle = useCallback((index) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  if (!commentaries) {
    return (
      <div className="tab-empty">
        <span className="empty-icon">📚</span>
        <span className="empty-text">No commentaries available</span>
      </div>
    );
  }

  const categories = [
    { id: 'primary', label: 'Primary', items: commentaries.primary || [] },
    { id: 'rishonim', label: 'Rishonim', items: commentaries.rishonim || [] },
    { id: 'acharonim', label: 'Acharonim', items: commentaries.acharonim || [] },
    { id: 'chassidic', label: 'Chassidic', items: commentaries.chassidic || [] },
    { id: 'modern', label: 'Modern', items: commentaries.modern || [] },
    { id: 'other', label: 'Other', items: commentaries.other || [] }
  ].filter(cat => cat.items.length > 0);

  if (categories.length === 0) {
    return (
      <div className="tab-empty">
        <span className="empty-icon">📚</span>
        <span className="empty-text">No commentaries found for this reference</span>
      </div>
    );
  }

  const activeItems = categories.find(c => c.id === activeCategory)?.items || [];

  return (
    <div className="commentary-tab">
      {/* Category Tabs */}
      <div className="category-tabs">
        {categories.map(cat => (
          <button
            key={cat.id}
            className={`category-tab ${activeCategory === cat.id ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat.id)}
          >
            {cat.label}
            <span className="category-count">{cat.items.length}</span>
          </button>
        ))}
      </div>

      {/* Commentary List */}
      <div className="commentary-list">
        {activeItems.map((item, index) => (
          <CommentaryItem
            key={index}
            item={item}
            expanded={expanded.has(`${activeCategory}-${index}`)}
            onToggle={() => handleToggle(`${activeCategory}-${index}`)}
          />
        ))}
      </div>
    </div>
  );
});

export default CommentaryTab;
