# Plazir Fleet — xask Model Catalog Comparison & xbreed Delegation Recommendations

**Date:** 2026-08-24 · **Scope:** every model the plazir fleet runs through `xask` / `xbreed ask` · **SSoT:** `ds4cc-marketplace` xbrd-gdsp-fknpft plugin

## Provenance (pinned, byte-verified at capture)

| Source | Pin |
|---|---|
| `VeigaPunk/ds4cc-marketplace` main | `0111a99358b12be2b7c3e12312f5250f78bf1d60` |
| `marketplace/plugins/xbrd-gdsp-fknpft/config/xask-models.json` (schema v1, exported 2026-08-23) | blob `2c286df6fa3f30085253c2a1019d61ae4760c3b4` |
| `.../docs/xask-protocol.md` | blob `7f72e4ebe12ea483ed312298f5de855e94de0c28` |
| `.../commands/xbgst.md` (role → lane gate table) | blob `607152e6863408be7ab76f2e4f5319c05d33e5d5` |
| `.../scripts/xask-models` (runtime availability overlay) | blob `c1923b4ab309a998587e3c03e5a33cd876b246f1` |
| `VeigaPunk/ufo-fsd` `artifacts/2026-08-22-xask-lilbench/lilbench.md` (live measurements) | blob `0783a3919010dba77adc980f58ecaa4150b36998` |
| `VeigaPunk/xbgst-kimi` `README.md` (Kimi L1 substrate) | blob `caf9dfe8792805efe753f447d57a3898d6ad27f3` |

Nothing below is from recall. Every row transcribes the catalog blob; every routing claim cites the protocol/roster blobs above; every wall-clock number cites the lilbench artifact.

## Provider summary

| Provider | Label | Models (ids) | Default model | Transports | Auth |
|---|---|---|---|---|---|
| `chatgpt` | OpenAI / ChatGPT | 10 | `gpt-5.6-sol` | `stock`, `sekhmet` | ChatGPT OAuth (`codex login`), Plus/Pro/Enterprise |
| `grok` | xAI Grok | 2 | `grok-4.6` | `stock` | Grok Build CLI oneshot |
| `token-plan` | Alibaba Token Plan | 3 | `qwen3.8-max` | `stock` | Local Token Plan profiles |
| `moonshot` | Moonshot AI (Kimi) | 15 (8 logical) | `kimi-k3` | `stock` | Kimi Code CLI — OAuth `kimi-code/*` first, pay-as-you-go `moonshotai/*` opt-in |
| `local` | Local HVM | 1 | `gemma4:26b` | `stock` | none — local Bend/HVM bridge |

**31 catalog ids, 24 logical models.** Moonshot lists OAuth and pay-as-you-go spellings of the same models as separate ids; both route through the single `kimi` lane.

> **Availability caveat (structural):** the shipped catalog pins `available: false` on every row by design. Live availability is a runtime overlay computed by `scripts/xask-models` from host binaries (`codex`+`xbreed`, `grok`, `codex-token-plan` or per-profile wrappers, `gemma-hvm`, `sekhmet`, `kimi`). Read this table as the *registry*, not as a health probe. Run `xask models --json` on the host for the live overlay.

## Full comparison table (all 31 catalog ids)

