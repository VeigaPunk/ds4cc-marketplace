---
name: mycommands-docs
description: List and execute reusable command packs from mycommands on Grok Build, Claude Code, or Codex.
---

mycommands catalogs recurring shell and repository automation routines.

## List available command packs

```bash
ls ~/.grok/commands/ 2>/dev/null || true
ls ~/.claude/commands/ 2>/dev/null || true
find . -name "*.md" -path "*/commands/*" 2>/dev/null
```

## Install command packs

```bash
mkdir -p ~/.grok/commands ~/.claude/commands
cp -r ./commands/* ~/.grok/commands/ 2>/dev/null || echo "No commands/ dir in this plugin."
cp -r ./commands/* ~/.claude/commands/ 2>/dev/null || true
```

## Run a command pack

**Grok Build** — invoke as a slash command after install (`/<name>`), or paste the command markdown into chat.

**Codex:**

```bash
codex exec "/my-command-name"
```

## Add a new reusable command

```bash
mkdir -p ~/.grok/commands
# Write ~/.grok/commands/<name>.md
```
