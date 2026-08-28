#!/usr/bin/env bash
# Offline identity checks for grok / Token Plan / cdx xask lanes.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HANGAR="$(cd "$ROOT/../../../.." && pwd)"
FIX="$HANGAR/.xbgst/fixtures/grok-route"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
CAPTURE="$TMP/argv"
XASK="$ROOT/scripts/xask"
export GROK_ROUTE_STATE="$TMP/grok-route.json"
unset GROK_ROUTE_STATUS GROK_ROUTE_NOW GROK_OAUTH_EXHAUST_PCT || true

cat >"$TMP/xbreed" <<'EOF'
#!/usr/bin/env bash
printf '%s\0' "$@" >"$XASK_CAPTURE"
EOF
chmod +x "$TMP/xbreed"
cat >"$TMP/sekhmet" <<'EOF'
#!/usr/bin/env bash
printf '%s\0' "$@" >"$XASK_CAPTURE"
EOF
chmod +x "$TMP/sekhmet"
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
printf '%s\n' "$out" | grep -q 'GROK_ROUTE=oauth' || fail 'grok GROK_ROUTE=oauth'
printf '%s\n' "$out" | grep -q 'GROK_HOME=' && fail 'grok oauth must not set GROK_HOME'
[[ -f "$FIX/exhausted.json" ]] || fail "missing $FIX/exhausted.json"
out=$(GROK_ROUTE_STATUS="$FIX/exhausted.json" GROK_ROUTE_NOW=2026-08-24T15:00:00Z \
  GROK_ROUTE_STATE="$TMP/grok-route-api.json" \
  "$XASK" -d --gs grok ping)
printf '%s\n' "$out" | grep -q 'GROK_ROUTE=api' || fail 'grok exhausted GROK_ROUTE=api'
printf '%s\n' "$out" | grep -q 'GROK_HOME=' && fail 'grok exhausted must not set GROK_HOME'
printf '%s\n' "$out" | grep -q 'grok --always-approve' || fail 'grok api always-approve'
printf '%s\n' "$out" | grep -q 'env -u CODEX_BIN -u XBRD_SPARK_MODEL' || fail 'grok api unsets CODEX_BIN'
out=$("$XASK" -d --gs -e low grok ping)
printf '%s\n' "$out" | grep -q -- '--reasoning-effort low' || fail 'grok -e → --reasoning-effort'
if "$XASK" -d --json --gs grok ping >/dev/null 2>&1; then fail 'grok --json must fail-loud'; fi
if "$XASK" -d --gpt55 --gs qwen38 ping >/dev/null 2>&1; then fail 'qwen38 --gpt55 must fail-loud'; fi
if "$XASK" -d --spark --json --gs cdx ping >/dev/null 2>&1; then fail 'spark --json must fail-loud'; fi
out=$("$XASK" -d --gs -e low qwen38 ping)
printf '%s\n' "$out" | grep -q 'model_reasoning_effort=low' || fail 'qwen38 -e → -c model_reasoning_effort'
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
printf '%s\n' "$out" | grep -q 'model_reasoning_effort=xhigh' || fail 'qwen38 default effort must pin xhigh'
out=$("$XASK" -d --gs ds-flash ping)
printf '%s\n' "$out" | grep -q 'model_reasoning_effort=low' || fail 'ds-flash default effort must pin low'
out=$("$XASK" -d --gs ds-pro ping)
printf '%s\n' "$out" | grep -q 'model_reasoning_effort=medium' || fail 'ds-pro default effort must pin medium'
out=$("$XASK" -d --gs qwen38 ping)
printf '%s\n' "$out" | grep -q 'service_tier=fast' && fail 'qwen38 must not pin -c service_tier=fast (catalog default-only)'
if "$XASK" -d --gs --service-tier fast qwen38 ping >/dev/null 2>&1; then
  fail 'qwen38 accepted --service-tier fast'
fi
if "$XASK" -d --gs --service-tier fast ds-pro ping >/dev/null 2>&1; then
  fail 'ds-pro accepted --service-tier fast'
