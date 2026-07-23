# the-kimester R1 — Connector brief (cross-axis)

**Mission:** the-kimester (fourth musketeer-family CDP plugin)  
**Role:** connector | **evidence:** none — cross-axis synthesis  
**Date:** 2026-07-23  
**Axes:** marketplace hard-count, PATH/CLI namespace, shared CDP 9222, docs cardinality (3→4), package/manifest gates

```text
obs: xask BLOCKED [codex spark: model gpt-5.4-mini unsupported via CC Switch proxy 404; WS 405 then HTTPS fallback failed]
```

---

## State

- **inf:** Adding a fourth family sibling is not a local scaffold — it is a **cardinality + shared-resource** change that touches hard gates, PATH, one CDP browser, and every doc that still says “three” or “14”. [strong] — axes: count, PATH, CDP, docs, packaging
- **risk:** Shipping plugin tree without whole-table updates yields green-looking partial installs that fail marketplace CI, shadow product CLIs, or type into the wrong product tab under load.

---

## Top 5 cross-axis risks (ranked)

| Rank | Risk | Failure mode | Mitigation |
|---|---|---|---|
| **1** | **`EXPECTED_PLUGINS` hard count (14→15)** | `scripts/build-kimi-marketplace.py` L16/`L224`: `len(manifests) != EXPECTED_PLUGINS` → package fail; silent drift if someone only edits `marketplace.json` | Atomic M06: add `kimi.plugin.json` **and** bump 14→15 **and** regenerate `.kimi-plugin/`; grepcut “14-plugin” / “14 `the-*`” in README before ship |
| **2** | **PATH `kimi` vs product / bootstrap CLI** | Family CLI name `kimi` collides with Moonshot **Kimi Code** product CLI / user habits; install overwrites `~/.local/bin/kimi`; root repo already has marketplace-meta `kimi.plugin.json` (not a bridge) | Preflight `command -v kimi` + hash; prefer install name `kimester` if occupied (plan D5); README must disambiguate **product bridge CLI** vs **Kimi Code marketplace** vs root bootstrap |
| **3** | **Shared CDP port 9222 — wrong-tab attach** | Siblings already special-case URL match; fourth concurrent client increases focus races (Grok/ChatGPT/NotebookLM/Kimi); host split `kimi.com` vs `kimi.moonshot.cn` mis-match opens wrong or empty tab; SETUP.md documents singleton intentional | Strict host regex + `tab list` filter before type; never “first tab”; loopback-only; no fourth chrome launcher (reuse family profile); document “one Chrome = four tools” in SETUP/README family lists |
| **4** | **Docs cardinality: three siblings → four** | Stale lists undercount (puppeteer SETUP “the-puppeteer, the-musketeer, the-almanacker”; root README plugin table; phase0 “all three siblings”; skill texts saying “shared by three”) → ops install wrong profile steps / miss Kimi auth | Checklist rewrite: README table row + SETUP singleton list + family tables in plan/skills; search `three` / three names without kimester |
| **5** | **Package gates + cookie/session path contagion** | Builder rejects `agents` in `kimi.plugin.json` (family footgun from musketeer Codex manifest); cookie export or new profile path breaks “no novel auth” axis and pollutes shared profile; `.gitignore` omissions leak secrets | Copy almanacker-minimal install; **no** `agents` in Kimi manifest; agent via `install.sh` only; same `.gitignore` cookie/session/agent-browser guards; never write `*cookies*.json` |

---

## Whole-table regression map

| Surface | Today | After the-kimester | Break if skipped |
|---|---|---|---|
| `EXPECTED_PLUGINS` | `14` | `15` | Builder fail / incomplete catalog |
| `marketplace/marketplace.json` | 3 family + others | +`the-kimester` | Codex catalog miss |
| `.kimi-plugin/marketplace.json` + artifacts | 14 zips | +`the-kimester-*.zip` | Kimi TUI install missing |
| Root README “14-plugin” / OpenCode “14 `the-*`” | hard prose | 15 or “N plugins” | Misleading install docs |
| README developer table | musketeer, puppeteer, almanacker | +kimester row | Discoverability miss |
| Family CDP docs (SETUP singleton) | names three tools | names four | Ops assume Kimi needs own Chrome |
| `~/.local/bin/` | `grok`, `chitchat`, `almanack` | +`kimi` or `kimester` | PATH collision / wrong binary |
| Shared profile sessions | Grok + ChatGPT + NotebookLM | +Kimi auth | Tab attach / wrong product fire |
| Root `kimi.plugin.json` | marketplace bootstrap meta | **unchanged role** | Confusion if bridge steals “kimi” brand in docs |

