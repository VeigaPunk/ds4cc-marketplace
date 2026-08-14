# burnerchrome

**Permanent burner Chrome + agent-browser CDP for the Musketeer family.**

Four adapters share one isolated Chrome for Testing profile on loopback port 9222:

| Bridge | CLI | Target | Behavior |
|--------|-----|--------|----------|
| [the-musketeer](https://github.com/VeigaPunk/the-musketeer) | `grok-web` | grok.com | Blocks until Copy capture |
| [the-puppeteer](https://github.com/VeigaPunk/the-puppeteer) | `chitchat` | chatgpt.com | Fire-and-forget |
| [the-kimiraikkoner](https://github.com/VeigaPunk/the-kimiraikkoner) | `kimiraikkoner` | kimi.com | Fire-and-forget |
| [the-almanacker](https://github.com/VeigaPunk/the-almanacker) | `almanack` | NotebookLM | Fire-and-forget studio/chat |

Typeface is **JetBrainsMonoNL Nerd Font Mono** (no ligatures) for every surface.

## Site

- **GitHub Pages:** https://veigapunk.github.io/burnerchrome/
- **Vercel mirror:** https://burnerchrome.vercel.app (or the team deployment URL)

## Why not Playwright?

Real Chrome (Turnstile passes), live OAuth (no cookie export), never your daily browser, ~2k-token a11y snapshots vs 50–100k DOM dumps, agent-first CLIs for web-GUI-only features (ChatGPT Pro / Deep Research, NotebookLM Studio, SuperGrok).

Marketplace plugins: [VeigaPunk/ds4cc-marketplace](https://github.com/VeigaPunk/ds4cc-marketplace) — plugin ids `the-musketeer`, `the-puppeteer`, `the-almanacker`, `the-kimiraikoner` (note spelling).

## Policy

- CDP on `127.0.0.1` only
- Isolated `--user-data-dir` (Chrome 136+ refuses CDP on the default profile)
- Sequential fires only
