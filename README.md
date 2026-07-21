# The Musketeer

A bridge to Grok's web UI, using your existing SuperGrok subscription. Runs as a CLI (`grok "prompt"`) and as a Claude Code agent (`the-musketeer`).

## Why

xAI's API costs credits. If you already pay for SuperGrok, you have an unmetered web-UI entitlement. The Musketeer reuses that entitlement programmatically by attaching to your real Chrome Dev via CDP and driving the Grok tab you're already signed into.

## What it does

```bash
$ grok "give me a 3-line haiku about persistent browser cookies"
→ Sending to Grok...
Silent trackers linger,
whispers of past visits stay,
memory that won't fade.
```

Same thing from a Claude Code session: invoke the `the-musketeer` agent with a prompt, it shells out to `grok` and returns the response verbatim.

## Architecture

1. **Chrome Dev with CDP** — you launch your real Windows Chrome Dev with `--remote-debugging-port=9222`, sign into grok.com once, and leave it running. Your normal browsing and SuperGrok session live here.
2. **agent-browser `--cdp 9222`** — a native CLI that speaks Chrome DevTools Protocol. The musketeer script attaches to your existing Chrome, finds (or opens) a grok.com tab, and drives it.
3. **`grok` CLI** — dispatches a prompt: finds/opens the Grok tab, dismisses overlays, types into the contenteditable input, submits with Enter, waits for streaming to finish, then captures the response by hooking `navigator.clipboard.writeText` and clicking Grok's own "Copy" button. That gives us Grok's verbatim formatting (no UI chrome, no metadata).
4. **Claude agent** — `the-musketeer.md` is a user-level agent spec. Installed to `~/.claude/agents/`, it becomes callable via the Agent tool from any Claude Code session.

## Install

```bash
git clone git@github.com:VeigaPunk/the-musketeer.git ~/projects/the-musketeer
cd ~/projects/the-musketeer
./install.sh
```

The installer:
- Installs `agent-browser` globally via npm (if missing)
- Symlinks `grok` into `~/.local/bin/`
- Symlinks the Claude agent into `~/.claude/agents/`

## Launch Chrome Dev with CDP (one-time)

The musketeer attaches to a Chrome Dev instance running with the DevTools Protocol port open.

1. Close any running Chrome Dev instance.
2. Relaunch Chrome Dev with `--remote-debugging-port=9222`. On Windows, either:
   - Edit the shortcut's target to append `--remote-debugging-port=9222`, or
   - Launch from a terminal: `"C:\Program Files\Google\Chrome Dev\Application\chrome.exe" --remote-debugging-port=9222`.
3. Sign into `grok.com` in that Chrome with your SuperGrok account.
4. From WSL, verify the port is reachable:
   ```bash
   curl -s http://localhost:9222/json/version
   ```
   You should see JSON. If not, check that WSL can see the Windows loopback (usually automatic on WSL2); if needed, use `$(ip route | awk '/default/ {print $3}'):9222` as the endpoint.
5. Test: `grok "hello"`.

Auth survives as long as your Chrome profile stays signed in — no token export needed.

## Files

- `grok` — the CLI executable.
- `the-musketeer.md` — Claude Code agent spec.
- `install.sh` — idempotent installer.

## Known limits

- **Shares a tab with your live browsing.** Each `grok` call reuses whatever grok.com tab is open (or opens one if absent). Agent prompts and your manual chats land in the same conversation. If you want isolation, pin a dedicated grok.com tab for agent use.
- **90-second response ceiling by default.** The CLI polls for a new Copy button up to `GROK_WAIT_CEILING_S` (default 90s, raise via env for Expert-mode or long analytical prompts). Streaming completion is detected via a stability check on the Copy-button count — not a fixed sleep.
- **Fragile to DOM changes.** Selectors (`[contenteditable="true"]`, `button[aria-label="Copy"]`, `button[aria-label="Model select"]`, OneTrust banner IDs) are Grok-UI-specific. If xAI ships a redesign, the script may need updating.
- **One Chrome, one port.** CDP on 9222 is a singleton — you can't run two Chrome Devs on the same port. If you use the port for another tool (e.g. the-puppeteer), they share the same Chrome instance (which is usually what you want).
- **Mode selection via `GROK_MODE`.** Set env var to `Auto` / `Fast` / `Expert` / `Heavy` to pick Grok's reasoning mode. Expert ("Thinks hard") and Heavy ("Team of Experts") can push wall time past the default ceiling — raise `GROK_WAIT_CEILING_S` accordingly.

## TODO — long-prompt ingestion (open design question)

Grok's web UI accepts prompts as typed input or as attached files. The current CLI types the prompt character-by-character into the contenteditable. This has two failure modes we've seen in practice:

1. **Very long prompts (several thousand characters) can race the UI or the rate limiter.** Observed 2026-04-17: a ~4KB orchestration-architecture prompt in Expert mode burned through SuperGrok rate limits because an orchestrating agent retried and re-submitted the prompt multiple times instead of waiting for the single response. Retrying typed-in prompts is expensive and user-visible.
2. **Shell quoting gets fragile as prompts grow.** Backticks, `$`, embedded heredocs — all land in the contenteditable eventually, but the escape chain from caller → bash → CDP keystrokes is brittle.

Design options to evaluate (not implementing yet, just noting):

- **(A) File attach.** Grok's UI has a paperclip/attach button — upload the prompt as a `.md` file and let Grok read the attachment. Eliminates keystroke races and shell escaping entirely. Requires finding + triggering the file picker via CDP.
- **(B) Single `.md` whole-paste.** Read the prompt from a `.md` file and set the contenteditable innerText in one eval + dispatch input event. No per-character keystrokes. Already prototyped during 2026-04-17 debugging.
- **(C) JSON wrapper.** Wrap large prompts in a single JSON blob (question + context + mode). Mainly helps programmatic callers reason about the payload; doesn't fix the UI-side ingestion.
- **(D) Explicit single-request discipline at the agent layer.** Orthogonal to the CLI: enforce in `the-musketeer.md` that the Claude agent MUST NOT re-submit on timeout — return the sentinel and let the caller decide. This is the cheapest fix; it prevents rate-limit burns without touching the transport.

Likely direction: (D) first (it's a one-line agent-spec fix, already in place), then (B) or (A) for the transport layer. The choice between (B) and (A) hinges on whether Grok's server-side rate limiting treats an attached file differently from a long typed prompt — worth a targeted probe.

## Security

Your Chrome Dev profile holds your Grok session (plus everything else). Running Chrome with `--remote-debugging-port=9222` exposes CDP to anything that can reach `localhost:9222` on your Windows box — don't enable this port on a shared or exposed machine. On WSL the port is reachable from the Linux side only (same machine); that's fine. If you ever expose the port outside localhost, treat it as granting full control over your browser, including any signed-in session.
