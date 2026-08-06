# Changelog — the-almanacker

## 0.2.1 — 2026-08-06

### Added
- Dual-host support: **`notebook.google.com`** (Gemini Notebook) and legacy **`notebooklm.google.com`**
- Studio Audio Overview resilience for 2026 DOM:
  - Mode radios via `value=` **or** aria-label (**Deep Dive / Brief / Critique / Debate**)
  - Length labels **Short / Default / Long** (en-US; was Shorter/Longer)
  - Focus textarea: *What should the AI hosts focus on in this episode?*
  - Generate via primary class **or** button text **Generate**
- Create-notebook fallbacks: `Create new notebook` / `Create notebook` buttons
- Host guidance: musketeer-chrome + fnm multishell + pre-auth

### Fixed
- `focus_notebook_tab` no longer fails when UI rebrands off `notebooklm.google.com`
- `almanack create` against redirected notebook host

### Notes
- Prefer `almanack studio audio deep-dive --length long` for podcast quality
- Empirical DOM capture from live Studio panel (Customize Audio Overview dialog)
