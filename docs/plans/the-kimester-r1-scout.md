# the-kimester R1 — Scout findings

**Mission:** Kimi web UI CDP bridge plugin (DS4CC musketeer family)  
**Role:** scout  
**Date:** 2026-07-23  
**evidence:** none — research axis (live CDP probe **BLOCKED**)

---

## State

- **obs:** Public consumer chat product is **Kimi on kimi.com**, not moonshot.* as chat UI. Moonshot AI (company) links product CTA "Explore Features" → `https://www.kimi.com/`. [certain] — source: https://www.moonshot.ai/ , https://www.kimi.com/en , curl HEAD — axis: URL
- **obs:** `https://kimi.moonshot.cn/` returns **HTTP 302 → `https://www.kimi.com/`** (nginx). Historical CN host collapses into kimi.com. [certain] — source: curl -sI 2026-07-23 — axis: URL
- **obs:** Product surface also publishes EN landing `https://www.kimi.com/en` ("Kimi AI with K3"). Modes mentioned in product blog: Instant / Thinking / Agent / Agent Swarm (product marketing, not DOM). [certain] — source: https://www.kimi.com/en , https://www.kimi.com/blog/kimi-k2-5 — axis: product surface
- **obs:** Company / API / code surfaces are separate: `moonshot.ai` / `moonshot.cn` (company), `platform.kimi.ai` / `platform.kimi.com` / `api.moonshot.cn` / `api.moonshot.ai` / `api.kimi.com/coding/*` (API & Code). [certain] — source: platform + docs crawl — axis: scope boundary
- **obs:** Sibling tab-match conventions (in-repo CLIs):
  - **chitchat:** `grep -E '\[t[0-9]+\][[:space:]].*https?://chatgpt\.com'` → open `https://chatgpt.com`
  - **grok:** prefer active `→ ... https?://grok\.com/c/` else any `/c/` → default open `https://grok.com`
  - **almanack:** prefer active `→ ... notebooklm\.google\.com/notebook/` else any notebook path
  [certain] — source: plugin scripts under `marketplace/plugins/{the-puppeteer,the-musketeer,the-almanacker}/` — axis: tab-match prior art
- **obs:** Prior-art capture pattern (musketeer/grok): type into `[contenteditable="true"]`, submit Enter, wait for `button[aria-label="Copy"]` count > before AND no `button[aria-label*="Stop" i]`, stub `navigator.clipboard.writeText` then click Copy. Clipboard path has known fragility (incident 2026-04-23). [certain] — source: `the-musketeer/grok`, incidents/ — axis: capture prior art
- **obs:** Live CDP probe: `curl -s --fail http://127.0.0.1:9222/json/version` → **fail**. No `agent-browser tab list`. [certain] — probe RESULT: `{cdp: down, tab: n/a, action: none}` — axis: live probe
- **inf:** Kimi web chat likely uses a contenteditable or textarea composer + mode switcher near input; Copy/复制 buttons likely exist for assistant messages (pattern shared by ChatGPT/Grok UIs). [weak] — source: unverified analogy — axis: selectors
- **gap:** Actual authenticated tab URL path shape (`/`, `/chat/...`, `/c/...`, locale prefix `/en/...`) unknown without live tab.
- **gap:** No live DOM selectors; any concrete CSS/ARIA ids below are **UNVERIFIED**.

---

## xask (dispatch)

`xask --spark --gs codex` **failed** (codex auth / local proxy 404 on model `gpt-5.4-mini`; WS 405 then HTTPS fallback 404). Scout continued with web + in-repo data-walk only.

<raw_output>
Error: codex: authentication failed — run `codex login` to sign in with your ChatGPT Plus/Pro/Enterprise subscription
stderr: Reading additional input from stdin...
OpenAI Codex v0.144.6
--------
workdir: /home/arara
model: gpt-5.4-mini
provider: custom
approval: never
sandbox: danger-full-access
reasoning effort: low
reasoning summaries: none
session id: 019f8f75-e92b-7dc1-a632-7bb8924346c2
--------
user
# Dispatch to Codex — Inter-Model Protocol v0.2
# Minimal blocks, inline status tags, ship the artifact
# Adapter posture: ADDITIVE — no CLI injection to dedup, construct developer_instructions from payload

# Goal
What is the public Kimi web chat product URL in 2026 (kimi.com vs moonshot), and what UI elements typically compose a modern AI chat web app (input selectors patterns, model switchers, copy buttons)? Prior art for CDP automation of similar UIs (chatgpt, grok). Return concrete product URLs and selector heuristics only — no code.

# Effort: unset

# State
No prior context.

---
# Response instructions
Use only the sections you need. Available: # Goal, # State, # Unknowns, # Action, # Artifact: <type>

