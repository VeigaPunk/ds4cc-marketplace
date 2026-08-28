#!/usr/bin/env bash
# Seed a Punk Records tree. Does not overwrite existing files.
set -euo pipefail

DEST="${1:-./punk-records}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${ROOT}/templates/punk-records"

if [[ ! -d "$SRC" ]]; then
  echo "missing templates: $SRC" >&2
  exit 1
fi

mkdir -p "$DEST/satellites" "$DEST/tasks"

copied=0
skipped=0
while IFS= read -r -d '' src; do
  rel="${src#"$SRC"/}"
  dst="$DEST/$rel"
  mkdir -p "$(dirname "$dst")"
  if [[ -e "$dst" ]]; then
    skipped=$((skipped + 1))
    continue
  fi
  cp "$src" "$dst"
  copied=$((copied + 1))
done < <(find "$SRC" -type f -print0)

echo "punk-records seeded at $DEST (copied $copied, kept $skipped existing)"
