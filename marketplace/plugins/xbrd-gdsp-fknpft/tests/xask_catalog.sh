#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

for bin in codex xbreed grok codex-token-plan gemma-hvm sekhmet kimi; do
  printf '#!/usr/bin/env sh\nexit 0\n' >"$TMP/$bin"
  chmod +x "$TMP/$bin"
done

export PATH="$TMP:/usr/bin:/bin"
export XASK_CATALOG_FILE="$ROOT/config/xask-models.json"
export XBREED_DISPATCH_DIR="$ROOT/templates/dispatch"
XASK="$ROOT/scripts/xask"

fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }

catalog="$($XASK catalog --json)"
jq -e '
  .schema_version == 1
  and .model_count == 17
  and (.providers | length) == 5
  and (.providers | all(.available == true))
  and (.models | any(.model_id == "gpt-5.6-sol" and (.supported_efforts | index("ultra"))))
  and (.models | any(.model_id == "grok-4.5" and (.supported_efforts | index("xhigh") | not)))
  and (.models | any(.model_id == "deepseek-v4-pro-0813" and .route == "ds-pro"))
  and (.models | any(.model_id == "kimi-k3" and .provider == "moonshot" and .route == "kimi"
        and (.supported_efforts == ["low", "high", "max"]) and .default_effort == "high"))
' <<<"$catalog" >/dev/null || fail 'catalog schema or inventory mismatch'

PARTIAL="$TMP/partial"
mkdir -p "$PARTIAL"
printf '#!/usr/bin/env sh\nexit 0\n' >"$PARTIAL/codex-qwen38"
printf '#!/usr/bin/env sh\nexit 0\n' >"$PARTIAL/gemma-hvm"
printf '#!/usr/bin/env sh\nexit 0\n' >"$PARTIAL/kimi"
chmod +x "$PARTIAL/codex-qwen38" "$PARTIAL/gemma-hvm" "$PARTIAL/kimi"
partial_catalog="$(PATH="$PARTIAL:/usr/bin:/bin" XASK_CATALOG_FILE="$ROOT/config/xask-models.json" \
  "$ROOT/scripts/xask-models" catalog)"
jq -e '
  (.models[] | select(.model_id == "qwen3.8-max") | .available) == true
  and (.models[] | select(.model_id == "deepseek-v4-flash-0731") | .available) == false
  and (.models[] | select(.model_id == "deepseek-v4-pro-0813") | .available) == false
  and (.models[] | select(.model_id == "gemma4:26b") | .available) == false
  and (.models[] | select(.model_id == "kimi-k3") | .available) == true
' <<<"$partial_catalog" >/dev/null \
  || fail 'catalog availability did not honor exact Token Plan wrappers and xbreed dependency'

plan="$($XASK plan --provider chatgpt --model-id gpt-5.6-sol --effort ultra --service-tier fast --json -- 'quote " and space')"
jq -e '
  .executes == false
  and .selection == {provider:"chatgpt",substrate:"stock",model_id:"gpt-5.6-sol",effort:"ultra",service_tier:"fast"}
  and .argv[-1] == "quote \" and space | godspeed"
  and ([.argv[] | select(. == "--gs")] | length) == 1
' <<<"$plan" >/dev/null || fail 'ChatGPT plan was not normalized'

plan="$($XASK plan --provider token-plan --model-id qwen3.8-max --json -- probe)"
jq -e '.selection.effort == "xhigh" and .selection.model_id == "qwen3.8-max"' <<<"$plan" >/dev/null \
  || fail 'Token Plan did not receive its catalog default effort'

plan="$($XASK plan --provider moonshot --json -- probe)"
jq -e '.selection.effort == "high" and .selection.model_id == "kimi-k3"' <<<"$plan" >/dev/null \
  || fail 'Moonshot did not receive its catalog default effort'
if "$XASK" plan --provider moonshot --effort medium --json -- probe >/dev/null 2>&1; then
  fail 'Moonshot accepted unsupported medium effort'
