# Plan — the-kimester (Kimi web UI marketplace plugin)
**Session:** Phase 0 | **Dispatched by:** the-judge | **Date:** 2026-07-23

evidence: none — planning artifact (no live DOM probe; no implementation)

---

## Phase 0 — State map

### Exists
- **Family siblings** under `marketplace/plugins/`:
  - `the-musketeer/` — Grok; CLI `grok`; **response capture** (clipboard stub + Copy button); CDP 9222
  - `the-puppeteer/` — ChatGPT; CLI `chitchat`; **fire-and-forget**; CDP 9222 (+ optional `ds4cc-cdp.service`)
  - `the-almanacker/` — NotebookLM; CLI `almanack`; multi-subcommand; **fire-and-forget**
- **Shared transport pattern:** isolated Chrome profile + loopback CDP + `agent-browser --cdp 9222` + bash CLI that finds/opens target tab and drives DOM
- **Marketplace registration:**
  - Local Codex catalog: `marketplace/marketplace.json` lists siblings under `./plugins/<name>`
  - Kimi packaging: each plugin has `kimi.plugin.json`; root builder `scripts/build-kimi-marketplace.py` discovers `marketplace/plugins/*/kimi.plugin.json`, currently hard-requires **`EXPECTED_PLUGINS = 14`**
  - Kimi catalog output: `.kimi-plugin/marketplace.json` + per-plugin zips under `.kimi-plugin/artifacts/`
- **Root Kimi bootstrap** (marketplace meta, not a Kimi-UI bridge): `kimi.plugin.json`, `.kimi-plugin/`

### Missing
- Entire plugin directory for Kimi web UI bridge (no `the-kimester` / equivalent under `marketplace/plugins/`)
- CLI binary, agent md, skill docs, install.sh, README, manifests, marketplace entries
- Live selector probe of Kimi DOM (blocked until CDP + authenticated tab available)
- Decision on capture vs fire-and-forget and canonical Kimi URL host

### Risk
- **DOM unknown** — no selectors in-repo; fabricating them violates epistemic bound
- **Response capture fragility** — musketeer incident `incidents/2026-04-23-clipboard-capture-failure.md` shows clipboard/Copy capture is a high-churn failure mode even after successful fire
- **Shared CDP profile contention** — family shares 9222; wrong-tab attach is a real bug class (siblings already special-case tab URL match)
- **Kimi packaging gate** — adding a plugin without bumping `EXPECTED_PLUGINS` and regenerating zips will fail `build-kimi-marketplace.py`
- **Kimi CLI manifest constraint** — `kimi.plugin.json` must **not** declare `agents` (builder rejects it for Kimi CLI 0.28.1); Claude agent file is install-time only via `install.sh`

---

## Data-walk findings (concrete template anchors)

### 1. `plugin.json` shape (Codex / local)
Siblings: small root manifest — `name`, `version`, `description`, `author`, `repository`, `homepage`, `skills`.

| Sibling | Path | Notes |
|---|---|---|
| musketeer | `marketplace/plugins/the-musketeer/plugin.json` | also `"agents": "./agents/"` (Grok-family agent pack; **not** in kimi.plugin.json) |
| puppeteer | `marketplace/plugins/the-puppeteer/plugin.json` | skills only |
| almanacker | `marketplace/plugins/the-almanacker/plugin.json` | skills only |

### 2. `kimi.plugin.json` shape (Kimi marketplace package)
Pattern (all three siblings):

```json
{
  "name": "<plugin-dir-name>",
  "version": "<semver>",
  "description": "Drive <Product>-only web UI features through agent-browser and an authenticated CDP profile.",
  "author": { "name": "VeigaPunk" },
  "homepage": "https://github.com/VeigaPunk/<plugin>",
  "skills": "./skills/",
  "interface": {
    "displayName": "The <Name> (VeigaPunk)",
    "shortDescription": "...",
    "longDescription": "...",
    "developerName": "VeigaPunk",
    "websiteURL": "https://github.com/VeigaPunk/<plugin>"
  }
}
```

