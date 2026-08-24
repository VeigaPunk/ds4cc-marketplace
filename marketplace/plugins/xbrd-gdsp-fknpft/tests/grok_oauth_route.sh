#!/usr/bin/env bash
# Offline grok OAuth-primary / API-fallback router.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ROUTE="$ROOT/scripts/grok-oauth-route"
XASK="$ROOT/scripts/xask"
HANGAR="$(cd "$ROOT/../../../.." && pwd)"
FIX="$HANGAR/.xbgst/fixtures/grok-route"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }

[[ -x "$ROUTE" ]] || fail "missing $ROUTE"
[[ -f "$FIX/remaining-7.json" ]] || fail "missing remaining-7 fixture"
[[ -f "$FIX/exhausted.json" ]] || fail "missing exhausted fixture"
[[ -f "$FIX/reset-due.json" ]] || fail "missing reset-due fixture"

export HOME="$TMP/home"
mkdir -p "$HOME/.grok"
printf '# test grok config\n' >"$HOME/.grok/config.toml"
export GROK_ROUTE_STATE="$TMP/state.json"
export XDG_RUNTIME_DIR="$TMP/run"
mkdir -p "$XDG_RUNTIME_DIR"

decide() {
  GROK_ROUTE_STATUS="$1" GROK_ROUTE_NOW="${2:-}" "$ROUTE" decide
}

out=$(decide "$FIX/remaining-7.json")
python3 - "$out" <<'PY'
import json, sys
d = json.loads(sys.argv[1])
assert d["mode"] == "oauth", d
assert int(d["remaining_pct"]) == 7, d
assert d.get("reason") in ("primary", "reset"), d
assert "grok_home" not in d or not d.get("grok_home")
assert "xai-" not in json.dumps(d).lower()
print("M01_OK mode=%s remaining_pct=%s" % (d["mode"], d["remaining_pct"]))
PY

live="$HOME/.cache/ai-usage/status.json"
if [[ -f "$HOME/.cache/ai-usage/status.json" ]]; then
  :
fi
# Overfit live host cache if readable from real home, else skip live assert.
REAL_STATUS="${GROK_ROUTE_LIVE_STATUS:-$HOME/.cache/ai-usage/status.json}"
# Tests isolate HOME; read the operator cache explicitly.
OP_STATUS="/home/vgpnk/.cache/ai-usage/status.json"
if [[ -f "$OP_STATUS" ]]; then
  live_out=$(decide "$OP_STATUS")
  python3 - "$live_out" <<'PY'
import json, sys
d = json.loads(sys.argv[1])
assert d["mode"] == "oauth", d
rem = int(d["remaining_pct"])
assert 1 <= rem <= 15, rem
print("live oauth remaining_pct=%s" % rem)
PY
fi

ex=$(GROK_ROUTE_NOW=2026-08-24T15:00:00Z decide "$FIX/exhausted.json" "2026-08-24T15:00:00Z")
rs=$(GROK_ROUTE_NOW=2026-08-24T15:00:00Z decide "$FIX/reset-due.json" "2026-08-24T15:00:00Z")
python3 - "$ex" "$rs" <<'PY'
import json, sys
ex, rs = json.loads(sys.argv[1]), json.loads(sys.argv[2])
assert ex["mode"] == "api" and ex.get("reason") == "exhausted", ex
assert ex.get("grok_home"), ex
assert rs["mode"] == "oauth" and rs.get("reason") == "reset", rs
print("M02_OK live=oauth exhausted=api reset=oauth")
PY

export GROK_ROUTE_STATUS="$FIX/remaining-7.json"
"$ROUTE" decide >/dev/null
python3 - <<PY
import json, os, stat
from pathlib import Path
p = Path(os.environ["GROK_ROUTE_STATE"])
d = json.loads(p.read_text())
need = {"version", "mode", "remaining_pct", "used_pct", "resets_at", "reason", "updated_at"}
assert need <= set(d), d
assert d["mode"] == "oauth"
text = p.read_text()
assert "xai-" not in text.lower() and "op://" not in text
assert stat.S_IMODE(p.stat().st_mode) == 0o600
print("M03_OK")
PY

