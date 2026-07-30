#!/usr/bin/env bash
# Static contract test for skills/agent-model-selector/SKILL.md.
# Reads only repository files and writes only to a temp directory.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SKILL="$REPO_ROOT/skills/agent-model-selector/SKILL.md"
TMP_HOME="$(mktemp -d /tmp/agent-model-selector-home.XXXXXX)"
trap 'rm -rf "$TMP_HOME"' EXIT INT TERM HUP

fail() { echo "FAIL: $1" >&2; exit 1; }

before_home_contents="$(find "$TMP_HOME" -mindepth 1 -maxdepth 1 | wc -l | tr -d ' ')"
[[ "$before_home_contents" == "0" ]] || fail "temp HOME is not empty before test"

HOME="$TMP_HOME" bash -c '
  set -euo pipefail
  skill="$1"
  grep -Fq "opencode agent list" "$skill"
  grep -Fq "opencode models --verbose" "$skill"
  grep -Fq "Do not hard-code agent names." "$skill"
  grep -Fq "Do not infer variants from another model." "$skill"
  grep -Fq "Use the" "$skill" && grep -Fq "tool for these choices" "$skill"
  grep -Fq "Never silently select the first item." "$skill"
  grep -Fq "Provider default (no variant)" "$skill"
  grep -Fq "update only top-level YAML" "$skill"
  grep -Fq "body byte-for-byte" "$skill"
  grep -Fq "agent.<name>.model" "$skill"
  grep -Fq "remove a stale" "$skill"
  grep -Fq "do not write provider-specific" "$skill"
  grep -Fq "separate second" "$skill"
  grep -Fq "exact diff" "$skill"
  grep -Fq "Abort if it changed." "$skill"
  grep -Fq "restart OpenCode" "$skill"
' bash "$SKILL"

after_home_contents="$(find "$TMP_HOME" -mindepth 1 -maxdepth 1 | wc -l | tr -d ' ')"
[[ "$after_home_contents" == "0" ]] || fail "test mutated HOME contents"

echo "PASS: agent-model-selector skill contract text is present and HOME stayed untouched"
