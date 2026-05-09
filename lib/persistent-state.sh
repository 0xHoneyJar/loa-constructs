#!/usr/bin/env bash
# =============================================================================
# lib/persistent-state.sh — Sprint 5 (S5-T1 + S5-T2) — project-level entry point
# =============================================================================
# Per-skill persistent state manager for the bounded-context substrate.
# Resolves to .claude/scripts/lib/persistent-state.sh for implementation.
# SDD §3.3 + §4.5, FR-5.
#
# Composite key (FR-5.1): six components encoding full identity —
#
#   .run/compose/persistent/
#     <project_id>/
#       <composition_id>/            (FR-1.5 deterministic sha-prefix id)
#         <construct_slug>/
#           <skill_slug>/
#             <stage_id>/            (prevents collision at different stages)
#               <schema_version>/    (mismatch → fresh state, no auto-migrate)
#                 state.json
#                 state.json.lock
#
# Subcommands:
#
#   persistent-state.sh init <key-args> [--ttl-seconds N] [--ttl-policy write|access]
#     Initialise a fresh state file. Refuses if file already exists.
#     Records owning_construct + owning_skill from key components.
#
#   persistent-state.sh set <key-args> --payload-json <json>
#     Update payload. Foreign writers refused with [STATE-OWNERSHIP-VIOLATION].
#     Atomic-rename write pattern: write tmp → fsync → rename (POSIX-atomic).
#
#   persistent-state.sh get <key-args>
#     Read state under shared flock. Updates last_accessed (access policy).
#
#   persistent-state.sh extend <key-args> --calling-construct <slug> --calling-skill <slug>
#     Explicit TTL extension. Foreign callers refused [STATE-OWNERSHIP-VIOLATION].
#
#   persistent-state.sh path <key-args>
#     Print canonical state file path regardless of whether it exists.
#
# TTL policies (SDD §3.3 + Bridgebuilder MEDIUM-2):
#   write  (default): TTL = last_updated + ttl_seconds. Reads do not extend.
#   access (opt-in):  TTL = max(last_updated, last_accessed) + ttl_seconds.
#
# Key args (positional):
#   --project-id       e.g. "loa-constructs"
#   --composition-id   from envelope-chain.sh compose-id
#   --construct-slug   e.g. "artisan"
#   --skill-slug       e.g. "decomposing-feel"
#   --stage-id         e.g. "audit-feel.stage-1"
#   --schema-version   e.g. "v1"
#
# Exit codes:
#   0  success
#   1  ownership violation [STATE-OWNERSHIP-VIOLATION] or TTL expired
#   2  usage / parse error
#   3  environment problem
#   4  state not found (get on missing key)
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
IMPL="$REPO_ROOT/.claude/scripts/lib/persistent-state.sh"

if [[ ! -f "$IMPL" ]]; then
  echo "[persistent-state] ERROR: implementation not found at $IMPL" >&2
  echo "[persistent-state] Ensure the loa framework is initialised (loa-setup)" >&2
  exit 3
fi

if [[ ! -x "$IMPL" ]]; then
  chmod +x "$IMPL"
fi

exec "$IMPL" "$@"
