#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LAUNCHER="$ROOT_DIR/scripts/musketeer-chrome"
TMP_ROOT="$(mktemp -d)"
trap 'rm -rf "$TMP_ROOT"' EXIT

fail() {
  printf 'not ok - %s\n' "$*" >&2
  exit 1
}

assert_line() {
  local expected="$1" file="$2"
  grep -Fqx -- "$expected" "$file" || fail "missing argv: $expected"
}

assert_no_line() {
  local rejected="$1" file="$2"
  if grep -Fqx -- "$rejected" "$file"; then
    fail "rejected argv present: $rejected"
  fi
}

make_chrome() {
  local path="$1"
  mkdir -p "$(dirname "$path")"
  cat >"$path" <<'CHROME'
#!/usr/bin/env bash
if [[ "${1:-}" == --version ]]; then
  printf 'Google Chrome for Testing 149.0.0.0\n'
  exit 0
fi
: "${ARGV_LOG:?}"
printf '%s\n' "$0" >"$ARGV_LOG.bin"
printf '%s\n' "$TMPDIR" >"$ARGV_LOG.tmpdir"
printf '%s\n' "$@" >"$ARGV_LOG"
CHROME
  chmod +x "$path"
}

make_versioned_chrome() {
  local path="$1" version="$2"
  mkdir -p "$(dirname "$path")"
  cat >"$path" <<CHROME
#!/usr/bin/env bash
printf '%s\\n' '$version'
CHROME
  chmod +x "$path"
}

run_launcher() {
  local home="$1" log="$2"
  shift 2
  HOME="$home" XDG_CACHE_HOME="$home/cache" ARGV_LOG="$log" "$LAUNCHER" "$@"
}

