# The Almanacker

> A CLI bridge that automates NotebookLM from your terminal.

## What it is (and why)

[NotebookLM](https://notebooklm.google.com)'s best features — **Audio Overviews**, **Reports** (Briefing Docs), **Infographics**, and notebook-scoped **chat** — live *only* in a web GUI. There's no public API, and the UI is painfully multi-layered: menus inside dialogs inside panels, every action a fresh click-path. Doing anything in bulk, or from a script, is miserable.

The Almanacker is the escape hatch. It drives that GUI for you, so a whole click-path collapses into one command:

```bash
almanack studio audio deep-dive "A 3-host deep dive on agentic orchestration"
```

**How it works, in one breath:** it attaches to a Chrome window you're already signed into (via the Chrome DevTools Protocol) and clicks through NotebookLM's DOM on your behalf. Your real Google session handles auth — no cookies to export, no API keys, no passwords. It's **fire-and-forget**: the terminal confirms the action fired, and you read the actual result in NotebookLM, where reading belongs.

So you get terminal-speed *operation* (create notebooks, batch-upload sources, fire prompts, kick off generations) while the web UI stays the place you *consume* the output.

**It was built explicitly to:**

1. **Bridge a WSL CLI to the Windows-side Chrome.** `almanack` runs from WSL (Linux) and drives a Chrome (v149+, required for reliable CDP and agentic control) running on the Windows side, over CDP, through [Vercel Labs' `agent-browser`](https://github.com/vercel-labs/agent-browser). One Linux command, one Windows browser, no VM-boundary friction.
2. **Reach web-GUI-only features from the CLI, authenticated by OAuth.** NotebookLM's Studio features have no API. The Almanacker drives them through the browser, reusing the Google **OAuth** session already signed into your Chrome — so there are no API keys, cookie exports, or passwords; your existing login *is* the auth.

> Sibling to [the-puppeteer](https://github.com/VeigaPunk/the-puppeteer) (ChatGPT) and [the-musketeer](https://github.com/VeigaPunk/the-musketeer) (Grok) — all three share the same CDP transport and the same Chrome.

```bash
$ almanack create "chess-orchestration"
✓ Notebook created: https://notebooklm.google.com/notebook/abcd-1234

$ almanack add ~/papers/ufo.pdf https://en.wikipedia.org/wiki/M%C4%93tis
  ✓ ufo.pdf
  ✓ https://en.wikipedia.org/wiki/Mētis
✓ 2 source(s) added.

$ almanack studio audio deep-dive "An elegant 3-host discussion on 'chess speaks for itself' applied to agentic orchestration"
✓ Audio Overview generation started (mode: deep-dive). Read it in NotebookLM when it finishes.
```

---

## Requirements

| Requirement | Notes |
|---|---|
| **[Vercel Labs `agent-browser`](https://github.com/vercel-labs/agent-browser)** | The CDP driver that actually talks to Chrome. **Required.** Installed for you by `install.sh` via `npm install -g agent-browser`. |
| **Node.js + npm** | Only to install `agent-browser` from npm. |
| **Google Chrome / Chrome Dev, v149+** | The browser `agent-browser` attaches to. Launched on the Windows side with remote debugging (see setup). **v149+ is required** — older builds have weaker CDP behavior that degrades the agentic control this relies on. |
| **WSL (or any Linux/macOS shell)** | Where `almanack` runs. The intended setup is WSL driving Windows-side Chrome, but any shell that can reach the CDP port works. |
| **A NotebookLM account** | Signed into Chrome — your Google OAuth session is the auth. |

## Setup

### 1. Install

```bash
git clone https://github.com/VeigaPunk/the-almanacker.git ~/projects/the-almanacker
cd ~/projects/the-almanacker
./install.sh
```

The installer (idempotent — safe to re-run):
- installs `agent-browser` globally via npm (if missing) — the CDP driver
- symlinks `almanack` into `~/.local/bin/`
- symlinks the Claude Code agent into `~/.claude/agents/`

### 2. Point it at a signed-in Chrome

The Almanacker drives a real Chrome window over CDP. You need one running with remote debugging on port `9222`, signed into NotebookLM:

1. **Quit** any running Chrome Dev (including tray/background processes).
2. **Relaunch** with an isolated profile + debug port. On Windows, set a shortcut target to:
   ```
   "C:\Program Files\Google\Chrome Dev\Application\chrome.exe" --user-data-dir=C:\ChromeAutomation --remote-debugging-port=9222 --no-first-run --no-default-browser-check
   ```
   The `--user-data-dir` flag is **mandatory** — Chrome silently disables CDP on the default profile.
3. **Sign in** to `notebooklm.google.com` with the account that owns your notebooks, and open a notebook in a tab.
4. **Verify** the port is reachable: `curl -s http://localhost:9222/json/version`

> Already set up Chrome Dev CDP for the-puppeteer or the-musketeer? You're done — `almanack` reuses the same Chrome and the same `C:\ChromeAutomation` profile. Just make sure you're signed into NotebookLM. If port `9222` isn't reachable, `almanack` will try to auto-launch Chrome Dev for you.

### 3. Two ways to drive it

- **Direct CLI** — `almanack <subcommand>` (see below).
- **Claude Code agent** — invoke the `the-almanacker` agent with a rough intent. It picks the right subcommand, adapts your prompt into each generator's idiom (see [`the-almanacker.md`](the-almanacker.md) for the per-feature style guides), shells out to `almanack`, and returns the confirmation.

---

## Features

Every non-`create` command targets the notebook tab you're **currently looking at** (the active tab). `create` opens a new tab and leaves it active, so you can chain `create` → `add` → `studio …` without switching.

| Command | What it does |
|---|---|
| `almanack create ["<name>"]` | Open a new notebook (optionally titled). Prints its URL. |
| `almanack rename "<name>"` | Rename the focused notebook. |
| `almanack add <file-or-url> …` | Batch-add sources. Local files upload directly; `http(s)://` args are added as Sites. Mix freely. |
| `almanack chat "<prompt>"` | Fire a chat prompt into the focused notebook. Reply lands in the web UI. |
| `almanack studio audio <mode> "<prompt>" [--length …]` | **Audio Overview.** `mode ∈ deep-dive · brief · critique · debate`; `--length short · standard · long`. |
| `almanack studio report <template> "<prompt>"` | **Report.** `template ∈ from-scratch · summary · study-guide · blog`. |
| `almanack studio infographic "<prompt>" [--style …]` | **Infographic.** `style ∈ auto · professional · scientific · editorial · instructive · kawaii · anime · clay · bento · bricks · sketch`. |

> **Fire-and-forget by design.** Studio generations run async (Audio/Report typically 2–10 min). The CLI confirms the *kickoff*, not completion — check the web UI for the finished artifact. Generation is unmetered on Gemini Ultra, so the real constraint is notebook clutter, not cost.

---

## Localization

The Studio panel is matched by its visible UI labels, which NotebookLM localizes. The Almanacker ships with **en-US** strings by default and a built-in **pt-BR** table:

```bash
ALMANACK_LOCALE=pt-BR almanack studio audio deep-dive "…"
```

For any other language, override individual labels without editing the script — point `ALMANACK_LOCALE_FILE` at a file (or drop one at `~/.config/almanack/locale.conf`) that sets the relevant `L_*` variables. It's sourced last, so it wins; any label it doesn't set falls back to the built-in. Read your UI's exact strings from NotebookLM's Studio panel and mirror them:

```bash
# ~/.config/almanack/locale.conf  (example: fr-FR)
L_PANEL_AUDIO="Présentation audio"
L_PANEL_REPORT="Rapports"
L_PANEL_INFOGRAPHIC="Infographie"
L_LEN_SHORT="Plus court"; L_LEN_STANDARD="Par défaut"; L_LEN_LONG="Plus long"
# … see the Localization block at the top of `almanack` for the full key list.
```

> The en-US audio-length and report-template labels are confirmed against Google's docs; the infographic style labels are best-effort — adjust via an override file if your UI differs.

---

## Under the hood

1. **Chrome Dev + CDP** — you launch Windows-side Chrome Dev (v149+, required for reliable CDP/agentic control) with `--user-data-dir=C:\ChromeAutomation --remote-debugging-port=9222`, sign into NotebookLM once via Google OAuth, and leave it running. The isolated user-data-dir is mandatory: Chrome disables remote debugging on the default profile.
2. **Vercel Labs [`agent-browser`](https://github.com/vercel-labs/agent-browser) `--cdp 9222`** — the CDP driver. From WSL it attaches to that Windows-side Chrome, finds the notebook tab you're viewing, and drives it. State-modifying commands prefer the active tab.
3. **`almanack` CLI** — dispatches subcommands to NotebookLM's DOM surfaces. File uploads use a click-interception hook on `HTMLInputElement.prototype.click` to catch the ephemeral file input NotebookLM mounts, then inject bytes via a synthesized `change` event — bypassing the native OS picker entirely.
4. **Claude agent** — [`the-almanacker.md`](the-almanacker.md) (sonnet) reads intent, selects subcommand + mode/template/style, adapts the prompt into each generator's idiom, and fires the CLI.

## Known limits

- **No response retrieval.** By design — chat replies and studio artifacts are consumed in the web UI; the terminal returns only a confirmation.
- **Studio labels are locale-bound.** Generation matches NotebookLM's localized UI labels. en-US and pt-BR ship built-in; other languages need an override file (see [Localization](#localization)).
- **Uploads bypass the native OS picker** via a `HTMLInputElement.prototype.click` hook. If Google switches to the File System Access API, this flow needs revision.
- **Multi-notebook disambiguation.** When several notebook tabs are open, the active tab wins. There's no `--notebook <url>` flag yet — close other notebook tabs if targeting is ambiguous.
- **Fragile to DOM changes.** Selectors are Angular Material / Google-specific. A NotebookLM redesign will require updates.

## Security

Your dedicated Chrome Dev profile at `C:\ChromeAutomation` holds your Google session. Running Chrome with `--remote-debugging-port=9222` exposes CDP to anything that can reach `localhost:9222` on that machine — **don't enable this port on a shared or exposed box.** On WSL the port is reachable from the Linux side of the same machine only, which is fine. If you ever expose it beyond localhost, treat it as granting full control over your browser and every signed-in session in it.

## Files

- [`almanack`](almanack) — the CLI executable.
- [`the-almanacker.md`](the-almanacker.md) — Claude Code agent spec (sonnet; per-generator prompt-adaptation style guides).
- [`install.sh`](install.sh) — idempotent installer.
