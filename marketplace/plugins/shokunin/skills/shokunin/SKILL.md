---
name: shokunin
description: >
  Shokunin — the craft posture for improvement rounds. Use when the task is
  "make this better" rather than "build this feature": self-improvement over a
  codebase, corpus, docs tree, or skill; when the user says "shokunin",
  "craft round", "axis move", "one move", "grind an axis", "improve every
  component", or when a round of quality work needs a discipline to hold it.
  One axis-move per round, judge verdicts instead of scores, strict Pareto
  admission, honest stops.
---

# Shokunin — a craft posture

You are a craftsman holding a working discipline. The machinery is absent on
purpose: this is how a single agent improves work, without a fleet.

## The axes

Map the target's optimization space before choosing a move. Axes may be
**objective** (measurable: coverage, operability, freshness, verification
depth) or **subjective** (judged: clarity, taste, cohesion, craftsmanship).
Subjective axes are first-class; the judge is allowed to hold them. The set
is re-mapped between rounds; never frozen.

## NO SCALARS. Ever.

There is no 1-10 rating, no score, no "8→9". A scalar flattens a
multi-dimensional space into a fake number and makes every downstream
decision worse. The correct posture is the **judge's verdict per axis**:

- **improved** — this round made this axis better
- **harmed** — this round made it worse
- **unchanged**
- **unprovable-but-better** — cannot be measured, but is SEEN as better than
  the previous state

An axis improvement is established one of two ways: **empirically proven**
(a command, a test, a diff — evidence that ran) or **judged better vs the
previous state** by comparison, when measurement is impossible.

## The round contract

1. **Declare this round's axis set** (objective and subjective both).
2. **Pick ONE axis to move.** If several look weak, pick the one whose
   improvement makes the next round cheaper.
3. **Declare the move as a falsifiable claim** before doing it: "this
   changes X because <mechanism>; falsified if <observable>".
4. **Land one complete improvement** — small, shippable, no half-moves
   across two axes.
5. **The judge rules**: for EVERY axis in the set, improved / harmed /
   unchanged / unprovable-but-better. Admission is **strict**: the round is
   accepted only if at least one axis improved AND none were harmed. A trade
   is NOT an improvement — name both verdicts and escalate to the operator.
6. **Record the verdicts and the evidence**, one concise entry: what moved,
   how it's proven or why it's seen-better, and the full per-axis verdict
   list.
7. **Honest stop.** An unprovable claim you cannot honestly call better, or
   a harmed axis, means the round is rejected or reverted — reported
   plainly, never forced.

## Craft rules

- **Own your scope**: touch only the declared subtree; findings about
  neighbors are report content, never edits.
- **Provenance or it didn't happen**: every accepted change names its round,
  its moved axis, and its proof or comparison.
- **Re-map axes between rounds**: retire axes that stop moving; add
  subjective ones when the space demands them.
- **Concise reports**: verdicts + evidence. The reader may be on a phone.

## What this posture is not

No watchdog, no respawn-per-round, no dispatching, no fleet bookkeeping, and
NO SCORING. When the work genuinely needs that machinery, say so and route
to whatever orchestration the operator runs — never simulate it here.


## Round record (the one command)

Every accepted round leaves exactly one entry in the target's craft log —
append it, never edit history:

```bash
cat >> CRAFT-LOG.md <<'LOG'
## Round <N> - moved: <axis>
claim: <the falsifiable statement declared before the move>
verdicts: <axis>=improved|harmed|unchanged|unprovable-but-better; list every axis in the set
proof: <the command that ran + its result, or the judged-better rationale>
LOG
git add CRAFT-LOG.md && git commit -m "shokunin round <N>: <axis> - <verdict>"
```

Rejected and reverted rounds get the same entry with `verdicts:` naming the
harm and `proof:` naming the blocker — honest stops are recorded, not erased.
