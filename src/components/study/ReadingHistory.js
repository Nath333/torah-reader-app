import React from 'react';
import './ReadingHistory.css';

const ReadingHistory = ({ history, onSelect, onClear }) => {
  if (!history.length) {
    return (
      <div className="reading-history empty">
        <p>No reading history yet</p>
      </div>
    );
  }

  const formatTime = (timestamp) => {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="reading-history">
      <div className="history-header">
        <h3>Recent Reading</h3>
        <button className="clear-history" onClick={onClear}>Clear</button>
      </div>
      <div className="history-list">
        {history.map((item, i) => (
          <button
            key={`${item.book}-${item.chapter}-${i}`}
            className="history-item"
            onClick={() => onSelect(item.book, item.chapter)}
          >
            <span className="history-ref">{item.book} {item.chapter}</span>
            <span className="history-time">{formatTime(item.timestamp)}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default React.memo(ReadingHistory);
