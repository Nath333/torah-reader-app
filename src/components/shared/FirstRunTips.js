import { useState } from 'react';
import './FirstRunTips.css';

/**
 * FirstRunTips — carte d'accueil premier lancement (repliable).
 *
 * Trois gestes à connaître ; le drapeau localStorage évite de re-montrer.
 * Sobre : une carte, trois lignes, un bouton.
 */

const STORAGE_KEY = 'limud_tips_done_v1';

export const shouldShowFirstRunTips = () => {
  try {
    return !localStorage.getItem(STORAGE_KEY);
  } catch {
    return false; // localStorage indisponible (mode privé strict) : ne pas gêner
  }
};

const TIPS = [
  {
    keys: 'Clic sur un mot',
    text: 'chaque mot hébreu ou araméen s’ouvre sur BDB, Jastrow, Strong’s et la morphologie — hors-ligne inclus.'
  },
  {
    keys: 'Ctrl + K',
    text: 'recherche de versets en langage naturel (« paix entre frères ») avec interprétation IA.'
  },
  {
    keys: 'Ctrl + P',
    text: 'palette de commandes : sauter à un sefer, une massechet, ouvrir une vue, basculer le thème.'
  }
];

const FirstRunTips = ({ onDone }) => {
  const [closing, setClosing] = useState(false);

  const finish = () => {
    setClosing(true);
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      /* le repli silencieux suffit */
    }
    setTimeout(() => onDone?.(), 250);
  };

  return (
    <section
      className={`firstrun ${closing ? 'closing' : ''}`}
      aria-label="Premiers pas"
    >
      <div className="firstrun-head">
        <h2>Bienvenue dans l’étude</h2>
        <button type="button" className="firstrun-done" onClick={finish}>
          C’est parti
        </button>
      </div>
      <ul className="firstrun-list">
        {TIPS.map((tip) => (
          <li key={tip.keys}>
            <kbd>{tip.keys}</kbd>
            <span>{tip.text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default FirstRunTips;
