# OpenAI model benchmark v1

The harness benchmarks every visible model and model-specific reasoning effort in
the Codex catalog. It also adds fixed `xask` and `xbreed` control cells for the
wrapper routes those tools can actually represent.

## Axes

- external invocation latency, including CLI startup and teardown
- provider-reported output tokens per invocation second
- input, cached-input, cache-write-input, output, and reasoning-output tokens
- first-attempt and final success rates, failures, timeouts, parse failures, and retries
- p50/p90 first-attempt invocation latency by route/model/effort
- requested route/model/effort, executable provenance, and artifact integrity

TTFT, TPOT, and decode tok/s are deliberately `null`. Buffered `xask`/`xbreed`
cannot expose them, and completed-item Codex JSONL does not provide incremental
token events.

## Plan first: no inference calls

The default command reads the bundled model catalog, builds a deterministic
randomized schedule, and writes artifacts without sending any prompt:

```bash
scripts/bench-openai-models.sh --seed 42 --routes raw,xask,xbreed
```

Use `--refresh-catalog` to read the current/refreshed catalog instead. Catalog
discovery is not an inference call, but the refreshed form may contact the
service. Inspect `summary.json`, `schedule.json`, and `scheduled-count.txt`
before authorizing a live run.

## Live execution

Live execution requires four matching controls:

1. `--run`
2. `BENCH_ALLOW_PAID=YES`
3. `BENCH_APPROVE_TRIALS=<exact value from scheduled-count.txt>`
4. `BENCH_APPROVE_ATTEMPTS=<exact retry-inclusive value from max-paid-attempts.txt>`

Example after a dry run reports 100 trials:

```bash
BENCH_ALLOW_PAID=YES BENCH_APPROVE_TRIALS=100 BENCH_APPROVE_ATTEMPTS=100 \
  scripts/bench-openai-models.sh \
  --run --seed 42 --routes raw --timeout-seconds 300
```

Repetitions and retries multiply potential paid attempts and are capped:

```bash
scripts/bench-openai-models.sh --seed 42 --routes raw --repetitions 3
```

Custom prompt directories are blocked for live runs unless explicitly enabled
with `--allow-custom-prompts` or `BENCH_ALLOW_CUSTOM_PROMPTS=YES`.

## Routes

### `raw`

Every visible catalog model is crossed only with its own advertised reasoning
levels:

```bash
fnm exec --using=<node-version> codex exec \
  --json --ephemeral --sandbox workspace-write \
  -c service_tier=fast -c features.fast_mode=true \
  -m <model> -c model_reasoning_effort=<effort> <prompt>
```

FNM selects the Node runtime. Codex `-m/--model` selects the OpenAI model.
The raw lane requests the same fast service configuration used by the wrapper
controls; backend fulfillment still remains provider-controlled.

### `xask` and `xbreed`

Wrappers are not crossed with arbitrary catalog models. Their control cells are:

- `gpt-5.4-mini/low` through the Spark lane
- `gpt-5.6-sol/{low,medium,high,xhigh}` through the gpt55 lane

This prevents a fixed wrapper model from being mislabeled as an arbitrary
catalog model.

## Workloads

Versioned synthetic fixtures live in
`benchmarks/openai-model-v1/prompts/v1/`:

- `latency.md`: one bounded response
- `throughput.md`: deterministic long generation, integers 0001–0512
- `structured.md`: exact JSON
- `reasoning.md`: exact arithmetic answer

Only trusted, non-sensitive fixtures should be used. Prompt and response bytes
are provided to an agentic CLI. Each attempt runs from a fresh private workspace,
but the raw output artifacts must still be treated as sensitive.

## Metric definitions

`duration_s` is measured around the complete target invocation with
`Time::HiRes::CLOCK_MONOTONIC`.

```text
goodput_tok_s = provider output_tokens / invocation duration_s
```

This is named `reported_output_tokens_per_invocation_second`; it is not decode
throughput. Summaries contain:

- all attempts and first-attempt status counts
- final success/failure after retries
- successful-only ratio-of-sums throughput
- retry-inclusive accepted ratio-of-sums throughput
- p50/p90 first-attempt invocation latency
- per-cell and global totals

Missing or malformed terminal usage is a `parse_failure`, never zero usage.
Exhausted live failures make the runner exit nonzero while retaining artifacts.

## Artifacts

Runs default to:

```text
${XDG_STATE_HOME:-$HOME/.local/state}/xbrd-gdsp-fknpft/openai-model-v1/run.XXXXXX/
```

Important files:

- `catalog.json`
- `scheduled-count.txt`
- `max-paid-attempts.txt`
- `schedule.json`
- `manifest.json`
- `attempts.jsonl`
- `summary.json`
- `sha256-index.json`
- `evidence-sha256.json`, covering prompt copies and every per-attempt evidence file
- per-attempt private stdout/stderr and normalized attempt records

The run directory is mode 0700 and prompt copies are mode 0600. Normalized
records contain redacted argv; exact prompt text is not duplicated into the
manifest or attempts JSONL. Executable paths, versions, and SHA-256 values are
recorded as provenance.

## Offline verification

```bash
bash -n scripts/bench-openai-models.sh
bash tests/openai_model_benchmark.sh
```

The test uses fake FNM, Codex, xask, and xbreed executables and makes no network
or paid inference calls.
