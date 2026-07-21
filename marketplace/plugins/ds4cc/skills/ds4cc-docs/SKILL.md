---
name: ds4cc-docs
description: Review the DS4CC marketplace and show verified install commands for Grok Build, Codex, Claude Code, Copilot CLI, and Kimi Code CLI without executing them. Use when the user pastes a ds4cc-marketplace URL, asks to install DS4CC plugins, or wants marketplace setup.
---

DS4CC is VeigaPunk's public multi-CLI plugin marketplace. Provide guidance only: never run installation commands automatically. Tell the user to review a plugin's source and requested capabilities before installing it.

Prefer the section matching the CLI the user is currently on (**Kimi Code CLI** when in Kimi, **Grok Build** when in Grok CLI / a Grok chat). Fall back to Codex / Claude / Copilot only when they name that host.

## Grok Build (paste-friendly)

Register the marketplace (once):

```bash
grok plugin marketplace add VeigaPunk/ds4cc-marketplace
```

List what Grok can install from it:

```bash
grok plugin list --available --json | jq '.[] | select(.marketplace=="ds4cc-marketplace")'
```

Install a single plugin (review source first):

```bash
grok plugin install "VeigaPunk/ds4cc-marketplace#marketplace/plugins/<plugin-name>" --trust
```

Install several common plugins:

```bash
for p in myagents godspeed-core agent-wall mycommands myskills ds4cc; do
  grok plugin install "VeigaPunk/ds4cc-marketplace#marketplace/plugins/$p" --trust
done
```

Enable after install if needed:

```bash
# config.toml [plugins] enabled = ["myagents", ...]
grok plugin enable myagents
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
codex plugin list
codex plugin add <plugin-name>@ds4cc
```

Local development:

```bash
codex plugin marketplace add .
codex plugin add ds4cc@ds4cc
```

## Claude Code

```bash
claude plugin marketplace add VeigaPunk/ds4cc-marketplace
claude plugin install <plugin-name>@ds4cc
```

## GitHub Copilot CLI

```bash
copilot plugin marketplace add VeigaPunk/ds4cc-marketplace
copilot plugin install <plugin-name>@ds4cc
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

## Plugin catalog (developer marketplace)

| Plugin | Role |
|---|---|
| `myagents` | Curated agent profiles |
| `godspeed-core` | Pareto / godspeed doctrine |
| `agent-wall` | Session handoff checkpoints |
| `mycommands` | Reusable command packs |
| `myskills` | Skill inventory helpers |
| `ds4cc` | This meta-plugin |
| `spoderman` | Hook / injection research harness |
| `xbrd-gdsp-fknpft` | Multimodel dispatch (xbreed) |
| `aaronplug` | Academic paper retrieval |
| `infinizoom` | Fractal-zoom visualization |
| `godspeed-codex-command` | Codex command-mode bootstrap |
| `the-puppeteer` | Web automation bridge |
| `the-musketeer` | Grok web UI adapter |
| `the-almanacker` | NotebookLM adapter |

Official OpenAI Apps SDK package is separate: `official/ds4cc/` + `https://app.ds4cc.com/mcp`.
