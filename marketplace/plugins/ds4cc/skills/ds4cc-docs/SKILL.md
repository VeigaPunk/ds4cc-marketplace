---
name: ds4cc-docs
description: Browse and manage DS4CC marketplace plugins via Codex CLI.
---

DS4CC is the VeigaPunk personal Codex plugin marketplace.

## Add the marketplace

```bash
codex plugin marketplace add https://ds4cc.com/marketplace/marketplace.json
```

## List available plugins

```bash
codex plugin list
```

## Install a plugin

```bash
codex plugin add <plugin-name>
```

## Install from local path (development)

```bash
codex plugin marketplace add file://$(pwd)/marketplace/marketplace.json
codex plugin list
codex plugin add ds4cc
```
