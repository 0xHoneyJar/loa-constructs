#!/usr/bin/env bash
# =============================================================================
# envelope-chain.sh — Sprint 2 (S2-T2 + S2-T3) — hash chain library
# =============================================================================
# Bash entry point for the bounded-context envelope hash chain.
# Delegates to lib/envelope-chain.py for the algorithmic core (SDD §3.1, FR-1.6).
#
# Subcommands (mirror the python helper):
#
#   envelope-chain.sh self-hash   --envelope <path> [--field invocation_hash|handoff_hash]
#   envelope-chain.sh prev-hash   --prior <path>
#   envelope-chain.sh validate    --chain-dir <dir>
#   envelope-chain.sh validate    --envelopes <path> [<path>...]
#   envelope-chain.sh compose-id  --composition <yaml>      (S2-T3)
#
# Two-pass algorithm summary (per SDD §3.1):
#   1. Build envelope E with all fields populated EXCEPT invocation_hash/handoff_hash.
#   2. prev_hash = null (first stage) | sha256(jcs(prior_envelope)) (subsequent).
#   3. Set E.prev_hash.
#   4. self_hash = sha256(jcs(E))                       ← E does NOT have hash field yet
#   5. Set E.invocation_hash (or handoff_hash) = self_hash.
#   6. Persist E.
#
# Chain topology:
#   - First invocation:    prev_hash=null
#   - Subsequent invocation: prev_hash = prior handoff's handoff_hash (chain to prior)
#   - Handoff:             prev_hash = paired invocation's invocation_hash (link within stage)
#
# Exit codes:
#   0 — operation succeeded
#   1 — chain validation failed ([ENVELOPE-CHAIN-BROKEN])
#   2 — usage / parse error
#   3 — environment problem (python3 / pyyaml missing)
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PY_HELPER="$SCRIPT_DIR/envelope-chain.py"

if [[ ! -f "$PY_HELPER" ]]; then
  echo "[envelope-chain] ENV: Python helper missing at $PY_HELPER" >&2
  exit 3
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "[envelope-chain] ENV: python3 is required" >&2
  exit 3
fi

exec python3 "$PY_HELPER" "$@"
