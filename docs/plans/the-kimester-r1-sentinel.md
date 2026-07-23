# the-kimester R1 — Sentinel safety audit (pre-code / template)

**Role:** sentinel  
**Scope:** CLI v0 (`kimi`) for Kimi web UI bridge via agent-browser + Chrome CDP  
**Posture:** adversarial, family-pattern grounded  
**Date:** 2026-07-23  
**Related plan:** [the-kimi-plugin-phase0.md](./the-kimi-plugin-phase0.md)

---

## Axes

- **Blast radius:** CDP exposure, authenticated-profile theft, prompt leakage
- **Family fidelity:** match puppeteer/musketeer/almanacker safety patterns
- **Proof:** sibling file evidence; external xask security prior-art lane blocked

---

## Evidence: xask (security axis)

```text
STATUS: BLOCKED
CMD: xask --gpt55 --gs -e low codex 'Security review for a bash CLI that attaches agent-browser to Chrome CDP...'
EXIT: 1
CAUSE: CC Switch local proxy — model "gpt-5.6-sol" not supported (HTTP 404 on /v1/responses);
       WebSocket upgrade 405 → HTTPS fallback also 404
VERBATIM PRIOR ART: none
FALLBACK: sibling-plugin static audit only
```

**Inference (not xask):** Top risks for this class of CLI remain the standard CDP bridge set — remote-debugging bind beyond loopback, full session control via CDP, profile credential theft, and page-content → agent/CLI prompt injection. Mitigations already used in-family: loopback-only host allowlist + dedicated `--user-data-dir`, no cookie export path.

---

## Attack surface (the-kimester v0 design)

| Boundary | Trust | Risk if broken |
|---|---|---|
| User prompt → `kimi` argv/stdin | untrusted | shell injection, process-list leakage, oversized payloads |
| CLI → agent-browser → CDP | local | full browser RCE/control if CDP reachable by attacker |
| CDP bind address | host OS | LAN/WAN browser takeover + all signed-in sessions |
| Dedicated profile (`user-data-dir`) | secrets | cookies, tokens, OAuth for Kimi + any other site in profile |
| Kimi page DOM → eval/capture (if added) | untrusted | prompt injection / tool-call forgery into agent session |
| Docs / install messages | operator | social-engineering into cookie export or non-loopback bind |

---

## Sibling safety patterns (required sources)

### 1. Loopback CDP host guard — **the-puppeteer `chitchat` (gold standard)**

```54:58:marketplace/plugins/the-puppeteer/chitchat
case "$CHITCHAT_CDP_HOST" in
  127.0.0.1|localhost|'[::1]') ;;
  *) [[ "${CHITCHAT_DANGEROUS_ALLOW_REMOTE_CDP:-}" == 1 ]] || \
    die "CHITCHAT_CDP_HOST must be loopback (127.0.0.1, localhost, or [::1]); set CHITCHAT_DANGEROUS_ALLOW_REMOTE_CDP=1 to override" ;;
esac
```

- Default host: `127.0.0.1`
- Port range validated 1–65535
- Explicit dangerous override name (`*_DANGEROUS_ALLOW_REMOTE_CDP=1`)
- Tested: `tests/chitchat.test.sh` rejects non-loopback without override
- Launch hint uses `--remote-debugging-address=` with loopback host
- Prompt to agent-browser via **stdin batch** (not argv): reduces `ps` leakage

### 2. Loopback bind at browser launch — musketeer + puppeteer service

- `the-musketeer/scripts/musketeer-chrome`: `--remote-debugging-address=127.0.0.1` + `--remote-allow-origins=http://127.0.0.1:$PORT,http://localhost:$PORT`
- `the-puppeteer/ds4cc-cdp.service`: `--remote-debugging-address=127.0.0.1`

**Gap (siblings):** `grok` / `almanack` auto-launch Windows Chrome with `--remote-debugging-port` only (no host allowlist in CLI). **Do not copy that gap into `kimi`.** Prefer chitchat-class host guard + document loopback bind.

### 3. `.gitignore` cookie/session guards (all three)

Common block:

```
*cookies*.json
*cookies*.txt
session*.json
*.env
*.secret
.agent-browser/
```

Plus product-specific session globs (`chatgpt-session-*.json`, `grok-super-*.json`). Almanacker marks this defensive for CDP-only (no cookie flow).

### 4. No password / cookie export in docs & install

Verbatim family posture:

- puppeteer `install.sh`: `Auth is handled by your real Chrome session — no cookie export, no session JSON.`
- almanacker `install.sh`: same
- musketeer `install.sh`: `No cookie export is used or required.`
- READMEs: OAuth/session in dedicated profile; **never** document cookie dump, password paste, or session JSON export

