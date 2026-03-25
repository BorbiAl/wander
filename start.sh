#!/usr/bin/env bash
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
(
  cd "$ROOT/engine"
  make
  ./wander_engine
) &
(
  cd "$ROOT/hmm"
  python app.py
) &
(
  cd "$ROOT/frontend"
  npm run dev
) &
wait
