#!/usr/bin/env bash
# =============================================================================
# lib/envelope-chain.sh — Sprint 2 (S2-T2 + S2-T3) — project-level entry point
# =============================================================================
# Bounded-context envelope hash chain library.
# Resolves to .claude/scripts/lib/envelope-chain.sh for implementation.
# SDD §3.1, FR-1.6.
#
# Subcommands:
#
#   envelope-chain.sh self-hash \
#       --envelope <path> [--field invocation_hash|handoff_hash]
#
#   envelope-chain.sh prev-hash \
#       --prior <path>
#
#   envelope-chain.sh validate \
#       --chain-dir <dir>
#   envelope-chain.sh validate \
#       --envelopes <path> [<path>...]
#
#   envelope-chain.sh compose-id \
#       --composition <yaml>
#
# Algorithm summary (SDD §3.1 two-pass with no self-reference):
#   1. Build E without hash field.
#   2. prev_hash = null | sha256(jcs(prior_envelope))
#   3. self_hash  = sha256(jcs(E))          ← E does NOT have hash field yet
#   4. E.invocation_hash = self_hash; persist.
#
# Chain topology:
#   stage 1 invocation:   prev_hash=null,  invocation_hash=I1
#   stage 1 handoff:      prev_hash=I1,    handoff_hash=H1
#   stage 2 invocation:   prev_hash=H1,    invocation_hash=I2
#   stage 2 handoff:      prev_hash=I2,    handoff_hash=H2
#
# composition_id derivation (S2-T3):
#   "{basename(yaml)}@sha256:{first_12(sha256(jcs(parsed_yaml)))}"
#   Stable across whitespace/key-reordering; changes on any semantic edit.
#
# Exit codes:
#   0  operation succeeded
#   1  chain validation failed ([ENVELOPE-CHAIN-BROKEN])
#   2  usage / parse error
#   3  environment problem (python3 / pyyaml missing)
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
IMPL="$REPO_ROOT/.claude/scripts/lib/envelope-chain.sh"

if [[ ! -f "$IMPL" ]]; then
  echo "[envelope-chain] ERROR: implementation not found at $IMPL" >&2
  echo "[envelope-chain] Ensure the loa framework is initialised (loa-setup)" >&2
  exit 3
fi

if [[ ! -x "$IMPL" ]]; then
  chmod +x "$IMPL"
fi

exec "$IMPL" "$@"
