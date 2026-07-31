---
name: myagents-docs
description: Discover and launch user-defined agent profiles from the myagents catalog on Grok Build or Codex.
---

myagents provides a catalog of agent templates for delegation and workflow routing.

## List available agent profiles

```bash
# Grok Build (preferred in this CLI)
ls ~/.grok/agents/ 2>/dev/null
ls "$(dirname "$0")/../agents" 2>/dev/null
find . -path '*/agents/*.md' 2>/dev/null | head
```

## Install agent profiles from this plugin

```bash
# Grok user agents
mkdir -p ~/.grok/agents
cp -r ./agents/* ~/.grok/agents/ 2>/dev/null || true
```

## Launch a specific agent

**Grok Build** — spawn via the native subagent system after profiles are installed (plugin agents load automatically when the plugin is enabled):

```bash
grok plugin details myagents
# In chat: ask for the-judge / executor / reviewer profiles by name
```

**Codex:**

```bash
codex "Use the executor profile to implement the failing test"
codex "Use the reviewer profile to review this diff for bugs"
```

## Create a new agent profile

```bash
# Grok
mkdir -p ~/.grok/agents
# Write ~/.grok/agents/<name>.md with role instructions
```

## Inspect active agent catalog

```bash
find ~/.grok/agents -name "*.md" 2>/dev/null | head -50
```
