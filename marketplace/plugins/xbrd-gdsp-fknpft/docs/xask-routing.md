# xask routing — job → argv

Quick reference for **sensible model routing**. Flag surface and transports stay in [`xask-protocol.md`](xask-protocol.md). Hangar **pins** stay in xbgst-stack `docs/model-routing.md` — this page does **not** move them.

**Window:** 2026-07-11 .. 2026-08-25 (catalog freeze 2026-08-25). 234 xask ids collapsed to 43 families. Density never rewrites argv.

`--gs` injects Godspeed and canonicalizes the trailing `| godspeed`. Do not append the suffix by hand.

---

## Pins (do-not-move)

| Lane | Pin | Copy-paste |
|---|---|---|
| Judge | `grok-4.6` | `xask --gs grok '<q>'` |
| Review | `gpt-5.6-sol` `-e low` + fast | `xask --gpt55 --gs -e low cdx '<q>'` |
| E2 revenger | `gpt-5.6-luna` stock Codex | `codex exec -m gpt-5.6-luna '<q>'` — **not xask** |
| L3 spark | `gpt-5.3-codex-spark` | `xask --spark --gs --service-tier fast cdx '<q>'` |
| gx-* FIRST | Cursor Ultra `kimi-k3-max` | `xask --provider cursor --model-id kimi-k3-max --gs -- '<q>'` |

FIRST is a **meter**, not a pin. Never `--spark` on it. Never `claude-*`. Never `auto`. **No images** (Cursor K3 is text-only).

Token Plan named routes (`qwen38` / `ds-pro` / `ds-flash`) are **not** hangar FIRST. Efforts on TP: `low` \| `medium` \| `xhigh` only. Never `--service-tier fast` on TP / grok / kimi / FIRST.

---

## If this job → this argv

| Job | Argv | Why / don't |
|---|---|---|
| Knowledge-work, visual v1, CAD cost/perf | `xask --gs grok '<q>'` | grok-4.6 sole claimant. **Not** SWE-autonomy (DeepSWE / TB v3.0 lose to Sol/Fable). |
| Skills / HITL / fast TTFT | `xask --provider grok --model-id grok-4.5 --gs -- '<q>'` | SkillsBench 4.5 ≫ 4.6. Never `--gs grok` (that is 4.6). |
| Review, ARC-AGI-3, cyber *discovery*, PTC | `xask --gpt55 --gs -e low cdx '<q>'` | Sol pin. Cursor `gpt-5.6-sol-high-fast` is transport, not the pin. Do not MAX because a bake-off used MAX. |
| Stop-when-done CRUD (one correct DB record) | `xask --provider chatgpt --model-id gpt-5.5 --gs -- '<q>'` | 5.6 over-acts (Toloka 711). Not `--gpt55` (that is sol). Not a pin move. |
| Pixel/screenshot CU without SoM | `xask --provider chatgpt --model-id gpt-5.4 --gs -- '<q>'` | Isolator in a crowded screenshot lane. Terminal-state leftover is **5.5**, not 5.4. |
| Concise production implementer | `xask --provider chatgpt --model-id gpt-5.6-terra --gs -- '<q>'` | Not volume (Luna) and not ARC (Sol). |
| Mechanical high-QPS / specified diffs | E2 pin, or `xask --provider chatgpt --model-id gpt-5.6-luna --gs -- '<q>'` | Luna **MRCR cliff** — do not send long-doc here. Luna MAX ≠ E2. |
| Reverse-engineering (E2) | `codex exec -m gpt-5.6-luna '<q>'` | Stock Codex. Not Cursor luna. Not titanium. |
| Watched small-edits (~1k tok/s) | `xask --spark --gs --service-tier fast cdx '<q>'` | Spark pin. Fails `/goal` (128k compaction). Not volume. |
| Expendable fan-out | `xask --gs -e low ds-flash '<q>'` | `deepseek-v4-flash-0731`. Cache-hit workhorse. Never unversioned `deepseek`. |
| Careful SWE / recursive terminal tasks | `xask --gs -e medium ds-pro '<q>'` | `deepseek-v4-pro-0813`. SWE boards do **not** steal sol. |
| OCR / hosted multimodal / civic xhigh | `xask --gs -e xhigh qwen38 '<q>'` | `qwen3.8-max`. Hosted Max ≠ HF text-only checkpoint. |
| Cheap Cursor implementer | `xask --provider cursor --model-id composer-2.5 --gs -- '<q>'` | Included-pool meter-killer. Not unsupervised auth. Not L2-fsd orch. |
| Screenshot / UI-OCR / attached image | `xask --gs grok '<q>'` or Cursor grok / `gemini-3.1-pro` / `gpt-5.6-sol-high-fast` | **Never** FIRST `kimi-k3-max`. Native K3 multimodal is a different meter (OAuth; often parked). |
| Gemini Flash workhorse | `xask --provider cursor --model-id gemini-3.7-flash-high --gs -- '<q>'` | Not Gemini 3.5 Pro (never shipped). Last Pro = `gemini-3.1-pro`. |
| GLM hangar SKU | `xask --provider cursor --model-id glm-5.2-high --gs -- '<q>'` | **5.2**, not market GLM-5.3. No family-proxy. |
| K2.7 coding (not FIRST) | `xask --provider cursor --model-id kimi-k2.7-code --gs -- '<q>'` | COEXIST with K3, not a K3 beat. `kimi-for-coding` is the same checkpoint. |
| Long-ctx 1M volume | `xask --gs qwen38 '<q>'` or `xask --gs ds-pro '<q>'` | Judge-class long docs stay grok-4.6. Never Luna. |

