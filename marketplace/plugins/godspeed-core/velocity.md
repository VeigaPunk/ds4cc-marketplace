# Velocity Half — Iteration at Speed

> Origin: godspeed-mode handoff summary (2026-04-08), attack-loop spec for AutoAgent.

## Core principle

Cheap stubs over expensive perfection. Catalog bootstrap before generative search. Parallel over serial. Auto-record everything.

## Godspeed properties

1. **Catalog bootstrap** — pre-built variants produce the initial frontier in one batch run, no LLM thinking required for the first phase. Start with what you already know before spending compute on what you don't.

2. **Cheap stubs** — an instrumented stub that logs reads/edits (~1 second per invocation) instead of running the real pipeline (~5 minutes). You iterate on the search structure, not the full pipeline, until the search structure has proven itself.

3. **Parallel-able** — each variant is independent. Run 4-8 in parallel. Don't serialize what could batch.

4. **Auto-recording** — the wrapper updates results and frontier state without manual bookkeeping. If recording is manual, you'll skip it when moving fast. If it's automatic, velocity and observability don't trade off.

5. **Auto-frontier dominance check** — the wrapper computes which variants are still on the frontier. No manual curation. The frontier reveals itself.

## Build sequence pattern

The velocity half implies a specific ordering for any new system:

1. Build the cheapest possible stub of the expensive component
2. Build the variant catalog (pre-built, no generation needed)
3. Build the parallel runner
4. Build the auto-recording wrapper
5. Test one iteration manually
6. Run the full catalog in parallel (Phase 1)
7. Hand off to generative search (Phase 2)
8. Stop when frontier saturates or external boundary

Steps 1-5 are setup. Step 6 is where the frontier appears. Step 7 is where it walks. Step 8 is where it stops.

## The trust

"Trust the process and the iterations." This is not a platitude — it's an operational commitment. The velocity half says: you will learn more from running 12 cheap variants than from thinking carefully about which 1 variant to run. The information is in the iteration, not in the deliberation.

Stop conditions are emergent (frontier saturates) or external (ethical / scope cut). Never pre-specified.
