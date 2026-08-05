#!/usr/bin/env bash
# M05 — cheap multi-CLI parity probe for marketplace plugins (static + dry host checks).
# Default: --dry-run (no install). Optional: --live <plugin> for a sample live check.
set -euo pipefail

MODE="dry-run"
LIVE_PLUGIN=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) MODE="dry-run"; shift ;;
    --live)
      MODE="live"
      LIVE_PLUGIN="${2:-}"
      if [[ -z "$LIVE_PLUGIN" ]]; then
        echo "usage: $0 [--dry-run] | --live <plugin-name>" >&2
        exit 2
      fi
      shift 2
      ;;
    -h|--help)
      echo "usage: $0 [--dry-run] | --live <plugin-name>"
      echo "  --dry-run  static package + host PATH checks (default)"
      echo "  --live X   dry checks + sample live smoke for plugin X only"
      exit 0
      ;;
    *)
      echo "unknown arg: $1" >&2
      exit 2
      ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MARKETPLACE_JSON="${REPO_ROOT}/marketplace/marketplace.json"
PLUGINS_ROOT="${REPO_ROOT}/marketplace/plugins"
KIMI_ART="${REPO_ROOT}/.kimi-plugin/artifacts"
KIMI_PKG="${REPO_ROOT}/.kimi-plugin/packages"
EVID_DIR="${HOME}/.xbgst/evidence/ds4cc-cli-parity-2026-08-05"
EVID_TSV="${EVID_DIR}/M05-probe.tsv"

if [[ ! -f "$MARKETPLACE_JSON" ]]; then
  echo "missing marketplace catalog: $MARKETPLACE_JSON" >&2
  exit 1
fi

mkdir -p "$EVID_DIR"

# Host CLI presence (PATH only; no install)
host_ok() { command -v "$1" >/dev/null 2>&1 && echo ok || echo missing; }
HOST_GROK="$(host_ok grok)"
if command -v codex-titanium >/dev/null 2>&1; then
  HOST_CODEX="ok:codex-titanium"
elif command -v codex >/dev/null 2>&1; then
  HOST_CODEX="ok:codex"
else
  HOST_CODEX="missing"
fi
HOST_SEKHMET="$(host_ok sekhmet)"
OPENCODE_SCRIPT="${REPO_ROOT}/scripts/check-opencode-install.mjs"
HOST_OPENCODE_SCRIPT="missing"
[[ -f "$OPENCODE_SCRIPT" ]] && HOST_OPENCODE_SCRIPT="ok"

# Parse plugin names (python3 — present on all probe hosts)
mapfile -t PLUGINS < <(python3 - <<'PY' "$MARKETPLACE_JSON"
import json, sys
path = sys.argv[1]
with open(path) as f:
    data = json.load(f)
for p in data.get("plugins", []):
    name = p.get("name")
    if name:
        print(name)
PY
)

