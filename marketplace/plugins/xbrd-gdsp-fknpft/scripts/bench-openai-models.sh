#!/usr/bin/env bash
set -euo pipefail
umask 077

SCRIPT_DIR="$(dirname -- "$(readlink -f -- "${BASH_SOURCE[0]}")")"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DEFAULT_PROMPT_DIR="$REPO_ROOT/benchmarks/openai-model-v1/prompts/v1"
DEFAULT_STATE_ROOT="${XDG_STATE_HOME:-$HOME/.local/state}/xbrd-gdsp-fknpft/openai-model-v1"

MAX_RETRIES=5
MAX_REPETITIONS=5
MAX_TRIALS=2000
MAX_PAID_ATTEMPTS=4000
PROMPT_SENTINEL='__XBRD_PROMPT_SENTINEL__'

RUN_LIVE=false
REFRESH_CATALOG=false
ALLOW_CUSTOM_PROMPTS=false
SEED=""
OUTPUT_ROOT="${BENCH_OUTPUT_ROOT:-$DEFAULT_STATE_ROOT}"
PROMPT_DIR="${BENCH_PROMPT_DIR:-$DEFAULT_PROMPT_DIR}"
ROUTES_CSV="raw,xask,xbreed"
RETRIES="${BENCH_RETRIES:-0}"
REPETITIONS="${BENCH_REPETITIONS:-1}"
TIMEOUT_S="${BENCH_TIMEOUT_S:-0}"
FNM_CMD="${BENCH_FNM_CMD:-fnm}"
CODEX_CMD="${BENCH_CODEX_CMD:-codex}"
XASK_CMD="${BENCH_XASK_CMD:-xask}"
XBREED_CMD="${BENCH_XBREED_CMD:-xbreed}"

die(){ printf 'bench-openai-models: %s\n' "$*" >&2; exit 1; }
sha256_file(){ sha256sum -- "$1" | cut -d' ' -f1; }
sha256_text(){ printf '%s' "$1" | sha256sum | cut -d' ' -f1; }
realpath_abs(){ realpath -e -- "$1"; }

is_uint(){ [[ "$1" =~ ^[0-9]+$ ]]; }
is_decimal(){ [[ "$1" =~ ^[0-9]+([.][0-9]+)?$ ]]; }

