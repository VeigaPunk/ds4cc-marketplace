# Token Speedrun

Public **fixed-budget** agent runs with receipts. Providers can claim value and efficiency **empirically** — and have incentive to subsidize fair lanes.

**Five runs** on the board (`data/manifest.json`): closed $200 Kimi seed, closed Codex OAuth 20x, **closed** Cursor Ultra UFO-core, **closed** Token Plan avalanche, and the **live** SuperGrok Heavy groknight OAuth run (2026-09-13) — a new run, not Cursor Ultra.

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

## Codex ultra OAuth 20x oneshot (closed)

**Oneshot** category. Paid ChatGPT Pro · gpt-5.6-sol ultra fast (tmux 26). Meter is **weekly** `used_percent` (10080 min), **not** monthly 100%, **not** Spark 5h.

Receipt: [https://github.com/VeigaPunk/xbgst-codex](https://github.com/VeigaPunk/xbgst-codex) (may 404) and hangar `/home/vgpnk/Projects/xbgst/xbgst-codex/README.md`. The work speaks for itself. No prompt dump on this board.

Data: [`data/run-codex-ultra-oauth-20x-2026-08-24.json`](data/run-codex-ultra-oauth-20x-2026-08-24.json) · curve [`data/codex-curve.json`](data/codex-curve.json)

Meter clocks: session start `2026-08-24T04:36:27Z` and first meter `04:46:06Z`. Spark 5h is a side window, not the 20x row.

## Cursor Ultra OAuth UFO-core runtime (closed)

**Oneshot** category (`/goal` + short mid-run steer; self-clone forking). **$99** Ultra mint (**gravy train**) · **$199** Cursor Ultra · SuperGrok Heavy alone ~**$300** (grant / incl. for free) · Grok bot **free** · X Premium+ (giver). Repo **jo-o-veiga/ufo-fsd-alpha** (Cursor Origin). Linked BC `bc-cc5260a9…` finished (composer-2.5, 46m 28s goal). Prompt-group swarm still walking. Public button: [`oneshot prompt + steer`](data/artifacts/oneshot-prompt-cursor-ultra-ufo-core-2026-08-25.html) (steer pretended on the oneshot — operator was lunching). Mid-run **model-reroute** steer folded in: L1 swarm orch must auto-wake ERROR lanes onto `cursor-grok-4.6-high-fast` · `cursor-grok-4.5-high-fast` · `composer-2.5` (no operator paste).

**Complete burn:** **48h** from mint → projected 100% included monthly. **Total saved:** **$4,519** API @ complete burn (45.7× $99 mint); **$3,570** latest Kimi probe (36.1×). Measured close: **26.1h @ 79%** on 24h harvest wall. API pool 100% @ **1.8h** from mint.

Data: [`data/run-cursor-ultra-ufo-core-2026-08-25.json`](data/run-cursor-ultra-ufo-core-2026-08-25.json) · prompt [`data/artifacts/prompt-cursor-ultra-ufo-core-2026-08-25.md`](data/artifacts/prompt-cursor-ultra-ufo-core-2026-08-25.md) · meter [`data/artifacts/meter-cursor-ultra-kimi-k3-max-1497-saved-2026-08-25.json`](data/artifacts/meter-cursor-ultra-kimi-k3-max-1497-saved-2026-08-25.json) · probe [`data/artifacts/meter-cursor-ultra-kimi-k3-max-3570-probe-2026-08-27.json`](data/artifacts/meter-cursor-ultra-kimi-k3-max-3570-probe-2026-08-27.json) · audit [`data/artifacts/audit-swarm-effective-changes-2026-08-25.md`](data/artifacts/audit-swarm-effective-changes-2026-08-25.md)

## Live — SuperGrok Heavy groknight (2026-09-13)

New run. Paid SuperGrok OAuth weekly credits (start 20%). 8 L1 `xai-oauth/grok-4.6:low` · L2 `xai-oauth/grok-4.5:low` (max 16/L1). White-hat EV overlay: claim-ready count + expected $ only after an in-scope PoC exists. No submit until L0.

Data: [`data/run-supergrok-oauth-groknight-2026-09-13.json`](data/run-supergrok-oauth-groknight-2026-09-13.json) · curve [`data/supergrok-groknight-curve.json`](data/supergrok-groknight-curve.json)

## Closed — Token Plan crossbreed avalanche (2026-08-27)

Offpeak crossbreed avalanche on `ufo-fsd-alpha` (2026-08-27). Closed. Data: [`data/run-tp-infnet-crossbreed-avalanche-2026-08-27.json`](data/run-tp-infnet-crossbreed-avalanche-2026-08-27.json).

## Thesis

- Fixed ceilings → comparable rows (budget, wall clock, mode, CLI/model stack).
- Sub providers win by **funding honest runs** and topping the board.
- Pushes multi-CLI / multi-model agent stacks to get sharper.

## Live plug

Mirrored at **https://ds4cc.com/speedrun/** (marketplace deploy).

## Brazil edge

[`docs/BR-HOSTING.md`](docs/BR-HOSTING.md) — Cloudflare Pages / São Paulo origin so BR TTFB is not a GitHub edge lottery.
