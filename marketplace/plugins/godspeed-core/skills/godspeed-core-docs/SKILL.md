---
name: godspeed-core-docs
description: Apply Godspeed adaptive execution doctrine and Pareto walk policy on Grok Build or Codex.
---

Godspeed Core exposes the directive, filter, and velocity policy files.

## Validate Rust marketplace changes

From the repository root, run the validator gates before shipping:

```bash
cargo fmt --manifest-path marketplace/validator/Cargo.toml -- --check
cargo clippy --manifest-path marketplace/validator/Cargo.toml --all-targets -- -D warnings
cargo test --manifest-path marketplace/validator/Cargo.toml
cargo run --manifest-path marketplace/validator/Cargo.toml -- marketplace/marketplace.json
```

Keep the first failing gate visible, fix it, and rerun the complete sequence. Do not claim validation from a partial run.

## Read the directive

```bash
cat directive.md
```

## Inspect the Pareto filter

```bash
cat filter.md
```

## Inspect velocity policy

```bash
cat velocity.md
```

## Apply Godspeed mode to current session

**Grok Build** — say `godspeed: <your task>` or enable the plugin skill and proceed without clarifying questions.

**Codex:**

```bash
codex "godspeed: <your task>"
```
