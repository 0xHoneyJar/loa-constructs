#!/usr/bin/env bash
# =============================================================================
# stage-runner-advisory.sh — Sprint 3 (S3-T1..T8) — advisory-tier stage runner
# =============================================================================
# Per-stage runner for the Construct Bounded-Context Runtime Substrate
# (cycle-construct-bounded-context, SDD §4.3, FR-4.1 / FR-4.4).
#
# This is the ADVISORY-TIER runner. Per SDD §6.5b's tier-conditional honest
# threat model, advisory tier provides:
#   - cooperative-construct guidance (envelope contract enforced)
#   - env scrub via env -i + allowlist (FR-4.1)
#   - path canonicalization via realpath BEFORE allowlist check (FR-13.2,
#     closes Flatline HIGH-3 symlink — though TOCTOU race remains an
#     ADVISORY-TIER LIMITATION, mitigated only at strict tier via bwrap)
#   - argv-array invocation (no bash -c with interpolation; closes Flatline
#     CRITICAL command-injection at the runner boundary)
#   - post-exec output-gate validation (FR-11)
#
# Strict tier (Sprint 4) adds: bwrap filesystem namespace, network namespace,
# CAP_NET_ADMIN-gated egress, LD_PRELOAD allowlist enforcement, cheval
# memory-disable verification.
#
# Usage (called by compose-run.sh — Sprint 3+ wiring):
#   stage-runner-advisory.sh \
#     --invocation <path>      Invocation envelope JSON (built by envelope-builder.sh)
#     --manifest   <path>      construct.yaml for output-gate domain attribution
#     --skill-cmd  <argv...>   The skill's executable as an argv array (NOT a string)
#                              The runner invokes via "${argv[@]}" — no shell metas eval'd.
#                              When --skill-cmd is omitted AND LOA_STAGE_MOCK=1,
#                              the runner emits a deterministic fixture row.
#     [--output-dir <path>]    Override default .run/compose/<run_id>/stage-<n>/output
#     [--quiet]                Suppress stdout (envelope path returned via exit 0)
#
# Exit codes:
#   0   stage executed successfully + handoff envelope produced
#   1   contract violation (env-scrub failed / allowlist breach / output-gate failed)
#   2   usage / parse error
#   3   environment problem
#  78   advisory-tier prereq mismatch (the runner refuses strict-tier compositions)
#
# Argv-array invocation (S3-T1 / closes Flatline CRITICAL):
#   The runner uses bash arrays + "${cmd[@]}" expansion EVERYWHERE a subprocess is
#   spawned. There is no `bash -c "<interpolated>"` in this file. shellcheck
#   passes SC2086 clean. Test: see tests/composition/runner/run.bats.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
PROJECT_ROOT="${PROJECT_ROOT:-$(cd "$SCRIPT_DIR/../../.." && pwd -P)}"
ENVELOPE_BUILDER="$SCRIPT_DIR/envelope-builder.sh"
OUTPUT_GATE="$SCRIPT_DIR/output-gate.sh"

# ---- arg parsing -------------------------------------------------------------

usage() { sed -n '2,60p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; }

INVOCATION=""
MANIFEST=""
OUTPUT_DIR=""
QUIET=0
declare -a SKILL_CMD=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help)        usage; exit 0 ;;
    --invocation)     INVOCATION="$2"; shift 2 ;;
    --manifest)       MANIFEST="$2"; shift 2 ;;
    --output-dir)     OUTPUT_DIR="$2"; shift 2 ;;
    --quiet)          QUIET=1; shift ;;
    --skill-cmd)
      shift
      # Collect remaining args as the argv-array.
      while [[ $# -gt 0 ]]; do
        SKILL_CMD+=("$1")
        shift
      done
      ;;
    -*) echo "[stage-runner] ERROR: unknown flag $1" >&2; exit 2 ;;
    *)  echo "[stage-runner] ERROR: unexpected positional: $1" >&2; exit 2 ;;
  esac
done

