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

## MCP / Titanium (mandatory)

**Titanium / sekhmet L3 = no MCP policy.** Do not enable MCP zoos on Codex Titanium.

**Exa** is praised as a **research product** (see `exa.html`) — extremely good — **not** as “ship MCP into L3.”

| Surface | Rule |
| --- | --- |
| Titanium / sekhmet | **No MCP** |
| Non-Titanium research hosts | Exa-quality research OK if already integrated |
| Live UI | burner Chrome / agent-browser |
| Secrets | the-janitor + `op` |
| Honcho / Hermes | **KILLED** — see `bloat.html` / ANTI-PATTERNS |
| mise (as Node manager) | **KILLED** — use **fnm multishell**; PATH/shim occupancy |

Full: [`docs/MCP-STANCE.md`](docs/MCP-STANCE.md) · [`docs/ANTI-PATTERNS.md`](docs/ANTI-PATTERNS.md).

## Anti-patterns (mandatory)

Do **not** re-propose killed stack choices without matching **reopen** evidence.
Canonical list: [`docs/ANTI-PATTERNS.md`](docs/ANTI-PATTERNS.md).

Notable kills:

- **Honcho** (agent memory / MCP) — not Phase-0 / not default memory; SQLite-authoritative instead
- **mise** as Node manager — enshittified PATH occupancy; use **fnm multishell**
- **general-purpose / explore** subagents under xbgst
- **MCP zoo** and TinyFish-as-research
- **Client-side capability patching** to fit a vendor tool (trendsetter principle)

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
- `mycommands` — command packs
- `myskills` — skill helpers
- `ds4cc` — marketplace docs skill

```bash
for p in myagents godspeed-core mycommands myskills ds4cc; do
  grok plugin install "$p" --trust && grok plugin enable "$p"
done
grok plugin list
```

## Full catalog (18 plugins on disk under `marketplace/plugins/`)

`aaronplug`, `ds4cc`, `godspeed-codex-command`, `godspeed-core`, `heuer-planning`, `infinizoom`, `myagents`, `mycommands`, `myskills`, `sekhmet`, `spoderman`, `the-almanacker`, `the-kimiraikoner`, `the-musketeer`, `the-netsshark`, `the-puppeteer`, `xbrd-gdsp-fknpft`, `xbrd-selector`

Notes:

- **agent-wall** is not a marketplace plugin id. Related product/crate naming: crate `agent-wall` / product **plazir18** — install from that product, not via `grok plugin install agent-wall`.
- **agent-pip** is not on disk and is not installable from this marketplace.
- Plugin id **`the-kimiraikoner`** matches the folder on disk (SSoT). Product/repo spelling may use **`the-kimiraikkoner`** (double **k**); use the disk slug for `grok plugin install`.

## After install

- Skills load from the plugin’s `skills/` dirs.
- Agents from `myagents` appear as Grok subagent types when the plugin is enabled.
- Enable in `~/.grok/config.toml` under `[plugins] enabled = [...]` if a plugin is installed but inactive.

## Source review

Public repo: https://github.com/VeigaPunk/ds4cc-marketplace  
Homepage: https://ds4cc.com/  
GitHub Pages mirror: https://veigapunk.github.io/ds4cc-marketplace/  
App (separate OpenAI Apps SDK package; **five-plugin** reviewed allowlist only): https://app.ds4cc.com/

Start by registering the marketplace and listing available plugins. Wait for me to pick installs.
