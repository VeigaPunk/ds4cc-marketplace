# burnerchrome

**Permanent burner Chrome + agent-browser CDP for the Musketeer family.**

Four adapters share one isolated Chrome for Testing profile on loopback port 9222:

| Bridge | CLI | Target | Behavior |
|--------|-----|--------|----------|
| [the-musketeer](https://github.com/VeigaPunk/the-musketeer) | `grok-web` | grok.com | Blocks until Copy capture |
| [the-puppeteer](https://github.com/VeigaPunk/the-puppeteer) | `chitchat` | chatgpt.com | Fire-and-forget |
| [the-kimiraikkoner](https://github.com/VeigaPunk/the-kimiraikkoner) | `kimiraikkoner` | kimi.ai | Fire-and-forget |
| [the-almanacker](https://github.com/VeigaPunk/the-almanacker) | `almanack` | NotebookLM | Fire-and-forget studio/chat |

Typeface is **JetBrainsMonoNL Nerd Font Mono** (no ligatures) for every surface.

## Site

- **GitHub Pages:** https://ds4cc.com/burnerchrome/
- **Vercel mirror:** https://burnerchrome.vercel.app (or the team deployment URL)

## Why not Playwright?

Playwright is a **CI test runner**. It is not a standing agent browser. Headless Chromium fails Turnstile. `storageState.json` is cookie export. Daily-profile attach is how you lose the whole session. Each step ships 50–100k tokens of DOM into the model. You do not need a Node fixture farm for SuperGrok / ChatGPT Pro / NotebookLM Studio when **one burner Chrome** already has the OAuth.

**Use instead:** `musketeer-chrome` (isolated `--user-data-dir`, CDP `127.0.0.1:9222`) + **`agent-browser --cdp 9222`** (~2k-token a11y snapshots) + the four family CLIs.

Keep Playwright in the test job. Do not put it on the agent.

Long form: [ds4cc.com/burnerchrome/compare.html](https://ds4cc.com/burnerchrome/compare.html) · kill table: [`docs/ANTI-PATTERNS.md`](../docs/ANTI-PATTERNS.md).

Marketplace plugins: [VeigaPunk/ds4cc-marketplace](https://github.com/VeigaPunk/ds4cc-marketplace) — plugin ids `the-musketeer`, `the-puppeteer`, `the-almanacker`, `the-kimiraikoner` (note spelling).

## Policy

- CDP on `127.0.0.1` only
- Isolated `--user-data-dir` (Chrome 136+ refuses CDP on the default profile)
- Sequential fires only
