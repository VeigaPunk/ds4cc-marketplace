# DS4CC Marketplace

Static plugin payloads for Codex, GitHub Copilot CLI, and Claude Code. OpenCode agents are provided through a dependency-free bootstrap script because OpenCode has no marketplace protocol.

- Marketplace JSON: `marketplace/marketplace.json`
- Plugin assets: `marketplace/plugins/<name>/`
- Validator: `marketplace/validator/` (Rust, `cargo test`)

## Add this marketplace to Codex

```bash
codex plugin marketplace add https://github.com/VeigaPunk/ds4cc-marketplace.git
```

Or local dev:

```bash
codex plugin marketplace add "file://$(pwd)/marketplace/marketplace.json"
```

Install `myagents` after adding the marketplace:

```bash
codex plugin add myagents
```

## GitHub Copilot CLI

```bash
copilot plugin marketplace add VeigaPunk/ds4cc-marketplace
copilot plugin install myagents@ds4cc
```

## Claude Code

```bash
claude plugin marketplace add VeigaPunk/ds4cc-marketplace
claude plugin install myagents@ds4cc
```

## OpenCode

OpenCode does not have a native marketplace. Clone this repository and choose one scope:

```bash
git clone https://github.com/VeigaPunk/ds4cc-marketplace.git
node ds4cc-marketplace/scripts/install-opencode-agents.mjs --global
# OR
node ds4cc-marketplace/scripts/install-opencode-agents.mjs --project /path/to/project
```

The commands are alternatives, not sequential steps. The installer writes native agent files to `${XDG_CONFIG_HOME:-~/.config}/opencode/agents` or `<project>/.opencode/agents`. It installs all 14 `the-*` subagents plus an `orch` primary mode derived from `the-judge`. `orch` runs XBGST by default, loads all three Godspeed sources at the judge level, and injects the core directive into every delegation. The installer refuses differing existing files unless `--force` is supplied and does not edit `opencode.json`.

Profiles use `xask --spark --gs codex` for cross-model delegation. `xask` is an external prerequisite, is not bundled by `myagents`, and must be installed separately on `PATH`; profiles that do not invoke cross-model delegation remain usable without it.

## OpenAI Apps SDK

The read-only Apps SDK wrapper in `apps-sdk/` exposes the marketplace through a production MCP endpoint and embedded catalog widget. It is configured for `https://app.ds4cc.com/mcp`, includes required tool annotations and widget CSP/domain metadata, and provides public privacy, terms, support, health, and domain-verification routes.

```bash
cd apps-sdk
npm ci
npm run build
npm test
```

Deploy with the root `render.yaml` blueprint or `apps-sdk/Dockerfile`, attach `app.ds4cc.com`, and follow `apps-sdk/SUBMISSION.md` for the OpenAI plugin portal fields and tests.

## Plugins (12)

| Plugin | Category | Description |
|---|---|---|
| `spoderman` | Developer | Attack harness & hook safety research |
| `xbrd-gdsp-fknpft` | Developer | Multimodel dispatch (xask/xbreed) & benchmark workflows |
| `aaronplug` | Developer | Academic paper retrieval (arXiv, Semantic Scholar, Sci-Hub) |
| `infinizoom` | Developer | Fractal-zoom visualization QA & server |
| `godspeed-codex-command` | Developer | Command-mode bootstrap & Codex posture controls |
| `the-puppeteer` | Developer | Web automation & long-running ChatGPT bridge |
| `godspeed-core` | Developer | Adaptive execution doctrine & Pareto walk policy |
| `myagents` | Developer | Curated agent workflow launchpad |
| `mycommands` | Developer | Reusable command packs & shell routines |
| `myskills` | Developer | Curated skill inventory & workflow helpers |
| `agent-wall` | Developer | Handoff checkpoints & session continuity |
| `ds4cc` | Developer | Marketplace meta-plugin (discover, install, manage) |

## Install a plugin

```bash
codex plugin list
codex plugin add <plugin-name>
```

## Validate the marketplace locally

```bash
# Rust validator
cargo run --manifest-path marketplace/validator/Cargo.toml -- marketplace

# Rust integration tests (includes std::process-based isolated Codex CLI test)
cargo test --manifest-path marketplace/validator/Cargo.toml

# npm-free agent and cross-platform manifest checks
node scripts/validate-agent-payloads.mjs
node scripts/check-opencode-install.mjs

# Claude Code strict marketplace and plugin validation
claude plugin validate --strict .claude-plugin/marketplace.json
claude plugin validate --strict marketplace/plugins/myagents

# Optional focused isolated Codex check
cargo test --manifest-path marketplace/validator/Cargo.toml test_codex_cli_isolated_process
```

## Plugin structure

Each plugin lives at `marketplace/plugins/<name>/` and must contain:

```
<name>/
  .codex-plugin/plugin.json   # required: name, version, description, author, interface
  README.md                   # required
  skills/
    <skill-name>/
      SKILL.md                # required: must be actionable (has runnable commands)
```

## Schema requirements

`plugin.json` required fields:

```json
{
  "name": "<matches directory name>",
  "version": "<X.Y.Z semver>",
  "description": "<non-empty>",
  "author": { "name": "<non-empty>" },
  "interface": {
    "displayName": "...",
    "shortDescription": "...",
    "longDescription": "...",
    "developerName": "...",
    "category": "...",
    "capabilities": ["..."]
  }
}
```

A `SKILL.md` is **actionable** if its body (after frontmatter) contains at least one of:
- A fenced code block (` ``` `)
- A `$`-prefixed line
- A known CLI prefix: `codex `, `cargo `, `node `, `bash `, `./`, `npx `
