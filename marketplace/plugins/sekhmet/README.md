# Sekhmet

**The swarm dispatch substrate** — layer 3 of xbreed.

Sekhmet is **always available to be called**: any agent, labrat swarm, mutation probe, or shell can dispatch through it without worktrees and without waiting for coordination layers. It is the marketplace name for the pure L3 worker surface implemented by [`xbrd-spark`](https://github.com/VeigaPunk/xbrd-spark) (**Rust only**).

| Layer | Role |
| --- | --- |
| L1 / judge | xbreed · xbgst · the-judge (Pareto, axes, approval) |
| L2 / select | xbrd-selector · model/agent routing |
| **L3 / Sekhmet** | **always-on namespaced Titanium swarm dispatch** |

## What it does

- **Always-callable swarm substrate** — default channel for cheap parallel sparks
- Runs **`gpt-5.3-codex-spark`** + effort **low** + `service_tier=fast` (fallback **`gpt-5.6-luna`**) in **ephemeral namespaces** — **no git worktrees**
- **Double-work tolerant** — concurrent identical tasks are fine; higher layers distill
- Invocable by labrat swarms, mutation-tester, executor, or plain CLI
- Coordination (judge / distill / dedup) stays **above** this surface
- **Rust-only binary** — no Python runtime
- Swarm default / hard cap: **`-j 64`**

## Install binary

```bash
cargo install --git https://github.com/VeigaPunk/xbrd-spark --locked
# installs both: sekhmet + xbrd-spark
```

**Runtime:** Codex Titanium host binary (not a plugin twin). Resolve: `CODEX_BIN` → `codex-titanium` → non-stub `codex` (omarchy npx stub skipped). **Never** symlink titanium as `codex`. PATH **`xask`** is the L2 protocol shim (ds4cc plugin), **not** the sekhmet shim. The L3 shim is **`xask-l3`** (`xbrd-spark/scripts/xask`) = thin `sekhmet run --direct` wrapper.

Details: repo root [`docs/TITANIUM-HOST.md`](../../../../docs/TITANIUM-HOST.md).  
**Crate / L3 pin:** `gpt-5.3-codex-spark` · effort `low` · `service_tier=fast` · fallback **`gpt-5.6-luna`** · `-j 64`  
(`XBRD_SPARK_MODEL`, `XBRD_SPARK_FALLBACK_MODEL`, `XBRD_SPARK_SERVICE_TIER`, `XBRD_SPARK_JOBS`; optional `~/.xbgst/env.l3-sekhmet.sh`).  
`--dry-run` needs neither titanium nor xask.

## CLI

```bash
# Always-on L3 env (jobs=64, service_tier=fast)
. ~/.xbgst/env.l3-sekhmet.sh

# Offline gate / dry-run (full namespace + stub + NDJSON)
sekhmet run --dry-run --task "probe" --root "$(mktemp -d)"

# Live on Codex Titanium (prefer --direct); codex-spark+fast with luna fallback is the xbgst pin
XBRD_SPARK_MODEL=gpt-5.3-codex-spark XBRD_SPARK_FALLBACK_MODEL=gpt-5.6-luna XBRD_SPARK_SERVICE_TIER=fast \
  sekhmet run --direct --timeout 90 --task "Reply with SPARK_OK"

# Swarm: default -j 64 concurrent runners (hard cap 64; env XBRD_SPARK_JOBS)
printf 't1\nt2\nt3\n' | sekhmet swarm --direct -j 64 --tasks-file - --root "$(mktemp -d)"

# Read-only sandbox
sekhmet run --ro --task "..."

# Scope snapshot into workspace
sekhmet run --scope /path/to/dir --direct --task "..."

# Collect / status / gc
sekhmet collect <id> --root "$ROOT"
sekhmet status <id> --root "$ROOT"
sekhmet gc --max-age 2 --root "$ROOT"
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
