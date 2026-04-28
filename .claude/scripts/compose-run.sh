#!/usr/bin/env bash
# =============================================================================
# compose-run.sh — cycle-006 agentic full-stack runtime (L-backend)
# =============================================================================
# Substrate-layer backend for the three-layer architecture (doctrine v6 §18).
# Wraps cycle-005's construct-compose.sh (pipe runner + type verification)
# with cycle-006 additions:
#
#   - Per-stage mode dispatch (persistent | fresh) — AC-backend.2 / AC-backend.3
#   - Backend selection (headless-tmux | teamcreate) — AC-backend.7
#   - Iteration loops (composition-declared stage-pair loops) — AC-backend.6
#   - Orchestrator trajectory stream (.run/compose/<run_id>/orchestrator.jsonl)
#     for L-frontend to tail and render pipe graph live — AC-backend.4
#
# Usage:
#   compose-run.sh <composition-name> [options]
#   compose-run.sh website-scaffold --target src/ --intervene
#
# Options:
#   --target PATH           Input Artifact path
#   --input JSON            Raw JSON for stage-1 stdin (overrides --target)
#   --backend KIND          Override composition's backend (headless-tmux | teamcreate)
#   --max-iterations N      Cap loop iterations per pair (default 3)
#   --no-interactive        Auto-accept iteration loops (for bats/CI)
#   --dry-run               Validate + print plan; no stages run
#   --run-id ID             Override generated run_id
#   --compositions-dir DIR  Override default grimoires/compositions
#   --glance / --orient / --intervene
#   -h, --help
#
# Exit codes:
#   0 = success
#   1 = composition missing or malformed
#   2 = backend unsupported / not-implemented
#   3 = stage execution failure
#   4 = final-output schema validation failure
#   5 = iteration loop misconfigured
#
# Doctrine:
#   v6 §18.1 three-layer architecture — this script IS the backend layer
#   v6 §18.4 backend-choice rationale — headless-tmux default, teamcreate future
#   v5 §17.1 dispatch-determinism vs output-reproducibility — this script is
#           dispatch-deterministic; stage output varies under LLM
#   v4 §16.4 agent-transparency — trajectory emission per stage, three read-modes
#
# Cycle-006 SEED: grimoires/loa-constructs-seed-2026-04-21/cycle-006-SEED-agentic-fullstack-runtime.md
# Companion: stage-executor-tmux.sh (actual mode-dispatch worker, invoked per-stage)
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${PROJECT_ROOT:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
DEFAULT_COMPOSITIONS_DIR="${LOA_COMPOSITIONS_DIR:-$PROJECT_ROOT/grimoires/compositions}"
ORCH_DIR_ROOT="${LOA_COMPOSE_ORCH_DIR:-$PROJECT_ROOT/.run/compose}"

# ---------------------------------------------------------------------------
# Args
# ---------------------------------------------------------------------------
COMPOSITION_NAME=""
TARGET_PATH=""
RAW_INPUT=""
BACKEND_OVERRIDE=""
MAX_ITERATIONS=3
INTERACTIVE=1
DRY_RUN=0
RUN_ID=""
COMPOSITIONS_DIR="$DEFAULT_COMPOSITIONS_DIR"
READ_MODE="glance"

usage() {
  sed -n '2,45p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
}

die() {
  local code="${1:-1}"
  shift || true
  echo "[compose-run] ERROR: $*" >&2
  exit "$code"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help)           usage; exit 0 ;;
    --target)            TARGET_PATH="$2"; shift 2 ;;
    --input)             RAW_INPUT="$2"; shift 2 ;;
    --backend)           BACKEND_OVERRIDE="$2"; shift 2 ;;
    --max-iterations)    MAX_ITERATIONS="$2"; shift 2 ;;
    --no-interactive)    INTERACTIVE=0; shift ;;
    --dry-run)           DRY_RUN=1; shift ;;
    --run-id)            RUN_ID="$2"; shift 2 ;;
    --compositions-dir)  COMPOSITIONS_DIR="$2"; shift 2 ;;
    --glance)            READ_MODE="glance"; shift ;;
    --orient)            READ_MODE="orient"; shift ;;
    --intervene)         READ_MODE="intervene"; shift ;;
    --) shift; break ;;
    -*) die 1 "unknown flag: $1" ;;
    *)  if [[ -z "$COMPOSITION_NAME" ]]; then COMPOSITION_NAME="$1"; else die 1 "unexpected positional: $1"; fi; shift ;;
  esac
