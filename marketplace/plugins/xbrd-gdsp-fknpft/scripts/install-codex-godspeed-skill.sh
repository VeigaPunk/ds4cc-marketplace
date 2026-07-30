#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_DIR="$REPO_ROOT/skills/godspeed"
TARGET_DIR="${CODEX_SKILLS_DIR:-$HOME/.agents/skills}/godspeed"
TARGET_PARENT="$(dirname "$TARGET_DIR")"

SKILL_SRC="$SOURCE_DIR/SKILL.md"
DIRECTIVE_SRC="$SOURCE_DIR/directive.md"

for src in "$SKILL_SRC" "$DIRECTIVE_SRC"; do
  [[ -f "$src" ]] || {
    printf 'missing source: %s\n' "$src" >&2
    exit 1
  }
done

target_matches_source() {
  [[ -f "$TARGET_DIR/SKILL.md" ]] || return 1
  [[ -f "$TARGET_DIR/directive.md" ]] || return 1
  cmp -s "$SKILL_SRC" "$TARGET_DIR/SKILL.md" && cmp -s "$DIRECTIVE_SRC" "$TARGET_DIR/directive.md"
}

cleanup() {
  if [[ -n "${STAGE_DIR:-}" ]]; then
    rm -rf "$STAGE_DIR"
  fi
  if [[ -n "${BACKUP_DIR:-}" ]]; then
    rm -rf "$BACKUP_DIR"
  fi
  return 0
}

STAGE_DIR=""
BACKUP_DIR=""
trap cleanup EXIT INT TERM HUP

mkdir -p "$TARGET_PARENT"

if [[ -d "$TARGET_DIR" ]] && target_matches_source; then
  printf '%s\n' "$TARGET_DIR"
  exit 0
fi

STAGE_DIR="$(mktemp -d "$TARGET_PARENT/.godspeed.stage.XXXXXX")"
cp -p "$SKILL_SRC" "$STAGE_DIR/SKILL.md"
cp -p "$DIRECTIVE_SRC" "$STAGE_DIR/directive.md"

if [[ -e "$TARGET_DIR" && ! -d "$TARGET_DIR" ]]; then
  rm -f "$TARGET_DIR"
fi

if [[ ! -e "$TARGET_DIR" ]]; then
  mv "$STAGE_DIR" "$TARGET_DIR"
  STAGE_DIR=""
else
  BACKUP_DIR="$(mktemp -d "$TARGET_PARENT/.godspeed.backup.XXXXXX")"
  mv "$TARGET_DIR" "$BACKUP_DIR/current"
  mv "$STAGE_DIR" "$TARGET_DIR"
  STAGE_DIR=""
  rm -rf "$BACKUP_DIR"
  BACKUP_DIR=""
fi

printf '%s\n' "$TARGET_DIR"
