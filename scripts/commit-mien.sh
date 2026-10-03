#!/bin/sh
# commit-mien.sh — commit par pathspec, déclaré au hook anti-avalé.
#
# Usage : scripts/commit-mien.sh "message" chemin1 [chemin2 ...]
#
# Ajoute puis committe UNIQUEMENT les chemins listés (suivis, modifiés,
# supprimés ou non-suivis),
# sans toucher à ce que d'autres sessions ont déjà stagé dans le clone ;
# le hook scripts/hooks/pre-commit vérifie au passage que ces chemins ne
# sont pas réservés par un claim pilotage d'une autre session.
[ $# -ge 2 ] || {
    echo "usage : scripts/commit-mien.sh \"message\" chemin1 [chemin2 ...]" >&2
    exit 2
}
msg=$1
shift
git add -A -- "$@" || exit 1
PILOTAGE_COMMIT_PATHS="$*" exec git commit -m "$msg" -- "$@"
