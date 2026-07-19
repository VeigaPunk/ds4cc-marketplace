#!/usr/bin/env bash
set -euo pipefail

base_url=${1:?usage: smoke-deployment.sh BASE_URL}
exec node "$(dirname "$0")/smoke-deployment.mjs" "$base_url"
