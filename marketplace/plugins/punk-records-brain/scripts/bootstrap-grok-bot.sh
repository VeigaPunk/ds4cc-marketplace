#!/usr/bin/env bash
# Config Grok Bot from this pack using the preferred Few Good CLI.
# Nudges xbgst-surface, seeds Punk Records, renders APPLY, injects or prints.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PACK="$ROOT/templates/grok-bot-pack/pack.json"
APPLY_TPL="$ROOT/templates/grok-bot-pack/APPLY.md"
NUDGE="$ROOT/scripts/nudge-grok-bot-surface.sh"
SEED="$ROOT/scripts/init-punk-records.sh"

DRY=0
INJECT=""
CLI="auto"
RECORDS=""
OUT=""

usage() {
  cat <<'EOF' >&2
usage: set-grok-bot / bootstrap-grok-bot.sh [--dry-run] [--inject|--no-inject]
                             [--cli auto|grok|codex|kimi|cursor-agent|opencode]
                             [--records DIR] [--out FILE]
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY=1; shift ;;
    --inject) INJECT=1; shift ;;
    --no-inject) INJECT=0; shift ;;
    --cli) CLI="${2:-}"; [[ -n "$CLI" ]] || { echo "missing --cli" >&2; exit 2; }; shift 2 ;;
    --records) RECORDS="${2:-}"; [[ -n "$RECORDS" ]] || { echo "missing --records" >&2; exit 2; }; shift 2 ;;
    --out) OUT="${2:-}"; [[ -n "$OUT" ]] || { echo "missing --out" >&2; exit 2; }; shift 2 ;;
    --help|-h) usage; exit 0 ;;
    *) echo "unknown option: $1" >&2; usage; exit 2 ;;
  esac
done

[[ -f "$PACK" ]] || { echo "missing pack: $PACK" >&2; exit 1; }
[[ -f "$APPLY_TPL" ]] || { echo "missing APPLY: $APPLY_TPL" >&2; exit 1; }

detect_cli() {
  case "${PUNK_BOOTSTRAP_CLI:-$CLI}" in
    grok|codex|kimi|cursor-agent|opencode|grok-bot) echo "${PUNK_BOOTSTRAP_CLI:-$CLI}"; return ;;
    auto) ;;
    *) echo "unknown --cli $CLI" >&2; exit 2 ;;
  esac
  if [[ -n "${GROK_BOT_LOCAL_EXEC:-}" ]]; then
    echo grok-bot; return
  fi
  local name
  name=$(basename -- "${PUNK_PARENT_CLI:-${0}}")
  case "$name" in
    grok|codex|kimi|cursor-agent|opencode) echo "$name"; return ;;
  esac
  for c in grok cursor-agent codex kimi opencode; do
    command -v "$c" >/dev/null && { echo "$c"; return; }
  done
  echo grok
}

cli=$(detect_cli)
records="${RECORDS:-${PUNK_RECORDS:-./punk-records}}"
if [[ "$records" != /* ]]; then
  records="$(pwd)/$records"
fi

echo "CLI=$cli"
echo "PACK=$PACK"
echo "RECORDS=$records"

nudge_args=()
[[ "$DRY" -eq 1 ]] && nudge_args+=(--dry-run)
bash "$NUDGE" "${nudge_args[@]+"${nudge_args[@]}"}"

if [[ "$DRY" -eq 0 ]]; then
  bash "$SEED" "$records"
else
  echo "WOULD_SEED $records"
fi

bot_table=""
while IFS=$'\t' read -r name title file; do
  [[ -n "$name" ]] || continue
  abs="$ROOT/$file"
  [[ -f "$abs" ]] || { echo "missing bot file: $abs" >&2; exit 1; }
  bot_table+="| $name | $title | \`$abs\` |"$'\n'
done < <(python3 - "$PACK" <<'PY'
import json, sys
pack = json.load(open(sys.argv[1], encoding="utf-8"))
assert pack.get("kind") == "grok-bot-pack"
bots = pack.get("bots") or []
assert len(bots) >= 1
for bot in bots:
    print("\t".join([bot["name"], bot["title"], bot["file"]]))
PY
)

group=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["group"]["name"])' "$PACK")

apply="${OUT:-${TMPDIR:-/tmp}/punk-records-apply.md}"
mkdir -p "$(dirname "$apply")"
python3 - "$APPLY_TPL" "$apply" "$cli" "$ROOT" "$records" "$NUDGE" "$SEED" "$group" "$bot_table" <<'PY'
import pathlib, sys
src, dest, cli, root, records, nudge, seed, group, table = sys.argv[1:10]
text = pathlib.Path(src).read_text(encoding="utf-8")
repl = {
    "{{CLI}}": cli,
    "{{PACK_ROOT}}": root,
    "{{NUDGE}}": f"bash {nudge}",
    "{{SEED}}": f"bash {seed} {records}",
    "{{GROUP}}": group,
    "{{BOT_TABLE}}": table.rstrip(),
}
for k, v in repl.items():
    text = text.replace(k, v)
pathlib.Path(dest).write_text(text, encoding="utf-8")
print(dest)
PY

echo "APPLY=$apply"
echo "GROUP=$group"

WRITE="$ROOT/scripts/write-grok-bot-profiles.py"
cdp_up=0
if command -v curl >/dev/null && curl -sf -m 1 http://127.0.0.1:9333/json/version >/dev/null; then
  cdp_up=1
fi

inject_bin=""
for c in \
  "${XBGST_SURFACE_INJECT:-}" \
  "$HOME/.grokbot/workflows/xbgst-surface/xbgst-surface-inject.sh" \
  "$HOME/.agents/skills/xbgst-surface/bin/xbgst-surface-inject.sh" \
  "$HOME/Projects/xbgst/grok-marketplace/plugins/xbgst-stack/integrations/grok-bot/bin/xbgst-surface-inject.sh"
do
  [[ -n "$c" && -x "$c" ]] && { inject_bin="$c"; break; }
done

window_up=0
if command -v hyprctl >/dev/null && hyprctl clients 2>/dev/null | grep -Fq "class: grok-bot"; then
  window_up=1
fi

want_inject="$INJECT"
if [[ -z "$want_inject" ]]; then
  if [[ "$DRY" -eq 0 && -n "$inject_bin" && "$window_up" -eq 1 && "$cdp_up" -eq 0 ]]; then
    want_inject=1
  else
    want_inject=0
  fi
fi

if [[ "$DRY" -eq 1 ]]; then
  echo "WOULD_CDP_WRITE=$cdp_up writer=$WRITE"
  echo "WOULD_INJECT=$want_inject bin=${inject_bin:-none} window=$window_up"
  echo "re-run without --dry-run, or paste $apply"
  exit 0
fi

if [[ "$cdp_up" -eq 1 ]] && command -v python3 >/dev/null && command -v agent-browser >/dev/null && [[ -f "$WRITE" ]]; then
  echo "CDP_WRITE $WRITE"
  python3 "$WRITE"
  echo "wrote pack Descriptions through CDP (no viewport change)"
  exit 0
fi

if [[ "$want_inject" -eq 1 && -n "$inject_bin" ]]; then
  echo "INJECT $inject_bin"
  bash "$inject_bin" "$apply"
  echo "injected APPLY into grok-bot — it mints the named cards"
  exit 0
fi

echo "PRINT_ONLY (no CDP write, no inject). Hand this to grok-bot or your CLI:"
echo "$apply"
echo "hint: python3 $WRITE"
echo "hint: bash ${inject_bin:-xbgst-surface-inject.sh} $apply"
