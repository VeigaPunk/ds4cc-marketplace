# Filter Half — Antimetabole as Pareto Constraint

> Origin: analysis of a dual-mandate optimization directive (2026-04-08).

## The structure

A directive that names two competing axes and instructs the executor to optimize each one without sacrificing the other.

> "optimize everything without touching what would make us lose quality; also, optimize what would allow quality to flourish without losing speed"

## Rhetorical name: antimetabole

**Chiasmus** (from Greek khiasmós, "crossing") — two clauses where the grammatical order of the second reverses the first. Pattern: A-B / B-A.

**Antimetabole** — the specific case where the *same words* get repeated in reversed positions. The repetition makes the symmetry explicit.

Canonical examples:
- "Ask not what your country can do for you; ask what you can do for your country." (JFK)
- "We do not stop playing because we grow old; we grow old because we stop playing." (Shaw)

The directive is antimetabole because the same two nouns (speed, quality) appear in both clauses with their roles swapped:

| | Primary target | Constraint |
|---|---|---|
| Clause 1 | speed | "without quality loss" |
| Clause 2 | quality | "without losing speed" |

## Optimization-theoretic name: symmetric Pareto filter

In multi-objective optimization, the Pareto frontier is the set of solutions where no dimension can be improved without degrading another. The natural-language Pareto filter:

> "improve X without harming Y; improve Y without harming X."

```
is_acceptable_edit(e):
  return improves_at_least_one_axis(e) and harms_no_axis(e)
```

Any edit that's strictly Pareto-improving passes. Any edit that trades one axis for the other gets rejected in both directions.

## Why it works as a directive

Most one-sentence optimization instructions collapse under pressure by privileging one axis and leaving the other unprotected. "Make it faster" almost always means "make it faster, and quality is whatever falls out."

Antimetabole closes that loophole by naming both axes as primary targets *and* both as constraints, simultaneously. There is no unnamed axis to silently sacrifice. Every move gets evaluated against both filters.

The structural property: **the directive cannot be satisfied by single-axis improvement**, but it also cannot be paralyzed by the tension between axes — every Pareto-improving move is permitted.

## What it is not

- **Recursion** — sequential, stateful, temporalized. Antimetabole is atemporal; both clauses apply simultaneously.
- **Hegelian dialectic** — expects resolution into a higher-order term. Antimetabole holds the tension instead of resolving it.
- **Weighted-sum optimization** — collapses both axes into a single scalar. Loses the Pareto property; readmits trade-offs.
- **Lexicographic optimization** — gives strict priority to one axis. Antimetabole keeps both as primary.
- **Constrained optimization (asymmetric)** — names one axis as target, one as constraint. Antimetabole is the symmetric pair: both are target and both are constraint.

## Compact name

**Chiastic Pareto constraint** or **antimetabolic dual mandate**. Neither is standard literature; both are unambiguous to a reader who knows both source domains.