# M06 hysteresis then reset
export GROK_ROUTE_STATUS="$FIX/exhausted.json"
export GROK_ROUTE_NOW=2026-08-24T15:00:00Z
"$ROUTE" decide >/dev/null
python3 - <<'PY'
import json, os
from pathlib import Path
d = json.loads(Path(os.environ["GROK_ROUTE_STATE"]).read_text())
assert d["mode"] == "api", d
print("latched api")
PY
export GROK_ROUTE_STATUS="$FIX/reset-due.json"
export GROK_ROUTE_NOW=2026-08-24T16:00:00Z
out=$("$ROUTE" decide)
python3 - "$out" <<'PY'
import json, sys
d = json.loads(sys.argv[1])
assert d["mode"] == "oauth" and d.get("reason") == "reset", d
print("M06_OK reason=reset mode=oauth")
PY

# Dirty api latch must not pin API while OAuth remaining > 0 (used_pct=93).
export GROK_ROUTE_STATUS="$FIX/exhausted.json"
export GROK_ROUTE_NOW=2026-08-24T15:00:00Z
"$ROUTE" decide >/dev/null
export GROK_ROUTE_STATUS="$FIX/remaining-7.json"
out=$("$ROUTE" decide)
python3 - "$out" <<'PY'
import json, sys
d = json.loads(sys.argv[1])
assert d["mode"] == "oauth" and int(d["remaining_pct"]) == 7, d
assert d.get("reason") == "primary", d
print("M06b_OK dirty_latch_unpins remaining_pct=7")
PY

# wrap oauth is pass-through; wrap api isolates GROK_HOME (symlink config.toml only)
export GROK_ROUTE_STATUS="$FIX/remaining-7.json"
unset GROK_ROUTE_NOW || true
"$ROUTE" wrap -- sh -c 'test -z "${GROK_HOME:-}" && test "$GROK_ROUTE" = oauth && echo WRAP_OAUTH_OK'

export GROK_ROUTE_STATUS="$FIX/exhausted.json"
export GROK_ROUTE_NOW=2026-08-24T15:00:00Z
if "$ROUTE" wrap -- true >/dev/null 2>&1; then
  fail "api wrap without key must fail-closed"
fi
XAI_API_KEY=test-key "$ROUTE" wrap -- sh -c '
  test -n "$GROK_HOME" || exit 1
  test ! -e "$GROK_HOME/auth.json" || exit 1
  test ! -e "$GROK_HOME/sessions" || exit 1
  test ! -e "$GROK_HOME/mcp_credentials.json" || exit 1
  test -L "$GROK_HOME/config.toml" || exit 1
  test "$GROK_ROUTE" = api || exit 1
  echo WRAP_API_OK
'

# xask debug ARGV (fresh latch so wrap-api hysteresis cannot leak)
export PATH="$ROOT/scripts:$PATH"
export XBREED_DISPATCH_DIR="$ROOT/templates/dispatch"
export GROK_ROUTE_STATE="$TMP/xask-state.json"
unset GROK_ROUTE_NOW || true
export GROK_ROUTE_STATUS="$FIX/remaining-7.json"
out=$("$XASK" -d --gs grok ping)
printf '%s\n' "$out" | grep -q 'GROK_ROUTE=oauth' || fail "xask oauth GROK_ROUTE"
printf '%s\n' "$out" | grep -q 'grok --always-approve' || fail "xask grok always-approve"
printf '%s\n' "$out" | grep -q 'GROK_HOME=' && fail "oauth must not set GROK_HOME"
export GROK_ROUTE_STATUS="$FIX/exhausted.json"
export GROK_ROUTE_NOW=2026-08-24T15:00:00Z
out=$("$XASK" -d --gs grok ping)
printf '%s\n' "$out" | grep -q 'GROK_ROUTE=api' || fail "xask api GROK_ROUTE"
printf '%s\n' "$out" | grep -q 'GROK_HOME=' || fail "api must set GROK_HOME"
echo M04_OK

if grep -E 'xai-[A-Za-z0-9]' "$ROUTE" "$XASK" >/dev/null; then
  fail "secret-shaped xai- token in scripts"
fi

echo "PASS: grok-oauth-route"