validate_uint(){
  local name="$1" value="$2" max="$3"
  is_uint "$value" || die "$name must be a non-negative decimal integer: $value"
  (( 10#$value <= max )) || die "$name exceeds cap $max: $value"
}

validate_decimal(){
  local name="$1" value="$2" max="$3"
  is_decimal "$value" || die "$name must be a non-negative decimal number: $value"
  perl -e 'exit(($ARGV[0]+0) <= ($ARGV[1]+0) ? 0 : 1)' "$value" "$max" || die "$name exceeds cap $max: $value"
}

validate_routes(){
  local raw="$1" out_var="$2"
  declare -A seen=()
  local -a out=()
  local route
  IFS=',' read -r -a routes <<<"$raw"
  ((${#routes[@]})) || die "routes cannot be empty"
  for route in "${routes[@]}"; do
    [[ -n "$route" ]] || die "routes cannot contain empty items"
    case "$route" in raw|xask|xbreed) ;; *) die "invalid route: $route" ;; esac
    [[ -z "${seen[$route]:-}" ]] || continue
    seen[$route]=1
    out+=("$route")
  done
  ((${#out[@]})) || die "no valid routes"
  printf -v "$out_var" '%s' "$(IFS=,; printf '%s' "${out[*]}")"
}

argv_json(){
  perl -MJSON::PP -e 'print JSON::PP->new->canonical->encode(\@ARGV)' -- "$@"
}

argv_redacted_json(){
  local -a argv=("$@")
  local last=$(( ${#argv[@]} - 1 ))
  argv[$last]='<PROMPT>'
  argv_json "${argv[@]}"
}

route_selected(){
  case ",$ROUTES_CSV," in *",$1,"*) return 0 ;; *) return 1 ;; esac
}

read_prompt_bytes(){
  local src="$1"
  perl -e '
    use strict; use warnings;
    my ($path, $sentinel) = @ARGV;
    open my $fh, "<:raw", $path or die "open $path: $!";
    local $/;
    my $s = <$fh>;
    defined $s or die "read $path: $!";
    die "prompt contains NUL: $path" if index($s, "\0") >= 0;
    die "prompt ends with sentinel: $path" if length($s) >= length($sentinel) && substr($s, -length($sentinel)) eq $sentinel;
    print $s, $sentinel;
  ' "$src" "$PROMPT_SENTINEL"
}

resolve_exec(){
  local candidate="$1" path=""
  if [[ "$candidate" == */* ]]; then
    path="$(readlink -f -- "$candidate" 2>/dev/null || printf '%s' "$candidate")"
  else
    path="$(command -v -- "$candidate" 2>/dev/null || true)"
  fi
  [[ -n "$path" && -x "$path" && ! -L "$path" ]] || die "executable not found or not executable: $candidate"
  printf '%s' "$path"
}

ensure_output_root(){
  local root="$1" uid
  uid="$(id -u)"
  if [[ -e "$root" ]]; then
    [[ ! -L "$root" ]] || die "output root must not be a symlink: $root"
    [[ -d "$root" ]] || die "output root must be a directory: $root"
    [[ "$(stat -c '%u' -- "$root")" == "$uid" ]] || die "output root must be owned by current user: $root"
    chmod 700 -- "$root" || die "chmod failed on output root: $root"
    [[ "$(stat -c '%a' -- "$root")" == 700 ]] || die "output root must be mode 0700: $root"
  else
    mkdir -p -- "$root"
    chmod 700 -- "$root" || die "chmod failed on output root: $root"
  fi
}

prompt_allowed(){
  local prompt_dir="$1" default_dir="$2"
  if [[ "$RUN_LIVE" == true && "$prompt_dir" != "$default_dir" && "$ALLOW_CUSTOM_PROMPTS" != true && "${BENCH_ALLOW_CUSTOM_PROMPTS:-}" != YES ]]; then
    die "live runs require default trusted fixtures or BENCH_ALLOW_CUSTOM_PROMPTS=YES/--allow-custom-prompts"
  fi
}

copy_prompt(){
  local src="$1" dest_dir="$2" prompt_dir_real="$3" prompt_id prompt_real dest
  [[ -L "$src" ]] && die "prompt fixture must not be a symlink: $src"
  [[ -f "$src" ]] || die "prompt fixture must be a regular file: $src"
  prompt_real="$(realpath_abs "$src")"
  case "$prompt_real" in "$prompt_dir_real"/*) ;; "$prompt_dir_real") ;; *) die "prompt fixture escapes prompt dir: $src" ;; esac
  prompt_id="$(basename -- "$src")"
  dest="$dest_dir/$prompt_id"
  perl -MFcntl=:DEFAULT,O_NOFOLLOW -e '
    use strict; use warnings;
    my ($src, $dest) = @ARGV;
    my @before = lstat($src); die "lstat $src: $!" unless @before;
    die "refusing linked prompt" if $before[3] != 1;
    sysopen(my $in, $src, O_RDONLY|O_NOFOLLOW) or die "open $src: $!";
    my @opened = stat($in); die "fstat $src: $!" unless @opened;
    die "prompt changed during open" unless $before[0] == $opened[0] && $before[1] == $opened[1];
    sysopen(my $out, $dest, O_WRONLY|O_CREAT|O_EXCL, 0600) or die "create $dest: $!";
    my $buf;
    while (1) {
      my $n = sysread($in, $buf, 65536); die "read $src: $!" unless defined $n; last if $n == 0;
      my $off = 0; while ($off < $n) { my $w = syswrite($out, $buf, $n-$off, $off); die "write $dest: $!" unless defined $w; $off += $w; }
    }
    close($out) or die "close $dest: $!";
  ' "$src" "$dest" || die "failed to copy prompt fixture: $src"
  printf '%s\t%s\t%s\n' "$prompt_id" "$prompt_real" "$prompt_id"
}

catalog_cells(){
  jq -r '
    def emit($slug; $eff):
      if ($slug|type)=="string" and $slug != "" and ($eff|type)=="string" and $eff != "" then
        "\($slug)\t\($eff)"
      else empty end;
    (.models // [])[]? as $m
    | if ($m.visibility? == "list") then
        ($m.slug // empty) as $slug
        | (($m.supported_reasoning_levels // [])[]? | .effort? // empty) as $eff
        | emit($slug; $eff)
      elif ($m.visibility? == null) then
        (
          ($m.slug // $m.name // $m.id // $m.model // empty) as $slug
          | (($m.supported_reasoning_levels // [])[]? | .effort? // empty) as $eff
          | emit($slug; $eff)
        ),
        (
          ($m.slug // $m.name // $m.id // $m.model // empty) as $slug
          | (($m.supported_efforts // [])[]? | tostring) as $eff
          | emit($slug; $eff)
        )
      else empty end
  ' "$1" | sort -u
}

model_version(){
  local exec="$1"
  "$exec" --version 2>/dev/null | head -n 1 || true
}

node_version(){
  local fnm="$1"
  "$fnm" current 2>/dev/null | head -n 1 || true
}

make_trial_id(){ printf 't%05d' "$1"; }

validate_args(){
  validate_uint seed "${SEED:-0}" 4294967295
  validate_uint retries "$RETRIES" "$MAX_RETRIES"
  validate_uint repetitions "$REPETITIONS" "$MAX_REPETITIONS"
  validate_decimal timeout "$TIMEOUT_S" 86400
  validate_routes "$ROUTES_CSV" ROUTES_CSV
}

parse_args(){
  while (($#)); do
    case "$1" in
      --run) RUN_LIVE=true ;;
      --refresh-catalog) REFRESH_CATALOG=true ;;
      --allow-custom-prompts) ALLOW_CUSTOM_PROMPTS=true ;;
      --seed) SEED="${2:?missing seed}"; shift ;;
      --output-root) OUTPUT_ROOT="${2:?missing output root}"; shift ;;
      --prompt-dir) PROMPT_DIR="${2:?missing prompt dir}"; shift ;;
      --routes) ROUTES_CSV="${2:?missing routes}"; shift ;;
      --retries) RETRIES="${2:?missing retries}"; shift ;;
      --repetitions) REPETITIONS="${2:?missing repetitions}"; shift ;;
      --timeout-seconds) TIMEOUT_S="${2:?missing timeout}"; shift ;;
      --fnm-cmd) FNM_CMD="${2:?missing fnm}"; shift ;;
      --codex-cmd) CODEX_CMD="${2:?missing codex}"; shift ;;
      --xask-cmd) XASK_CMD="${2:?missing xask}"; shift ;;
      --xbreed-cmd) XBREED_CMD="${2:?missing xbreed}"; shift ;;
      -h|--help)
        cat <<'EOF'
Usage: bench-openai-models.sh [options]
  --run                   execute live attempts (requires BENCH_ALLOW_PAID=YES and BENCH_APPROVE_TRIALS=<count>)
  --refresh-catalog       use refreshed catalog (codex debug models)
  --allow-custom-prompts  opt-in for live custom prompt dirs
  --seed N                schedule seed
  --output-root DIR       private run root (default: XDG_STATE_HOME/.../openai-model-v1)
  --prompt-dir DIR        prompt fixture dir (default: benchmarks/openai-model-v1/prompts/v1)
  --routes CSV            raw,xask,xbreed subset (deduped)
  --retries N             max retries
  --repetitions N         repetitions per prompt fixture
  --timeout-seconds N     per-attempt timeout in seconds
EOF
        exit 0 ;;
      *) die "unknown argument: $1" ;;
    esac
    shift
  done
}

parse_usage(){
  perl -MJSON::PP -e '
    use strict; use warnings;
    my ($file) = @ARGV;
    open my $fh, "<", $file or die "open $file: $!";
    my $found;
  while (my $line = <$fh>) {
      chomp $line; next if $line =~ /^\s*$/;
      my $obj = eval { JSON::PP->new->decode($line) };
      if ($@) {
        die "malformed turn.completed usage" if $line =~ /"type"\s*:\s*"turn\.completed"/;
        next;
      }
      next unless ref($obj) eq "HASH" && ($obj->{type} // "") eq "turn.completed";
      $found = $obj;
    }
    die "missing turn.completed usage" unless $found;
    my $u = $found->{usage};
    die "missing usage object" unless ref($u) eq "HASH";
    my %want;
    for my $k (qw(input_tokens cached_input_tokens output_tokens)) {
      die "missing usage field $k" unless exists $u->{$k} && defined $u->{$k} && $u->{$k} =~ /^\d+$/;
      $want{$k} = 0 + $u->{$k};
    }
    for my $k (qw(cache_write_input_tokens reasoning_output_tokens)) {
      if (!exists $u->{$k} || !defined $u->{$k}) { $want{$k} = undef; next; }
      die "invalid usage field $k" unless $u->{$k} =~ /^\d+$/;
      $want{$k} = 0 + $u->{$k};
    }
    print JSON::PP->new->canonical->encode(\%want);
  ' "$1"
}

trial_manifest_json(){
  jq -nc \
    --arg trial_id "$1" --arg route "$2" --arg lane "$3" --arg requested_model "$4" --arg requested_effort "$5" \
    --arg prompt_id "$6" --arg prompt_hash "$7" --arg prompt_src "$8" --arg prompt_copy "$9" --argjson repetition "${10}" \
    '{trial_id:$trial_id,route:$route,lane:$lane,requested_model:$requested_model,requested_effort:$requested_effort,prompt_id:$prompt_id,prompt_hash:$prompt_hash,prompt_source:$prompt_src,prompt_copy:$prompt_copy,repetition:$repetition}'
}

attempt_record_json(){
  local trial_id="$1" attempt_no="$2" retry_of="$3" route="$4" lane="$5" requested_model="$6" requested_effort="$7" prompt_id="$8" prompt_hash="$9" prompt_copy="${10}" status="${11}" duration_s="${12}" exit_code="${13}" node_version="${14}" command_redacted_json="${15}" command_exact_path="${16}" stdout_path="${17}" stderr_path="${18}" attempt_dir="${19}" usage_json="${20}" output_tokens="${21}" input_tokens="${22}" cached_input_tokens="${23}" cache_write_input_tokens="${24}" reasoning_output_tokens="${25}" goodput_tok_s="${26}"
  jq -nc \
    --arg trial_id "$trial_id" --arg attempt_id "$trial_id.a$attempt_no" --arg retry_of "$retry_of" --arg route "$route" --arg lane "$lane" --arg requested_model "$requested_model" --arg requested_effort "$requested_effort" --arg prompt_id "$prompt_id" --arg prompt_hash "$prompt_hash" --arg prompt_copy "$prompt_copy" --arg status "$status" --arg node_version "$node_version" --arg command_redacted_json "$command_redacted_json" --arg command_exact_path "$command_exact_path" --arg stdout_path "$stdout_path" --arg stderr_path "$stderr_path" --arg attempt_dir "$attempt_dir" --arg usage_json "$usage_json" --argjson attempt_no "$attempt_no" --argjson duration_s "$duration_s" --argjson exit_code "$exit_code" --argjson output_tokens "$output_tokens" --argjson input_tokens "$input_tokens" --argjson cached_input_tokens "$cached_input_tokens" --argjson cache_write_input_tokens "$cache_write_input_tokens" --argjson reasoning_output_tokens "$reasoning_output_tokens" --argjson goodput_tok_s "$goodput_tok_s" '
    {trial_id:$trial_id,attempt_id:$attempt_id,attempt_no:$attempt_no,retry_of:(if $retry_of=="" then null else $retry_of end),route:$route,lane:$lane,requested_model:$requested_model,requested_effort:$requested_effort,prompt_id:$prompt_id,prompt_hash:$prompt_hash,prompt_copy:$prompt_copy,status:$status,duration_s:$duration_s,exit_code:$exit_code,ttft_s:null,ttft_status:(if $route=="raw" then "unavailable_no_incremental_token_events" else "unavailable_buffered" end),tpot_s:null,tpot_status:(if $route=="raw" then "unavailable_no_incremental_token_events" else "unavailable_buffered" end),decode_tok_s:null,decode_status:(if $route=="raw" then "unavailable_no_incremental_token_events" else "unavailable_buffered" end),goodput_label:"reported_output_tokens_per_invocation_second",goodput_tok_s:$goodput_tok_s,output_tokens:$output_tokens,usage:($usage_json|fromjson),input_tokens:$input_tokens,cached_input_tokens:$cached_input_tokens,cache_write_input_tokens:$cache_write_input_tokens,reasoning_output_tokens:$reasoning_output_tokens,command_redacted:($command_redacted_json|fromjson),command_exact_path:(if $command_exact_path=="" then null else $command_exact_path end),stdout_path:$stdout_path,stderr_path:$stderr_path,attempt_dir:$attempt_dir,node_version:$node_version}
    '
}

schedule_trials(){
  local seed="$1" semantic_tsv="$2" out_jsonl="$3" manifest_jsonl="$4"
  : > "$out_jsonl"
  : > "$manifest_jsonl"
  local line hash route lane requested_model requested_effort prompt_id prompt_hash prompt_copy prompt_src repetition trial_id key
  while IFS=$'\t' read -r route lane requested_model requested_effort prompt_id prompt_hash prompt_copy prompt_src repetition; do
    [[ -n "$route" ]] || continue
    key="$seed|$route|$lane|$requested_model|$requested_effort|$prompt_id|$prompt_hash|$repetition"
    hash="$(sha256_text "$key")"
    printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$hash" "$route" "$lane" "$requested_model" "$requested_effort" "$prompt_id" "$prompt_hash" "$prompt_copy" "$prompt_src" "$repetition"
  done < "$semantic_tsv" | sort -k1,1 -k2,2 -k3,3 -k4,4 -k5,5 -k6,6 -k7,7 | \
  awk -F'\t' 'BEGIN{OFS="\t"} {print $2,$3,$4,$5,$6,$7,$8,$9,$10}' > "$out_jsonl.semantic"
  local idx=1
  while IFS=$'\t' read -r route lane requested_model requested_effort prompt_id prompt_hash prompt_copy prompt_src repetition; do
    trial_id="$(make_trial_id "$idx")"
    idx=$((idx+1))
    printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$trial_id" "$route" "$lane" "$requested_model" "$requested_effort" "$prompt_id" "$prompt_hash" "$prompt_copy" "$prompt_src" "$repetition" >> "$out_jsonl"
    trial_manifest_json "$trial_id" "$route" "$lane" "$requested_model" "$requested_effort" "$prompt_id" "$prompt_hash" "$prompt_src" "$prompt_copy" "$repetition" >> "$manifest_jsonl"
  done < "$out_jsonl.semantic"
}

run_attempt(){
  local trial_id="$1" attempt_no="$2" retry_of="$3" route="$4" lane="$5" requested_model="$6" requested_effort="$7" prompt_id="$8" prompt_hash="$9" prompt_copy="${10}" prompt_dir_real="${11}" run_dir="${12}" fnm_path="${13}" codex_path="${14}" xask_path="${15}" xbreed_path="${16}" nodev="${17}" home="$HOME"
  local attempt_dir stdout_path stderr_path prompt_path prompt_text duration_s exit_code status command_redacted_json usage_json output_tokens input_tokens cached_input_tokens cache_write_input_tokens reasoning_output_tokens goodput_tok_s
  attempt_dir="$(mktemp -d "$run_dir/attempts/$trial_id.$attempt_no.XXXXXX")"
  chmod 700 "$attempt_dir" || die "chmod failed for attempt dir: $attempt_dir"
  stdout_path="$attempt_dir/stdout.log"
  stderr_path="$attempt_dir/stderr.log"
  prompt_path="$run_dir/inputs/$prompt_copy"
  prompt_text="$(read_prompt_bytes "$prompt_path")"
  prompt_text="${prompt_text%"$PROMPT_SENTINEL"}"
  local -a cmd=()
  case "$route:$lane:$requested_model:$requested_effort" in
    raw:raw-fast:*) cmd=("$fnm_path" exec "--using=$nodev" "$codex_path" exec --skip-git-repo-check --color never --ephemeral --sandbox workspace-write --json -c approval_policy=never -c include_permissions_instructions=false -c include_apps_instructions=false -c include_environment_context=false -c service_tier=fast -c features.fast_mode=true -m "$requested_model" -c "model_reasoning_effort=$requested_effort" "$prompt_text") ;;
    xask:spark:gpt-5.6-luna:low) cmd=("$xask_path" --spark --json codex "$prompt_text") ;;
    xask:gpt55:gpt-5.6-sol:low|xask:gpt55:gpt-5.6-sol:medium|xask:gpt55:gpt-5.6-sol:high|xask:gpt55:gpt-5.6-sol:xhigh) cmd=("$xask_path" --gpt55 --effort "$requested_effort" --json codex "$prompt_text") ;;
    xbreed:spark:gpt-5.6-luna:low) cmd=("$xbreed_path" ask codex --spark --json "$prompt_text") ;;
    xbreed:gpt55:gpt-5.6-sol:low|xbreed:gpt55:gpt-5.6-sol:medium|xbreed:gpt55:gpt-5.6-sol:high|xbreed:gpt55:gpt-5.6-sol:xhigh) cmd=("$xbreed_path" ask codex --gpt55 --effort "$requested_effort" --json "$prompt_text") ;;
    *) die "unreachable trial $route/$lane/$requested_model/$requested_effort" ;;
  esac
  command_redacted_json="$(argv_redacted_json "${cmd[@]}")"
  : > "$stdout_path"; : > "$stderr_path"
  if [[ "$RUN_LIVE" == false ]]; then
    status="planned"
    duration_s=0
    exit_code=0
    usage_json='{"input_tokens":null,"cached_input_tokens":null,"cache_write_input_tokens":null,"output_tokens":null,"reasoning_output_tokens":null}'
    output_tokens=null; input_tokens=null; cached_input_tokens=null; cache_write_input_tokens=null; reasoning_output_tokens=null; goodput_tok_s=null
  else
    mkdir -p "$attempt_dir/tmp"
    local start end rc
    start="$(perl -MTime::HiRes=CLOCK_MONOTONIC -e 'printf "%.9f", Time::HiRes::clock_gettime(CLOCK_MONOTONIC)')"
    set +e
    (
      cd "$attempt_dir"
      if [[ "$TIMEOUT_S" != 0 ]]; then
        timeout --signal=TERM --kill-after=1s "${TIMEOUT_S}s" env -i HOME="$home" USER="${USER:-$(id -un)}" LOGNAME="${LOGNAME:-$(id -un)}" PATH="${PATH:-/usr/bin:/bin}" TERM="${TERM:-dumb}" TMPDIR="$attempt_dir/tmp" XDG_CACHE_HOME="${XDG_CACHE_HOME:-$home/.cache}" XDG_CONFIG_HOME="${XDG_CONFIG_HOME:-$home/.config}" XDG_STATE_HOME="${XDG_STATE_HOME:-$home/.local/state}" STATE_DIR="${STATE_DIR:-}" CALL_LOG="${CALL_LOG:-}" "${cmd[@]}"
      else
        env -i HOME="$home" USER="${USER:-$(id -un)}" LOGNAME="${LOGNAME:-$(id -un)}" PATH="${PATH:-/usr/bin:/bin}" TERM="${TERM:-dumb}" TMPDIR="$attempt_dir/tmp" XDG_CACHE_HOME="${XDG_CACHE_HOME:-$home/.cache}" XDG_CONFIG_HOME="${XDG_CONFIG_HOME:-$home/.config}" XDG_STATE_HOME="${XDG_STATE_HOME:-$home/.local/state}" STATE_DIR="${STATE_DIR:-}" CALL_LOG="${CALL_LOG:-}" "${cmd[@]}"
      fi
    ) >"$stdout_path" 2>"$stderr_path"
    rc=$?
    set -e
    end="$(perl -MTime::HiRes=CLOCK_MONOTONIC -e 'printf "%.9f", Time::HiRes::clock_gettime(CLOCK_MONOTONIC)')"
    duration_s="$(perl -e 'printf "%.9f", $ARGV[1] - $ARGV[0]' "$start" "$end")"
    exit_code="$rc"
    if [[ $rc -eq 124 || ( "$TIMEOUT_S" != 0 && $rc -eq 137 ) ]]; then
      status="timeout"
    elif [[ $rc -ne 0 ]]; then
      status="nonzero"
    else
      usage_json="$(parse_usage "$stdout_path" 2>/dev/null)" || true
      if [[ -z "$usage_json" ]]; then status="parse_failure"; else status="ok"; fi
    fi
    if [[ "$status" == ok ]]; then
      input_tokens="$(jq -r '.input_tokens' <<<"$usage_json")"
      cached_input_tokens="$(jq -r '.cached_input_tokens' <<<"$usage_json")"
      cache_write_input_tokens="$(jq -r '.cache_write_input_tokens' <<<"$usage_json")"
      output_tokens="$(jq -r '.output_tokens' <<<"$usage_json")"
      reasoning_output_tokens="$(jq -r '.reasoning_output_tokens' <<<"$usage_json")"
      goodput_tok_s="$(perl -e 'my ($o,$d)=@ARGV; printf "%.9f", $o / $d' "$output_tokens" "$duration_s")"
    else
      usage_json='{"input_tokens":null,"cached_input_tokens":null,"cache_write_input_tokens":null,"output_tokens":null,"reasoning_output_tokens":null}'
      output_tokens=null; input_tokens=null; cached_input_tokens=null; cache_write_input_tokens=null; reasoning_output_tokens=null; goodput_tok_s=null
    fi
  fi
  attempt_record_json "$trial_id" "$attempt_no" "$retry_of" "$route" "$lane" "$requested_model" "$requested_effort" "$prompt_id" "$prompt_hash" "$prompt_copy" "$status" "$duration_s" "$exit_code" "$nodev" "$command_redacted_json" "" "$stdout_path" "$stderr_path" "$attempt_dir" "$usage_json" "$output_tokens" "$input_tokens" "$cached_input_tokens" "$cache_write_input_tokens" "$reasoning_output_tokens" "$goodput_tok_s" > "$attempt_dir/attempt.json"
  printf '%s\n' "$attempt_dir/attempt.json"
}

summarize_live(){
  jq -s '
    def counts(xs): reduce xs[] as $x ({}; .[$x] = ((.[$x] // 0) + 1));
    def percentile(xs; p):
      (xs | map(select(. != null)) | sort) as $v
      | if ($v|length) == 0 then null else $v[(((($v|length)-1) * p) | floor)] end;
    def sumf(f): reduce .[] as $x (0; . + ($x|f));
    def trialize:
      sort_by(.trial_id, .attempt_no)
      | group_by(.trial_id)
      | map({
          trial_id: .[0].trial_id,
          route: .[0].route,
          lane: .[0].lane,
          requested_model: .[0].requested_model,
          requested_effort: .[0].requested_effort,
          first_status: .[0].status,
          final_status: .[-1].status,
          attempts: length,
          retries: (length - 1),
          first_duration_s: (.[0].duration_s // 0),
          final_duration_s: (.[-1].duration_s // 0),
          all_duration_s: (reduce .[] as $r (0; . + ($r.duration_s // 0))),
          all_output_tokens: (reduce .[] as $r (0; . + ($r.output_tokens // 0))),
          final_output_tokens: (if .[-1].status == "ok" then (.[-1].output_tokens // 0) else 0 end),
          final_success: (.[-1].status == "ok"),
          first_success: (.[0].status == "ok")
      });
    (trialize) as $trials
    | {
        mode: "live",
        totals: {
          scheduled_trials: ($trials|length),
          reachable_scheduled_trials: ($trials|length),
          first_attempt_status_counts: counts($trials|map(.first_status)),
          final_success_after_retries: ($trials|map(select(.final_success))|length),
          final_failure_after_retries: ($trials|map(select(.final_success|not))|length),
          retries_total: ($trials|map(.retries)|add),
          total_attempt_duration_s: ($trials|map(.all_duration_s)|add),
          total_attempt_output_tokens: ($trials|map(.all_output_tokens)|add),
          successful_only_duration_s: ($trials|map(select(.final_success)|.all_duration_s)|add),
          successful_only_output_tokens: ($trials|map(select(.final_success)|.final_output_tokens)|add),
          accepted_duration_s: ($trials|map(.all_duration_s)|add),
          accepted_output_tokens: ($trials|map(.final_output_tokens)|add),
          first_attempt_invocation_p50_s: percentile(($trials|map(.first_duration_s)); 0.50),
          first_attempt_invocation_p90_s: percentile(($trials|map(.first_duration_s)); 0.90),
          reported_output_tokens_per_invocation_second: ((($trials|map(.all_output_tokens)|add) // 0) / ((($trials|map(.all_duration_s)|add) // 0) + 1e-9)),
          accepted_reported_output_tokens_per_invocation_second: ((($trials|map(.final_output_tokens)|add) // 0) / ((($trials|map(.all_duration_s)|add) // 0) + 1e-9))
        },
        successful_only: {
          trials: ($trials|map(select(.final_success))|length),
           duration_s: ($trials|map(select(.final_success)|.all_duration_s)|add),
          output_tokens: ($trials|map(select(.final_success)|.final_output_tokens)|add),
           reported_output_tokens_per_invocation_second: ((($trials|map(select(.final_success)|.final_output_tokens)|add) // 0) / ((($trials|map(select(.final_success)|.all_duration_s)|add) // 0) + 1e-9))
        },
        by_cell: ($trials | group_by([.route,.lane,.requested_model,.requested_effort]) | map({
          route: .[0].route,
          lane: .[0].lane,
          requested_model: .[0].requested_model,
          requested_effort: .[0].requested_effort,
          reachable_scheduled_trials: length,
          first_attempt_status_counts: counts(map(.first_status)),
          final_success_after_retries: (map(select(.final_success))|length),
          final_failure_after_retries: (map(select(.final_success|not))|length),
          retries_total: (map(.retries)|add),
          total_attempt_duration_s: (map(.all_duration_s)|add),
          total_attempt_output_tokens: (map(.all_output_tokens)|add),
           successful_only_duration_s: (map(select(.final_success)|.all_duration_s)|add),
          successful_only_output_tokens: (map(select(.final_success)|.final_output_tokens)|add),
           accepted_duration_s: (map(.all_duration_s)|add),
           accepted_output_tokens: (map(.final_output_tokens)|add),
           first_attempt_invocation_p50_s: percentile(map(.first_duration_s); 0.50),
           first_attempt_invocation_p90_s: percentile(map(.first_duration_s); 0.90),
          reported_output_tokens_per_invocation_second: (((map(.all_output_tokens)|add) // 0) / (((map(.all_duration_s)|add) // 0) + 1e-9)),
           accepted_reported_output_tokens_per_invocation_second: (((map(.final_output_tokens)|add) // 0) / (((map(.all_duration_s)|add) // 0) + 1e-9))
        }))
      }
  ' "$1"
}

summarize_dry(){
  jq -s '
    def counts(xs): reduce xs[] as $x ({}; .[$x] = ((.[$x] // 0) + 1));
    {mode:"dry-run", planned:{scheduled_trials:length, route_counts:counts(map(.route)), lane_counts:counts(map(.lane))}, live:null}
  ' "$1"
}

main(){
  parse_args "$@"
  [[ -n "$SEED" ]] || SEED="$(od -An -N4 -tu4 /dev/urandom | tr -d ' ')"
  validate_args
  local default_prompt_real prompt_dir_real output_root_real
  default_prompt_real="$(realpath_abs "$DEFAULT_PROMPT_DIR")"
  prompt_dir_real="$(realpath_abs "$PROMPT_DIR")"
  prompt_allowed "$prompt_dir_real" "$default_prompt_real"
  ensure_output_root "$OUTPUT_ROOT"
  output_root_real="$(realpath_abs "$OUTPUT_ROOT")"

  local fnm_path= codex_path= xask_path= xbreed_path= nodev= fnm_ver= codex_ver= xask_ver= xbreed_ver= fnm_hash= codex_hash= xask_hash= xbreed_hash=
  if route_selected raw; then
    fnm_path="$(resolve_exec "$FNM_CMD")"
    codex_path="$(resolve_exec "$CODEX_CMD")"
    nodev="$(node_version "$fnm_path")"
    nodev="${nodev#v}"
    fnm_ver="$(model_version "$fnm_path")"
    codex_ver="$(model_version "$codex_path")"
    fnm_hash="$(sha256_file "$fnm_path")"
    codex_hash="$(sha256_file "$codex_path")"
  fi
  if route_selected xask; then
    xask_path="$(resolve_exec "$XASK_CMD")"
    xask_ver="$(model_version "$xask_path")"
    xask_hash="$(sha256_file "$xask_path")"
  fi
  if route_selected xbreed; then
    xbreed_path="$(resolve_exec "$XBREED_CMD")"
    xbreed_ver="$(model_version "$xbreed_path")"
    xbreed_hash="$(sha256_file "$xbreed_path")"
  fi

  local run_dir; run_dir="$(mktemp -d "$output_root_real/run.XXXXXX")" || die "mktemp failed"
  chmod 700 "$run_dir" || die "chmod failed for run dir"
  mkdir -p "$run_dir/inputs" "$run_dir/attempts"

  local catalog_hash=null
  if route_selected raw; then
    local catalog_cmd
    if [[ "$REFRESH_CATALOG" == true ]]; then
      catalog_cmd=("$codex_path" debug models)
    else
      catalog_cmd=("$codex_path" debug models --bundled)
    fi
    "${catalog_cmd[@]}" > "$run_dir/catalog.json" 2> "$run_dir/catalog.stderr" || die "catalog command failed"
    catalog_hash="$(sha256_file "$run_dir/catalog.json")"
  fi

  local semantic_tsv="$run_dir/semantic.tsv" prompt_manifest_tsv="$run_dir/prompts.tsv"
  : > "$semantic_tsv"; : > "$prompt_manifest_tsv"
  local -a prompt_files=(); shopt -s nullglob; prompt_files=("$PROMPT_DIR"/*.md "$PROMPT_DIR"/*.txt); shopt -u nullglob
  ((${#prompt_files[@]})) || die "no prompt fixtures found in $PROMPT_DIR"
  local prompt_id prompt_real prompt_copy prompt_hash
  for prompt_file in "${prompt_files[@]}"; do
    read -r prompt_id prompt_real prompt_copy < <(copy_prompt "$prompt_file" "$run_dir/inputs" "$prompt_dir_real")
    prompt_hash="$(sha256_file "$run_dir/inputs/$prompt_copy")"
    printf '%s\t%s\t%s\n' "$prompt_id" "$prompt_hash" "$prompt_copy" >> "$prompt_manifest_tsv"
  done

  local -a raw_cells=() wrapper_cells=()
  local route route_key lane model effort prompt_id prompt_hash prompt_copy prompt_src repetition
  wrapper_cells=(
    $'spark\tgpt-5.6-luna\tlow'
    $'gpt55\tgpt-5.6-sol\tlow'
    $'gpt55\tgpt-5.6-sol\tmedium'
    $'gpt55\tgpt-5.6-sol\thigh'
    $'gpt55\tgpt-5.6-sol\txhigh'
  )
  if route_selected raw; then
    while IFS=$'\t' read -r model effort; do
      [[ -n "$model" ]] || continue
      raw_cells+=("$model"$'\t'"$effort")
    done < <(catalog_cells "$run_dir/catalog.json")
    ((${#raw_cells[@]})) || die "catalog produced zero raw cells"
  fi

  while IFS= read -r route; do
    case "$route" in
      raw)
        for route_key in "${raw_cells[@]}"; do
          model="${route_key%%$'\t'*}"; effort="${route_key#*$'\t'}"
          while IFS=$'\t' read -r prompt_id prompt_hash prompt_copy; do
            for ((repetition=1; repetition<=REPETITIONS; repetition++)); do
              printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$route" "raw-fast" "$model" "$effort" "$prompt_id" "$prompt_hash" "$prompt_copy" "$prompt_dir_real/$prompt_id" "$repetition" >> "$semantic_tsv"
            done
          done < "$prompt_manifest_tsv"
        done
        ;;
      xask|xbreed)
        while IFS=$'\t' read -r lane model effort; do
          while IFS=$'\t' read -r prompt_id prompt_hash prompt_copy; do
            for ((repetition=1; repetition<=REPETITIONS; repetition++)); do
              printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$route" "$lane" "$model" "$effort" "$prompt_id" "$prompt_hash" "$prompt_copy" "$prompt_dir_real/$prompt_id" "$repetition" >> "$semantic_tsv"
            done
          done < "$prompt_manifest_tsv"
        done < <(printf '%s\n' "${wrapper_cells[@]}")
        ;;
    esac
  done < <(printf '%s\n' ${ROUTES_CSV//,/ })

  local trials_tsv="$run_dir/trials.tsv" manifest_jsonl="$run_dir/manifest.jsonl"
  schedule_trials "${SEED:-0}" "$semantic_tsv" "$trials_tsv" "$manifest_jsonl"
  local scheduled_trials max_paid_attempts
  scheduled_trials="$(wc -l < "$trials_tsv")"
  (( scheduled_trials > 0 )) || die "zero scheduled trials after routing/catalog expansion"
  (( scheduled_trials <= MAX_TRIALS )) || die "scheduled trial count $scheduled_trials exceeds cap $MAX_TRIALS"
  max_paid_attempts=$((scheduled_trials * (RETRIES + 1)))
  (( max_paid_attempts <= MAX_PAID_ATTEMPTS )) || die "maximum paid attempts $max_paid_attempts exceeds cap $MAX_PAID_ATTEMPTS"
  printf '%s\n' "$scheduled_trials" > "$run_dir/scheduled-count.txt"
  printf '%s\n' "$max_paid_attempts" > "$run_dir/max-paid-attempts.txt"
  [[ "$RUN_LIVE" == true ]] && {
    [[ "${BENCH_ALLOW_PAID:-}" == YES ]] || die "live run requires BENCH_ALLOW_PAID=YES"
    [[ "${BENCH_APPROVE_TRIALS:-}" == "$scheduled_trials" ]] || die "live run requires BENCH_APPROVE_TRIALS=$scheduled_trials"
    [[ "${BENCH_APPROVE_ATTEMPTS:-}" == "$max_paid_attempts" ]] || die "live run requires BENCH_APPROVE_ATTEMPTS=$max_paid_attempts"
  }

  local attempts_jsonl="$run_dir/attempts.jsonl"; : > "$attempts_jsonl"
  local trial_id route lane requested_model requested_effort prompt_id prompt_hash prompt_copy prompt_src attempt_no retry_of status repetition final_exit=0
  while IFS=$'\t' read -r trial_id route lane requested_model requested_effort prompt_id prompt_hash prompt_copy prompt_src repetition; do
    retry_of=""
    for ((attempt_no=1; attempt_no<=RETRIES+1; attempt_no++)); do
      local attempt_json_path
      attempt_json_path="$(run_attempt "$trial_id" "$attempt_no" "$retry_of" "$route" "$lane" "$requested_model" "$requested_effort" "$prompt_id" "$prompt_hash" "$prompt_copy" "$prompt_dir_real" "$run_dir" "$fnm_path" "$codex_path" "$xask_path" "$xbreed_path" "$nodev")"
      cat "$attempt_json_path" >> "$attempts_jsonl"
      status="$(jq -r '.status' "$attempt_json_path")"
      [[ "$status" == ok ]] && break
      [[ "$RUN_LIVE" == true ]] || break
      retry_of="$trial_id.a$attempt_no"
    done
    if [[ "$RUN_LIVE" == true ]]; then
      [[ "$status" == ok ]] || final_exit=1
    fi
  done < "$trials_tsv"

  jq -Rs --arg seed "$SEED" '{seed:$seed, trials:(split("\n")[:-1] | map(select(length>0)) | map(split("\t") | {trial_id:.[0], route:.[1], lane:.[2], requested_model:.[3], requested_effort:.[4], prompt_id:.[5], prompt_hash:.[6], prompt_copy:.[7], prompt_source:.[8], repetition:(.[9]|tonumber)}))}' "$trials_tsv" > "$run_dir/schedule.json"
  jq -s --arg run_dir "$run_dir" '{run_dir:$run_dir, trials:.}' "$manifest_jsonl" > "$run_dir/manifest.json"

  local summary_json
  if [[ "$RUN_LIVE" == true ]]; then
    summary_json="$(summarize_live "$attempts_jsonl")"
  else
    summary_json="$(summarize_dry "$attempts_jsonl")"
  fi
  printf '%s\n' "$summary_json" > "$run_dir/summary.json"

  local evidence_jsonl="$run_dir/evidence-sha256.jsonl" evidence_file evidence_rel
  : > "$evidence_jsonl"
  while IFS= read -r -d '' evidence_file; do
    evidence_rel="${evidence_file#"$run_dir/"}"
    jq -nc --arg path "$evidence_rel" --arg sha256 "$(sha256_file "$evidence_file")" '{path:$path,sha256:$sha256}' >> "$evidence_jsonl"
  done < <(find "$run_dir/inputs" "$run_dir/attempts" -type f -print0 | sort -z)
  jq -s 'sort_by(.path)' "$evidence_jsonl" > "$run_dir/evidence-sha256.json"

  jq -nc \
    --arg catalog "$catalog_hash" \
    --arg prompts "$(sha256_file "$prompt_manifest_tsv")" \
    --arg schedule "$(sha256_file "$run_dir/schedule.json")" \
    --arg manifest "$(sha256_file "$run_dir/manifest.json")" \
    --arg attempts "$(sha256_file "$attempts_jsonl")" \
    --arg summary "$(sha256_file "$run_dir/summary.json")" \
    --arg evidence "$(sha256_file "$run_dir/evidence-sha256.json")" \
    --arg provenance "$(jq -nc --arg fnm "$fnm_path" --arg fnm_ver "$fnm_ver" --arg fnm_hash "$fnm_hash" --arg nodev "$nodev" --arg codex "$codex_path" --arg codex_ver "$codex_ver" --arg codex_hash "$codex_hash" --arg xask "$xask_path" --arg xask_ver "$xask_ver" --arg xask_hash "$xask_hash" --arg xbreed "$xbreed_path" --arg xbreed_ver "$xbreed_ver" --arg xbreed_hash "$xbreed_hash" '{fnm:{path:$fnm,version:$fnm_ver,sha256:$fnm_hash,node_version:$nodev},codex:{path:$codex,version:$codex_ver,sha256:$codex_hash},xask:{path:$xask,version:$xask_ver,sha256:$xask_hash},xbreed:{path:$xbreed,version:$xbreed_ver,sha256:$xbreed_hash}}')" \
    '{catalog:(if $catalog=="null" then null else $catalog end),prompts:$prompts,schedule:$schedule,manifest:$manifest,attempts:$attempts,summary:$summary,evidence:$evidence,provenance:($provenance|fromjson)}' > "$run_dir/sha256-index.json"

  printf '%s\n' "$summary_json"
  printf 'run_dir=%s\n' "$run_dir" >&2
  if [[ "$RUN_LIVE" == true ]]; then
    exit "$final_exit"
  fi
}

main "$@"
