#!/usr/bin/env bash

# Deploy the currently published main branch. Run this on the production server.
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/var/www/dit-ac-control}"
BRANCH="${BRANCH:-main}"
LOCK_FILE="/tmp/dit-ac-control-deploy.lock"

exec 9>"$LOCK_FILE"
flock -n 9 || { echo "A DIT AC Control deployment is already running." >&2; exit 1; }

cd "$APP_DIR"

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Refusing to deploy over uncommitted server changes." >&2
  exit 1
fi

git fetch --prune origin "$BRANCH"
git reset --hard "origin/$BRANCH"

npm ci
if command -v docker >/dev/null 2>&1; then
  docker compose up -d postgres
else
  echo "Docker is unavailable; using the configured production database."
fi
npm --workspace apps/api run prisma:generate
if [ -d apps/api/prisma/migrations ] && find apps/api/prisma/migrations -mindepth 1 -type f -print -quit | grep -q .; then
  npm --workspace apps/api exec prisma migrate deploy
else
  echo "No Prisma migrations found; preserving the existing production schema."
fi
npm run build
pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save

echo "Deployment complete: $(git rev-parse --short HEAD)"
