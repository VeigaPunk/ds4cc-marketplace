---
name: ds4cc-docs
description: Review the DS4CC marketplace and show verified install commands for Grok Build, Codex, Kimi Code CLI, and OpenCode bootstrap without executing them. Use when the user pastes a ds4cc-marketplace URL, asks to install DS4CC plugins, or wants marketplace setup.
---

DS4CC is VeigaPunk's public multi-CLI plugin marketplace. Provide guidance only: never run installation commands automatically. Tell the user to review a plugin's source and requested capabilities before installing it.

Prefer the section matching the CLI the user is currently on (**OpenCode** when using the bootstrap installer, **Kimi Code CLI** when in Kimi, **Grok Build** when in Grok CLI / a Grok chat). Fall back to Codex when they name that host.

## Grok Build (paste-friendly)

Register the marketplace (once):

```bash
grok plugin marketplace add VeigaPunk/ds4cc-marketplace
```

List what Grok can install from it:

```bash
grok plugin list --available --json
```

Install a single plugin (review source first):

```bash
grok plugin install <plugin-name> --trust
grok plugin enable <plugin-name>
```

Install several common plugins:

```bash
for p in myagents godspeed-core mycommands myskills ds4cc; do
  grok plugin install "$p" --trust && grok plugin enable "$p"
done
```

Inspect installed plugins:

```bash
grok plugin list
```

### Orch mode (cycle agents)

DS4CC ships a primary **orch** agent branded as **`ds4cc`** (alias `orch`). Install agents then cycle:

```bash
# from marketplace checkout
bash marketplace/plugins/the-musketeer/scripts/setup-grok-build
# or just copy:
# cp marketplace/plugins/ds4cc/agents/*.md ~/.grok/agents/
```

In the Grok TUI: `/config-agents` (or `/agents`) → select **`ds4cc`** or **`orch`**.

That primary fans out parallel specialists (`the-planner`, `scout`, `reviewer`, `labrat`, `executor`, …) with **Godspeed directive only** on children. Site: https://ds4cc.com/

```bash
grok --agent ds4cc "your task"
# or
grok --agent orch "your task"
```

### Paste-into-Grok-chat bootstrap

If the user pastes this skill or says "install ds4cc", respond with the Grok commands above and **do not auto-run** installs unless they explicitly ask you to execute them.

## Codex CLI

```bash
codex plugin marketplace add VeigaPunk/ds4cc-marketplace
codex plugin list --available --json
codex plugin add <plugin-name>@ds4cc --json
codex plugin list --json
```

Adding a plugin installs it enabled. Start a new Codex session before using its bundled skills and tools. To toggle state, open `/plugins` in the Codex TUI and press `Space`.

Local development:

```bash
codex plugin marketplace add .
codex plugin add ds4cc@ds4cc --json
```

## OpenCode

OpenCode has no native marketplace. Clone the repository and use the bootstrap installer:

```bash
git clone https://github.com/VeigaPunk/ds4cc-marketplace.git
node ds4cc-marketplace/scripts/install-opencode-agents.mjs --global
# OR
node ds4cc-marketplace/scripts/install-opencode-agents.mjs --project /path/to/project
```

## Kimi Code CLI

Kimi Code CLI 0.28.1 can register the published catalog and install its minimal ZIP packages. Type these slash commands in the Kimi TUI:

Browse the full catalog:

```
/plugins marketplace https://veigapunk.github.io/ds4cc-marketplace/.kimi-plugin/marketplace.json
```

Or install a plugin directly:

```
/plugins install <artifact-url-or-local-path>
/reload
```

For example, this meta-plugin:

```
/plugins install ./marketplace/plugins/ds4cc
/reload
/plugins list
```

Installing a third-party plugin shows a trust confirmation first; approve it only after reviewing the plugin source. Plugin skills then become available as `/skill:<skill-name>` (e.g. `/skill:ds4cc-docs`) and plugin commands as `/<plugin>:<command>`. Kimi 0.28.1 cannot install this marketplace's custom `the-*` agent profiles; Kimi's built-in agents remain available.

## OpenCode bootstrap

OpenCode has no native marketplace. Clone the repository and use the bootstrap installer:

```bash
git clone https://github.com/VeigaPunk/ds4cc-marketplace.git
node ds4cc-marketplace/scripts/install-opencode-agents.mjs --global
# OR
node ds4cc-marketplace/scripts/install-opencode-agents.mjs --project /path/to/project
```

The installer writes 15 `the-*` subagents plus `the-netsshark` (16 subagents total), and a separate `orch` primary mode aligned to `the-judge`.

## Plugin catalog (developer marketplace — 18 on disk)

SSoT: `ls marketplace/plugins` (do not invent ids).

| Plugin | Role |
|---|---|
| `aaronplug` | `aaron` CLI tool (Bash-invocable book/paper fetch; not an agent) |
| `ds4cc` | This meta-plugin |
| `godspeed-codex-command` | Codex command-mode bootstrap |
| `godspeed-core` | Pareto / godspeed doctrine |
| `heuer-planning` | Planning skill pack |
| `infinizoom` | Fractal-zoom visualization |
| `myagents` | Curated agent profiles |
| `mycommands` | Reusable command packs |
| `myskills` | Skill inventory helpers |
| `sekhmet` | Host/orchestration docs |
| `spoderman` | Hook / injection research harness |
| `the-almanacker` | NotebookLM adapter |
| `the-kimiraikoner` | Kimi web UI adapter (plugin slug = disk name; product repo may spell `the-kimiraikkoner`) |
| `the-musketeer` | Grok web UI adapter |
| `the-netsshark` | Net/SSH specialist agent pack |
| `the-puppeteer` | Web automation bridge |
| `xbrd-gdsp-fknpft` | Multimodel dispatch (xbreed) |
| `xbrd-selector` | Breed/selector tooling |

**Not installable as marketplace plugins:** `agent-wall` (crate `agent-wall` / product **plazir18** — not a ds4cc plugin id); `agent-pip` (not on disk).

Official OpenAI Apps SDK package is separate (**five-plugin** reviewed allowlist only): `official/ds4cc/` + `https://app.ds4cc.com/mcp`.
