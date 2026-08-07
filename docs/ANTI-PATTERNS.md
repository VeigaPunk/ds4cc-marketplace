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
| **Status** | **KILLED** as stack memory / Phase-0 substrate · **DEFERRED** only as optional NL audit sidecar under tight conditions |
| **Class** | Architecture · external memory service · MCP |
| **Date** | 2026-04-18 (reaudit closure); still binding 2026-08 |
| **Why** | **Trendsetter principle:** tools adapt to us — we do not client-patch our stack to host a vendor’s model. **R5 (semantic Phase-0 enrichment) durably killed** on primary-source grounds: no user metadata on `ConclusionCreate` (schema coercion / `icontains` hell), and `/chat` is a **probabilistic tool-loop agent** (non-deterministic recall). Mission namespace / durable authority does not match Honcho’s session semantics without learning-around theater. |
| **Use instead** | **SQLite-authoritative** findings substrate (`xbreed-memory` / local mission DB) + FTS5 if lexical recall gaps appear. Scribe reports for durable prose. |
| **Reopen** | Only per closure triggers (e.g. upstream **user metadata** on conclusions; confirmed recall gaps **after** hook + FTS5 exhaust). Not “new blog post” or MCP marketing. |
| **Evidence** | [`honcho-reaudit-closure-2026-04-18.md`](../marketplace/plugins/xbrd-gdsp-fknpft/docs/reports/honcho-reaudit-closure-2026-04-18.md) |

**Agent line:** Do **not** propose Honcho (or Honcho MCP) as default memory for xbgst / DS4CC / judge Phase 0. If the user asks, cite this anti-pattern and the closure.

---

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
