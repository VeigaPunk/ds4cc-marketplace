# Dispatch to Kimi (Moonshot AI) — Inter-Model Protocol v0.2
# Minimal blocks, inline status tags, ship the artifact
# Transport: kimi-code one-shot (`kimi -m <alias> -p`; Moonshot OpenAI-compatible API)

# Goal
{{QUERY}}

# Effort: {{EFFORT}}
# kimi-cli exposes no reasoning-effort flag; this tier is advisory context.
# K3 honors low|high|max natively per its model catalog entry.

# Scope boundary
{{SCOPE_BOUNDARY}}

# State
{{CONTEXT}}

---
# Response instructions
Use only the sections you need. Available: # Goal, # State, # Unknowns, # Action, # Artifact: <type>

Inline status tags on claims:
- obs: (observed), inf: (inferred), asm: (assumed), risk: (potential failure)
- Confidence: certain | strong | moderate | weak | speculative

Keep it minimal. Ship the artifact. If blocked, name the blocker under # Unknowns.
