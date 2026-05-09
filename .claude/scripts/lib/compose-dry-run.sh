#!/usr/bin/env bash
# =============================================================================
# compose-dry-run.sh — Sprint 2 (S2-T4) — dry-run + explain-context engine
# =============================================================================
# Bash entry point. Delegates to lib/compose-dry-run.py for the algorithmic
# core (SDD §4.7, FR-9 / IMP-007). Output conforms to
# .claude/data/dry-run-fixture.schema.json.
#
# Usage:
#   compose-dry-run.sh <composition.yaml> [--explain-context] [--json] [--quiet]
#
# Exit codes:
#   0  composition validates (errors[] empty)
#   1  validation failed (errors[] non-empty)
#   2  usage / parse error
#   3  environment problem (python3 / pyyaml missing)
#
# The Sprint 2 engine ships as a standalone library to avoid disturbing the
# existing compose-run.sh pre-substrate behaviour. Sprint 3 wires it into
# compose-run.sh's --dry-run --explain-context flag path; today, callers can
# invoke compose-dry-run.sh directly OR add their own alias.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PY_HELPER="$SCRIPT_DIR/compose-dry-run.py"

if [[ ! -f "$PY_HELPER" ]]; then
  echo "[compose-dry-run] ENV: Python helper missing at $PY_HELPER" >&2
  exit 3
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "[compose-dry-run] ENV: python3 is required" >&2
  exit 3
fi

exec python3 "$PY_HELPER" "$@"
