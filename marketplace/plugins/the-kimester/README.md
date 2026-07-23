# The Kimester

Fire-and-forget bridge from CLI → [Kimi](https://www.kimi.com) web UI via loopback CDP + `agent-browser`.

Sibling to [the-puppeteer](https://github.com/VeigaPunk/the-puppeteer) (ChatGPT), [the-musketeer](https://github.com/VeigaPunk/the-musketeer) (Grok), and [the-almanacker](https://github.com/VeigaPunk/the-almanacker) (NotebookLM).

## Why

Kimi web UI capabilities (authenticated chat and any web-only modes) are not the same surface as the official **Kimi Code CLI**. The Kimester reuses your already-signed-in Chrome automation profile over CDP — no cookie export, no API keys.

## Install

```bash
bash ./install.sh
```

Installs:

- `kimester` → `~/.local/bin/kimester` (**not** `kimi` — avoids PATH collision with official Kimi Code CLI)
- Claude agent → `~/.claude/agents/the-kimester.md`
- `agent-browser` if missing

Reuses the **shared** family CDP Chrome profile (port 9222). No separate launcher.

## Usage

```bash
kimester "your prompt here"
printf '%s' "$long_prompt" | kimester --stdin
kimester --new-chat "start a fresh tab"
```

Success line:

```text
✓ Prompt fired. Read the reply in your Kimi browser tab.
```

## Security

- **CDP must stay on loopback.** Default host is `127.0.0.1`. Non-loopback hosts are rejected unless `KIMESTER_DANGEROUS_ALLOW_REMOTE_CDP=1`.
- **Dedicated automation profile only.** Do not attach CDP to your daily browser profile. Sign into kimi.com once in the shared family profile (same as puppeteer/musketeer/almanacker).
- **No cookie export / no session JSON / no passwords.** Auth is the live browser session.
- **Host allowlist.** Only `kimi.com` / `*.kimi.com` and `moonshot.cn` / `*.moonshot.cn` URLs are opened or matched. Spoof hosts like `kimi.com.evil.example` are rejected.
- **Prompt transport.** Prefer `--stdin`; the CLI inserts text via a short Node batch helper so the prompt is not passed as agent-browser argv.

Firewall tip: keep port 9222 bound to localhost only.

## Env

| Variable | Default | Notes |
|---|---|---|
| `KIMESTER_CDP_HOST` | `127.0.0.1` | loopback only |
| `KIMESTER_CDP_PORT` | `9222` | shared family port |
| `KIMESTER_URL` | `https://www.kimi.com` | open target when no tab (allowlisted host) |
| `KIMESTER_REQUIRE_LIVE` | unset | `1` = fail closed if no input |
| `KIMESTER_DANGEROUS_ALLOW_REMOTE_CDP` | unset | `1` = allow non-loopback CDP |

## Selectors (v0)

Progressive best-effort only — **not** live-scouted (CDP probe was blocked in the scaffolding round):

1. `textarea`
2. `[contenteditable=true]`
3. `[role=textbox]`
4. `[data-kimester-input]` (PLACEHOLDER until live DOM scout)

When your automation Chrome is up and signed into kimi.com, run `kimester "hello"` and refine selectors if the progressive set misses.

## Tests

```bash
bash tests/test-kimester-guards.sh
```

## License

MIT
