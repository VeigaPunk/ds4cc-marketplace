---
name: the-almanacker-docs
description: Install and run The Almanacker NotebookLM web UI adapter through agent-browser and an authenticated CDP profile.
---

# The Almanacker

CLI bridge for NotebookLM Studio features via CDP. Keep CDP on loopback and use the dedicated shared browser profile.

## Install adapter

```bash
./install.sh
```

## Create a notebook

```bash
almanack create "chess-orchestration"
```

## Add sources

```bash
almanack add ~/papers/ufo.pdf https://en.wikipedia.org/wiki/M%C4%93tis
```

## Start an Audio Overview

```bash
almanack studio audio deep-dive "A 3-host deep dive on agentic orchestration"
```

Use the plugin README for full command reference.
