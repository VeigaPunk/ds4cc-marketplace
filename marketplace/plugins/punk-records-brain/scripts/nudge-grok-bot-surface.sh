#!/usr/bin/env bash
# Nudge / install the grok-bot xbgst-surface. Does not rewrite Electron.
# Exit 0 if the surface is present (or was just installed).
# Exit 2 if missing and --require (or install failed / dry-run miss).
set -euo pipefail

DRY=0
REQUIRE=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY=1; shift ;;
    --require) REQUIRE=1; shift ;;
    --help|-h)
      echo "usage: nudge-grok-bot-surface.sh [--dry-run] [--require]" >&2
      exit 0
      ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
done

DEST="${XBGST_SURFACE_DEST:-$HOME/.agents/skills/xbgst-surface}"
WF="${XBGST_SURFACE_WORKFLOW:-$HOME/.grokbot/workflows/xbgst-surface}"

find_install() {
  local c
  for c in \
    "${XBGST_SURFACE_INSTALL:-}" \
    "$DEST/install-grok-bot-surface.sh" \
    "$HOME/Projects/xbgst/grok-marketplace/plugins/xbgst-stack/integrations/grok-bot/install-grok-bot-surface.sh" \
    "$HOME/Projects/xbgst/ds4cc-marketplace/../grok-marketplace/plugins/xbgst-stack/integrations/grok-bot/install-grok-bot-surface.sh"
  do
    [[ -n "$c" && -x "$c" ]] && { echo "$c"; return 0; }
  done
  local plug
  plug=$(find "$HOME/.grok/installed-plugins" -maxdepth 2 -type f -name install-grok-bot-surface.sh 2>/dev/null | head -n 1 || true)
  [[ -n "$plug" && -x "$plug" ]] && { echo "$plug"; return 0; }
  return 1
}

surface_present() {
  [[ -e "$DEST/SKILL.md" || -e "$WF/SKILL.md" || -e "$WF/xbgst-surface-inject.sh" ]]
}

print_nudge() {
  cat <<'EOF'
NUDGE: install the grok-bot surface (xbgst-surface) first.
  bash "$HOME/.agents/skills/xbgst-surface/install-grok-bot-surface.sh"
  # or from grok-marketplace:
  bash plugins/xbgst-stack/integrations/grok-bot/install-grok-bot-surface.sh
  bash plugins/xbgst-stack/integrations/grok-bot/bin/xbgst-surface-doctor.sh
This pack sits on that surface. It does not replace it.
EOF
}

if surface_present; then
  echo "SURFACE_OK dest=$DEST workflow=$WF"
  if [[ "$DRY" -eq 0 ]]; then
    if [[ -x "$DEST/bin/xbgst-surface-doctor.sh" ]]; then
      "$DEST/bin/xbgst-surface-doctor.sh" || true
    elif [[ -x "$HOME/Projects/xbgst/grok-marketplace/plugins/xbgst-stack/integrations/grok-bot/bin/xbgst-surface-doctor.sh" ]]; then
      "$HOME/Projects/xbgst/grok-marketplace/plugins/xbgst-stack/integrations/grok-bot/bin/xbgst-surface-doctor.sh" || true
    fi
  fi
  exit 0
fi

echo "SURFACE_MISSING dest=$DEST workflow=$WF"
print_nudge

install=$(find_install || true)
if [[ "$DRY" -eq 1 ]]; then
  if [[ -n "$install" ]]; then
    echo "WOULD_INSTALL $install"
  else
    echo "WOULD_NUDGE (no install script on this host)"
  fi
  [[ "$REQUIRE" -eq 1 ]] && exit 2
  exit 0
fi

if [[ -n "$install" ]]; then
  echo "INSTALL $install"
  bash "$install"
  if surface_present; then
    echo "SURFACE_OK after-install"
    exit 0
  fi
fi

[[ "$REQUIRE" -eq 1 ]] && exit 2
exit 0