- Dir name **must** equal `name` (`build-kimi-marketplace.py` `load_plugin`).
- **No `agents` field** in Kimi manifest (explicit fail at L162–163 of builder).
- Supported fields only: `name version description author homepage repository license keywords skills commands interface`.

### 3. `.codex-plugin/plugin.json`
Richer interface (category, capabilities, defaultPrompt). Copy shape from puppeteer/almanacker for new plugin.

### 4. `install.sh` shape (idempotent)
Common steps across family:
1. `npm install -g agent-browser` + `agent-browser install` if missing
2. Symlink/install CLI → `~/.local/bin/<cli>`
3. Symlink agent md → `~/.claude/agents/<plugin>.md`
4. PATH check for `~/.local/bin`
5. Next-steps: launch CDP Chrome, sign into target site, `curl` version endpoint

Variants:
- **musketeer:** also chrome helper scripts (`scripts/install-automation-chrome`, `musketeer-chrome`)
- **puppeteer:** installs into `~/.local/lib/ds4cc/the-puppeteer/` + optional `ds4cc-cdp.service`
- **almanacker:** minimal (CLI + agent only; reuses shared CDP profile)

**Recommendation for R1:** almanacker-minimal install (reuse shared family CDP); do not invent a fourth chrome launcher.

### 5. CLI transport pattern
| Concern | musketeer (`grok`) | puppeteer (`chitchat`) | almanacker (`almanack`) |
|---|---|---|---|
| CDP | hardcode 9222; optional Windows launch | env-overridable host/port; loopback guard | hardcode 9222; Windows launch helper |
| Tab find | `grok.com` / `grok.com/c/` | `chatgpt.com` | `notebooklm.google.com/notebook/<uuid>` |
| Input | `type '[contenteditable="true"]'` | `#prompt-textarea` + batch helper | `textarea.query-box-input` via fill/type |
| Submit | `press Enter` | batch Enter | product-specific |
| Done signal | poll Copy count + no Stop + clipboard | user-message count / Stop button | immediate `✓ Prompt fired` |
| Mode | **capture** | **fire-and-forget** | **fire-and-forget** (+ multi-cmd) |

Shared primitives every CLI uses:
- `agent-browser --cdp <port|endpoint> tab list|tab new|open <url>|type|fill|press|eval|wait|click`
- Precondition: authenticated session in dedicated profile (no cookie export)
- `.gitignore` guards: `*cookies*.json`, `session*.json`, `.agent-browser/`

### 6. Skill docs shape
`skills/<plugin>-docs/SKILL.md` with YAML frontmatter:

```yaml
---
name: <plugin>-docs
description: Install and run <Product> web UI adapter through agent-browser and an authenticated CDP profile.
---
```

Body: install, one smoke command, CDP verify curl. Keep short (puppeteer/musketeer style).

### 7. Agent `.md` shape
Root `the-<name>.md` with frontmatter `name`, `description`, `model: sonnet`.
- musketeer: thin proxy, return verbatim, long timeout, single-shot, sentinel handling
- puppeteer: dispatcher, fire-and-forget, short timeout (~30s), no scrape
- almanacker: operator with multi-subcommand + prompt adaptation

### 8. Marketplace registration
1. Add entry to `marketplace/marketplace.json` plugins array (same shape as siblings).
2. Add `kimi.plugin.json` under plugin dir (auto-discovered).
3. Bump `EXPECTED_PLUGINS` in `scripts/build-kimi-marketplace.py` (14 → 15) and re-run packaging.
4. Regenerated `.kimi-plugin/marketplace.json` will gain the new id.

### 9. Product URL (public evidence only; not live-probed)
- Moonshot product surface links to **`https://www.kimi.com/`** / **`https://kimi.com`** (company sites + Wikipedia list kimi.com as website).
- Historical/CN API host `kimi.moonshot.cn` / `platform.moonshot.ai` exist; **default golden path should target kimi.com** unless live auth lands elsewhere.
- **Do not hardcode DOM selectors until scout probe on a live authenticated tab.**