| model_id | Display | Provider | Supported efforts | Default effort | Service tiers | Visible | Route / lane | Auth |
|---|---|---|---|---|---|---|---|---|
| `gpt-5.6-sol` | GPT-5.6-Sol | chatgpt | `low` `medium` `high` `xhigh` `max` `ultra` | `low` | `default` `fast` | yes | `codex` / `cdx` bare pin; `-R/--review`, `-R -F` full (1.05M ctx), `--gpt55` lane | ChatGPT OAuth (`codex login`) — Plus/Pro/Enterprise |
| `gpt-5.6-terra` | GPT-5.6-Terra | chatgpt | `low` `medium` `high` `xhigh` `max` `ultra` | `medium` | `default` `fast` | yes | provider mode `--model-id` | ChatGPT OAuth (`codex login`) — Plus/Pro/Enterprise |
| `gpt-5.6-luna` | GPT-5.6-Luna | chatgpt | `low` `medium` `high` `xhigh` `max` | `medium` | `default` `fast` | yes | Spark fallback (`XBRD_SPARK_MODEL` fallback) | ChatGPT OAuth (`codex login`) — Plus/Pro/Enterprise |
| `gpt-daybreak-blue-latest` | Daybreak Blue | chatgpt | `low` `medium` `high` `xhigh` `max` `ultra` | `low` | `default` | yes | provider mode `--model-id`; no fast tier | ChatGPT OAuth (`codex login`) — Plus/Pro/Enterprise |
| `gpt-reserve` | GPT-Reserve | chatgpt | `low` `medium` `high` `xhigh` `max` | `medium` | `default` `fast` | **no (hidden)** | hidden; not user-routable | ChatGPT OAuth (`codex login`) — Plus/Pro/Enterprise |
| `gpt-5.5` | GPT-5.5 | chatgpt | `low` `medium` `high` `xhigh` | `medium` | `default` `fast` | yes | provider mode `--model-id` | ChatGPT OAuth (`codex login`) — Plus/Pro/Enterprise |
| `gpt-5.4` | GPT-5.4 | chatgpt | `low` `medium` `high` `xhigh` | `medium` | `default` `fast` | yes | provider mode `--model-id` | ChatGPT OAuth (`codex login`) — Plus/Pro/Enterprise |
| `gpt-5.4-mini` | GPT-5.4-Mini | chatgpt | `low` `medium` `high` `xhigh` | `medium` | `default` | yes | Rust `xbreed ask --spark` pin (`CODEX_SPARK_MODEL`); no fast tier | ChatGPT OAuth (`codex login`) — Plus/Pro/Enterprise |
| `gpt-5.3-codex-spark` | GPT-5.3-Codex-Spark | chatgpt | `low` `medium` `high` `xhigh` | `high` | `default` `fast` | yes | PATH `xask --spark` / sekhmet default (`XBRD_SPARK_MODEL`) | ChatGPT OAuth (`codex login`) — Plus/Pro/Enterprise |
| `codex-auto-review` | Codex Auto Review | chatgpt | `low` `medium` `high` `xhigh` `max` | `medium` | `default` `fast` | **no (hidden)** | hidden; review automation | ChatGPT OAuth (`codex login`) — Plus/Pro/Enterprise |
| `grok-4.6` | Grok 4.6 | grok | `low` `medium` `high` `xhigh` | `high` | `default` | yes | `grok` route (native CLI oneshot) | Grok Build CLI (host key) |
| `grok-4.5` | Grok 4.5 | grok | `low` `medium` `high` | `high` | `default` | yes | `--model-id` on grok provider | Grok Build CLI (host key) |
| `qwen3.8-max` | Qwen 3.8 Max | token-plan | `low` `medium` `xhigh` | `xhigh` | `default` | yes | `qwen38` (aliases `qwen3.8-max`, `qwen`) | Alibaba Token Plan profile (`codex-token-plan` / `codex-{qwen38,ds-flash,ds-pro}`) |
| `deepseek-v4-flash-0731` | DeepSeek V4 Flash | token-plan | `low` `medium` `xhigh` | `low` | `default` | yes | `ds-flash` | Alibaba Token Plan profile (`codex-token-plan` / `codex-{qwen38,ds-flash,ds-pro}`) |
| `deepseek-v4-pro-0813` | DeepSeek V4 Pro | token-plan | `low` `medium` `xhigh` | `medium` | `default` | yes | `ds-pro` | Alibaba Token Plan profile (`codex-token-plan` / `codex-{qwen38,ds-flash,ds-pro}`) |
| `kimi-k3` | Kimi K3 | moonshot | `low` `high` `max` | `high` | `default` | yes | `kimi` route; `-m kimi-k3` | OAuth (default pin set) |
| `kimi-code/k3` | Kimi K3 | moonshot | `low` `high` `max` | `high` | `default` | yes | `kimi` route; `-m kimi-code/k3` | OAuth (`managed:kimi-code`, api.kimi.ai) |
| `kimi-k3-256k` | Kimi K3 256k | moonshot | `low` `high` `max` | `high` | `default` | yes | `kimi` route; `-m kimi-k3-256k` | OAuth (default pin set) |
| `kimi-code/k3-256k` | Kimi K3 256k | moonshot | `low` `high` `max` | `high` | `default` | yes | `kimi` route; `-m kimi-code/k3-256k` | OAuth (`managed:kimi-code`, api.kimi.ai) |
| `kimi-for-coding` | K2.7 Coding | moonshot | `low` `high` `max` | `high` | `default` | yes | `kimi` route; `-m kimi-for-coding` | OAuth (default pin set) |
| `kimi-code/kimi-for-coding` | K2.7 Coding | moonshot | `low` `high` `max` | `high` | `default` | yes | `kimi` route; `-m kimi-code/kimi-for-coding` | OAuth (`managed:kimi-code`, api.kimi.ai) |
| `kimi-for-coding-highspeed` | K2.7 Coding Highspeed | moonshot | `low` `high` `max` | `high` | `default` | yes | `kimi` route; `-m kimi-for-coding-highspeed` | OAuth (default pin set) |
| `kimi-code/kimi-for-coding-highspeed` | K2.7 Coding Highspeed | moonshot | `low` `high` `max` | `high` | `default` | yes | `kimi` route; `-m kimi-code/kimi-for-coding-highspeed` | OAuth (`managed:kimi-code`, api.kimi.ai) |
| `kimi-k2.6` | Kimi K2.6 | moonshot | `low` `high` `max` | `high` | `default` | yes | `kimi` route; `-m kimi-k2.6` | Pay-as-you-go (`moonshotai/*` API) |
| `moonshotai/kimi-k2.6` | Kimi K2.6 | moonshot | `low` `high` `max` | `high` | `default` | yes | `kimi` route; `-m moonshotai/kimi-k2.6` | Pay-as-you-go (`moonshotai/*` API) |
| `kimi-k2.7-code` | Kimi K2.7 Code | moonshot | `low` `high` `max` | `high` | `default` | yes | `kimi` route; `-m kimi-k2.7-code` | Pay-as-you-go (`moonshotai/*` API) |
| `moonshotai/kimi-k2.7-code` | Kimi K2.7 Code | moonshot | `low` `high` `max` | `high` | `default` | yes | `kimi` route; `-m moonshotai/kimi-k2.7-code` | Pay-as-you-go (`moonshotai/*` API) |
| `kimi-k2.7-code-highspeed` | Kimi K2.7 Code HighSpeed | moonshot | `low` `high` `max` | `high` | `default` | yes | `kimi` route; `-m kimi-k2.7-code-highspeed` | Pay-as-you-go (`moonshotai/*` API) |
| `moonshotai/kimi-k2.7-code-highspeed` | Kimi K2.7 Code HighSpeed | moonshot | `low` `high` `max` | `high` | `default` | yes | `kimi` route; `-m moonshotai/kimi-k2.7-code-highspeed` | Pay-as-you-go (`moonshotai/*` API) |
| `moonshotai/kimi-k3` | Kimi K3 (Moonshot API) | moonshot | `low` `high` `max` | `high` | `default` | yes | `kimi` route; `-m moonshotai/kimi-k3` | Pay-as-you-go (`moonshotai/*` API) |
| `gemma4:26b` | Gemma 4 26B / HVM | local | `low` `medium` `high` `xhigh` `max` `ultra` | `medium` | `default` | yes | `gemma` (aliases `g`, legacy `gemini`) | none (local HVM bridge + `xbreed ask gemma`) |

