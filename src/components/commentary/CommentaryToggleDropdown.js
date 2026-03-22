import React, { useState, useRef, useEffect } from 'react';
import './CommentaryToggleDropdown.css';

/**
 * Compact dropdown for toggling commentaries in the TorahReader toolbar.
 * Groups all commentary toggles into a single dropdown menu.
 */
const CommentaryToggleDropdown = ({
  // Torah commentaries
  showOnkelos,
  onToggleOnkelos,
  showRashi,
  onToggleRashi,
  showRamban,
  onToggleRamban,
  showIbnEzra,
  onToggleIbnEzra,
  showSforno,
  onToggleSforno,
  // Talmud commentaries
  showTosafot,
  onToggleTosafot,
  showMaharsha,
  onToggleMaharsha,
  // Talmud translations
  showSoncino,
  onToggleSoncino,
  hasSoncinoAvailable = false,
  // Context
  isTorahBook = false,
  isTalmud = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Define Targumim (translations) - separate from commentaries
  const targumim = [];
  // Define commentaries (פירושים)
  const commentaries = [];

  if (isTalmud) {
    // Talmud translations (English)
    if (onToggleSoncino && hasSoncinoAvailable) {
      targumim.push({ key: 'soncino', name: 'Soncino English', hebrew: 'סונצ׳ינו', show: showSoncino, toggle: onToggleSoncino, icon: '🇬🇧' });
    }
    // Talmud commentaries
    if (onToggleRashi) commentaries.push({ key: 'rashi', name: 'Rashi', hebrew: 'רש״י', show: showRashi, toggle: onToggleRashi, icon: '📖' });
    if (onToggleTosafot) commentaries.push({ key: 'tosafot', name: 'Tosafot', hebrew: 'תוספות', show: showTosafot, toggle: onToggleTosafot, icon: '📚' });
    if (onToggleMaharsha) commentaries.push({ key: 'maharsha', name: 'Maharsha', hebrew: 'מהרש״א', show: showMaharsha, toggle: onToggleMaharsha, icon: '🎓' });
  } else if (isTorahBook) {
    // Targumim (Aramaic translations) - separate category
    if (onToggleOnkelos) targumim.push({ key: 'onkelos', name: 'Targum Onkelos', hebrew: 'תרגום אונקלוס', show: showOnkelos, toggle: onToggleOnkelos, icon: '🔤' });
    // Commentaries (פירושים)
    if (onToggleRashi) commentaries.push({ key: 'rashi', name: 'Rashi', hebrew: 'רש״י', show: showRashi, toggle: onToggleRashi, icon: '📖' });
    if (onToggleRamban) commentaries.push({ key: 'ramban', name: 'Ramban', hebrew: 'רמב״ן', show: showRamban, toggle: onToggleRamban, icon: '🔮' });
    if (onToggleIbnEzra) commentaries.push({ key: 'ibnEzra', name: 'Ibn Ezra', hebrew: 'אבן עזרא', show: showIbnEzra, toggle: onToggleIbnEzra, icon: '🔤' });
    if (onToggleSforno) commentaries.push({ key: 'sforno', name: 'Sforno', hebrew: 'ספורנו', show: showSforno, toggle: onToggleSforno, icon: '💡' });
  }

  const allItems = [...targumim, ...commentaries];
  const activeCount = allItems.filter(c => c.show).length;

  if (allItems.length === 0) return null;

  return (
    <div className="commentary-toggle-dropdown" ref={dropdownRef}>
      <button
        className={`commentary-dropdown-btn ${isOpen ? 'open' : ''} ${activeCount > 0 ? 'has-active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        title={`Texts${activeCount > 0 ? ` (${activeCount} active)` : ''}`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="btn-icon">
          <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        <span className="btn-label">Texts</span>
        {activeCount > 0 && <span className="active-count">{activeCount}</span>}
        <svg className="dropdown-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <div className="commentary-dropdown-menu">
          <div className="dropdown-header">
            <span className="header-title">Toggle Texts</span>
            {activeCount > 0 && (
              <button
                className="clear-btn"
                onClick={() => {
                  allItems.forEach(c => {
                    if (c.show) c.toggle();
                  });
                }}
              >
                Clear all
              </button>
            )}
          </div>

          {/* Targumim Section (Translations) */}
          {targumim.length > 0 && (
            <div className="commentary-section">
              <div className="section-label">Targumim (Translations)</div>
              <div className="commentary-options">
                {targumim.map(c => (
                  <button
                    key={c.key}
                    className={`commentary-option targum ${c.show ? 'active' : ''}`}
                    onClick={() => c.toggle()}
                    aria-pressed={c.show}
                  >
                    <span className="option-icon">{c.icon}</span>
                    <span className="option-text">
                      <span className="option-hebrew">{c.hebrew}</span>
                      <span className="option-name">{c.name}</span>
                    </span>
                    <span className={`option-toggle ${c.show ? 'on' : 'off'}`}>
                      <span className="toggle-track">
                        <span className="toggle-thumb" />
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Commentaries Section (Perushim) */}
          {commentaries.length > 0 && (
            <div className="commentary-section">
              {targumim.length > 0 && <div className="section-label">Commentaries (Perushim)</div>}
              <div className="commentary-options">
                {commentaries.map(c => (
                  <button
                    key={c.key}
                    className={`commentary-option ${c.show ? 'active' : ''}`}
                    onClick={() => c.toggle()}
                    aria-pressed={c.show}
                  >
                    <span className="option-icon">{c.icon}</span>
                    <span className="option-text">
                      <span className="option-hebrew">{c.hebrew}</span>
                      <span className="option-name">{c.name}</span>
                    </span>
                    <span className={`option-toggle ${c.show ? 'on' : 'off'}`}>
                      <span className="toggle-track">
                        <span className="toggle-thumb" />
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CommentaryToggleDropdown;