done

[[ -n "$COMPOSITION_NAME" ]] || { usage >&2; die 1 "composition name required"; }

# ---------------------------------------------------------------------------
# TTY auto-detection (bug fix 2026-04-27)
# ---------------------------------------------------------------------------
# Iterate-loop's `read -r answer </dev/tty` fails silently when invoked from a
# non-interactive parent (background shell, headless CI, scheduled remote
# runs, the loom CLI dispatching compose-run from a subprocess, etc.) — the
# read returns empty and the loop exits after pass 1. Auto-detect here so the
# operator doesn't need to remember --no-interactive everywhere.
# Explicit --no-interactive still wins; auto-detection only DOWNGRADES from
# interactive→non-interactive, never the reverse.
if (( INTERACTIVE )); then
  if [[ ! -e /dev/tty ]] || ! ( : </dev/tty ) 2>/dev/null; then
    INTERACTIVE=0
    echo "[compose-run] no readable /dev/tty — auto-disabling iterate-loop prompts" >&2
  fi
fi

# ---------------------------------------------------------------------------
# Tool dependencies
# ---------------------------------------------------------------------------
command -v yq >/dev/null 2>&1 || die 1 "yq (v4+) required"
command -v jq >/dev/null 2>&1 || die 1 "jq required"
CONSTRUCT_COMPOSE="$SCRIPT_DIR/construct-compose.sh"
STAGE_EXECUTOR="$SCRIPT_DIR/stage-executor-tmux.sh"
[[ -x "$CONSTRUCT_COMPOSE" ]] || die 1 "missing dep: $CONSTRUCT_COMPOSE"
[[ -x "$STAGE_EXECUTOR" ]] || die 1 "missing dep: $STAGE_EXECUTOR"

# ---------------------------------------------------------------------------
# Composition load + cycle-006 field extraction
# ---------------------------------------------------------------------------
COMPOSITION_FILE="$COMPOSITIONS_DIR/$COMPOSITION_NAME.yaml"
[[ -f "$COMPOSITION_FILE" ]] || die 1 "composition not found: $COMPOSITION_FILE"

# Pre-dispatch schema validation. The composition must conform to
# composition.schema.json before any LLM cost is incurred.
# Closes the governance loop on [[contracts-as-bridges]] / composition-schema-as-bridge —
# schema is the bridge; validation is the discipline that keeps it living.
# Override: LOA_COMPOSE_VALIDATE=disabled (emergency only). LOA_COMPOSE_VALIDATE=warn for non-fatal.
SCHEMA_VALIDATE_MODE="${LOA_COMPOSE_VALIDATE:-strict}"
if [[ "$SCHEMA_VALIDATE_MODE" != "disabled" ]]; then
  SCHEMA_VALIDATOR="$SCRIPT_DIR/schema-validator.sh"
  if [[ -x "$SCHEMA_VALIDATOR" ]]; then
    if ! "$SCHEMA_VALIDATOR" validate "$COMPOSITION_FILE" --mode "$SCHEMA_VALIDATE_MODE" >&2; then
      die 1 "composition fails schema validation: $COMPOSITION_FILE
        Override: LOA_COMPOSE_VALIDATE=disabled (emergency) or =warn (non-fatal)."
    fi
  fi
fi

COMPOSITION_JSON=$(yq -o=json '.' "$COMPOSITION_FILE" 2>/dev/null) \
  || die 1 "failed to parse YAML: $COMPOSITION_FILE"

