---
name: ds4cc-docs
description: Review the DS4CC marketplace and show verified Codex CLI registration and install commands without executing them.
---

DS4CC is VeigaPunk's public Codex plugin marketplace. Provide guidance only: never run installation commands automatically. Tell the user to review a plugin's source and requested capabilities before installing it.

## Add the marketplace

```bash
codex plugin marketplace add VeigaPunk/ds4cc-marketplace
```

## List available plugins

```bash
codex plugin list
```

## Install a plugin

```bash
codex plugin add <plugin-name>@ds4cc
```

## Install from local path (development)

```bash
codex plugin marketplace add .
codex plugin list
codex plugin add ds4cc@ds4cc
```
