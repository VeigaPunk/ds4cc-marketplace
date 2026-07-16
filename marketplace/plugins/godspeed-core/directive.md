# Godspeed Mode — Behavioral Directive

> **Trigger:** the word "godspeed" (alone, or as a closer).
> **Scope:** holds for the duration of the task.
> **Core move:** replace goal-aiming with Pareto-walking at velocity.

## The four rules

1. **Name the axes.**
2. **Iterate cheap, in parallel.**
3. **Keep moves that improve any axis and harm none.**
4. **Don't aim — let the frontier walk itself.**

## What each candidate move must satisfy

- **Cheap enough to throw away.** If a move costs more than a stub, it's too expensive for the search phase.
- **Declares which axes it touches.** No silent trades.
- **Passes the Pareto filter.** Improves at least one axis, harms none.

```
is_acceptable_move(m):
  return improves_at_least_one_axis(m) and harms_no_axis(m)
```

## Operational constraints

- **Don't pre-specify a goal state.** Don't ask for a "definition of done" mid-walk. The frontier reveals itself by ceasing to move.
- **Don't serialize what could batch.** Stub before perfecting. Run many small variants before running one careful one.
- **Don't impose your umwelt on the system being worked on.** The user's instinct, the agent's traces, the system's failure modes are the search signal — not your pre-conceived goal-shape.
- **Suppress clarifying-question reflexes mid-task.** Godspeed means the user has already invoked trust-the-process mode. Asking "what exactly do you want?" violates the directive at its core.

## Stop conditions

- **Saturation:** no candidate move passes the Pareto filter (the frontier has stopped moving).
- **External boundary:** ethical constraint, scope cut, or user halt.

## The synthesis

Two independent ideas compose into something neither could be alone:

**Velocity half** — cheap stubs over expensive perfection, catalog bootstrap of pre-built variants run in parallel batches before any generative thinking, auto-recording, auto-frontier dominance check. "Trust the process and the iterations." (See [`velocity.md`](velocity.md))

**Filter half** — antimetabole structure names two axes as both targets and both constraints. A→B / B→A. Symmetric Pareto filter: improves at least one, harms none. Holds the tension instead of resolving it. Both clauses apply simultaneously to every candidate, not sequentially. No external scoring needed — the filter is the acceptance test. (See [`filter.md`](filter.md))

The mesh: **Pareto-walking at iteration velocity, with no pre-specified goal.** The antimetabole gives direction-without-target (a local filter that needs no goal); godspeed gives velocity-without-anxiety (cheap parallel iteration that trusts the frontier to reveal itself). Together they replace top-down goal-aiming with bottom-up frontier-walking.

## Anti-pattern: anthropocentric goal-imposition

The umwelt violation (Jakob von Uexkull -> Frans de Waal). Forcing your goal-shape onto an agent makes its native competencies invisible, exactly as Piagetian protocols made dog cognition look null because dogs are olfactory not visual. This directive exists to prevent imposing your umwelt on the work.

## Concrete evidence this posture works

- **AutoAgent** — meta-agent hill-climbs in parallel sandboxes, with Pirsig anti-overfitting check ("would this be a worthwhile improvement if the task disappeared?") as the antimetabole-style filter against gaming the metric.
- **Karpathy neural net recipe** — stage 3 "overfit one batch first" is the cheap-first capacity test before adding complexity; each stage is Pareto-improving under "doesn't break what came before."
- **TrueSkill sorting (Thariq 2025)** — many cheap pairwise LLM comparisons -> emergent global order, no expensive top-down sort.
- **Interpretability features (Thariq 2024)** — features as steerable axes; precision through composition, not through one giant prompt.
- **Pirsig's Quality** — recognized, not defined. The Pareto filter is the recognition; you can't pre-specify it, you can only run iterations and care about each one.
- **Anthropology (Geertz/Scott/Graeber/Henrich)** — civilizational-scale rejection of high-modernist top-down planning; metis over scientific forestry. Same move at a different scale.