---

## WWKD

1. **What:** Ship a musketeer-family DS4CC plugin (`the-kimester`) whose CLI (`kimi`) fires a prompt into an authenticated Kimi web UI tab via `agent-browser` + loopback CDP — success boundary: installable plugin + one golden-path fire confirmed by CLI status line (and optional later capture).

2. **Why:** Siblings cover Grok / ChatGPT / NotebookLM; Kimi web-only capabilities (long-context chat, product-specific modes) are not reachable from CLI without the same CDP bridge. Marketplace already packages the family for Kimi Code consumers — the missing piece is a **Kimi-the-product** bridge plugin.

3. **Assumptions / Risks:**
   - Shared family CDP profile (9222) remains the transport; user already signs into sites there.
   - Kimi chat has a single primary text input + Enter submit (unverified until probe).
   - Fire-and-forget is enough for skeleton value; capture is optional and known-fragile in-family.
   - Risk: host/locale split (kimi.com vs CN host) changes tab-match regex and auth surface.

4. **How (milestone order):**
   - M01 skeleton files (manifests + stubs) → M02 install/CLI wire-up → M03 live DOM scout → M04 overfit golden path → M05 docs/agent polish → M06 marketplace register + package bump.

5. **Escalation points (the-judge):**
   - Response mode: capture (musketeer-like) vs fire-and-forget (puppeteer/almanacker) for v0.1
   - Canonical URL host + tab-match regex
   - Whether v0.1 includes model/mode picker flags
   - Whether long-running agent modes (if any in Kimi UI) force multi-subcommand now or later

---

## Axes (Pareto rounds)

| Axis | Direction | Observable |
|---|---|---|
| **family-fidelity** | ↑ match sibling architecture | Same file set + install steps + CDP/agent-browser primitives; no novel auth/cookie path |
| **Kimi-capability-coverage** | ↑ web-UI-only reach | Golden path works; optional flags only after probe proves surfaces exist |
| **blast-radius / safety** | ↓ | Loopback-only CDP; no cookie export; scoped plugin dir; no unrelated marketplace churn beyond registration + EXPECTED_PLUGINS bump |
| **install-friction** | ↓ | `./install.sh` alone; reuses shared CDP; PATH symlink; no extra chrome binary unless musketeer helpers already present |
| **response-mode** | choose deliberately | Fire: exit `✓ Prompt fired` <~15s. Capture: stdout = model text OR documented sentinel — never hang forever |

**Default Round-1 keep set:** maximize family-fidelity + install-friction↓ + safety; accept fire-and-forget; defer capability flags until probe.

---

## End-to-end skeleton

### Proposed name
- **Plugin dir / package:** `the-kimester` (Kimi + meister; family cadence with musketeer / puppeteer / almanacker)
- **CLI:** `kimi` (matches product brand; mirrors short CLIs `grok` / `chitchat` / `almanack`)
- **Agent file:** `the-kimester.md`
- **Alt considered:** `the-moonraker` (Moonshot thematic) — reject for v0 unless judge prefers brand-pun over product-clear CLI discoverability

### Minimal file tree

```text
marketplace/plugins/the-kimester/
├── plugin.json                 # Codex/local root manifest
├── kimi.plugin.json            # Kimi marketplace manifest (no agents field)
├── .codex-plugin/plugin.json   # Codex marketplace interface
├── install.sh                  # agent-browser + ~/.local/bin/kimi + agent symlink
├── kimi                        # bash CLI (CDP attach → tab → type → Enter → status)
├── the-kimester.md             # Claude agent protocol
├── README.md                   # why / architecture / setup / golden path
├── .gitignore                  # cookies/session/agent-browser guards (copy family)
└── skills/
    └── the-kimester-docs/
        └── SKILL.md
```

Out of scope for skeleton (add only if needed after probe):
- multi-subcommand surface (almanacker-scale)
- chrome launcher scripts (reuse musketeer/puppeteer family)
- response-capture eval block
- `chitchat-batch.mjs`-style helper (only if Kimi input rejects plain `type`)

