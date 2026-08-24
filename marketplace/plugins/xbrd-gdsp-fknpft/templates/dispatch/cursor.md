# Dispatch to Cursor — Inter-Model Protocol v0.2
# Minimal blocks, inline status tags, ship the artifact
# Transport: cursor-agent one-shot (`cursor-agent -p --output-format text --model <cli-id>`).
# Pin explicit Cursor CLI-ids only. Never `auto`. Never argv0 `agent`.

# Goal
{{QUERY}}

# Effort: {{EFFORT}}
# cursor-agent has no native --effort flag on this lane; effort is envelope-text.
# Cursor-pool Grok ids embed tier in the CLI-id (cursor-grok-4.6-high-fast, etc.).

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
