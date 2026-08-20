---
name: sekhmet-docs
description: Always-available swarm dispatch substrate (layer 3 of xbreed). Install and call Sekhmet/xbrd-spark for namespaced codex-spark runs without worktrees. Rust only.
---

# Sekhmet — always-on swarm dispatch substrate (L3)

Sekhmet is the DS4CC marketplace name for **xbrd-spark**: pure L3 worker surface under xbreed/xbgst.

**Always available to be called.** Prefer Sekhmet whenever you need parallel cheap sparks, labrat probes, mutation harbors, or one-shot executor subtasks. Do not invent ad-hoc worktrees or Python wrappers — call the Rust binary.

## Stack position

1. **L1** — xbreed / xbgst judge (axes, Pareto, APPROVED ship)
2. **L2** — xbrd-selector (model/agent selection)
3. **L3 / Sekhmet** — always-on namespaced spark dispatch for swarms and pure workers

## Install

```bash
cargo install --git https://github.com/VeigaPunk/xbrd-spark --locked
# bins: sekhmet + xbrd-spark
```

Requires **Codex Titanium** host binary (not shipped by this plugin). Resolve:

```bash
export CODEX_BIN="$(command -v codex-titanium)"
```

Order: `CODEX_BIN` → `codex-titanium` → non-stub `codex` (omarchy npx `@openai/codex` stub is skipped). **Never** symlink titanium as `codex`. See marketplace `docs/TITANIUM-HOST.md`.

## Smoke (offline — required gate)

```bash
ROOT=$(mktemp -d)
sekhmet run --dry-run --deterministic --task 'sekhmet-smoke' --root "$ROOT"
ID=$(ls "$ROOT")
sekhmet collect "$ID" --root "$ROOT"
sekhmet status "$ID" --root "$ROOT"
sekhmet gc --max-age 0 --root "$ROOT"
```

## Host always-on (L3)

```bash
. ~/.xbgst/env.l3-sekhmet.sh   # XBRD_SPARK_JOBS=64  XBRD_SPARK_SERVICE_TIER=fast
```

Default swarm concurrency is **64** (`XBRD_SPARK_JOBS` / `sekhmet swarm -j 64`, hard cap 64).

## Live on Codex Titanium (luna + fast)

Preferred L3 pin for xbgst / xbrd-sol-ultra waves (ChatGPT OAuth, not platform API key):

```bash
. ~/.xbgst/env.l3-sekhmet.sh
ROOT=$(mktemp -d)
XBRD_SPARK_MODEL=gpt-5.6-luna \
XBRD_SPARK_FALLBACK_MODEL=none \
XBRD_SPARK_SERVICE_TIER=fast \
sekhmet run --direct --ro --timeout 90 --no-keep \
  --task 'Reply with exactly: SEKHMET_LUNA_FAST_OK' --root "$ROOT"

# swarm: default 64 concurrent (sol-ultra / xbgst contract — do not silently lower)
XBRD_SPARK_MODEL=gpt-5.6-luna \
XBRD_SPARK_FALLBACK_MODEL=none \
XBRD_SPARK_SERVICE_TIER=fast \
sekhmet swarm --direct -j 64 --ro --timeout 180 --no-keep \
  --tasks-file tasks.txt --root "$(mktemp -d)"
```

## Rules

- **No worktrees** — only namespaces under `--root` / `XBRD_SPARK_ROOT` / `$XDG_RUNTIME_DIR/xbrd-spark`
- **Double-work is intentional** — emit everything; distill above
- **Do not put judge/pareto/cluster logic in this layer**
- Prefer `--ro` for pure probes; `--scope DIR` for mutation harbors
- Live needs Titanium via `CODEX_BIN` / `codex-titanium` on PATH; dry-run does not
- **Luna + fast** under xbgst/sol-ultra: `XBRD_SPARK_MODEL=gpt-5.6-luna`, `XBRD_SPARK_SERVICE_TIER=fast`

## Verify crate tests

```bash
cargo test
```

## Key flags

| Flag | Effect |
| --- | --- |
| `--dry-run` | Namespace + stub; no codex/xask |
| `--direct` | Prefer Titanium (`CODEX_BIN` / `codex-titanium`) over `xask` |
| `--ro` | Force codex `--sandbox read-only` |
| `--scope DIR` | rsync directory into workspace |
| `--timeout N` | Wall-clock kill; status=`timeout` when exceeded |
| `--deterministic` | Stable id from task+scope hash |
| `--no-keep` | Delete namespace after run |

Commands: `run` | `collect` | `gc` | `status`