### Column notes

- **Efforts** are the only legal values; anything else fails closed before dispatch (measured: 9/9 illegal Token Plan efforts rejected in <1 s — lilbench).
- **`fast` tier** exists only on chatgpt stock ids that advertise it (not Daybreak, not `gpt-5.4-mini`). Explicit `--service-tier fast` on any Token Plan / grok / kimi / gemma id **fails closed** by design.
- **Visible = no** rows (`gpt-reserve`, `codex-auto-review`) are internal lanes — cataloged but not user-routable; excluded from the delegation menu below.
- **Moonshot auth split:** OAuth set = `kimi-k3`, `kimi-k3-256k`, `kimi-for-coding`, `kimi-for-coding-highspeed` (+ their `kimi-code/*` spellings, `managed:kimi-code` via api.kimi.ai). Pay-as-you-go set = `kimi-k2.6`, `kimi-k2.7-code`, `kimi-k2.7-code-highspeed`, `moonshotai/kimi-k3`. Default pin is `kimi-k3`; bare `moonshot` is rejected as a route token.

## Lane topology (how xask actually routes)

| Lane | Invocation | Backend | Effort behavior |
|---|---|---|---|
| `codex` / `cdx` (stock) | `xbreed ask codex` | ChatGPT Codex, pins `gpt-5.6-sol` | `-c model_reasoning_effort=<level>` (config key, not a flag) |
| Spark (PATH/sekhmet) | `xask --spark` / `--substrate sekhmet` | Sekhmet L3 `sekhmet run`, default `gpt-5.3-codex-spark`, fallback `gpt-5.6-luna`, caller repo passed as snapshot scope | fixed `low`, explicit default/fast transport |
| Spark (Rust, distinct by design) | `xbreed ask … --spark` | `CODEX_SPARK_MODEL=gpt-5.4-mini` (`src/ask.rs`, pinned by `tests/ask_with_loadout.rs`) | as configured |
| Review | `-R/--review` | `gpt-5.6-sol` | ordinary tier unless fast explicit |
| Review-full (escape hatch) | `-R -F` | `gpt-5.6-sol`, 1.05M ctx | — |
| `--gpt55` (historical name) | `--gpt55` | `gpt-5.6-sol` + `fast_mode` | every role route `-e low`; only the native planner keeps high |
| `grok` | `grok --always-approve --no-subagents --verbatim -p` (no xbreed ask) | Grok Build CLI | template-level |
| `qwen38` | `codex-qwen38 exec` / `codex-token-plan qwen38` | Alibaba Token Plan | `low` `medium` `xhigh` only; must pin effort or it inherits a host `ultra` hang |
| `ds-flash` / `ds-pro` | `codex-ds-* exec` | Alibaba Token Plan | same 3-effort envelope; bare `deepseek` rejected |
| `kimi` | `kimi -m <alias> -p` (native Kimi Code CLI) | Moonshot API | envelope-text only: `low` `high` `max` |
| `gemma` (`g`, legacy `gemini`) | `xbreed ask gemma` | local Gemma 4 26B / HVM | advisory thinking budget 512→65536 tokens by effort |

