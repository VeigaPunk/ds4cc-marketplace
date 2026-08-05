---
name: xbrd-selector-docs
description: Install and run xbrd-selector through verified build commands, a Rust-only binary, and the Ratatui TUI.
---

# xbrd-selector

Rust-only model selector and dispatch helper.

## Build

```bash
cargo build --release
```

Arch Linux package build:

```bash
makepkg -si
```

## Run

```bash
xbrd-selector tui
```

## Rules

- Keep local model endpoints on loopback only (local tier separate from cloud).
- OpenCode OAuth login is limited to `openai` (ChatGPT) and `xai` (Grok).
- Claude/Anthropic and github-copilot are never Usable on the cloud surface.
- Treat auth metadata as read-only.
- Use the Rust-native build and runtime.
- Use the Ratatui TUI for dual-tier selection (cloud catalog + local loopback).

## Verify

```bash
cargo test
```
