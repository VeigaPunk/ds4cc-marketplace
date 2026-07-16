# ds4cc-validator

Rust CLI that validates marketplace manifests and plugin manifests in the DS4CC Codex marketplace.

## Usage

Run from the **repo root** (`ds4cc-marketplace/`):

```sh
cargo run --manifest-path marketplace/validator/Cargo.toml -- marketplace
```

The argument is the **directory** that contains `marketplace.json`.
Relative and absolute paths both work:

| Invocation (from repo root) | Resolves to |
|---|---|
| `cargo run --manifest-path marketplace/validator/Cargo.toml -- marketplace` | `marketplace/marketplace.json` |
| `cargo run --manifest-path marketplace/validator/Cargo.toml` | `./marketplace.json` (CWD) |

Exit code `0` = all checks pass. Exit code `1` = one or more errors printed to stderr.

## Running tests

```sh
cargo test --manifest-path marketplace/validator/Cargo.toml
```

Tests include unit tests for schema validation and semver, and integration tests that:

- Validate the real `marketplace.json` end-to-end.
- Assert all expected plugin entries are present.
- Invoke the `codex` CLI in an isolated `CODEX_HOME` (via `std::process::Command`) to verify the marketplace subcommand is reachable.

## Checks performed

- `marketplace.json` parses as valid JSON.
- `plugins` list is non-empty.
- Each plugin entry has `source.source == "local"` and `source.path == "./plugins/<name>"`.
- Plugin directory exists with `.codex-plugin/plugin.json`, `skills/`, and `README.md`.
- `plugin.json` fields: `name` matches entry, `version` is strict semver (`X.Y.Z`), `description` and `author.name` are non-empty, all `interface` fields are non-empty, `capabilities` is non-empty.
- Every `.md` file under `skills/` contains at least one actionable line (fenced code block, `$` prompt, or known CLI prefix: `codex`, `cargo`, `node`, `bash`, `./`, `npx`).
