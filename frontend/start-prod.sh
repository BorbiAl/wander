#!/usr/bin/env bash
set -a
source "$(dirname "$0")/.env.local"
set +a
PORT=${PORT:-3000} exec node "$(dirname "$0")/.next/standalone/server.js"
