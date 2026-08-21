# xask protocol reference

> Contamination-aware template dispatch for cross-model orchestration.  
> Stock Gemma/Codex lanes route through `xbreed ask`. Grok and Token Plan lanes bash-exec native CLIs (with `CODEX_BIN` / `XBRD_SPARK_MODEL` cleared).

---

## 1. Synopsis

```
xask [-d] [-scp <scope>] [-r] [--spk] [-R] [-F] [--gpt55] [--model-id <id>] [--gs] [-e <level>] [-o <file>] [--json] <model> "<query>" ["<context>"] ["<skill>"]
```

`<model>` is one of:
- `gemma` (alias `g`; legacy `gemini`) — local HVM bridge via `xbreed ask gemma`
- `codex` / `cdx` — stock ChatGPT Codex via `xbreed ask codex` (`cdx` is an alias)
- `grok` — Grok Build oneshot CLI (`grok --always-approve --no-subagents --verbatim -p`)
- `qwen38` (aliases `qwen3.8-max`, `qwen`) — Token Plan via `codex-qwen38` / `codex-token-plan`
- `ds-flash` / `ds-pro` — Token Plan DeepSeek profiles (bare `deepseek` rejected)

(`claude` dispatch was removed in R2-A5.)
`<context>` defaults to `"No prior context."`.  
`<skill>` defaults to `"godspeed"`.

---

## 2. Flag dictionary

| Long form | Short | Description | Models | Default |
|-----------|-------|-------------|--------|---------|
| `--debug` | `-d` | Print constructed prompt and exit (dry run). Matches gemini's own `-d/--debug`. | all | `false` |
| `--scope` | `-scp` | Scope boundary injected into `{{SCOPE_BOUNDARY}}` in the dispatch template. | all | `"entire project"` |
| `--rich` | `-r` | Accepted for compatibility; ignored by the local Gemma/HVM lane. | gemma aliases | `false` |
| `--spark` | `--spk` | Pin codex/cdx to `gpt-5.4-mini` + `model_reasoning_effort=low`. Bare `xask codex`/`cdx` selects this route unless effort/review/full/gpt55 selects another lane. Rejected with `grok`/`qwen38`/`ds-flash`/`ds-pro`. | codex, cdx | structural default |
| `--model-id` | — | Select an exact Codex or local Gemma model ID. Cannot be combined with built-in lane flags. | codex + gemma aliases | unset |
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

| Model | xask routes to | Backend | Loadout / notes |
|-------|---------------|---------|-----------------|
| `gemma`, `g`, `gemini` (legacy) | `xbreed ask gemma` | local Gemma/HVM (`ask.rs`) | Prompt prepend loadout |
| `codex`, `cdx` | `xbreed ask codex` | stock ChatGPT Codex (`ask.rs`) | `-c developer_instructions=…`; `cdx` alias keeps `DISPATCH_MODEL=codex` |
| `grok` | `env -u CODEX_BIN -u XBRD_SPARK_MODEL grok --always-approve --no-subagents --verbatim -p` | Grok Build CLI | Template `templates/dispatch/grok.md`; no xbreed ask |
| `qwen38` (`qwen3.8-max`, `qwen`) | `env -u … codex-qwen38 exec …` (or `codex-token-plan qwen38`) | Alibaba Token Plan | Reuses `codex.md` template; no `service_tier=fast` |
| `ds-flash`, `ds-pro` | `env -u … codex-ds-* exec …` | Alibaba Token Plan | Debug + live wrappers; bare `deepseek` rejected |

### Gemma model

The `gemma`, `g`, and legacy `gemini` spellings all route to the local Gemma/HVM bridge; no cloud Gemini route remains.

### Codex / cdx model

Bare `xask codex` and `xask cdx` structurally select Spark: `gpt-5.4-mini` + `model_reasoning_effort=low`. Direct bare `xbreed ask codex` retains its separate Rust-layer default.
Review lane (`-R/--review`): `gpt-5.6-sol` + `features.fast_mode=true`.
Full (`-R -F`): `gpt-5.6-sol` (1.05M ctx) + `features.fast_mode=true` — escape hatch.
gpt-5.6-sol lane (`--gpt55`): `gpt-5.6-sol` + `features.fast_mode=true` — every role route uses `-e low`; only the native planner retains high effort outside this lane.
Spark (`--spark`): `gpt-5.4-mini` + `model_reasoning_effort=low` (fast_mode enabled).

Precedence: `--model-id` is an exclusive exact-model route; otherwise
`--spark` > `--gpt55` > `-R -F` > `-R` > default.

### Grok / Token Plan isolation

Parent shells may export `CODEX_BIN=codex-titanium`. Grok and Token Plan execs always run under `env -u CODEX_BIN -u XBRD_SPARK_MODEL`. Debug (`-d`) prints `MODEL`, `LANE`, `ARGV`, and `CODEX_BIN_SET=0` for these lanes (and for `cdx`) before the constructed prompt.

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
