# DS4CC anti-patterns (what not to use)

Curation answers *what ships*. **Anti-patterns answer what we already killed or refuse to adopt**, with evidence, so agents and humans stop re-litigating snake oil every session.

> **Admission** is hard. **Rejection with reasons** is how the catalog stays sharp.

Related:

- Positive gate: [`../CURATION.md`](../CURATION.md)
- MCP research stack: [`MCP-STANCE.md`](MCP-STANCE.md)
- Honcho primary-source closure: [`../marketplace/plugins/xbrd-gdsp-fknpft/docs/reports/honcho-reaudit-closure-2026-04-18.md`](../marketplace/plugins/xbrd-gdsp-fknpft/docs/reports/honcho-reaudit-closure-2026-04-18.md)

---

## How to read this list

| Field | Meaning |
| --- | --- |
| **Status** | `KILLED` (do not adopt) · `DEFERRED` (not now; reopen only on named triggers) · `AVOID-AS-DEFAULT` (allowed only for a narrow job) |
| **Class** | Tool, MCP, agent role, architecture, vendor hype |
| **Why** | Operator / primary-source reason, not vibes |
| **Use instead** | Concrete substitute |
| **Reopen** | What evidence would force a re-audit (if any) |

**Agents:** treat `KILLED` as hard ban unless the user explicitly overrides with new evidence matching **Reopen**. Do not “just try it again.”

---

## Entry template (copy when adding)

```markdown
### <name>

| | |
| --- | --- |
| **Status** | KILLED / DEFERRED / AVOID-AS-DEFAULT |
| **Class** | … |
| **Date** | YYYY-MM-DD |
| **Why** | 1–3 bullets, evidence-linked |
| **Use instead** | … |
| **Reopen** | None / named triggers |
| **Evidence** | path or URL |
```

---

## Catalog

### Honcho (Plastic Labs agent memory / MCP)

| | |
| --- | --- |
| **Status** | **KILLED** as stack memory / Phase-0 substrate · **worst suck measured** · **DEFERRED** only as optional NL audit sidecar under tight conditions |
| **Class** | Architecture · external memory service · MCP |
| **Date** | 2026-04-18 (reaudit closure); still binding 2026-08 |
| **Why** | **Trendsetter principle:** tools adapt to us — we do not client-patch our stack to host a vendor’s model. **R5 (semantic Phase-0 enrichment) durably killed** on primary-source grounds: no user metadata on `ConclusionCreate` (schema coercion / `icontains` hell), and `/chat` is a **probabilistic tool-loop agent** (non-deterministic recall). Mission namespace / durable authority does not match Honcho’s session semantics without learning-around theater. |
| **Use instead** | **SQLite-authoritative** findings substrate (`xbreed-memory` / local mission DB) + FTS5 if lexical recall gaps appear. Scribe reports for durable prose. |
| **Reopen** | Only per closure triggers (e.g. upstream **user metadata** on conclusions; confirmed recall gaps **after** hook + FTS5 exhaust). Not “new blog post” or MCP marketing. |
| **Evidence** | [`honcho-reaudit-closure-2026-04-18.md`](../marketplace/plugins/xbrd-gdsp-fknpft/docs/reports/honcho-reaudit-closure-2026-04-18.md) |

**Agent line:** Do **not** propose Honcho (or Honcho MCP) as default memory for xbgst / DS4CC / judge Phase 0. If the user asks, cite this anti-pattern and the closure.

---


### Hermes agent (Nous Research stack / sticky autonomy slime)

| | |
| --- | --- |
| **Status** | **KILLED** |
| **Class** | Agent product · bloatware · sticky install |
| **Date** | 2026-08 (operator kill) |
| **Why** | Literal bloatware: emoji-drenched control surfaces, resource hog on VPS **and** local (host was not the bug). Felt like malware-grade stickiness — hard to nuke process/unit/user dirs. **Google Workspace API key paths** + “persistent memory” via **duo-queuing** the worst memory feature imaginable. Bundled/adjacent sludge: **gsync**, **rclone** glue as default gravity well. Operator burned **~$200 USD DigitalOcean** trying to make it good after OpenClaw was already a hard no — every salvage attempt failed. **Garbage to the core. Cannot be salvaged.** VPS suck, then local suck: not a host problem. The product is the bug. |
| **Use instead** | sekhmet / Codex Titanium pure sparks; xbgst specialists; local SQLite authority; explicit `op`/janitor secrets — no Workspace-key spaghetti |
| **Reopen** | None unless product becomes a single static binary with zero emoji dashboard, zero forced sync daemons, and a one-command uninstall that actually works |
| **Evidence** | Operator sessions: VPS fail → local retry worse; uninstall friction; memory/sync architecture disgust |

