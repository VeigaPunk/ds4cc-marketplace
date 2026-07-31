#!/usr/bin/env bash
set -euo pipefail

install -m 0600 /run/host-auth/auth.json "$HOME/.codex/auth.json"
export PATH="$HOME/.local/bin:$PATH"
export BENCH_OUTPUT_ROOT=/out
export BENCH_FNM_CMD="$HOME/.local/share/fnm/fnm"
export BENCH_CODEX_CMD="$HOME/.local/bin/codex"
export BENCH_XASK_CMD="$HOME/.local/bin/xask"
export BENCH_XBREED_CMD="$HOME/.local/bin/xbreed"

exec "$@"
