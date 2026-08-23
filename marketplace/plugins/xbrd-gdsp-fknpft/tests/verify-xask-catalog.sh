#!/usr/bin/env bash
# Cheap PATH-vs-plugin catalog identity gate. No model exec.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
H="${XBREED_HOME:-$HOME}"
REPO_CATALOG="$ROOT/config/xask-models.json"
INSTALLED_CATALOG="$H/.local/share/xbreed/xask-models.json"

fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }

[[ -f "$REPO_CATALOG" ]] || fail "plugin catalog missing: $REPO_CATALOG"
[[ -f "$INSTALLED_CATALOG" ]] || fail "PATH catalog missing: $INSTALLED_CATALOG"
cmp -s "$REPO_CATALOG" "$INSTALLED_CATALOG" \
  || fail "PATH catalog $INSTALLED_CATALOG differs from plugin $REPO_CATALOG"

printf 'PASS: PATH xask catalog matches plugin config/xask-models.json\n'
