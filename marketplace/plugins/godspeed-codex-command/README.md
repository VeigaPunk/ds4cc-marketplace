# Godspeed Command for Codex

Drop this `AGENTS.md` into the root of any Codex workspace to make `godspeed` a triggerable command/posture.

## Quick Use

1. Copy `AGENTS.md` into your Codex project root.
2. Start or reload Codex in that project.
3. Add `| godspeed` to a prompt:

```text
<task> | godspeed
```

## What It Does

`godspeed` tells Codex to:

- name the optimization axes;
- avoid clarifying questions unless truly necessary;
- act directly with tools;
- parallelize independent checks and reads;
- iterate cheaply before making large moves;
- keep only moves that improve at least one axis without harming the others.

That is it. No extra roles, no team mode, no external tooling.

## Install From This Repo

Clone or download this repository, then copy `AGENTS.md` into the project where Codex should behave this way.
