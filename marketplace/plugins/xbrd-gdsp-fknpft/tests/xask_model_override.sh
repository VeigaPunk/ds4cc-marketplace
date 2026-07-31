#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP/bin"

cat >"$TMP/bin/xbreed" <<'SH'
#!/usr/bin/env bash
printf 'codex_model=%s\n' "${XBREED_CODEX_MODEL:-}"
printf 'gemma_model=%s\n' "${HVM_GEMMA_MODEL:-}"
printf 'argv='; printf '%q ' "$@"; printf '\n'
SH
chmod +x "$TMP/bin/xbreed"

codex_out="$(HOME="$TMP" PATH="$TMP/bin:/usr/bin:/bin" XBREED_DISPATCH_DIR="$ROOT/templates/dispatch" \
  bash "$ROOT/scripts/xask" --model-id gpt-local-choice --effort high codex probe)"
grep -Fq -- '--model gpt-local-choice' <<<"$codex_out"
grep -Fq -- '--effort high' <<<"$codex_out"
if grep -Fq -- '--spark' <<<"$codex_out"; then
  printf 'custom model unexpectedly inherited spark\n' >&2
  exit 1
fi

gemma_out="$(HOME="$TMP" PATH="$TMP/bin:/usr/bin:/bin" XBREED_DISPATCH_DIR="$ROOT/templates/dispatch" \
  bash "$ROOT/scripts/xask" --model-id gemma-local-choice --effort medium gemma probe)"
grep -Fq -- '--model gemma-local-choice' <<<"$gemma_out"
grep -Fq -- '--effort medium' <<<"$gemma_out"

if HOME="$TMP" PATH="$TMP/bin:/usr/bin:/bin" XBREED_DISPATCH_DIR="$ROOT/templates/dispatch" \
  bash "$ROOT/scripts/xask" --spark --model-id conflict codex probe >/dev/null 2>&1; then
  printf 'conflicting lane and custom model was accepted\n' >&2
  exit 1
fi

cat >"$TMP/bin/codex" <<'SH'
#!/usr/bin/env bash
printf '%s\n' "$@" >"$CODEX_ARGV_LOG"
printf 'ok\n'
SH
chmod +x "$TMP/bin/codex"
CODEX_ARGV_LOG="$TMP/codex.argv" HOME="$TMP" PATH="$TMP/bin:/usr/bin:/bin" \
  XASK_TIMEOUT_SECS=5 cargo run --quiet --manifest-path "$ROOT/Cargo.toml" -- \
  ask codex --model gpt-rust-layer-choice --effort high probe >/dev/null
grep -Fxq 'gpt-rust-layer-choice' "$TMP/codex.argv"
grep -Fxq 'model_reasoning_effort=high' "$TMP/codex.argv"

printf 'PASS: xask transports exact local model overrides\n'
