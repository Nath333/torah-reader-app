# OPÉRATIONS — limud (torah-reader-app)

Le guide « je travaille, je pousse, ça part partout ». Complète `README.md`
(feature) et `docs/DECOUPE-MONOLITHES.md` (file des découpes).

---

## 1. Les trois installations

| Cible | URL | Mise à jour |
|---|---|---|
| GitHub Pages | https://Nath333.github.io/torah-reader-app/ | `npx gh-pages -d dist` (après build) |
| Homelab | http://192.168.2.100:8095/torah-reader-app/ | `bash scripts/deploy-homelab.sh` |
| Local (PC) | http://localhost:4173/torah-reader-app/ | `npm run build` puis relancer `serve-local.cmd` (auto au login) |

Le homelab et GitHub Pages servent **le même dist** (base Vite
`/torah-reader-app/` partout). Le homelab = stack
`nat@192.168.2.100:~/stacks/torah-reader/` (nginx:alpine, label autoheal).

## 2. La boucle de travail

```bash
# 1. travailler, tester localement
npm test                     # vitest, ~15 s

# 2. pousser — la CI tourne sur LE runner dédié du poste
git push origin master       # CI = npm ci + qualité dicos + tests + build
gh run list --workflow ci.yml --limit 1

# 3. déployer (jamais depuis l'arbre de travail : worktree isolé)
bash scripts/deploy-homelab.sh          # homelab, sans redémarrage
git worktree add --detach C:\...\Temp\tr-gh origin/master   # GH Pages :
#   + junction node_modules (voir scripts/deploy-homelab.sh pour le motif)
#   + npm run build && npx gh-pages -d dist
```

**Règle d'or : ne jamais builder/déployer depuis l'arbre de travail.** Les
sessions parallèles (lanes) y laissent du WIP — `scripts/deploy-homelab.sh`
construit depuis `origin/master` dans un worktree isolé pour cette raison.

## 3. Multi-sessions (lanes)

- Claims pilotage : `python pilotage.py claim <sujet> --fichiers <chemin>`
  avant d'éditer, `solde` en finissant (dossier `D:\_DEV-CAO\_PILOTAGE`).
- Avant de committer un fichier à plusieurs éditeurs : `git diff <fichier>` —
  les modifs des autres voyagent avec les miennes (vécu : WIP lane emporté,
  import non-suivi, master cassé — réparé en commitant le chainon manquant).
- Ne jamais `git add -A` ; add par fichier, staging vérifié.

## 4. Clé IA (OpenRouter)

- Saisie : **Réglages → API** (ou panneau Étude → Learn). Format `sk-or-…`,
  lien direct openrouter.ai/keys. Stockage : localStorage via safeStorage,
  jamais dans le bundle ni envoyé ailleurs qu'à OpenRouter.
- Option « zéro clé » : le serveur d'étude (limud-proxy, `server/`) peut porter
  `OPENROUTER_API_KEY` — le navigateur n'a alors plus rien à saisir
  (`src/services/aiProxy.js`, détection GET /ai/status).

## 5. Runner CI dédié

`xps17-torah` vit dans `D:\_RUNNERS\torah-reader\` (label `windows-xps`,
lancé au login via `D:\_RUNNERS\runners.txt`). Diagnostic :
`powershell -File D:\_RUNNERS\etat.ps1` ; relance : `lance-tous.cmd`.

## 6. Dépannage

| Symptôme | Cause probable | Remède |
|---|---|---|
| Page blanche | crash JS au boot (cf. incident module.hot/require CJS) | F12 console ; l'auto-heal recharge seul depuis SW v4 |
| « Vieux » site affiché après un déploiement | service worker en cache (GitHub Pages uniquement — le homelab HTTP n'a PAS de SW) | second rechargement ; ou DevTools → Application → Service Workers → Unregister |
| Doute sur la version servie | — | comparer le hash `assets/index-*.js` de l'index avec `git log` |
| CI rouge « module not found » | import d'un fichier non-suivi (typique collision multi-lanes) | `git status`, committer le chainon manquant |
| Test réseau instable en CI locale | Sefaria/Hebcal joignables ? | relancer ; les tests réels sont en fin de fichier |
