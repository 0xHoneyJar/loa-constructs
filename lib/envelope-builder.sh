#!/usr/bin/env bash
# =============================================================================
# lib/envelope-builder.sh — Sprint 2 (S2-T1) — project-level entry point
# =============================================================================
# Bounded-context invocation + handoff envelope builder.
# Resolves to .claude/scripts/lib/envelope-builder.sh for implementation.
# SDD §4.2, FR-1.2 / FR-2.2.
#
# Subcommands:
#
#   envelope-builder.sh invocation \
#       --composition <yaml> --stage <n> [--stage-pass <m>] [--run-id <id>] \
#       [--prior-handoff <path>] [--manifest <path>] [--out <path>]
#
#   envelope-builder.sh handoff \
#       --invocation <path> --status <success|failure|timeout|cancelled|refused> \
#       [--outputs <json-array>] [--summary <text>] [--error <json>] [--out <path>]
#
# Exit codes:
#   0  envelope built and persisted
#   1  contract violation (status=success but error field populated, etc.)
#   2  usage / parse error
#   3  environment problem (python3 / pyyaml / referenced file missing)
#
# The builder implements the two-pass hash algorithm from SDD §3.1:
#   1. Build envelope E without invocation_hash/handoff_hash field.
#   2. prev_hash = null (first stage) OR sha256(jcs(prior_handoff_envelope)).
#   3. self_hash = sha256(jcs(E))  — E does NOT yet have the hash field.
#   4. Set E.invocation_hash (or handoff_hash) = self_hash.
#   5. Persist E.
#
# Chain topology enforced:
#   Invocation(prev=null)  →  Handoff(prev=invocation_hash)
#   Invocation(prev=H_n-1) →  Handoff(prev=invocation_hash)
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
IMPL="$REPO_ROOT/.claude/scripts/lib/envelope-builder.sh"

if [[ ! -f "$IMPL" ]]; then
  echo "[envelope-builder] ERROR: implementation not found at $IMPL" >&2
  echo "[envelope-builder] Ensure the loa framework is initialised (loa-setup)" >&2
  exit 3
fi

if [[ ! -x "$IMPL" ]]; then
  chmod +x "$IMPL"
fi

exec "$IMPL" "$@"
