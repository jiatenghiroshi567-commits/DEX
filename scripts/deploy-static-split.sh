#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONT_TARGET_DIR="${FRONT_TARGET_DIR:-/var/www/perpx-front}"
ADMIN_TARGET_DIR="${ADMIN_TARGET_DIR:-/var/www/perpx-admin}"

cd "$ROOT_DIR"

echo "[deploy] install dependencies"
npm ci

echo "[deploy] build front/admin static"
npm run build:split

echo "[deploy] sync dist-front -> ${FRONT_TARGET_DIR}"
sudo mkdir -p "${FRONT_TARGET_DIR}"
sudo rsync -a --delete "${ROOT_DIR}/dist-front/" "${FRONT_TARGET_DIR}/"

echo "[deploy] sync dist-admin -> ${ADMIN_TARGET_DIR}"
sudo mkdir -p "${ADMIN_TARGET_DIR}"
sudo rsync -a --delete "${ROOT_DIR}/dist-admin/" "${ADMIN_TARGET_DIR}/"

if command -v nginx >/dev/null 2>&1; then
  echo "[deploy] reload nginx"
  sudo nginx -t
  sudo systemctl reload nginx
fi

echo "[deploy] done"
