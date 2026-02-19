#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

FRONT_DIR="${FRONT_DIR:-dist-front}"
ADMIN_DIR="${ADMIN_DIR:-dist-admin}"
API_PORT="${API_PORT:-3010}"
FRONT_PORT="${FRONT_PORT:-3000}"
ADMIN_PORT="${ADMIN_PORT:-3002}"

if [[ ! -d "${ROOT_DIR}/${FRONT_DIR}" ]]; then
  if [[ -d "${ROOT_DIR}/dist" ]]; then
    FRONT_DIR="dist"
  else
    echo "[preview] missing front directory: ${ROOT_DIR}/${FRONT_DIR}"
    echo "[preview] build first: npm run build:front"
    exit 1
  fi
fi

if [[ ! -d "${ROOT_DIR}/${ADMIN_DIR}" ]]; then
  if [[ -d "${ROOT_DIR}/dist" ]]; then
    ADMIN_DIR="dist"
  else
    echo "[preview] missing admin directory: ${ROOT_DIR}/${ADMIN_DIR}"
    echo "[preview] build first: npm run build:admin"
    exit 1
  fi
fi

pids=()
cleanup() {
  for pid in "${pids[@]}"; do
    kill "$pid" >/dev/null 2>&1 || true
  done
}
trap cleanup EXIT INT TERM

echo "[preview] starting mock api on :${API_PORT}"
python3 "${ROOT_DIR}/scripts/mock_admin_bridge_server.py" --port "${API_PORT}" &
pids+=("$!")

echo "[preview] starting front on :${FRONT_PORT} (${FRONT_DIR})"
python3 "${ROOT_DIR}/scripts/serve_spa.py" "${ROOT_DIR}/${FRONT_DIR}" --port "${FRONT_PORT}" &
pids+=("$!")

echo "[preview] starting admin on :${ADMIN_PORT} (${ADMIN_DIR})"
python3 "${ROOT_DIR}/scripts/serve_spa.py" "${ROOT_DIR}/${ADMIN_DIR}" --port "${ADMIN_PORT}" &
pids+=("$!")

echo
echo "Frontend: http://localhost:${FRONT_PORT}"
echo "Admin   : http://localhost:${ADMIN_PORT}"
echo "API     : http://localhost:${API_PORT}/healthz"
echo
echo "Press Ctrl+C to stop all servers."

wait
