---
name: agent-model-selector
description: Interactively configure any OpenCode agent's model and supported thinking effort. Use when the user asks to choose, switch, assign, or pin a model or reasoning variant for an agent.
compatibility: OpenCode 1.18 or newer
---

# OpenCode Agent Model Selector

Configure exactly one agent per invocation. Selection menus are the requested
interface, not ambiguity-driven clarification. Never guess an agent, model, or
effort.

## 1. Guard and discover

1. Require the `opencode` executable. If it is unavailable, stop without
   writing and explain that this workflow is OpenCode-specific.
2. Run `opencode agent list` and use every returned effective agent as the
   agent menu. Do not hard-code agent names.
3. Run `opencode models --verbose`. Each plain `provider/model` line begins a
   model record and the following JSON object describes that model. Build the
   model menu from those live IDs. Read the selected record's `variants` keys
   to build the effort menu. Do not infer variants from another model.
4. Locate definitions and precedence before offering a write target:
   - project Markdown: `.opencode/agent/<name>.md` and
     `.opencode/agents/<name>.md`;
   - global Markdown: `${XDG_CONFIG_HOME:-$HOME/.config}/opencode/agent(s)/<name>.md`;
   - project config: `opencode.json`, `opencode.jsonc`, or
     `.opencode/opencode.json[c]`;
   - global config: `${XDG_CONFIG_HOME:-$HOME/.config}/opencode/opencode.json`.
   Project definitions override global definitions. Report shadowed copies and
   edit the effective Markdown definition by default.

## 2. Ask through menus

Use the `question` tool for these choices, in order:

1. **Agent** — every effective agent from `opencode agent list`.
2. **Model** — every live `provider/model` ID from `opencode models --verbose`.
3. **Thinking effort** — only keys in that model's `variants` object. Also
   offer **Provider default (no variant)**. If `variants` is empty, select the
   provider default and do not invent an effort.
4. **Scope**, only when a built-in or inline/config-defined agent needs an
   override — project or global.

If `question` is unavailable, print the same choices as numbered lists and
stop for a numbered reply. Never silently select the first item. Cancellation
at any menu exits without a write.

## 3. Resolve the mutation

- **Effective Markdown agent:** update only top-level YAML `model:` and
  `variant:` fields inside the existing frontmatter. Preserve all other
  frontmatter, comments, ordering where practical, and the body byte-for-byte.
- **Built-in or config-defined agent:** add or update only
  `agent.<name>.model` and `agent.<name>.variant` in the selected JSON/JSONC
  config. Create the narrowest valid override and preserve `$schema`, comments,
  trailing commas, and unrelated keys. Never replace the whole config object.
- Write `model` as the exact `provider/model` ID.
- For **Provider default**, remove a stale `variant` field instead of writing
  `null`, an empty string, or a guessed effort.
- Use OpenCode's `variant` field; do not write provider-specific
  `reasoningEffort` options.

If the agent prompt or repository routing policy pins a model or effort, show
the conflicting text. Permit the override only after a separate second
confirmation; do not rewrite the prompt or policy.

## 4. Preview, confirm, and write safely

Show the selected agent, exact target path, prior and new model/variant, source
scope, shadowing notes, and the exact diff. Ask for confirmation with the
`question` tool. A negative or missing answer means no write.

Immediately before editing, re-read the target and compare it with the version
used for the preview. Abort if it changed. Apply one atomic replacement in the
same directory; do not touch unrelated files.

## 5. Verify

1. Re-run `opencode agent list` and ensure it succeeds.
2. Confirm the target contains the exact selected `model` and either the exact
   supported `variant` or no variant for provider default.
3. Re-run `opencode models --verbose` and confirm the selected model still
   exists and the selected variant is still a key in its own record.
4. Report the changed path and concise before/after values. Tell the user to
   quit and restart OpenCode because configuration is loaded at startup.

If validation fails, report it prominently; never claim the configuration is
active merely because the file write succeeded.