**Agent line:** Do **not** propose Hermes / Nous “autonomy boxes” as default agents. If found running: kill + purge; do not “just disable.”

---

### Playwright (and Puppeteer-as-agent, Selenium grids) as live-UI substrate

| | |
| --- | --- |
| **Status** | **KILLED** as default agent / live-OAuth / web-GUI driver · **AVOID-AS-DEFAULT** even as “just attach to Chrome” · **fine in CI** as a *test runner*, not an agent browser |
| **Class** | Tool · architecture · vendor hype (automation-as-intelligence) |
| **Date** | 2026-08-14 (operator kill; burnerchrome family is the substitute) |
| **Why** | Playwright is a **Node test runner that cosplays a browser**. Headless Chromium trips Turnstile. `storageState.json` is cookie export with extra steps. Guides still hijack the daily profile. Every step dumps 50–100k tokens of DOM so the agent can pretend it “saw” the page. You write a fixture for ChatGPT Pro, another for Imagine, another for NotebookLM Studio — a test suite for products that already have a window. CDP on a **standing burner Chrome** already exists; wrapping it in `chromium.launch()` is paying Node tax to re-lose OAuth. |
| **Use instead** | **`musketeer-chrome`** (isolated `--user-data-dir`, loopback `127.0.0.1:9222`, Canary/CFT 149+) + **`agent-browser --cdp 9222`** (~2k-token a11y snapshots) + family CLIs (`grok-web`, `chitchat`, `kimiraikoner`, `almanack`). Sign in once. Sequential fires. Never daily Chrome. |
| **Reopen** | Only if Playwright grows a first-class standing-profile mode that is not headless, not `storageState`, not a 100k DOM dump, and still cheaper than `agent-browser` on a measured task. “But our CI already uses it” is not a reopen — keep it in CI. |
| **Evidence** | [`burnerchrome/compare.html`](../burnerchrome/compare.html) · [`burnerchrome/README.md`](../burnerchrome/README.md) · [`bloat.html`](../bloat.html) · live family: `ds4cc.com/burnerchrome/` |

**Agent line:** Do **not** propose Playwright / Puppeteer / Selenium as the way to drive grok.com, chatgpt.com, kimi.com, or NotebookLM. Cite this kill. Point at burnerchrome + agent-browser. Playwright stays in the test job.

---

### mise (polyglot “dev runtime” as Node manager)

| | |
| --- | --- |
| **Status** | **KILLED** as Node toolchain · **AVOID-AS-DEFAULT** even as “just PATH glue” |
| **Class** | Tool · architecture · enshittified version manager |
| **Date** | 2026-08-19 |
| **Why** | mise is the most enshittified Node manager in circulation: a kitchen-sink *polyglot runtime OS* cosplaying `nvm`. Shims, env activation, plugin galaxies, “one tool to rule PATH.” It does not switch Node. It **occupies** the shell. Operator result: broken binaries, mystery `node` on PATH, agent/CI jobs that worked until mise “helped.” A version manager that needs a worldview is already the bug. **fnm** does the one job — Fast Node Manager, no runtime religion. **fnm multishell** is the actual feature: per-shell Node, `fnm env --shell bash`, `fnm exec --using …` — isolated, no global shim occupation. |
| **Use instead** | **`fnm`** + **multishell** (`eval "$(fnm env --shell bash)"` / `fnm exec --using <ver>` / `.node-version`). Not nvm theater. Not asdf-with-a-new-coat. |
| **Reopen** | Only if mise ships a *Node-only* mode: no shims, no plugin zoo, uninstall that restores PATH in one command, and a side-by-side where it does not break a clean `fnm` machine. “But it also does Python/Ruby/Terraform” is the *reason* it stays killed. |
| **Evidence** | Operator sessions: PATH/shim breakage vs fnm; this file + [`bloat.html`](../bloat.html) |

**Agent line:** Do **not** propose mise (or asdf-as-default) for Node. Cite this kill. Point at **fnm**. If mise is already on PATH, treat it as contamination until proven inert.

---

### gsync / rclone-as-agent-default

| | |
| --- | --- |
| **Status** | **AVOID-AS-DEFAULT** (with Hermes-class stacks: **KILLED**) |
| **Class** | Sync glue · agent bundling |
| **Date** | 2026-08 |
| **Why** | Fine tools *in isolation* for humans who chose them. As **default agent infrastructure** (Hermes-class): silent complexity, credential sprawl, “memory” that is just dual queues over cloud trash. Not a memory model — a sync accident. |
| **Use instead** | Explicit human-owned sync if needed; mission SQLite; no agent-owned Workspace key farms |
| **Reopen** | Never as automatic agent substrate |

