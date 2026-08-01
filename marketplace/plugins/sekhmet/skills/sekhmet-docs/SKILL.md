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

Requires **Codex Titanium** on PATH (`codex-titanium` or `codex` → titanium). Pin with `CODEX_BIN`.

## Smoke (offline — required gate)

```bash
ROOT=$(mktemp -d)
sekhmet run --dry-run --deterministic --task 'sekhmet-smoke' --root "$ROOT"
ID=$(ls "$ROOT")
sekhmet collect "$ID" --root "$ROOT"
sekhmet status "$ID" --root "$ROOT"
sekhmet gc --max-age 0 --root "$ROOT"
```

## Live on Codex Titanium

```bash
ROOT=$(mktemp -d)
sekhmet run --direct --timeout 90 --task 'Reply with exactly: SPARK_LIVE_OK' --root "$ROOT"
# swarm: up to 64 concurrent (default 16)
printf 'Reply A\nReply B\n' | sekhmet swarm --direct -j 32 --tasks-file - --root "$(mktemp -d)"
```

## Rules

- **No worktrees** — only namespaces under `--root` / `XBRD_SPARK_ROOT` / `$XDG_RUNTIME_DIR/xbrd-spark`
- **Double-work is intentional** — emit everything; distill above
- **Do not put judge/pareto/cluster logic in this layer**
- Prefer `--ro` for pure probes; `--scope DIR` for mutation harbors
- Live needs `codex` on PATH; dry-run does not

## Verify crate tests

```bash
cargo test --offline
```

## Key flags

| Flag | Effect |
| --- | --- |
| `--dry-run` | Namespace + stub; no codex/xask |
| `--direct` | Prefer `codex` over `xask` |
| `--ro` | Force codex `--sandbox read-only` |
| `--scope DIR` | rsync directory into workspace |
| `--timeout N` | Wall-clock kill; status=`timeout` when exceeded |
| `--deterministic` | Stable id from task+scope hash |
| `--no-keep` | Delete namespace after run |

Commands: `run` | `collect` | `gc` | `status`
