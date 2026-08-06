# Changelog — the-puppeteer

## 0.2.1 — 2026-08-06

### Added
- Prefer **`musketeer-chrome`** when starting CDP (shared family burner profile)
- Model selection via composer **Pro** pill when legacy `model-switcher-dropdown-button` is absent
- Optional **Chat | Work** surface: `CHITCHAT_SURFACE=Chat|Work`
- `node` resolution via `command -v node` (fnm multishell) for `chitchat-batch.mjs`
- README web UI map: Library, Projects, Scheduled, Plugins, composer-plus, send-button

### Fixed
- Hardcoded `/usr/bin/node` break under fnm-only hosts
- Prompt readiness when `#prompt-textarea` is missing (contenteditable / Chat with ChatGPT fallbacks)

### Notes
- Prompts must use **public URLs or inline markdown** — ChatGPT has no local FS
- Web-gated: Deep Research / image / web search via `composer-plus-btn`; Projects; Scheduled; Plugins
- Host law: fnm multishell + musketeer-chrome + pre-auth on chatgpt.com
