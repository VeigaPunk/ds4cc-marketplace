---
name: aaronplug-docs
description: Search and download academic papers via aaronplug CLI.
---

Aaronplug provides CLI access to arXiv, Semantic Scholar, and Sci-Hub.

## Search papers

```bash
npx @veigapunk/aaron papers search "attention mechanism transformers"
```

## Download a paper by arXiv ID

```bash
npx @veigapunk/aaron papers download 2305.10601
```

## Search books via Libgen

```bash
npx @veigapunk/aaron books search "category theory"
```

## Build from source

```bash
cd $(codex plugin info aaronplug --path)
bun install
bun run build
./bin/index.js papers search "neural scaling laws"
```
