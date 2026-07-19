#!/bin/bash
set -euo pipefail

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
CHITCHAT="$ROOT/chitchat"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

assert_failure() {
  local expected=$1
  shift
  local stderr="$TMP/stderr"
  if "$@" >"$TMP/stdout" 2>"$stderr"; then
    echo "expected failure: $*" >&2
    exit 1
  fi
  [[ ! -s "$TMP/stdout" ]]
  [[ "$(cat "$stderr")" == "$expected" ]]
}

bash -n "$CHITCHAT"
[[ "$(bash "$CHITCHAT" --version)" == "chitchat 1.1.0" ]]
bash "$CHITCHAT" --help | grep -q -- '--stdin'
assert_failure 'chitchat: unknown option: --unknown-option' bash "$CHITCHAT" --unknown-option
if bash "$CHITCHAT" >/dev/null 2>&1; then exit 1; fi
if printf '' | bash "$CHITCHAT" --stdin >/dev/null 2>&1; then exit 1; fi
assert_failure 'chitchat: --stdin cannot be combined with prompt arguments' bash -c 'printf prompt | bash "$1" --stdin extra' _ "$CHITCHAT"
assert_failure 'chitchat: composer mode options are mutually exclusive' bash "$CHITCHAT" --image --web-search prompt
assert_failure 'chitchat: CHITCHAT_CDP_HOST must be loopback (127.0.0.1, localhost, or [::1]); set CHITCHAT_DANGEROUS_ALLOW_REMOTE_CDP=1 to override' env CHITCHAT_CDP_HOST=192.0.2.1 bash "$CHITCHAT" --version
[[ "$(CHITCHAT_CDP_HOST=192.0.2.1 CHITCHAT_DANGEROUS_ALLOW_REMOTE_CDP=1 bash "$CHITCHAT" --version)" == 'chitchat 1.1.0' ]]

batch_prompt=$'quote " newline\nslash \\'
batch_stderr="$TMP/batch.stderr"
batch=$(printf '%s' "$batch_prompt" | /usr/bin/node "$ROOT/chitchat-batch.mjs" 2>"$batch_stderr")
[[ ! -s "$batch_stderr" ]]
/usr/bin/node -e '
  const value = JSON.parse(process.argv[1]);
  const expected = [["keyboard", "inserttext", process.argv[2]], ["press", "Enter"]];
  if (value.length !== 2 || JSON.stringify(value) !== JSON.stringify(expected)) process.exit(1);
' "$batch" "$batch_prompt"

# Installed-layout integration: a ~/.local/bin symlink must resolve the adjacent helper.
mkdir -p "$TMP/bin" "$TMP/home/.local/bin"
ln -s "$CHITCHAT" "$TMP/home/.local/bin/chitchat"
cat >"$TMP/bin/curl" <<'EOF'
#!/bin/bash
exit 0
EOF
cat >"$TMP/bin/readlink" <<'EOF'
#!/bin/bash
if [[ "${1:-}" == -f ]]; then exit 1; fi
exec /usr/bin/readlink "$@"
EOF
cat >"$TMP/bin/agent-browser" <<'EOF'
#!/bin/bash
set -euo pipefail
printf '%s\0' "$@" >>"$CHITCHAT_TEST_ARGV"
case " $* " in
  *' tab list '*) printf '[t7] ChatGPT - https://chatgpt.com/\n' ;;
  *' eval document.title '*) printf '"ChatGPT"\n' ;;
  *' get count '*)
    count=$(cat "$CHITCHAT_TEST_COUNT" 2>/dev/null || printf 0)
    printf '%s\n' "$count"
    printf '%s' "$((count + 1))" >"$CHITCHAT_TEST_COUNT"
    ;;
  *' batch --bail --json '*) cat >"$CHITCHAT_TEST_BATCH" ;;
esac
EOF
chmod +x "$TMP/bin/curl" "$TMP/bin/readlink" "$TMP/bin/agent-browser"
sentinel='SENTINEL_PROMPT_NOT_IN_ARGV_7d942'
installed_stderr="$TMP/installed.stderr"
printf '%s' "$sentinel" | env HOME="$TMP/home" PATH="$TMP/bin:$PATH" \
  CHITCHAT_TEST_ARGV="$TMP/argv" CHITCHAT_TEST_COUNT="$TMP/count" CHITCHAT_TEST_BATCH="$TMP/posted-batch" \
  "$TMP/home/.local/bin/chitchat" --stdin >"$TMP/installed.stdout" 2>"$installed_stderr"
[[ ! -s "$installed_stderr" ]]
argv_lines=$(tr '\0' '\n' <"$TMP/argv")
[[ "$argv_lines" == *'http://127.0.0.1:9222'* ]]
[[ "$argv_lines" != *"$sentinel"* ]]
[[ "$(cat "$TMP/installed.stdout")" != *"$sentinel"* ]]
[[ "$(cat "$installed_stderr")" != *"$sentinel"* ]]
/usr/bin/node -e '
  const value = JSON.parse(require("node:fs").readFileSync(process.argv[1], "utf8"));
  if (value.length !== 2) process.exit(1);
  if (JSON.stringify(value) !== JSON.stringify([["keyboard", "inserttext", process.argv[2]], ["press", "Enter"]])) process.exit(1);
' "$TMP/posted-batch" "$sentinel"

echo "chitchat dry tests passed"
