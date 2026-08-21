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

# Default open target is the kimi.ai TLD
help=$("$K" --help)
printf '%s' "$help" | grep -q 'www.kimi.ai' || fail "help default URL: $help"
pass "default URL is kimi.ai"

# Evil host URL rejected (new TLD spoof)
out=$(KIMIRAIKONER_URL='https://kimi.ai.evil.example/phish' "$K" "x" 2>&1) && fail "evil kimi.ai URL should die" || true
printf '%s' "$out" | grep -qiE 'kimi\.ai|URL' || fail "evil kimi.ai URL message: $out"
pass "evil kimi.ai KIMIRAIKONER_URL rejected"

# Legacy kimi.com spoof still rejected
out=$(KIMIRAIKONER_URL='https://kimi.com.evil.example/phish' "$K" "x" 2>&1) && fail "evil kimi.com URL should die" || true
printf '%s' "$out" | grep -qiE 'kimi\.ai|kimi\.com|URL' || fail "evil kimi.com URL message: $out"
pass "evil kimi.com KIMIRAIKONER_URL rejected"

# Canonical kimi.ai passes the allowlist and dies at CDP (unused port keeps this hermetic)
out=$(KIMIRAIKONER_CDP_PORT=1 KIMIRAIKONER_URL='https://www.kimi.ai' "$K" "x" 2>&1) && fail "unused port should die" || true
printf '%s' "$out" | grep -qi 'CDP' || fail "allowed kimi.ai should reach CDP check: $out"
printf '%s' "$out" | grep -q 'must be a kimi' && fail "allowed kimi.ai rejected by allowlist: $out" || true
pass "www.kimi.ai allowed"

# Legacy kimi.com still allowed so existing signed-in tabs keep matching
out=$(KIMIRAIKONER_CDP_PORT=1 KIMIRAIKONER_URL='https://www.kimi.com' "$K" "x" 2>&1) && fail "unused port should die" || true
printf '%s' "$out" | grep -qi 'CDP' || fail "legacy kimi.com should reach CDP check: $out"
pass "www.kimi.com still allowed"

# Empty stdin rejected (before CDP if we short-circuit — may hit CDP first; both OK)
out=$(printf '' | "$K" --stdin 2>&1) && fail "empty stdin should die" || true
printf '%s' "$out" | grep -qiE 'empty|prompt|CDP' || fail "empty stdin: $out"
pass "empty stdin rejected"

# Version
ver=$("$K" --version)
[[ "$ver" == kimiraikoner* ]] || fail "version: $ver"
pass "version $ver"

echo "All guard tests passed."
