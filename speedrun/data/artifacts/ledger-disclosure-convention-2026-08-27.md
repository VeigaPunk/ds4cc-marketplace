# Ledger disclosure convention — avalanche runs (2026-08-27)

Every L1/L2/L3 dispatch of the Token Plan infnet crossbreed avalanche is
disclosed as one JSON line in the run ledger, inside the **ufo-fsd-alpha**
checkout (the run's working tree, not this site repo):

    /home/vgpnk/Projects/origin-work/ufo-fsd-alpha/.ufo/local-dispatch/run-ledger-avalanche-20260827.jsonl

## Row schema

| field | meaning |
|---|---|
| `seq` | per-run disclosure number assigned by the dispatcher (rare dual-disclosures reuse a seq — see notes) |
| `kind` | `L1` orchestrator seat · `L2` worker · `L3` cheap probe |
| `id` | dispatch id (timestamped, unique per dispatch) |
| `seat` | `ufo-l1..l8` core seats · `ufo-w1..w8` web-wave seats · `via-l1` L2 dispatched through a seat · `l7` seat-local re-disclosure |
| `model` / `effort` | model identity + reasoning effort |
| `lane` | billing lane: `token-plan/infnet` or `openai-oauth` |
| `at` | dispatch timestamp (UTC) |
| `outcome` | `spawned-alive` (L1 seat) · `dispatched` (L2/L3) |
| `gen` | recovery generation (L1 rows) |
| `wave` | optional wave tag (`web` for the 2026-08-27 web wave) |

## Notes

- One row per dispatch; the ledger is append-only and is the source of truth
  for the board's `dispatches_disclosed` / `ledger` metrics.
- seq 41—44 are dual-disclosed: seat `l7` re-disclosed four dispatches with
  seq numbers it had already used, so row count > max seq.
- The site entry (`data/run-tp-infnet-crossbreed-avalanche-2026-08-27.json`)
  snapshots the ledger at `snapshot.ts`; re-count rows before quoting numbers.
- Convention for future avalanche runs: one ledger per run,
  `run-ledger-<slug>-<yyyymmdd>.jsonl`, same schema.
