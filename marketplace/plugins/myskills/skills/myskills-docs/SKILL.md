---
name: myskills-docs
description: Discover, apply, and create reusable skill workflows from myskills on Grok Build, Claude Code, or Codex.
---

myskills presents discoverable skill definitions for domain-specific tasks.

## List installed skills

```bash
ls ~/.grok/skills/ 2>/dev/null || true
ls ~/.claude/skills/ 2>/dev/null || true
find . -name "SKILL.md" 2>/dev/null
```

## Install skills from this plugin

```bash
mkdir -p ~/.grok/skills ~/.claude/skills
cp -r ./skills/* ~/.grok/skills/ 2>/dev/null || true
cp -r ./skills/* ~/.claude/skills/ 2>/dev/null || true
```

## Apply a skill to current context

**Grok Build** — skills under `~/.grok/skills/` or the enabled plugin are auto-discovered; invoke by name or paste the `SKILL.md` body into chat.

**Codex:**

```bash
codex exec "/skill-name <arguments>"
```

## Create a new skill

```bash
mkdir -p ~/.grok/skills/<skill-name>
# Write ~/.grok/skills/<skill-name>/SKILL.md with YAML frontmatter (name, description)
```
