#!/usr/bin/env bash
# =============================================================================
# compose-iteration-audit.sh — Sprint 5 (S5-T5..T8) — iteration auditor
# =============================================================================
# Audits compositions for iteration constraints per SDD §4.6 / FR-7.4.
# Phase 1 (enumerate): walks compositions, surfaces every iterate: block,
# checks for max_iterations + terminate_when, reports compliance.
#
# Sprint 5 ships Phase 1 (enumerate). Phase 2 (dual-run with L1/L2/L3 diff)
# is implemented as a CLI flag stub here that delegates to compose-dry-run.sh
# when --iteration-mode=dual is set. The stub documents the flow + emits a
# diagnostic so operators can wire it up; full L1/L2/L3 dual-run lands in a
# follow-up Sprint 5b cycle when the executor (Sprint 3+4) is mature enough
# to actually run both legacy and stream-edge semantics.
#
# Usage:
#   compose-iteration-audit.sh --phase enumerate [--root <dir>] [--json]
#   compose-iteration-audit.sh --phase dual-run --composition <yaml> [--json]
#                              (Phase 2 stub; reports the dual-run protocol
#                               + delegates dry-run preview)
#
# Exit codes:
#   0   all surveyed compositions comply (max_iterations + terminate_when present
#       on every iterate: block); empty enumerate is also exit 0
#   1   one or more compositions have an iterate: block missing required fields
#   2   usage / parse error
#   3   environment problem (yq missing)
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
PROJECT_ROOT="${PROJECT_ROOT:-$(cd "$SCRIPT_DIR/../../.." && pwd -P)}"

PHASE=""
ROOT="$PROJECT_ROOT"
COMPOSITION=""
OUTPUT_JSON=0

usage() { sed -n '2,30p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help)        usage; exit 0 ;;
    --phase)          PHASE="$2"; shift 2 ;;
    --root)           ROOT="$2"; shift 2 ;;
    --composition)    COMPOSITION="$2"; shift 2 ;;
    --json)           OUTPUT_JSON=1; shift ;;
    -*) echo "[iteration-audit] ERROR: unknown flag $1" >&2; exit 2 ;;
    *)  echo "[iteration-audit] ERROR: unexpected positional: $1" >&2; exit 2 ;;
  esac
done

[[ -n "$PHASE" ]] || { echo "[iteration-audit] ERROR: --phase required (enumerate|dual-run)" >&2; exit 2; }
command -v yq >/dev/null 2>&1 || { echo "[iteration-audit] ERROR: yq v4+ required" >&2; exit 3; }
command -v jq >/dev/null 2>&1 || { echo "[iteration-audit] ERROR: jq required" >&2; exit 3; }

# ---- Phase 1: enumerate ------------------------------------------------------

