---
name: wwkd
description: >
  What Would Karpathy Do — a planning and implementation posture distilled from Karpathy's
  public body of work (the Recipe, builder philosophy, vibe coding, context engineering).
  Activate when the user wants to turn an approved spec into an implementation plan, or
  asks "plan this", "break this down", "how would we build this", "write the plan",
  "/wwkd", "what would karpathy do", or invokes planning after brainstorming. Biases toward
  data-first inspection, end-to-end skeletons before optimization, overfit-one-case before
  generalizing, minimal one-file implementations over frameworks, and structural
  verification at every step. Opposite of "fast and furious." Produces plans whose
  sequencing reflects least-disruption ordering — each step runnable in isolation, each
  assumption verified before the next layer lands.
---

# What Would Karpathy Do — Planning Posture

Planning is a disciplined response to **silent failure**. The cheapest bugs to fix are
the ones you catch before the next layer lands on top. This skill is the posture that
catches them.

Source material lives at `~/wikillm/llm-wiki/wiki/karpathy/` — notably
`karpathy-recipe-neural-networks.md` and `builder-philosophy.md`. This SKILL.md is the
runtime compression.

---

## Core Principles (non-negotiable)

1. **Become one with the data first.** Before writing any plan step, inspect the actual
   inputs, outputs, and intermediate artifacts. Not the spec's description of them —
   the thing itself. Count. Eyeball. Find outliers. Most plan failures trace to
   skipping this step. No step of the plan lands before this one has been done.

2. **Build a skeleton you trust before adding capability.** The first milestone is an
   end-to-end pipeline whose every component is predictable to the last digit. Fix
   seeds. Disable augmentation. Pick the simplest model that could possibly work. The
   purpose is not to produce a good result — it is to establish infrastructure whose
   later failures can be localized.

3. **Overfit one case before generalizing.** Prove the pipeline can solve exactly one
   minimal instance (one SKU, one week, one file, one query). If it cannot, no amount
   of breadth will save it. Overfitting a single case is a capacity smoke test, not a
   training goal.

4. **Regularize in order of least disruption.** Add complexity one thing at a time.
   Each new layer can obscure bugs from the prior layer — which is why the order
   matters. Every regularizer is introduced after the previous one is trusted, never
   in a batch.

5. **Tune only after correctness is proven.** Hyperparameter search is a stage 5
   activity, not a stage 1 activity. Random search beats grid search; one or two axes
   dominate and the rest are noise. Keep the tuning budget small and measure everything.

6. **Code is ephemeral; knowledge is permanent.** Protect the spec, the prompt, the
   data, the knowledge artifact. The code around those is disposable. Don't
   over-engineer the glue — vibe-code it, verify the center structurally.

7. **Follow established patterns.** Novel architecture is where almost all debugging
   time goes, and almost all of it is wasted. If a related problem has been solved
   nearby (existing module, reference implementation, a paper), start from that. Save
   invention for where leverage actually lives.

8. **Fits in one file, one screen.** Minimum implementable form. ~600 lines per
   module. Single-sitting readable. Small surface area = fewer bugs = easier iteration.
   If the plan forces a framework, reconsider — the framework is almost never the
   leverage point.

9. **Structural verification at every step.** Training fails silently. Every plan step
   has an explicit verification gate — a command you can run, a number you can
   compare, an output you can diff. No step is "done" until its gate passes.

10. **The anti-pattern you are planning against: fast and furious.** Grab an
    architecture, plug in data without examining it, start running, iterate until
    something works. The result is either mysterious success (cannot be reproduced) or
    mysterious failure (cannot be debugged). The plan is what remains after deciding
    mysterious success is no better than mysterious failure.

---

## Planning Protocol

### Phase 0 — Data Walk

Before any step is written, enumerate and inspect:

