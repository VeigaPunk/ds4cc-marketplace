# DS4CC Marketplace

**[ds4cc.com](https://ds4cc.com)** — one marketplace, and the few good CLIs.

Static plugin payloads for **Grok Build**, **Codex**, **Kimi Code CLI**, and **OpenCode**. OpenCode agents ship through a dependency-free bootstrap script (OpenCode has no marketplace protocol).

Eighteen curated plugins, Rust-validated and curation-gated. Register one repo, install what you need, ship.

| Host | Catalog |
| --- | --- |
| Grok Build | `.grok-plugin/marketplace.json` (+ generated `plugin-index.json`) |
| Codex | `.agents/plugins/marketplace.json` and `marketplace/marketplace.json` |
| Kimi Code 0.28.1 | `.kimi-plugin/marketplace.json` + minimal ZIP packages (`marketplace/plugins/<name>/kimi.plugin.json`) |

- Plugin assets: `marketplace/plugins/<name>/`
- Validator: `marketplace/validator/` (Rust, `cargo test`)
- Curation and claim policy: [`CURATION.md`](CURATION.md)
- **Anti-patterns (what not to use — Honcho, mise, MCP zoo, …):** [`docs/ANTI-PATTERNS.md`](docs/ANTI-PATTERNS.md)
- Paste-into-Grok-chat block: [`GROK_PASTE.md`](GROK_PASTE.md)
- **MCP operator stance (Exa only paid rent):** [`docs/MCP-STANCE.md`](docs/MCP-STANCE.md)
- Titanium host resolve: [`docs/TITANIUM-HOST.md`](docs/TITANIUM-HOST.md)
- Site: [ds4cc.com](https://ds4cc.com) · MCP: [app.ds4cc.com/mcp](https://app.ds4cc.com/mcp) · omegaG: [ds4cc.com/omegag](https://ds4cc.com/omegag/)

### Exa (product praise) · Titanium = **no MCP**

**[Exa.ai](https://exa.ai)** gets a **separate tab** — extremely good research product.  
**Not** Titanium/sekhmet policy: L3 stays **no MCP**. Do not ship MCP zoos onto Codex Titanium.

- Praise: [ds4cc.com/exa.html](https://ds4cc.com/exa.html)
- Bloat kills (Honcho, Hermes, mise, …): [ds4cc.com/bloat.html](https://ds4cc.com/bloat.html)
- Token speedrun board (featured **$200** run): [`~/Projects/token-speedrun`](../token-speedrun) — deploy on **Cloudflare Pages** for BR edge latency
- SSoT: [`docs/MCP-STANCE.md`](docs/MCP-STANCE.md) · [`docs/ANTI-PATTERNS.md`](docs/ANTI-PATTERNS.md)

## Titanium host resolve

Codex Titanium is a **host binary**, not a plugin twin. Marketplace plugins do **not** ship `codex-titanium` / `codex` binaries — only skills and docs (e.g. `sekhmet`).

```bash
# preferred: pin Titanium by name (never symlink it as `codex`)
export CODEX_BIN="$(command -v codex-titanium)"
```

Resolve order: `CODEX_BIN` → `codex-titanium` → non-stub `codex` (omarchy npx `@openai/codex` stub is skipped). Put `sekhmet` / `xbrd-spark` on `PATH` via `cargo install --git https://github.com/VeigaPunk/xbrd-spark --locked`. Optional hardened binary: `brew install VeigaPunk/tap/codex-titanium` — **do not** accept a `codex` symlink; keep `codex-titanium` as the Titanium name. Details: [`docs/TITANIUM-HOST.md`](docs/TITANIUM-HOST.md).

## Grok Build (xAI CLI)

```bash
grok plugin marketplace add VeigaPunk/ds4cc-marketplace
grok plugin list --available --json
grok plugin install myagents --trust
grok plugin enable myagents
```

Install several core plugins:

```bash
for p in myagents godspeed-core mycommands myskills sekhmet xbrd-selector ds4cc; do
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

## Exclusive xbrd substrates (per CLI)

The xbreed stack has CLI-exclusive pure-execution layers. **Codex Titanium L3 (sekhmet / xbrd-spark) is the optimal execution substrate as of 2026-08**: namespaced ephemeral sparks, no git worktrees, double-work tolerant, up to 64 concurrent runners, Rust-only, routes through the hardened Codex Titanium binary.

### Codex (preferred path — Titanium L3)

1. Install the hardened binary as **`codex-titanium`** (never overwrite omarchy `codex`):
   ```bash
   # tarball → ~/.local/bin/codex-titanium  (inner archive entry is named `codex`; rename on install)
   # brew install VeigaPunk/tap/codex-titanium   # Linux x86_64 — refuse a `codex` symlink
   # or build from source: https://github.com/VeigaPunk/codex-titanium
   export CODEX_BIN="$(command -v codex-titanium)"
   ```
2. Install the L3 swarm substrate:
   ```bash
   cargo install --git https://github.com/VeigaPunk/xbrd-spark --locked
   # provides both `sekhmet` and `xbrd-spark`
   ```
3. Marketplace plugin (skills + docs):
   ```bash
   codex plugin marketplace add VeigaPunk/ds4cc-marketplace
   codex plugin add sekhmet@ds4cc --json
   ```
4. Smoke:
   ```bash
   sekhmet run --dry-run --task "probe" --root "$(mktemp -d)"
   sekhmet run --direct --timeout 60 --task "Reply with SPARK_OK"
   ```

Runtime resolve: `CODEX_BIN` → `codex-titanium` → skip omarchy npx `codex` stub. Crate default **`gpt-5.3-codex-spark`** + effort **low** + `service_tier=default` + fallback **`gpt-5.6-luna`** (host env may set `XBRD_SPARK_SERVICE_TIER=fast`; `XBRD_SPARK_MODEL` / `XBRD_SPARK_FALLBACK_MODEL` / `XBRD_SPARK_SERVICE_TIER`).

### Grok Build (xbgst exclusive + livepatch ban)

Recommended host config (same file served on the Titanium / ds4cc Pages site):

- **Pages:** https://veigapunk.github.io/ds4cc-marketplace/grok-cli-config.toml  
- **Repo:** [grok-cli-config.toml](./grok-cli-config.toml)

```bash
# 1) host config
mkdir -p ~/.grok
curl -fsSL https://veigapunk.github.io/ds4cc-marketplace/grok-cli-config.toml -o ~/.grok/config.toml

# 2) hard-ban general-purpose/explore in the CLI binary
git clone git@github.com:VeigaPunk/grok-build-livepatch.git
cd grok-build-livepatch
./scripts/check-and-patch.sh
./scripts/install-timer.sh --link-bin   # active_cli=livepatch

# 3) xbgst-stack + ds4cc catalog
grok plugin marketplace add VeigaPunk/grok-marketplace
grok plugin marketplace add VeigaPunk/ds4cc-marketplace
grok plugin install xbgst-stack@veigapunk/grok-marketplace --trust
bash ~/.grok/installed-plugins/xbgst-stack-*/scripts/install-host.sh
# optional skill tree: VeigaPunk/xbrd-grok
```

Hard locks: subagents receive only short godspeed directive; judge alone runs full trilogy; Rust only; host-governed concurrency certified at 64; connector mandatory every round. Binary ban rejects `general-purpose`/`explore` (case-insensitive); first-party full-tool paths use `agent`.

### Shared multi-model (xbrd-gdsp-fknpft + xbrd-selector)

Available on every host via the marketplace plugin:

```bash
# Grok
grok plugin install xbrd-gdsp-fknpft --trust && grok plugin enable xbrd-gdsp-fknpft
# Codex
codex plugin add xbrd-gdsp-fknpft@ds4cc --json
# Kimi
/plugins install https://github.com/VeigaPunk/ds4cc-marketplace   # or specific artifact
# OpenCode
# already injected via install-opencode-agents.mjs godspeed + xask dependency
```

Requires `xask` on `PATH` for cross-model. See plugin README for full setup gates.

### Kimi Code CLI & OpenCode

No dedicated exclusive binary yet. Consume the shared xbrd plugins + sekhmet (where Titanium is available) through their bootstrap paths. OpenCode installer injects Godspeed + orch (XBGST posture) automatically. Kimi uses the minimal packages; custom `the-*` profiles are not installed.


## OpenAI Apps SDK

The read-only Apps SDK wrapper in `apps-sdk/` exposes only an explicitly reviewed subset through a production MCP endpoint and embedded catalog widget. It is not the public 18-plugin marketplace. It is configured for `https://app.ds4cc.com/mcp`, includes required tool annotations and widget CSP/domain metadata, and provides public privacy, terms, support, health, and domain-verification routes.

```bash
cd apps-sdk
npm ci
npm run build
npm test
```

Deploy with the root `render.yaml` blueprint or `apps-sdk/Dockerfile`, attach `app.ds4cc.com`, and follow `apps-sdk/SUBMISSION.md` for the OpenAI plugin portal fields and tests.

## Plugins (18)

SSoT: `marketplace/plugins/<name>/` and `marketplace/marketplace.json` (18 entries). Drafts under `drafts/` are **not** catalog plugins.

| Plugin | Category | Description |
|---|---|---|
| `aaronplug` | Developer | Academic paper retrieval (arXiv, Semantic Scholar, Sci-Hub) |
| `ds4cc` | Developer | Marketplace meta-plugin (discover, install, manage) |
| `godspeed-codex-command` | Developer | Command-mode bootstrap & Codex posture controls |
| `godspeed-core` | Developer | Adaptive execution doctrine & Pareto walk policy |
| `heuer-planning` | Developer | Standalone Heuer-style structured planning skill |
| `infinizoom` | Developer | Fractal-zoom visualization QA & server |
| `myagents` | Developer | Curated agent workflow launchpad |
| `mycommands` | Developer | Reusable command packs & shell routines |
| `myskills` | Developer | Curated skill inventory & workflow helpers |
| `sekhmet` | Developer | Always-available swarm substrate (xbreed L3; Rust `xbrd-spark`, up to 64 runners) |
| `spoderman` | Developer | Attack harness & hook safety research |
| `the-almanacker` | Developer | Gemini Notebook / NotebookLM adapter (0.2.1) |
| `the-kimiraikoner` | Developer | Kimi web UI adapter (agent-browser / CDP) |
| `the-musketeer` | Developer | Grok web UI adapter — Expert/Imagine/Automations (0.3.1) |
| `the-netsshark` | Developer | Empirical DNS, routing, proxy, firewall, MTU, connectivity audits |
| `the-puppeteer` | Developer | ChatGPT web UI bridge — Pro/Chat-Work (0.2.1) |
| `xbrd-gdsp-fknpft` | Developer | Multimodel dispatch (xask/xbreed) & benchmark workflows |
| `xbrd-selector` | Developer | Pure-Rust rover / model selector helpers for xbreed stacks |

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

The OpenAI submission is the isolated source tree at `official/ds4cc/`, not the public plugin at `marketplace/plugins/ds4cc/` and not the public 18-plugin marketplace. Its skill uses only the read-only `browse_ds4cc_marketplace` MCP tool and reviewed results. Build the deterministic, path-safe archive locally:

```bash
python3 scripts/build-ds4cc-submission.py
```

The ignored output is `artifacts/ds4cc-openai-submission.zip`. The builder accepts exactly the reviewed files in `official/ds4cc/`, including its LICENSE; it rejects extras, links, unsafe names, and traversal, and writes deterministic regular mode-0644 entries. The portal MCP URL is entered separately as `https://app.ds4cc.com/mcp`. The public plugin remains functional documentation for registering and using the full developer marketplace, but it is never bundled for official review.

## Related stack

| Piece | Role |
| --- | --- |
| [xbrd-spark](https://github.com/VeigaPunk/xbrd-spark) | L3 Sekhmet swarm binary (`sekhmet` / `xbrd-spark`); global cap **64** concurrent workers |
| [sekhmet-l3](https://github.com/VeigaPunk/sekhmet-l3) | Public L3 usage + GATE evidence pack (luna + fast, j=64) |
| [xbgst](https://github.com/VeigaPunk/xbgst) | Grok host Godspeed stack (host-governed concurrency certified at 64, including Sekhmet) |
| [xbgst-site](https://github.com/VeigaPunk/xbgst-site) | Public xbgst hub · [https://veigapunk.github.io/xbgst-site/](https://veigapunk.github.io/xbgst-site/) · [repo](https://github.com/VeigaPunk/xbgst-site) |
| [xbrd-sol-ultra](https://github.com/VeigaPunk/xbrd-sol-ultra) | Sol Ultra root judge skill: one `sekhmet swarm -j 64` wave per round |
| [xbrd-selector](https://github.com/VeigaPunk/xbrd-selector) | Rover CLI; also packaged here as plugin `xbrd-selector` |
| Site | [ds4cc.com](https://ds4cc.com) · MCP [app.ds4cc.com/mcp](https://app.ds4cc.com/mcp) |

**Hosts (4):** Grok Build, Codex, Kimi Code CLI, OpenCode (bootstrap script; no native marketplace protocol).

## Licensing

Repository-owned code and documentation are available under the root MIT License. Bundled or referenced third-party material remains under its own license; the root license does not relicense it. Aaronplug's included license and manifest identify the Unlicense.
