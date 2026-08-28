# How I config Grok Bot (example — adapt this)

This pack is **one operator's Grok Bot layout**. It is not the only layout.

Use it two ways:

1. **Do this** — run the bootstrap and get this Vegapunk round table.
2. **Adapt this** — copy `pack.json` + `agents/`, change names and drives, keep the same surface nudge and mint rules.

```text
preferred Few Good CLI
        │
        ▼
bootstrap-grok-bot.sh
        │
        ├─ nudge xbgst-surface (install if missing)
        ├─ seed punk-records
        └─ inject/print APPLY.md into live Grok Bot
                │
                ▼
        named cards + one group
```

## Why the surface is nudged first

Grok Bot without `xbgst-surface` has no proven local-exec + inject path on this family of hosts. The pack does not replace that surface. It sits on it.

```bash
bash scripts/set-grok-bot.sh
# same as:
bash scripts/nudge-grok-bot-surface.sh
bash scripts/bootstrap-grok-bot.sh --cli auto
```

## Viewport — do not resize the Electron view

`window.resizeTo`, CDP `Emulation.setDeviceMetricsOverride`, and fake 1600×1000
viewports **desync** Hyprland's tile from CDP hitboxes. On this host the live
tile is whatever the compositor assigned (often 860×1408 on a 3440×1440
ultrawide). Leave it. Open Details / Edit Profile at the current size and
write fields through the DOM. If innerWidth ≠ Hyprland `size`, restart Grok
Bot — do not "fix" it from JS.

```bash
# rewrite Descriptions on already-named cards (no viewport change)
python3 scripts/write-grok-bot-profiles.py
```

## Mint rules (official Grok Bot create path)

xAI: New / Ctrl+N → Create new agent → **immediately** Edit Profile and name it.

This host's UI map: `New` is a stub factory. Never leave `New Bot` / `New Agent`.

- Card exists with the pack name → edit Description. Do not click New.
- Card missing → one New, then name it in the same breath.
- No extras. No blob edits. No Marketplace Add for this pack.

## Adapt

Change `bots[]` in `pack.json`. Point `file` at your instruction cards. Keep `surface.nudge`. Rewrite APPLY only if your mint path differs.

The conversation remains the product. Execution stays off this table.
