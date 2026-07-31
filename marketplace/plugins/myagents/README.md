# myagents

Curated agent profiles for Codex and OpenCode.

## Codex

```bash
codex plugin marketplace add VeigaPunk/ds4cc-marketplace
codex plugin list --available --json
codex plugin add myagents@ds4cc --json
codex plugin list --json
```

The add command installs `myagents` enabled. Start a new Codex session to load its bundled profiles and skills. In the Codex TUI, open `/plugins` and press `Space` to toggle state.

## OpenCode

OpenCode has no native marketplace protocol. Clone the repository and choose either the global or project scope:

```bash
git clone https://github.com/VeigaPunk/ds4cc-marketplace.git
node ds4cc-marketplace/scripts/install-opencode-agents.mjs --global
# OR
node ds4cc-marketplace/scripts/install-opencode-agents.mjs --project /path/to/project
```

The commands are alternatives, not sequential steps. The installer creates 15 native `the-*` subagents plus `the-netsshark` (16 subagents total), and a separate `orch` primary mode without changing `opencode.json`. `orch` assumes the judge posture, runs XBGST for every task, loads the Godspeed directive/filter/velocity trilogy, and propagates the core directive to every delegated role. Existing differing files are refused by default; pass `--force` to replace them explicitly.

Cross-model delegation requires the external `xask` command on `PATH`; `myagents` does not bundle it. The default lane is `xask --spark --gs codex`. Profiles without cross-model delegation remain usable when `xask` is absent.

## Validate

From the repository root, run the npm-free structural check:

```bash
node scripts/validate-agent-payloads.mjs
node scripts/check-opencode-install.mjs
```
