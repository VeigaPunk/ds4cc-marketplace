# Dispatch to Cursor — Inter-Model Protocol v0.2
# Minimal blocks, inline status tags, ship the artifact
# Transport: cursor-agent consult (`cursor-agent -p --mode ask --trust --output-format text --model <cli-id> --workspace <ws> -- "<prompt>"`).
# `--mode ask` is read-only Q&A. `--trust` skips Workspace Trust Required and is only
# paired with ask on this lane. Never `--yolo` / `-f`. Never `auto`. Never argv0 `agent`.
# Full-agent execution is xbgst-cursor-agent-surface (`-p --trust`, no `--mode ask`).

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
