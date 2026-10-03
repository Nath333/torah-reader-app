#!/usr/bin/env bash
# Deploie Sefarim Reader sur l'homelab (192.168.2.100:8095).
# Usage : bash scripts/deploy-homelab.sh
#
# Construit un dist depuis origin/master dans un worktree isole (jamais depuis
# l'arbre de travail : les lanes y laissent du WIP), l'envoie dans
# ~/stacks/torah-reader/dist/ — nginx sert les fichiers a la volee, sans
# redemarrage du conteneur.
set -euo pipefail

REPO="D:/7-App-Perso/torah-reader-app"
HOTE="nat@192.168.2.100"
STACK="~/stacks/torah-reader"
WT="${TEMP:-/tmp}/tr-deploy-homelab"

cd "$REPO"
git fetch origin -q
REF=$(git rev-parse origin/master)
echo "Deploy de origin/master ($REF) vers $HOTE:$STACK"

git worktree remove --force "$WT" 2>/dev/null || true
git worktree add --detach "$WT" "$REF" >/dev/null
trap 'git worktree remove --force "$WT" 2>/dev/null || true' EXIT

cmd //c "mklink /J ${WT}\\node_modules ${REPO}\\node_modules" >/dev/null 2>&1 || true
cd "$WT"
npm run build

echo "Envoi du dist..."
scp -o BatchMode=yes -r "$WT/dist/." "$HOTE:$STACK/dist/"

echo "Termine : http://192.168.2.100:8095/torah-reader-app/"
