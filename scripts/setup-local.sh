#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/mayurshcode/whatapp_test.git}"
TARGET="${1:-${HOME}/whatapp_test}"

if [[ ! -d "${TARGET}/.git" ]]; then
  echo "Cloning ${REPO_URL} into ${TARGET}"
  git clone "${REPO_URL}" "${TARGET}"
else
  echo "Updating existing checkout at ${TARGET}"
  git -C "${TARGET}" pull --ff-only origin main
fi

cd "${TARGET}"

if [[ -f package-lock.json ]]; then
  npm ci
else
  npm install
fi

if [[ ! -f .env.local ]]; then
  cp .env.example .env.local
fi

npm run build

echo
echo "Local workspace is ready: ${TARGET}"
echo "Start it with:"
echo "  cd ${TARGET} && npm start"
echo "Then open http://127.0.0.1:43147"
