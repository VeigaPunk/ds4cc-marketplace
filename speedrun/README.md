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

**Paid, not a grant.** ChatGPT Pro and Kimi/Moonshot OAuth on these live rows were paid by the operator.

## Live Kimi OAuth vivace

Paid Kimi/Moonshot OAuth — **not** the $200 seed, **not a grant**. kimi-code/k3 main + K2.7 swarm (tmux 2). Autonomous orch (CreateGoal ×3, AgentSwarm, FRAMEWORK.md, r13 PASS, r14, cron :11/:41). Operator served a few prompts including jokes; load-bearing asks are the three goals. **Prompt verbatim + REDACTED twins are held for operator approval** (epistemology: a 125k `write-goal` wrapper is not the typed ask).

Frontier meter: **5h window at 100% while weekly ~25–27% ⇒ 5h cap ≈ 20% of weekly.** Not a vendor table. OAuth 403 paused; API auto-swap failed first; cron retries; operator is not touching the CLI.

Data: [`data/run-kimi-vivace-oauth-2026-08-24.json`](data/run-kimi-vivace-oauth-2026-08-24.json)

## Live Codex ultra OAuth 20x oneshot

**Oneshot** category. Paid ChatGPT Pro · gpt-5.6-sol ultra fast (tmux 26). Meter is **weekly** `used_percent` (10080 min), **not** 100% of the month, **not** Spark 5h. Dual clocks vs 60 minutes: both a miss.

The oneshot wire message was 116 058 bytes because a prior Kimi chat (35/39 turns) was concatenated after a 178-character intent sentence. **The full paste is hangar-only.** Verbatim intent + REDACTED topic map wait for operator approval before any prompt git-push.

Data: [`data/run-codex-ultra-oauth-20x-2026-08-24.json`](data/run-codex-ultra-oauth-20x-2026-08-24.json) · curve [`data/codex-curve.json`](data/codex-curve.json)

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
