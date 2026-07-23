#!/usr/bin/env bash
set -euo pipefail

PLUGIN_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP_ROOT=$(mktemp -d)
trap 'rm -rf "$TMP_ROOT"' EXIT

FIXTURE="$TMP_ROOT/plugin"
HOME_DIR="$TMP_ROOT/home"
XDG_DIR="$TMP_ROOT/xdg"
mkdir -p "$FIXTURE/scripts" "$FIXTURE/templates/rules" "$HOME_DIR/.codex" "$HOME_DIR/.config/opencode" "$XDG_DIR/opencode"
cp "$PLUGIN_ROOT/scripts/install-godspeed-always.sh" "$FIXTURE/scripts/"
cp "$PLUGIN_ROOT/templates/rules/GODSPEED_ALWAYS.md" "$FIXTURE/templates/rules/"
printf '%s\n' 'home content' >"$HOME_DIR/AGENTS.md"
printf '%s\n' 'codex content' >"$HOME_DIR/.codex/AGENTS.md"
printf '%s\n' 'default opencode content' >"$HOME_DIR/.config/opencode/AGENTS.md"
printf '%s\n' 'opencode content' >"$XDG_DIR/opencode/AGENTS.md"
printf '%s\n' 'shell content' >"$HOME_DIR/.bashrc"

run_default_installer() {
  env -u XDG_CONFIG_HOME HOME="$HOME_DIR" PATH="/usr/bin:/bin" \
    bash "$FIXTURE/scripts/install-godspeed-always.sh"
}

run_xdg_installer() {
  HOME="$HOME_DIR" XDG_CONFIG_HOME="$XDG_DIR" PATH="/usr/bin:/bin" \
    bash "$FIXTURE/scripts/install-godspeed-always.sh"
}

run_default_installer >/dev/null
run_xdg_installer >/dev/null

targets=(
  "$HOME_DIR/AGENTS.md"
  "$HOME_DIR/.codex/AGENTS.md"
  "$HOME_DIR/.agents/AGENTS.md"
  "$HOME_DIR/.config/opencode/AGENTS.md"
  "$XDG_DIR/opencode/AGENTS.md"
  "$FIXTURE/AGENTS.md"
)
for target in "${targets[@]}"; do
  [[ -f "$target" ]] || { printf 'missing target: %s\n' "$target" >&2; exit 1; }
  grep -Fq 'Godspeed is inherited.' "$target"
  grep -Fq 'Delegation is transitive.' "$target"
  [[ $(grep -Fc '<!-- xbrd-godspeed-always:begin -->' "$target") -eq 1 ]]
done
grep -Fq 'home content' "$HOME_DIR/AGENTS.md"
grep -Fq 'codex content' "$HOME_DIR/.codex/AGENTS.md"
grep -Fq 'default opencode content' "$HOME_DIR/.config/opencode/AGENTS.md"
grep -Fq 'opencode content' "$XDG_DIR/opencode/AGENTS.md"
[[ $(<"$HOME_DIR/.bashrc") == 'shell content' ]] || { printf 'installer rewrote shell prompt config\n' >&2; exit 1; }

before=$(sha256sum "${targets[@]}")
run_default_installer >/dev/null
run_xdg_installer >/dev/null
after=$(sha256sum "${targets[@]}")
[[ "$before" == "$after" ]] || { printf 'installer is not idempotent\n' >&2; exit 1; }

if [[ -e "$HOME_DIR/CLAUDE.md" || -e "$HOME_DIR/.claude/CLAUDE.md" || -e "$FIXTURE/CLAUDE.md" ]]; then
  printf 'installer created CLAUDE.md\n' >&2
  exit 1
fi

printf 'Validated isolated Godspeed install: %d targets, idempotent, content preserved, no CLAUDE.md\n' "${#targets[@]}"
