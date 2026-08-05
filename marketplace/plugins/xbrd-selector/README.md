# Xbrd Selector

Rust-only selection and dispatch helper for choosing models and routing work.

## What it is

- **Binary:** `xbrd-selector`
- **UI:** Ratatui TUI
- **Packaging:** Arch PKGBUILD + Cargo build
- **Cloud models:** curated catalog for OpenAI (ChatGPT) and xAI (Grok) only
- **Local models:** strict loopback OpenAI-compatible endpoints (separate tier)
- **OpenCode auth:** OAuth login limited to `openai` and `xai` (Claude/Anthropic and github-copilot are not Usable)
- **Auth metadata:** read-only; do not treat it as a token store

## Install

```bash
cargo build --release
```

Arch Linux:

```bash
makepkg -si
```

## Use

```bash
xbrd-selector tui
```

## Notes

- Rust-native build and runtime.
- Keep local model endpoints on loopback only.
- Do not edit auth metadata by hand; inspect it read-only.
- Use the TUI for model selection and dispatch routing.
