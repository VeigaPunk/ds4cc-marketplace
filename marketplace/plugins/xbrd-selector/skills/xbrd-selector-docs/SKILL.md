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

- Keep local model endpoints on loopback only.
- OpenCode OAuth login is limited to `openai` and `github-copilot`.
- Treat auth metadata as read-only.
- No Bun dependency.
- Use the Ratatui TUI for selection and dispatch.

## Verify

```bash
cargo test
```
