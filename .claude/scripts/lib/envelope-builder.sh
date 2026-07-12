#!/usr/bin/env bash
# =============================================================================
# envelope-builder.sh — Sprint 2 (S2-T1) — invocation + handoff envelope builder
# =============================================================================
# Bash entry point for the bounded-context envelope builder. Delegates to
# lib/envelope-builder.py for the algorithmic core (SDD §4.2, FR-1.2 / FR-2.2).
#
# Subcommands:
#
#   envelope-builder.sh invocation \
#       --composition <yaml> --stage <n> [--stage-pass <m>] [--run-id <id>] \
#       [--prior-handoff <path>] [--manifest <path>] [--out <path>]
#
#   envelope-builder.sh handoff \
#       --invocation <path> --status <success|failure|...> \
#       [--outputs <json-array>] [--summary <text>] [--error <json>] [--out <path>]
#
# Exit codes:
#   0  envelope built and persisted
#   1  contract violation (operator-fixable, e.g. status=success but error populated)
#   2  usage / parse error
#   3  environment problem (python3 / pyyaml / referenced file missing)
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PY_HELPER="$SCRIPT_DIR/envelope-builder.py"

if [[ ! -f "$PY_HELPER" ]]; then
  echo "[envelope-builder] ENV: Python helper missing at $PY_HELPER" >&2
  exit 3
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "[envelope-builder] ENV: python3 is required" >&2
  exit 3
fi

exec python3 "$PY_HELPER" "$@"
