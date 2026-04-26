#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="/opt/n2jewelry-inventory"
APP_DIR="/opt/n2jewelry-inventory/open-tool/n2jewelry-inventory"
BRANCH="${1:-main}"

if [[ ! -d "$REPO_DIR/.git" ]]; then
  echo "Missing repo at $REPO_DIR"
  exit 1
fi

cd "$REPO_DIR"
git fetch origin
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

cd "$APP_DIR"
if [[ ! -f ".env.vps" ]]; then
  echo "Missing .env.vps in $APP_DIR"
  exit 1
fi

docker compose -f docker-compose.vps.yml --env-file .env.vps up -d --build

echo "Waiting for app health..."
for i in {1..30}; do
  if curl -fsS http://127.0.0.1:3020/api/health > /dev/null; then
    echo "Deployment healthy."
    exit 0
  fi
  sleep 2
done

echo "App did not become healthy in time."
exit 1