fi

# Alias canonicalize
out=$("$XASK" -d --gs qwen ping)
printf '%s\n' "$out" | grep -q '^MODEL: qwen38$' || fail 'qwen alias → qwen38'

# --- cdx: stock xbreed when the Codex-limit pin is cleared ---
: >"$CAPTURE"
out=$(XASK_CODEX_FALLBACK= "$XASK" -d --gs cdx ping)
printf '%s\n' "$out" | grep -q '^MODEL: cdx$' || fail 'cdx MODEL'
printf '%s\n' "$out" | grep -q 'LANE: stock-codex' || fail 'cdx default LANE stock-codex'
printf '%s\n' "$out" | grep -q 'xbreed ask' || fail 'cdx default argv xbreed ask'
printf '%s\n' "$out" | grep -qi sekhmet && fail 'cdx default must not sekhmet'
printf '%s\n' "$out" | grep -q 'TEMPLATE:.*codex.md' || fail 'cdx uses codex.md'

# --- first xask (unset pin) → native kimi CLI OAuth K3 ---
out=$(env -u XASK_CODEX_FALLBACK "$XASK" -d --gs cdx ping 2>/tmp/xask-cdx-fb.err)
printf '%s\n' "$out" | grep -q '^MODEL: kimi$' || fail 'first xask MODEL kimi'
printf '%s\n' "$out" | grep -q 'LANE: kimi-code-cli' || fail 'first xask LANE kimi-code-cli'
printf '%s\n' "$out" | grep -q -- '-m kimi-code/k3' || fail 'first xask pins OAuth kimi-code/k3'
printf '%s\n' "$out" | grep -q 'KIMI_AUTH: oauth' || fail 'first xask KIMI_AUTH oauth'
printf '%s\n' "$out" | grep -q 'xbreed ask' && fail 'first xask must not xbreed ask'
grep -q 'native kimi CLI OAuth' /tmp/xask-cdx-fb.err || fail 'first xask stderr names native kimi OAuth'

# --- spark on cdx → sekhmet (debug argv; L3, not Token Plan) ---
# Unset ambient pin so the default-slug assertion is host-env independent.
out=$(env -u XBRD_SPARK_MODEL -u XBRD_SPARK_FALLBACK_MODEL "$XASK" -d --spark --gs cdx ping)
printf '%s\n' "$out" | grep -q 'LANE: sekhmet' || fail 'spark LANE sekhmet'
printf '%s\n' "$out" | grep -q 'sekhmet run' || fail 'spark argv sekhmet run'
printf '%s\n' "$out" | grep -q 'XBRD_SPARK_MODEL=gpt-5.3-codex-spark' || fail 'spark default codex-spark'
printf '%s\n' "$out" | grep -q 'gpt-5.4-mini' && fail 'spark must not be xbreed mini'
printf '%s\n' "$out" | grep -q 'codex-qwen38' && fail 'spark must not Token Plan'

# --- rejects ---
if "$XASK" --spark --gs grok ping >/dev/null 2>&1; then fail 'spark+grok accepted'; fi
if "$XASK" --spark --gs qwen38 ping >/dev/null 2>&1; then fail 'spark+qwen38 accepted'; fi
if "$XASK" -d --gs deepseek ping >/dev/null 2>&1; then fail 'bare deepseek accepted'; fi

# ds-* whitelist for debug argv
out=$("$XASK" -d --gs ds-flash ping)
printf '%s\n' "$out" | grep -q '^MODEL: ds-flash$' || fail 'ds-flash MODEL'
printf '%s\n' "$out" | grep -Eq 'codex-ds-flash|codex-token-plan' || fail 'ds-flash bin'
printf '%s\n' "$out" | grep -q 'CODEX_BIN_SET=0' || fail 'ds-flash CODEX_BIN_SET'

# --- kimi: Kimi Code CLI one-shot over Moonshot API, isolated ---
out=$(CODEX_BIN=$HOME/.local/bin/codex-titanium \
  "$XASK" -d --gs kimi ping)
