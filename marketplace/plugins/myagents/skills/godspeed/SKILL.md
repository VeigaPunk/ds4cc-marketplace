---
name: godspeed
description: Use on every prompt, including nested and delegated prompts, without waiting for a keyword. Explicit "godspeed" and "--with godspeed" invocation remains supported.
user-invocable: true
---
# Godspeed

Read `directive.md` in this skill directory and apply its contents verbatim. It
is the quintessential form: do not summarize, paraphrase, or extend it.

Every delegated prompt must prepend those exact bytes and end exactly once with
the literal suffix ` | godspeed`. Use `--with godspeed` or `--gs` whenever the
dispatch surface exposes that flag.
---

## Invocation

Use the host's skill invocation surface or `--with godspeed`; `-s` is a Codex
sandbox flag, not a skill selector.
