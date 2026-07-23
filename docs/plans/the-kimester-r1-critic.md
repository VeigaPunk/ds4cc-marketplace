# Critic R1 — the-kimester (response mode + v0 scope)

**Role:** critic (adversarial design)  
**Mission:** the-kimester  
**Date:** 2026-07-23  
**evidence:** none — adversarial-design axis (reads of plan + sibling docs/incident only; no live DOM)  
**xask:** failed (proxy model 404 / WS 405) — local critique only

---

## Layer 0

`heuer-planning` skill unavailable in this environment — proceeded without ACH toolkit load.

### Cross-model gate

```xml
<raw_output>
exit: 1
Error: codex failed (exit Some(1)): Reading additional input from stdin...
...
ERROR: unexpected status 404 Not Found: CC Switch local proxy failed while handling Codex endpoint /responses.
Provider: AIGoCode; model: gpt-5.6-sol; upstream_status: HTTP 404;
cause: Model "gpt-5.6-sol" is not supported by any configured account in this group
</raw_output>
```

No external design vote. Recommendation below is critic-local, grounded in family incident + sibling known-limits.

---

## Phase 1 — UNDERSTAND (approach map)

| Question | Answer |
|---|---|
| **Problem** | Add a marketplace plugin that drives authenticated Kimi web chat via shared CDP + `agent-browser`, matching the musketeer/puppeteer/almanacker family. |
| **v0 success** | Installable plugin + `kimi "hello"` fires a turn into a Kimi tab; exit 0 with status line; no fabricated selectors offline. |
| **Core fork (D1)** | Fire-and-forget (puppeteer/almanacker) vs response-capture (musketeer clipboard/Copy). |
| **Assumptions** | Shared 9222 profile; single chat input + Enter; fire is enough skeleton value; capture optional and fragile. |
| **Rejected already (plan)** | Capture-first musketeer clone; inventing selectors; fourth chrome launcher; multi-cmd before chat fire. |

### Sibling compare (known limits — README + incident)

| Axis | musketeer (`grok`) | puppeteer (`chitchat`) |
|---|---|---|
| **Mode** | Capture: wait stream → Copy button count → clipboard hook | Fire-and-forget: type → Enter → exit |
| **Done signal** | New Copy + no Stop + stability poll | Status line only |
| **Ceiling** | Default 90s wait; hang risk if selectors drift | ~seconds; never blocks on model |
| **DOM load** | Input + Copy + Stop + overlays + model select | Input + optional model/tool selectors |
| **Documented failure** | **2026-04-23 high:** fire OK, capture dead; agent axis blocked; manual paste workaround | Explicit: "No response retrieval. By design." |
| **Fragility class** | Capture surface churn *and* clipboard API hardening | Fire-path selectors only |

**Inference:** In this family, the expensive failure mode is not "prompt didn't land" — it is "prompt landed, automation still returns garbage/sentinel." Capture multiplies selector surface and couples success to UI chrome that products change without notice.

---

## Phase 2 — CHALLENGE (D1–D6)

### D1 — Response mode: fire-and-forget (v0.1 default)

```
CRITIQUE: Shipping capture-first for an unprobed DOM re-learns the musketeer high-severity failure with zero Kimi Copy/DOM proof.
SEVERITY: RETHINK (if anyone reopens capture-first for v0.1) | CONSIDER (optional --wait later)
CURRENT: D1=(a) fire-and-forget
ALTERNATIVE (strongest reject): musketeer-style wait+Copy+clipboard capture so agents get stdout text
TRADE-OFF: Fire sacrifices closed-loop agent value (no stdout answer). Capture sacrifices reliability under DOM/clipboard churn and lengthens golden-path gate from ~15s fire to wait-ceiling + fragile done-detection.
FAILURE-MODE: Capture breaks when Copy aria drifts, Stop label drifts, clipboard is non-configurable under CDP, or assistant message root is virtualized — fire still succeeds (exactly the 2026-04-23 pattern). Fire breaks only on input/submit/tab-match — smaller surface.
CONFIDENCE: high
```

**Steelman of capture:** For musketeer-class agent teams, fire without fetch forces human relay and "defeats the entire point of fire-and-fetch automation" (incident language). If Kimester's primary consumer is an agent that *must* quote Kimi back, pure fire under-delivers.