printf '%s\n' "$out" | grep -q '^MODEL: kimi$' || fail 'kimi MODEL'
printf '%s\n' "$out" | grep -q 'LANE: kimi-code-cli' || fail 'kimi LANE'
printf '%s\n' "$out" | grep -q -- '-m kimi-code/k3' || fail 'kimi pins OAuth-managed K3 alias'
printf '%s\n' "$out" | grep -q -- 'kimi -m kimi-code/k3 -p ' || fail 'kimi argv shape'
printf '%s\n' "$out" | grep -q 'KIMI_ALIAS: kimi-code/k3' || fail 'kimi KIMI_ALIAS'
printf '%s\n' "$out" | grep -q 'KIMI_AUTH: oauth' || fail 'kimi KIMI_AUTH oauth'
printf '%s\n' "$out" | grep -q 'CODEX_BIN_SET=0' || fail 'kimi CODEX_BIN_SET'
printf '%s\n' "$out" | grep -q 'TEMPLATE:.*kimi.md' || fail 'kimi uses kimi.md'
printf '%s\n' "$out" | grep -q 'xbreed ask' && fail 'kimi must not xbreed ask'
printf '%s\n' "$out" | grep -qi sekhmet && fail 'kimi must not mention sekhmet'

# Alias canonicalization (model-named + transport-named)
out=$("$XASK" -d --gs kimi-k3 ping)
printf '%s\n' "$out" | grep -q '^MODEL: kimi$' || fail 'kimi-k3 alias → kimi'
out=$("$XASK" -d --gs kimi-code ping)
printf '%s\n' "$out" | grep -q '^MODEL: kimi$' || fail 'kimi-code alias → kimi'

# Explicit --model-id rewrites short catalog ids to the kimi CLI alias
out=$("$XASK" -d --gs --model-id kimi-for-coding kimi ping 2>/dev/null) \
  || fail 'kimi rejected a legal --model-id'
printf '%s\n' "$out" | grep -q -- '-m kimi-code/kimi-for-coding' || fail 'kimi-for-coding rewrites to OAuth CLI alias'
out=$("$XASK" -d --gs --model-id kimi-k2.6 kimi ping 2>/dev/null) \
  || fail 'kimi rejected kimi-k2.6'
printf '%s\n' "$out" | grep -q -- '-m moonshotai/kimi-k2.6' || fail 'kimi-k2.6 rewrites to pay-as-you-go CLI alias'
printf '%s\n' "$out" | grep -q 'KIMI_AUTH: api-key' || fail 'kimi-k2.6 KIMI_AUTH api-key'

# API-key provider alias stays reachable for pay-as-you-go (OAuth quota exhausted)
out=$("$XASK" -d --gs --model-id moonshotai/kimi-k3 kimi ping 2>/dev/null) \
  || fail 'kimi rejected the API-key provider alias'
printf '%s\n' "$out" | grep -q -- '-m moonshotai/kimi-k3' || fail 'kimi API-key alias passthrough'
out=$("$XASK" -d --provider moonshot --model-id kimi-k2.6 -- ping 2>/dev/null) \
  || fail 'provider moonshot rejected kimi-k2.6'
printf '%s\n' "$out" | grep -q -- '-m moonshotai/kimi-k2.6' || fail 'provider moonshot kimi-k2.6 argv'

# Rejects: bare vendor name is ambiguous; spark is ChatGPT-only; Codex JSONL flags unsupported
if "$XASK" -d --gs moonshot ping >/dev/null 2>&1; then fail 'bare moonshot accepted'; fi
if "$XASK" --spark --gs kimi ping >/dev/null 2>&1; then fail 'spark+kimi accepted'; fi
if "$XASK" -d --json --gs kimi ping >/dev/null 2>&1; then fail 'kimi --json must fail-loud'; fi
if "$XASK" -e medium --gs kimi ping >/dev/null 2>&1; then fail 'kimi accepted unsupported medium effort'; fi

printf 'PASS: offline xask token-plan / grok / cdx / kimi routing\n'
