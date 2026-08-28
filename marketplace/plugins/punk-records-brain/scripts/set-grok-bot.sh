#!/usr/bin/env bash
# set grok bot for me — preferred-CLI entry. Same as bootstrap --cli auto.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec bash "$ROOT/scripts/bootstrap-grok-bot.sh" --cli auto "$@"
