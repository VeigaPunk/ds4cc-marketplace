---
name: network-auditor
description: Invoke the network-auditor agent to audit current network settings, spawn a labrat swarm for empirical probes, and run a mutation-tester for adversarial config validation. Trigger when the user asks for a network audit, connectivity diagnosis, proxy/routing/DNS review, or wants to empirically test network options.
user-invocable: true
---

# Network Auditor

Invokes the `network-auditor` agent to audit current network configuration empirically.

## What it does
1. Snapshots current network state (interfaces, routes, DNS, proxies, firewall, listening ports).
2. Names the audit axes (latency, throughput, DNS reliability, proxy correctness, security, MTU, failover, privacy).
3. Spawns a **labrat swarm** (up to 12 parallel probes) to test each axis empirically.
4. Spawns a **mutation-tester** to adversarially validate proposed config changes in isolated worktrees.
5. Returns a Pareto-optimal recommendation set with concrete commands and rollback steps.

## How to invoke

As a user-invoked command from the command palette:

```
user:network-auditor
```

Or spawn it explicitly in a team context:

```
Agent(
  subagent_type="network-auditor",
  name="ccs-network-auditor",
  model="sonnet",
  prompt="Audit all current network settings. Focus on: <optional focus>. Run labrat swarm and mutation tester. Report Pareto-optimal moves."
)
```

## Safety notes
- All mutation-tester runs use isolated worktrees or temp config copies.
- No persistent network changes are applied unless the user explicitly approves the final DRAFT.
- The agent may probe external endpoints (e.g., 1.1.1.1, google.com) — ensure this is allowed in the current environment.

## Output format
The agent emits a DRAFT with:
- Baseline snapshot
- Labrat findings
- Mutation score
- Pareto-optimal moves
- Implementation sketch + rollback plan
