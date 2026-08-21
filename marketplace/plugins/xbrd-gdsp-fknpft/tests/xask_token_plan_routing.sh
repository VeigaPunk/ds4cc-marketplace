#!/usr/bin/env bash
# Offline identity checks for grok / Token Plan / cdx xask lanes.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
CAPTURE="$TMP/argv"
XASK="$ROOT/scripts/xask"

cat >"$TMP/xbreed" <<'EOF'
#!/usr/bin/env bash
printf '%s\0' "$@" >"$XASK_CAPTURE"
EOF
chmod +x "$TMP/xbreed"
# Prefer fake xbreed; keep real grok/token-plan binaries visible for command -v.
export PATH="$TMP:$HOME/.local/bin:/usr/bin:/bin"
export XASK_CAPTURE="$CAPTURE"
export XBREED_DISPATCH_DIR="$ROOT/templates/dispatch"
export HOME="$TMP/home"
mkdir -p "$HOME"

fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }

# --- grok: isolated oneshot argv, no xbreed ---
out=$(CODEX_BIN=$HOME/.local/bin/codex-titanium XBRD_SPARK_MODEL=gpt-5.6-luna \
  "$XASK" -d --gs grok ping)
printf '%s\n' "$out" | grep -q '^MODEL: grok$' || fail 'grok MODEL'
printf '%s\n' "$out" | grep -q 'LANE: grok-cli' || fail 'grok LANE'
printf '%s\n' "$out" | grep -q 'CODEX_BIN_SET=0' || fail 'grok CODEX_BIN_SET'
printf '%s\n' "$out" | grep -q 'grok --always-approve' || fail 'grok always-approve'
printf '%s\n' "$out" | grep -q -- '-p ' || fail 'grok -p'
printf '%s\n' "$out" | grep -q 'xbreed ask' && fail 'grok must not xbreed ask'
printf '%s\n' "$out" | grep -qi sekhmet && fail 'grok must not mention sekhmet'
printf '%s\n' "$out" | grep -qi titanium && fail 'grok must not mention titanium'

# --- qwen38: Token Plan wrapper, isolated ---
out=$(CODEX_BIN=$HOME/.local/bin/codex-titanium \
  "$XASK" -d --gs qwen38 ping)
printf '%s\n' "$out" | grep -q '^MODEL: qwen38$' || fail 'qwen38 MODEL'
printf '%s\n' "$out" | grep -Eq 'codex-qwen38|codex-token-plan' || fail 'qwen38 bin'
printf '%s\n' "$out" | grep -q 'CODEX_BIN_SET=0' || fail 'qwen38 CODEX_BIN_SET'
printf '%s\n' "$out" | grep -q 'xbreed ask' && fail 'qwen38 must not xbreed ask'
printf '%s\n' "$out" | grep -qi sekhmet && fail 'qwen38 must not mention sekhmet'

# Alias canonicalize
out=$("$XASK" -d --gs qwen ping)
printf '%s\n' "$out" | grep -q '^MODEL: qwen38$' || fail 'qwen alias → qwen38'

# --- cdx: stock ChatGPT Codex via xbreed ask ---
: >"$CAPTURE"
out=$("$XASK" -d --gs cdx ping)
printf '%s\n' "$out" | grep -q '^MODEL: cdx$' || fail 'cdx MODEL'
printf '%s\n' "$out" | grep -Eq 'xbreed ask|ask codex' || fail 'cdx stock codex argv'
printf '%s\n' "$out" | grep -q 'TEMPLATE:.*codex.md' || fail 'cdx uses codex.md'

# Live cdx (non-debug) hits mocked xbreed
: >"$CAPTURE"
"$XASK" --gs cdx 'live probe' >/dev/null
mapfile -d '' -t ARGV <"$CAPTURE"
[[ "${ARGV[0]} ${ARGV[1]}" == 'ask codex' ]] || fail "cdx live route got: ${ARGV[*]}"
[[ " ${ARGV[*]} " == *' --spark '* ]] || fail 'cdx default spark missing'

# --- rejects ---
if "$XASK" --spark --gs grok ping >/dev/null 2>&1; then fail 'spark+grok accepted'; fi
if "$XASK" --spark --gs qwen38 ping >/dev/null 2>&1; then fail 'spark+qwen38 accepted'; fi
if "$XASK" -d --gs deepseek ping >/dev/null 2>&1; then fail 'bare deepseek accepted'; fi

# ds-* whitelist for debug argv
out=$("$XASK" -d --gs ds-flash ping)
printf '%s\n' "$out" | grep -q '^MODEL: ds-flash$' || fail 'ds-flash MODEL'
printf '%s\n' "$out" | grep -Eq 'codex-ds-flash|codex-token-plan' || fail 'ds-flash bin'
printf '%s\n' "$out" | grep -q 'CODEX_BIN_SET=0' || fail 'ds-flash CODEX_BIN_SET'

printf 'PASS: offline xask token-plan / grok / cdx routing\n'
