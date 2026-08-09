# Brazil-first hosting (low latency from BR)

Operator sits in **Rio de Janeiro (BR)**. Distant origins (US-only GitHub edge,
random SEA POP) add real friction on every page and API hop.

## What we measured from this host

| URL | Notes |
|-----|--------|
| `ds4cc.com` | GitHub Pages / Varnish — edge region **varies** (`sea` seen; not sticky BR) |
| `veigapunk.github.io` | Sometimes `brazilsouth`, sometimes slow TTFB |
| GitHub API | Fine enough; not the main product surface |

**Goal:** static marketing + speedrun board should hit a **Brazilian or anycast edge** every time.

## Recommended stack (Pareto)

### 1. Cloudflare in front (default choice)

Why: anycast + Brazilian POPs (e.g. GRU), free TLS, cache, no app rewrite.

1. Put DNS for the site on Cloudflare (orange-cloud **proxied**).
2. Origin options:
   - **Cloudflare Pages** (best): no origin lag; assets at the edge.
   - **GitHub Pages** as origin + CF proxy (works; still prefer Pages on CF).
3. Cache rules: cache everything under `/` for static site; bypass only if you add APIs later.
4. Optional: **Regional Services** / Smart Tiered Cache — not required for static.

Deploy this repo:

```bash
# one-time: npm i -g wrangler && wrangler login
cd ~/Projects/token-speedrun
npx wrangler pages project create token-speedrun --production-branch main
npx wrangler pages deploy . --project-name token-speedrun
```

Custom domain (example): `speedrun.ds4cc.com` or `tokens.ds4cc.com` → Cloudflare Pages.

### 2. Origin in São Paulo (when you need a real server)

| Provider | Region |
|----------|--------|
| AWS | `sa-east-1` (São Paulo) |
| GCP | `southamerica-east1` |
| Azure | Brazil South |

Use for APIs, WebSockets, or large binaries — not needed for this static board.

### 3. What not to do for BR users

- Rely only on raw `*.github.io` without a CDN (edge lottery).
- Host primary UX on a single US VPS.
- Ship “infinite cloud tokens” hacks instead of fixing RTT (wrong axis).

## Wire to the plug stack

| Property | Role |
|----------|------|
| [ds4cc.com](https://ds4cc.com/) | Marketplace plug |
| [omegag-site](https://veigapunk.github.io/omegag-site/) | Controller product |
| **token-speedrun** (this) | Burn / anti-pattern leaderboard |

Cross-link all three; put **speedrun** on a CF hostname so BR TTFB stays low.

## Probe script

```bash
bash scripts/br-latency-probe.sh
```

Compares TTFB for candidate hosts from the machine you run it on (ideally BR).
