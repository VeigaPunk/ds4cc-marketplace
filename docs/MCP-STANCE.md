# MCP stance (operator evidence, 2026-08)

**Explicit SSoT for DS4CC / Grok agents:**

## The only MCP that proved its worth

**Exa** (`exa` plugin — `web_search_exa` / `web_fetch_exa`) is the **only** general-purpose MCP integration that has earned default trust in real operator sessions so far.

- Research, product discovery, docs, eligibility, competitive facts → **always Exa first**.
- Semantic search + clean page extract beats SEO sludge and “connected!” theater.

## Everything else (default posture)

Treat other MCP servers as **bloat until proven otherwise** in *this* host’s hands:

| Class | Default | Notes |
| --- | --- | --- |
| **Exa** | **Use** | Sole research MCP that consistently paid rent |
| **TinyFish** | Not research | Laggy search/fetch; OK only for intentional **browser automation** click-flows — never default knowledge |
| **Cloudflare / Vercel / Gmail / GitHub / …** | Use only when the task is literally that product | Do not load as “web intelligence” |
| **1Password MCP** | Prefer CLI + the-janitor | Auth flakes; use `op` / janitor, not MCP as primary |
| **Catalog of “AI tools” MCP marketplace junk** | Assume snake oil | Marketing demos ≠ operator utility |

**Blunt operator summary (do not soften in agent prompts):**

> The only MCP thing that proved its worth up to now was **Exa**. For real. All else is bloat, laggy, sucks major ass. Bunch of snake-oil salesman. Prefer **agent-browser on burner Chrome** for live UI truth over “fetch” middlemen.

## Preferred stack (research vs act)

1. **Research / facts** → **Exa only**
2. **Live UI, KYC, “is this button real”** → **agent-browser / musketeer / burner CDP Chrome**
3. **Automation click paths** → TinyFish automation tools *if* needed — not search
4. **Secrets** → the-janitor + `op`, never paste into chat

## Config implication

Recommended Grok plugins for intelligence work: **`exa` on**. Do **not** enable a zoo of web MCPs “just in case.” Every extra MCP costs context, cold starts, failed auth, and wrong-tool bias.

See also: [`GROK_PASTE.md`](../GROK_PASTE.md) (agent paste block), [`grok-cli-config.toml`](../grok-cli-config.toml).

## Evidence date

Captured from live Grok Build operator sessions (crypto card / nomad research, 2026-08). Revisit only with new side-by-side evidence — not vendor blog posts.