# Legacy DS4CC installations win when no explicit Musketeer override is set.
home="$TMP_ROOT/legacy-home"
legacy_bin="$home/.local/share/ds4cc/chrome-canary/current/chrome"
legacy_profile="$home/.local/share/ds4cc/agent-chrome-profile"
make_chrome "$legacy_bin"
mkdir -p "$legacy_profile"
run_launcher "$home" "$TMP_ROOT/legacy.argv"
[[ "$(<"$TMP_ROOT/legacy.argv.bin")" == "$legacy_bin" ]] || fail 'legacy binary not selected'
assert_line "--user-data-dir=$legacy_profile" "$TMP_ROOT/legacy.argv"
mapfile -t default_argv <"$TMP_ROOT/legacy.argv"
default_count=${#default_argv[@]}
[[ "$default_count" -eq 19 ]] || fail 'default launch does not have exactly three landing pages'
[[ "${default_argv[default_count-3]}" == 'https://notebooklm.google.com/' ]] ||
  fail 'NotebookLM is not the first landing page'
[[ "${default_argv[default_count-2]}" == 'https://grok.com' ]] ||
  fail 'Grok is not the second landing page'
[[ "${default_argv[default_count-1]}" == 'https://chatgpt.com/' ]] ||
  fail 'ChatGPT is not the third landing page'

# A partial legacy installation must never create a mixed binary/profile pair.
for partial in binary profile; do
  home="$TMP_ROOT/partial-$partial-home"
  canonical_bin="$home/.local/share/the-musketeer/chrome-canary/current/chrome"
  canonical_profile="$home/.local/share/the-musketeer/chrome-profile"
  make_chrome "$canonical_bin"
  if [[ "$partial" == binary ]]; then
    make_chrome "$home/.local/share/ds4cc/chrome-canary/current/chrome"
  else
    mkdir -p "$home/.local/share/ds4cc/agent-chrome-profile"
  fi
  run_launcher "$home" "$TMP_ROOT/partial-$partial.argv"
  [[ "$(<"$TMP_ROOT/partial-$partial.argv.bin")" == "$canonical_bin" ]] ||
    fail "partial legacy $partial selected a noncanonical binary"
  assert_line "--user-data-dir=$canonical_profile" "$TMP_ROOT/partial-$partial.argv"
done

# A stale complete legacy pair falls back atomically to a supported canonical pair.
home="$TMP_ROOT/stale-legacy-home"
legacy_bin="$home/.local/share/ds4cc/chrome-canary/current/chrome"
legacy_profile="$home/.local/share/ds4cc/agent-chrome-profile"
canonical_bin="$home/.local/share/the-musketeer/chrome-canary/current/chrome"
canonical_profile="$home/.local/share/the-musketeer/chrome-profile"
make_versioned_chrome "$legacy_bin" 'Google Chrome for Testing 148.9.0.0'
mkdir -p "$legacy_profile"
make_chrome "$canonical_bin"
run_launcher "$home" "$TMP_ROOT/stale-legacy.argv"
[[ "$(<"$TMP_ROOT/stale-legacy.argv.bin")" == "$canonical_bin" ]] ||
  fail 'stale legacy browser did not fall back to canonical binary'
assert_line "--user-data-dir=$canonical_profile" "$TMP_ROOT/stale-legacy.argv"

# Canonical paths are the clean-host fallback.
home="$TMP_ROOT/canonical-home"
canonical_bin="$home/.local/share/the-musketeer/chrome-canary/current/chrome"
canonical_profile="$home/.local/share/the-musketeer/chrome-profile"
make_chrome "$canonical_bin"
run_launcher "$home" "$TMP_ROOT/canonical.argv"
[[ "$(<"$TMP_ROOT/canonical.argv.bin")" == "$canonical_bin" ]] || fail 'canonical binary not selected'
assert_line "--user-data-dir=$canonical_profile" "$TMP_ROOT/canonical.argv"

# A root override selects its current Chrome even when a legacy binary exists.
home="$TMP_ROOT/root-override-home"
make_chrome "$home/.local/share/ds4cc/chrome-canary/current/chrome"
root_override="$TMP_ROOT/root-override/chrome-canary"
make_chrome "$root_override/current/chrome"
HOME="$home" XDG_CACHE_HOME="$home/cache" ARGV_LOG="$TMP_ROOT/root-override.argv" \
  MUSKETEER_CHROME_ROOT="$root_override" "$LAUNCHER"
[[ "$(<"$TMP_ROOT/root-override.argv.bin")" == "$root_override/current/chrome" ]] ||
  fail 'root override not selected'
assert_line "--user-data-dir=$home/.local/share/the-musketeer/chrome-profile" \
  "$TMP_ROOT/root-override.argv"

# BIN has precedence over ROOT, and without an explicit profile uses the canonical profile.
home="$TMP_ROOT/bin-beats-root-home"
override_bin="$TMP_ROOT/bin-beats-root/chrome"
ignored_root="$TMP_ROOT/ignored-root"
make_chrome "$override_bin"
make_chrome "$ignored_root/current/chrome"
HOME="$home" XDG_CACHE_HOME="$home/cache" ARGV_LOG="$TMP_ROOT/bin-beats-root.argv" \
  MUSKETEER_CHROME_BIN="$override_bin" MUSKETEER_CHROME_ROOT="$ignored_root" "$LAUNCHER"
[[ "$(<"$TMP_ROOT/bin-beats-root.argv.bin")" == "$override_bin" ]] ||
  fail 'BIN did not beat ROOT'
assert_line "--user-data-dir=$home/.local/share/the-musketeer/chrome-profile" \
  "$TMP_ROOT/bin-beats-root.argv"

# A profile-only override pairs with the canonical binary, never the legacy binary.
home="$TMP_ROOT/profile-only-home"
canonical_bin="$home/.local/share/the-musketeer/chrome-canary/current/chrome"
profile_override="$TMP_ROOT/profile-only/profile"
make_chrome "$canonical_bin"
make_chrome "$home/.local/share/ds4cc/chrome-canary/current/chrome"
mkdir -p "$home/.local/share/ds4cc/agent-chrome-profile"
HOME="$home" XDG_CACHE_HOME="$home/cache" ARGV_LOG="$TMP_ROOT/profile-only.argv" \
  MUSKETEER_CHROME_PROFILE="$profile_override" "$LAUNCHER"
[[ "$(<"$TMP_ROOT/profile-only.argv.bin")" == "$canonical_bin" ]] ||
  fail 'profile-only override did not select canonical binary'
assert_line "--user-data-dir=$profile_override" "$TMP_ROOT/profile-only.argv"

# Explicit overrides beat a complete legacy installation and preserve URL argv exactly.
home="$TMP_ROOT/override-home"
make_chrome "$home/.local/share/ds4cc/chrome-canary/current/chrome"
mkdir -p "$home/.local/share/ds4cc/agent-chrome-profile"
override_bin="$TMP_ROOT/custom/chrome"
override_profile="$TMP_ROOT/custom/profile"
make_chrome "$override_bin"
urls=('https://example.test/a?x=1&y=two words' '--app=https://example.test/app')
HOME="$home" XDG_CACHE_HOME="$home/cache" ARGV_LOG="$TMP_ROOT/override.argv" \
  MUSKETEER_CHROME_BIN="$override_bin" MUSKETEER_CHROME_PROFILE="$override_profile" \
  MUSKETEER_CDP_PORT=9333 "$LAUNCHER" "${urls[@]}"
[[ "$(<"$TMP_ROOT/override.argv.bin")" == "$override_bin" ]] || fail 'binary override not selected'
assert_line "--user-data-dir=$override_profile" "$TMP_ROOT/override.argv"
assert_line '--remote-debugging-address=127.0.0.1' "$TMP_ROOT/override.argv"
assert_line '--remote-debugging-port=9333' "$TMP_ROOT/override.argv"
assert_line '--remote-allow-origins=http://127.0.0.1:9333,http://localhost:9333' "$TMP_ROOT/override.argv"
assert_line "${urls[0]}" "$TMP_ROOT/override.argv"
assert_line "${urls[1]}" "$TMP_ROOT/override.argv"
[[ "$(wc -l <"$TMP_ROOT/override.argv")" -eq 18 ]] || fail 'unexpected exact argv count'
mapfile -t override_argv <"$TMP_ROOT/override.argv"
override_count=${#override_argv[@]}
[[ "${override_argv[override_count-2]}" == "${urls[0]}" &&
   "${override_argv[override_count-1]}" == "${urls[1]}" ]] || fail 'explicit URL order changed'

for required in \
  '--no-first-run' \
  '--no-default-browser-check' \
  '--disable-sync' \
  '--disable-session-crashed-bubble' \
  '--window-size=1440,1000' \
  '--disable-background-timer-throttling' \
  '--disable-backgrounding-occluded-windows' \
  '--disable-renderer-backgrounding' \
  '--disable-features=CalculateNativeWinOcclusion,OptimizationHints,MediaRouter' \
  '--dns-over-https-mode=secure' \
  '--dns-over-https-templates=https://cloudflare-dns.com/dns-query' \
  '--ozone-platform=wayland'; do
  assert_line "$required" "$TMP_ROOT/override.argv"
done

for rejected in \
  '--force-renderer-accessibility' \
  '--disable-vulkan' \
  '--disable-dev-shm-usage' \
  '--disable-component-update' \
  '--use-angle=gl' \
  '--enable-automation' \
  '--disable-blink-features=AutomationControlled' \
  '--no-sandbox'; do
  assert_no_line "$rejected" "$TMP_ROOT/override.argv"
done

# Exactly one supplied URL remains exactly one URL; the default is not appended.
home="$TMP_ROOT/one-url-home"
make_chrome "$home/.local/share/the-musketeer/chrome-canary/current/chrome"
one_url='https://example.test/one path?q=a&b=c'
run_launcher "$home" "$TMP_ROOT/one-url.argv" "$one_url"
[[ "$(grep -Fxc -- "$one_url" "$TMP_ROOT/one-url.argv")" -eq 1 ]] ||
  fail 'single URL was not preserved exactly once'
assert_no_line 'https://grok.com' "$TMP_ROOT/one-url.argv"
assert_no_line 'https://notebooklm.google.com/' "$TMP_ROOT/one-url.argv"
assert_no_line 'https://chatgpt.com/' "$TMP_ROOT/one-url.argv"
[[ "$(wc -l <"$TMP_ROOT/one-url.argv")" -eq 17 ]] || fail 'explicit URL gained default pages'

# Profile paths must be real directories, never symlinks.
home="$TMP_ROOT/symlink-profile-home"
make_chrome "$home/.local/share/the-musketeer/chrome-canary/current/chrome"
mkdir -p "$home/real-profile"
ln -s "$home/real-profile" "$home/profile-link"
if HOME="$home" XDG_CACHE_HOME="$home/cache" ARGV_LOG="$TMP_ROOT/symlink.argv" \
  MUSKETEER_CHROME_PROFILE="$home/profile-link" "$LAUNCHER" \
  >"$TMP_ROOT/symlink.out" 2>"$TMP_ROOT/symlink.err"; then
  fail 'symlinked profile was accepted'
fi
grep -qi 'profile.*symlink' "$TMP_ROOT/symlink.err" || fail 'unclear symlink rejection'

# Missing executables and non-directory profile paths receive explicit validation errors.
home="$TMP_ROOT/missing-browser-home"
if HOME="$home" XDG_CACHE_HOME="$home/cache" ARGV_LOG="$TMP_ROOT/missing.argv" \
  "$LAUNCHER" >"$TMP_ROOT/missing.out" 2>"$TMP_ROOT/missing.err"; then
  fail 'missing browser executable was accepted'
fi
grep -qi 'browser executable' "$TMP_ROOT/missing.err" || fail 'unclear executable rejection'

home="$TMP_ROOT/file-profile-home"
make_chrome "$home/.local/share/the-musketeer/chrome-canary/current/chrome"
mkdir -p "$home"
printf 'not a directory\n' >"$home/profile-file"
if HOME="$home" XDG_CACHE_HOME="$home/cache" ARGV_LOG="$TMP_ROOT/file-profile.argv" \
  MUSKETEER_CHROME_PROFILE="$home/profile-file" "$LAUNCHER" \
  >"$TMP_ROOT/file-profile.out" 2>"$TMP_ROOT/file-profile.err"; then
  fail 'regular-file profile was accepted'
fi
grep -qi 'profile path.*not a directory' "$TMP_ROOT/file-profile.err" ||
  fail 'unclear profile type rejection'

# Stale and malformed browser versions fail before the automation invocation.
for kind in stale malformed; do
  home="$TMP_ROOT/$kind-home"
  bin="$home/.local/share/the-musketeer/chrome-canary/current/chrome"
  if [[ "$kind" == stale ]]; then
    make_versioned_chrome "$bin" 'Google Chrome for Testing 148.9.0.0'
  else
    make_versioned_chrome "$bin" 'Not Chrome 999.0.0.0'
  fi
  if HOME="$home" XDG_CACHE_HOME="$home/cache" ARGV_LOG="$TMP_ROOT/$kind.argv" \
    "$LAUNCHER" >"$TMP_ROOT/$kind.out" 2>"$TMP_ROOT/$kind.err"; then
    fail "$kind browser version was accepted"
  fi
  grep -qi 'version' "$TMP_ROOT/$kind.err" || fail "unclear $kind version rejection"
done

# The helper safely and idempotently installs exact canonical aliases.
ALIAS_HELPER="$ROOT_DIR/scripts/install-chrome-aliases"
alias_home="$TMP_ROOT/alias-home"
mkdir -p "$alias_home/.local/bin"
printf 'legacy launcher\n' >"$alias_home/.local/bin/ds4cc-chrome"
HOME="$alias_home" "$ALIAS_HELPER"
canonical_target="$ROOT_DIR/scripts/musketeer-chrome"
for name in musketeer-chrome ds4cc-chrome; do
  [[ -L "$alias_home/.local/bin/$name" ]] || fail "$name is not a symlink"
  [[ "$(readlink "$alias_home/.local/bin/$name")" == "$canonical_target" ]] ||
    fail "$name has the wrong target"
done
[[ "$(<"$alias_home/.local/bin/ds4cc-chrome.pre-musketeer")" == 'legacy launcher' ]] ||
  fail 'legacy alias backup was not preserved'
HOME="$alias_home" "$ALIAS_HELPER"
[[ "$(<"$alias_home/.local/bin/ds4cc-chrome.pre-musketeer")" == 'legacy launcher' ]] ||
  fail 'idempotent run changed alias backup'

# An unknown destination with an existing backup is refused without mutation.
refuse_home="$TMP_ROOT/refuse-home"
mkdir -p "$refuse_home/.local/bin"
printf 'unknown\n' >"$refuse_home/.local/bin/musketeer-chrome"
printf 'prior backup\n' >"$refuse_home/.local/bin/musketeer-chrome.pre-musketeer"
if HOME="$refuse_home" "$ALIAS_HELPER" >"$TMP_ROOT/refuse.out" 2>"$TMP_ROOT/refuse.err"; then
  fail 'unknown alias with existing backup was overwritten'
fi
[[ "$(<"$refuse_home/.local/bin/musketeer-chrome")" == unknown ]] ||
  fail 'refused alias was mutated'

# A symlink-to-directory destination is backed up as a link, never traversed.
directory_home="$TMP_ROOT/directory-home"
mkdir -p "$directory_home/.local/bin" "$directory_home/untouched"
printf 'sentinel\n' >"$directory_home/untouched/value"
ln -s "$directory_home/untouched" "$directory_home/.local/bin/ds4cc-chrome"
HOME="$directory_home" "$ALIAS_HELPER"
[[ -L "$directory_home/.local/bin/ds4cc-chrome.pre-musketeer" ]] ||
  fail 'symlink-to-directory was not backed up as a symlink'
[[ "$(<"$directory_home/untouched/value")" == sentinel ]] || fail 'destination directory was changed'

# Both installers invoke only the repository helper for the browser aliases.
for installer in "$ROOT_DIR/install.sh" "$ROOT_DIR/scripts/install-automation-chrome"; do
  [[ "$(grep -Ec '^"\$(HERE/scripts|SCRIPT_DIR)/install-chrome-aliases"$' "$installer")" -eq 1 ]] ||
    fail "exact helper invocation missing from $installer"
  if grep -Eq 'ln .*\.local/bin/(musketeer|ds4cc)-chrome' "$installer"; then
    fail "raw browser alias installation remains in $installer"
  fi
done

printf 'ok - musketeer Chrome launcher and installer aliases\n'

# Profile repair preserves the old directory and creates a private clean one.
REPAIR="$ROOT_DIR/scripts/repair-chrome-profile"
repair_home="$TMP_ROOT/repair-home"
repair_profile="$repair_home/profile"
mkdir -p "$repair_profile"
printf 'keep me\n' >"$repair_profile/session-data"
mkdir -p "$repair_home/bin"
cat >"$repair_home/bin/pgrep" <<'PGREP'
#!/usr/bin/env bash
[[ -n "${PGREP_ARGS_LOG:-}" ]] && printf '%s\n' "$*" >"$PGREP_ARGS_LOG"
exit "${PGREP_STATUS:-1}"
PGREP
chmod +x "$repair_home/bin/pgrep"
HOME="$repair_home" PATH="$repair_home/bin:/usr/bin:/bin" \
  MUSKETEER_CHROME_PROFILE="$repair_profile" MUSKETEER_REPAIR_STAMP=test \
  "$REPAIR" >"$TMP_ROOT/repair.out"
[[ -f "$repair_profile.crash-backup-test/session-data" ]] || fail 'repair backup lost profile data'
[[ -d "$repair_profile" && ! -L "$repair_profile" ]] || fail 'repair did not create a real profile'
[[ "$(stat -c %a "$repair_profile")" == 700 ]] || fail 'repair profile permissions are not private'

# Active profile ownership and an existing backup both fail closed.
active_profile="$repair_home/active-profile"
mkdir -p "$active_profile"
if HOME="$repair_home" PATH="$repair_home/bin:/usr/bin:/bin" PGREP_STATUS=0 \
  PGREP_ARGS_LOG="$TMP_ROOT/pgrep.args" \
  MUSKETEER_CHROME_PROFILE="$active_profile" MUSKETEER_REPAIR_STAMP=active \
  "$REPAIR" >"$TMP_ROOT/repair-active.out" 2>"$TMP_ROOT/repair-active.err"; then
  fail 'repair accepted an active profile'
fi
grep -qi 'still using' "$TMP_ROOT/repair-active.err" || fail 'active-profile repair error is unclear'
[[ "$(<"$TMP_ROOT/pgrep.args")" == "-f -- --user-data-dir=$active_profile" ]] ||
  fail 'repair checked the wrong active profile'

backup_profile="$repair_home/backup-profile"
mkdir -p "$backup_profile" "$backup_profile.crash-backup-existing"
if HOME="$repair_home" PATH="$repair_home/bin:/usr/bin:/bin" \
  MUSKETEER_CHROME_PROFILE="$backup_profile" MUSKETEER_REPAIR_STAMP=existing \
  "$REPAIR" >"$TMP_ROOT/repair-backup.out" 2>"$TMP_ROOT/repair-backup.err"; then
  fail 'repair overwrote an existing backup'
fi
grep -qi 'backup already exists' "$TMP_ROOT/repair-backup.err" || fail 'backup refusal is unclear'

# Default repair selection mirrors the launcher's atomic legacy/canonical choice.
default_home="$TMP_ROOT/default-repair-home"
mkdir -p "$default_home/.local/share/the-musketeer/chrome-profile"
HOME="$default_home" PATH="$repair_home/bin:/usr/bin:/bin" MUSKETEER_REPAIR_STAMP=canonical \
  "$REPAIR" >/dev/null
[[ -d "$default_home/.local/share/the-musketeer/chrome-profile.crash-backup-canonical" ]] ||
  fail 'repair did not default to canonical profile'

legacy_repair_home="$TMP_ROOT/legacy-repair-home"
mkdir -p "$legacy_repair_home/.local/share/ds4cc/agent-chrome-profile"
HOME="$legacy_repair_home" PATH="$repair_home/bin:/usr/bin:/bin" MUSKETEER_REPAIR_STAMP=legacy \
  "$REPAIR" >/dev/null
[[ -d "$legacy_repair_home/.local/share/ds4cc/agent-chrome-profile.crash-backup-legacy" ]] ||
  fail 'repair did not prefer existing legacy profile'

# Symlink profiles and all backup collision types fail without mutation.
symlink_home="$TMP_ROOT/symlink-repair-home"
mkdir -p "$symlink_home/real-profile"
ln -s "$symlink_home/real-profile" "$symlink_home/profile-link"
if HOME="$symlink_home" PATH="$repair_home/bin:/usr/bin:/bin" \
  MUSKETEER_CHROME_PROFILE="$symlink_home/profile-link" MUSKETEER_REPAIR_STAMP=link \
  "$REPAIR" >/dev/null 2>&1; then
  fail 'repair accepted a symlink profile'
fi

for collision in file symlink; do
  collision_profile="$repair_home/collision-$collision"
  collision_backup="$collision_profile.crash-backup-$collision"
  mkdir -p "$collision_profile"
  if [[ "$collision" == file ]]; then
    printf 'keep\n' >"$collision_backup"
  else
    ln -s "$repair_home/missing-target" "$collision_backup"
  fi
  if HOME="$repair_home" PATH="$repair_home/bin:/usr/bin:/bin" \
    MUSKETEER_CHROME_PROFILE="$collision_profile" MUSKETEER_REPAIR_STAMP="$collision" \
    "$REPAIR" >/dev/null 2>&1; then
    fail "repair accepted $collision backup collision"
  fi
  [[ -d "$collision_profile" ]] || fail "repair mutated profile on $collision collision"
done

printf 'ok - crash-loop profile repair\n'

# Production installs default to the stable Chrome for Testing channel.
grep -Fq 'CHANNEL="${MUSKETEER_CHROME_CHANNEL:-Stable}"' \
  "$ROOT_DIR/scripts/install-automation-chrome" || fail 'stable install channel is not the default'
printf 'ok - stable Chrome for Testing default\n'

# Project defaults attach agent-browser to the singleton CDP session without
# launching a second browser or weakening its security boundary.
python - "$ROOT_DIR/agent-browser.json" <<'PY'
import json, sys
with open(sys.argv[1], encoding="utf-8") as stream:
    config = json.load(stream)
expected = {
    "cdp": "9222",
    "namespace": "musketeer",
    "session": "musketeer",
    "contentBoundaries": True,
    "maxOutput": 50000,
}
if config != expected:
    raise SystemExit(f"unexpected agent-browser config: {config!r}")
PY
printf 'ok - agent-browser shared-session config\n'
