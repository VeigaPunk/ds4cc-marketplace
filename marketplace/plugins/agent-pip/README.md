# agent-pip

Always-on-top multi-panel agent terminal dashboard in Rust (`eframe`/`egui`).

One compact tile per live **tmux** session, with a live pane tail, attach-state indicator, and mouse-only control. Supports up to 24 concurrent panels and a legacy horizontal strip mode.

## Build and run

```bash
git clone https://github.com/VeigaPunk/agent-pip.git
cd agent-pip
cargo run
```

## Common flags

| Flag | Effect |
|------|--------|
| *(none)* | Multi-panel dashboard, max 24 tiles |
| `--strip` | Legacy horizontal strip |
| `--no-top` | Disable always-on-top |
| `--toggle` | Reveal/hide a running instance |

See the plugin skill `/skill:agent-pip-docs` for install, attach, and Hyprland toggle notes.