---

## Leftovers vs successors

Do not flatten to “keep the old model.”

| Pred | Kind | Rule |
|---|---|---|
| grok-4.5 | **REGRESSION** | Upgrade to 4.6 **kills** skills / HITL / LHTB. |
| gpt-5.5 | **REGRESSION** | Upgrade to 5.6 **kills** exact terminal-state. |
| gpt-5.4 | **COEXIST** (pixel) | Different job than 5.6. Toloka peak is 5.5. |
| kimi-k2.7-code | **COEXIST** | Different job than K3 frontend / 1M queue. Not FIRST. |

---

## Transport splits (Cursor ≠ second model)

Collapse `*-thinking` / `*-fast` / effort suffixes to the parent **except**:

- **Kimi vision:** native K3 sees pixels; Cursor `kimi-k3-max` is text-only + caption helper.
- **Grok ctx/effort:** API 500k + non-monotone raw-API effort; Cursor 256k; Grok Build is the SWE harness, not a coding crown.
- **Sol review:** Cursor `gpt-5.6-sol-high-fast` is not the review pin.
- **Luna E2:** Cursor luna-high is not `codex exec -m gpt-5.6-luna`.

`gpt-5.6` alias → **sol**. `gpt-5.5-extra` is Cursor **xhigh spelling**, not a checkpoint (SILENCE).

---

## Bans / empty hangar rows

| Don't | Why |
|---|---|
| `claude-*` / `auto` | Hangar-illegal even when market-strong (Fable 5 / Opus 5). Map demand onto sol + grok-4.6 + TP. |
| `xask grok` as gx-* FIRST | grok-consults-grok. FIRST is Cursor Ultra. |
| `--service-tier fast` on TP / grok / kimi / FIRST / Daybreak / `gpt-5.4-mini` | Fails closed. |
| Unversioned `deepseek` | Exact ids `…-0731` / `…-0813` only. |
| GLM-5.3 argv | Not in hangar. SKU is `glm-5.2`. |
| Gemini 3.5 Pro argv | Never shipped. |
| `gpt-reserve` / `codex-auto-review` as coders | Hidden. Unofficial Luna Reserve tank / official Auto-review guardian. Unroutable. |
| `xask --gs gemma` | `gemma4:26b` `available=false`. Park. |
| `xask --gs kimi` while OAuth 403 | Different meter from Ultra FIRST. Do not ping to check reset. |
| Legal/Harvey as a route | Best in-window all-pass still a fail (~16%). Empty niche. |
| Music / TTS / image-gen / video / MT | Out of catalog. Do not invent argv. |
| Arena / LMSYS / AA Index as the reason | Composite ≠ niche. |

---

## Dated meter notes (not pins)

As of **2026-08-25**: Token Plan still surplus (weekly reset ~2026-08-26); native Kimi OAuth last 403 2026-08-23 (Waybar Weekly 0% does **not** track OAuth); local Gemma unavailable. Re-probe before treating those as current.

Optional TP slot on this host: `TOKEN_PLAN_SLOT=gmail`.