fi
if "$XASK" plan --provider moonshot --model-id grok-4.6 --json -- probe >/dev/null 2>&1; then
  fail 'normalized provider mode accepted a cross-provider model id (moonshot)'
fi
# Catalog-bound invariant: provider mode rejects non-catalog Kimi aliases;
# arbitrary CLI aliases remain reachable through the LEGACY route only.
if "$XASK" plan --provider moonshot --model-id kimi-for-coding --json -- probe >/dev/null 2>&1; then
  fail 'moonshot provider mode accepted a non-catalog model id'
fi

if "$XASK" plan --provider token-plan --model-id qwen3.8-max --effort high --json -- probe >/dev/null 2>&1; then
  fail 'Token Plan accepted unsupported high effort'
fi
if "$XASK" plan --provider grok --model-id grok-4.5 --effort xhigh --json -- probe >/dev/null 2>&1; then
  fail 'Grok 4.5 accepted unsupported xhigh effort'
fi
if "$XASK" plan --provider grok --model-id gpt-5.6-sol --effort low --json -- probe >/dev/null 2>&1; then
  fail 'normalized provider mode accepted a cross-provider model id'
fi
if "$XASK" plan --provider chatgpt --model-id gpt-daybreak-blue-latest --service-tier fast --json -- probe >/dev/null 2>&1; then
  fail 'Daybreak accepted unsupported fast tier'
fi
if "$XASK" plan --provider chatgpt --substrate sekhmet --model-id gpt-5.6-luna --effort high --json -- probe >/dev/null 2>&1; then
  fail 'Sekhmet accepted an effort it silently drops'
fi
plan="$($XASK plan --provider chatgpt --substrate sekhmet --model-id gpt-5.6-luna --json -- probe)"
jq -e '.selection.effort == "low" and .selection.substrate == "sekhmet"' <<<"$plan" >/dev/null \
  || fail 'Sekhmet plan did not normalize to low'
plan="$($XASK plan --provider chatgpt --substrate sekhmet --model-id gpt-5.6-luna --service-tier fast --json -- probe)"
jq -e '.selection.service_tier == "fast" and .selection.substrate == "sekhmet"' <<<"$plan" >/dev/null \
  || fail 'Sekhmet fast tier was not preserved in the normalized plan'

legacy_spark_plan="$($XASK plan --spark --json codex probe)"
jq -e '.selection.model_id == "gpt-5.6-luna" and .selection.service_tier == "default"' \
  <<<"$legacy_spark_plan" >/dev/null || fail 'legacy Spark plan drifted from the Luna/default runtime'

custom_plan="$($XASK plan --provider chatgpt --model-id gpt-5.6-sol --json -- \
  probe 'shared context' reviewer)"
jq -e '
  ([.argv[] | select(. == "--gs")] | length) == 1
  and .argv[-2] == "shared context"
  and .argv[-1] == "reviewer"
' <<<"$custom_plan" >/dev/null || fail 'plan dropped an additive custom skill or Godspeed marker'

plan="$($XASK plan --provider grok --model-id grok-4.6 --json -- 'probe | godspeed | godspeed')"
jq -e '
  .argv[-1] == "probe | godspeed"
  and ([.argv[] | select(. == "--gs")] | length) == 1
' <<<"$plan" >/dev/null || fail 'Godspeed plan closer was not canonicalized exactly once'

plan="$($XASK plan --provider grok --model-id grok-4.6 --json -- 'probe | GODSPEED |godspeed')"
jq -e '
  .argv[-1] == "probe | godspeed"
  and ([.argv[] | select(. == "--gs")] | length) == 1
' <<<"$plan" >/dev/null || fail 'case/spacing variants of the Godspeed closer survived normalization'

if "$XASK" -d --spark gemma probe >/dev/null 2>&1; then
  fail 'Gemma accepted ChatGPT-only spark substrate'
fi

legacy_grok="$(JSON=true "$XASK" -d grok probe)"
grep -Fq -- '-m grok-4.6' <<<"$legacy_grok" \
  || fail 'legacy Grok route did not pin the exported default model'

printf 'PASS: xask normalized catalog, provider plan, and capability gates\n'
