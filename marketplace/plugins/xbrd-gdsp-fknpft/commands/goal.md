---
description: /goal — turn a rough objective into a structured goal (success criteria, constraints, non-goals) plus a short ordered plan. A lightweight, single-agent cousin of /wwkd — no data-walk, no team, no cross-model delegation.
argument-hint: <the objective you want to pin down and plan>
allowed-tools: [Read, Write, Edit, Glob, Grep, Bash, TaskCreate, TaskGet, TaskList, TaskUpdate, WebFetch, WebSearch]
---

# /goal — Goal-setting & lightweight plan

Turn `$ARGUMENTS` into a crisp, testable goal and a short plan. This is the fast, in-session sibling of `/wwkd`: use `/goal` to frame an objective before diving in; escalate to `/wwkd` when the work needs a full data-walk and end-to-end skeleton, or to `/xbgst` (`/godspeed`) when it needs a Pareto-walking team.

## Step 1 — Parse the objective

```
$ARGUMENTS
```

If empty, ask the user for one sentence describing what they want to achieve, then continue. If present, do NOT ask clarifying questions — infer sensible defaults and state them explicitly in the output so the user can correct them.

## Step 2 — Ground it (cheap, optional)

If the objective refers to this repo or codebase, spend one or two cheap probes to anchor reality before writing criteria:

```bash
git rev-parse --show-toplevel 2>/dev/null && git status -sb | head
```

Use `Glob`/`Grep` only if a specific file or symbol is named. Do not do a full survey — that is `/wwkd`'s job.

## Step 3 — Emit the goal artifact

Produce exactly this structure:

```
GOAL
  objective:    <one sentence, outcome-framed, not task-framed>
  success when: <2–4 observable, checkable conditions>
  constraints:  <hard limits: time, deps, compat, must-not-break>
  non-goals:    <what is explicitly out of scope this pass>
  assumptions:  <every default you inferred, so the user can veto>

PLAN (ordered, smallest-first)
  1. <first move — cheapest thing that de-risks the biggest unknown>
  2. <next>
  3. <next>
  ...

FIRST CHECK
  <the single fastest signal that tells you the plan is on track or wrong>
```

Keep it under ~200 words. Each success condition must be something you could later verify with a command, a test, or a direct observation — no vague "works well".

## Step 4 — Offer the handoff

End with one line naming the natural next step, e.g. "Run this now, or escalate to `/wwkd` for a full skeleton / `/godspeed` for a team Pareto walk." Do not start executing the plan unless the user says go.
