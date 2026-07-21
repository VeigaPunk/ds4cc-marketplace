#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INSTALLER="$ROOT_DIR/scripts/install-automation-chrome"
TMP_ROOT="$(mktemp -d)"
trap 'rm -rf "$TMP_ROOT"' EXIT

fail() { printf 'not ok - %s\n' "$*" >&2; exit 1; }

BIN="$TMP_ROOT/bin"
mkdir -p "$BIN"
cat >"$BIN/curl" <<'CURL'
#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "$*" >>"$CURL_LOG"
if [[ "$*" == *"$MUSKETEER_CHROME_META_URL"* ]]; then
  printf '%s\n' "$METADATA"
  exit 0
fi
output=""
while (( $# )); do
  if [[ "$1" == -o ]]; then output="$2"; shift 2; else shift; fi
done
[[ -n "$output" ]] || exit 2
mkdir -p "$(dirname "$output")"
: >"$output"
CURL
cat >"$BIN/unzip" <<'UNZIP'
#!/usr/bin/env bash
set -euo pipefail
destination=""
while (( $# )); do
  if [[ "$1" == -d ]]; then destination="$2"; shift 2; else shift; fi
done
mkdir -p "$destination/chrome-linux64"
cat >"$destination/chrome-linux64/chrome" <<CHROME
#!/usr/bin/env bash
printf 'Google Chrome for Testing %s\n' '$EXPECTED_VERSION'
CHROME
chmod +x "$destination/chrome-linux64/chrome"
UNZIP
chmod +x "$BIN/curl" "$BIN/unzip"

metadata='{"channels":{"Stable":{"version":"151.0.1.2","downloads":{"chrome":[{"platform":"win64","url":"https://example.test/stable-win.zip"},{"platform":"linux64","url":"https://example.test/stable-linux.zip"}]}},"Dev":{"version":"152.0.3.4","downloads":{"chrome":[{"platform":"linux64","url":"https://example.test/dev-linux.zip"}]}}}}'

run_install() {
  local home="$1" version="$2"; shift 2
  mkdir -p "$home"
  HOME="$home" PATH="$BIN:/usr/bin:/bin" CURL_LOG="$home/curl.log" \
    METADATA="$metadata" EXPECTED_VERSION="$version" \
    MUSKETEER_CHROME_META_URL=fixture://metadata "$@" "$INSTALLER"
}

stable_home="$TMP_ROOT/stable"
run_install "$stable_home" 151.0.1.2 >/dev/null
grep -Fq 'https://example.test/stable-linux.zip' "$stable_home/curl.log" ||
  fail 'stable install did not select linux64 archive'
if grep -Fq 'stable-win.zip' "$stable_home/curl.log"; then fail 'stable install selected Windows archive'; fi
[[ "$("$stable_home/.local/share/the-musketeer/chrome-canary/current/chrome" --version)" == \
   'Google Chrome for Testing 151.0.1.2' ]] || fail 'stable browser was not installed'
[[ -L "$stable_home/.local/bin/musketeer-chrome" && -L "$stable_home/.local/bin/ds4cc-chrome" ]] ||
  fail 'stable install did not install launcher aliases'

dev_home="$TMP_ROOT/dev"
run_install "$dev_home" 152.0.3.4 env MUSKETEER_CHROME_CHANNEL=Dev >/dev/null
grep -Fq 'https://example.test/dev-linux.zip' "$dev_home/curl.log" ||
  fail 'Dev channel override was ignored'

invalid_home="$TMP_ROOT/invalid"
mkdir -p "$invalid_home"
if run_install "$invalid_home" 151.0.1.2 env MUSKETEER_CHROME_CHANNEL=Unknown \
  >"$TMP_ROOT/invalid.out" 2>"$TMP_ROOT/invalid.err"; then
  fail 'unsupported channel succeeded'
fi
[[ ! -e "$invalid_home/curl.log" ]] || fail 'unsupported channel reached curl'
grep -Fq 'Unsupported MUSKETEER_CHROME_CHANNEL' "$TMP_ROOT/invalid.err" ||
  fail 'unsupported channel diagnostic is unclear'

bad_home="$TMP_ROOT/bad-metadata"
mkdir -p "$bad_home"
if HOME="$bad_home" PATH="$BIN:/usr/bin:/bin" CURL_LOG="$bad_home/curl.log" \
  METADATA='{}' EXPECTED_VERSION=151.0.1.2 MUSKETEER_CHROME_META_URL=fixture://metadata \
  "$INSTALLER" >"$TMP_ROOT/bad.out" 2>"$TMP_ROOT/bad.err"; then
  fail 'missing release metadata succeeded'
fi
grep -Fq 'metadata did not contain' "$TMP_ROOT/bad.err" ||
  fail 'missing metadata diagnostic is unclear'

printf 'ok - stable and override Chrome channel installation\n'