### General-purpose / explore host subagents (Grok Build)

| | |
| --- | --- |
| **Status** | **KILLED** (hard ban) |
| **Class** | Agent role |
| **Date** | Livepatch + config policy (ongoing) |
| **Why** | Dilutes specialist stack; burns context; bypasses xbgst role contracts (`the-planner`, `scout`, `executor`, …). |
| **Use instead** | Named xbgst / myagents specialists; first-party full-tool path uses `agent` only where livepatch allows. |
| **Reopen** | None under xbgst. |
| **Evidence** | Livepatch ban; `grok-cli-config.toml` `[subagents.toggle]`; xbgst skill. |

---

### TinyFish (and similar) as *research* MCP

| | |
| --- | --- |
| **Status** | **AVOID-AS-DEFAULT** for knowledge · automation-only when needed |
| **Class** | MCP · web |
| **Date** | 2026-08 |
| **Why** | Operator sessions: laggy, SEO-ish retrieval, wrong tool bias vs Exa. “Connected” ≠ useful. |
| **Use instead** | **Exa** for research; **burner Chrome agent-browser** for live UI. |
| **Reopen** | Side-by-side win on a real task with latency + precision notes. |
| **Evidence** | [`MCP-STANCE.md`](MCP-STANCE.md) |

---

### MCP zoo (everything enabled “just in case”)

| | |
| --- | --- |
| **Status** | **KILLED** as default posture |
| **Class** | Config · MCP |
| **Date** | 2026-08 |
| **Why** | Context tax, auth flakes, snake-oil sales demos. Only **Exa** has proven rent for general research so far. |
| **Use instead** | Minimal plugin set; product-specific MCPs only when the task is that product. |
| **Reopen** | Documented per-MCP win in operator sessions. |
| **Evidence** | [`MCP-STANCE.md`](MCP-STANCE.md) |

---

### Client-side capability patching to fit a tool

| | |
| --- | --- |
| **Status** | **KILLED** (governance) |
| **Class** | Architecture |
| **Date** | Trendsetter principle (Honcho / Bun closures 2026-04-18) |
| **Why** | If the product lacks the primitive you need, wrapping/filtering/lying at the client to “make it work” is adapting *you* to *them*. That is the red flag Honcho tripped. |
| **Use instead** | Native-capable substrate (SQLite, local files, tools that already match the contract) or wait for upstream. |
| **Reopen** | Explicit user rewrite of the trendsetter principle. |
| **Evidence** | Honcho closure § trendsetter; bun-fit audit same-day precedent. |

---

### Vendor “AI memory / second brain” without Phase-0 authority

| | |
| --- | --- |
| **Status** | **AVOID-AS-DEFAULT** |
| **Class** | Vendor hype |
| **Date** | 2026-04+ |
| **Why** | Same class as Honcho: pretty MCP, probabilistic recall, no mission-scoped hard filters, sells “statefulness solved.” Authority must stay local and queryable. |
| **Use instead** | Local durable store + explicit schemas; optional read-only external audit only after contract fit. |
| **Reopen** | Primary-source audit that passes the same gates Honcho failed. |
| **Evidence** | Honcho role table (R2–R5 failures). |

---


## Genre: memorymancers / copromancers (**copromancy**: real term)

Marketing names vary (memory that reasons, neuromancer cosplay, persistent duo-queues).
Operator name: **copromancers** — read deuces, write shit. Sticky install, cloud key sprawl, fake continuity.
**OpenClaw → Hermes → Honcho-class memory** sit in this bin. Disgust is evidence. Prefer SQLite + sekhmet.

### Literary frame (operator)

- **Copromancy** — real term; “reading feces” as divination.
- **Rubem Fonseca** — BR hard prose energy: look at the dung without soft focus.
- **DFW, *Oblivion* — *The Suffering Channel*** — fecal art + the culture machine that curates it.
- **Nous × Honcho** (metaphor) — that collab: specialist copromancers. Read deuces, write shit.


## Anti-pattern principles (short)

1. **Tools adapt to us** — never reverse.
2. **Rejection needs evidence** — same as admission (file:line, latency, failed task).
3. **Named reopen triggers only** — no eternal “maybe later” without a detector.
4. **Prefer boring local authority** over cloud memory theater.
5. **MCP count is not power** — one good server beats twelve ghost connections.

---

## Maintaining this file

1. New kill → add entry with **Date**, **Why**, **Use instead**, **Evidence**.
2. Link from [`CURATION.md`](../CURATION.md) and [`GROK_PASTE.md`](../GROK_PASTE.md) if agent-facing.
3. Prefer one durable kill over soft “we didn’t like it.”
4. Do not list competitors out of spite — list **failure modes** we refuse to re-pay for.
