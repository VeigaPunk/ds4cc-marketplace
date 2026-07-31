#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SKILL="$ROOT/skills/agent-model-selector/SKILL.md"

grep -Fq 'local xbrd-gdsp-fknpft agent delegation' "$SKILL"
grep -Fq 'must not' "$SKILL"
grep -Fq 'opencode.json' "$SKILL"
grep -Fq 'templates/agents/*.md' "$SKILL"
grep -Fq 'XBREED_AGENTS_DIR' "$SKILL"
grep -Fq 'models_cache.json' "$SKILL"
grep -Fq 'ollama list' "$SKILL"
grep -Fq 'question' "$SKILL"
grep -Fq -- '--model-id <exact-model-id>' "$SKILL"
grep -Fq 'replace the symlink with a local' "$SKILL"
grep -Fq 'repository routing documentation' "$SKILL"
grep -Fq 'exact diff' "$SKILL"
grep -Fq 'SPARK: false' "$SKILL"
grep -Fq '[A-Za-z0-9._:/+-]+' "$SKILL"
grep -Fq 'printf %q' "$SKILL"

if grep -Fq 'opencode agent list' "$SKILL" || grep -Fq 'opencode models' "$SKILL"; then
  printf 'selector still uses OpenCode discovery\n' >&2
  exit 1
fi

printf 'PASS: selector configures local xbreed delegation commands\n'
