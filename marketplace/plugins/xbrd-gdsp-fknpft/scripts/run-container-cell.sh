#!/usr/bin/env bash
set -euo pipefail

[[ $# -ge 3 ]] || { printf 'usage: %s OUTPUT_ROOT LABEL CELL [CELL...]\n' "$0" >&2; exit 2; }
OUTPUT_ROOT="$1"
LABEL="$2"
shift 2

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IMAGE="xbrd-modelbench:5.6"
HOST_HOME="${HOME:?}"

docker_args=(
  run --rm --init
  --user 1000:1000
  --cap-drop ALL
  --security-opt no-new-privileges
  --pids-limit 256
  --memory 1400m --memory-swap 1400m --cpus 1.5
  --ulimit nofile=1024:1024
  -e HOME=/home/bench
  -v "$REPO_ROOT:/bench:ro"
  -v "$HOST_HOME/.codex/auth.json:/run/host-auth/auth.json:ro"
  -v "$HOST_HOME/.local/bin/codex:/home/bench/.local/bin/codex:ro"
  -v "$HOST_HOME/.local/bin/xask:/home/bench/.local/bin/xask:ro"
  -v "$HOST_HOME/.local/bin/xbreed:/home/bench/.local/bin/xbreed:ro"
  -v "$HOST_HOME/.local/share/fnm:/home/bench/.local/share/fnm:ro"
  -v "$HOST_HOME/.local/templates/dispatch:/home/bench/.local/templates/dispatch:ro"
  -v "$HOST_HOME/.agents/godspeed-core:/home/bench/.agents/godspeed-core:ro"
)

run_cell() {
  local index="$1" cell="$2"
  local out="$OUTPUT_ROOT/$index/launch-$(date +%s%N)-$$"
  mkdir -p "$out"
  chmod 700 "$out"

  printf '\n[%s] DRY PLAN %s\n' "$LABEL" "$cell"
  docker "${docker_args[@]}" -v "$out:/out:rw" "$IMAGE" \
    bash scripts/bench-openai-models.sh --seed 42 --cell "$cell" \
    --repetitions 1 --retries 0 --timeout-seconds 300

  local -a runs=("$out"/run.*)
  local dry_run="${runs[0]}"
  local trials attempts plan_sha
  trials="$(<"$dry_run/scheduled-count.txt")"
  attempts="$(<"$dry_run/max-paid-attempts.txt")"
  plan_sha="$(<"$dry_run/plan-sha256.txt")"
  printf '[%s] LIVE %s trials=%s plan=%s\n' "$LABEL" "$cell" "$trials" "${plan_sha:0:12}"

  set +e
  docker "${docker_args[@]}" \
    -e BENCH_ALLOW_PAID=YES \
    -e BENCH_APPROVE_TRIALS="$trials" \
    -e BENCH_APPROVE_ATTEMPTS="$attempts" \
    -e BENCH_APPROVE_PLAN_SHA256="$plan_sha" \
    -v "$out:/out:rw" "$IMAGE" \
    bash scripts/bench-openai-models.sh --run --seed 42 --cell "$cell" \
    --repetitions 1 --retries 0 --timeout-seconds 300
  local rc=$?
  set -e
  printf '[%s] COMPLETE rc=%s %s artifacts=%s\n' "$LABEL" "$rc" "$cell" "$out"
  return "$rc"
}

i=1
failures=0
for cell in "$@"; do
  run_cell "$i" "$cell" || failures=$((failures + 1))
  i=$((i + 1))
done
exit "$failures"
