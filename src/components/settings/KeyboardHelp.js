import React from 'react';
import './KeyboardHelp.css';

const shortcuts = [
  // Navigation
  { keys: ['Ctrl', 'K'], description: 'Aller à la recherche', category: 'Navigation' },
  { keys: ['Ctrl', 'P'], description: 'Palette de commandes — sauter à un sefer, une vue, l'étude du jour', category: 'Navigation' },
  { keys: ['Ctrl', '←'], description: 'Chapitre précédent', category: 'Navigation' },
  { keys: ['Ctrl', '→'], description: 'Chapitre suivant', category: 'Navigation' },
  { keys: ['Esc'], description: 'Retour au lecteur / Vider la sélection', category: 'Navigation' },

  // Study Tools
  { keys: ['Ctrl', 'Shift', 'S'], description: 'Basculer le mode Étude', category: 'Étude' },
  { keys: ['Ctrl', 'B'], description: 'Basculer les favoris', category: 'Étude' },
  { keys: ['Ctrl', 'H'], description: 'Basculer l'historique', category: 'Étude' },
  { keys: ['Ctrl', 'V'], description: 'Ouvrir le vocabulaire', category: 'Étude' },

  // Selection Mode
  { keys: ['Enter'], description: 'Ouvrir le mode Étude', category: 'Sélection' },
  { keys: ['Ctrl', 'A'], description: 'Sélectionner tous les versets', category: 'Sélection' },
  { keys: ['Ctrl', 'C'], description: 'Copier les versets sélectionnés', category: 'Sélection' },
  { keys: ['Shift', 'Click'], description: 'Sélectionner une plage de versets', category: 'Sélection' },

  // Display
  { keys: ['Ctrl', 'D'], description: 'Basculer le mode sombre', category: 'Affichage' },
  { keys: ['Ctrl', 'F'], description: 'Basculer le mode focus', category: 'Affichage' },

  // AI Analysis
  { keys: ['Ctrl', 'Enter'], description: 'Lancer l'analyse (dans le mode Étude)', category: 'Analyse' }
];

// Group shortcuts by category
const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
  const category = shortcut.category || 'General';
  if (!acc[category]) acc[category] = [];
  acc[category].push(shortcut);
  return acc;
}, {});

const categoryIcons = {
  Navigation: '🧭',
  'Étude': '📚',
  'Sélection': '✓',
  'Affichage': '🎨',
  'Analyse': '🧠'
};

const KeyboardHelp = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="keyboard-help-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Raccourcis clavier">
      <div className="keyboard-help-modal" onClick={(e) => e.stopPropagation()}>
        <div className="keyboard-help-header">
          <h3>Raccourcis clavier</h3>
          <button className="close-btn" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="shortcuts-list">
          {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
            <div key={category} className="shortcut-category">
              <h4 className="category-title">
                <span className="category-icon">{categoryIcons[category] || '⌨️'}</span>
                {category}
              </h4>
              {categoryShortcuts.map(({ keys, description }, index) => (
                <div key={index} className="shortcut-item">
                  <div className="shortcut-keys">
                    {keys.map((key, i) => (
                      <React.Fragment key={i}>
                        <kbd>{key}</kbd>
                        {i < keys.length - 1 && <span className="key-separator">+</span>}
                      </React.Fragment>
                    ))}
                  </div>
                  <span className="shortcut-description">{description}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="keyboard-help-footer">
          <span>Press <kbd>?</kbd> to toggle this help</span>
        </div>
      </div>
    </div>
  );
};

export default KeyboardHelp;
