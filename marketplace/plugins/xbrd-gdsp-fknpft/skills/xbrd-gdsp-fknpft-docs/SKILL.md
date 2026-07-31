---
name: xbrd-gdsp-fknpft-docs
description: Dispatch xask cross-model queries and run xbreed orchestration workflows.
---

xbrd-gdsp-fknpft provides the xask/xbreed multi-model dispatch CLI.

## Configure an xbreed delegation interactively

Load `agent-model-selector` to change a local xbreed agent's operative `xask`
delegation. It discovers installed Codex and Ollama model IDs, selects effort,
previews the command diff, and writes only the selected local agent override.

## Install the Godspeed skill for Codex

The Codex marketplace manifest already exposes `skills/godspeed`. If the
plugin is not installed, use this alternative standalone user-wide install in
Codex's documented `$HOME/.agents/skills` location:

```bash
bash scripts/install-codex-godspeed-skill.sh
```

Then invoke it in Codex with `$godspeed` or select it from `/skills`.
The installer refuses to overwrite a different same-named skill unless the
user explicitly reruns it with `--force`.

## Run a cross-model query via xask

```bash
./scripts/xask codex "Review this implementation"
./scripts/xask gemini "What patterns exist in this codebase?"
./scripts/xask --gs codex "Apply godspeed and review"
```

## Run with effort level

```bash
./scripts/xask -e high codex "Analyze this architecture"
./scripts/xask --spk codex "Quick probe: does this compile?"
./scripts/xask --model-id gpt-5.6-sol -e high codex "Use this exact model"
```

## Build the xbreed binary

```bash
cargo build --release
./target/release/xbreed --help
```

## Run the benchmark harness

```bash
make bench
```

## Run all tests

```bash
cargo test
```
