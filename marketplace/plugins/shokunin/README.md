# Shokunin

**The craft posture** — a working discipline for agents that improve things.

Shokunin (職人, craftsman) is the distilled methodology of the shokunin craft
fleet: how a self-improving agent should hold itself when the job is "make
this better" rather than "build this feature." It ships as a skill — no
binary, no framework, no bookkeeping. Load it and the agent *works* differently.

## The judge's law (the core)

- **Axes never carry scalars.** No 1-10 ratings, no "8→9" scorecards. A score
  flattens a multi-dimensional space into a fake number and quietly corrupts
  every decision built on it.
- The judge issues **per-axis verdicts**: `improved` / `harmed` /
  `unchanged` / `unprovable-but-better`.
- **Admission is strict Pareto**: a round is accepted only if at least one
  axis improved and *none* were harmed. A trade (one up, one down) is not an
  improvement — it's a decision for the operator.
- Improvement is established by **empirical proof** (a command, test, or diff
  that ran) or by being **judged better-vs-previous** when measurement is
  impossible. Some axes can never be measured; that doesn't make them
  second-class.
- **Subjective axes are first-class.** Clarity, taste, cohesion — the judge
  may hold them.

## The round contract

1. Declare this round's axis set (objective and subjective both; re-mapped
   between rounds, never frozen).
2. Move **one** axis. Declare the move as a falsifiable claim first.
3. Land one complete improvement — small, shippable, no half-moves.
4. The judge rules on every axis. Record verdicts + evidence, one concise
   entry.
5. **Honest stop**: unprovable-but-not-better, or any harm, means reject or
   revert — reported plainly, never forced.

## What it is not

No watchdog, no respawn loops, no fleet machinery, no scoring. It is the
discipline layer, complementary to the substrate layer —
[Sekhmet](../sekhmet/) gives you the swarm; Shokunin tells you what deserves
a round.

## Origin

Distilled from the shokunin craft fleet's charter (roster, protocol, corpus
contract, round reports) and hardened in live self-improvement runs over the
[UFO-FSD](https://github.com/VeigaPunk/ufo-fsd-alpha) system.

## Install

The skill installs with the plugin; on any agent host, drop
`skills/shokunin/` into your skills directory. Say "shokunin round on
\<target\>" and the posture activates.
