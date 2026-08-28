---
description: Set Grok Bot from this pack. Trigger on "set grok bot for me".
argument-hint: "[--dry-run] [--cli auto]"
---

# set grok bot for me

The user wants Grok Bot configured. Do not click New by hand. Run the pack.

```bash
bash scripts/set-grok-bot.sh
```

Dry plan only:

```bash
bash scripts/set-grok-bot.sh --dry-run
```

That nudges `xbgst-surface`, seeds Punk Records, and writes the named cards
through CDP when Grok Bot is live (`9333` + `agent-browser`). Otherwise it
injects or prints APPLY.

Do not `window.resizeTo`. Do not enable Private skill `xbgst`. Do not Add
Marketplace MCP. Existing exact names are edited, not reminted.

See `AGENTS.md` and `templates/grok-bot-pack/HOW-I-DO-IT.md`.
