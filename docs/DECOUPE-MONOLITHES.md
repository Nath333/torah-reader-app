# Découpage des monolithes — recette validée et file d'attente

> 03/10/2026 — suite au grand nettoyage (purge git, migration Vite, tri knip).
> Le premier découpage exemplaire est fait (`constants/morphology.js`) ; celui-ci
> documente la recette prouvée et l'ordre recommandé pour les suivants.

## Recette validée (façade + modules)

1. **Cible** : fichier > 1 000 lignes à prédominance de **données pures** d'abord
   (zéro état partagé). Les services à état (caches module-level) viendront en
   dernier et exigeront un module `state.js` partagé.
2. **Déplacement mécanique** : extraire le bloc (données + helpers qui ne
   dépendent que de lui) vers un fichier frère dans un dossier dédié
   (`X/bloc.js`), **avec son JSDoc**.
3. **Façade ré-exportatrice** : le fichier d'origine garde TOUS ses exports
   (`import { … } from './X/bloc'; export { … };`) — aucun importeur à modifier.
4. **Vigilance ESM** : `require()` CJS hérité de CRA = crash sous Vite → le
   remplacer par un import statique (cycle toléré si lecture paresseuse).
   Attention à ne pas insérer de code à l'intérieur d'un JSDoc (déjà arrivé).
5. **Verrous** : suite vitest au vert + `npm run build` + grep sur les données
   déplacées (ex. `וגו` présent dans le nouveau fichier).

## File d'attente (par risque croissant)

| Fichier | Lignes | Seam | Remarque |
|---|---|---|---|
| `constants/morphology.js` | 1 912 (était 2 696) | ✅ fait | `functionWords.js` extrait ; reste STOP/binyanim/analyse |
| `services/commentaryServiceFactory.js` | 1 151 | par famille de commentaires | vérifier les caches module-level |
| `components/scholar-mode/NotebookTab.js` | 1 163 | UI — sous-onglets | nécessite tests d'abord |
| `components/scholar-mode/ProScholarV29RichAnalysis.panels.js` | 1 186 | UI — un fichier par panneau | |
| `components/layout/FocusMode.js` | 1 242 | UI — sections | importé par App.js |
| `components/scholar-mode/WordsTab/components/LookupTab.js` | 1 443 | UI — panneaux | |
| `services/analysis/linguisticAnalysis.js` | 2 060 | par type d'analyse | données ? à cartographier |
| `services/comparativeSemiticService.js` | 2 142 | par langue | |
| `services/dictionaries/dictionaryLoader.js` | 2 157 | par dictionnaire | **state.js partagé obligatoire** (cache + health) ; tests réels présents |
| `services/analysis/preClassificationService.js` | 2 247 | par famille de marqueurs | |
| `constants/morphology.js` (reste) | — | conjugaison/binyanim | peut rejoindre `morphology/verbPatterns.js` existant |
| `services/unifiedLookupService.js` | 3 123 | par étage (pipeline, cache, traduction) | 300+ tests = filet solide ; state partagé |
| `services/scholarly/discoursePatternService.js` | 3 056 | données vs analyse | |
| `services/dictionaries/scholarlyLexiconService.js` | 4 102 | par lexique | |
| `services/scholarly/talmudDiagramService.js` | 4 215 | générateurs par type de diagramme | les frères morts (Constants/Generators/Utils) ont été purgés — recréer proprement |

## Règles de conduite

- **Un split = un commit** (revert trivial si régression).
- Ne JAMAIS couper pendant qu'une autre session travaille le même fichier
  (vérifier `git log --oneline -5` avant).
- Les données dupliquées fichier ↔ dossier `morphology/` (ARAMAIC_BINYANIM
  existe en 2 versions : `morphology.js` et `verbPatterns.js`) doivent être
  **réconciliées** lors du prochain passage sur verbPatterns — source de
  divergence silencieuse.
