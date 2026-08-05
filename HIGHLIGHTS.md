# DS4CC Marketplace — Technical Highlights

> **ELI5 framing**: A Codex plugin marketplace is like an app store baked into your CLI. Instead of installing tools manually, you register a repository and `codex plugin add <name>@ds4cc` pulls down the selected files, descriptions, and skill scripts so the AI knows what your tools can do. This repo is that public developer marketplace.

---

## What changed

### From docs-only to actionable — all 18 plugins

Every plugin under `marketplace/plugins/` ships a `SKILL.md` with real, copy-pasteable commands. Validation _rejects_ boilerplate ("Read the README…") and only accepts files that contain:

- A fenced code block (` ``` `), or
- A line starting with `$`, `codex`, `cargo`, `node`, `bash`, `./`, or `npx`

**SSoT catalog (18 plugin directories):**

| Plugin | Role (short) |
|---|---|
| `aaronplug` | Academic paper retrieval |
| `ds4cc` | Meta-plugin: browse/install this marketplace |
| `godspeed-codex-command` | Codex command-mode bootstrap |
| `godspeed-core` | Pareto / godspeed doctrine |
| `heuer-planning` | Planning skill pack |
| `infinizoom` | Fractal-zoom visualization |
| `myagents` | Browse/copy user agent templates |
| `mycommands` | Reusable shell command packs |
| `myskills` | Discoverable skill workflows |
| `sekhmet` | Host/orchestration docs (Titanium-adjacent) |
| `spoderman` | Hook / injection research harness |
| `the-almanacker` | NotebookLM adapter |
| `the-kimiraikoner` | Kimi web UI adapter (plugin slug; product may spell `the-kimiraikkoner`) |
| `the-musketeer` | Grok web UI adapter |
| `the-netsshark` | Net/SSH specialist agent pack |
| `the-puppeteer` | Web automation bridge |
| `xbrd-gdsp-fknpft` | Multimodel dispatch (xbreed) |
| `xbrd-selector` | Breed/selector tooling |

**Not marketplace plugins:**

- **agent-wall** — not installable via this catalog. Glossary: crate name `agent-wall` / product **plazir18** (not a ds4cc plugin id).
- **agent-pip** — not present under `marketplace/plugins/`; do not list as installable.

**Sample actionable commands (subset):**

| Plugin | Key actionable command |
|---|---|
| `godspeed-core` | `codex "godspeed: <task>"` |
| `spoderman` | `bash ./spoderman validate --hooks` |
| `aaronplug` | `npx @veigapunk/aaron papers search "..."` |
| `infinizoom` | `node qa-zoom.mjs` |
| `godspeed-codex-command` | `bash ./scripts/install-commands.sh` |
| `the-puppeteer` | `chitchat "..."` |
| `xbrd-gdsp-fknpft` | `cargo build --release && ./target/release/xbreed --help` |
| `myagents` | `codex "Use the executor profile to implement the failing test"` |
| `mycommands` | `codex "Use the installed command pack for this task"` |
| `myskills` | Open the Codex TUI and use `/skills` |
| `ds4cc` | `codex plugin marketplace add VeigaPunk/ds4cc-marketplace` |

---

## The Rust validator — why and what it checks

**Why Rust**: the codebase uses Rust-only authored helpers. No Python, no shell scripts. The validator is a binary crate (`ds4cc-validator`) that can be called from CI, pre-commit hooks, or locally.

**What it validates** (per plugin):

1. `source.source` must be `"local"`
2. `source.path` must be `"./plugins/<name>"` (path integrity)
3. `.codex-plugin/plugin.json` must exist and parse as valid JSON
4. `plugin.name` must match the marketplace entry name
5. `version` must be valid semver (`X.Y.Z`)
6. `description`, `author.name`, all `interface.*` fields must be non-empty
7. `interface.capabilities` must be a non-empty array
8. `skills/` directory must exist
9. `README.md` must exist
10. At least one `.md` file must exist under `skills/` and every skill file must be **actionable** (code block or recognized command pattern)

**Binary usage:**
```bash
# Build and run against the real marketplace
cargo build --release
./target/release/ds4cc-validator ./marketplace
# → "Validation passed."
```

---

## Verification evidence

### cargo fmt
```
cargo fmt --check
# Exit 0 — no formatting violations
```

### cargo clippy (strict)
```
cargo clippy -- -D warnings
# Finished `dev` profile — 0 warnings, 0 errors
```

### cargo test (11/11)
```
running 11 tests
test test_is_skill_actionable_with_code_block ... ok
test test_is_skill_not_actionable_boilerplate ... ok
test test_expected_plugins_present ... ok
test test_actionable_skill_passes ... ok
test test_docs_only_skill_fails ... ok
test test_missing_plugin_json_fails ... ok
test test_valid_marketplace_passes ... ok
test test_semver_validation ... ok
test test_real_marketplace_validates ... ok
test test_fnm_node_isolation ... ok
test test_codex_cli_isolated_process ... ok

test result: ok. 11 passed; 0 failed; 0 ignored; 0 measured
```

### Validator binary against real marketplace
```
./target/release/ds4cc-validator ./marketplace
Validation passed.
```

### codex plugin --help (marketplace subcommand present)
```
codex plugin --help
Commands:
  add          Install a plugin from a configured marketplace snapshot
  list         List plugins available from configured marketplace snapshots
  marketplace  Add, list, upgrade, or remove configured plugin marketplaces
  ...
```

### codex plugin list (real probe, shows personal marketplace active)
```
codex plugin list
Marketplace `personal`
/home/vhpnk/.agents/plugins/marketplace.json
...
spoderman@personal     installed, enabled  0.1.0
xbrd-gdsp-fknpft@personal  installed, enabled  0.1.0
...
```

### FNM multishell Node isolation (test 11)
```
fnm exec --using lts-latest -- node --version
v24.18.0
```
FNM v1.39.0 is installed. `test_fnm_node_isolation` proves:
- FNM is available and self-reports correctly
- `fnm exec --using lts-latest` spawns a clean subprocess with Node v24.18.0 in PATH
- `aaronplug/package.json` is valid JSON (structural check without installing deps)

---

## Canonical Codex layout — how marketplace add actually works

The `marketplace/` subdirectory layout (`marketplace/marketplace.json` + `marketplace/plugins/<name>`) is the **web/CI layout** deployed through GitHub Pages and used by the Rust validator for internal validation.

The **runtime/Codex layout** is different: Codex's `plugin marketplace add <dir>` expects:
```
<dir>/.agents/plugins/marketplace.json   ← manifest
<dir>/...plugins...                       ← plugin paths relative to <dir>
```

So the canonical file is `.agents/plugins/marketplace.json` at repo root, with paths `./marketplace/plugins/<name>`. This is what Codex reads when you run `codex plugin marketplace add /path/to/ds4cc-marketplace`.

Both are validated by the Rust binary:
```bash
ds4cc-validator marketplace/    # legacy: reads marketplace/marketplace.json
ds4cc-validator .               # canonical: reads .agents/plugins/marketplace.json
# Both print: "Validation passed."
```

The validator's `validate_marketplace_dir(root)` auto-detects which layout is present (legacy first, then canonical) and resolves all plugin paths relative to `root`.

### Real probes (install all 18)

```bash
# Register the ds4cc marketplace
codex plugin marketplace add .
# → Added marketplace `ds4cc` from the local clone.

# Install all 18 plugins (names match marketplace/plugins/*)
for plugin in aaronplug ds4cc godspeed-codex-command godspeed-core \
              heuer-planning infinizoom myagents mycommands myskills \
              sekhmet spoderman the-almanacker the-kimiraikoner \
              the-musketeer the-netsshark the-puppeteer \
              xbrd-gdsp-fknpft xbrd-selector; do
  codex plugin add "${plugin}@ds4cc"
done
# Each → Added plugin `<name>` from marketplace `ds4cc`.

# Confirm
codex plugin list | grep "@ds4cc"
# All 18 show: installed and enabled at their manifest versions
```

Do **not** `codex plugin add agent-wall@ds4cc` or `agent-pip@ds4cc` — those are not catalog plugins.

---

## Architecture: how the pieces connect

```
ds4cc-marketplace/
├── .agents/plugins/
│   └── marketplace.json          ← canonical Codex layout (name: "ds4cc", paths: ./marketplace/plugins/<name>)
├── marketplace/
│   ├── marketplace.json          ← web/CI layout (18 plugins, paths: ./plugins/<name>)
│   ├── plugins/<name>/           ← 18 plugin directories (SSoT)
│   │   ├── .codex-plugin/
│   │   │   └── plugin.json       ← manifest: name, version, interface, capabilities
│   │   ├── skills/<name>/
│   │   │   └── SKILL.md          ← actionable: must have code blocks
│   │   └── README.md
│   └── validator/                ← Rust crate
│       ├── src/
│       │   ├── lib.rs            ← validate_marketplace_dir(), validate_marketplace(), validate_plugin()
│       │   └── main.rs           ← CLI binary: ds4cc-validator <dir> (auto-detects layout)
│       └── tests/
│           └── integration_test.rs  ← schema + both layouts + codex CLI + FNM + live list
```

**Codex plugin contract** (what Codex reads at install time):
- `plugin.json` → display name, description, capabilities shown in `codex plugin list`
- `skills/<name>/SKILL.md` → text injected into the Codex context when the skill is activated
- `README.md` → human-readable documentation

---

## Local registration

Codex registration uses the repository root, where `.agents/plugins/marketplace.json` lives. From a clone:

```bash
# Register this repository root as a local source
codex plugin marketplace add .

# Then install individual plugins (examples)
codex plugin add myagents@ds4cc
codex plugin add mycommands@ds4cc
codex plugin add myskills@ds4cc
codex plugin add ds4cc@ds4cc
codex plugin add sekhmet@ds4cc
```

### Gap: FNM isolation scoped to version probe only

`test_fnm_node_isolation` proves FNM can spawn a clean Node subprocess. It does _not_ run `npm install` or `bun install` in an FNM-isolated temp dir for aaronplug/infinizoom — that would require network access and a writable temp `node_modules`. The test is intentionally scoped to the structure proof (parseable `package.json`) plus runtime probe (`node --version via fnm exec`). Full install probes would be added to a separate CI job gated on network availability.

---

## Apps SDK vs full marketplace

- **Public Git marketplace:** 18 plugins under `marketplace/plugins/`.
- **OpenAI Apps SDK app (`apps-sdk/`, `app.ds4cc.com`):** reviewed **five-plugin** allowlist only — not the full catalog.

---

## Files historically touched for dual-layout work

| File | Change |
|---|---|
| `.agents/plugins/marketplace.json` | Canonical Codex layout (`ds4cc`, paths `./marketplace/plugins/<name>`) |
| `.gitignore` | Allow `.agents/plugins/marketplace.json` to be tracked |
| `marketplace/validator/src/lib.rs` | Dual-path convention support |
| `marketplace/validator/src/main.rs` | `validate_marketplace_dir()` auto-detect |
| `marketplace/validator/tests/integration_test.rs` | Layout + CLI + FNM gates |
| `HIGHLIGHTS.md` | Catalog accuracy (18 plugins; no agent-wall install loop) |
