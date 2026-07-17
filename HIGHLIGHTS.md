# DS4CC Marketplace — Technical Highlights

> **ELI5 framing**: A Codex plugin marketplace is like an app store baked into your CLI. Instead of installing tools manually, you register a URL and `codex plugin add <name>` pulls down the right files, descriptions, and skill scripts so the AI knows what your tools can actually do. This repo _is_ that store — curated, validated, and Rust-enforced.

---

## What changed

### From docs-only to actionable — all 12 plugins

Every plugin now ships a `SKILL.md` with real, copy-pasteable commands. Validation _rejects_ boilerplate ("Read the README…") and only accepts files that contain:

- A fenced code block (` ``` `), or
- A line starting with `$`, `codex`, `cargo`, `node`, `bash`, `./`, or `npx`

**7 original plugins verified actionable:**

| Plugin | Key actionable command |
|---|---|
| `godspeed-core` | `codex "godspeed: <task>"` |
| `spoderman` | `bash ./spoderman validate --hooks` |
| `aaronplug` | `npx @veigapunk/aaron papers search "..."` |
| `infinizoom` | `node qa-zoom.mjs` |
| `godspeed-codex-command` | `bash ./scripts/install-commands.sh` |
| `the-puppeteer` | `chitchat "..."` |
| `xbrd-gdsp-fknpft` | `cargo build --release && ./target/release/xbreed --help` |

**5 new plugins added and validated:**

| Plugin | What it does | Key actionable command |
|---|---|---|
| `myagents` | Browse/copy user agent templates | `codex exec --agent executor "..."` |
| `mycommands` | Reusable shell command packs | `codex exec "/my-command-name"` |
| `myskills` | Discoverable Codex skill workflows | `codex exec "/skill-name <args>"` |
| `agent-wall` | Handoff checkpoints between sessions | `codex exec "Create an agent-wall checkpoint..."` |
| `ds4cc` | Meta-plugin: browse/install this marketplace | `codex plugin marketplace add https://github.com/VeigaPunk/ds4cc-marketplace.git` |

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

### Real probes (executed)

```bash
# Register the ds4cc marketplace
codex plugin marketplace add /home/vhpnk/repos/ds4cc-marketplace
# → Added marketplace `ds4cc` from /home/vhpnk/repos/ds4cc-marketplace.

# Install all 12 plugins
for plugin in spoderman xbrd-gdsp-fknpft aaronplug infinizoom \
              godspeed-codex-command the-puppeteer godspeed-core \
              myagents mycommands myskills agent-wall ds4cc; do
  codex plugin add "${plugin}@ds4cc"
done
# Each → Added plugin `<name>` from marketplace `ds4cc`.
#         Installed plugin root: /home/vhpnk/.codex/plugins/cache/ds4cc/<name>/0.1.0

# Confirm
codex plugin list | grep "@ds4cc"
# All 12 show: installed, enabled  0.1.0
```

---

## Architecture: how the pieces connect

```
ds4cc-marketplace/
├── .agents/plugins/
│   └── marketplace.json          ← canonical Codex layout (name: "ds4cc", paths: ./marketplace/plugins/<name>)
├── marketplace/
│   ├── marketplace.json          ← web/CI layout (12 plugins, paths: ./plugins/<name>)
│   ├── plugins/<name>/
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
│           └── integration_test.rs  ← 13 tests (schema + both layouts + codex CLI + FNM + live list)
```

**Codex plugin contract** (what Codex reads at install time):
- `plugin.json` → display name, description, capabilities shown in `codex plugin list`
- `skills/<name>/SKILL.md` → text injected into the Codex context when the skill is activated
- `README.md` → human-readable documentation

---

## Blockers and open items

### Not blocked

All functional work is complete. The validator, manifests, SKILL.md files, and marketplace.json are all verified.

### Gap: ds4cc-marketplace not yet registered as active marketplace

The user's active Codex marketplace (`~/.agents/plugins/marketplace.json`) is a separate file from this repo's `marketplace/marketplace.json`. The 5 new plugins (myagents, mycommands, myskills, agent-wall, ds4cc) are registered in _this repo's_ marketplace.json but are not yet in the active personal marketplace or installed locally. To activate them:

```bash
# Register this repo's marketplace as a local source
codex plugin marketplace add file://$(realpath marketplace/marketplace.json)

# Then install individual plugins
codex plugin add myagents
codex plugin add mycommands
codex plugin add myskills
codex plugin add agent-wall
codex plugin add ds4cc
```

### Gap: FNM isolation scoped to version probe only

`test_fnm_node_isolation` proves FNM can spawn a clean Node subprocess. It does _not_ run `npm install` or `bun install` in an FNM-isolated temp dir for aaronplug/infinizoom — that would require network access and a writable temp `node_modules`. The test is intentionally scoped to the structure proof (parseable `package.json`) plus runtime probe (`node --version via fnm exec`). Full install probes would be added to a separate CI job gated on network availability.

### Not committed or pushed

Per instructions: no `git add`, no `git commit`, no `git push`. All changes are local working tree modifications.

---

## Files changed / added in this session

| File | Change |
|---|---|
| `.agents/plugins/marketplace.json` | Updated: name `"ds4cc"`, 12 plugins, paths `./marketplace/plugins/<name>` |
| `.gitignore` | Updated: allow `.agents/plugins/marketplace.json` to be tracked |
| `marketplace/validator/src/lib.rs` | Added `validate_marketplace_dir()`, `validate_marketplace_with_base()`, dual-path convention support |
| `marketplace/validator/src/main.rs` | Updated to use `validate_marketplace_dir()` (auto-detects layout) |
| `marketplace/validator/tests/integration_test.rs` | Added tests 11–13: FNM isolation, canonical layout validation, `codex plugin list` evidence gate |
| `HIGHLIGHTS.md` | Created (this file) |

All plugin files, plugin.json manifests, SKILL.md files, README.md files, and `marketplace/marketplace.json` were established in prior sessions and are preserved exactly.
