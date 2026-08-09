#!/usr/bin/env bash
# Compare TTFB to candidate hosts (run from BR for meaningful numbers).
set -euo pipefail

URLS=(
  "https://ds4cc.com/"
  "https://veigapunk.github.io/omegag-site/"
  "https://vgpnk-holdings-llc.github.io/omegaG/"
  "https://github.com/"
  "https://cloudflare.com/"
)

printf '%-48s %10s %10s %10s %10s\n' URL dns connect tls ttfb
for u in "${URLS[@]}"; do
  # shellcheck disable=SC2016
  out=$(curl -so /dev/null -w '%{time_namelookup} %{time_connect} %{time_appconnect} %{time_starttransfer}' "$u" || echo '0 0 0 0')
  read -r dns conn tls ttfb <<<"$out"
  printf '%-48s %10.3f %10.3f %10.3f %10.3f\n' "$u" "$dns" "$conn" "$tls" "$ttfb"
done

echo
echo "Tip: prefer Cloudflare Pages or sa-east-1 origin for sticky low TTFB in BR."
