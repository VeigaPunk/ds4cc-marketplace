#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BIN="$ROOT/target/debug/xbreed"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

cat >"$TMP/tmux" <<EOF
#!/usr/bin/env sh
touch "$TMP/tmux-was-called"
exit 99
EOF
chmod +x "$TMP/tmux"

if grep -Eq 'std::process|Command::|tmux' "$ROOT/src/precheck.rs"; then
  printf 'FAIL: precheck source contains process/tmux invocation surface\n' >&2
  exit 1
fi

for team_size in 0 1 63 64; do
  PATH="$TMP:/usr/bin:/bin" "$BIN" precheck pane-cap -n "$team_size" >"$TMP/out" 2>"$TMP/err"
  grep -Fq "pane-cap ok: team_size=$team_size" "$TMP/out"
done

if PATH="$TMP:/usr/bin:/bin" "$BIN" precheck pane-cap -n 65 >"$TMP/out" 2>"$TMP/err"; then
  printf 'FAIL: pane-cap accepted team_size 65\n' >&2
  exit 1
fi
grep -Fq 'maximum team size is 64' "$TMP/err"

if [[ -e "$TMP/tmux-was-called" ]]; then
  printf 'FAIL: pane-cap invoked tmux\n' >&2
  exit 1
fi

cat >"$TMP/codex" <<EOF
#!/usr/bin/env sh
printf 'invoked\n' >>"$TMP/codex-was-called"
EOF
chmod +x "$TMP/codex"
mkdir -p "$TMP/.config/xbreed/skills/godspeed"
printf 'Read directive.md exactly.\n' >"$TMP/.config/xbreed/skills/godspeed/SKILL.md"
install -m 0644 "$ROOT/skills/godspeed/directive.md" \
  "$TMP/.config/xbreed/skills/godspeed/directive.md"

for effort in low medium high xhigh max ultra; do
  HOME="$TMP" PATH="$TMP:/usr/bin:/bin" "$BIN" ask codex -e "$effort" prompt >"$TMP/out" 2>"$TMP/err"
done
[[ $(wc -l <"$TMP/codex-was-called") -eq 6 ]] || {
  printf 'FAIL: not all six direct effort values reached fake codex\n' >&2
  exit 1
}

before=$(wc -l <"$TMP/codex-was-called")
set +e
HOME="$TMP" PATH="$TMP:/usr/bin:/bin" "$BIN" ask codex -e arbitrary prompt >"$TMP/out" 2>"$TMP/err"
rc=$?
set -e
[[ $rc -eq 2 ]] || { printf 'FAIL: invalid direct effort returned rc=%d instead of 2\n' "$rc" >&2; exit 1; }
grep -Fq "invalid value 'arbitrary' for '--effort <EFFORT>'" "$TMP/err"
[[ $(wc -l <"$TMP/codex-was-called") -eq $before ]] || {
  printf 'FAIL: invalid direct effort invoked fake codex\n' >&2
  exit 1
}

printf 'PASS: precheck is process-free, pane-cap is bounded, and direct effort matrix is constrained before invocation\n'
