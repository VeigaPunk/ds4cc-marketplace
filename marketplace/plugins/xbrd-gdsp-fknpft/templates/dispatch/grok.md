# Dispatch to Grok — Inter-Model Protocol v0.2
# Minimal blocks, inline status tags, ship the artifact
# Transport: grok oneshot (`grok --always-approve --no-subagents --verbatim -p`)

# Goal
{{QUERY}}

# Effort: {{EFFORT}}

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