if [[ ${#PLUGINS[@]} -eq 0 ]]; then
  echo "no plugins listed in $MARKETPLACE_JSON" >&2
  exit 1
fi

yn() { [[ -f "$1" ]] && echo ok || echo missing; }

skills_nonempty() {
  local d="$1/skills"
  if [[ -d "$d" ]] && find "$d" -type f -name 'SKILL.md' 2>/dev/null | grep -q .; then
    echo ok
  elif [[ -d "$d" ]] && find "$d" -type f 2>/dev/null | grep -q .; then
    echo ok
  else
    echo missing
  fi
}

zip_or_artifact() {
  local name="$1"
  local z
  # Prefer versioned artifact/package zip matching name-
  for dir in "$KIMI_ART" "$KIMI_PKG"; do
    [[ -d "$dir" ]] || continue
    z="$(find "$dir" -maxdepth 1 -type f -name "${name}-*.zip" 2>/dev/null | head -n1 || true)"
    if [[ -n "${z:-}" ]]; then
      echo "ok:$(basename "$z")"
      return 0
    fi
  done
  # Plugin-local zip
  z="$(find "${PLUGINS_ROOT}/${name}" -maxdepth 2 -type f -name '*.zip' 2>/dev/null | head -n1 || true)"
  if [[ -n "${z:-}" ]]; then
    echo "ok:$(basename "$z")"
    return 0
  fi
  # Cargo/binary build artifact for rust plugins
  if [[ -x "${PLUGINS_ROOT}/${name}/target/release/${name}" ]] || \
     [[ -f "${PLUGINS_ROOT}/${name}/Cargo.toml" && -d "${PLUGINS_ROOT}/${name}/target" ]]; then
    echo "ok:build-target"
    return 0
  fi
  echo missing
}

# Header
HEADER=$'plugin\tplugin.json\t.codex-plugin/plugin.json\tkimi.plugin.json\tzip_or_artifact\tskills\thost_grok\thost_codex\thost_sekhmet\topencode_script\tmode\tstatus'
{
  echo "$HEADER"
} >"$EVID_TSV"

fail_count=0
pass_count=0

for name in "${PLUGINS[@]}"; do
  pdir="${PLUGINS_ROOT}/${name}"
  pj="$(yn "${pdir}/plugin.json")"
  cpj="$(yn "${pdir}/.codex-plugin/plugin.json")"
  kj="$(yn "${pdir}/kimi.plugin.json")"
  za="$(zip_or_artifact "$name")"
  sk="$(skills_nonempty "$pdir")"

  # Missing package files => fail (required: plugin.json + kimi + codex + zip/artifact)
  status="PASS"
  if [[ "$pj" == missing || "$cpj" == missing || "$kj" == missing || "$za" == missing ]]; then
    status="FAIL"
    fail_count=$((fail_count + 1))
  else
    # skills soft? task says check non-empty — treat empty skills as FAIL for catalog integrity
    if [[ "$sk" == missing ]]; then
      status="FAIL"
      fail_count=$((fail_count + 1))
    else
      pass_count=$((pass_count + 1))
    fi
  fi

  line=$(printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s' \
    "$name" "$pj" "$cpj" "$kj" "$za" "$sk" \
    "$HOST_GROK" "$HOST_CODEX" "$HOST_SEKHMET" "$HOST_OPENCODE_SCRIPT" \
    "$MODE" "$status")
  printf '%s\n' "$line"
  printf '%s\n' "$line" >>"$EVID_TSV"
done

# Host summary row
hstatus="PASS"
if [[ "$HOST_GROK" == missing || "$HOST_CODEX" == missing || "$HOST_SEKHMET" == missing || "$HOST_OPENCODE_SCRIPT" == missing ]]; then
  hstatus="FAIL"
  fail_count=$((fail_count + 1))
fi
hline=$(printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s' \
  "_host" "n/a" "n/a" "n/a" "n/a" "n/a" \
  "$HOST_GROK" "$HOST_CODEX" "$HOST_SEKHMET" "$HOST_OPENCODE_SCRIPT" \
  "$MODE" "$hstatus")
printf '%s\n' "$hline"
printf '%s\n' "$hline" >>"$EVID_TSV"

# Optional live sample (no full install; only if --live <name>)
if [[ "$MODE" == "live" ]]; then
  live_dir="${PLUGINS_ROOT}/${LIVE_PLUGIN}"
  live_status="FAIL"
  live_note="plugin_dir_missing"
  if [[ -d "$live_dir" ]]; then
    # Sample: validate plugin.json is parseable JSON + skills present
    if python3 -c "import json; json.load(open('${live_dir}/plugin.json'))" 2>/dev/null \
      && [[ -f "${live_dir}/kimi.plugin.json" ]]; then
      live_status="PASS"
      live_note="json_parse_ok"
    else
      live_note="json_parse_fail"
    fi
  fi
  lline=$(printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s' \
    "_live:${LIVE_PLUGIN}" "n/a" "n/a" "n/a" "$live_note" "n/a" \
    "$HOST_GROK" "$HOST_CODEX" "$HOST_SEKHMET" "$HOST_OPENCODE_SCRIPT" \
    "live" "$live_status")
  printf '%s\n' "$lline"
  printf '%s\n' "$lline" >>"$EVID_TSV"
  if [[ "$live_status" == FAIL ]]; then
    fail_count=$((fail_count + 1))
  fi
fi

# Footer to stderr for humans
{
  echo "# plugins=${#PLUGINS[@]} pass=${pass_count} fail_rows=${fail_count} mode=${MODE}"
  echo "# evidence=${EVID_TSV}"
} >&2

if [[ "$fail_count" -gt 0 ]]; then
  exit 1
fi
exit 0