[[ -n "$INVOCATION" ]] || { echo "[stage-runner] ERROR: --invocation required" >&2; exit 2; }
[[ -f "$INVOCATION" ]] || { echo "[stage-runner] ERROR: invocation envelope not found: $INVOCATION" >&2; exit 3; }
[[ -n "$MANIFEST" ]] || { echo "[stage-runner] ERROR: --manifest required" >&2; exit 2; }
[[ -f "$MANIFEST" ]] || { echo "[stage-runner] ERROR: manifest not found: $MANIFEST" >&2; exit 3; }

command -v jq >/dev/null 2>&1 || { echo "[stage-runner] ERROR: jq required" >&2; exit 3; }

# Portable realpath — `realpath -m` (resolve missing) is GNU-only; macOS lacks it.
# Use python3 as the fallback (it handles missing path components cleanly).
_resolve_path() {
  local path="$1"
  if realpath -m "$path" >/dev/null 2>&1; then
    realpath -m "$path"
  else
    python3 -c 'import os, sys; print(os.path.realpath(os.path.abspath(sys.argv[1])))' "$path"
  fi
}

# ---- tier check (S3-prereq: advisory tier ONLY) -----------------------------

requested_tier=$(jq -r '.context_policy.isolation_tier // "advisory"' "$INVOCATION")
if [[ "$requested_tier" == "strict" ]]; then
  cat >&2 <<EOF
[stage-runner] REFUSED: invocation envelope requests isolation_tier=strict
but stage-runner-advisory.sh is the advisory-tier runner. Strict tier
requires the Sprint 4 runner (lib/stage-runner-strict.sh, not yet shipped).
Either downgrade the composition's isolation_tier to advisory or wait
for the strict-tier runner.
EOF
  exit 78
fi

# ---- extract envelope context ------------------------------------------------

run_id=$(jq -r '.run_id' "$INVOCATION")
stage_id=$(jq -r '.stage_id' "$INVOCATION")
stage_pass=$(jq -r '.stage_pass' "$INVOCATION")
construct_slug=$(jq -r '.construct_slug' "$INVOCATION")
[[ -n "$run_id" && "$run_id" != "null" ]] || { echo "[stage-runner] ERROR: invocation missing run_id" >&2; exit 1; }

if [[ -z "$OUTPUT_DIR" ]]; then
  # Default per SDD §3.1: `.run/compose/<run_id>/stage-<n>/output`
  stage_num=$(echo "$stage_id" | sed -E 's/.*stage-([0-9]+)$/\1/')
  OUTPUT_DIR="$PROJECT_ROOT/.run/compose/$run_id/stage-${stage_num}/output"
fi
mkdir -p "$OUTPUT_DIR"

ENVELOPE_DIR="$PROJECT_ROOT/.run/compose/$run_id/envelopes"
mkdir -p "$ENVELOPE_DIR"

# ---- env scrub (S3-T2, FR-4.1) ----------------------------------------------
# Build the env-allowlist into a bash array; pass via env -i + KEY=val pairs.
# The pattern `env -i "KEY1=$val1" "KEY2=$val2" -- "${cmd[@]}"` ensures
# the subprocess sees ONLY the listed names (env -i clears the env table)
# AND the cmd is invoked as an argv array (no shell interpretation).

declare -a ENV_PAIRS=()
mapfile -t allowed_env_vars < <(jq -r '(.context_policy.allowed_env_vars // [])[]' "$INVOCATION")

