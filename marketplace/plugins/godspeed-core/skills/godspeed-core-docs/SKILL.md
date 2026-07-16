---
name: godspeed-core-docs
description: Apply Godspeed adaptive execution doctrine and Pareto walk policy.
---

Godspeed Core exposes the directive, filter, and velocity policy files.

## Read the directive

```bash
cat directive.md
```

## Inspect the Pareto filter

```bash
cat filter.md
```

## Inspect velocity policy

```bash
cat velocity.md
```

## Apply Godspeed mode to current session

```bash
codex "godspeed: <your task>"
```

## Run with explicit godspeed posture

```bash
codex exec --config approval_policy=never "godspeed: name axes, iterate cheap, keep only Pareto moves"
```
