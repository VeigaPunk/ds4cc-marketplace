#!/usr/bin/env bash
set -euo pipefail
umask 077

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPT="$REPO_ROOT/scripts/bench-openai-models.sh"
FIXTURE="$REPO_ROOT/benchmarks/openai-model-v1/fixtures/catalog-real-schema.json"
PROMPTS="$REPO_ROOT/benchmarks/openai-model-v1/prompts/v1"
TMP="$(mktemp -d /tmp/openai-model-bench.XXXXXX)"
trap 'rm -rf "$TMP"' EXIT INT TERM HUP

FAKE_BIN="$TMP/bin"
mkdir -p "$FAKE_BIN" "$TMP/state"

cat > "$FAKE_BIN/fnm" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
perl -MJSON::PP -e 'print JSON::PP->new->canonical->encode({cmd=>"fnm", argv=>\@ARGV})' -- "$@" >> "${CALL_LOG:?}"
case "${1:-}" in
  --version) printf 'fnm 1.0.0\n' ; exit 0 ;;
  current) printf 'v24.18.1\n' ; exit 0 ;;
  exec)
    shift
    if [[ "${1:-}" == --using=* ]]; then shift; fi
    exec "$@"
    ;;
esac
exit 0
EOF

cat > "$FAKE_BIN/codex" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
perl -MJSON::PP -e 'print JSON::PP->new->canonical->encode({cmd=>"codex", argv=>\@ARGV})' -- "$@" >> "${CALL_LOG:?}"
case "${1:-}" in
  --version) printf 'codex 0.1.0\n' ; exit 0 ;;
  debug)
    if [[ "${2:-}" == models ]]; then
      case "${CATALOG_MODE:-real}" in
        empty) printf '{"models":[]}' ;;
        *) cat "${CATALOG_FIXTURE:?}" ;;
      esac
      exit 0
    fi
    ;;
  exec)
    shift
    ;;
esac
prompt="${@: -1}"
case "$prompt" in
  *BAD_USAGE*) printf '{"type":"turn.completed","usage":"oops"}\n' ; exit 0 ;;
  *FAIL_ALWAYS*) exit 7 ;;
  *FAIL_ONCE*)
    key="$(printf '%s' "$prompt" | tr -c 'A-Za-z0-9' '_')"
    nfile="${STATE_DIR:?}/$key"
    n=0
    [[ -f "$nfile" ]] && n=$(<"$nfile")
    n=$((n+1))
    printf '%s' "$n" > "$nfile"
    if [[ $n -eq 1 ]]; then exit 7; fi
    ;;
  *SLOW_TIMEOUT*) trap '' TERM; sleep 10 ;;
esac
printf '{"type":"turn.completed","usage":{"input_tokens":111,"cached_input_tokens":222,"cache_write_input_tokens":333,"output_tokens":444,"reasoning_output_tokens":555}}\n'
exit 0
EOF

cat > "$FAKE_BIN/xask" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
perl -MJSON::PP -e 'print JSON::PP->new->canonical->encode({cmd=>"xask", argv=>\@ARGV})' -- "$@" >> "${CALL_LOG:?}"
printf '{"type":"turn.completed","usage":{"input_tokens":11,"cached_input_tokens":22,"cache_write_input_tokens":33,"output_tokens":44,"reasoning_output_tokens":55}}\n'
exit 0
EOF

cat > "$FAKE_BIN/xbreed" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
perl -MJSON::PP -e 'print JSON::PP->new->canonical->encode({cmd=>"xbreed", argv=>\@ARGV})' -- "$@" >> "${CALL_LOG:?}"
printf '{"type":"turn.completed","usage":{"input_tokens":21,"cached_input_tokens":22,"cache_write_input_tokens":23,"output_tokens":24,"reasoning_output_tokens":25}}\n'
exit 0
EOF