# Always-allowed defaults: PATH (so basic commands work), HOME, LANG.
# Compositions can override by setting allowed_env_vars explicitly to a
# different list — the allowlist replaces, not augments, the defaults.
declare -a effective_allowlist=()
if (( ${#allowed_env_vars[@]} == 0 )); then
  effective_allowlist=("PATH" "HOME" "LANG")
else
  effective_allowlist=("${allowed_env_vars[@]}")
fi

for var in "${effective_allowlist[@]}"; do
  # Validate var name format — must match shell convention so env -i accepts it.
  if [[ ! "$var" =~ ^[A-Z_][A-Z0-9_]*$ ]]; then
    echo "[stage-runner] ERROR: malformed allowed_env_vars entry '$var' (must match ^[A-Z_][A-Z0-9_]*\$)" >&2
    exit 1
  fi
  # Pull the value from the parent env. If unset, skip — env -i handles missing.
  if [[ -n "${!var:-}" ]]; then
    ENV_PAIRS+=("${var}=${!var}")
  fi
done

# ---- path canonicalization + allowlist check (S3-T7, FR-13.2) ---------------
# Symlink resolution via realpath BEFORE allowlist comparison (closes Flatline
# HIGH-3 symlink traversal). TOCTOU race acknowledged as advisory-tier limit.

declare -a allowed_read_paths=()
declare -a allowed_write_paths=()
mapfile -t allowed_read_paths < <(jq -r '(.context_policy.allowed_read_paths // [])[]' "$INVOCATION")
mapfile -t allowed_write_paths < <(jq -r '(.context_policy.allowed_write_paths // [])[]' "$INVOCATION")

# Canonicalize each declared path; verify the resolved path stays inside
# PROJECT_ROOT (cooperative containment — strict tier uses bwrap to enforce
# at the kernel layer; advisory tier is best-effort).
declare -a canonicalized_read=()
declare -a canonicalized_write=()
for p in ${allowed_read_paths[@]+"${allowed_read_paths[@]}"}; do
  # Strip glob suffix for canonicalization (we resolve the directory portion).
  base="${p%%/\*\**}"
  base="${base%%/\**}"
  resolved=$(_resolve_path "$base")
  case "$resolved" in
    "$PROJECT_ROOT"|"$PROJECT_ROOT"/*)
      canonicalized_read+=("$resolved") ;;
    *)
      echo "[stage-runner] WARN: allowed_read_paths entry '$p' resolves outside PROJECT_ROOT ($resolved); rejected on advisory tier" >&2
      ;;
  esac
done
for p in ${allowed_write_paths[@]+"${allowed_write_paths[@]}"}; do
  base="${p%%/\*\**}"
  base="${base%%/\**}"
  resolved=$(_resolve_path "$base")
  case "$resolved" in
    "$PROJECT_ROOT"|"$PROJECT_ROOT"/*)
      canonicalized_write+=("$resolved") ;;
    *)
      echo "[stage-runner] WARN: allowed_write_paths entry '$p' resolves outside PROJECT_ROOT ($resolved); rejected on advisory tier" >&2
      ;;
  esac
done

# ---- skill execution (S3-T1 — argv-array invocation) ------------------------
# CRITICAL: the skill cmd MUST be invoked as "${SKILL_CMD[@]}" — never as
# bash -c "..." with string interpolation. Composition-controlled values
# (slug, skill name) DO NOT reach the shell parser — they're argv tokens.

if (( ${#SKILL_CMD[@]} == 0 )); then
  if [[ "${LOA_STAGE_MOCK:-0}" != "1" ]]; then
    cat >&2 <<EOF
[stage-runner] ERROR: --skill-cmd <argv...> required
For test/dev iteration without a live skill, set LOA_STAGE_MOCK=1 and the
runner emits a deterministic fixture row (substrate-shape only; no LLM).
EOF
    exit 2
  fi
  # Mock mode: emit a single fixture output that conforms to the substrate
  # invariants for testing the runner skeleton.
  output_type=$(jq -r '.output_contract.writes[0].type // "Signal"' "$INVOCATION")
  output_schema=$(jq -r '.output_contract.writes[0].schema_id // "loa.stream.Signal.v1"' "$INVOCATION")
  output_dest=$(jq -r '.output_contract.writes[0].destination // empty' "$INVOCATION")
  if [[ -z "$output_dest" ]]; then
    output_dest="$OUTPUT_DIR/${output_type,,}.json"
  fi
  # Use the literal destination from the contract (do NOT canonicalize) so the
  # output-gate's string-comparison of contract-destination ↔ handoff-uri matches.
  # Symlinks resolve transparently at OS layer; the contract's path is the
  # canonical user-facing identity.
  mkdir -p "$(dirname "$output_dest")"

  # Build a minimal payload that satisfies the canonical stream schema.
  ts=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  case "$output_type" in
    Signal)   verb="signal" ;;
    Verdict)  verb="verdict" ;;
    Artifact) verb="artifact" ;;
    Intent)   verb="intent" ;;
    *)        verb="output" ;;
  esac
  jq -n \
    --arg type "$output_type" \
    --arg ts "$ts" \
    --arg src "stage-runner-advisory:mock" \
    --arg stage "$stage_id" \
    --arg verb "$verb" \
    '{
      stream_type: $type,
      schema_version: "1.0.0",
      timestamp: $ts,
      source: $src,
      observation: ($verb + " from " + $stage)
    } | if $type == "Verdict" then . + {verdict: ("mock-" + $verb)} else . end' \
    > "$output_dest"

  # Compute the canonical hash for output-gate hash-recompute symmetry.
  output_hash=$(python3 -c "
import json, hashlib
data = json.loads(open('$output_dest').read())
canonical = json.dumps(data, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode()
print('sha256:' + hashlib.sha256(canonical).hexdigest())
")
  output_uri="$output_dest"
  manifest_json=$(yq -o=json '.' "$MANIFEST" 2>/dev/null || echo '{}')
  domain_primary=$(echo "$manifest_json" | jq -r '.domain.primary // empty' 2>/dev/null)
  if [[ -z "$domain_primary" || "$domain_primary" == "null" ]]; then
    domain_primary=$(echo "$manifest_json" | jq -r 'if (.domain | type) == "array" then .domain[0] // empty else .domain // empty end' 2>/dev/null)
  fi
  [[ -z "$domain_primary" || "$domain_primary" == "null" ]] && domain_primary="general"

  outputs_json=$(jq -n \
    --arg type "$output_type" \
    --arg uri "$output_uri" \
    --arg sid "$output_schema" \
    --arg hash "$output_hash" \
    --arg primary "$domain_primary" \
    --arg slug "$construct_slug" \
    '[{type: $type, uri: $uri, schema_id: $sid, hash: $hash, domain: {primary: $primary, produced_by: $slug}}]')
else
  # Live execution path: invoke the skill as an argv array.
  # We use `env -i` to scrub the environment, with the explicitly-allowed
  # KEY=val pairs passed positionally. The `--` separator before the cmd
  # ensures env -i doesn't mis-parse leading `-` flags from the skill.
  if [[ ! "${SKILL_CMD[0]}" =~ ^/ ]]; then
    # Resolve the command's path before scrubbing PATH (env -i may make
    # the original argv[0] unfindable).
    resolved_cmd_path=$(command -v "${SKILL_CMD[0]}" 2>/dev/null || echo "${SKILL_CMD[0]}")
    SKILL_CMD[0]="$resolved_cmd_path"
  fi

  # Capture the skill's stdout into a temp file; the runner is responsible
  # for asserting the schema-conformance via output-gate, NOT for parsing
  # the skill output itself.
  capture=$(mktemp)
  # NB: macOS `env` rejects `--` as utility delimiter (treats it as a literal
  # arg). The cross-platform form is `env -i KEY=val cmd args...` directly.
  # Skill cmd's argv[0] cannot start with `-` for this to work; the
  # `command -v` resolution step above ensures argv[0] is an absolute path
  # when possible.
  if (( ${#ENV_PAIRS[@]} > 0 )); then
    env -i "${ENV_PAIRS[@]}" "${SKILL_CMD[@]}" > "$capture" 2>&1 || true
  else
    env -i "${SKILL_CMD[@]}" > "$capture" 2>&1 || true
  fi

  # The capture is consumed by post-exec output-gate validation downstream.
  # Live execution outputs[] is built from the actual file output the skill
  # produced (per envelope's output_contract.writes[].destination).
  outputs_json="[]"
  for w in $(jq -c '.output_contract.writes[]' "$INVOCATION"); do
    dest=$(echo "$w" | jq -r '.destination')
    typ=$(echo "$w" | jq -r '.type')
    sid=$(echo "$w" | jq -r '.schema_id')
    if [[ -f "$dest" ]]; then
      h=$(python3 -c "
import json, hashlib
data = json.loads(open('$dest').read())
canonical = json.dumps(data, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode()
print('sha256:' + hashlib.sha256(canonical).hexdigest())
")
      manifest_json=$(yq -o=json '.' "$MANIFEST" 2>/dev/null || echo '{}')
      domain_primary=$(echo "$manifest_json" | jq -r '.domain.primary // "general"' 2>/dev/null)
      [[ -z "$domain_primary" || "$domain_primary" == "null" ]] && domain_primary="general"
      outputs_json=$(echo "$outputs_json" | jq \
        --arg type "$typ" \
        --arg uri "$dest" \
        --arg sid "$sid" \
        --arg hash "$h" \
        --arg primary "$domain_primary" \
        --arg slug "$construct_slug" \
        '. + [{type: $type, uri: $uri, schema_id: $sid, hash: $hash, domain: {primary: $primary, produced_by: $slug}}]')
    fi
  done
  rm -f "$capture"
fi

# ---- handoff envelope construction (composes envelope-builder S2-T1) -------
handoff_dest="$ENVELOPE_DIR/${stage_id}.handoff.json"
"$ENVELOPE_BUILDER" handoff \
  --invocation "$INVOCATION" \
  --status success \
  --outputs "$outputs_json" \
  --summary "stage executed successfully (advisory tier; mock=${LOA_STAGE_MOCK:-0})" \
  --next-allowed-reads "$(jq -r '.output_contract.writes[0].type // "Signal"' "$INVOCATION")" \
  --quiet \
  --out "$handoff_dest" || {
  echo "[stage-runner] ERROR: handoff envelope construction failed" >&2
  exit 1
}

# ---- post-exec output-gate validation (S3-T8, FR-11) -----------------------
gate_result=$("$OUTPUT_GATE" \
  --invocation "$INVOCATION" \
  --handoff "$handoff_dest" \
  --manifest "$MANIFEST" 2>&1) || gate_exit=$?
gate_exit="${gate_exit:-0}"

if (( gate_exit != 0 )); then
  # Output-gate failed → stage handoff must be marked failure (per SDD §4.4).
  # Rewrite the handoff with status=failure + error block.
  err_msg=$(echo "$gate_result" | jq -r '.errors[0].message // "[OUTPUT-CONTRACT-VIOLATION]"' 2>/dev/null || echo "$gate_result")
  err_code=$(echo "$gate_result" | jq -r '.errors[0].code // "[OUTPUT-CONTRACT-VIOLATION]"' 2>/dev/null || echo "[OUTPUT-CONTRACT-VIOLATION]")
  err_json=$(jq -n --arg c "$err_code" --arg m "$err_msg" '{code: $c, message: $m, recoverable: false}')
  "$ENVELOPE_BUILDER" handoff \
    --invocation "$INVOCATION" \
    --status failure \
    --error "$err_json" \
    --partial-outputs '{"disposition": "marked_non_consumable", "count": 0}' \
    --summary "post-exec output-gate validation failed: $err_msg" \
    --quiet \
    --out "$handoff_dest"
  if (( QUIET == 0 )); then
    echo "[stage-runner] STAGE FAILED: $err_msg" >&2
    echo "$gate_result" >&2
  fi
  exit 1
fi

# ---- success ----------------------------------------------------------------
if (( QUIET == 0 )); then
  echo "[stage-runner] stage_id=$stage_id pass=$stage_pass status=success handoff=$handoff_dest"
fi
exit 0
