# DS4CC Codex Marketplace

Static marketplace payload for Codex plugin installation.

- Marketplace JSON: `marketplace/marketplace.json`
- Plugin assets: `marketplace/plugins/<name>/`
- Validator: `marketplace/validator/` (Rust, `cargo test`)

## Add this marketplace to Codex

```bash
codex plugin marketplace add https://ds4cc.com/marketplace/marketplace.json
```

Or local dev:

```bash
codex plugin marketplace add "file://$(pwd)/marketplace/marketplace.json"
```

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