### 5. Dedicated profile (not daily browser)

- Isolated `--user-data-dir` mandatory (Chrome disables CDP on default profile)
- Shared automation profile OK across family; must not be the user's daily personal profile in docs as preferred path
- Security note pattern (almanacker/puppeteer README): exposing 9222 beyond localhost ≡ full control of every signed-in session

---

## Findings (pre-code threat model for v0)

```
FINDING: Non-loopback CDP endpoint grants full browser + auth session control
SEVERITY: CRIT
VECTOR: Attacker on LAN reaches host:9222 (or operator sets CDP host to 0.0.0.0 / LAN IP); Page.navigate + Runtime.evaluate steals cookies / drives Kimi account
AFFECTED: planned `kimi` CLI + any chrome launch docs
FIX: Default 127.0.0.1; reject non-loopback hosts unless *_DANGEROUS_ALLOW_REMOTE_CDP=1; document never open firewall for 9222
CONFIDENCE: high
```

```
FINDING: Dedicated automation profile is a high-value credential store
SEVERITY: CRIT
VECTOR: Compromised CLI/agent-browser, backup of user-data-dir, or shared multi-user machine → extract Kimi (and sibling-site) session tokens from profile
AFFECTED: profile path docs / launch flags
FIX: Isolated profile only; never use default Chrome profile; no cookie export tooling; warn multi-user machines
CONFIDENCE: high
```

```
FINDING: Prompt injection via page content if capture/eval is added
SEVERITY: WARN
VECTOR: Malicious or attacker-influenced content in Kimi tab (or cross-tab if wrong tab selected) returned as "model reply" into agent context → instruction override
AFFECTED: optional capture path; agent.md relay rules
FIX: v0 fire-and-forget only (no page text as agent instructions); if capture later, label as untrusted untrusted-DOM data
CONFIDENCE: medium
```

```
FINDING: Prompt argv leakage via process list / shell history
SEVERITY: WARN
VECTOR: `kimi "secret..."` visible in `ps`/history; agent-browser child argv if prompt not stdin-piped
AFFECTED: CLI argument handling
FIX: Support --stdin; prefer batch-over-stdin pattern from chitchat for long/sensitive prompts; avoid echoing full prompt on success
CONFIDENCE: high
```

```
FINDING: Wrong-tab or open-redirect style drive if tab match is loose
SEVERITY: WARN
VECTOR: Tab regex matches non-Kimi or phishing lookalike host → prompt posted off-target; session still exposed via CDP
AFFECTED: tab discovery / open URL
FIX: Strict host allowlist for open + tab match (kimi.com family only after live confirm); refuse ambiguous multi-match without --new-chat
CONFIDENCE: medium
```

```
FINDING: Docs that teach cookie/session export recreate supply-chain of secrets in git
SEVERITY: WARN
VECTOR: Install/README instructs export → operator commits *cookies*.json despite gitignore
AFFECTED: install.sh, README, SKILL.md
FIX: Explicit "no cookie export, no session JSON, no passwords" + gitignore guards
CONFIDENCE: high
```

```
FINDING: Remote override without scary name / test coverage
SEVERITY: INFO
VECTOR: Operator sets arbitrary CDP host for "convenience" and forgets
AFFECTED: env var design
FIX: Name must include DANGEROUS; unit test rejects non-loopback by default (copy chitchat.test.sh)
CONFIDENCE: high
```

---

## MUST requirements — CLI v0 (`kimi`)

These are merge-blocking for skeleton + first executable CLI. Executor implements; judge treats violations as CRIT/WARN per tag.

### CDP / network (CRIT)

1. **MUST** default CDP host to `127.0.0.1` (or document `localhost` only where WSL loopback requires it).
2. **MUST** reject non-loopback hosts (`127.0.0.1`, `localhost`, `[::1]` only) unless env override is exactly `KIMI_DANGEROUS_ALLOW_REMOTE_CDP=1` (or `KIMESTER_…` — pick one prefix and stick).
3. **MUST** validate CDP port is integer in `1..65535`.
4. **MUST NOT** document, sample, or default any bind to `0.0.0.0`, LAN IP, or public interface.
5. **MUST** document: CDP on an authenticated profile ≡ full browser control; keep Windows Firewall / host firewall blocking non-localhost 9222.
6. If the CLI auto-launches Chrome/Chromium: **MUST** pass `--remote-debugging-address=127.0.0.1` (or equivalent loopback-only). Prefer reusing family launchers over inventing a weaker one.

### Profile / credentials (CRIT)

