#!/usr/bin/env bash
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

(
  cd "$ROOT/engine"
  make
  ./wander_engine 2>&1 | sed 's/^/[engine] /'
) &

(
  cd "$ROOT/hmm"
  python3 app.py 2>&1 | sed 's/^/[hmm] /'
) &

(
  cd "$ROOT/frontend"
  npm run build 2>&1 | sed 's/^/[frontend:build] /'
  npm run start 2>&1 | sed 's/^/[frontend] /'
) &

wait
