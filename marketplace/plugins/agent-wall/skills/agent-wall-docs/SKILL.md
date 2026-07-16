---
name: agent-wall-docs
description: Create handoff checkpoints and manage agent session continuity via agent-wall.
---

agent-wall provides runtime handoff surface for long-running agent sessions.

## Create a continuity checkpoint

```bash
codex exec "Create an agent-wall checkpoint: summarize current context, blockers, and next steps. Save to .omc/handoffs/$(date +%Y%m%d-%H%M%S).md"
```

## Resume from a checkpoint

```bash
ls .omc/handoffs/ 2>/dev/null | sort -r | head -5
codex exec "Resume from checkpoint: $(ls .omc/handoffs/ 2>/dev/null | sort -r | head -1)"
```

## Show active handoff context

```bash
cat .omc/handoffs/$(ls .omc/handoffs/ 2>/dev/null | sort -r | head -1) 2>/dev/null || echo "No active handoff found."
```

## Create a runbook replay artifact

```bash
codex exec "Generate a runbook from this session's agent-wall checkpoints for replay"
```

## List all wall checkpoints

```bash
find .omc/handoffs -name "*.md" 2>/dev/null | sort
```
