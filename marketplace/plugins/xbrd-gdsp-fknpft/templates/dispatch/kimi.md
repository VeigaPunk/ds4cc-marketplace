# Dispatch to Kimi — Inter-Model Protocol v0.2
# Minimal blocks, inline status tags, ship the artifact
# Transport: native Kimi Code CLI one-shot (`kimi -m <alias> -p`).
# OAuth (default): kimi-code/* via managed:kimi-code. Pay-as-you-go: moonshotai/*.
# Do not wrap this lane in a Codex -p profile (no public /v1/responses).

# Goal
{{QUERY}}

# Thinking: ON
# Effort: {{EFFORT}}
# kimi-cli has no --effort flag. K3 uses low|high|max in this envelope.
# K2.7 Coding Highspeed has no effort tier; thinking stays on via always_thinking
# and kimi-code [thinking].enabled. Do not drop Thinking: ON.

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
