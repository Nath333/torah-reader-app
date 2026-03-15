/**
 * TabButton - Tab navigation button component
 */
import React from 'react';

const TabButton = React.memo(({ id, label, icon, isActive, onClick, badge }) => (
  <button
    className={`scholar-tab ${isActive ? 'active' : ''}`}
    onClick={() => onClick(id)}
    type="button"
  >
    <span className="tab-icon">{icon}</span>
    <span className="tab-label">{label}</span>
    {badge > 0 && <span className="tab-badge">{badge}</span>}
  </button>
));

export default TabButton;
