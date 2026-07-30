# xask protocol reference

> Contamination-aware template dispatch for cross-model orchestration.  
> All dispatches route through `xbreed ask` — clean suppression, loadout injection, auth cascade, and godspeed forwarding are always-on.

---

## 1. Synopsis

```
xask [-d] [-scp <scope>] [-r] [--spk] [-R] [-F] [--gpt55] [--gs] [-e <level>] [-o <file>] [--json] <model> "<query>" ["<context>"] ["<skill>"]
```

`<model>` is `gemma` (alias `g`; legacy alias `gemini`) or `codex`. Gemma aliases route to the local HVM bridge. (`claude` dispatch was removed in R2-A5.)
`<context>` defaults to `"No prior context."`.  
`<skill>` defaults to `"godspeed"`.

---

## 2. Flag dictionary

| Long form | Short | Description | Models | Default |
|-----------|-------|-------------|--------|---------|
| `--debug` | `-d` | Print constructed prompt and exit (dry run). Matches gemini's own `-d/--debug`. | all | `false` |
| `--scope` | `-scp` | Scope boundary injected into `{{SCOPE_BOUNDARY}}` in the dispatch template. | all | `"entire project"` |
| `--rich` | `-r` | Accepted for compatibility; ignored by the local Gemma/HVM lane. | gemma aliases | `false` |
| `--spark` | `--spk` | Pin codex to `gpt-5.4-mini` + `model_reasoning_effort=low`. Bare `xask codex` selects this route unless effort/review/full/gpt55 selects another lane. Spark wins when combined. | codex | structural default |
| `--effort` | `-e` | One of `low`, `medium`, `high`, `xhigh`. Codex: native `model_reasoning_effort`; Gemma aliases: advisory `thinkingBudget` prompt text. | codex + gemma aliases | unset |
| `--direct` | — | **Removed in R2.** No longer accepted — xask hard-fails at the flag parser (`*) echo ... exit 1`). Suppression is always-on; use `--effort` to control reasoning level. | — | — |

### `--effort` per-model mapping

| Model | Maps to |
|-------|---------|
| `codex` | `-c model_reasoning_effort=<level>` (config key, not a flag) |
| `gemma`, `g`, `gemini` | Advisory prompt text: `low=512`, `medium=4096`, `high=8192`, `xhigh=16384`, rendered by `templates/dispatch/gemma.md`. |

Both xask and direct `xbreed ask` reject effort values outside `low`, `medium`, `high`, `xhigh`.

---

## 3. Built-in behaviors (always-on, not user-exposed)

These are injected by xask/xbreed regardless of user flags.

### Local Gemma/HVM

| Behavior | Mechanism | Why |
|----------|-----------|-----|
| Local bridge dispatch | `xbreed ask gemma` | Routes `gemma`, `g`, and legacy `gemini` to one HVM lane |
| Prompt loadout prepend | Gemma dispatch adapter | Carries skills without cloud-CLI state |

### Codex

| Behavior | Mechanism | Why |
|----------|-----------|-----|
| `approval_policy="never"` | `build_codex_ask_with_loadout` | Prevents an impossible interactive prompt in headless mode |
| `--sandbox workspace-write` | `build_codex_ask_with_loadout` | Bounds delegated writes to the caller's workspace instead of the whole host |
| `--skip-git-repo-check` | `build_codex_ask_with_loadout` | Avoids repo detection noise in headless dispatch |
| `-c include_permissions_instructions=false` | `build_codex_ask_with_loadout` | Suppression |
| `-c include_apps_instructions=false` | `build_codex_ask_with_loadout` | Suppression |
| `-c include_environment_context=false` | `build_codex_ask_with_loadout` | Suppression |
| `-c features.fast_mode=true` | `build_codex_ask_with_loadout` (all Codex lanes) | Faster output on both the spark lane (`gpt-5.4-mini`) and non-spark lanes (`gpt-5.6-sol`) |
| `-c model_reasoning_effort=low` | `build_codex_ask_with_loadout` (spark only) | Hard-wired to low on spark path |

**Note (v0.120.0):** `include_skills_instructions` and `include_plugins_instructions` are not available in the current codex release — no further suppression keys exist.

### All models

| Behavior | Mechanism | Why |
|----------|-----------|-----|
| `\| godspeed` appended to prompt | xask line 71-73 | Forwards godspeed posture through text for codex-exec paths where no `--with` skill mechanism exists |
| Loadout injection via `--with <skill>` | `xbreed ask` Rust layer | Injects skill files (e.g. `godspeed`) via model-native mechanism (see dispatch table) |

---

## 4. Model dispatch table

| Model | xask routes to | Rust function | Loadout injection method |
|-------|---------------|---------------|--------------------------|
| `gemma`, `g`, `gemini` (legacy) | `xbreed ask gemma` | local Gemma/HVM dispatch | Prompt prepend: `<loadout>\n\n---\n\n<prompt>` |
| `codex` | `xbreed ask codex` | `build_codex_ask_with_loadout` + `dispatch` | `-c developer_instructions=<toml-quoted-string>` |

### Gemma model

The `gemma`, `g`, and legacy `gemini` spellings all route to the local Gemma/HVM bridge; no cloud Gemini route remains.

### Codex model

