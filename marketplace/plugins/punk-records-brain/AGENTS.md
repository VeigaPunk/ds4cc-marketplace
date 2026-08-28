# punk-records-brain — agent defaults

This repo is the Grok Bot auto-setup. People used to writing should be able
to say **set grok bot for me** in grok, Codex, Kimi, cursor-agent, or
OpenCode and get a working table.

## Do this

```bash
bash scripts/set-grok-bot.sh
```

That is FSD for this plugin. Do not invent a second factory.

1. Nudge `xbgst-surface` if missing.
2. Seed `punk-records`.
3. If Grok Bot CDP is on `127.0.0.1:9333` and `agent-browser` is on PATH:
   run `scripts/write-grok-bot-profiles.py`.
4. Else inject `APPLY.md` or print it.

## Do not

- Click New by hand except the one mint that is immediately named.
- `window.resizeTo` or override CDP device metrics.
- Enable a Private skill named `xbgst`.
- Add Marketplace MCP for this pack.
- Treat these cards as the xbgst L1 judge or as six executors.
- Blob-edit `sand-client-persistence`.

## Viewport

Leave the compositor in charge. On Hyprland, `class: grok-bot` is often a
narrow tile. The settings form is still in the DOM after right-click →
Edit Profile. Write fields there. If innerWidth ≠ Hyprland `size`, restart
Grok Bot.

## Pack

`templates/grok-bot-pack/pack.json` is the roster. Copy it to adapt.
`agents/*.agent.md` are the Descriptions, including Punk Records protocol.
