# Convention de commit — anti « commit avalé »

> Installé le 03/10/2026 après 2 incidents : des sessions ZCode travaillent le
> **même clone** ; un `git add -A && git commit` d'une session emporte le
> travail stagé des autres (−12 090 lignes parties sous un message « test »).

## Le garde-fou (installé et actif)

`git config core.hooksPath scripts/hooks` → chaque `git commit` passe par
`scripts/hooks/pre-commit` :

- il identifie la session via `PILOTAGE_SESSION` (ou `CLAUDE_SESSION_ID`) ;
- il compare les chemins du commit aux **claims pilotage** vivants
  (`D:\_DEV-CAO\_PILOTAGE\CLAIMS\*.claim.json`) ;
- couvert par un claim d'une **autre session identifiée** → **REFUS** (exit 1)
  avec les remèdes ;
- claim **indicatif** (posé sans identité) → avertissement, commit permis ;
- **ton propre claim** ne te bloque jamais ;
- **fail-open** : si le hook plante, le commit passe (comme garde-hook.py) ;
- matching **glob** supporté (`d:\...\torah-reader-app\**` couvre l'arbre) —
  c'est la faiblesse corrigée par rapport au garde Write/Edit historique
  (égalité exacte seulement).

## Comment committer (dans l'ordre de préférence)

### 1. Tes chemins seulement (recommandé)

```bash
scripts/commit-mien.sh "Mon message" src/services/monFichier.js docs/x.md
```

Seuls ces chemins partent au commit — ce que les autres sessions ont stagé
**reste stagé**, intact, pour elles.

### 2. Commit classique (si personne d'autre n'a rien stagé)

```bash
PILOTAGE_SESSION=sess_… git commit -m "message"
```

Le hook vérifie quand même les claims croisés au moment du commit.

### 3. Forcer (en connaissance de cause)

```bash
PILOTAGE_FORCE_COMMIT=1 git commit -m "message"
```

À réserver aux cas où le claim croisé est à toi mais sous une autre identité,
ou après coordination explicite.

## Règles de bonne conduite multi-sessions

- Poser le **claim** AVANT de travailler : `python pilotage.py claim sujet
  --fichiers <chemins absolus> --motif "…"` puis `pilotage solde sujet` à la
  fin (claims actifs = protections réelles).
- Vérifier `git status` AVANT de stager : ce qui est déjà stagé n'est
  peut-être pas à toi.
- Jamais de `git add -A` sur ce dépôt tant que plusieurs sessions sont
  vivantes : ajouter par chemins (`git add <mes fichiers>`).
- Jamais de `git reset` / réécriture d'historique sans vérifier
  `git log --oneline -5` (les autres sessions poussent en continu).
