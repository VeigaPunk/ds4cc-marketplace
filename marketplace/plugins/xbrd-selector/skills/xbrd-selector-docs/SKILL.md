---
name: xbrd-selector-docs
description: Install and run xbrd-selector through verified build commands, a Rust-only binary, and the Ratatui TUI.
---

# xbrd-selector

Rust-only model selector and dispatch helper.

## Check and install

This marketplace package is documentation-only. It does not include the Rust
source or install the executable. Check availability first:

```bash
command -v xbrd-selector
```

If no path is printed, report that `xbrd-selector` is not installed on `PATH`.
Install from an upstream source checkout, not from this plugin directory:

```bash
git clone https://github.com/VeigaPunk/xbrd-selector.git
cd xbrd-selector
cargo install --path ufo-cli --locked
```

Arch Linux package build, from the upstream repository root:

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

From the upstream repository root:

```bash
cargo test --manifest-path ufo-cli/Cargo.toml --locked
```

A source build or test does not mean the binary is installed on `PATH`.