Inline status tags on claims:
- obs: (observed), inf: (inferred), asm: (assumed), risk: (potential failure)
- Confidence: certain | strong | moderate | weak | speculative

Keep it minimal. Ship the artifact. If blocked, name the blocker under # Unknowns. | godspeed
warning: Configured service tier `priority` is not advertised as supported for model `gpt-5.4-mini` and will be omitted from requests.
2026-07-23T14:51:37.383862Z ERROR codex_api::endpoint::responses_websocket: failed to connect to websocket: HTTP error: 405 Method Not Allowed, url: ws://127.0.0.1:15721/v1/responses
ERROR: unexpected status 404 Not Found: CC Switch local proxy failed while handling Codex endpoint /responses. Provider: AIGoCode; model: gpt-5.4-mini; upstream_status: HTTP 404; cause: Model "gpt-5.4-mini" is not supported by any configured account in this group, url: http://127.0.0.1:15721/v1/responses
</raw_output>

---

## Canonical URL recommendation

| Role | URL | Notes |
|------|-----|--------|
| **Default open / golden path** | `https://www.kimi.com/` | Confirmed live 200; moonshot product CTA target; historical `kimi.moonshot.cn` 302s here |
| EN marketing entry | `https://www.kimi.com/en` | Same product family; may or may not be chat shell after auth |
| **Do not use as chat host** | `https://www.moonshot.ai/`, `https://www.moonshot.cn/` | Company/research |
| **Do not use as chat host** | `https://platform.kimi.ai/`, `api.moonshot.*` | API / developer platform |

**Recommendation (D2):** hardcode default navigate to **`https://www.kimi.com/`**; tab-match any `kimi.com` host (www optional). Re-confirm full path after first authenticated live probe (M03).

### One non-obvious claim

**Claim:** Historical CN chat host `kimi.moonshot.cn` is no longer a distinct product surface for automation — it **redirects into kimi.com**, so a dual-host golden path is unnecessary unless a future live session lands on a non-redirecting regional host.  
**evidence:** curl HEAD 302 Location `https://www.kimi.com/` — research axis.

### One rejected alternative

**Rejected:** Targeting `moonshot.ai` or `platform.kimi.*` as the CDP chat tab.  
**Why:** Company / API surfaces; no evidence they host the consumer chat composer used by the musketeer-style bridge.

---

## Tab-match regex draft

Aligned with sibling grep style (`agent-browser tab list` lines like `[tN] Title https://...` or `→ [tN] ...`).

```bash
# Prefer active Kimi tab (any path under kimi.com)
ACTIVE_KIMI='^→[[:space:]]+\[t[0-9]+\][[:space:]].*https?://(www\.)?kimi\.com'

# Else first Kimi tab
ANY_KIMI='\[t[0-9]+\][[:space:]].*https?://(www\.)?kimi\.com'

# Optional: exclude pure marketing subpaths if they pollute tab list (UNVERIFIED — enable only after live list shows noise)
# EXCLUDE_NOISE='kimi\.com/(blog|help|code|docs)(/|$)'
```

**Default open (new chat):** `https://www.kimi.com/`  
**Follow-up path shape:** **unknown** — do not invent `/c/` or `/chat/` until live tab list shows conversation URLs (grok uses `/c/<uuid>`; Kimi may differ).

Env override suggestion (not implemented here): `KIMI_HOST_REGEX` / `KIMI_OPEN_URL` for regional splits if auth ever lands elsewhere.

---

## Candidate selector heuristics

**All labeled UNVERIFIED** — no live DOM probe. Ordered by prior-art strength from sibling CLIs, then generic modern chat patterns.

### Input / composer

| Candidate | Origin | Status |
|-----------|--------|--------|
| `[contenteditable="true"]` | musketeer/grok primary | UNVERIFIED on Kimi |
| `#prompt-textarea` / `textarea` | puppeteer/chitchat | UNVERIFIED on Kimi |
| `textarea.query-box-input` | almanacker/NotebookLM | UNVERIFIED on Kimi (wrong product class — keep only as "textarea with stable class" idea) |
| `[role="textbox"]` | generic a11y | UNVERIFIED |
| `div[contenteditable="true"][data-placeholder], [data-slate-editor]` | common SPA chat libs | UNVERIFIED |

**Probe order (when CDP up, read-only):** count each of the above; report first non-zero + sample attributes. Do not type/submit.

### Model / mode switcher

| Candidate | Origin | Status |
|-----------|--------|--------|
| `button[aria-label="Model select"]` + `[role="menuitem"]` | grok | UNVERIFIED |
| `[data-testid*="model-switcher"]` | chitchat/ChatGPT | UNVERIFIED |
| Visible mode chips: Instant / Thinking / Agent / Swarm (EN) or 瞬时/思考/智能体 (ZH) | product marketing labels | UNVERIFIED as DOM text |

