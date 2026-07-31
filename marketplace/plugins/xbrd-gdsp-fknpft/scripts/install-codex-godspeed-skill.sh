#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_DIR="$REPO_ROOT/skills/godspeed"
TARGET_DIR="${CODEX_SKILLS_DIR:-$HOME/.agents/skills}/godspeed"
TARGET_PARENT="$(dirname "$TARGET_DIR")"
FORCE=0

case "${1:-}" in
  "") ;;
  --force) FORCE=1 ;;
  *) printf 'usage: %s [--force]\n' "$0" >&2; exit 2 ;;
esac

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

target_exists() {
  [[ -e "$TARGET_DIR" || -L "$TARGET_DIR" ]]
}

cleanup() {
  if [[ -n "${STAGE_DIR:-}" ]]; then
    rm -rf "$STAGE_DIR"
  fi
  if [[ -n "${BACKUP_DIR:-}" && ( -e "$BACKUP_DIR/current" || -L "$BACKUP_DIR/current" ) ]]; then
    if [[ "${INSTALL_COMMITTED:-0}" -eq 0 ]]; then
      rm -rf "$TARGET_DIR"
      mv "$BACKUP_DIR/current" "$TARGET_DIR"
    fi
    rm -rf "$BACKUP_DIR"
  fi
  return 0
}

STAGE_DIR=""
BACKUP_DIR=""
INSTALL_COMMITTED=0
trap cleanup EXIT INT TERM HUP

mkdir -p "$TARGET_PARENT"

if [[ -d "$TARGET_DIR" ]] && target_matches_source; then
  printf '%s\n' "$TARGET_DIR"
  exit 0
fi

if target_exists && [[ "$FORCE" -ne 1 ]]; then
  printf 'refusing to replace existing non-canonical skill: %s (use --force)\n' "$TARGET_DIR" >&2
  exit 3
fi

STAGE_DIR="$(mktemp -d "$TARGET_PARENT/.godspeed.stage.XXXXXX")"
cp -p "$SKILL_SRC" "$STAGE_DIR/SKILL.md"
cp -p "$DIRECTIVE_SRC" "$STAGE_DIR/directive.md"

if target_exists && [[ ! -d "$TARGET_DIR" ]]; then
  BACKUP_DIR="$(mktemp -d "$TARGET_PARENT/.godspeed.backup.XXXXXX")"
  mv "$TARGET_DIR" "$BACKUP_DIR/current"
fi

if ! target_exists; then
  mv "$STAGE_DIR" "$TARGET_DIR"
  STAGE_DIR=""
  if [[ -n "$BACKUP_DIR" ]]; then
    INSTALL_COMMITTED=1
    rm -rf "$BACKUP_DIR"
    BACKUP_DIR=""
  fi
else
  [[ -n "$BACKUP_DIR" ]] || BACKUP_DIR="$(mktemp -d "$TARGET_PARENT/.godspeed.backup.XXXXXX")"
  mv "$TARGET_DIR" "$BACKUP_DIR/current"
  mv "$STAGE_DIR" "$TARGET_DIR"
  STAGE_DIR=""
  INSTALL_COMMITTED=1
  rm -rf "$BACKUP_DIR"
  BACKUP_DIR=""
fi

printf '%s\n' "$TARGET_DIR"
