# Token Speedrun

Public **fixed-budget** agent runs with receipts. Providers can claim value and efficiency **empirically** — and have incentive to subsidize fair lanes.

**Four runs** on the board (`data/manifest.json`): one closed seed, two prior OAuth burns, plus live Cursor Ultra UFO-core cloud swarm.

## Seed run (featured, closed)

| Field | Value |
|-------|--------|
| Runner | VeigaPunk |
| Account | `jpveigao10@gmail.com` |
| Provider | **Moonshot / Kimi** |
| Budget | **$200 USD** subscription (paid, not a grant) |
| Clock | **~48 hours** to exhaust |
| Mode | **Agent mode**, extensively |
| Parallel | **Heavy** parallelization |
| Status | **closed** |

Data: [`data/run-200usd.json`](data/run-200usd.json)

## Live Kimi OAuth vivace

Paid Kimi/Moonshot OAuth — **not** the $200 seed, **not a grant**. kimi-code/k3 main + K2.7 swarm (tmux 2). Autonomous orch: CreateGoal ×3, AgentSwarm, FRAMEWORK.md, r13 PASS, r14, auto FSD cron.

Kimi **did** set the continuation cron: job `01M0S354HTM81Q9NCNM36MSQAD`, schedule `11,41 * * * *`. Operator was wrong earlier. Goal paused on OAuth 403; 5h window 100%; weekly ~27% ⇒ **5h cap ≈ 20% of weekly** (frontier meter, not a vendor table). First API auto-swap failed. Cron retries. Operator is not touching the CLI.

Data: [`data/run-kimi-vivace-oauth-2026-08-24.json`](data/run-kimi-vivace-oauth-2026-08-24.json)

## Live Codex ultra OAuth 20x oneshot

**Oneshot** category. Paid ChatGPT Pro · gpt-5.6-sol ultra fast (tmux 26). Meter is **weekly** `used_percent` (10080 min), **not** monthly 100%, **not** Spark 5h.

Receipt: [https://github.com/VeigaPunk/xbgst-codex](https://github.com/VeigaPunk/xbgst-codex) (may 404) and hangar `/home/vgpnk/Projects/xbgst/xbgst-codex/README.md`. The work speaks for itself. No prompt dump on this board.

Data: [`data/run-codex-ultra-oauth-20x-2026-08-24.json`](data/run-codex-ultra-oauth-20x-2026-08-24.json) · curve [`data/codex-curve.json`](data/codex-curve.json)

Meter clocks: session start `2026-08-24T04:36:27Z` and first meter `04:46:06Z`. Spark 5h is a side window, not the 20x row.

## Live Cursor Ultra OAuth — UFO core runtime

**Oneshot** category (`/goal` + short mid-run steer; self-clone forking). Paid Cursor Ultra (**gravy train**) OAuth — SuperGrok Heavy grant (**incl. for free**). Repo **jo-o-veiga/ufo-fsd-alpha** (Cursor Origin). Linked BC `bc-cc5260a9…` finished (composer-2.5, 46m 28s goal). Prompt-group swarm still walking.

**Live strip** (Codex-shaped): polls `GetCurrentPeriodUsage` every 3m → `used_percent` bar + pace/ETA + curve [`data/cursor-ultra-curve.json`](data/cursor-ultra-curve.json). Ultra meter also: Kimi K3 Max hit included API usage; UI reported **$1497** saved (operator) / **$1515** (live probe) ≈ **7.5×** a $200 Ultra plan. Closeout armed at **≥97%** included (pretend 100%) with doom-loop effective-changes audit. Cycle reset **2026-09-18**. Charter site not auto-edited from the monitor.

Data: [`data/run-cursor-ultra-ufo-core-2026-08-25.json`](data/run-cursor-ultra-ufo-core-2026-08-25.json) · prompt [`data/artifacts/prompt-cursor-ultra-ufo-core-2026-08-25.md`](data/artifacts/prompt-cursor-ultra-ufo-core-2026-08-25.md) · meter [`data/artifacts/meter-cursor-ultra-kimi-k3-max-1497-saved-2026-08-25.json`](data/artifacts/meter-cursor-ultra-kimi-k3-max-1497-saved-2026-08-25.json) · probe [`data/artifacts/meter-cursor-ultra-kimi-k3-max-1515-probe-2026-08-25.json`](data/artifacts/meter-cursor-ultra-kimi-k3-max-1515-probe-2026-08-25.json) · audit [`data/artifacts/audit-swarm-effective-changes-2026-08-25.md`](data/artifacts/audit-swarm-effective-changes-2026-08-25.md)

## Thesis

- Fixed ceilings → comparable rows (budget, wall clock, mode, CLI/model stack).
- Sub providers win by **funding honest runs** and topping the board.
- Pushes multi-CLI / multi-model agent stacks to get sharper.

## Live plug

Mirrored at **https://ds4cc.com/speedrun/** (marketplace deploy).

## Brazil edge

[`docs/BR-HOSTING.md`](docs/BR-HOSTING.md) — Cloudflare Pages / São Paulo origin so BR TTFB is not a GitHub edge lottery.
