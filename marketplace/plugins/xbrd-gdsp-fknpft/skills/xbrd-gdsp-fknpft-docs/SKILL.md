---
name: xbrd-gdsp-fknpft-docs
description: Dispatch xask cross-model queries and run xbreed orchestration workflows.
---

xbrd-gdsp-fknpft provides the xask/xbreed multi-model dispatch CLI.

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
