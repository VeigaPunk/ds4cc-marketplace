# Godspeed Mode

A behavioral posture for AI agents that replaces goal-aiming with Pareto-walking at iteration velocity.

Most one-sentence optimization instructions collapse under pressure: "make it faster" silently sacrifices quality, "make it right" silently sacrifices speed. Godspeed holds the tension instead of resolving it, and trusts cheap parallel iteration to find the frontier the operator couldn't pre-specify.

## The core idea

Godspeed is the composition of two independent ideas — either one alone is incomplete:

1. **Velocity** — cheap stubs over expensive perfection, parallel batches over serial deliberation, catalog bootstrap before generative search. Trust the process and the iterations.

2. **Filter** — a symmetric Pareto constraint (antimetabole: *A without harming B; B without harming A*). Every candidate move must improve at least one named axis and harm none. No pre-specified goal; the frontier reveals itself by ceasing to move.

Together they produce **directed motion without a pre-specified direction.** The filter prevents regression, the velocity prevents stalling, and the frontier walks itself.

## The four rules

1. Name the axes.
2. Iterate cheap, in parallel.
3. Keep moves that improve any axis and harm none.
4. Don't aim — let the frontier walk itself.

## Triggering

Say **godspeed** (alone, or as a closer: `do X | godspeed`). The posture holds for the duration of the task.

## Two tiers: orchestrator vs. deployed subagent

Godspeed is designed for a delegated-work setup where one agent architects the walk and others execute moves in parallel. The two roles inherit different amounts of the spec:

### Orchestrator (and planner) — inherit all three documents

The orchestrator role (in this repo's reference implementation, `the-judge`; the planner role is `the-planner`) is responsible for *architecting* the Pareto walk: naming the axes, shaping the variant catalog, deciding what is cheap enough to dispatch, and judging whether each returned move passes the filter. That role loads the full trilogy:

- [`directive.md`](directive.md) — behavioral spec, stop conditions, anti-patterns
- [`filter.md`](filter.md) — why the Pareto constraint is symmetric (and why it's not a weighted sum, lexicographic order, or Hegelian synthesis)
- [`velocity.md`](velocity.md) — the build-sequence pattern (which stubs come first, when to parallelize, how auto-recording keeps observability from trading off against speed)

The orchestrator needs the *why* behind each rule, because it chooses when a rule bends at the margin and when it doesn't.

### Deployed subagents — inherit only the directive

Subagents dispatched by the orchestrator for a specific task (write code, run a probe, review a diff, fetch context) inherit only the short behavioral directive — essentially the four rules plus the Pareto-filter acceptance test. They don't need the rhetorical provenance of antimetabole or the full build-sequence pattern; they need to know *which axes were named for this task*, *what counts as cheap here*, and *how to report the move so the orchestrator can filter it*.

This asymmetry is intentional. The orchestrator holds the frame; the subagents do the work. Loading the full spec into every subagent would bloat context and invite each one to second-guess the axis choices that have already been made upstream.

## Files

- [`directive.md`](directive.md) — full behavioral directive (load into orchestrator)
- [`filter.md`](filter.md) — Pareto-filter half, antimetabole analysis (orchestrator-level context)
- [`velocity.md`](velocity.md) — iteration-velocity half, build-sequence pattern (orchestrator-level context)

## Setup (Claude Code)

Drop `directive.md` into the agent or skill definition that should adopt the posture. For an orchestrator role, also make `filter.md` and `velocity.md` reachable from that agent's context (e.g., as references the agent can load on demand). Trigger with the word `godspeed` in any session.

## Intellectual lineage

Pirsig (Quality recognized, not defined) · de Waal / Uexkull (umwelt over anthropocentric protocol) · Karpathy (overfit one batch first) · Scott (metis over high-modernist planning) · AutoAgent (emergent hill-climb over hand-tuned harness)
