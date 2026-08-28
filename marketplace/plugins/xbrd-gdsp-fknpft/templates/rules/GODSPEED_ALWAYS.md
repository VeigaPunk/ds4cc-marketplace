---
name: godspeed
description: Use on every prompt, including nested and delegated prompts, without waiting for a keyword. Explicit "godspeed" and "--with godspeed" invocation remains supported.
---
# Godspeed Mode

Godspeed is inherited. The canonical posture lives only in the installed
`godspeed` skill's `directive.md`; this standing rule is a pointer, not a copy.
Read that file verbatim before acting. Never reconstruct, summarize, shorten,
or maintain a handwritten variant here.

Delegation is transitive. Every delegated prompt, including planner, executor,
distiller, recursive sub-lead, and nested prompts, MUST prepend the exact
`directive.md` bytes. Strip any existing terminal marker, then append exactly
one literal suffix ` | godspeed`. Every delegate MUST repeat this file-loading
and suffix requirement for prompts it delegates. Cross-model `xask`
delegations MUST use `--gs`.
---