**Why fire still wins for v0.1:**
1. **No live selectors** — plan correctly forbids inventing them; capture needs *more* load-bearing selectors than fire.
2. **Family incident is evidence of approach risk**, not a one-off bug: fix path still requires DOM probe + dual path (clipboard + DOM fallback) + doctor — that is a product, not a skeleton.
3. **Two of three siblings already chose fire**; puppeteer docs treat non-capture as intentional product posture.
4. **Reversibility:** fire → optional `--wait` later is cheap (add after M03). Capture-first → strip is costly (agent protocols, timeouts, tests, user expectation).

**Counter-proposal (deferred enhancement, not v0 default):** After M03 proves a stable assistant-message root *or* Copy control, add **opt-in** `kimi --wait` with **DOM-text primary** (not clipboard-first). Clipboard hook is a musketeer-specific optimization that already failed under hardening; do not lead with it on a new product surface.

### D2 — Canonical URL: www.kimi.com / kimi.com family

```
CRITIQUE: Hardcoding a single host without auth-tab confirmation risks wrong-tab attach on CN/locale redirects.
SEVERITY: MONITOR
CURRENT: kimi.com family; confirm on live auth tab
ALTERNATIVE: env `KIMI_HOST_REGEX` with multi-host match from day one (`kimi.com|kimi.moonshot.cn|...`)
TRADE-OFF: Single host is simpler docs/golden path; multi-host raises false-positive tab match risk if regex is loose.
FAILURE-MODE: User signed into moonshot.cn while CLI opens www.kimi.com → empty session / wrong account surface.
CONFIDENCE: medium
```

**Keep D2 default** for golden path. **Kill** baking only one host into tab-match without an env override. Minimum: `KIMI_URL` / tab regex env (family already uses env for CDP port elsewhere).

### D3 — No model/mode flags in v0

```
CRITIQUE: None serious for v0 — flags without stable controls invent API surface that bitrots.
SEVERITY: MONITOR
CURRENT: no model flags until probe
ALTERNATIVE: ship `--model` stubs mirroring chitchat
TRADE-OFF: Flags signal product depth early; unprobed flags become dead CLI surface and false confidence.
FAILURE-MODE: Kimi renames mode chrome → flag silently no-ops or clicks wrong control.
CONFIDENCE: high
```

**Keep D3.**

### D4 — Fire-only (no multi-subcommand / long-run modes)

```
CRITIQUE: Premature multi-cmd (almanacker-scale) before one chat fire works is scope theatre.
SEVERITY: CONSIDER only if scout finds non-chat Studio surfaces users actually need day one
CURRENT: fire-only v0
ALTERNATIVE: multi-subcommand skeleton now
TRADE-OFF: Multi-cmd improves long-term family symmetry with almanacker; harms install-friction and delays M04.
FAILURE-MODE: Empty subcommands rot; users learn a CLI shape that changes after probe.
CONFIDENCE: high
```

**Keep D4.** Kill multi-cmd until chat fire is green.

### D5 — CLI name `kimi` (fallback `kimester`)

```
CRITIQUE: PATH collision with unrelated `kimi` binaries (IDE/CLI from Moonshot ecosystem) is the real risk, not brand purity.
SEVERITY: CONSIDER
CURRENT: `kimi` if free; else `kimester`
ALTERNATIVE: ship as `kimester` always (plugin-clear, zero collision)
TRADE-OFF: `kimi` matches product brand and sibling short names (`grok`); collides and confuses. `kimester` is ugly but unique.
FAILURE-MODE: install.sh overwrites or loses to another `kimi` on PATH → user runs wrong tool.
CONFIDENCE: medium
```

**Keep collision check.** **Kill** silent overwrite. Install must refuse or backup-on-conflict (musketeer pattern for launcher names). Prefer documenting both: primary `kimi`, documented alias `kimester` if needed.

### D6 — Plugin `the-kimester`

```
CRITIQUE: Name is fine; `the-moonraker` loses product discoverability for a pun.
SEVERITY: MONITOR (naming only)
CURRENT: the-kimester
ALTERNATIVE: the-moonraker
TRADE-OFF: Pun theme vs product-clear grep/marketplace id.
FAILURE-MODE: Low — rename cost is manifests + marketplace id only if done pre-publish.
CONFIDENCE: high
```

**Keep D6.**

---

## Keep / Kill moves for v0

### KEEP