### Submit / streaming

| Candidate | Origin | Status |
|-----------|--------|--------|
| Enter key after focus (no dedicated send click) | grok | UNVERIFIED |
| `button[aria-label*="Stop" i]` or Stop-generating / 停止 | grok + chitchat | UNVERIFIED |
| Send button via `aria-label` Send / 发送 | generic | UNVERIFIED |

### Capture affordances (guess)

Prior art that **worked for Grok when DOM stable** (fragile — see incident):

1. Snapshot `button[aria-label="Copy"]` count before submit.
2. Wait until count increases **and** no Stop button **and** count stable ~800ms.
3. Stub `navigator.clipboard.writeText` then real CDP click on newest Copy.

**Kimi-specific guesses (UNVERIFIED):**

| Affordance | Guess | Risk |
|------------|-------|------|
| EN Copy | `button[aria-label="Copy"]` / `aria-label*="Copy"` | Label may be "Copy message" or icon-only |
| ZH Copy | `aria-label*="复制"` or title 复制 | Locale split — almanack pattern: locale table |
| Clipboard API | same stub as grok | Permissions / Secure Context / app may not use clipboard.writeText |
| Fallback | DOM scrape last assistant message container | Needs stable message list selector first |
| Fallback | Selection + `document.execCommand('copy')` | Often blocked |
| Markdown export | "Copy as markdown" menu items | Present on some UIs; unknown for Kimi |

**Do not port musketeer clipboard capture as the only path** until a live Kimi reply shows a working Copy → clipboard.writeText chain (phase0 kill-move).

### Overlays / cookies

| Candidate | Origin | Status |
|-----------|--------|--------|
| `#onetrust-accept-btn-handler` | grok OneTrust | UNVERIFIED (Cloudflare cookies observed on kimi.com responses; CMP may differ) |
| `button[aria-label="Dismiss"]` | grok | UNVERIFIED |

---

## Sibling data-walk summary

| Plugin CLI | Product URL open | Tab match | Input | Capture |
|------------|------------------|-----------|-------|---------|
| `the-puppeteer/chitchat` | `https://chatgpt.com` | any `chatgpt.com` | `#prompt-textarea` | fire-and-forget (no fetch) |
| `the-musketeer/grok` | `https://grok.com` | prefer active `grok.com/c/` | `[contenteditable="true"]` | Copy count + clipboard stub |
| `the-almanacker/almanack` | notebook paths | prefer active `/notebook/` | `textarea.query-box-input` | fire-and-forget chat |

**Implication for the-kimester:** start as chitchat-shaped (fire-and-forget) until Kimi Copy path is live-proven; optionally grow into musketeer-shaped capture.

---

## Live CDP probe RESULT

```
probe RESULT:
  cdp: down (curl --fail http://127.0.0.1:9222/json/version failed)
  tab: n/a
  action: none (no tab list; no open; no type/submit)
  status: BLOCKED
```

When CDP returns, M03 checklist:

1. `agent-browser --cdp 9222 tab list` — report any kimi titles/URLs.
2. If none: open `https://www.kimi.com/` (manual auth may be required).
3. Read-only eval counts for input candidates above.
4. Snapshot one assistant message chrome for Copy/Stop labels (after a **manual** user-sent message if needed — scout must not submit).
5. Update this file: flip UNVERIFIED → probed with RESULT triple.

---

## Unknowns

| Name | Missing | Affects |
|------|---------|---------|
| Conversation URL path | Whether chats are `/`, `/chat/id`, `/c/id`, locale-prefixed | follow-up tab-match vs any kimi.com |
| DOM composer | Real selector for input | type/fill path |
| Copy path | Whether Copy uses clipboard.writeText | capture architecture (musketeer vs fire-and-forget) |
| Locale surface | EN vs ZH primary UI for the automation profile | aria-label locale tables |
| Auth wall | Login redirect / Cloudflare challenge shape | ready-gate like chitchat title check |
| xask/codex | Local proxy model group | external multi-model research on this host |

---

## Epistemic bound (this pass)

- **AT MOST one non-obvious claim:** historical `kimi.moonshot.cn` is redirect-only into kimi.com (above).
- **AT MOST one rejected alternative:** moonshot/platform hosts as chat targets (above).
- **No product code. No invented "verified" selectors.**
- Aligns with phase0: *Do not hardcode DOM selectors until scout probe on a live authenticated tab.*

---

## Next handoff

| To | Action |
|----|--------|
| dispatcher / planner | Accept D2 = `https://www.kimi.com/`; keep M03 blocked until CDP up |
| labrat / executor | Stub CLI: CDP check + open kimi.com + `TODO: selectors pending scout` |
| scout (re-fire) | When `9222` answers: read-only tab list + input candidate counts only |
