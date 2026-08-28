# punk-records-brain

Grok Bot is an amazing **round table** and a weak executor. This plugin
makes that the default.

Say this in grok, Codex, Kimi, cursor-agent, or OpenCode:

```text
set grok bot for me
```

That is the whole setup. The preferred CLI runs the pack. The CDP writer
mints the named cards. You do not click New by hand.

```text
preferred CLI
    │
    ▼
set-grok-bot
    ├─ nudge xbgst-surface
    ├─ seed punk-records
    └─ write profiles through CDP (live Grok Bot)
            or inject APPLY.md if CDP is down
```

Shipped on [ds4cc](https://github.com/VeigaPunk/ds4cc-marketplace) and as
this repo. Copy `templates/grok-bot-pack/pack.json` to adapt the sidebar.

## What you get

One mind that cannot stop disagreeing with itself.

| Card | Drive |
| --- | --- |
| STELLA | Identity. Routes, preserves dissent, compiles. |
| PUNK-01 SHAKA | 正 Should we? |
| PUNK-02 LILITH | 悪 What is everyone too polite to say? |
| PUNK-03 EDISON | 想 What else could exist? |
| PUNK-04 PYTHAGORAS | 知 What do we actually know? |
| PUNK-05 ATLAS | 暴 How do we make it real? (sketch, not a run) |
| PUNK-06 YORK | 欲 What does anyone actually want? |

Group: `EGGHEAD // PUNK RECORDS`.

The product is the conversation, then Stella's compiled path. Not six
executors.

## Install

### From this repo

```bash
git clone https://github.com/VeigaPunk/punk-records-brain
cd punk-records-brain
grok plugin marketplace add .
grok plugin install punk-records-brain --trust
grok plugin enable punk-records-brain
```

Codex / Kimi hosts that read `plugin.json` can add the same tree.

### From ds4cc

```bash
grok plugin marketplace add VeigaPunk/ds4cc-marketplace
grok plugin install punk-records-brain --trust
grok plugin enable punk-records-brain
```

## Set Grok Bot

Grok Bot running, remote debugging on `9333` (this family's
`grok-bot-flags.conf`), `agent-browser` on PATH:

```bash
bash scripts/set-grok-bot.sh
# or
bash bin/set-grok-bot
```

Dry plan:

```bash
bash scripts/set-grok-bot.sh --dry-run
```

Then in any preferred CLI:

```text
set grok bot for me
```

or `/punk-records-brain:set-grok-bot`.

## Sensible defaults (FSD)

- Official create path: New → immediately name. Never leave `New Bot`.
- Existing exact names: edit Description. Do not remint.
- Write Descriptions through CDP. **Do not `window.resizeTo`.** A fake
  viewport desyncs Hyprland tiles from hitboxes and kills automation.
- Do not enable a Private skill named `xbgst`.
- Do not Add Marketplace MCP for this pack.
- `localToolPermission` stays `always` if the host already set it.
- Atlas sketches. Stella writes Punk Records. Nobody here ships.

Adapt: change `bots[]` in `templates/grok-bot-pack/pack.json`. Keep
`surface.nudge`. See `templates/grok-bot-pack/HOW-I-DO-IT.md`.

## Layout

```
bin/set-grok-bot                "set grok bot for me"
scripts/set-grok-bot.sh
scripts/bootstrap-grok-bot.sh
scripts/write-grok-bot-profiles.py   CDP writer — no viewport change
scripts/init-punk-records.sh
scripts/nudge-grok-bot-surface.sh
agents/                         Stella + six satellites
skills/punk-records-brain/      routing, authority, output contract
commands/                       set-grok-bot + bootstrap
templates/punk-records/         shared-memory seed
templates/grok-bot-pack/        how I config Grok Bot (example / adapt)
```

## License

MIT
