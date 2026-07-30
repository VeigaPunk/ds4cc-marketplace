#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CANONICAL="$ROOT/../myagents/agents/the-executor.agent.md"
TEMPLATE="$ROOT/templates/agents/executor.md"

fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }

for file in "$CANONICAL" "$TEMPLATE"; do
  [[ -f "$file" ]] || fail "missing executor declaration: $file"
  grep -Fxq 'model: openai/gpt-5.4-mini' "$file" || fail "executor model is not pinned in $file"
  grep -Fq 'Codex Spark only.' "$file" || fail "Spark-only declaration missing in $file"
  grep -Fq 'Never switch the executor or its implementation delegation to another model or effort lane.' "$file" \
    || fail "executor escape-hatch prohibition missing in $file"
done

active=(
  "$ROOT/AGENTS.md"
  "$ROOT/commands/references/xbreed-shared.md"
  "$ROOT/commands/xgs.md"
  "$ROOT/commands/xbgst.md"
  "$ROOT/docs/xask-protocol.md"
  "$ROOT/templates/agents/the-judge.md"
  "$ROOT/templates/skills/xgs/SKILL.md"
  "$ROOT/templates/skills/xbgst/SKILL.md"
)
for file in "${active[@]}"; do
  while IFS= read -r line; do
    [[ "$line" == *executor* ]] || continue
    [[ "$line" == *non-executor* ]] && continue
    [[ "$line" == *sonnet* || "$line" == *'advisor() for reasoning'* || "$line" == *'effort high'* || "$line" == *'effort xhigh'* ]] \
      && fail "executor escape hatch in ${file#$ROOT/}: $line"
  done <"$file"
done

grep -Fq '| **executor** | `openai/gpt-5.4-mini` (Codex Spark only)' "$ROOT/AGENTS.md" \
  || fail 'active roster does not identify executor as Codex Spark only'
grep -Fq '| Code execution | `executor` | `openai/gpt-5.4-mini` (Codex Spark only)' "$ROOT/commands/references/xbreed-shared.md" \
  || fail 'SSoT routing row does not identify executor as Codex Spark only'

printf 'PASS: executor is pinned to openai/gpt-5.4-mini / Codex Spark across canonical and active surfaces\n'
