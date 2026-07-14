#!/usr/bin/env bash
# session-cap-bb reader.sh — phase 0 (reader) for the post-reset bridgebuilder
# fan-out (bd-fanout-real-dispatch-9jv6 Tranche 1).
#
# SANITY GATE: reads one unconsumed, fresh session-limit capture marker and hands
# its captured active_run_state_snapshot forward to the decider. Side-effect-free
# w.r.t. repo state; writes only a deterministic per-cycle handoff under TMPDIR.
#
# Cross-phase handoff convention (invented for this contract): prior_phases_json
# carries only an output_hash, never the reader's actual output, so state is
# passed out-of-band through a temp file whose path each of the 5 phases
# re-derives IDENTICALLY from the shared cycle_id. TMPDIR is on the L3 env-i
# allowlist, so the same path resolves under cron as under an interactive shell.
#
# Args: $1 cycle_id  $2 schedule_id  $3 phase_index  $4 prior_phases_json
set -euo pipefail

cycle_id="${1:?cycle_id required}"
schedule_id="${2:?schedule_id required}"

_here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
_repo_root="$(cd "${_here}/../../../../.." && pwd -P)"
_sanitize() { printf '%s' "$1" | tr -c 'A-Za-z0-9._-' '_'; }
HANDOFF_DIR="${TMPDIR:-/tmp}/loa-session-cap-bb.$(_sanitize "$cycle_id")"
mkdir -p "$HANDOFF_DIR"

STATE_FILE="${LOA_SESSION_CAP_STATE_FILE:-${_repo_root}/.run/session-limit-state.json}"

emit() { printf '%s' "$1" | tee "${HANDOFF_DIR}/reader.json"; }

if [[ ! -f "$STATE_FILE" ]]; then
    # No session-limit was ever captured -> nothing was in flight. Normal (the
    # decider will no-op), NOT a sanity failure.
    emit "$(jq -nc --arg cid "$cycle_id" --arg sid "$schedule_id" \
        '{cycle_id:$cid, schedule_id:$sid, state_present:false,
          eligible:false, capture_id:null, reset_at_epoch:null,
          sprint_plan_state:null, bridge_state:null,
          note:"no session-limit-state.json; nothing in flight"}')"
    exit 0
fi

# Sanity gate: a PRESENT-but-corrupt marker is a genuine failure -> abort cycle
# (cycle.error) rather than silently no-op on unreadable state.
if ! jq empty "$STATE_FILE" 2>/dev/null; then
    echo "reader: session-limit-state.json present but not valid JSON: $STATE_FILE" >&2
    exit 1
fi

sp_state="$(jq -r '.active_run_state_snapshot.sprint_plan.state // ""' "$STATE_FILE")"
br_state="$(jq -r '.active_run_state_snapshot.bridge.state // ""' "$STATE_FILE")"
capture_id="$(jq -r '.capture_id // ""' "$STATE_FILE")"
reset_epoch="$(jq -r '.reset_at_epoch // ""' "$STATE_FILE")"
consumed_at="$(jq -r '.consumed_at // ""' "$STATE_FILE")"
now_epoch="${LOA_SESSION_CAP_NOW_EPOCH:-$(date +%s)}"
max_age="${LOA_SESSION_CAP_MAX_RESET_AGE_SECONDS:-21600}"

eligible="false"
reason="eligible"
if [[ -z "$capture_id" ]]; then
    reason="missing capture_id (legacy marker is not dispatchable)"
elif [[ -n "$consumed_at" ]]; then
    reason="capture already consumed"
elif ! [[ "$reset_epoch" =~ ^[0-9]+$ && "$now_epoch" =~ ^[0-9]+$ && "$max_age" =~ ^[0-9]+$ ]]; then
    reason="capture reset/freshness fields are invalid"
elif (( now_epoch < reset_epoch )); then
    reason="capture reset time has not arrived"
elif (( now_epoch - reset_epoch > max_age )); then
    reason="capture is outside the post-reset eligibility window"
else
    eligible="true"
fi

emit "$(jq -nc --arg cid "$cycle_id" --arg sid "$schedule_id" \
    --argjson eligible "$eligible" --arg capture "$capture_id" \
    --arg reset "$reset_epoch" --arg reason "$reason" \
    --arg sp "$sp_state" --arg br "$br_state" \
    '{cycle_id:$cid, schedule_id:$sid, state_present:true,
      eligible:$eligible, capture_id:($capture | if length == 0 then null else . end),
      reset_at_epoch:($reset | if test("^[0-9]+$") then tonumber else null end),
      eligibility_reason:$reason, sprint_plan_state:$sp, bridge_state:$br}')"
