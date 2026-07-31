---
name: agent-wall-docs
description: Create handoff checkpoints and manage agent session continuity via agent-wall on Grok Build or Codex.
---

agent-wall provides a runtime handoff surface for long-running agent sessions.

## Create a continuity checkpoint

```bash
mkdir -p .omc/handoffs
# In Grok chat (preferred when using Grok Build):
# "Create an agent-wall checkpoint: summarize current context, blockers, and next steps. Save to .omc/handoffs/$(date +%Y%m%d-%H%M%S).md"

# Codex equivalent:
codex exec "Create an agent-wall checkpoint: summarize current context, blockers, and next steps. Save to .omc/handoffs/$(date +%Y%m%d-%H%M%S).md"
```

## Resume from a checkpoint

```bash
ls .omc/handoffs/ 2>/dev/null | sort -r | head -5
# Paste the latest handoff into Grok chat, or:
codex exec "Resume from checkpoint: $(ls .omc/handoffs/ 2>/dev/null | sort -r | head -1)"
```

## Show active handoff context

```bash
cat .omc/handoffs/$(ls .omc/handoffs/ 2>/dev/null | sort -r | head -1) 2>/dev/null || echo "No active handoff found."
```

## Create a runbook replay artifact

In Grok chat: generate a runbook from this session's agent-wall checkpoints for replay.

```bash
codex exec "Generate a runbook from this session's agent-wall checkpoints for replay"
```
