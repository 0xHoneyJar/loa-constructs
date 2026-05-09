#!/usr/bin/env bash
# =============================================================================
# lib/output-gate.sh — Sprint 1 (S1-T2) — project-level entry point
# =============================================================================
# Post-execution output validator for the bounded-context substrate.
# Resolves to .claude/scripts/lib/output-gate.sh for implementation.
# SDD §4.4, FR-11.
#
# Usage:
#   output-gate.sh \
#       --invocation <path/to/stage-N.invocation.json> \
#       --handoff    <path/to/stage-N.handoff.json> \
#       --manifest   <path/to/construct.yaml> \
#       [--schemas-dir <dir>] \
#       [--quiet]
#
# The validator confirms per declared output in output_contract.writes[]:
#   1. File exists at destination path.
#   2. JSON parses cleanly.
#   3. Validates against schema_id (loaded from <schemas-dir>/streams/<id>.schema.json).
#   4. Canonical hash field recomputes correctly via JCS.
#   5. domain.produced_by matches construct manifest domain.primary or supporting[].
#
# Output count enforcement:
#   - Required outputs missing → [OUTPUT-MISSING]
#   - Extra files beyond contract → [ORPHAN-OUTPUT]
#   - Per-output failures roll up to [OUTPUT-CONTRACT-VIOLATION]
#
# Exit codes:
#   0  every declared output honored, no orphans
#   1  validation failed ([OUTPUT-CONTRACT-VIOLATION] / [OUTPUT-MISSING] / [ORPHAN-OUTPUT])
#   2  usage / parse error
#   3  environment problem (python3 / pyyaml / file not found)
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
IMPL="$REPO_ROOT/.claude/scripts/lib/output-gate.sh"

if [[ ! -f "$IMPL" ]]; then
  echo "[output-gate] ERROR: implementation not found at $IMPL" >&2
  echo "[output-gate] Ensure the loa framework is initialised (loa-setup)" >&2
  exit 3
fi

if [[ ! -x "$IMPL" ]]; then
  chmod +x "$IMPL"
fi

exec "$IMPL" "$@"