Precedence on the codex surface: `--model-id` (exclusive) > `--spark` > `--gpt55` > `-R -F` > `-R` > default. Always-on regardless of lane: suppression keys, `approval_policy="never"`, `--sandbox workspace-write`, canonical godspeed directive + one terminal ` | godspeed`.

## Measured evidence (lilbench, plazir27, 2026-08-22/23 — grok-titanium host, 64-wide concurrency)

| Measurement | Value |
|---|---|
| Token Plan PONG, 9 legal cells (3 models × 3 efforts) | **5–8 s** each, mean ~6.1 s, 9/9 exit 0 |
| Illegal-effort rejection | <1 s, fail-closed, 9/9 |
| `ds-pro` xhigh civic consult (allowed to finish) | **140.027 s**, 46 367 tokens |
| `qwen38` xhigh civic consult (after one premature 120 s kill) | **171.023 s**, 29 491 tokens |
| 16-scout wave (`gx-scout-zhurong-*`, one turn) | 5 live xask / 11 cut by a premature ~120 s grok bash wait — **not** Token Plan slowness |
| Working timeout stack | judge bash/tool wait > `XASK_TIMEOUT_SECS=240` > expected consult (~171 s) |

PONG-class speed and xhigh-class depth are different axes; do not read 5–8 s onto civic consults, and do not read the 120 s cuts as model failures.

## xbreed delegation recommendations (role → model)

Grounded in the `/xbgst` gate table, the xask lane map, and the lilbench measurements. The judge itself is **never** an xask target — delegation is for teammates and one-shot consults.

| Work type | Recommended lane | Model + effort | Why |
|---|---|---|---|
| **Judge / orchestrator (L1)** | native, no xask | kimi-k3 `high` on the Kimi substrate (xbgst-kimi roster); fable-`high` on Claude substrates | Orchestrator depth is reserved for the host model; xask is for delegates |
| **Planner (Phase 0)** | native + `wwkd` skill, Layer-0 only, **no xask gate** | same as judge | Gate table: `the-planner` carries no Layer-1 xask call |
| **Scout / labrat / connector** (breadth, parallel) | `xask --spark --gs codex` | `gpt-5.3-codex-spark` fixed `low`, fast-tier transport, sekhmet snapshot scope | Cheap, isolated, snapshot-scoped; the roster's mandated lane for all breadth roles |
| **Executor** (red-before-green implementation) | `xask --spark --gs codex` only — no alternate lane | `gpt-5.3-codex-spark` (PATH/sekhmet delegation); `gpt-5.4-mini` is the Rust-side host pin | Roster locks the executor to Codex Spark; ` | godspeed-impl` suffix adds test-first discipline |
| **Reviewer / the-revenger / sentinel / critic** (correctness weight) | `xask --gpt55 --gs -e low codex` | `gpt-5.6-sol` `low` + fast_mode | Heavier model, capped effort — correctness axis without burning ultra |
| **Mutation tester** | `xask --spark --gs codex` (≤4 targets) / `xask --gpt55 --gs -e low codex` (≥5 targets, varied angles) | spark or sol-`low` by batch size | Gate table's either/or, by target count |
| **Deep single-shot consults** (civic-class, long-horizon reasoning) | `xask --gs -e xhigh ds-pro` (or `qwen38`) | DeepSeek V4 Pro `xhigh` / Qwen 3.8 Max `xhigh` | Measured live at 140 s / 171 s — the deepest cheap lane in the fleet; fix the timeout stack first (bash wait > `XASK_TIMEOUT_SECS=240` > consult) |
| **High-volume probes / PONG-class gates / wide waves** | `xask --gs -e low ds-flash`, `-e medium qwen38` | DeepSeek V4 Flash `low`, Qwen 3.8 Max `medium` | Measured 5–8 s round-trips; 64-wide batchable through named `gx-scout-*` intermediaries |
| **Cross-lab divergence / falsification probe** (one targeted shot at the opposing model, per walk) | `xask --gs grok` | Grok 4.6 `high` (default) | Independent vendor prior; `--verbatim` one-shot, no subagents — structurally outside the codex/kimi lanes it contradicts |
| **Privacy / zero-cost / offline work** | `xask gemma` (alias `g`) | Gemma 4 26B local `medium`–`xhigh` advisory budget | No cloud egress, no per-call cost; the current local lane with the HVM control gate |
| **Kimi-fleet fan-out** (xbgst-kimi L1 substrate) | `xask kimi` / provider mode `--provider moonshot` | dispatched agents on `kimi-for-coding-highspeed` / `kimi-k2.7-code-highspeed`; judge+planner `kimi-k3 high`; `kimi-k3-256k` for long-context handoffs | Highspeed ids exist for swarm width; K3 holds orchestration depth; OAuth-first, paygo `moonshotai/*` only via explicit `--model-id` |
| **1.05M-context escape hatch** | `xask -R -F codex` | `gpt-5.6-sol` full | Only when a review genuinely needs the long window |

