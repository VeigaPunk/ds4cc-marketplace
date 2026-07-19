#!/bin/bash
set -euo pipefail

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
CHITCHAT="$ROOT/chitchat"

bash -n "$CHITCHAT"
[[ "$(bash "$CHITCHAT" --version)" == "chitchat 1.1.0" ]]
bash "$CHITCHAT" --help | grep -q -- '--stdin'
if bash "$CHITCHAT" --unknown-option >/dev/null 2>&1; then exit 1; fi
if bash "$CHITCHAT" >/dev/null 2>&1; then exit 1; fi
if printf '' | bash "$CHITCHAT" --stdin >/dev/null 2>&1; then exit 1; fi
if printf 'prompt' | bash "$CHITCHAT" --stdin extra >/dev/null 2>&1; then exit 1; fi
if bash "$CHITCHAT" --image --web-search prompt >/dev/null 2>&1; then exit 1; fi

batch=$(printf 'quote " newline\nslash \\' | /usr/bin/node "$ROOT/chitchat-batch.mjs")
/usr/bin/node -e '
  const value = JSON.parse(process.argv[1]);
  if (value[0][0] !== "keyboard" || value[0][1] !== "inserttext") process.exit(1);
  if (value[0][2] !== "quote \" newline\nslash \\") process.exit(1);
  if (value[1][0] !== "press" || value[1][1] !== "Enter") process.exit(1);
' "$batch"

echo "chitchat dry tests passed"
