---
name: xbrd-gdsp-fknpft-docs
description: Dispatch xask cross-model queries and run xbreed orchestration workflows.
---

xbrd-gdsp-fknpft provides the xask/xbreed multi-model dispatch CLI.

## Configure an OpenCode agent interactively

Load `agent-model-selector` when you want to choose any effective OpenCode
agent, any model returned by `opencode models --verbose`, and a thinking
variant supported by that exact model. The skill previews and confirms the
minimal agent override before writing it.

## Install the Godspeed skill for Codex

The Codex marketplace manifest already exposes `skills/godspeed`. For a
standalone user-wide install in Codex's documented `$HOME/.agents/skills`
location, run:

```bash
bash scripts/install-codex-godspeed-skill.sh
```

Then invoke it in Codex with `$godspeed` or select it from `/skills`.

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
