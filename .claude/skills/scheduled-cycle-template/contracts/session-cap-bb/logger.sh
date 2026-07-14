#!/usr/bin/env bash
# session-cap-bb logger.sh — phase 4 (logger) for the post-reset bridgebuilder
# fan-out (bd-fanout-real-dispatch-9jv6 Tranche 1).
#
# Records the bridgebuilder run outcome (dispatched?, repo, exit code) into the
# cycle.phase payload via stdout. Best-effort cleans up the per-cycle handoff
# dir once the cycle has recorded its outcome.
#
# Args: $1 cycle_id  $2 schedule_id  $3 phase_index  $4 prior_phases_json
set -euo pipefail

cycle_id="${1:?cycle_id required}"
schedule_id="${2:?schedule_id required}"

_here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
_sanitize() { printf '%s' "$1" | tr -c 'A-Za-z0-9._-' '_'; }
HANDOFF_DIR="${TMPDIR:-/tmp}/loa-session-cap-bb.$(_sanitize "$cycle_id")"
# shellcheck source=handoff-lib.sh
. "${_here}/handoff-lib.sh"
session_cap_handoff_require "$HANDOFF_DIR"
DISPATCHER_FILE="${HANDOFF_DIR}/dispatcher.json"

dispatched="false"
repo=""
bb_ec="null"
delivery_state="noop"
if [[ -f "$DISPATCHER_FILE" ]] && jq empty "$DISPATCHER_FILE" 2>/dev/null; then
    dispatched="$(jq -r '.dispatched // false' "$DISPATCHER_FILE")"
    repo="$(jq -r '.repo // ""' "$DISPATCHER_FILE")"
    bb_ec="$(jq -r '.bb_exit_code // "null"' "$DISPATCHER_FILE")"
    delivery_state="$(jq -r '.delivery_state // "noop"' "$DISPATCHER_FILE")"
fi
[[ "$dispatched" == "true" || "$dispatched" == "false" ]] || dispatched="false"
[[ "$bb_ec" == "null" || "$bb_ec" =~ ^[0-9]+$ ]] || bb_ec="null"

jq -nc --arg cid "$cycle_id" --arg sid "$schedule_id" \
    --argjson d "$dispatched" --arg repo "$repo" --arg state "$delivery_state" --argjson ec "$bb_ec" \
    --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    '{cycle_id:$cid, schedule_id:$sid,
      summary:"session-cap bridgebuilder fan-out complete",
      dispatched:$d, repo:$repo, delivery_state:$state, bb_exit_code:$ec, logged_at:$ts}'

# Best-effort handoff cleanup (idempotent; safe to skip on failure).
session_cap_handoff_cleanup "$HANDOFF_DIR" 2>/dev/null || true
