---
name: myagents-docs
description: Discover and launch user-defined agent profiles from the myagents catalog on Grok Build, Claude Code, or Codex.
---

myagents provides a catalog of agent templates for delegation and workflow routing.

## List available agent profiles

```bash
# Grok Build (preferred in this CLI)
ls ~/.grok/agents/ 2>/dev/null
ls "$(dirname "$0")/../agents" 2>/dev/null
find . -path '*/agents/*.md' 2>/dev/null | head

# Claude Code compatibility
ls ~/.claude/agents/ 2>/dev/null || true
```

## Install agent profiles from this plugin

```bash
# Grok user agents
mkdir -p ~/.grok/agents
cp -r ./agents/* ~/.grok/agents/ 2>/dev/null || true

# Claude Code compatibility
mkdir -p ~/.claude/agents
cp -r ./agents/* ~/.claude/agents/ 2>/dev/null || true
```

## Launch a specific agent

**Grok Build** — spawn via the native subagent system after profiles are installed (plugin agents load automatically when the plugin is enabled):

```bash
grok plugin details myagents
# In chat: ask for the-judge / executor / reviewer profiles by name
```

**Codex:**

```bash
codex exec --agent executor "Implement the failing test"
codex exec --agent reviewer "Review this diff for bugs"
```

## Create a new agent profile

```bash
# Grok
mkdir -p ~/.grok/agents
# Write ~/.grok/agents/<name>.md with role instructions

# Claude
mkdir -p ~/.claude/agents
```

## Inspect active agent catalog

```bash
find ~/.grok/agents ~/.claude/agents -name "*.md" 2>/dev/null | head -50
```
