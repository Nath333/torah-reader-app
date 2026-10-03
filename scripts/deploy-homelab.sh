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
# Chemin WINDOWS absolu : mklink (junction node_modules) n'accepte ni /tmp
# ni les slashes — vécu : junction silencieusement raté, vite introuvable.
WT="C:\\Users\\natha\\AppData\\Local\\Temp\\tr-deploy-homelab"

cd "$REPO"
git fetch origin -q
REF=$(git rev-parse origin/master)
echo "Deploy de origin/master ($REF) vers $HOTE:$STACK"

# Nettoyage complet d'un run precedent : la junction node_modules empeche
# `git worktree remove` de partir — la demonter d'abord.
demonter() {
  cmd //c "rmdir ${WT}\\node_modules" >/dev/null 2>&1 || true
  git worktree remove --force "$WT" 2>/dev/null || rm -rf "$WT"
  git worktree prune
}
trap 'demonter' EXIT
demonter

git worktree add --detach "$WT" "$REF" >/dev/null

# NB : mklink via `cmd` depuis un script Git Bash echoue en silence (conversion
# MSYS des arguments) — la junction se cree par PowerShell, puis on verifie.
powershell -NoProfile -Command "New-Item -ItemType Junction -Path '${WT}\\node_modules' -Target '${REPO}\\node_modules' | Out-Null"
[ -e "${WT}/node_modules/.bin/vite" ] || { echo "ERREUR : junction node_modules absente"; exit 1; }
cd "$WT"
npm run build

echo "Envoi du dist..."
scp -o BatchMode=yes -r "$WT/dist/." "$HOTE:$STACK/dist/"

cd "$REPO" # le trap demontera le worktree : ne plus se tenir dedans
echo "Termine : http://192.168.2.100:8095/torah-reader-app/"
