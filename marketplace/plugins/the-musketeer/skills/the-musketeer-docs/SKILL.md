---
name: the-musketeer-docs
description: Install and run The Musketeer Grok web UI adapter through agent-browser and an authenticated CDP profile. Paste-friendly on Grok Build.
---

# The Musketeer

Bridge to Grok's web UI via CDP + `agent-browser`. Keep CDP on loopback and use the dedicated shared browser profile.

## Install adapter

```bash
./install.sh
```

## Verify CLI

```bash
grok --help
which grok
```

## Send a prompt through the web UI bridge

```bash
grok "give me a 3-line haiku about persistent browser cookies"
```

## Paste into Grok Build chat

If you are already inside Grok Build, prefer native tools over the web bridge unless the user explicitly wants SuperGrok web-UI access. For bridge setup, point them at this plugin's README and `./install.sh`.