### Marketplace touchpoints (post-skeleton)

```text
marketplace/marketplace.json          # + the-kimester entry
scripts/build-kimi-marketplace.py     # EXPECTED_PLUGINS 14 → 15
.kimi-plugin/marketplace.json         # regenerated
.kimi-plugin/artifacts/the-kimester-*.zip
```

---

## One concrete overfit case (golden path)

**Case ID:** `kimi-hello-fire`

```bash
# Preconditions (manual, once):
# - Shared CDP Chrome on 127.0.0.1:9222 with dedicated user-data-dir
# - Signed into Kimi at https://www.kimi.com/ (or https://kimi.com)
# - agent-browser + kimi CLI installed via ./install.sh

kimi "hello"
```

**Expected (v0 fire-and-forget):**
1. CLI resolves CDP (`curl`/agent-browser reachability)
2. Finds or opens a Kimi chat tab matching configured host regex
3. Focuses chat input, types `hello`, submits
4. Prints roughly: `✓ Prompt fired. Read the reply in your Kimi browser tab.`
5. Exit 0 within ~15s; **does not** print model completion text

**Structural gate (no live UI required for dry checks):**
- `bash -n marketplace/plugins/the-kimester/kimi`
- `bash -n marketplace/plugins/the-kimester/install.sh`
- `python3 -c "import json; json.load(open('.../kimi.plugin.json'))"`
- `test -x ~/.local/bin/kimi` after install

**Live gate (after scout):**
- `kimi "hello"` → status line + visual confirmation of user turn in Kimi tab

---

## Open decisions (specialist input required)

| # | Decision | Options | Default until judge rules |
|---|---|---|---|
| D1 | **Response mode** | (a) fire-and-forget like puppeteer/almanacker (b) capture like musketeer (c) fire default + `--wait` capture | **(a)** for v0.1 — capture has known in-family failure mode |
| D2 | **Canonical URL** | `https://www.kimi.com` / `https://kimi.com` vs `kimi.moonshot.cn` | **kimi.com** family; confirm with live auth tab URL |
| D3 | **Model / mode picker** | none in v0; env `KIMI_MODE`; flags like chitchat `--model` | **none** until probe finds stable control |
| D4 | **Long-running modes** | ignore; fire-and-forget only; multi-subcommand later | **fire-only v0**; multi-cmd only if scout finds non-chat Studio-like surfaces |
| D5 | **CLI name collision** | `kimi` vs `kimester` vs `kimi-cli` | **`kimi`** if free on PATH; else `kimester` |
| D6 | **Plugin name** | `the-kimester` vs `the-moonraker` | **the-kimester** |

**Epistemic limits for this plan:**
- Non-obvious claim (1): Kimi packaging forbids `agents` in `kimi.plugin.json` even though musketeer's Codex `plugin.json` may list agents — builder enforces at discover time.
- Rejected alternative (1): cloning musketeer capture-first for v0 — rejected because clipboard/Copy capture is already a documented high-severity failure class without proven Kimi Copy affordance.

**Explicit non-claims:** No DOM selectors, no model names, no latency SLOs beyond rough fire budget.

---

## Milestones

