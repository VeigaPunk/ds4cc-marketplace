# Sekhmet

**The swarm dispatch substrate** — layer 3 of xbreed.

Sekhmet is **always available to be called**: any agent, labrat swarm, mutation probe, or shell can dispatch through it without worktrees and without waiting for coordination layers. It is the marketplace name for the pure L3 worker surface implemented by [`xbrd-spark`](https://github.com/VeigaPunk/xbrd-spark) (**Rust only**).

| Layer | Role |
| --- | --- |
| L1 / judge | xbreed · xbgst · the-judge (Pareto, axes, approval) |
| L2 / select | xbrd-selector · model/agent routing |
| **L3 / Sekhmet** | **always-on namespaced codex-spark swarm dispatch** |

## What it does

- **Always-callable swarm substrate** — default channel for cheap parallel sparks
- Runs **codex-spark** (GPT-5.3-Codex-Spark) in **ephemeral namespaces** — **no git worktrees**
- **Double-work tolerant** — concurrent identical tasks are fine; higher layers distill
- Invocable by labrat swarms, mutation-tester, executor, or plain CLI
- Coordination (judge / distill / dedup) stays **above** this surface
- **Rust-only binary** — no Python runtime

## Install binary

```bash
cargo install --git https://github.com/VeigaPunk/xbrd-spark --locked
# or from a local clone:
# cargo install --path /path/to/xbrd-spark --force
```

Requires `codex` on `PATH` for live runs (`--dry-run` needs neither codex nor xask).

## CLI

```bash
# Offline gate / dry-run (full namespace + stub + NDJSON)
xbrd-spark run --dry-run --task "probe" --root "$(mktemp -d)"

# Live direct (prefer codex over xask)
xbrd-spark run --direct --timeout 90 --task "Reply with SPARK_OK"

# Read-only sandbox
xbrd-spark run --ro --task "..."

# Scope snapshot into workspace
xbrd-spark run --scope /path/to/dir --direct --task "..."

# Collect / status / gc
xbrd-spark collect <id> --root "$ROOT"
xbrd-spark status <id> --root "$ROOT"
xbrd-spark gc --max-age 2 --root "$ROOT"
```

## Install this marketplace plugin

```bash
# Grok Build
grok plugin install sekhmet --trust && grok plugin enable sekhmet

# Codex
codex plugin add sekhmet@ds4cc --json
```

## Verify

```bash
cargo test --manifest-path /path/to/xbrd-spark/Cargo.toml --offline
xbrd-spark run --dry-run --deterministic --task sekhmet-smoke --root "$(mktemp -d)"
```

## Source

- Binary crate: https://github.com/VeigaPunk/xbrd-spark  
- License: MIT OR Apache-2.0  
- Maintainer: VeigaPunk  
