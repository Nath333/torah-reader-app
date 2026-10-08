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
| ~~`services/commentary/commentaryServiceFactory.js`~~ | **fait 03/10** | façade 263 l. + `factory/` (core 371, Rashi 151, Ramban 129, TosafotMaharsha 57, Sephardi 265) + smoke test (5) | ✅ |
| `components/scholar-mode/NotebookTab.js` | 1 163 | UI — sous-onglets | nécessite tests d'abord |
| `components/scholar-mode/ProScholarV29RichAnalysis.panels.js` | 1 186 | UI — un fichier par panneau | |
| `components/layout/FocusMode.js` | 1 242 | UI — sections | importé par App.js |
| `components/scholar-mode/WordsTab/components/LookupTab.js` | 1 443 | UI — panneaux | |
| ~~`services/analysis/linguisticAnalysis.js`~~ | **fait 03/10** | `linguistic/` 4 domaines (binyan 252, context 561, historical 646, cognates 403) + façade composite 250 (analyzeWordV6/Enhanced + default) | ✅ |
| ~~`services/comparativeSemiticService.js`~~ | **fait 03/10** | données `comparativeSemitic/cognateDatabase.js` (926) + façade 1 225 (loaders état conservés) + **fix latent : log() appelé comme fonction ×21 = fallbacks morts** + smoke test (5) | phase 2 : helpers/parsers vs API |
| `services/dictionaries/dictionaryLoader.js` | 2 157 | par dictionnaire | **state.js partagé obligatoire** (cache + health) ; tests réels présents |
| ~~`services/analysis/preClassificationService.js`~~ | **fait 03/10** | `preClassificationData.js` (1 067, 14 bases pures) + façade 1 232 (helpers + preClassify) | ✅ |
| `constants/morphology.js` (reste) | — | conjugaison/binyanim | peut rejoindre `morphology/verbPatterns.js` existant |
| ~~`services/unifiedLookupService.js` (étages)~~ | 3 123 → 2 318 (lane) → **1 768 + `unifiedLookup/{state 9, preload 133, enriched 505}`** (fait 08/10) | ✅ données/étages faits ; la façade garde le pipeline `lookupWord` et la config dictionnaires | state partagé dans `state.js` (cache géré, dédup, variants) ; `enriched.js` en cycle paresseux vers la façade (appels runtime uniquement) |
| ~~`services/scholarly/discoursePatternService.js`~~ | **fait 03/10 (2 phases)** | `discourse/` 7 modules : discourseData 710, detection 540, gemaraQA 560, tzuratHavad 468, mishna 285, svara 257, layers 157 + façade 203 (composite + default, 33 noms ré-exportés) | ✅ |
| `services/dictionaries/scholarlyLexiconService.js` | 4 102 | par lexique | |
| ~~`services/scholarly/talmudDiagramService.js` (données)~~ | 4 217 → **3 795 + `talmudDiagramData.js` 449** (fait 08/10) | générateurs par type de diagramme (reste) | données pures extraites (commentateurs, types, outcomes, patterns, sages, marqueurs) ; la suite = un fichier par générateur, exige un module extracteurs partagé (tous les générateurs appellent extract*/analyze*) — service à état (LRU+stats), faire en dernier |

## Règles de conduite

- **Un split = un commit** (revert trivial si régression). **Leçons du 03/10** : le build rollup est PLUS STRICT que vitest (alias `as` perdus dans les imports générés = erreur « not exported », ré-exports doublonnés) — toujours builder après chaque split ; vérifier les chemins de la file AVANT de foncer — commentaryServiceFactory était sous `services/commentary/` depuis le 07/09 (31ea6c0), pas à la racine services/.
- Ne JAMAIS couper pendant qu'une autre session travaille le même fichier
  (vérifier `git log --oneline -5` avant).
- ARAMAIC_BINYANIM existe en **deux modèles de données différents** (constat
  03/10) : clés minuscules + hebrewEquivalent/markers dans `morphology.js`
  (≈671) vs clés MAJUSCULES + key/prefix dans `morphologyPatterns.js` (≈341,
  ré-exporté par `verbPatterns.js`). Ce ne sont pas des copies : unifier est
  un choix de modèle à trancher lors du split verbPatterns (consommateurs :
  grammarAnalysisService/GRAMMAR_CONSTANTS côté fichier, détection de binyan
  interne côté patterns).
