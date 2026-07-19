# The Puppeteer

A bridge to ChatGPT's web UI, using your existing OpenAI Plus/Pro subscription. Runs as a CLI (`chitchat "prompt"`) and as a Claude Code agent (`the-puppeteer`).

Sibling project to [the-musketeer](https://github.com/VeigaPunk/the-musketeer) (same idea, for Grok). Both use CDP attach to a dedicated Chromium-family browser profile on Linux, WSL, or Windows.

## Why

The Puppeteer exists for **one specific reason**: to reach capabilities that can't be accessed through Codex CLI.

Primary use case:
- **GPT-5.4-Pro (extended thinking)** — the Pro-tier model with long internal reasoning runs. Only the `chatgpt.com` web surface (authenticated via OAuth on the Pro subscription) serves it; Codex CLI can't target it.

Secondary use case:
- **GPT-5.4 (thinking) + Deep Research** — the agentic browse-and-synthesize loop exposed inside the web UI. Deep Research is a web-app orchestrator on top of the model; Codex CLI does not have an equivalent mode that reproduces it end-to-end.

## What it does

**Fire-and-forget.** Drops a prompt into your logged-in ChatGPT web session and exits. Does not wait for, poll for, or capture the response — GPT-5.4-Pro Extended and Deep Research runs take minutes to hours, so blocking a terminal on them is pointless. You read the answer in `chatgpt.com` later, in your real browser.

```bash
$ chitchat "Write a 40-page research brief on lattice cryptography post-2024"
→ Firing prompt into ChatGPT...
✓ Prompt fired. Read the reply in your ChatGPT Chrome tab.
```

Same shape from a Claude Code session: invoke the `the-puppeteer` agent with a prompt, it shells out to `chitchat`, reports "fired", returns control.

### Model + tool selection (optional flags)

```bash
# Switch model before firing
chitchat --model pro "Research-grade analysis of X"       # GPT-5.4-Pro (extended)
chitchat --model thinking "Complex reasoning on Y"         # GPT-5.4 thinking
chitchat --model instant "Quick everyday question"         # GPT-5.3 instant

# Toggle composer tool (mutually exclusive)
chitchat --image "A minimalist red circle on white"        # Create image mode
chitchat --deep-research "Survey post-quantum crypto 2026" # Deep Research agentic loop
chitchat --web-search "Current Chrome Dev version"         # Web search mode

# Combine
chitchat --model pro --deep-research "multi-paper survey on X"

# Keep prompt text out of process arguments
printf '%s' "Research-grade prompt" | chitchat --stdin --model pro
```

Flag aliases: `--model p|t|i` for pro/thinking/instant. `--deep` shorthand for `--deep-research`, `--web` for `--web-search`. Omitting `--model` leaves the tab's current model untouched.

## Architecture

1. **Dedicated Chromium with loopback CDP** — launch Chromium/Chrome with an isolated `--user-data-dir` and `--remote-debugging-address=127.0.0.1`. On Arch, the `ds4cc-cdp.service` user unit is the preferred workflow. WSL/Windows keeps the Chrome Dev fallback.
2. **agent-browser `--cdp 9222`** — a native CLI that speaks Chrome DevTools Protocol. `chitchat` attaches to your existing Chrome, finds (or opens) a chatgpt.com tab, and drives it.
3. **`chitchat` CLI** — navigates to chatgpt.com, waits out the (rare, since Chrome is real) Cloudflare Turnstile, types the prompt into `#prompt-textarea`, presses Enter, verifies the user-turn count incremented, exits.
4. **Claude agent** — `the-puppeteer.md` is a user-level agent spec. Installed to `~/.claude/agents/`, it becomes callable via the Agent tool from any Claude Code session.

## Install

```bash
git clone git@github.com:VeigaPunk/the-puppeteer.git ~/projects/the-puppeteer
cd ~/projects/the-puppeteer
./install.sh
```

The installer:
- Installs `agent-browser` globally via npm (if missing)
- Installs `chitchat` and `chitchat-batch.mjs` together under `~/.local/lib/ds4cc/the-puppeteer/`, then symlinks the CLI into `~/.local/bin/`
- Symlinks the Claude agent into `~/.claude/agents/`
- On native Linux with systemd and packaged Chromium, renders and enables the hardened `ds4cc-cdp.service`; WSL skips this step

## Launch a dedicated browser with CDP (one-time)

`chitchat` attaches to a dedicated browser profile running CDP on loopback. Never expose this endpoint on a LAN or public interface.

### Arch Linux / native Linux

The installer provisions `ds4cc-cdp.service` with a direct packaged Chromium binary, extensions disabled, an isolated profile, and loopback-only CDP. Verify it with `systemctl --user status ds4cc-cdp.service` and `curl --fail http://127.0.0.1:9222/json/version`. Sign in once through the dedicated visible browser profile.

To remove exactly the installed unit:

```bash
systemctl --user disable --now ds4cc-cdp.service
rm -f ~/.config/systemd/user/ds4cc-cdp.service
systemctl --user daemon-reload
```

`./uninstall.sh` performs those commands and removes the installed CLI/helper and agent link. It deliberately preserves the browser profile under `~/.local/share/ds4cc/chromium-cdp`.

### WSL / Windows

1. Close any running Chrome Dev instance — including tray-resident background processes. Check Task Manager or right-click any Chrome Dev tray icon and Exit. (If the previous instance was launched without CDP flags, new launches inherit its empty flag set.)
2. Relaunch Chrome Dev with the flags below. On Windows, edit a shortcut's target to:
   ```
   "C:\Program Files\Google\Chrome Dev\Application\chrome.exe" "--user-data-dir=C:\ChromeAutomation" --remote-debugging-port=9222 --no-first-run --no-default-browser-check
   ```
3. Sign into `chatgpt.com` with your Plus/Pro account. Pick your default model (e.g. GPT-5.4-Pro extended thinking, or GPT-5.4 thinking + Deep Research) in web-UI settings — `chitchat` never touches the model picker.
4. From WSL, verify the port is reachable:
   ```bash
   curl -s http://localhost:9222/json/version
   ```
   You should see JSON with `"Browser": "Chrome/..."`. If not, check `netstat -ano | findstr :9222` on Windows — if nothing is listening, Chrome refused to enable CDP (usually because `--user-data-dir` was omitted).
5. Once signed in, test with a non-sensitive prompt. `--help` and `--version` never connect or post.

This Chrome Dev install is dedicated to automation — sign into any other web services you want programmatic access to (grok.com for the-musketeer, notebooklm.google.com, etc.) in the same profile.

## Files

- `chitchat` — the CLI executable.
- `the-puppeteer.md` — Claude Code agent spec.
- `install.sh` — idempotent installer.
- `uninstall.sh` — exact user-level removal.
- `ds4cc-cdp.service` — hardened native-Linux user-unit template rendered by the installer.

## Known limits

- **No response retrieval.** By design. You read answers in `chatgpt.com`, not the terminal.
- **Shares a tab with your live browsing.** Each `chitchat` call reuses whatever chatgpt.com tab is open (or opens one if absent). Agent prompts and your manual chats land in the same conversation. For a fresh thread, hit the "New chat" button in the web UI first, or pin a dedicated chatgpt.com tab for agent use.
- **Fragile to DOM changes.** Selectors (`#prompt-textarea`, `[data-message-author-role="user"]`, `[data-testid="model-switcher-dropdown-button"]`, `[data-testid="composer-plus-btn"]`, `[role="menuitemradio"]`) are ChatGPT-UI-specific. If OpenAI ships a redesign, the script may need updating.
- **One Chrome, one port.** CDP on 9222 is a singleton — if you use the port for another tool (e.g. the-musketeer), they share the same Chrome instance (which is the intended setup).
- **Tool modes apply to the next prompt only.** ChatGPT treats Create image / Deep research / Web search as single-fire modes; they don't persist across conversation turns.

## Full setup

See `SETUP.md` for the original WSL2 + Windows bootstrap details. Native Linux follows the service/loopback workflow above.

## Security

The dedicated profile holds your authenticated browser session. CDP grants full browser control: bind it only to loopback, use an isolated profile, and do not share the machine account. `CHITCHAT_CDP_HOST` accepts only `127.0.0.1`, `localhost`, or `[::1]` by default. The explicit `CHITCHAT_DANGEROUS_ALLOW_REMOTE_CDP=1` override is dangerous and should not be used with an authenticated profile. Prompt payloads are sent to `agent-browser batch` over stdin rather than exposed in child-process arguments.
