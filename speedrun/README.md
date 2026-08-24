# Token Speedrun

Public **fixed-budget** agent runs with receipts. Providers can claim value and efficiency **empirically** — and have incentive to subsidize fair lanes.

**Three runs** on the board (`data/manifest.json`): one closed seed plus two live OAuth burns. A live board README lists the live rows, not only the closed seed.

## Seed run (featured, closed)

| Field | Value |
|-------|--------|
| Runner | VeigaPunk |
| Account | `jpveigao10@gmail.com` |
| Provider | **Moonshot / Kimi** |
| Budget | **$200 USD** subscription |
| Clock | **~48 hours** to exhaust |
| Mode | **Agent mode**, extensively |
| Parallel | **Heavy** parallelization |
| Status | **closed** |

Data: [`data/run-200usd.json`](data/run-200usd.json)

## Live Kimi OAuth vivace

OAuth weekly/free grant — **not** the $200 seed. kimi-code/k3 main + K2.7 code swarm (tmux 2). Quota on the strip is **weekly % · 5h %** (5h is the stall risk). Context % is not quota.

Data: [`data/run-kimi-vivace-oauth-2026-08-24.json`](data/run-kimi-vivace-oauth-2026-08-24.json)

## Live Codex ultra OAuth 20x oneshot

ChatGPT Pro · gpt-5.6-sol ultra fast (tmux 26). Meter is weekly `used_percent` (10080 min window), **not** Spark 5h. Dual clocks vs a 60-minute target: session start and first meter; both are scored honestly (a miss is a miss).

Data: [`data/run-codex-ultra-oauth-20x-2026-08-24.json`](data/run-codex-ultra-oauth-20x-2026-08-24.json) · curve [`data/codex-curve.json`](data/codex-curve.json)

Meter clocks: session start `2026-08-24T04:36:27Z` and first meter `04:46:06Z`. Spark 5h is a side window, not the 20x row.

## Thesis

- Fixed ceilings → comparable rows (budget, wall clock, mode, CLI/model stack).
- Sub providers win by **funding honest runs** and topping the board.
- Pushes multi-CLI / multi-model agent stacks to get sharper.

## Live plug

Mirrored at **https://ds4cc.com/speedrun/** (marketplace deploy).

## Brazil edge

[`docs/BR-HOSTING.md`](docs/BR-HOSTING.md) — Cloudflare Pages / São Paulo origin so BR TTFB is not a GitHub edge lottery.