---

## Second-order effects (what breaks three modules away)

1. **Parallel agent fleets:** judge dispatches musketeer + puppeteer + kimester → interleaved `agent-browser --cdp 9222` can steal focus mid-type; exit 0 on fire-and-forget while text lands in wrong tab.
2. **CI / packaging only:** plugin works on developer machine; publish path red until EXPECTED_PLUGINS + zip regen — consumers on GitHub Pages catalog never see plugin.
3. **Naming gravity:** `kimi` CLI + Kimi marketplace packaging of a **Kimi-product** bridge will be misread as “official Moonshot tool”; docs must say DS4CC adapter.
4. **Capture temptation:** porting musketeer clipboard path multiplies incident class `incidents/2026-04-23-clipboard-capture-failure.md` across a fourth product without proven Copy affordance.
5. **Host locale:** default `kimi.com` tab-match fails for CN-auth users still on moonshot hosts → silent open-new-tab loops, empty input, false “fired”.

---

## Dissent

| Role | Likely disagreement | Why connector holds |
|---|---|---|
| **executor** | “Scaffold only; docs/count later” | Hard count is a **gate**, not polish — M01 without M06-ready manifests creates permanent red builder once dir appears |
| **product-minded judge** | Keep CLI name `kimi` for brand | Collides with Kimi Code product CLI class; D5 fallback is cheap insurance |
| **musketeer fans** | Capture-first for parity | Capture is known high-churn **in-family**; fire-and-forget is the low-blast default |
| **scout** | Selectors can be guessed from public DOM dumps | Epistemic bound in phase0: no offline selectors; wrong-tab + wrong-input compounds CDP risk |
| **packaging minimalist** | Don’t touch README “14” prose | OpenCode installer and Apps SDK copy reference 14; cardinality drift is a user-facing bug |

---

## Rationale (strange angle)

The non-obvious signal is **not** Kimi DOM — it is **namespace collision at three layers that all use the word “kimi”:**

1. Moonshot product / possible product CLI  
2. Root marketplace bootstrap (`kimi.plugin.json`, `.kimi-plugin/`)  
3. Proposed family bridge CLI `kimi` + plugin packaged **for** Kimi Code consumers  

Combined with a **hard integer gate** (`EXPECTED_PLUGINS = 14`) and a **singleton CDP bus** already documented as shared by three tools, the fourth sibling’s highest-leverage failures are inventory and identity, not typing into a contenteditable. Fix the table (count, PATH, four-name lists, host regex) before overfit selectors.

---

## Recommended keep-set (godspeed)

- Bump count + regenerate catalog in same change as plugin registration.  
- Install preflight for existing `kimi` on PATH; document disambiguation.  
- Almanacker-minimal install; reuse 9222; strict tab URL match; fire-and-forget v0.  
- Rewrite every “three siblings / 14 plugins” touchpoint in the same PR.  
- No cookies, no `agents` in Kimi manifest, no fourth chrome launcher.

## Kill-set

- Capture-first without scout-proven Copy path.  
- Novel user-data-dir / cookie JSON auth.  
- Non-loopback CDP.  
- Scaffold without EXPECTED_PLUGINS plan.  
- CLI name ship without `command -v` collision check.

---

## Return format (dispatcher)

```markdown
# State
- inf: fourth sibling is a cardinality + shared-CDP + multi-kimi-namespace problem, not a local scaffold [strong] — axes: EXPECTED_PLUGINS, PATH, CDP 9222, docs 3→4, package gates
- risk: partial ship → builder red, PATH shadow, wrong-tab fire, stale “14/three” docs

# Dissent
executor (defer count), brand (keep `kimi` CLI), capture-parity, offline selectors

# Rationale
three layers already say “kimi”; hard count 14 and singleton 9222 make inventory the real regression surface
```

**evidence:** none — cross-axis  
**Verification:** read phase0 plan + `EXPECTED_PLUGINS = 14` in builder + family 9222 docs; xask codex blocked.  
**Residual:** no live PATH probe for existing `kimi`; no live CDP tab list this turn.
