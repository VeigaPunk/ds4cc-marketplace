#!/usr/bin/env bash
# Install always-on Godspeed standing instructions into harness roots.
# Strong no: never create or patch CLAUDE.md (user ban).
# Hook-free: no UserPromptSubmit, no ~/.claude/scripts triggers.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$REPO_ROOT/templates/rules/GODSPEED_ALWAYS.md"
MARKER_BEGIN="<!-- xbrd-godspeed-always:begin -->"
MARKER_END="<!-- xbrd-godspeed-always:end -->"

if [[ ! -f "$SRC" ]]; then
  echo "missing $SRC" >&2
  exit 1
fi

body=$(cat "$SRC")
block="${MARKER_BEGIN}
${body}
${MARKER_END}"

upsert() {
  local target="$1"
  # Hard ban: never touch CLAUDE.md
  case "$(basename "$target")" in
    CLAUDE.md|claude.md)
      echo "refused: CLAUDE.md is banned — skip $target" >&2
      return 0
      ;;
  esac
  mkdir -p "$(dirname "$target")"
  if [[ ! -f "$target" ]]; then
    printf '%s\n' "$block" >"$target"
    echo "wrote $target"
    return
  fi
  local tmp
  tmp=$(mktemp)
  awk -v b="$MARKER_BEGIN" -v e="$MARKER_END" '
    $0 == b { skip=1; next }
    $0 == e { skip=0; next }
    !skip { print }
  ' "$target" >"$tmp"
  if [[ -s "$tmp" ]] && [[ "$(tail -c1 "$tmp" | wc -l)" -eq 0 ]]; then
    printf '\n' >>"$tmp"
  fi
  printf '%s\n' "$block" >>"$tmp"
  mv "$tmp" "$target"
  echo "updated $target"
}

# Codex / agents / Grok — AGENTS.md only (never CLAUDE.md)
upsert "${HOME}/AGENTS.md"
upsert "${HOME}/.codex/AGENTS.md"
upsert "${HOME}/.agents/AGENTS.md"
upsert "${XDG_CONFIG_HOME:-${HOME}/.config}/opencode/AGENTS.md"

ensure_opencode_exa_env() {
  local rc
  for rc in "${HOME}/.zshenv" "${HOME}/.bashrc"; do
    if [[ ! -f "$rc" ]]; then
      echo "skipped $rc (missing)"
      continue
    fi
    if grep -Fqx 'export OPENCODE_ENABLE_EXA=1' "$rc"; then
      continue
    fi
    if [[ "$(tail -c1 "$rc" | wc -l)" -eq 0 ]]; then
      printf '\n' >>"$rc"
    fi
    printf '%s\n' \
      '# Enable OpenCode Exa-backed websearch (managed by xbrd-gdsp-fknpft)' \
      'export OPENCODE_ENABLE_EXA=1' >>"$rc"
    echo "enabled OPENCODE_ENABLE_EXA in $rc"
  done
}
ensure_opencode_exa_env

if command -v grok >/dev/null 2>&1 || [[ -d "${HOME}/.grok" ]]; then
  upsert "${HOME}/.grok/AGENTS.md"
fi

# Repo-local AGENTS.md (xbreed ships AGENTS.md — merge managed block)
upsert "$REPO_ROOT/AGENTS.md"

# If a CLAUDE.md exists from an old install, remove our managed block only
# and delete the file when it is only our block + whitespace.
for f in \
  "${HOME}/.claude/CLAUDE.md" \
  "$REPO_ROOT/CLAUDE.md"
do
  if [[ -f "$f" ]]; then
    # A legacy file is eligible only when its marker stream is complete and
    # non-nested. Any unmatched/malformed marker makes the entire file opaque:
    # preserve every byte, including user content after a stray begin marker.
    if ! grep -Fq "$MARKER_BEGIN" "$f" && ! grep -Fq "$MARKER_END" "$f"; then
      continue
    fi
    tmp=$(mktemp)
    if ! awk -v b="$MARKER_BEGIN" -v e="$MARKER_END" '
      $0 == b { if (skip) bad=1; skip=1; seen=1; next }
      $0 == e { if (!skip) bad=1; skip=0; seen=1; next }
      !skip { print }
      END { if (skip || bad || !seen) exit 42 }
    ' "$f" >"$tmp"; then
      rm -f "$tmp"
      echo "preserved malformed $f" >&2
      continue
    fi
    if [[ ! -s "$tmp" ]] || ! grep -q '[^[:space:]]' "$tmp"; then
      rm -f "$f" "$tmp"
      echo "nuked empty/stale $f"
    else
      cat "$tmp" >"$f"
      rm -f "$tmp"
      echo "removed managed block from $f; preserved unrelated content"
    fi
  fi
done

echo "GODSPEED-ALWAYS-OK (no CLAUDE.md)"