| Move | Why |
|---|---|
| **Fire-and-forget default (D1a)** | Smaller DOM surface; aligns puppeteer/almanacker; reversible to `--wait` later. |
| **Success = status line + exit 0 ~15s** | Matches plan golden path; does not lie about capture. |
| **Almanacker-minimal install** | Reuse family CDP; no fourth chrome launcher. |
| **Loopback CDP only; no cookie export** | Family safety axis; blast radius down. |
| **M03 before real selectors / M04** | Epistemic bound; prevents offline selector fiction. |
| **EXPECTED_PLUGINS 14→15 + marketplace entry** | Packaging gate is real; not optional polish. |
| **Agent md = short timeout, fire semantics** | Prevents musketeer-style hang/retry rate burns on a fire CLI. |
| **Env override for host/tab regex** | Cheap hedge for D2 locale split. |
| **install PATH collision check for `kimi`** | Prevents wrong-binary footgun. |

### KILL

| Move | Why |
|---|---|
| **Capture-first / clipboard-first v0.1** | Documented high-severity family failure; no Kimi Copy proof. |
| **Invented selectors pre-scout** | Plan + critic: epistemic violation. |
| **Cookie/session JSON auth path** | Family kill criterion; auth stays in browser profile. |
| **Non-loopback CDP without dangerous override** | Safety. |
| **Multi-subcommand / Studio surface before chat fire** | Scope; delays golden path. |
| **Model/mode flags without probe** | Dead surface. |
| **Fourth dedicated chrome launcher** | Install friction; family already has launchers. |
| **Agent protocol that re-submits on timeout** | Musketeer long-prompt incident class; burns quotas. |
| **`--wait` implied by default in agent** | Would reintroduce hang ceiling without capture reliability. |

### DEFER (not kill forever)

| Enhancement | Gate |
|---|---|
| **`kimi --wait` DOM-text capture** | M03 finds stable assistant root or Copy control; document sentinel on failure; **never hang forever**. |
| **DOM fallback > clipboard** | If capture is added, reverse musketeer order: DOM primary, clipboard optional. |
| **`kimi --doctor`** | After live path works; selector drift canary. |
| **Model/mode flags** | Only after scout names durable controls. |
| **Multi-cmd** | Only if scout finds non-chat surfaces with clear user value. |

---

## Verdict on judge-proposed defaults

| ID | Default | Critic | Notes |
|---|---|---|---|
| D1 | fire-and-forget | **AFFIRM** | Strongest v0 default; capture is deferred enhancement with DOM-primary design. |
| D2 | www.kimi.com | **AFFIRM + harden** | Golden path host OK; require env/tab-regex escape hatch. |
| D3 | no model flags | **AFFIRM** | |
| D4 | fire-only | **AFFIRM** | |
| D5 | CLI `kimi` / fallback `kimester` | **AFFIRM + install guard** | Collision check mandatory. |
| D6 | plugin `the-kimester` | **AFFIRM** | |

**No RETHINK on the judge package as a whole.** RETHINK only if Round-2 tries to make capture the v0.1 default without M03 proof.

---

## Epistemic bound (≤1 non-obvious claim + 1 rejected alternative)

- **Non-obvious claim:** Family CLI value for *new* product surfaces is maximized by shipping a **reliable fire path first**; capture is a second product that multiplies failure modes even when fire works (incident-class, not hypothetical).
- **Rejected alternative:** Musketeer-clone capture-first v0.1 (clipboard + Copy poll) — rejected for unprobed DOM, incident history, and poor reversibility relative to fire-then-`--wait`.

**Explicit non-claims:** No Kimi selectors, no host confirmed by live auth, no latency SLOs beyond rough fire budget, no xask consensus (gate failed).

---

## Axes check (godspeed)

| Axis | Move effect |
|---|---|
| family-fidelity | ↑ almanacker/puppeteer fire pattern |
| install-friction | ↑ minimal install |
| blast-radius / safety | ↑ loopback, no cookies |
| response-mode reliability | ↑ by not promising capture |
| agent closed-loop value | ↓ until deferred `--wait` — accepted for v0 |

**Frontier walk:** Keep all KEEP rows; do not aim at capture until M03 moves that axis without harming reliability.

---

## Status

- **Verdict:** **AFFIRM D1–D6 for v0** with D2 env hedge + D5 collision guard; **KILL capture-first**; **DEFER** DOM-primary `--wait`.
- **Output path:** `/home/arara/Projects/ds4cc-marketplace/docs/plans/the-kimester-r1-critic.md`
- **Next for judge:** Authorize executor M01 scaffold + scout M03 under these defaults; block any capture work until scout report lands.
