---
name: the-kimester-docs
description: Install and run The Kimester Kimi web UI adapter through agent-browser and an authenticated CDP profile. Paste-friendly on Grok Build.
---

# The Kimester

CLI bridge for Kimi web chat via loopback CDP + agent-browser. Sibling of the-musketeer (Grok), the-puppeteer (ChatGPT), and the-almanacker (NotebookLM).

## Install adapter

```bash
bash ./install.sh
```

Binary is **`kimester`** (not `kimi` — official Kimi Code CLI owns that name).

## Fire a prompt

```bash
printf '%s' "hello from the CLI" | kimester --stdin
```

## Verify CDP

```bash
curl --fail http://127.0.0.1:9222/json/version
```

Keep CDP on loopback; use the shared dedicated automation profile; never export cookies.
