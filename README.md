# DS4CC Marketplace

**[ds4cc.com](https://ds4cc.com)** — one marketplace, every agent CLI.

Static plugin payloads for **Grok Build**, **Codex**, **Kimi Code CLI**, and **OpenCode**. OpenCode agents ship through a dependency-free bootstrap script (OpenCode has no marketplace protocol).

Sixteen curated plugins, Rust-validated and curation-gated. Register one repo, install what you need, ship.

| Host | Catalog |
| --- | --- |
| Grok Build | `.grok-plugin/marketplace.json` (+ generated `plugin-index.json`) |
| Codex | `.agents/plugins/marketplace.json` and `marketplace/marketplace.json` |
| Kimi Code 0.28.1 | `.kimi-plugin/marketplace.json` + minimal ZIP packages (`marketplace/plugins/<name>/kimi.plugin.json`) |

- Plugin assets: `marketplace/plugins/<name>/`
- Validator: `marketplace/validator/` (Rust, `cargo test`)
- Curation and claim policy: [`CURATION.md`](CURATION.md)
- Paste-into-Grok-chat block: [`GROK_PASTE.md`](GROK_PASTE.md)
- Site: [ds4cc.com](https://ds4cc.com) · MCP: [app.ds4cc.com/mcp](https://app.ds4cc.com/mcp)

## Grok Build (xAI CLI)

```bash
grok plugin marketplace add VeigaPunk/ds4cc-marketplace
grok plugin list --available --json
grok plugin install myagents --trust
grok plugin enable myagents
```

Install several core plugins:

```bash
for p in myagents godspeed-core agent-wall mycommands myskills ds4cc; do
  grok plugin install "$p" --trust && grok plugin enable "$p"
done
```

Or paste the contents of [`GROK_PASTE.md`](GROK_PASTE.md) into a Grok chat — skills are written so Grok can follow them without host-specific wiring.

Local checkout:

```bash
grok plugin marketplace add .
```

## Codex (OpenAI CLI)

```bash
codex plugin marketplace add VeigaPunk/ds4cc-marketplace
codex plugin list --available --json
codex plugin add myagents@ds4cc --json
codex plugin list --json
```

Adding a plugin installs it enabled. Start a new Codex session to load its bundled skills and tools. To toggle plugin state, open `/plugins` in the Codex TUI and press `Space`.

Or local dev:

```bash
codex plugin marketplace add .
```

## Kimi Code CLI 0.28.1

The repository URL can be installed directly as the DS4CC bootstrap plugin:

```
/plugins install https://github.com/VeigaPunk/ds4cc-marketplace
/reload
```

The root `kimi.plugin.json` exists for this direct-install path. To browse and
install every packaged plugin, register the published catalog in the Kimi TUI:

```
/plugins marketplace https://veigapunk.github.io/ds4cc-marketplace/.kimi-plugin/marketplace.json
```

Install a catalog artifact URL (or a built local ZIP path), then reload:

```
/plugins install <artifact-url-or-local-path>
/reload
```

Invoke installed skills as `/skill:<skill-name>` and plugin commands as `/<plugin>:<command>`. Third-party installs show a trust confirmation first, so review the source before approving. Kimi 0.28.1 installs the skills and commands in these deliberately minimal packages, but it cannot install this marketplace's custom `the-*` agent profiles. Kimi's built-in agents remain available.

## OpenCode

OpenCode does not have a native marketplace. Clone this repository and choose one scope:

```bash
git clone https://github.com/VeigaPunk/ds4cc-marketplace.git
node ds4cc-marketplace/scripts/install-opencode-agents.mjs --global
# OR
node ds4cc-marketplace/scripts/install-opencode-agents.mjs --project /path/to/project
```

The commands are alternatives, not sequential steps. The installer writes native agent files to `${XDG_CONFIG_HOME:-~/.config}/opencode/agents` or `<project>/.opencode/agents`. It installs 15 `the-*` subagents plus `the-netsshark` (16 subagents total), and a separate `orch` primary mode aligned to `the-judge`. `orch` runs XBGST by default, loads all three Godspeed sources at the judge level, and injects the core directive into every delegation. The installer refuses differing existing files unless `--force` is supplied and does not edit `opencode.json`.

Profiles use `xask --spark --gs codex` for cross-model delegation. `xask` is an external prerequisite, is not bundled by `myagents`, and must be installed separately on `PATH`; profiles that do not invoke cross-model delegation remain usable without it.

## OpenAI Apps SDK

The read-only Apps SDK wrapper in `apps-sdk/` exposes only an explicitly reviewed subset through a production MCP endpoint and embedded catalog widget. It is not the public 16-plugin marketplace. It is configured for `https://app.ds4cc.com/mcp`, includes required tool annotations and widget CSP/domain metadata, and provides public privacy, terms, support, health, and domain-verification routes.

```bash
cd apps-sdk
npm ci
npm run build
npm test
```

Deploy with the root `render.yaml` blueprint or `apps-sdk/Dockerfile`, attach `app.ds4cc.com`, and follow `apps-sdk/SUBMISSION.md` for the OpenAI plugin portal fields and tests.

## Plugins (16)

| Plugin | Category | Description |
|---|---|---|
| `spoderman` | Developer | Attack harness & hook safety research |
| `xbrd-gdsp-fknpft` | Developer | Multimodel dispatch (xask/xbreed) & benchmark workflows |
| `aaronplug` | Developer | Academic paper retrieval (arXiv, Semantic Scholar, Sci-Hub) |
| `infinizoom` | Developer | Fractal-zoom visualization QA & server |
| `godspeed-codex-command` | Developer | Command-mode bootstrap & Codex posture controls |
| `the-puppeteer` | Developer | Web automation & long-running ChatGPT bridge |
| `the-musketeer` | Developer | Grok web UI adapter (agent-browser / CDP) |
| `the-almanacker` | Developer | NotebookLM web UI adapter |
| `the-kimiraikoner` | Developer | Kimi web UI adapter (agent-browser / CDP) |
| `godspeed-core` | Developer | Adaptive execution doctrine & Pareto walk policy |
| `myagents` | Developer | Curated agent workflow launchpad |
| `mycommands` | Developer | Reusable command packs & shell routines |
| `myskills` | Developer | Curated skill inventory & workflow helpers |
| `agent-wall` | Developer | Handoff checkpoints & session continuity |
| `agent-pip` | Developer | Multi-panel tmux agent terminal dashboard in Rust |
| `ds4cc` | Developer | Marketplace meta-plugin (discover, install, manage) |

## Install a plugin

```bash
# Grok
grok plugin install <plugin-name> --trust
grok plugin enable <plugin-name>

# Codex
codex plugin list --available --json
codex plugin add <plugin-name>@ds4cc --json
codex plugin list --json
```

## Validate the marketplace locally

```bash
# Rust validator
cargo run --manifest-path marketplace/validator/Cargo.toml -- marketplace

# Rust integration tests (includes std::process-based isolated Codex CLI test)
cargo test --manifest-path marketplace/validator/Cargo.toml

# npm-free agent and multi-format manifest checks
node scripts/validate-agent-payloads.mjs
node scripts/check-opencode-install.mjs

# Dependency-free Kimi manifest/catalog checks, tests, and artifact build
python3 scripts/build-kimi-marketplace.py --check
python3 -m unittest -v tests.test_build_kimi_marketplace
python3 scripts/build-kimi-marketplace.py

# Rust validator and agent payload checks
cargo test --manifest-path marketplace/validator/Cargo.toml
node scripts/validate-agent-payloads.mjs

# Optional focused isolated Codex check
cargo test --manifest-path marketplace/validator/Cargo.toml test_codex_cli_isolated_process
```

## Plugin structure

Each plugin lives at `marketplace/plugins/<name>/` and must contain:

```
<name>/
  .codex-plugin/plugin.json   # required: name, version, description, author, interface
  kimi.plugin.json            # Kimi 0.28.1 metadata and ./ skills/commands roots
  README.md                   # required
  skills/
    <skill-name>/
      SKILL.md                # required: must be actionable (has runnable commands)
```

The Kimi builder includes only `kimi.plugin.json` and regular files under the manifest's declared `./skills/` and `./commands/` roots. It rejects links, traversal, unsupported fields (including `agents`), invalid skill frontmatter, and absent roots. Generated root-flat ZIPs live under the ignored `.kimi-plugin/artifacts/` directory; `.kimi-plugin/marketplace.json` is retained as the published catalog.

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
- A fenced code block (triple backticks)
- A `$`-prefixed line
- A known CLI prefix: `codex `, `grok `, `claude `, `cargo `, `node `, `bash `, `./`, `npx `

## Official OpenAI submission bundle

The OpenAI submission is the isolated source tree at `official/ds4cc/`, not the public plugin at `marketplace/plugins/ds4cc/` and not the public 16-plugin marketplace. Its skill uses only the read-only `browse_ds4cc_marketplace` MCP tool and reviewed results. Build the deterministic, path-safe archive locally:

```bash
python3 scripts/build-ds4cc-submission.py
```

The ignored output is `artifacts/ds4cc-openai-submission.zip`. The builder accepts exactly the reviewed files in `official/ds4cc/`, including its LICENSE; it rejects extras, links, unsafe names, and traversal, and writes deterministic regular mode-0644 entries. The portal MCP URL is entered separately as `https://app.ds4cc.com/mcp`. The public plugin remains functional documentation for registering and using the full developer marketplace, but it is never bundled for official review.

## Licensing

Repository-owned code and documentation are available under the root MIT License. Bundled or referenced third-party material remains under its own license; the root license does not relicense it. Aaronplug's included license and manifest identify the Unlicense.