- **Inputs:** what files, what shape, what content, how many rows, what outliers
- **External APIs:** what do they actually return (probe, don't read docs alone)
- **Existing code:** what behavior does it already implement that the plan interacts with
- **Known constraints:** rate limits, schema quirks, load-bearing invariants

Produce a **Data Walk artifact** (markdown or notebook) before the plan itself lands.
If the spec promises something the data doesn't support, pause and reconcile — do not
plan around a false premise.

### Phase 1 — Skeleton Sequencing

Write the plan as a sequence of milestones, each one:

- **End-to-end from day one.** Every milestone produces a runnable artifact that
  exercises the full pipeline at reduced scale.
- **One new capability per milestone.** Not three.
- **Ordered by least disruption.** Milestone N's failure modes do not mask milestone
  N-1's. If they might, swap the order.
- **Verification gate baked in.** Each milestone ends with a specific command + expected
  output. If the gate can't be stated, the milestone isn't well-defined.

The skeleton milestone (Milestone 1, always) is the simplest end-to-end thing that
could possibly work — typically one input, one transformation, one output, hard-coded
where not essential, run on toy data.

### Phase 2 — Overfit Milestone

Milestone 2 is always: **solve exactly one minimal real instance end-to-end.** One
SKU, one week, one query, one file. Not a subset, not a sample — one. The success
criterion is bit-for-bit correctness on that instance, not plausibility.

Why this is its own milestone: it's the capacity smoke test. If the pipeline can't
solve one, it won't solve many. Every subsequent milestone assumes Milestone 2 passed.

### Phase 3 — Generalization Order

Subsequent milestones widen one axis at a time:

- More SKUs (without changing time range)
- More time (without changing SKU set)
- More endpoints (without changing data scope)

Each widening is reviewed against its own gate before the next one begins. Breaking an
earlier milestone's gate is a blocker — fix before widening further.

### Phase 4 — Polish & Squeeze

Last. Only after correctness is proven across the generalized range. Includes:

- Artifact formatting
- Reporting polish
- Performance tuning
- Ergonomics / CLI affordances

No polish milestone runs before its correctness milestone has passed. Polishing a
wrong answer just produces a pretty wrong answer.

---

## Plan Artifact Format

Every plan produced under this skill has:

```markdown
# Plan — <title>
**Spec:** <path to spec>  **Author:** wwkd posture, <date>

## Data Walk
- What I looked at, what I found, what surprised me
- Any spec/reality divergences

## Milestones

### M1 — Skeleton (end-to-end, toy)
**Does:** <one sentence>
**Gate:** <command + expected output>
**Touches:** <files>
**Out-of-scope:** <explicit carve-outs>

### M2 — Overfit one real instance
**Does:** <one sentence, naming the single instance>
**Gate:** <bit-for-bit expected output>
...

### M3..Mn — Generalize one axis per milestone

### M_final — Polish
```

Each milestone is reviewable and mergeable in isolation.

---

## Refusals

This skill refuses to produce:

- **Plans that skip Phase 0.** If the data walk hasn't been done, the plan is
  planning against a fiction.
- **Plans with a "write everything then test" milestone.** That is fast-and-furious.
- **Plans that invent novel architecture where established patterns exist.** Name
  the reference implementation or the existing module. If there isn't one, flag
  explicitly that this step carries invention risk.
- **Plans without verification gates.** A milestone without a gate is a wish.
- **Plans whose first milestone is scaffolding a framework.** The first milestone
  solves a user-visible slice of the problem end-to-end, however tiny.

---

## When To Use

Trigger the skill when:
- User has an approved spec (brainstorming/design complete) and needs an implementation plan
- User invokes `/wwkd`, says "what would karpathy do", "plan this", "break this down"
- User is about to start a non-trivial feature and wants the sequencing right before coding
- Planning a refactor where silent-failure risk is real (reconciliation, migrations,
  data pipelines, training loops, anything whose wrong answer looks right)

Do NOT use when:
- The task is a one-line change — planning overhead exceeds the work
- Spec is still in flux — route to brainstorming/heuer-planning first
- User wants vibe-code throwaway glue — that regime is explicitly outside wwkd's remit
  (see `builder-philosophy.md` on code-is-ephemeral; wwkd is the center-of-stack posture,
  not the glue posture)

---

## Relationship to Other Skills

- **heuer-planning**: pre-spec brainstorming; produces the approved design that wwkd
  turns into a plan. wwkd assumes the spec exists.
- **xbgst / xbt / xgs**: orchestration wrappers that can invoke wwkd as the planning
  phase after a spec review. Compose: `/xbgst <spec>` → review → `/xbgst /wwkd` → plan.
- **superpowers:writing-plans**: generic plan-writing; wwkd is the opinionated variant
  that enforces data-walk-first, overfit-one, least-disruption ordering.

## Source Excerpts

> "Neural net training fails silently." — Karpathy, *A Recipe for Training Neural
> Networks*, 2019. The epigraph of the skill.

> "Code is free, ephemeral, malleable, discardable after single use." — Karpathy, 2025
> Year in Review.

> "Name the axes, iterate cheap in parallel, keep moves that improve any axis and harm
> none, don't aim — let the frontier walk itself." — VeigaPunk directive, the
> Pareto-walk compression of the same posture.
