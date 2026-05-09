#!/usr/bin/env bash
# =============================================================================
# output-gate.sh — Sprint 1 (S1-T2) — post-execution output validator
# =============================================================================
# Bash entry point for the bounded-context post-exec output validator.
# Delegates to lib/output-gate.py for the algorithmic core (FR-11, SDD §4.4).
#
# Usage:
#   output-gate.sh \
#       --invocation .run/compose/<run>/envelopes/stage-1.invocation.json \
#       --handoff    .run/compose/<run>/envelopes/stage-1.handoff.json \
#       --manifest   .claude/constructs/packs/artisan/construct.yaml \
#       [--schemas-dir .claude/schemas] \
#       [--quiet]
#
# Exit codes:
#   0  every declared output honored, no orphans
#   1  validation failed ([OUTPUT-CONTRACT-VIOLATION] / [OUTPUT-MISSING] / [ORPHAN-OUTPUT])
#   2  usage / parse error
#   3  environment problem (python3 / pyyaml / file not found)
#
# Per SDD §4.4 the validator confirms:
#   1. File exists at destination
#   2. JSON parses cleanly
#   3. Validates against schema_id
#   4. handoff hash matches JCS-recompute of file content
#   5. domain.produced_by matches manifest domain.primary or supporting[]
#
# Output count semantics: required outputs missing → [OUTPUT-MISSING]; extras
# beyond the contract → [ORPHAN-OUTPUT]; per-output failures roll up to
# [OUTPUT-CONTRACT-VIOLATION] with structured subcodes.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PY_HELPER="$SCRIPT_DIR/output-gate.py"

if [[ ! -f "$PY_HELPER" ]]; then
  echo "[output-gate] ENV: Python helper missing at $PY_HELPER" >&2
  exit 3
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "[output-gate] ENV: python3 is required" >&2
  exit 3
fi

exec python3 "$PY_HELPER" "$@"
