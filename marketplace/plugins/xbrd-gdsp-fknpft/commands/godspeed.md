---
description: /godspeed — alias for /xbgst. Godspeed Pareto + cross-model delegation (all-Claude speed of /xgs plus xask codex depth of /xbt).
argument-hint: <prompt for the judge>
allowed-tools: [Agent, Bash, Read, Write, Edit, Glob, Grep, TaskCreate, TaskGet, TaskList, TaskUpdate, TaskOutput, SendMessage, TeamCreate, TeamDelete, WebFetch, WebSearch, LSP, Monitor]
---

# /godspeed — alias for /xbgst

This is an alias for `/xbgst` (Godspeed Pareto + cross-model delegation). See `/xbgst` for the full protocol.

Read the sibling command file and follow it exactly with `$ARGUMENTS` as the prompt:

- When installed as a plugin: `${CLAUDE_PLUGIN_ROOT}/commands/xbgst.md`
- Local checkout fallback: `~/.claude/commands/xbgst.md`

Do not re-derive the protocol here — load `xbgst.md` and execute it verbatim with `$ARGUMENTS`.
