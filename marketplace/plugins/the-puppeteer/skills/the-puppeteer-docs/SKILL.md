---
name: the-puppeteer-docs
description: Install and run The Puppeteer web automation and ChatGPT bridge.
---

The Puppeteer automates long-running web tasks via an agent-browser bridge.

## Install

```bash
bash ./install.sh
```

## Run chitchat CLI

```bash
chitchat "Research the latest AI safety papers and summarize key findings"
```

For native Arch/Linux, start a dedicated browser profile with CDP bound to
`127.0.0.1`; `chitchat` prints the exact launch command when it cannot connect.
Verify only endpoint metadata with `curl --fail http://127.0.0.1:9222/json/version`.
For long or sensitive shell input, keep the prompt out of argv:
`printf '%s' "$prompt" | chitchat --stdin`. The profile must already be logged
in; never expose CDP beyond loopback.

## Execute a deep research task

```bash
chitchat --deep "Compare the training approaches of GPT-4 and Claude 3"
```

## Check agent status

```bash
cat ~/.claude/agents/the-puppeteer.md
```

## Run an automated web workflow

```bash
chitchat "Open https://arxiv.org and find today's top ML papers"
```
