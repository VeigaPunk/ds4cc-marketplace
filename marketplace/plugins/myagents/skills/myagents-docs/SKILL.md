---
name: myagents-docs
description: Discover and launch user-defined agent profiles from the myagents catalog.
---

myagents provides a catalog of agent templates for delegation and workflow routing.

## List available agent profiles

```bash
ls ~/.claude/agents/ 2>/dev/null || echo "No agents installed yet."
codex exec "List all available agent types in this project"
```

## Install an agent profile from this plugin

```bash
# Copy agent templates to your Claude agents directory
cp -r ./agents/* ~/.claude/agents/ 2>/dev/null || echo "No agents/ dir in this plugin yet."
```

## Launch a specific agent

```bash
codex exec --agent executor "Implement the failing test"
codex exec --agent reviewer "Review this diff for bugs"
```

## Create a new agent profile

```bash
codex exec "Create an agent profile for <task-description> and save it to ~/.claude/agents/"
```

## Inspect active agent catalog

```bash
find ~/.claude/agents -name "*.md" | xargs grep -l "^# " 2>/dev/null
```
