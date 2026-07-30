#!/usr/bin/env bash
set -euo pipefail

PLUGIN_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_ROOT="$(mktemp -d)"
trap 'rm -rf "$TMP_ROOT"' EXIT

FIXTURE="$TMP_ROOT/plugin"
HOME_DIR="$TMP_ROOT/home"
CODEX_SKILLS="$TMP_ROOT/agents/skills"
TARGET_DIR="$CODEX_SKILLS/godspeed"
SIBLING_DIR="$CODEX_SKILLS/keeper"

mkdir -p \
  "$FIXTURE/scripts" \
  "$FIXTURE/skills/godspeed" \
  "$HOME_DIR" \
  "$CODEX_SKILLS" \
  "$SIBLING_DIR"

cp "$PLUGIN_ROOT/scripts/install-codex-godspeed-skill.sh" "$FIXTURE/scripts/"
cp "$PLUGIN_ROOT/skills/godspeed/SKILL.md" "$FIXTURE/skills/godspeed/"
cp "$PLUGIN_ROOT/skills/godspeed/directive.md" "$FIXTURE/skills/godspeed/"

printf '%s\n' 'persistent sibling' >"$SIBLING_DIR/keep.txt"
mkdir -p "$TARGET_DIR"
printf '%s\n' 'stale skill' >"$TARGET_DIR/SKILL.md"
printf '%s\n' 'stale directive' >"$TARGET_DIR/directive.md"

run_installer() {
  HOME="$HOME_DIR" CODEX_SKILLS_DIR="$CODEX_SKILLS" PATH="/usr/bin:/bin" \
    bash "$FIXTURE/scripts/install-codex-godspeed-skill.sh"
}

first_out="$(run_installer)"
expected_target="$CODEX_SKILLS/godspeed"
[[ "$first_out" == "$expected_target" ]] || {
  printf 'unexpected installer output: %s\n' "$first_out" >&2
  exit 1
}

cmp -s "$PLUGIN_ROOT/skills/godspeed/SKILL.md" "$TARGET_DIR/SKILL.md"
cmp -s "$PLUGIN_ROOT/skills/godspeed/directive.md" "$TARGET_DIR/directive.md"
grep -Fq 'Godspeed is inherited.' "$TARGET_DIR/SKILL.md"
grep -Fq 'Delegation is transitive.' "$TARGET_DIR/SKILL.md"
grep -Fq 'You are a Godspeed-enabled subagent.' "$TARGET_DIR/directive.md"
grep -Fq 'Every delegated prompt MUST carry this directive' "$TARGET_DIR/SKILL.md"
cmp -s "$SIBLING_DIR/keep.txt" <(printf '%s\n' 'persistent sibling')

before_skill_sum="$(sha256sum "$TARGET_DIR/SKILL.md")"
before_directive_sum="$(sha256sum "$TARGET_DIR/directive.md")"
before_sibling_sum="$(sha256sum "$SIBLING_DIR/keep.txt")"

second_out="$(run_installer)"
[[ "$second_out" == "$expected_target" ]] || {
  printf 'unexpected second installer output: %s\n' "$second_out" >&2
  exit 1
}

after_skill_sum="$(sha256sum "$TARGET_DIR/SKILL.md")"
after_directive_sum="$(sha256sum "$TARGET_DIR/directive.md")"
after_sibling_sum="$(sha256sum "$SIBLING_DIR/keep.txt")"

[[ "$before_skill_sum" == "$after_skill_sum" ]]
[[ "$before_directive_sum" == "$after_directive_sum" ]]
[[ "$before_sibling_sum" == "$after_sibling_sum" ]]

printf 'PASS: codex godspeed skill install is isolated, canonical, idempotent, and sibling-safe\n'
