---
name: myskills-docs
description: Discover, apply, and create reusable Codex skill workflows from myskills.
---

myskills presents discoverable skill definitions for domain-specific tasks.

## List installed skills

```bash
ls ~/.claude/skills/ 2>/dev/null || echo "No custom skills installed yet."
find . -name "SKILL.md" 2>/dev/null
```

## Install skills from this plugin

```bash
mkdir -p ~/.claude/skills
cp -r ./skills/* ~/.claude/skills/ 2>/dev/null
```

## Apply a skill to current context

```bash
codex exec "/skill-name <arguments>"
```

## Create a new skill

```bash
codex exec "Create a reusable skill for <task-type> and save it as a SKILL.md"
```

## Audit skill actionability

```bash
for f in ~/.claude/skills/*/SKILL.md; do
  if grep -q '```' "$f"; then echo "ACTIONABLE: $f"; else echo "DOCS-ONLY: $f"; fi
done
```
