# the-kimester R1 — Reviewer (production blow-up scan)

**Role:** reviewer  
**Scope:** `marketplace/plugins/the-kimester/` (+ builder count + `marketplace.json` entry)  
**Date:** 2026-07-23  
**Posture:** adversarial / surgical — what breaks in production  
**xask:** failed (model `gpt-5.6-sol` 404 / WS 405) — `[xask dry — in-session fallback]`  
**Verdict:** **fail** (1× P0, 3× P1)

---

## MUST compliance (sentinel)

| Requirement | Status | Evidence |
|---|---|---|
| `KIMESTER_CDP_HOST` loopback allowlist + `DANGEROUS` override | **PASS** | `kimester:61-65`; stdout rejects `8.8.8.8` / `evil.com` / `192.0.2.1` without override; override + `--version` → `kimester 0.1.0` |
| no cookie paths | **PASS** | install/README “no cookie export”; `.gitignore` cookie/session globs; `rg cookie` only defensive text |
| fire-and-forget | **PASS** | exits after Enter; no wait/scrape; agent forbids capture |
| `--stdin` preferred | **PARTIAL** | CLI implements `--stdin`; agent protocol still uses `kimester "<prompt>"` argv (same as puppeteer debt) |
| fail closed on CDP down | **PASS** | `ensure_cdp` → `die "CDP down"`; probe `KIMESTER_CDP_PORT=1` prints unavailable + exit 1 |
| host match only kimi.com family | **FAIL** | default tab ERE is open-prefix (matches `kimi.com.evil…`); `KIMESTER_URL` unvalidated; moonshot.cn in default |
| CLI name `kimester` not `kimi` | **PASS** | binary + install symlink `~/.local/bin/kimester`; agent rule names collision |
| marketplace count consistency | **PASS** | `EXPECTED_PLUGINS = 15`; 15 dirs; 15 `kimi.plugin.json`; 15 marketplace entries; `built 15 Kimi plugins` |

---

## xask dry checklist (8 concrete bug checks)

1. Non-loopback CDP host rejected without override; override name is `*_DANGEROUS_*`.
2. Port non-numeric / out of 1–65535 rejected before any network call.
3. CDP `/json/version` failure dies (no silent continue).
4. No cookie/session export path in install, CLI, or docs.
5. Prompt path prefers stdin (CLI + agent); argv path is secondary.
6. Tab/URL host allowlist is **suffix-anchored** to `kimi.com` family only (no open prefix).
7. CLI binary name does not collide with product `kimi`.
8. `EXPECTED_PLUGINS` == count of `*/kimi.plugin.json` == marketplace entry for this plugin.

---

## Findings (max 10)

### P0 — Tab host regex is open-prefix; phishing host wins tab selection

**File:** `marketplace/plugins/the-kimester/kimester:37`, `:112-114`  
**Severity:** P0  
**Blast:** authenticated shared CDP profile → prompt typed into attacker-controlled page that shares the profile

Default:

```bash
KIMESTER_TAB_REGEX="${KIMESTER_TAB_REGEX:-https?://([^/]*\\.)?(kimi\\.com|moonshot\\.cn)}"
```

Used as:

```bash
grep -E "\[t[0-9]+\][[:space:]].*${KIMESTER_TAB_REGEX}"
```

**Evidence (regex unit probe):**

```text
True  https://www.kimi.com/chat
True  https://kimi.com.evil.example/phish   # SPOOF
True  https://www.kimi.com.evil.com/x       # SPOOF
False https://evil-kimi.com/
```

If the automation profile has any tab whose URL begins with `https://kimi.com.<attacker>/…`, `kimester` selects it, runs progressive `textarea` / `contenteditable` selectors, and dumps the user prompt. Sibling `chitchat` hardcodes a tighter pattern (`https?://chatgpt\.com`) but still lacks end-anchor — kimester’s optional subdomain group makes spoof *easier*.

**Fix:** anchor host end, e.g.  
`https?://([^/]+\.)?(kimi\.com|moonshot\.cn)([/:?#]|$)`  
and/or parse host and require exact registrable domain. Drop `moonshot.cn` from default unless product requires it; keep behind explicit env.

---

### P1 — `KIMESTER_URL` not constrained to kimi.com family

**File:** `kimester:35`, `:116-118`  
**Severity:** P1  

On `--new-chat` or no matched tab:

```bash
"${AGENT_BROWSER[@]}" open "$KIMESTER_URL" --wait 4000ms
```

Any env value (or compromised environment) navigates the **authenticated** automation browser, then progressive selectors fire the prompt into the first textbox on that page.

**Fix:** validate `KIMESTER_URL` host against the same allowlist as tab match before `open`; die closed on mismatch. Prefer hardcoding `https://www.kimi.com` for v0 (puppeteer hardcodes chatgpt.com).

---

### P1 — Prompt delivered to agent-browser via argv (`fill`/`type`), not stdin batch

**File:** `kimester:159-161`  
**Severity:** P1  

```bash
"${AGENT_BROWSER[@]}" fill "$FOUND_SEL" "$PROMPT"
"${AGENT_BROWSER[@]}" type "$FOUND_SEL" "$PROMPT"
```

**Contrast (family gold):** `the-puppeteer/chitchat` pipes prompt through `chitchat-batch.mjs` → `agent-browser batch` over stdin — README explicitly cites process-list hygiene.

