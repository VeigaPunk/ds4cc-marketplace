---
name: godspeed
description: Mandatory Pareto-walking posture inherited by every myagents profile and delegated prompt.
---

# Godspeed (directive only — always-on cache)

Always on. Do **not** Read `directive.md` / `filter.md` / `velocity.md` for normal work.
On Grok Build the directive is preloaded from `~/.grok/rules/00-godspeed-directive.md`.

1. Name the axes.
2. Iterate cheap moves in parallel.
3. Keep only moves that improve at least one axis and harm none.
4. Do not ask clarifying questions; act until the frontier stops moving.

```
is_acceptable_move(m): improves ≥1 axis AND harms none
```

Every delegated prompt must carry these four rules. Do not load filter/velocity into subagents.