phase_enumerate() {
  declare -a results=()
  declare -a violations=()

  # Walk every composition file under the configured roots. Look in:
  #   - $PROJECT_ROOT/compositions/**/*.yaml (canonical)
  #   - $PROJECT_ROOT/construct-compositions/compositions/**/*.yaml (loom-managed)
  #   - $PROJECT_ROOT/tests/composition/validators/fixtures/**/*.yaml (fixtures)
  declare -a search_dirs=(
    "$ROOT/compositions"
    "$ROOT/construct-compositions/compositions"
    "$ROOT/tests/composition/validators/fixtures"
  )

  while IFS= read -r -d '' path; do
    rel="${path#$ROOT/}"
    yaml_json=$(yq -o=json '.' "$path" 2>/dev/null || echo "{}")
    iterate_count=$(echo "$yaml_json" | jq '(.iterate // []) | length' 2>/dev/null || echo 0)
    if [[ "$iterate_count" == "0" ]]; then
      continue
    fi

    has_max=$(echo "$yaml_json" | jq 'has("max_iterations") and (.max_iterations != null)' 2>/dev/null)
    has_term=$(echo "$yaml_json" | jq 'has("terminate_when") and ((.terminate_when // "") | length > 0)' 2>/dev/null)
    iter_mode=$(echo "$yaml_json" | jq -r '.iteration_mode // "persistent_leak"' 2>/dev/null)

    entry=$(jq -n \
      --arg path "$rel" \
      --argjson iterate_count "$iterate_count" \
      --argjson has_max "${has_max:-false}" \
      --argjson has_term "${has_term:-false}" \
      --arg iter_mode "$iter_mode" \
      '{
        path: $path,
        iterate_blocks: $iterate_count,
        has_max_iterations: $has_max,
        has_terminate_when: $has_term,
        iteration_mode: $iter_mode,
        compliant: ($has_max and $has_term)
      }')
    results+=("$entry")

    if [[ "$has_max" != "true" || "$has_term" != "true" ]]; then
      violations+=("$entry")
    fi
  done < <(
    for dir in ${search_dirs[@]+"${search_dirs[@]}"}; do
      [[ -d "$dir" ]] && find "$dir" -type f \( -name '*.yaml' -o -name '*.yml' \) -print0
    done
  )

  if (( OUTPUT_JSON == 1 )); then
    results_json="[]"
    if (( ${#results[@]} > 0 )); then
      results_json=$(printf '%s\n' "${results[@]}" | jq -s '.')
    fi
    violations_json="[]"
    if (( ${#violations[@]} > 0 )); then
      violations_json=$(printf '%s\n' "${violations[@]}" | jq -s '.')
    fi
    jq -n \
      --argjson results "$results_json" \
      --argjson violations "$violations_json" \
      '{
        phase: "enumerate",
        compositions_with_iterate: ($results | length),
        compliant: ($results | map(select(.compliant)) | length),
        violations: $violations,
        all_compositions: $results
      }'
  else
    echo "# iteration-audit (phase: enumerate)"
    echo "  scanned dirs: ${search_dirs[*]}"
    echo "  compositions with iterate[]: ${#results[@]}"
    if (( ${#results[@]} == 0 )); then
      echo "  ✓ no iterating compositions found"
    fi
    for r in ${results[@]+"${results[@]}"}; do
      p=$(echo "$r" | jq -r '.path')
      ok=$(echo "$r" | jq -r '.compliant')
      mode=$(echo "$r" | jq -r '.iteration_mode')
      if [[ "$ok" == "true" ]]; then
        printf "  ✓ %s (mode=%s)\n" "$p" "$mode"
      else
        m=$(echo "$r" | jq -r '.has_max_iterations')
        t=$(echo "$r" | jq -r '.has_terminate_when')
        printf "  ✗ %s (mode=%s, max_iterations=%s, terminate_when=%s)\n" "$p" "$mode" "$m" "$t"
      fi
    done
    if (( ${#violations[@]} > 0 )); then
      echo "  → ${#violations[@]} composition(s) violate FR-7.2 iteration mandate"
    fi
  fi

  if (( ${#violations[@]} > 0 )); then return 1; fi
  return 0
}

# ---- Phase 2: dual-run stub --------------------------------------------------
#
# Phase 2 (per SDD §4.6) requires the runtime executor to actually execute
# BOTH legacy (`persistent_leak`) AND new (`stream_edge`) semantics for an
# iteration block, then diff the results across L1 (envelope), L2 (output
# schema), and L3 (output payload) layers. Sprint 3 (advisory tier) ships
# a partial executor; Sprint 4 (strict tier) and full live-mode integration
# are required for meaningful dual-run output.
#
# This stub:
#   - Validates --composition exists
#   - Reports the dual-run protocol + the L1/L2/L3 layered table (per SDD)
#   - Delegates the `dry-run` preview to compose-dry-run.sh as a single-mode
#     reference (legacy `persistent_leak` is the implicit baseline)
#   - Emits an explicit "Phase 2 dual-run pending Sprint 3+4 executor maturity"
#     diagnostic so operators understand the current scope.

phase_dual_run() {
  [[ -n "$COMPOSITION" && -f "$COMPOSITION" ]] || {
    echo "[iteration-audit] ERROR: --composition <yaml> required and must exist" >&2
    exit 2
  }
  local dry_run="$SCRIPT_DIR/compose-dry-run.sh"
  if [[ ! -x "$dry_run" ]]; then
    echo "[iteration-audit] ERROR: compose-dry-run.sh not executable at $dry_run" >&2
    exit 3
  fi

  local preview
  preview=$("$dry_run" "$COMPOSITION" 2>&1) || true

  if (( OUTPUT_JSON == 1 )); then
    jq -n \
      --arg composition "$COMPOSITION" \
      --argjson preview "$(echo "$preview" | jq -c . 2>/dev/null || echo '{}')" \
      '{
        phase: "dual-run",
        composition: $composition,
        scope_note: "Sprint 5 ships Phase 1 (enumerate). Phase 2 dual-run requires the live executor (Sprint 3 advisory + Sprint 4 strict) at sufficient maturity to run both persistent_leak AND stream_edge semantics. This stub returns the legacy-baseline dry-run preview as a single-mode reference until Sprint 5b lands the dual-run integration.",
        diff_layers: [
          {layer: "L1", semantic: "envelope diff (deterministic)", gate: true,
           description: "Byte-equal except for hash-chain values, timestamps, run_id"},
          {layer: "L2", semantic: "output schema diff (deterministic)", gate: true,
           description: "Output count, types, schema_ids match; required outputs all present"},
          {layer: "L3", semantic: "output payload diff (non-deterministic)", gate: false,
           description: "Shape-equal (same JSON keys, types) but content may diverge — informational only"}
        ],
        legacy_baseline_preview: $preview
      }'
  else
    echo "# iteration-audit (phase: dual-run, stub)"
    echo "  composition: $COMPOSITION"
    echo ""
    echo "  Phase 2 protocol (per SDD §4.6):"
    echo "    L1 envelope diff      DETERMINISTIC  GATES MIGRATION"
    echo "    L2 output schema diff DETERMINISTIC  GATES MIGRATION"
    echo "    L3 output payload diff NON-DETERMIN. INFORMATIONAL ONLY"
    echo ""
    echo "  This stub delegates to compose-dry-run.sh for the legacy-baseline preview."
    echo "  Full dual-run integration (legacy_persistent_leak vs stream_edge) lands"
    echo "  with Sprint 5b once the live executor (Sprint 3+4) supports both modes."
    echo ""
    echo "  Legacy-baseline dry-run preview:"
    echo "$preview" | sed 's/^/    /'
  fi
  return 0
}

# ---- entry -------------------------------------------------------------------

case "$PHASE" in
  enumerate) phase_enumerate ;;
  dual-run)  phase_dual_run ;;
  *) echo "[iteration-audit] ERROR: --phase must be 'enumerate' or 'dual-run', got '$PHASE'" >&2; exit 2 ;;
esac
