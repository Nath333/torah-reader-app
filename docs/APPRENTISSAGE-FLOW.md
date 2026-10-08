# Le flow d'apprentissage (learning) — comment ça marche

> Mis à jour le 08/10/2026 (learning v2→v5). Chaque métrique a UNE source de
> vérité ; les composants ne font que l'afficher.

## Vue d'ensemble

```
 LECTEUR (/read)                          DASHBOARD (/study)
┌─────────────────────────────┐          ┌────────────────────────────────┐
│ scroll verset 1,5 s ────────┼──►──┐    │  Anneaux du jour               │
│ temps présent (15 s) ───────┼──►──┤    │   ⏱ Minutes (auto + sessions)  │
│ ★ mot sauvegardé ───────────┼──►──┤    │   📖 Versets  (objectif 20)    │
│ commentaire Rashi ON ───────┼──►──┤    │   📝 Mots     (objectif 5)     │
└─────────────────────────────┘     │    │  Programme du jour (Sefaria,   │
                                    ▼    │   fuseau LOCAL, cliquable)     │
                        ┌──────────────┐ │  Niveau Débutant→…→Savant      │
                        │ studyTracker │ │  Suggestions (parasha,         │
                        │ (localStorage│ │   révisions SRS → vocabulaire) │
                        │  jour + vie) │ │  Objectifs (3 jalons proches)  │
                        └──────┬───────┘ │  Série (jours d'affilée)       │
                               │ « study:stats-updated »          │
                               └────────►│  ← rafraîchi en DIRECT         │
                                         └────────────────────────────────┘
 CARNET (/vocabulary — VocabularyBank)
 └── cartes SRS (SM-2) → onglet Révision : flashcards, qualité 0-5
     → intervalles espacés → maîtrise ⭐ → alimente jalons + suggestions
```

## Les sources de vérité (une métrique = un module)

| Métrique | Source | Qui l'écrit | Qui la lit |
|---|---|---|---|
| Versets du jour | `studyTracker` (jour) | IntersectionObserver du lecteur | anneaux, panneau session |
| Minutes du jour | `studyTracker` (jour) | accumulateur 15 s onglet visible | anneau Minutes |
| Mots du jour | `studyTracker` (jour) | `saveWord` (carnet) | anneau Mots |
| Versets à vie (niveau) | `studyTracker` (vie) | idem versets | badge de niveau, jalons |
| Maîtrise vocabulaire | `srsService.getStats().mastered` | révisions SM-2 | jalons, suggestions |
| Série (streak) | `useStudyStreak` | navigation livre/chapitre | StreakBadge, jalons, toasts |
| Commentateurs explorés | `learningRecommendationService` | toggles de SettingsContext | jalons, niveaux |
| Parasha courante | `learningRecommendationService` | dashboard (calendrier Sefaria) | jalon parashiot |
| Étude du jour | Sefaria `/calendars` (2 modules : `studyCycleService` palette, `getDailyLearning` dashboard, même fuseau) | — | palette, dashboard |

## Les boucles

1. **Lire** : scroll = versets + minutes. Rien à cliquer.
2. **Sauver un mot** : clic mot → ★ → carte SRS créée, due immédiatement.
3. **Réviser** : suggestion « Réviser N mots » → vue Vocabulaire → flashcards.
   Une révision « correcte » espace la prochaine (1 j → 6 j → ×ease).
4. **Explorer** : ouvrir Rashi/Ramban/… alimente « Trois commentateurs ».
5. **Progresser** : versets à vie font monter le niveau ; le niveau débloque
   suggestions de modes/commentateurs adaptés.

## Règles de cohérence (à ne pas casser)

- Ne JAMAIS incrémenter un compteur dans un composant : appeler le service
  source (`registerVerseRead`, `registerWordLearned`, `trackStudyActivity`).
- Les objectifs du jour vivent dans `studyTracker`
  (`DAILY_VERSES_GOAL`, `DAILY_WORDS_GOAL`) — `useStudySession` n'en garde
  que des défauts compatibles.
- Les jalons (`generateMilestones`) sont TOUJOURS alimentés par les sources
  du tableau ci-dessus — jamais par des compteurs locaux au composant.
- Le clic d'une suggestion est soit une navigation (ref → `navigateTo`),
  soit une vue (`review` → vocabulaire). Pas de bouton sans effet.
