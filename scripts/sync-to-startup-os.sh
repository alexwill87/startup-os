#!/usr/bin/env bash
# ============================================================
# sync-to-startup-os.sh — Cockpit Design System v3.0
# ============================================================
# Synchronise radar-cockpit (instance) vers startup-os (upstream).
#
# Ce script copie TOUT le code source de radar-cockpit vers startup-os
# en EXCLUANT les éléments propres à l'instance Radar :
#   - .env.local
#   - .next, node_modules, out
#   - .git
#   - HANDOVER.md (notes internes Radar)
#   - Optimisation Cockpit Radar _ Prompt Deep Search.md
#
# Le script ne touche PAS aux DB Supabase. Chaque instance garde la sienne.
#
# Usage:
#   ./scripts/sync-to-startup-os.sh             # dry-run (par défaut)
#   ./scripts/sync-to-startup-os.sh --apply     # exécution réelle
#   ./scripts/sync-to-startup-os.sh --apply --commit "message"
#
# Source de vérité : /COCKPIT_DESIGN_SYSTEM.md
# ============================================================

set -euo pipefail

# ---- Chemins ----
SRC="/home/omar/RADAR/radar-cockpit"
DST="/home/omar/RADAR/startup-os"

# ---- Couleurs ----
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# ---- Args ----
APPLY=false
COMMIT_MSG=""
while [[ $# -gt 0 ]]; do
  case $1 in
    --apply) APPLY=true; shift ;;
    --commit) COMMIT_MSG="$2"; shift 2 ;;
    -h|--help) sed -n '2,25p' "$0"; exit 0 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

# ---- Vérifs ----
if [[ ! -d "$SRC" ]]; then echo -e "${RED}SRC introuvable: $SRC${NC}"; exit 1; fi
if [[ ! -d "$DST" ]]; then echo -e "${RED}DST introuvable: $DST${NC}"; exit 1; fi

echo -e "${BLUE}===========================================${NC}"
echo -e "${BLUE}  Sync radar-cockpit → startup-os${NC}"
echo -e "${BLUE}===========================================${NC}"
echo "  SRC : $SRC"
echo "  DST : $DST"
echo "  Mode: $(if $APPLY; then echo 'APPLY (réel)'; else echo 'DRY-RUN'; fi)"
echo ""

# ---- Exclusions ----
# Tout ce qui est propre à l'instance Radar (pas synchronisé)
EXCLUDES=(
  --exclude='.env'
  --exclude='.env.local'
  --exclude='.env.*.local'
  --exclude='.next/'
  --exclude='node_modules/'
  --exclude='out/'
  --exclude='.git/'
  --exclude='.vercel/'
  --exclude='HANDOVER.md'
  --exclude='Optimisation Cockpit Radar*'
  --exclude='*.log'
  --exclude='.DS_Store'
)

# ---- Rsync ----
RSYNC_OPTS="-av --delete-after"
if ! $APPLY; then
  RSYNC_OPTS="$RSYNC_OPTS --dry-run"
fi

echo -e "${YELLOW}>>> Fichiers à synchroniser :${NC}"
echo ""

rsync $RSYNC_OPTS "${EXCLUDES[@]}" "$SRC/" "$DST/" | grep -v '^$' | head -100 || true

echo ""

# ---- Résumé ----
if ! $APPLY; then
  echo -e "${YELLOW}===========================================${NC}"
  echo -e "${YELLOW}  DRY-RUN terminé. Aucun fichier modifié.${NC}"
  echo -e "${YELLOW}  Pour appliquer : $0 --apply${NC}"
  echo -e "${YELLOW}===========================================${NC}"
  exit 0
fi

echo -e "${GREEN}===========================================${NC}"
echo -e "${GREEN}  Sync appliquée avec succès${NC}"
echo -e "${GREEN}===========================================${NC}"

# ---- Commit (optionnel) ----
if [[ -n "$COMMIT_MSG" ]]; then
  echo ""
  echo -e "${BLUE}>>> Commit dans startup-os...${NC}"
  cd "$DST"
  git add -A
  if git diff --cached --quiet; then
    echo "  Aucun changement à commiter."
  else
    git commit -m "$COMMIT_MSG"
    echo -e "${GREEN}  Commit créé. À pousser manuellement : git push${NC}"
  fi
fi

echo ""
echo -e "${BLUE}>>> Prochaines étapes :${NC}"
echo "  1. cd $DST"
echo "  2. git status                        # vérifier"
echo "  3. git diff                          # inspecter"
echo "  4. git push                          # pousser quand prêt"
echo ""