### Hard rules the parser enforces (bake into every brief)

1. **Never** `--service-tier fast` on token-plan / grok / kimi / gemma / Daybreak / `gpt-5.4-mini` — fails closed.
2. Token Plan legal efforts are `low` `medium` `xhigh` **only**; `high`/`max`/`ultra` fail before dispatch. Unpinned defaults: `qwen38→xhigh`, `ds-flash→low`, `ds-pro→medium`.
3. Kimi legal efforts are `low` `high` `max` only, envelope-text (no `-c` mapping).
4. Bare `moonshot` and bare `deepseek` are rejected route tokens — always name the profile.
5. Hidden ids (`gpt-reserve`, `codex-auto-review`) are not delegation targets.
6. `--direct` is removed (R2); xask hard-fails at the parser. Effort flags are the only reasoning control.
7. Precedence: `--model-id` > `--spark` > `--gpt55` > `-R -F` > `-R` > default. Don't stack lane flags.
8. Every dispatch carries the canonical godspeed directive + exactly one terminal ` | godspeed`; grok and Token Plan execs run under `env -u CODEX_BIN -u XBRD_SPARK_MODEL` so an ambient `codex-titanium` cannot capture the route.

## Drift catches (found while verifying — logged, not silently patched)

1. **Stale plugin copy in `VeigaPunk/benxshitter`.** Its vendored `xask-protocol.md` still documents the pre-sekhmet surface (spark pins `gpt-5.6-luna`, bare `xask codex` selects spark, gemma/codex-only model surface). `ds4cc-marketplace @0111a993` is the SSoT; treat the benxshitter copy as historical.
2. **Vestigial Claude surface in the current protocol doc.** §5 auth still lists `claude login` and §6 still documents `ccs-`/`cco-` naming, while §1 states claude dispatch was removed in R2-A5. Dead documentation, no live lane.
3. **`--gpt55` names `gpt-5.6-sol`.** Historical alias from the xbrd-exec bench era; cosmetic, but worth knowing before grep-forensics.
4. **xbgst-kimi repo description lags the catalog.** It reads "kimi-2.6-coding highspeed"; the catalog's current highspeed ids are `kimi-for-coding-highspeed` (K2.7 Coding Highspeed) and `kimi-k2.7-code-highspeed`. Recommendation table above uses catalog ids.
5. **`/xbgst` Claude roster is outside catalog scope.** Teammates run sonnet-medium / judge fable-high on the host Claude side; the xask catalog governs only the delegated lanes. No claude provider exists in schema v1.

## Verify it yourself

```bash
# live registry + host availability overlay
xask catalog --json        # or: bash scripts/xask-models catalog
xask models --json

# dry-run any lane before delegating (prints MODEL / LANE / ARGV / constructed prompt)
xask -d --gs -e xhigh ds-pro 'probe'
xask -d --spark --gs codex 'probe'

# effort-legality fast check (expect: legal cells PONG in 5-8 s, illegal fail closed <1 s)
for p in qwen38 ds-flash ds-pro; do
  for e in low medium xhigh high; do
    timeout --foreground 30 xask --gs -e "$e" "$p" 'Reply with exactly PONG.'
  done
done
```

*Artifact generated from pinned blobs listed in Provenance. Availability columns intentionally omitted: they are host-runtime state, not catalog fact.*
