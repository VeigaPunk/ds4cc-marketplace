# Changelog — the-musketeer

## 0.3.1 — 2026-08-06

### Added
- Prefer **`musketeer-chrome`** (Chrome for Testing burner) when CDP is down on Linux
- Composer targeting: `[contenteditable=true][aria-label="Ask Grok anything"]`
- Model menu matching for Grok 4.5 family labels: **Auto / Fast / Expert / Heavy / Build**
- README web UI map: Imagine, Automations, Skills and Connectors, Projects, Private chat, Voice

### Changed
- Default mode remains **Expert** (`GROK_MODE`)
- CDP endpoint defaults to `http://127.0.0.1:$PORT` for agent-browser

### Fixed
- Launch path no longer assumes Windows Chrome Dev only when musketeer-chrome is available

### Notes
- Surfaces gated to web UI (not CLI): Imagine (`/imagine`), Automations, Skills and Connectors
- Host law: fnm multishell + pre-authed musketeer-chrome on 9222
