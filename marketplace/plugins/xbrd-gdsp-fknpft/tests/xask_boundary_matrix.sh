#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
CAPTURE="$TMP/argv"
cp "$ROOT/scripts/xask" "$TMP/xask"
XASK="$TMP/xask"

cat >"$TMP/xbreed" <<'EOF'
#!/usr/bin/env bash
printf '%s\0' "$@" >"$XASK_CAPTURE"
EOF
chmod +x "$TMP/xbreed"
export PATH="$TMP:/usr/bin:/bin" XASK_CAPTURE="$CAPTURE"
export XBREED_DISPATCH_DIR="$ROOT/templates/dispatch"
mkdir "$TMP/home"
export HOME="$TMP/home"

fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }
run() {
  : >"$CAPTURE"
  "$XASK" "$@"
  mapfile -d '' -t ARGV <"$CAPTURE"
}

# Accepted aliases, arbitrary flag order, and default Codex spark route.
run -r --scope src --debug codex query
run --json -o "$TMP/out file" --gpt55 -e high codex 'quoted query'
[[ "${ARGV[*]}" == *"ask codex --with godspeed"* ]] || fail 'codex route missing'
[[ "${ARGV[*]}" == *"--gpt55 --effort high --output-last-message $TMP/out file --json"* ]] || fail 'flag forwarding/order'

run -scp src g 'local query'
[[ "${ARGV[0]} ${ARGV[1]}" == 'ask gemma' ]] || fail 'g alias did not route to gemma'
run gemini 'legacy query'
[[ "${ARGV[0]} ${ARGV[1]}" == 'ask gemma' ]] || fail 'gemini alias did not route to gemma'
run codex 'default query'
[[ "${ARGV[0]} ${ARGV[1]}" == 'ask codex' ]] || fail 'default codex route missing'
[[ " ${ARGV[*]} " == *' --spark '* ]] && fail 'bare codex must not auto-spark (L3 sekhmet is explicit --spark)'

# Value-taking flags fail with the exact diagnostic before dispatch, including
# when the next token is another flag.
for flag in -scp --scope -e --effort -o --output-last-message; do
  for suffix in "" "--json"; do
    : >"$CAPTURE"
    set +e
    output=$(timeout 2 "$XASK" "$flag" $suffix 2>&1)
    rc=$?
    set -e
    [[ $rc -eq 1 ]] || fail "$flag missing value returned rc=$rc instead of 1"
    [[ "$output" == "xask: flag '$flag' requires a value" ]] \
      || fail "$flag missing value diagnostic mismatch: $output"
    [[ ! -s "$CAPTURE" ]] || fail "$flag missing value invoked xbreed"
  done
done
if "$XASK" -e impossible codex query >/dev/null 2>&1; then
  fail 'invalid effort accepted'
fi
if "$XASK" --unknown codex query >/dev/null 2>&1; then
  fail 'unknown flag accepted'
fi

# Literal, one-pass rendering: special bytes survive and inserted markers stay literal.
query=$'amp & slash \\ line1\nline2 {{CONTEXT}}'
context=$'context & \\ {{QUERY}}\nsecond'
run -scp $'scope & \\ {{QUERY}}\nnext' codex "$query" "$context"
prompt="${ARGV[${#ARGV[@]}-1]}"
[[ "$prompt" == *"$query"* ]] || fail 'query was altered'
[[ "$prompt" == *"$context"* ]] || fail 'context was altered'
[[ "$prompt" == *$'scope & \\ {{QUERY}}\nnext'* ]] || fail 'scope was altered or recursively expanded'

# Hostile metadata remains one valid JSON object and new logs are private.
log="$TMP/bench.jsonl"
XBREED_BENCH_LOG="$log" XBREED_BENCH_TEAMMATE=$'hostile " \\ \n metadata' \
  "$XASK" codex telemetry >/dev/null
[[ $(stat -c '%a' "$log") == 600 ]] || fail 'bench log mode is not 0600'
jq -e -s 'length == 1 and .[0].teammate == "hostile \" \\ \n metadata"' "$log" >/dev/null \
  || fail 'hostile metadata did not produce valid JSON'

target="$TMP/target"
link="$TMP/link"
: >"$target"
ln -s "$target" "$link"
if XBREED_BENCH_LOG="$link" "$XASK" codex telemetry >/dev/null 2>&1; then
  fail 'symlink telemetry target accepted'
fi
dangling="$TMP/dangling"
ln -s "$TMP/missing-target" "$dangling"
if XBREED_BENCH_LOG="$dangling" "$XASK" codex telemetry >/dev/null 2>&1; then
  fail 'dangling symlink telemetry target accepted'
fi
[[ ! -e "$TMP/missing-target" ]] || fail 'dangling telemetry symlink target was created'
if XBREED_BENCH_LOG="$TMP" "$XASK" codex telemetry >/dev/null 2>&1; then
  fail 'non-regular telemetry target accepted'
fi

printf 'PASS: offline xask boundary matrix\n'
