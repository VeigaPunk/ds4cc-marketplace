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

1. **Isolated Chrome for Testing with CDP** — on native Linux/Omarchy, `musketeer-chrome` (also installed as the legacy-compatible `ds4cc-chrome`) launches stable Chrome for Testing on loopback port 9222 with a dedicated persistent profile. Sign into Grok once; later launches retain the session without exposing your daily browser profile.
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

## Native Omarchy automation browser

```bash
./scripts/install-automation-chrome
musketeer-chrome
```

The installer downloads the current Linux x86_64 **stable** Chrome for Testing into `~/.local/share/the-musketeer/`. Stable is deliberate: Canary 152 was observed crashing on Google sign-in pages despite passing blank-page CDP probes. Override with `MUSKETEER_CHROME_CHANNEL=Beta|Dev|Canary` only for isolated testing. On a host with an existing DS4CC installation, the shared launcher reuses DS4CC only as an atomic pair: both its executable and the real (non-symlink) `~/.local/share/ds4cc/agent-chrome-profile` directory must exist. Partial legacy installations fall back to both canonical `~/.local/share/the-musketeer/` paths, preventing a browser from being paired accidentally with the wrong authenticated profile. Almanacker calls to `ds4cc-chrome` and direct `musketeer-chrome` calls therefore share the same selected profile.

Explicit `MUSKETEER_CHROME_BIN` takes precedence over `MUSKETEER_CHROME_ROOT`; either uses an explicit `MUSKETEER_CHROME_PROFILE` or the canonical profile. A profile-only override pairs with the canonical executable. Before launch, the executable, non-symlink profile directory, and Chrome major version (149 or newer) are validated. Neither installer deletes profiles or replaces their authentication data.

Both launcher names are installed as exact symlinks to the repository launcher. An unrelated existing file or symlink is moved once to `<name>.pre-musketeer`; installation is then reversible. If that backup already exists while the current destination is unknown, installation stops instead of overwriting either copy.

The evidence-backed launch configuration keeps Chrome's sandbox, native Wayland, loopback-only CDP, Cloudflare DNS-over-HTTPS, and background-throttling protections. The CDP port defaults to 9222 and can be changed with `MUSKETEER_CDP_PORT`. Stability probes found no benefit from forced renderer accessibility, Vulkan disabling, `/dev/shm` disabling, or an ANGLE override, so those switches are not used. These automation settings are controlled by the launcher command line, not by `chrome://flags` policy or experiments.

For the disposable profile, browser sync and the stale crash-recovery bubble are disabled, while a fixed `1440×1000` desktop window keeps responsive layouts and accessibility references more repeatable. Repository-local `agent-browser.json` pins agent-browser to CDP 9222, namespace/session `musketeer`, content boundaries, and a 50,000-character output ceiling. It never launches a second browser. All `chrome://flags` experiments remain at **Default**; no experiment improved the measured CDP, evaluation, or accessibility-snapshot path.

An argument-free launch opens exactly three disposable automation tabs, in order: NotebookLM, Grok, and ChatGPT. Supplying one or more URLs replaces those defaults completely.

If Chrome reaches `DevTools listening` and then repeatedly crashes with `SIGTRAP`, the persistent profile may contain incompatible browser state. Preserve it and create a clean profile without deleting credentials or history:

```bash
./scripts/repair-chrome-profile
musketeer-chrome
```

The repair refuses to run while Chrome owns the profile and moves the old directory to a timestamped `.crash-backup-*` path for manual rollback. You must sign in once in the clean profile.

Verify:

```bash
curl -s http://127.0.0.1:9222/json/version
grok-web "hello"   # when the official Grok CLI owns the `grok` command
```

## Official Grok Build + DS4CC

Install the official CLI, then register the DS4CC marketplace and Grok-native role catalog:

```bash
curl -fsSL https://x.ai/cli/install.sh | bash
./scripts/setup-grok-build
```

This installs the marketplace `myagents` plugin and 14 provider-neutral agent definitions under `~/.grok/agents/`. Each definition contains the canonical Godspeed Core followed by one generic specialist role. They contain no external-model routing instructions.

## Files

- `grok` — the CLI executable.
- `the-musketeer.md` — Claude Code agent spec.
- `install.sh` — idempotent installer.
- `scripts/install-automation-chrome` — installs isolated Canary on native Linux.
- `scripts/musketeer-chrome` — launches the persistent CDP profile.
- `scripts/repair-chrome-profile` — safely rotates a crash-looping profile while preserving a rollback backup.
- `scripts/install-chrome-aliases` — safely installs both launcher aliases with reversible backups.
- `tests/test-musketeer-chrome.sh` — hermetic launcher and installer-alias checks.
- `scripts/setup-grok-build` — registers DS4CC with official Grok Build.
- `agents/*.md` — 14 Grok-native Godspeed agent definitions.

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
