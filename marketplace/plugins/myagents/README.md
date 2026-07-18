# myagents

Curated agent profiles for Codex, GitHub Copilot CLI, Claude Code, and OpenCode.

## Codex

```bash
codex plugin marketplace add https://github.com/VeigaPunk/ds4cc-marketplace.git
codex plugin add myagents
```

## Copilot CLI

```bash
copilot plugin marketplace add VeigaPunk/ds4cc-marketplace
copilot plugin install myagents@ds4cc
```

Use an installed profile from Copilot's `/agent` menu.

## Claude Code

```bash
claude plugin marketplace add VeigaPunk/ds4cc-marketplace
claude plugin install myagents@ds4cc
```

## OpenCode

OpenCode has no native marketplace protocol. Clone the repository and choose either the global or project scope:

```bash
git clone https://github.com/VeigaPunk/ds4cc-marketplace.git
node ds4cc-marketplace/scripts/install-opencode-agents.mjs --global
# OR
node ds4cc-marketplace/scripts/install-opencode-agents.mjs --project /path/to/project
```

The commands are alternatives, not sequential steps. The installer creates all 14 native `the-*` subagents and an `orch` primary mode without changing `opencode.json`. `orch` assumes the judge posture, runs XBGST for every task, loads the Godspeed directive/filter/velocity trilogy, and propagates the core directive to every delegated role. Existing differing files are refused by default; pass `--force` to replace them explicitly.

Cross-model delegation requires the external `xask` command on `PATH`; `myagents` does not bundle it. The default lane is `xask --spark --gs codex`. Profiles without cross-model delegation remain usable when `xask` is absent.

## Validate

From the repository root, run the npm-free structural check:

```bash
node scripts/validate-agent-payloads.mjs
node scripts/check-opencode-install.mjs
```
