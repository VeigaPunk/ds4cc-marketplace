---
name: ds4cc-docs
description: Review the DS4CC marketplace and show verified install commands for Grok Build, Codex, Claude Code, and Copilot CLI without executing them. Use when the user pastes a ds4cc-marketplace URL, asks to install DS4CC plugins, or wants marketplace setup.
---

DS4CC is VeigaPunk's public multi-CLI plugin marketplace. Provide guidance only: never run installation commands automatically. Tell the user to review a plugin's source and requested capabilities before installing it.

Prefer **Grok Build** commands when the user is in Grok CLI / this chat. Fall back to Codex / Claude / Copilot only when they name that host.

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
