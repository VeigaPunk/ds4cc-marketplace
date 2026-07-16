---
name: mycommands-docs
description: List and execute reusable command packs from mycommands.
---

mycommands catalogs recurring shell and repository automation routines.

## List available command packs

```bash
ls ~/.claude/commands/ 2>/dev/null || echo "No commands installed yet."
find . -name "*.md" -path "*/commands/*" 2>/dev/null
```

## Install command packs

```bash
mkdir -p ~/.claude/commands
cp -r ./commands/* ~/.claude/commands/ 2>/dev/null || echo "No commands/ dir in this plugin."
```

## Run a command pack

```bash
# Execute a named command from your installed commands
codex exec "/my-command-name"
```

## Add a new reusable command

```bash
codex exec "Create a reusable command for <task> and save it to ~/.claude/commands/"
```

## Validate installed commands

```bash
find ~/.claude/commands -name "*.md" | wc -l
```
