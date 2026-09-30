#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
set -a
# shellcheck disable=SC1091
source .env
set +a
: "${VITE_SUPABASE_URL:?}"
: "${SUPABASE_DB_PASSWORD:?}"
node scripts/seed-100-profiles.mjs
