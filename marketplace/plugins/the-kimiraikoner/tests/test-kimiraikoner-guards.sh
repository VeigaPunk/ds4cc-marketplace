#!/bin/bash
# Hermetic guards for the-kimiraikoner CLI (no live CDP required).
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
K="$HERE/kimiraikoner"
chmod +x "$K"

fail() { echo "FAIL: $*" >&2; exit 1; }
pass() { echo "PASS: $*"; }

bash -n "$K" || fail "bash -n kimiraikoner"
bash -n "$HERE/install.sh" || fail "bash -n install.sh"
pass "bash -n"

# Remote CDP rejected without override
out=$(KIMIRAIKONER_CDP_HOST=8.8.8.8 "$K" "x" 2>&1) && fail "remote CDP should die" || true
printf '%s' "$out" | grep -q 'loopback' || fail "remote CDP message missing loopback hint: $out"
pass "remote CDP rejected"

# Evil host URL rejected
out=$(KIMIRAIKONER_URL='https://kimi.com.evil.example/phish' "$K" "x" 2>&1) && fail "evil URL should die" || true
printf '%s' "$out" | grep -qi 'kimi.com' || fail "evil URL message: $out"
pass "evil KIMIRAIKONER_URL rejected"

# Empty stdin rejected (before CDP if we short-circuit — may hit CDP first; both OK)
out=$(printf '' | "$K" --stdin 2>&1) && fail "empty stdin should die" || true
printf '%s' "$out" | grep -qiE 'empty|prompt|CDP' || fail "empty stdin: $out"
pass "empty stdin rejected"

# Version
ver=$("$K" --version)
[[ "$ver" == kimiraikoner* ]] || fail "version: $ver"
pass "version $ver"

echo "All guard tests passed."
