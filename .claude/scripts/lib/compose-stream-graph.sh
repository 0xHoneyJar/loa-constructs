#!/usr/bin/env bash
# compose-stream-graph.sh — bash wrapper for the S1-T1 stream-graph validator
#
# Delegates to compose-stream-graph.py for the algorithm; this wrapper exists so
# bash callers (other Loa scripts, tests, CI) have a single executable entry
# point and don't need to know about the Python helper.
#
# Usage:
#   compose-stream-graph.sh <composition.yaml>            # JSON to stdout
#   compose-stream-graph.sh <composition.yaml> --quiet    # exit code only
#
# Exit codes:
#   0 = composition validates
#   1 = validation failed (typed errors in JSON report on stdout)
#   2 = usage / parse error
#   3 = environment problem (python3 / pyyaml missing, file not found)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PY_CORE="$SCRIPT_DIR/compose-stream-graph.py"

if [[ ! -f "$PY_CORE" ]]; then
  echo "ENV: missing core $PY_CORE" >&2
  exit 3
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "ENV: python3 not on PATH" >&2
  exit 3
fi

exec python3 "$PY_CORE" "$@"