chmod 755 "$FAKE_BIN"/*

write_prompt_dir(){
  local dir="$1"; shift
  mkdir -p "$dir"
  while (($#)); do
    local name="$1" text="$2"
    shift 2
    printf '%s\n' "$text" > "$dir/$name"
  done
}

set -- $PROMPTS/*.md
DEFAULT_PROMPTS_COUNT=$#

check_default_run() {
  local out="$TMP/out-default" log="$TMP/log-default.jsonl"
  mkdir -p "$out"
  env -i \
    PATH="$FAKE_BIN:/usr/bin:/bin" \
    HOME="$TMP/home-default" \
    CALL_LOG="$log" \
    STATE_DIR="$TMP/state" \
    CATALOG_FIXTURE="$FIXTURE" \
    BENCH_OUTPUT_ROOT="$out" \
    BENCH_PROMPT_DIR="$PROMPTS" \
    BENCH_FNM_CMD="$FAKE_BIN/fnm" \
    BENCH_CODEX_CMD="$FAKE_BIN/codex" \
    BENCH_XASK_CMD="$FAKE_BIN/xask" \
    BENCH_XBREED_CMD="$FAKE_BIN/xbreed" \
    bash "$SCRIPT" --seed 17 --routes raw,xask,xbreed --repetitions 1 >/dev/null

  set -- $out/*
  local run="$1"
  [ -d "$run" ]
  [ "$(stat -c '%a' "$run")" = "700" ]
  [ "$(stat -c '%a' "$run/inputs/latency.md")" = "600" ]
  set -- "$run"/attempts/*
  [ "$(stat -c '%a' "$1")" = "700" ]
  [ -f "$run/sha256-index.json" ]
  [ -f "$run/schedule.json" ]
  [ -f "$run/manifest.json" ]
  [ -f "$run/summary.json" ]

  jq -e '.mode == "dry-run" and .planned.scheduled_trials == 76 and .planned.route_counts.raw == 36 and .planned.route_counts.xask == 20 and .planned.route_counts.xbreed == 20' "$run/summary.json" >/dev/null
  jq -e 'any(.trials[]; .route == "raw" and .requested_model == "gpt-5.7-ultra" and .requested_effort == "max") and any(.trials[]; .route == "raw" and .requested_model == "gpt-5.7-ultra" and .requested_effort == "ultra")' "$run/schedule.json" >/dev/null
  jq -e 'all(.trials[]; has("prompt_text") | not)' "$run/manifest.json" >/dev/null
  jq -e 'all(.trials[]; has("prompt_text") | not)' "$run/schedule.json" >/dev/null
  jq -s -e 'all(.[]; .status == "planned" and .ttft_s == null and .tpot_s == null and .decode_tok_s == null and .goodput_label == "reported_output_tokens_per_invocation_second")' "$run/attempts.jsonl" >/dev/null
  jq -s -e 'any(.[]; .command_redacted[-1] == "<PROMPT>")' "$run/attempts.jsonl" >/dev/null
  jq -s -e 'all(.[]; has("prompt_text") | not)' "$run/attempts.jsonl" >/dev/null
  jq -s -e 'any(.[]; .route == "xask" and .lane == "spark" and .requested_model == "gpt-5.4-mini" and .requested_effort == "low")' "$run/attempts.jsonl" >/dev/null
  jq -s -e 'any(.[]; .route == "xbreed" and .lane == "gpt55" and .requested_model == "gpt-5.6-sol" and .requested_effort == "xhigh")' "$run/attempts.jsonl" >/dev/null
  jq -s -e 'any(.[]; .route == "raw" and .requested_model == "gpt-5.7-ultra" and .requested_effort == "max")' "$run/attempts.jsonl" >/dev/null
  jq -s -e 'any(.[]; .route == "raw" and .command_redacted[-1] == "<PROMPT>")' "$run/attempts.jsonl" >/dev/null
  jq -s -e 'all(.[]; .ttft_status == "unavailable_no_incremental_token_events" or .ttft_status == "unavailable_buffered")' "$run/attempts.jsonl" >/dev/null
  jq -s -e 'all(.[]; .cmd != "codex" or (.argv[0] != "exec"))' "$log" >/dev/null

  jq -s -e 'all(.[]; .command_exact_path == null and .command_redacted[-1] == "<PROMPT>")' "$run/attempts.jsonl" >/dev/null
  jq -e '.provenance.fnm.sha256 | length == 64' "$run/sha256-index.json" >/dev/null
  while IFS=$'\t' read -r copy expected; do
    [ "$(sha256sum "$run/inputs/$copy" | cut -d' ' -f1)" = "$expected" ]
  done < <(jq -r '.trials[] | [.prompt_copy,.prompt_hash] | @tsv' "$run/manifest.json" | sort -u)
  while IFS=$'\t' read -r rel expected; do
    [ "$(sha256sum "$run/$rel" | cut -d' ' -f1)" = "$expected" ]
  done < <(jq -r '.[] | [.path,.sha256] | @tsv' "$run/evidence-sha256.json")
  [ "$(sha256sum "$run/catalog.json" | cut -d' ' -f1)" = "$(jq -r '.catalog' "$run/sha256-index.json")" ]
  [ "$(sha256sum "$run/schedule.json" | cut -d' ' -f1)" = "$(jq -r '.schedule' "$run/sha256-index.json")" ]
  [ "$(sha256sum "$run/manifest.json" | cut -d' ' -f1)" = "$(jq -r '.manifest' "$run/sha256-index.json")" ]
  [ "$(sha256sum "$run/attempts.jsonl" | cut -d' ' -f1)" = "$(jq -r '.attempts' "$run/sha256-index.json")" ]
  [ "$(sha256sum "$run/summary.json" | cut -d' ' -f1)" = "$(jq -r '.summary' "$run/sha256-index.json")" ]
}

check_seed_determinism() {
  local out1="$TMP/out-seed1" out2="$TMP/out-seed2" out3="$TMP/out-seed3"
  mkdir -p "$out1" "$out2" "$out3"
  env -i PATH="$FAKE_BIN:/usr/bin:/bin" HOME="$TMP/home-s1" CALL_LOG="$TMP/log-s1.jsonl" STATE_DIR="$TMP/state" CATALOG_FIXTURE="$FIXTURE" BENCH_OUTPUT_ROOT="$out1" BENCH_PROMPT_DIR="$PROMPTS" BENCH_FNM_CMD="$FAKE_BIN/fnm" BENCH_CODEX_CMD="$FAKE_BIN/codex" BENCH_XASK_CMD="$FAKE_BIN/xask" BENCH_XBREED_CMD="$FAKE_BIN/xbreed" bash "$SCRIPT" --seed 9 --routes raw,xask,xbreed --repetitions 1 >/dev/null
  env -i PATH="$FAKE_BIN:/usr/bin:/bin" HOME="$TMP/home-s2" CALL_LOG="$TMP/log-s2.jsonl" STATE_DIR="$TMP/state" CATALOG_FIXTURE="$FIXTURE" BENCH_OUTPUT_ROOT="$out2" BENCH_PROMPT_DIR="$PROMPTS" BENCH_FNM_CMD="$FAKE_BIN/fnm" BENCH_CODEX_CMD="$FAKE_BIN/codex" BENCH_XASK_CMD="$FAKE_BIN/xask" BENCH_XBREED_CMD="$FAKE_BIN/xbreed" bash "$SCRIPT" --seed 9 --routes raw,xask,xbreed --repetitions 1 >/dev/null
  env -i PATH="$FAKE_BIN:/usr/bin:/bin" HOME="$TMP/home-s3" CALL_LOG="$TMP/log-s3.jsonl" STATE_DIR="$TMP/state" CATALOG_FIXTURE="$FIXTURE" BENCH_OUTPUT_ROOT="$out3" BENCH_PROMPT_DIR="$PROMPTS" BENCH_FNM_CMD="$FAKE_BIN/fnm" BENCH_CODEX_CMD="$FAKE_BIN/codex" BENCH_XASK_CMD="$FAKE_BIN/xask" BENCH_XBREED_CMD="$FAKE_BIN/xbreed" bash "$SCRIPT" --seed 10 --routes raw,xask,xbreed --repetitions 1 >/dev/null
  set -- $out1/*; local r1="$1"
  set -- $out2/*; local r2="$1"
  set -- $out3/*; local r3="$1"
  jq -c '.trials' "$r1/schedule.json" > "$TMP/seed1-trials.json"
  jq -c '.trials' "$r2/schedule.json" > "$TMP/seed2-trials.json"
  jq -c '.trials' "$r3/schedule.json" > "$TMP/seed3-trials.json"
  cmp -s "$TMP/seed1-trials.json" "$TMP/seed2-trials.json"
  if cmp -s "$TMP/seed1-trials.json" "$TMP/seed3-trials.json"; then
    echo "different seeds produced identical trial order" >&2
    return 1
  fi
  jq -S '[.trials[] | del(.trial_id)] | sort_by(.route,.lane,.requested_model,.requested_effort,.prompt_id,.repetition)' "$r1/schedule.json" > "$TMP/seed1-set.json"
  jq -S '[.trials[] | del(.trial_id)] | sort_by(.route,.lane,.requested_model,.requested_effort,.prompt_id,.repetition)' "$r3/schedule.json" > "$TMP/seed3-set.json"
  cmp -s "$TMP/seed1-set.json" "$TMP/seed3-set.json"
}

check_live_retry_and_usage() {
  local pdir="$TMP/prompts-retry" out="$TMP/out-live-retry" log="$TMP/log-live-retry.jsonl"
  write_prompt_dir "$pdir" retry.md 'FAIL_ONCE'
  mkdir -p "$out"
  env -i PATH="$FAKE_BIN:/usr/bin:/bin" HOME="$TMP/home-live-retry" CALL_LOG="$log" STATE_DIR="$TMP/state" CATALOG_FIXTURE="$FIXTURE" BENCH_OUTPUT_ROOT="$out" BENCH_PROMPT_DIR="$pdir" BENCH_FNM_CMD="$FAKE_BIN/fnm" BENCH_CODEX_CMD="$FAKE_BIN/codex" BENCH_XASK_CMD="$FAKE_BIN/xask" BENCH_XBREED_CMD="$FAKE_BIN/xbreed" BENCH_ALLOW_PAID=YES BENCH_ALLOW_CUSTOM_PROMPTS=YES BENCH_APPROVE_TRIALS=9 BENCH_APPROVE_ATTEMPTS=18 bash "$SCRIPT" --seed 1 --routes raw --repetitions 1 --retries 1 --run >/dev/null
  set -- $out/*; local run="$1"
  jq -e '.mode == "live" and .totals.retries_total == 1 and .totals.final_success_after_retries == 9 and .totals.final_failure_after_retries == 0 and .totals.scheduled_trials == 9' "$run/summary.json" >/dev/null
  jq -e '.totals.first_attempt_status_counts.nonzero == 1 and .totals.first_attempt_status_counts.ok == 8' "$run/summary.json" >/dev/null
   jq -s -e 'map(select(.status == "nonzero")) | length == 1' "$run/attempts.jsonl" >/dev/null
   jq -s -e 'map(select(.status == "ok")) | length == 9' "$run/attempts.jsonl" >/dev/null
  jq -s -e 'map(select(.status == "ok"))[0].retry_of == "t00001.a1"' "$run/attempts.jsonl" >/dev/null
  jq -s -e 'all(.[]; .ttft_s == null and .tpot_s == null and .decode_tok_s == null and .goodput_label == "reported_output_tokens_per_invocation_second")' "$run/attempts.jsonl" >/dev/null
  jq -s -e 'all(.[] | select(.status == "ok"); .input_tokens == 111 and .cached_input_tokens == 222 and .cache_write_input_tokens == 333 and .output_tokens == 444 and .reasoning_output_tokens == 555)' "$run/attempts.jsonl" >/dev/null

  local pdir2="$TMP/prompts-failalways" out2="$TMP/out-live-failalways" log2="$TMP/log-live-failalways.jsonl"
  write_prompt_dir "$pdir2" fail.md 'FAIL_ALWAYS'
  mkdir -p "$out2"
  set +e
  env -i PATH="$FAKE_BIN:/usr/bin:/bin" HOME="$TMP/home-live-fail" CALL_LOG="$log2" STATE_DIR="$TMP/state" CATALOG_FIXTURE="$FIXTURE" BENCH_OUTPUT_ROOT="$out2" BENCH_PROMPT_DIR="$pdir2" BENCH_FNM_CMD="$FAKE_BIN/fnm" BENCH_CODEX_CMD="$FAKE_BIN/codex" BENCH_XASK_CMD="$FAKE_BIN/xask" BENCH_XBREED_CMD="$FAKE_BIN/xbreed" BENCH_ALLOW_PAID=YES BENCH_ALLOW_CUSTOM_PROMPTS=YES BENCH_APPROVE_TRIALS=9 BENCH_APPROVE_ATTEMPTS=18 bash "$SCRIPT" --seed 11 --routes raw --repetitions 1 --retries 1 --run >/dev/null
  local failalways_rc=$?
  set -e
  [[ $failalways_rc -ne 0 ]]
  set -- $out2/*; local run2="$1"
  jq -e '.mode == "live" and .totals.final_failure_after_retries == 9 and .totals.final_success_after_retries == 0' "$run2/summary.json" >/dev/null
}

check_live_timeout_and_parse_failure() {
  local pto="$TMP/prompts-timeout" pbad="$TMP/prompts-bad" outt="$TMP/out-timeout" outp="$TMP/out-parse" logt="$TMP/log-timeout.jsonl" logp="$TMP/log-parse.jsonl"
  write_prompt_dir "$pto" slow.md 'SLOW_TIMEOUT'
  write_prompt_dir "$pbad" bad.md 'BAD_USAGE'
  mkdir -p "$outt" "$outp"
  set +e
  env -i PATH="$FAKE_BIN:/usr/bin:/bin" HOME="$TMP/home-timeout" CALL_LOG="$logt" STATE_DIR="$TMP/state" CATALOG_FIXTURE="$FIXTURE" BENCH_OUTPUT_ROOT="$outt" BENCH_PROMPT_DIR="$pto" BENCH_FNM_CMD="$FAKE_BIN/fnm" BENCH_CODEX_CMD="$FAKE_BIN/codex" BENCH_XASK_CMD="$FAKE_BIN/xask" BENCH_XBREED_CMD="$FAKE_BIN/xbreed" BENCH_ALLOW_PAID=YES BENCH_ALLOW_CUSTOM_PROMPTS=YES BENCH_APPROVE_TRIALS=9 BENCH_APPROVE_ATTEMPTS=9 bash "$SCRIPT" --seed 2 --routes raw --repetitions 1 --timeout-seconds 0.05 --run >/dev/null
  local timeout_rc=$?
  set -e
  [[ $timeout_rc -ne 0 ]]
  set -- $outt/*; local runt="$1"
  jq -s -e 'map(select(.status == "timeout")) | length == 9 and map(select(.status == "timeout"))[0].ttft_status == "unavailable_no_incremental_token_events"' "$runt/attempts.jsonl" >/dev/null

  set +e
  env -i PATH="$FAKE_BIN:/usr/bin:/bin" HOME="$TMP/home-parse" CALL_LOG="$logp" STATE_DIR="$TMP/state" CATALOG_FIXTURE="$FIXTURE" BENCH_OUTPUT_ROOT="$outp" BENCH_PROMPT_DIR="$pbad" BENCH_FNM_CMD="$FAKE_BIN/fnm" BENCH_CODEX_CMD="$FAKE_BIN/codex" BENCH_XASK_CMD="$FAKE_BIN/xask" BENCH_XBREED_CMD="$FAKE_BIN/xbreed" BENCH_ALLOW_PAID=YES BENCH_ALLOW_CUSTOM_PROMPTS=YES BENCH_APPROVE_TRIALS=9 BENCH_APPROVE_ATTEMPTS=9 bash "$SCRIPT" --seed 3 --routes raw --repetitions 1 --run >/dev/null
  local parse_rc=$?
  set -e
  [[ $parse_rc -ne 0 ]]
  set -- $outp/*; local runp="$1"
  jq -s -e 'map(select(.status == "parse_failure")) | length == 9' "$runp/attempts.jsonl" >/dev/null
}

check_live_wrapper_routes() {
  local pdir="$TMP/prompts-wrappers" out="$TMP/out-wrappers" log="$TMP/log-wrappers.jsonl"
  write_prompt_dir "$pdir" wrapper.md 'Return WRAPPER_OK only.'
  mkdir -p "$out"
  env -i PATH="$FAKE_BIN:/usr/bin:/bin" HOME="$TMP/home-wrappers" CALL_LOG="$log" STATE_DIR="$TMP/state" CATALOG_FIXTURE="$FIXTURE" BENCH_OUTPUT_ROOT="$out" BENCH_PROMPT_DIR="$pdir" BENCH_FNM_CMD="$FAKE_BIN/fnm" BENCH_CODEX_CMD="$FAKE_BIN/codex" BENCH_XASK_CMD="$FAKE_BIN/xask" BENCH_XBREED_CMD="$FAKE_BIN/xbreed" BENCH_ALLOW_PAID=YES BENCH_ALLOW_CUSTOM_PROMPTS=YES BENCH_APPROVE_TRIALS=10 BENCH_APPROVE_ATTEMPTS=10 bash "$SCRIPT" --seed 21 --routes xask,xbreed --repetitions 1 --run >/dev/null
  set -- "$out"/*; local run="$1"
  jq -e '.totals.scheduled_trials == 10 and .totals.final_success_after_retries == 10 and (.by_cell | length) == 10' "$run/summary.json" >/dev/null
  jq -s -e 'map(select(.cmd == "xask" and (.argv | index("codex")))) | length == 5' "$log" >/dev/null
  jq -s -e 'map(select(.cmd == "xbreed" and (.argv | index("codex")))) | length == 5' "$log" >/dev/null
  jq -s -e 'any(.[]; .cmd == "xask" and (.argv | index("--spark"))) and any(.[]; .cmd == "xask" and (.argv | index("--gpt55")) and (.argv | index("xhigh")))' "$log" >/dev/null
  jq -s -e 'any(.[]; .cmd == "xbreed" and (.argv | index("--spark"))) and any(.[]; .cmd == "xbreed" and (.argv | index("--gpt55")) and (.argv | index("xhigh")))' "$log" >/dev/null
}

check_guards_and_rejections() {
  local empty_catalog="$TMP/empty-catalog.json" symlink_out="$TMP/out-symlink" symlink_prompt_dir="$TMP/prompts-symlink" bad_out="$TMP/out-guard" bad_log="$TMP/log-guard.jsonl" no_paid_log="$TMP/log-no-paid.jsonl"
  printf '{"models":[]}' > "$empty_catalog"
  mkdir -p "$bad_out" "$symlink_prompt_dir"
  ln -s "$TMP/nonexistent" "$symlink_out"
  ln -s "$PROMPTS/latency.md" "$symlink_prompt_dir/link.md"

  set +e
  env -i PATH="$FAKE_BIN:/usr/bin:/bin" HOME="$TMP/home-guard1" CALL_LOG="$bad_log" STATE_DIR="$TMP/state" CATALOG_FIXTURE="$empty_catalog" CATALOG_MODE=real BENCH_OUTPUT_ROOT="$bad_out" BENCH_PROMPT_DIR="$PROMPTS" BENCH_FNM_CMD="$FAKE_BIN/fnm" BENCH_CODEX_CMD="$FAKE_BIN/codex" BENCH_XASK_CMD="$FAKE_BIN/xask" BENCH_XBREED_CMD="$FAKE_BIN/xbreed" bash "$SCRIPT" --seed 4 --routes raw --repetitions 1 --refresh-catalog >/dev/null
  local zero_rc=$?
  set -e
  [[ $zero_rc -ne 0 ]]

  set +e
  env -i PATH="$FAKE_BIN:/usr/bin:/bin" HOME="$TMP/home-guard2" CALL_LOG="$bad_log" STATE_DIR="$TMP/state" CATALOG_FIXTURE="$FIXTURE" BENCH_OUTPUT_ROOT="$symlink_out" BENCH_PROMPT_DIR="$PROMPTS" BENCH_FNM_CMD="$FAKE_BIN/fnm" BENCH_CODEX_CMD="$FAKE_BIN/codex" BENCH_XASK_CMD="$FAKE_BIN/xask" BENCH_XBREED_CMD="$FAKE_BIN/xbreed" bash "$SCRIPT" --seed 4 --routes raw --repetitions 1 >/dev/null
  local out_rc=$?
  set -e
  [[ $out_rc -ne 0 ]]

  set +e
  env -i PATH="$FAKE_BIN:/usr/bin:/bin" HOME="$TMP/home-guard3" CALL_LOG="$bad_log" STATE_DIR="$TMP/state" CATALOG_FIXTURE="$FIXTURE" BENCH_OUTPUT_ROOT="$bad_out" BENCH_PROMPT_DIR="$symlink_prompt_dir" BENCH_FNM_CMD="$FAKE_BIN/fnm" BENCH_CODEX_CMD="$FAKE_BIN/codex" BENCH_XASK_CMD="$FAKE_BIN/xask" BENCH_XBREED_CMD="$FAKE_BIN/xbreed" bash "$SCRIPT" --seed 4 --routes raw --repetitions 1 >/dev/null
  local prompt_rc=$?
  set -e
  [[ $prompt_rc -ne 0 ]]

  set +e
  env -i PATH="$FAKE_BIN:/usr/bin:/bin" HOME="$TMP/home-guard4" CALL_LOG="$bad_log" STATE_DIR="$TMP/state" CATALOG_FIXTURE="$FIXTURE" BENCH_OUTPUT_ROOT="$bad_out" BENCH_PROMPT_DIR="$PROMPTS" BENCH_FNM_CMD="$FAKE_BIN/fnm" BENCH_CODEX_CMD="$FAKE_BIN/codex" BENCH_XASK_CMD="$FAKE_BIN/xask" BENCH_XBREED_CMD="$FAKE_BIN/xbreed" bash "$SCRIPT" --seed '1;touch' --routes raw --repetitions 1 >/dev/null
  local inj_rc=$?
  set -e
  [[ $inj_rc -ne 0 ]]

  set +e
  env -i PATH="$FAKE_BIN:/usr/bin:/bin" HOME="$TMP/home-guard5" CALL_LOG="$bad_log" STATE_DIR="$TMP/state" CATALOG_FIXTURE="$FIXTURE" BENCH_OUTPUT_ROOT="$bad_out" BENCH_PROMPT_DIR="$PROMPTS" BENCH_FNM_CMD="$FAKE_BIN/fnm" BENCH_CODEX_CMD="$FAKE_BIN/codex" BENCH_XASK_CMD="$FAKE_BIN/xask" BENCH_XBREED_CMD="$FAKE_BIN/xbreed" BENCH_ALLOW_PAID=YES bash "$SCRIPT" --seed 5 --routes raw --repetitions 1 --run >/dev/null
  local approve_rc=$?
  set -e
  [[ $approve_rc -ne 0 ]]

  set +e
  env -i PATH="$FAKE_BIN:/usr/bin:/bin" HOME="$TMP/home-guard6" CALL_LOG="$no_paid_log" STATE_DIR="$TMP/state" CATALOG_FIXTURE="$FIXTURE" BENCH_OUTPUT_ROOT="$bad_out" BENCH_PROMPT_DIR="$PROMPTS" BENCH_FNM_CMD="$FAKE_BIN/fnm" BENCH_CODEX_CMD="$FAKE_BIN/codex" BENCH_XASK_CMD="$FAKE_BIN/xask" BENCH_XBREED_CMD="$FAKE_BIN/xbreed" BENCH_APPROVE_TRIALS=36 BENCH_APPROVE_ATTEMPTS=36 bash "$SCRIPT" --seed 6 --routes raw --repetitions 1 --run >/dev/null
  local paid_rc=$?
  set -e
  [[ $paid_rc -ne 0 ]]
  ! jq -s -e 'any(.[]; .cmd == "codex" and (.argv | index("exec")))' "$no_paid_log" >/dev/null
}

check_summary_and_dry_run_only() {
  local out="$TMP/out-final" log="$TMP/log-final.jsonl"
  mkdir -p "$out"
  env -i PATH="$FAKE_BIN:/usr/bin:/bin" HOME="$TMP/home-final" CALL_LOG="$log" STATE_DIR="$TMP/state" CATALOG_FIXTURE="$FIXTURE" BENCH_OUTPUT_ROOT="$out" BENCH_PROMPT_DIR="$PROMPTS" BENCH_FNM_CMD="$FAKE_BIN/fnm" BENCH_CODEX_CMD="$FAKE_BIN/codex" BENCH_XASK_CMD="$FAKE_BIN/xask" BENCH_XBREED_CMD="$FAKE_BIN/xbreed" bash "$SCRIPT" --seed 17 --routes raw,xask,xbreed --repetitions 1 >/dev/null
  set -- $out/*; local run="$1"
  jq -e '.mode == "dry-run" and .planned.scheduled_trials == 76' "$run/summary.json" >/dev/null
  jq -s -e 'all(.[]; .cmd != "codex" or (.argv[0] != "exec"))' "$log" >/dev/null
  printf '%s\n' "76"
}

check_repetitions_expand_schedule() {
  local out="$TMP/out-repetitions" log="$TMP/log-repetitions.jsonl"
  mkdir -p "$out"
  env -i PATH="$FAKE_BIN:/usr/bin:/bin" HOME="$TMP/home-repetitions" CALL_LOG="$log" STATE_DIR="$TMP/state" CATALOG_FIXTURE="$FIXTURE" BENCH_OUTPUT_ROOT="$out" BENCH_PROMPT_DIR="$PROMPTS" BENCH_FNM_CMD="$FAKE_BIN/fnm" BENCH_CODEX_CMD="$FAKE_BIN/codex" BENCH_XASK_CMD="$FAKE_BIN/xask" BENCH_XBREED_CMD="$FAKE_BIN/xbreed" bash "$SCRIPT" --seed 17 --routes raw,xask,xbreed --repetitions 2 >/dev/null
  set -- "$out"/*; local run="$1"
  jq -e '.planned.scheduled_trials == 152' "$run/summary.json" >/dev/null
  jq -e 'any(.trials[]; .repetition == 1) and any(.trials[]; .repetition == 2)' "$run/schedule.json" >/dev/null
}

check_default_run
check_seed_determinism
check_live_retry_and_usage
check_live_timeout_and_parse_failure
check_live_wrapper_routes
check_guards_and_rejections
check_summary_and_dry_run_only
check_repetitions_expand_schedule

echo "PASS: openai model benchmark harness"
