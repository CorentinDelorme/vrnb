#!/usr/bin/env bash
# Régénère tous les screenshots du mode d'emploi (/manual) en mode mobile (360×780).
#
# Utilise un serveur en mode PRODUCTION (next build && next start), pas le dev server.
# Seuls Chromium est utilisé, une seule passe. Jamais de fullPage (zone visible uniquement).
#
# Les screenshots sont écrits dans public/manual/.
#
# Usage: ./scripts/capture-manual.sh

set -euo pipefail

cd /home/corentin/Documents/workspace/vrnb/apps/clean

PORT=4200
BASE_URL="http://localhost:${PORT}"
SERVER_PID=""

cleanup() {
  if [ -n "${SERVER_PID}" ]; then
    echo "🛑 Arrêt du serveur Next.js (PID ${SERVER_PID})…"
    kill "${SERVER_PID}" 2>/dev/null || true
    wait "${SERVER_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT

echo "🏗️  Build Next.js (production)…"
bun run build

echo "🚀 Démarrage du serveur Next.js en production sur le port ${PORT}…"
PORT=${PORT} bunx next start -p ${PORT} &
SERVER_PID=$!

echo "⏳ Attente que le serveur réponde sur ${BASE_URL}…"
for i in $(seq 1 60); do
  if curl -sf "${BASE_URL}/" >/dev/null 2>&1; then
    echo "✅ Serveur prêt."
    break
  fi
  if [ "${i}" -eq 60 ]; then
    echo "❌ Le serveur n'a pas démarré à temps." >&2
    exit 1
  fi
  sleep 1
done

echo "📸 Capture des screenshots (Chromium, mobile 360×780)…"
bunx playwright test scripts/capture-manual.spec.ts --project=chromium

echo "✅ Terminé. Les screenshots sont dans public/manual/."