Bare `xask codex` structurally selects Spark: `gpt-5.4-mini` + `model_reasoning_effort=low`. Direct bare `xbreed ask codex` retains its separate Rust-layer default.
Review lane (`-R/--review`): `gpt-5.6-sol` + `features.fast_mode=true`.
Full (`-R -F`): `gpt-5.6-sol` (1.05M ctx) + `features.fast_mode=true` — escape hatch.
gpt-5.6-sol lane (`--gpt55`): `gpt-5.6-sol` + `features.fast_mode=true` — every role route uses `-e low`; only the native planner retains high effort outside this lane.
Spark (`--spark`): `gpt-5.4-mini` + `model_reasoning_effort=low` (fast_mode enabled).

Precedence: `--spark` > `--gpt55` > `-R -F` > `-R` > default.

---

## 5. Auth

### Local Gemma/HVM

The local bridge owns its runtime setup; xask does not use Gemini OAuth or API keys.

### Codex — ChatGPT OAuth

```
codex login
```

Requires a ChatGPT Plus/Pro/Enterprise subscription. xbreed does not manage codex OAuth.

### Claude — claude login

```
claude login
```

xbreed does not manage Claude auth.

---

## 6. Naming convention

Agent and teammate names use a prefix that signals where reasoning lives:

| Prefix | Target model | Examples |
|--------|-------------|---------|
| `g-` | Local Gemma/HVM | `g-scout-research`, `g-connector-axes` |
| `cdx-` | Codex | `cdx-executor-docs` (`openai/gpt-5.4-mini`, Codex Spark only), `cdx-labrat-probe`, `cdx-reviewer-security` |
| `ccs-` | Claude Code (Sonnet) | `ccs-simplifier-refactor` |
| `cco-` | Claude Code (Fable 5, effort: high — LOCKED; unified 2026-04-19 — the-judge now also runs at high, downgraded from xhigh) | `cco-judge`, `cco-distiller` |

The prefix identifies the execution or delegation target. The executor itself is pinned to `openai/gpt-5.4-mini` / Codex Spark; other roles may run in Claude and delegate by prefix. A `g-scout-*` agent may call `xask gemma` (or `xask g`; `xask gemini` remains legacy-compatible).

---

## 7. Self-referential findings (probe: 2026-04-16)

Findings from gemini and codex probing their own CLI behavior — surfaced during a 2026-04-16 multi-model flag audit.

### Gemini self-report

- **Skill activation is LLM-native** — gemini uses an `activate_skill{}` tool call to load skills; the mechanism is inside the model, not a CLI flag. xbreed's loadout injection (prompt prepend) covers this path.
- **`--approval-mode yolo` required** — without it, gemini hangs on stdin waiting for tool call approval. Already always-on via `build_gemini_with_auth`.
- **OAuth active, API key fallback functional** — cascade works as documented. OAuth users with Gemini 3.1 get customtools routing automatically.
- **`-o/--output-format text|json|stream-json`** — available for structured headless output; not currently exposed via xask. Candidate future flag. Parallel to codex's `--json` + `-o/--output-last-message`.
- **`--include-directories`** — workspace expansion flag; `xask --rich` is the current workaround (mutates `includeDirectoryTree` in settings.json).
- **`-m/--model` override** — available but hardcoded in xbreed to `gemini-3.1-pro-preview`; not user-exposed via xask.

### Codex self-report (from `xask --spark codex` + `codex exec --help` + `src/ask.rs` direct read)

- **`features.fast_mode=true` confirmed** — correct key on every Codex path. Spark uses `gpt-5.4-mini`, hard-wires `model_reasoning_effort=low`, and enables fast mode.
- **Effort is a `-c` config key, not a CLI flag** — codex exec has no `--effort` flag; xbreed maps `--effort <level>` → `-c model_reasoning_effort=<level>` (confirmed `src/ask.rs:407`).
- **Validated effort levels**: `low`, `medium`, `high`, `xhigh`. Level `none` not validated by xbreed; may fail at codex runtime.
- **`-e` shell alias gap (now closed)** — xask previously only parsed `--effort` long form; `xbreed ask` Rust CLI already had `-e`. Shell-layer parity restored by this update.
- **No additional suppression keys** — `include_skills_instructions` / `include_plugins_instructions` not available in v0.120.0.
- **Unused headless flags (candidates)**: `--ephemeral` (no session persistence), `--json` (JSONL event stream), `-o/--output-last-message` (write final response to file). Not currently exposed via xask.

### Alias shadow warnings

> **Flag namespace boundary:** xask short aliases are consumed by the xask shell layer and are **never forwarded to the underlying CLI**. The native gemini `-s/-r/-e` flags remain inaccessible through xask by design. If you need a gemini-native flag not exposed by xask, call `xbreed ask gemini` directly.

These xask short aliases shadow gemini's own native flags. There is **no runtime conflict**, but users should be aware of the cognitive collision if they also use the gemini CLI directly:

| xask alias | Shadows gemini flag | gemini meaning | Applies to gemini path? |
|------------|--------------------|----|---|
| `-scp` | none | Scope boundary | Yes (xask layer) |
| `-r` | `-r/--resume` | Resume a prior session | No (rich mode is xask-layer) |
| `-e` | `-e/--extensions` | Load extension files | Yes as advisory prompt metadata on Gemma aliases |
| `-d` | `-d/--debug` | Debug output (same semantics ✓) | Yes — debug is xask-layer, model-agnostic |
