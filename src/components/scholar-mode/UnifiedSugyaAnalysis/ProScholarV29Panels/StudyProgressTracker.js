import React, { memo, useMemo } from 'react';
export const StudyProgressTracker = memo(({ analysis }) => {
  const progress = useMemo(() => {
    const items = [
      { name: 'הבנת המשנה', status: analysis?.mishnaAnalysis ? 'complete' : 'pending', icon: '📜' },
      { name: 'שאלות הגמרא', status: analysis?.patterns?.some(p => p.type === 'question') ? 'complete' : 'pending', icon: '❓' },
      { name: 'מקורות וראיות', status: analysis?.patterns?.some(p => p.type === 'proof' || p.type === 'citation') ? 'complete' : 'pending', icon: '📚' },
      { name: 'מסקנה/תירוץ', status: analysis?.patterns?.some(p => p.type === 'resolution') ? 'complete' : 'pending', icon: '✅' },
      { name: 'הלכה למעשה', status: 'pending', icon: '⚖️' }
    ];
    const completed = items.filter(i => i.status === 'complete').length;
    return { items, completed, percentage: Math.round((completed / items.length) * 100) };
  }, [analysis]);

  return (
    <div className="v29-progress-tracker" dir="rtl">
      <div className="progress-header">
        <span className="progress-icon">📈</span>
        <span className="progress-title">התקדמות בלימוד</span>
        <span className="progress-percent">{progress.percentage}%</span>
      </div>
      <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress.percentage}%` }} /></div>
      <div className="progress-items">
        {progress.items.map((item, i) => (
          <div key={i} className={`progress-item ${item.status}`}>
            <span className="item-icon">{item.icon}</span>
            <span className="item-name">{item.name}</span>
            <span className="item-status">{item.status === 'complete' ? '✓' : '○'}</span>
          </div>
        ))}
      </div>
    </div>
  );
});

StudyProgressTracker.displayName = 'StudyProgressTracker';

// =============================================================================
// EXPORTS
// =============================================================================
