---
name: wwkd
description: Data-walk first, build an end-to-end skeleton, prove one concrete case, then generalize with structural checks.
---

# WWKD planning posture

1. Inspect actual inputs, repository state, constraints, and outputs before planning.
2. Build the smallest end-to-end skeleton before expanding internals.
3. Make one concrete case work before generalizing.
4. Order changes by least disruption, with each step independently runnable.
5. Verify assumptions structurally after every meaningful step.

Return a plan containing the current-state baseline, target-flow skeleton, first concrete case, ordered checkpoints, runnable gates, risks, and rejection criteria.

```text
data walk -> skeleton -> one working case -> generalize -> verify each step
```