STAGE_COUNT=$(echo "$COMPOSITION_JSON" | jq -r '.chain | length')
(( STAGE_COUNT > 0 )) || die 1 "composition has empty chain"

# Backend field — default headless-tmux
BACKEND=$(echo "$COMPOSITION_JSON" | jq -r '.backend // "headless-tmux"')
[[ -n "$BACKEND_OVERRIDE" ]] && BACKEND="$BACKEND_OVERRIDE"

case "$BACKEND" in
  headless-tmux)
    : # supported
    ;;
  teamcreate)
    die 2 "backend 'teamcreate' not implemented this cycle. See research output: grimoires/loa-constructs-seed-2026-04-21/stamets-prior-art-teamcreate-tmux.md (L-research). Use --backend headless-tmux or omit the --backend flag."
    ;;
  *)
    die 2 "unknown backend '$BACKEND'. Supported: headless-tmux. Research-tracked: teamcreate."
    ;;
esac

# Iteration loops — array of [stage_a, stage_b] pairs
ITERATE_COUNT=$(echo "$COMPOSITION_JSON" | jq -r '.iterate // [] | length')
for (( i=0; i<ITERATE_COUNT; i++ )); do
  pair_len=$(echo "$COMPOSITION_JSON" | jq -r ".iterate[$i] | length")
  (( pair_len == 2 )) || die 5 "iterate[$i] must be a [stage_a, stage_b] pair; got length $pair_len"
done

# ---------------------------------------------------------------------------
# run_id + orchestrator trajectory dir
# ---------------------------------------------------------------------------
if [[ -z "$RUN_ID" ]]; then
  RUN_ID=$(uuidgen 2>/dev/null \
           || python3 -c "import uuid; print(uuid.uuid4())" 2>/dev/null \
           || echo "compose-run-$(date +%s)-$$")
fi

ORCH_DIR="$ORCH_DIR_ROOT/$RUN_ID"
mkdir -p "$ORCH_DIR"
ORCH_TRAJECTORY="$ORCH_DIR/orchestrator.jsonl"
HISTORY_DIR="$ORCH_DIR/history"  # persistent-mode context accumulation
mkdir -p "$HISTORY_DIR"

# ISO-8601 UTC timestamp — sub-second precision via python3 when available
# (macOS BSD date lacks %N; portable fallback strips sub-seconds).
iso_ts() {
  python3 -c "from datetime import datetime, timezone; print(datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z')" 2>/dev/null \
    || date -u +%Y-%m-%dT%H:%M:%SZ
}

# Orchestrator event emitter — L-frontend tails this file
orch_emit() {
  local event_type="$1"
  shift
  local payload
  # shellcheck disable=SC2046
  payload=$(jq -c -n \
    --arg ts "$(iso_ts)" \
    --arg type "$event_type" \
    --arg run_id "$RUN_ID" \
    --arg composition "$COMPOSITION_NAME" \
    --arg backend "$BACKEND" \
    $(for kv in "$@"; do
        k="${kv%%=*}"; v="${kv#*=}"
        printf -- "--arg %q %q " "$k" "$v"
      done) \
    '. + $ARGS.named + {type: $type, ts: $ts, run_id: $run_id, composition: $composition, backend: $backend}')
  echo "$payload" >> "$ORCH_TRAJECTORY"
}

