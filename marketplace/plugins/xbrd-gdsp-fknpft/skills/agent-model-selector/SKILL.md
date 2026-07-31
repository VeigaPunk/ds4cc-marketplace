---
name: agent-model-selector
description: Interactively change local xbrd-gdsp-fknpft agent delegation models and thinking effort. Use when selecting or overriding the model route for an xbreed agent.
---

# Local xbreed delegation selector

This skill configures xbrd-gdsp-fknpft agent delegation commands. It must not
read or edit OpenCode agents, `opencode.json`, or OpenCode model settings.

## Discover

1. Locate the xbrd-gdsp-fknpft repository and its `templates/agents/*.md`.
2. Discover installed local definitions under `${XBREED_AGENTS_DIR:-$HOME/.claude/agents}`.
3. Build the agent menu from xbreed's agent templates. For each agent, inspect
   its actual `xask` command and classify it as:
   - configurable: contains an automatic `xask` delegation;
   - native: has no automatic cross-model delegation;
   - locked: its prompt explicitly forbids changing the route.
4. Discover model IDs rather than hard-coding them:
   - Codex: read `${CODEX_HOME:-$HOME/.codex}/models_cache.json` when present and include the
     current `config/models.yaml` Codex default;
   - local Gemma/Ollama: run `ollama list` and include the current
     `config/models.yaml` Gemma default.
5. Accept only model IDs matching `[A-Za-z0-9._:/+-]+`. Reject whitespace,
   shell metacharacters, leading dashes, and control characters before preview.

Native and locked agents remain visible, but refuse a no-op or invariant-
breaking write and explain the governing line.

## Select interactively

Use the `question` tool for these requested choices:

1. xbreed agent;
2. transport: `codex` or local `gemma`;
3. exact discovered model ID;
4. effort: `low`, `medium`, `high`, or `xhigh`.

For Gemma, label effort as advisory prompt budget. If `question` is
unavailable, present identical numbered menus and stop for a numbered reply.
Never choose silently. Cancellation writes nothing.

## Local target

The default mutation target is the selected installed agent file under
`${XBREED_AGENTS_DIR:-$HOME/.claude/agents}`. Local configuration must not
rewrite repository routing documentation.

- If the installed file is absent, copy its repository template first.
- If it is a symlink into the repository, replace the symlink with a local
  regular-file copy before editing so the repository default remains intact.
- Preserve frontmatter and unrelated prompt text byte-for-byte.
- Change only the operative default `xask` delegation command for the selected
  agent. Remove conflicting lane flags (`--spark`, `--gpt55`, `--review`,
  `--full`) and write:

```text
xask --model-id <exact-model-id> --effort <level> --gs <codex|gemma> "<existing prompt>"
```

Keep existing scope, output, JSON, context, prompt, and Godspeed suffix
arguments. Do not change examples or historical prose that are not operative
instructions. If more than one operative delegation exists, show each and ask
which route to change.

Construct the replacement as shell tokens, not string concatenation. Quote the
validated model and prompt arguments with a shell-safe encoder such as
`printf %q`; never paste untrusted model text into executable syntax.

## Preview and apply

Show agent, target path, transport, model, effort, and exact diff. Confirm with
the `question` tool. Re-read the file immediately before writing and abort if
it changed. Write atomically in the same directory and preserve permissions.

## Verify

1. Run `xask --debug --model-id <model> --effort <effort> <transport> probe`
   and confirm `MODEL_ID`, `EFFORT`, transport, and `SPARK: false`.
2. Re-read the installed agent and confirm its operative command contains the
   exact selected route once, with no conflicting lane flag.
3. Report that this is a local override; repository defaults and other agents
   are unchanged. A new agent session may be required to load the file.
