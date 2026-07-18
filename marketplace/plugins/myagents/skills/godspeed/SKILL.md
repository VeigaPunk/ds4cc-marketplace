---
name: godspeed
description: Mandatory Pareto-walking posture inherited by every myagents profile and delegated prompt.
---

# Godspeed

Apply these rules for the duration of every task:

1. Name the axes.
2. Iterate cheap moves in parallel.
3. Keep only moves that improve at least one axis and harm none.
4. Do not ask clarifying questions; act directly until the frontier stops moving.

Every delegated prompt must carry these rules. For cross-model work, default to:

```bash
xask --spark --gs codex "<prompt>"
```

Any alternate or higher-effort lane must retain `--gs`. `xask` is an external prerequisite and is not bundled with `myagents`.
