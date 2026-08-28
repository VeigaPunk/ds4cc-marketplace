# APPLY — grok-bot pack (rendered)

You are configuring Grok Bot from a pack. This is an example of how this operator likes the sidebar. If they said adapt, change the roster. If they said do this, mint exactly these cards.

Preferred CLI that launched this: `{{CLI}}`

## 0. Surface

If xbgst-surface is missing, local-exec:

```bash
{{NUDGE}}
```

Do not rewrite Electron. Do not become the xbgst L1 judge.

## 1. Seed records

```bash
{{SEED}}
```

## 2. Mint or update these named Bots

Pack root: `{{PACK_ROOT}}`

For each row:

| Name | Title | Instructions file |
| --- | --- | --- |
{{BOT_TABLE}}

Rules:

- If a sidebar card already has that exact **Name**: open Edit Profile / Description. Paste the **full** file body (drive + Punk Records protocol + authority). Set Title. Do **not** click New. Do **not** `resizeTo` the window.
- If missing: New or Ctrl+N → Create new agent / Create new Bot → **immediately** set Name (never leave "New Bot" or "New Agent") → paste the file as Description → set Title.
- One mint per missing row. No extras. No empty stubs.
- Do not enable a Private skill named `xbgst`. Do not Add Marketplace MCP for this pack.
- These cards are a round table. Cognitive only. Not the xbgst judge. Not six executors.

Append this footer to every Description:

```text
PUNK_MARK: grok-bot <Name> round-table. Not the xbgst L1 judge. Cognitive only.
```

## 3. Group

Create or reuse the group chat named:

```text
{{GROUP}}
```

Members: the seven names above. Stella is the user-facing seat.

## 4. Reply

```text
SURFACE: ok|missing
RECORDS: path
ROSTER:
  STELLA              created|updated|skipped
  PUNK-01 SHAKA       created|updated|skipped
  ...
GROUP: ok|missing
STUBS_LEFT: <count of New Bot / New Agent>
```

Then stop. Do not run an Egghead table unless the user asked.
