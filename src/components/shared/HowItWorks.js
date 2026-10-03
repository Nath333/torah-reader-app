import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import './HowItWorks.css';

/**
 * HowItWorks — bouton « ? » du header + panneau « Comment ça marche ».
 * Guide compact en français : où lire, le lecteur, ton étude, les raccourcis.
 * Auto-contenu (état local), fermeture par ✕, clic-fond ou Échap.
 * Le panneau est rendu via un portail vers document.body : le header a un
 * backdrop-filter, qui capture sinon les position:fixed descendants.
 */
const HowItWorks = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        className="toolbar-btn icon-only hiw-btn"
        aria-label="Comment ça marche"
        title="Comment ça marche ?"
        aria-expanded={open}
      >
        ?
      </button>

      {open && createPortal(
        <div className="hiw-backdrop" onClick={() => setOpen(false)}>
          <div
            className="hiw-panel"
            role="dialog"
            aria-label="Comment ça marche"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="hiw-head">
              <h3>Comment ça marche</h3>
              <button className="hiw-close" onClick={() => setOpen(false)} aria-label="Fermer">✕</button>
            </div>

            <section>
              <h4>📖 Où lire</h4>
              <p>
                La <strong>colonne de gauche</strong> choisit la catégorie (Torah, Prophètes…)
                puis la <strong>parasha</strong> ou le <strong>chapitre</strong>. Le lecteur
                s'ouvre directement.
              </p>
            </section>

            <section>
              <h4>📜 Le lecteur</h4>
              <ul>
                <li><strong>Clic sur un mot hébreu</strong> → dictionnaire (BDB, Jastrow, Strong's) + morphologie.</li>
                <li><strong>EN / FR</strong> → traductions officielle et française.</li>
                <li><strong>Vowels / Trope</strong> → voyelles (נקודות) et cantillation (טעמים).</li>
                <li><strong>Texts</strong> → change de commentateur (Rashi, Targum Onkelos…).</li>
                <li><strong>Study</strong> → ouvre les commentaires du verset à droite.</li>
                <li><strong>Aa</strong> → taille du texte.</li>
              </ul>
            </section>

            <section>
              <h4>🎯 Ton étude (/study)</h4>
              <p>
                Minuteur de session, objectifs du jour (30 min · 20 versets · 5 mots),
                programme quotidien (Parasha · Daf Yomi · Mishnah) et suggestions
                personnalisées selon ton niveau.
              </p>
            </section>

            <section>
              <h4>⌨️ Raccourcis</h4>
              <ul className="hiw-shortcuts">
                <li><kbd>Ctrl</kbd>+<kbd>K</kbd> recherche de versets</li>
                <li><kbd>Ctrl</kbd>+<kbd>P</kbd> palette de commandes</li>
                <li><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>S</kbd> Study</li>
                <li><kbd>Ctrl</kbd>+<kbd>D</kbd> thème clair/sombre</li>
              </ul>
            </section>

            <p className="hiw-foot">
              Tout est stocké dans <strong>ton navigateur</strong> — rien sur un serveur.
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default HowItWorks;
