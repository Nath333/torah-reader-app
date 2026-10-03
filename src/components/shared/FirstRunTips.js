import { useEffect, useState } from 'react';
import './FirstRunTips.css';

/**
 * FirstRunTips — carte d'accueil premier lancement (repliable).
 *
 * Trois gestes à connaître ; le drapeau localStorage évite de re-montrer.
 * Si le navigateur permet l'installation PWA (beforeinstallprompt), un
 * bouton « Installer » est proposé — une PWA qu'on n'installe pas est un
 * onglet qu'on perd.
 * Sobre : une carte, trois lignes, un ou deux boutons.
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
    text: 'palette : « genesis 12 », « shab », reprendre la lecture, vues et actions.'
  }
];

const FirstRunTips = ({ onDone }) => {
  const [closing, setClosing] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Déjà installée (affichée comme application) : ne pas proposer
    try {
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setInstalled(true);
        return undefined;
      }
    } catch {
      /* matchMedia indisponible : continuer */
    }

    const onPrompt = (e) => {
      e.preventDefault(); // empêche le mini-infobar du navigateur
      setInstallPrompt(e);
    };
    const onInstalled = () => {
      setInstallPrompt(null);
      setInstalled(true);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const finish = (closeOnly = false) => {
    setClosing(true);
    if (!closeOnly) {
      try {
        localStorage.setItem(STORAGE_KEY, String(Date.now()));
      } catch {
        /* le repli silencieux suffit */
      }
    }
    setTimeout(() => onDone?.(), 250);
  };

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt(); // natif : le navigateur demande confirmation
    const choice = await installPrompt.userChoice.catch(() => null);
    if (choice?.outcome === 'accepted') {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    }
    setInstallPrompt(null);
    finish();
  };

  return (
    <section
      className={`firstrun ${closing ? 'closing' : ''}`}
      aria-label="Premiers pas"
    >
      <div className="firstrun-head">
        <h2>Bienvenue dans l’étude</h2>
        <div className="firstrun-actions">
          {installPrompt && !installed && (
            <button type="button" className="firstrun-install" onClick={handleInstall}>
              Installer l’application
            </button>
          )}
          <button type="button" className="firstrun-done" onClick={() => finish()}>
            C’est parti
          </button>
        </div>
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
