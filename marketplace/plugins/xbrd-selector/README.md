# Xbrd Selector

Rust-only selection and dispatch helper for choosing models and routing work.

## What it is

- **Binary:** `xbrd-selector`
- **UI:** Ratatui TUI
- **Packaging:** Arch PKGBUILD + Cargo build
- **Models:** strict loopback local-model access only
- **OpenCode auth:** OAuth login limited to `openai` and `github-copilot`
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