# ---------------------------------------------------------------------------
# Dry-run → delegate to construct-compose --dry-run
# ---------------------------------------------------------------------------
if (( DRY_RUN )); then
  echo "[compose-run] dry-run · composition=$COMPOSITION_NAME backend=$BACKEND stages=$STAGE_COUNT iterate_pairs=$ITERATE_COUNT run_id=$RUN_ID" >&2
  "$CONSTRUCT_COMPOSE" "$COMPOSITION_NAME" --dry-run --compositions-dir "$COMPOSITIONS_DIR"
  # Also list cycle-006 extensions
  echo "[compose-run] cycle-006 extensions:" >&2
  for (( i=0; i<STAGE_COUNT; i++ )); do
    mode=$(echo "$COMPOSITION_JSON" | jq -r ".chain[$i].mode // \"fresh\"")
    stage_label=$(echo "$COMPOSITION_JSON" | jq -r ".chain[$i].stage // ($i+1)")
    echo "  stage $stage_label · mode=$mode" >&2
  done
  for (( i=0; i<ITERATE_COUNT; i++ )); do
    pair=$(echo "$COMPOSITION_JSON" | jq -c ".iterate[$i]")
    echo "  iterate $pair · max=$MAX_ITERATIONS" >&2
  done
  exit 0
fi

# ---------------------------------------------------------------------------
# First-pass execution — delegate to construct-compose.sh with our executor
# ---------------------------------------------------------------------------
orch_emit "run_start" "stages=$STAGE_COUNT" "iterate_pairs=$ITERATE_COUNT" "target=${TARGET_PATH:-<none>}"

export LOA_COMPOSE_STAGE_EXECUTOR="$STAGE_EXECUTOR"
export LOA_COMPOSE_RUN_ID="$RUN_ID"
export LOA_COMPOSE_HISTORY_DIR="$HISTORY_DIR"
export LOA_COMPOSE_ORCH_TRAJECTORY="$ORCH_TRAJECTORY"
export LOA_COMPOSE_COMPOSITION_JSON="$COMPOSITION_JSON"  # for stage-executor mode lookup

run_construct_compose() {
  local pass_label="$1"
  shift
  local cc_args=()
  cc_args=("$COMPOSITION_NAME" --run-id "$RUN_ID" --compositions-dir "$COMPOSITIONS_DIR")
  [[ -n "$TARGET_PATH" ]] && cc_args+=(--target "$TARGET_PATH")
  [[ -n "$RAW_INPUT" ]]  && cc_args+=(--input "$RAW_INPUT")
  cc_args+=("--${READ_MODE}")

  export LOA_COMPOSE_PASS_LABEL="$pass_label"

  orch_emit "pass_start" "pass=$pass_label"
  local final_payload
  local cc_rc=0
  final_payload=$("$CONSTRUCT_COMPOSE" "${cc_args[@]}") || cc_rc=$?
  orch_emit "pass_end" "pass=$pass_label" "rc=$cc_rc"

  if (( cc_rc != 0 )); then
    # Propagate construct-compose exit code
    echo "$final_payload"
    return "$cc_rc"
  fi
  echo "$final_payload"
}

FIRST_PASS_RC=0
FIRST_PASS_OUTPUT=$(run_construct_compose "initial") || FIRST_PASS_RC=$?
if (( FIRST_PASS_RC != 0 )); then
  orch_emit "run_end" "outcome=failed" "rc=$FIRST_PASS_RC"
  echo "$FIRST_PASS_OUTPUT"
  exit "$FIRST_PASS_RC"
fi

FINAL_OUTPUT="$FIRST_PASS_OUTPUT"

