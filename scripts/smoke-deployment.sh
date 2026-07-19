#!/usr/bin/env bash
set -euo pipefail

base_url=${1:?usage: smoke-deployment.sh BASE_URL [EXPECTED_CHALLENGE]}
expected_challenge=${2:-}
base_url=${base_url%/}

curl_common=(--connect-timeout 5 --max-time 15 --retry 2 --retry-connrefused --silent --show-error)

for _ in {1..30}; do
  if curl "${curl_common[@]}" --fail "$base_url/health" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

health=$(curl "${curl_common[@]}" --fail "$base_url/health")
[[ $health == *'"status":"ok"'* ]]
printf '%s\n' 'PASS /health'

for route in privacy terms support; do
  curl "${curl_common[@]}" --fail "$base_url/$route" >/dev/null
  printf 'PASS /%s\n' "$route"
done

if [[ -n $expected_challenge ]]; then
  challenge=$(curl "${curl_common[@]}" --fail "$base_url/.well-known/openai-apps-challenge")
  [[ $challenge == "$expected_challenge" ]]
  headers=$(curl "${curl_common[@]}" --fail --head "$base_url/.well-known/openai-apps-challenge" | tr -d '\r')
  grep -qi '^cache-control: no-store$' <<<"$headers"
  printf '%s\n' 'PASS /.well-known/openai-apps-challenge (exact, no-store)'
fi

mcp_status=$(curl "${curl_common[@]}" --output /dev/null --write-out '%{http_code}' "$base_url/mcp")
[[ $mcp_status == 400 ]]
printf '%s\n' 'PASS /mcp rejects a sessionless GET (400)'
