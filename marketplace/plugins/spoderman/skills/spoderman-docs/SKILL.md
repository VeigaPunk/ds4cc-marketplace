---
name: spoderman-docs
description: Run Spoderman attack harness and hook validation workflows.
---

Spoderman is a prompt-injection safety and hook behavior analysis harness.

## Run the attack harness

```bash
cd <plugin-root>/spoderman   # plugin root = the installed spoderman plugin directory
bash ./arm.sh                # arms the sandbox vault; use ./disarm.sh to revert
```

## Validate hook injection safety

```bash
# From within the plugin root
ls evidence/
cat findings/*.md
```

## Run autoagent weaver

```bash
bash ./autoagent-weaver
```

## Quick audit of all evidence files

```bash
find . -name "*.md" -path "*/evidence/*" | xargs grep -l "FAIL\|ERROR\|VULN" 2>/dev/null
```