**Production blow-up:**
- Full prompt visible in `ps` / audit logs on multi-user machines.
- Large prompts hit `ARG_MAX` / exec failures after “CDP ready” — false “broken CDP” debugging.
- Secrets in research prompts leak via process table even though CDP is loopback-only.

**Fix:** batch/stdin path for prompt payload (copy puppeteer pattern); keep CLI `--stdin` as agent-facing default.

---

### P1 — Agent protocol does not prefer `--stdin` (MUST gap)

**File:** `the-kimester.md:16`  
**Severity:** P1  

```text
Call `kimester "<prompt>"` via Bash. Escape embedded double quotes...
```

Agent-invoked path with `$`, backticks, newlines, or nested quotes is shell-injection / silent truncation territory. Skill docs mention `--stdin` for “long or sensitive” input; the **agent** (the production caller) does not.

**Fix:** protocol step 2 →  
`printf '%s' "$prompt" | kimester --stdin`  
(and forbid argv form except trivial smoke tests).

---

### P2 — Progressive first-`textarea` can fire into non-chat UI chrome

**File:** `kimester:125-151`  
**Severity:** P2  

Selectors are declared unverified. First `textarea` / `contenteditable` on kimi.com (search, feedback, cookie UI, side panel) accepts fill+Enter → exit 0 “✓ Prompt fired” while the real chat is empty. `KIMESTER_REQUIRE_LIVE=1` only helps when *no* match exists, not wrong match.

**Fix:** M03 live scout; until then default `KIMESTER_REQUIRE_LIVE=1` or require a scouted selector env var.

---

### P2 — Tab id extraction is line-ambiguous

**File:** `kimester:112-114`  
**Severity:** P2  

```bash
grep -oE 't[0-9]+' | sed -n '1p'
```

First `t[0-9]+` on the matched line may be inside title/URL, not the `[tN]` id. Wrong-tab switch → same false-success class as P2 progressive.

**Fix:** extract only from leading `\[t([0-9]+)\]`.

---

### P2 — `KIMESTER_DANGEROUS_ALLOW_REMOTE_CDP` undocumented in README Env table

**File:** `README.md` Env table  
**Severity:** P2  

Operator cannot discover the override name without reading source; also no loud “never use with auth profile” warning (puppeteer README has it).

---

### P2 — No allowlist / CDP-down regression tests

**Severity:** P2  

Puppeteer has `tests/chitchat.test.sh` for loopback + empty stdin. Kimester has none — host guard can regress silently.

**Evidence this session (manual):**

```text
bash -n kimester: OK
bash -n install: OK
KIMESTER_CDP_HOST=8.8.8.8 … → loopback die
KIMESTER_CDP_PORT=1 … → CDP down die
printf '' | … --stdin → prompt must not be empty
python3 scripts/build-kimi-marketplace.py → built 15 Kimi plugins
```

---

### P2 — Default tab regex includes `moonshot.cn` while comment says “optional”

**File:** `kimester:36-37`  
**Severity:** P2  

Widens host family beyond “kimi.com only” MUST without docs. Risk is modest (same company) but violates stated scope and expands wrong-tab surface.

---

### PASS notes (do not regress)

- Loopback allowlist + dangerous override present and behavioral (P0 sibling gap closed relative to grok/almanack).
- Binary name `kimester` — install comment and agent rule enforce no `kimi` PATH shadow.
- No cookie export path; defensive `.gitignore`.
- Fire-and-forget exit path; CDP fail-closed.
- Marketplace: name `the-kimester`, path `./plugins/the-kimester`, `EXPECTED_PLUGINS=15` green.

---

## Top P0/P1 only (ship blockers)

1. **P0** — Tab host ERE open-prefix spoof (`kimi.com.evil…`) → wrong-tab prompt dump.  
2. **P1** — Unvalidated `KIMESTER_URL` open into auth profile.  
3. **P1** — Prompt in `fill`/`type` argv (ps leak / ARG_MAX).  
4. **P1** — Agent protocol argv instead of `--stdin`.

---

# State

- obs: tab host regex matches `https://kimi.com.evil.example/phish` — `kimester:37,112-114` — severity: **blocker** [certain]
- obs: `KIMESTER_URL` open without host allowlist — `kimester:118` — severity: **high** [certain]
- obs: prompt via agent-browser argv not stdin batch — `kimester:159-161` — severity: **high** [certain]
- obs: agent protocol prefers quoted argv not `--stdin` — `the-kimester.md:16` — severity: **high** [certain]
- obs: loopback CDP allowlist + fail-closed CDP + no cookies + CLI name + count=15 — **pass** [certain]
- risk: progressive first-textarea false success under live DOM drift [moderate]

# Artifact: review

```text
scope: marketplace/plugins/the-kimester/ (+ EXPECTED_PLUGINS, marketplace.json entry)
verdict: fail
```

**Verification performed:** `bash -n` both scripts; host allowlist + empty-stdin + CDP-down live probes; Python regex spoof matrix; `build-kimi-marketplace.py` build (15); marketplace/plugin dir counts.  
**Residual:** no live CDP / agent-browser / kimi.com DOM this turn; xask security lane blocked.  
**Dispatch:** review written to `docs/plans/the-kimester-r1-reviewer.md`.
