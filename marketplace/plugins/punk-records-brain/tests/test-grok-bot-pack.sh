#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PACK="$ROOT/templates/grok-bot-pack/pack.json"
fail() { echo "FAIL: $*" >&2; exit 1; }

[[ -f "$PACK" ]] || fail "pack.json"
python3 - "$PACK" "$ROOT" <<'PY' || fail "pack schema"
import json, pathlib, sys
pack = json.load(open(sys.argv[1], encoding="utf-8"))
root = pathlib.Path(sys.argv[2])
assert pack["kind"] == "grok-bot-pack"
assert pack["surface"]["nudge"] is True
assert pack["group"]["name"]
assert len(pack["bots"]) == 7
ids = [b["id"] for b in pack["bots"]]
assert ids[0] == "stella"
assert set(ids) == {"stella", "shaka", "lilith", "edison", "pythagoras", "atlas", "york"}
for bot in pack["bots"]:
    path = root / bot["file"]
    assert path.is_file(), path
    text = path.read_text(encoding="utf-8")
    assert text.startswith("---")
    assert "punk-records" in text, path
    assert "PUNK_MARK" in text, path
    if bot["id"] != "stella":
        assert "SYNC-OUT" in text, path
    else:
        assert "SYNC-IN" in text and "EGGHEAD // PUNK RECORDS" in text, path
PY

out=$("$ROOT/scripts/bootstrap-grok-bot.sh" --dry-run --cli grok --no-inject --out /tmp/punk-records-apply-test.md)
echo "$out" | grep -q '^CLI=grok' || fail "cli"
echo "$out" | grep -q 'SURFACE_' || fail "surface line"
echo "$out" | grep -q 'WOULD_SEED' || fail "seed"
echo "$out" | grep -q 'WOULD_CDP_WRITE=' || fail "cdp write plan"
echo "$out" | grep -q 'APPLY=' || fail "apply"
[[ -x "$ROOT/scripts/set-grok-bot.sh" ]] || fail "set-grok-bot"
[[ -x "$ROOT/bin/set-grok-bot" ]] || fail "bin/set-grok-bot"
[[ -f "$ROOT/commands/set-grok-bot.md" ]] || fail "set-grok-bot command"
[[ -f "$ROOT/scripts/write-grok-bot-profiles.py" ]] || fail "cdp writer"
grep -q 'PUNK-01 SHAKA' /tmp/punk-records-apply-test.md || fail "apply body"
grep -q 'EGGHEAD // PUNK RECORDS' /tmp/punk-records-apply-test.md || fail "group"
echo "ok grok-bot-pack"