| # | Title | Gate command | Expected output | Executor |
|---|---|---|---|---|
| M01 | Scaffold plugin tree + manifests | `test -f marketplace/plugins/the-kimester/{plugin.json,kimi.plugin.json,install.sh,kimi,the-kimester.md,README.md,skills/the-kimester-docs/SKILL.md,.codex-plugin/plugin.json,.gitignore}` | all exist; JSON parse OK; name=`the-kimester` | executor (scaffold) |
| M02 | install.sh wires CLI + agent | `bash marketplace/plugins/the-kimester/install.sh && command -v kimi && test -L ~/.claude/agents/the-kimester.md` | agent-browser present; kimi on PATH; agent symlink | executor |
| M03 | Live DOM scout (read-only) | With CDP up: `agent-browser --cdp 9222 tab list` + open kimi.com + snapshot input candidates (no selectors invented offline) | short report: host URL, candidate selectors, capture affordances | scout |
| M04 | Overfit `kimi "hello"` fire path | `kimi "hello"` | `✓ Prompt fired...`; exit 0; user turn visible in tab | executor (CLI) |
| M05 | Agent md + skill docs + README aligned to D1–D4 | `rg -n 'fire-and-forget|kimi\.com|agent-browser' marketplace/plugins/the-kimester/` | docs match chosen response mode + URL; no fabricated selectors | executor (docs) |
| M06 | Marketplace register + Kimi package count | Edit `marketplace/marketplace.json`; bump `EXPECTED_PLUGINS` 14→15; `python3 scripts/build-kimi-marketplace.py` (or project’s documented validate path) | builder succeeds with 15 plugins; catalog lists `the-kimester` | executor |
| M07 | Critic pass on axes | Review M01–M06 vs axes table | keep/kill list; no silent cookie auth; loopback only | critic |

### Milestone detail notes for cold executors

**M01 — do not implement real selectors.** CLI may stub with: check CDP, open `https://www.kimi.com`, print `TODO: selectors pending scout` and non-zero if `KIMI_REQUIRE_LIVE=1`, else structural-only. Prefer landing M03 before completing M04.

**M03 scout protocol (no side-effect writes beyond open):**
1. `curl -s --fail http://127.0.0.1:9222/json/version`
2. `agent-browser --cdp 9222 tab list`
3. Open or focus Kimi tab; record final `location.href`
4. Enumerate likely inputs: `textarea`, `[contenteditable=true]`, `role=textbox` — **report only**
5. Note any Copy / Stop / model-switch controls for D1/D3

**M04 success criterion is fire confirmation, not answer quality.**

---

## Dependencies

```text
M01 → M02 → M04
M01 → M03 → M04   (M03 unblocks real selectors in M04)
M04 → M05
M01 → M06         (M06 can parallel after M01 manifests stable; re-run after version pin)
M05 + M06 → M07
```

Judge gates before M04 commit: **D1** (response mode) and **D2** (URL). If judge silent one cycle: proceed with defaults D1=a, D2=kimi.com under marker `[planner-gate: advisory, risks-open]`.

---

## Round-1 specialist roster (axis → role)

| Axis / work | Role | Brief |
|---|---|---|
| family-fidelity (scaffold, install, manifests) | **executor** | Copy almanacker-minimal skeleton; rename; no novel architecture |
| Kimi DOM / URL / controls | **scout** | Live CDP probe; selector candidates only; no product code |
| response-mode + capture risk | **critic** | Compare musketeer incident vs fire-and-forget ROI for v0 |
| blast-radius / safety (CDP loopback, no cookies) | **sentinel** or **critic** | Diff install.sh + CLI for remote CDP / cookie files |
| install-friction | **executor** | Single `./install.sh`; verify PATH + agent symlink |
| marketplace package correctness | **executor** + **labrat** | EXPECTED_PLUGINS bump + build script green |
| golden-path overfit | **labrat** | Run `kimi "hello"` live; report gate pass/fail |
| orchestration / D1–D4 arbitration | **the-judge** | Resolve open decisions; authorize Round-2 capacity |

---

## Round-1 keep / kill criteria

**Keep a move if** it improves any axis and harms none (godspeed): e.g. better loopback guard (safety↑, fidelity↑), clearer install messages (friction↓).

**Kill a move if** it: invents unprobed selectors; adds cookie/session JSON auth; opens non-loopback CDP; expands multi-subcommand before chat fire works; ports musketeer clipboard capture without a proven Kimi Copy path.

---

## Status

- **Phase 0 plan:** complete (advisory)
- **Implementation:** not started (scope-correct)
- **Next dispatch:** scout (M03 preconditions) + executor scaffold (M01) in parallel once judge acks defaults or overrides D1/D2
)
