#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
cd "$ROOT"

active_surfaces=(
  AGENTS.md
  commands
  templates/agents
  templates/skills
  docs/command-flows.md
  docs/xask-protocol.md
)

if rg -n \
  'xask (--gpt55 --gs -e (medium|high|xhigh)|--effort (medium|high|xhigh) --gs codex)' \
  "${active_surfaces[@]}"; then
  printf 'FAIL: active role routing contains a non-low Sol effort lane\n' >&2
  exit 1
fi

rg -q '^model: fable$' templates/agents/the-planner.md
rg -q '^effort: high$' templates/agents/the-planner.md
if rg -n 'the-planner.*model="sonnet"|ccs-planner' commands templates/skills; then
  printf 'FAIL: an active planner spawn overrides the native high-effort profile\n' >&2
  exit 1
fi

printf 'PASS: every active Sol role lane is low; planner remains native high\n'
