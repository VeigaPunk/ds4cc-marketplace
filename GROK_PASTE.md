# DS4CC → Grok Build (paste this into a Grok chat)

Copy everything below the line into Grok CLI. Review each plugin before you let the agent run install commands.

---

You are helping me use the **DS4CC marketplace** (`VeigaPunk/ds4cc-marketplace`) on **Grok Build**.

## Goals

1. Ensure the marketplace source is registered.
2. List available DS4CC plugins.
3. Install only the plugins I name (default set below if I say “core”).
4. Do **not** auto-install or enable hooks/MCP without my explicit OK.
5. Prefer `grok plugin …` commands. Do not require Codex unless I ask.

## Register (idempotent)

```bash
grok plugin marketplace add VeigaPunk/ds4cc-marketplace
grok plugin marketplace list
```

## Discover

```bash
grok plugin list --available --json | jq '.[] | select(.marketplace=="ds4cc-marketplace" or (.source|tostring|test("ds4cc-marketplace")))'
```

## Core set (install only if I say “core” or name them)

- `myagents` — agent profiles
- `godspeed-core` — godspeed / Pareto posture
- `agent-wall` — handoff checkpoints
- `mycommands` — command packs
- `myskills` — skill helpers
- `ds4cc` — marketplace docs skill

```bash
for p in myagents godspeed-core agent-wall mycommands myskills ds4cc; do
  grok plugin install "VeigaPunk/ds4cc-marketplace#marketplace/plugins/$p" --trust
done
grok plugin list
```

## Full catalog (14)

`aaronplug`, `agent-wall`, `ds4cc`, `godspeed-codex-command`, `godspeed-core`, `infinizoom`, `myagents`, `mycommands`, `myskills`, `spoderman`, `the-almanacker`, `the-musketeer`, `the-puppeteer`, `xbrd-gdsp-fknpft`

## After install

- Skills load from the plugin’s `skills/` dirs.
- Agents from `myagents` appear as Grok subagent types when the plugin is enabled.
- Enable in `~/.grok/config.toml` under `[plugins] enabled = [...]` if a plugin is installed but inactive.

## Source review

Public repo: https://github.com/VeigaPunk/ds4cc-marketplace  
Homepage: https://ds4cc.com/  
GitHub Pages mirror: https://veigapunk.github.io/ds4cc-marketplace/  
App (separate OpenAI Apps SDK package): https://app.ds4cc.com/

Start by registering the marketplace and listing available plugins. Wait for me to pick installs.