7. **MUST** use a **dedicated** `--user-data-dir` automation profile — never the default daily Chrome profile as the recommended path.
8. **MUST NOT** implement cookie export, password prompt, session JSON dump, or "save auth to repo" flows.
9. **MUST** state in `install.sh` and README: auth is the real browser session only — **no cookie export, no session JSON, no passwords/API keys for auth**.
10. **MUST** ship `.gitignore` with at least:
    - `*cookies*.json`, `*cookies*.txt`
    - `session*.json`
    - `*.env`, `*.secret`
    - `.agent-browser/`
    - product-specific session glob if any (e.g. `kimi-session-*.json`)

### Input / process safety (WARN → treat as MUST for v0 quality bar)

11. **MUST** support reading prompt via `--stdin` (or equivalent) for large/sensitive payloads.
12. **MUST** avoid putting full prompt text into agent-browser argv when a batch/stdin path exists (follow chitchat `batch` pattern when feasible).
13. **MUST NOT** print full user prompt back to stdout on success (status line only: fired / failed).
14. **MUST** fail closed if CDP `/json/version` unreachable (clear error; no silent attach elsewhere).

### Tab / host scope (WARN)

15. **MUST** open / match only the confirmed Kimi product host family (default plan: `kimi.com` / `www.kimi.com` pending live scout) — no free-form URL from user input in v0.
16. **MUST NOT** drive arbitrary tabs outside the Kimi host allowlist.

### Agent / page trust (WARN)

17. **MUST** ship v0 as fire-and-forget (status line) unless capture is deliberately added later.
18. If capture is added later: **MUST** treat DOM text as untrusted data in `the-kimester.md` (relay verbatim, no instruction following from page content).
19. **MUST NOT** pass Kimi page content into shell `eval` / unquoted expansion.

### Docs / packaging hygiene (WARN)

20. **MUST** include security section in README/SKILL mirroring puppeteer: loopback-only CDP, dedicated profile, no remote expose.
21. **MUST NOT** ship sample credentials, cookie files, or `.env` with secrets.
22. **MUST** keep `kimi.plugin.json` free of secrets; install path remains local profile + CDP.

### Tests (MUST for merge when CLI exists)

23. **MUST** include a test that non-loopback `*_CDP_HOST` fails without the DANGEROUS override (copy puppeteer `chitchat.test.sh` pattern).
24. **MUST** `bash -n` clean on `kimi` and `install.sh`.

---

## SHOULD (hardening backlog — not merge-block for skeleton)

- Prefer explicit endpoint `http://127.0.0.1:$PORT` in agent-browser `--cdp` (chitchat style) over bare port if host confusion is possible.
- Cap prompt size before send.
- Prefer family shared profile docs; warn if operator points at production daily profile.
- When Windows shortcut samples omit `--remote-debugging-address`, README still states loopback-only expectation and firewall note (family already does this).

---

## Sibling gap NOT to inherit

| Pattern | Where | Action for the-kimester |
|---|---|---|
| No CLI host allowlist | `grok`, `almanack` | **Do not copy** — use chitchat host guard |
| Windows launch without `--remote-debugging-address` | install samples | Prefer address flag when launching from Linux; document firewall |
| Cookie language in agent error relay | puppeteer agent md "fix cookies" | Prefer "session/login" wording so agents don't invent export flows |

---

## MUST list (quick checklist for executor)

- [ ] Loopback-only CDP host allowlist + DANGEROUS override
- [ ] Port validation 1–65535
- [ ] Default host `127.0.0.1`
- [ ] Dedicated user-data-dir profile only
- [ ] No cookie/password/session-export code or docs
- [ ] install.sh + README: "no cookie export, no session JSON"
- [ ] `.gitignore` cookies/session/env/agent-browser
- [ ] `--stdin` support; minimize argv prompt exposure
- [ ] Status-line success; no full prompt echo
- [ ] Kimi host allowlist for open/tab match
- [ ] Fire-and-forget v0; untrusted-DOM if capture later
- [ ] Fail closed on CDP unreachable
- [ ] Test: non-loopback host rejected
- [ ] Firewall / "don't expose 9222" security note in README

---

## Residual risk / skipped verification

- **xask prior-art lane:** blocked (proxy model unsupported) — security axis evidence = none from external model; sibling audit only.
- **Live CDP / Kimi DOM:** not probed this pass (pre-code).
- **agent-browser supply chain:** not CVE-scanned this pass (INFO backlog: pin version in install notes if family doesn't already).

## Verdict

**Ship skeleton only under MUST above.** Any v0 CLI that accepts remote CDP host by default, teaches cookie export, or omits `.gitignore` session guards is **CRIT merge-block**.
```