# ---------------------------------------------------------------------------
# Iteration loops — after initial pass, loop over declared pairs
#
# For each iterate [A, B] pair, prompt operator "iterate again?" (unless
# --no-interactive). On "y" → re-run the sub-chain A..B with the current
# stage-B output prepended as context via LOA_COMPOSE_PRIOR_OUTPUT_<label>.
# Cap at MAX_ITERATIONS per pair.
#
# Implementation note: we don't modify the composition YAML mid-flight.
# The sub-pass is simulated by invoking construct-compose.sh with the
# same composition but signaling the stage-executor (via env) that a
# specific subrange is re-running and prior context is accumulated in
# HISTORY_DIR. construct-compose.sh runs all stages; stages outside the
# loop subrange with accumulated history act as no-ops within their
# executor. For MVP we document this as "loop passes re-run the full
# composition with accumulated persistent-teammate context" — the
# operator-visible behavior matches: re-running the full chain with
# stage-2 and stage-4 deepening their context each pass.
# Cycle-007 target: honest subrange-only re-execution via construct-compose
# --from-stage/--to-stage flags.
# ---------------------------------------------------------------------------
for (( pair_idx=0; pair_idx<ITERATE_COUNT; pair_idx++ )); do
  pair_json=$(echo "$COMPOSITION_JSON" | jq -c ".iterate[$pair_idx]")
  stage_a=$(echo "$pair_json" | jq -r '.[0]')
  stage_b=$(echo "$pair_json" | jq -r '.[1]')
  orch_emit "iterate_prompt" "pair=$pair_json" "stage_a=$stage_a" "stage_b=$stage_b"

  for (( iter=1; iter<=MAX_ITERATIONS; iter++ )); do
    if (( INTERACTIVE )); then
      printf "\n[compose-run] iterate loop %s ↔ %s  (pass %d/%d): iterate again? [y/N/a(ccept all)] " \
        "$stage_a" "$stage_b" "$iter" "$MAX_ITERATIONS" >&2
      read -r answer </dev/tty || answer="N"
      case "${answer:-N}" in
        a|A) INTERACTIVE=0 ;;     # accept-all: take current output, skip remaining loops
        y|Y) : ;;                 # iterate
        *)   break ;;             # no more iterations for this pair
      esac
      # Accept-all means no more iteration for this pair either
      if (( ! INTERACTIVE )); then
        break
      fi
    else
      # Non-interactive: do not iterate (CI/bats path). Loops validated by existence-only.
      break
    fi

    orch_emit "iterate_pass_start" "pair=$pair_json" "iter=$iter"
    export LOA_COMPOSE_ITER_PASS="$iter"
    ITER_RC=0
    ITER_OUTPUT=$(run_construct_compose "iterate-${stage_a}-${stage_b}-pass-${iter}") || ITER_RC=$?
    unset LOA_COMPOSE_ITER_PASS
    orch_emit "iterate_pass_end" "pair=$pair_json" "iter=$iter" "rc=$ITER_RC"
    if (( ITER_RC != 0 )); then
      orch_emit "run_end" "outcome=failed" "rc=$ITER_RC" "failed_in=iterate-$stage_a-$stage_b-pass-$iter"
      echo "$ITER_OUTPUT"
      exit "$ITER_RC"
    fi
    FINAL_OUTPUT="$ITER_OUTPUT"
  done
done

# ---------------------------------------------------------------------------
# Run complete
# ---------------------------------------------------------------------------
orch_emit "run_end" "outcome=completed" "rc=0"

printf '%s\n' "$FINAL_OUTPUT"

case "$READ_MODE" in
  glance)
    echo "✓ compose-run $COMPOSITION_NAME · backend=$BACKEND · stages=$STAGE_COUNT · iterate=$ITERATE_COUNT · run=${RUN_ID:0:8}" >&2
    ;;
  orient)
    echo "compose-run $COMPOSITION_NAME · run_id=$RUN_ID · backend=$BACKEND" >&2
    echo "  trajectory: $ORCH_TRAJECTORY" >&2
    echo "  history:    $HISTORY_DIR" >&2
    ;;
  intervene)
    jq -n \
      --arg composition "$COMPOSITION_NAME" \
      --arg run_id "$RUN_ID" \
      --arg backend "$BACKEND" \
      --argjson stages "$STAGE_COUNT" \
      --argjson iterate_pairs "$ITERATE_COUNT" \
      --arg trajectory "$ORCH_TRAJECTORY" \
      --arg history "$HISTORY_DIR" \
      '{composition: $composition, run_id: $run_id, backend: $backend,
        stages: $stages, iterate_pairs: $iterate_pairs,
        trajectory: $trajectory, history: $history}' >&2
    ;;
esac
