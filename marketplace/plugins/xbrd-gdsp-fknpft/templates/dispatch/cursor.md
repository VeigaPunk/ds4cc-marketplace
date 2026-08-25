# Dispatch to Cursor — Inter-Model Protocol v0.2
# Minimal blocks, inline status tags, ship the artifact
# Transport: cursor-agent agentic burn (`cursor-agent -p --trust --output-format text --model <cli-id> --workspace <ws> -- "<prompt>"`).
# `-p` with no `--mode` is write+shell. `--trust` skips Workspace Trust Required.
# Never `--mode ask`. Never `--yolo` / `-f`. Never `auto`. Never argv0 `agent`.
# Default pin: kimi-k3-max.

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
