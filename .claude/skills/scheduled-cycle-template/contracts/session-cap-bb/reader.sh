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
# shellcheck source=handoff-lib.sh
. "${_here}/handoff-lib.sh"
if ! session_cap_handoff_init "$HANDOFF_DIR"; then
    echo "reader: refusing pre-existing or insecure handoff directory: $HANDOFF_DIR" >&2
    exit 1
fi

STATE_FILE="${LOA_SESSION_CAP_STATE_FILE:-${_repo_root}/.run/session-limit-state.json}"
# shellcheck source=/dev/null
. "${_repo_root}/.claude/scripts/compat-lib.sh"
# shellcheck source=/dev/null
. "${_repo_root}/.claude/scripts/lib/session-cap-state-lib.sh"
STATE_LOCK_DIR="${STATE_FILE}.lock"

emit() { session_cap_handoff_write "${HANDOFF_DIR}/reader.json" "$1"; }

if ! portable_lock_acquire "$STATE_LOCK_DIR"; then
    echo "reader: timed out acquiring capture state lock" >&2
    exit 1
fi

if [[ ! -f "$STATE_FILE" ]]; then
    portable_lock_release "$STATE_LOCK_DIR"
    # No session-limit was ever captured -> nothing was in flight. Normal (the
    # decider will no-op), NOT a sanity failure.
    emit "$(jq -nc --arg cid "$cycle_id" --arg sid "$schedule_id" \
        '{cycle_id:$cid, schedule_id:$sid, state_present:false,
          eligible:false, capture_id:null, reset_at_epoch:null,
          sprint_plan_state:null, bridge_state:null,
          note:"no session-limit-state.json; nothing in flight"}')"
    exit 0
fi
if ! session_cap_state_file_is_secure "$STATE_FILE"; then
    portable_lock_release "$STATE_LOCK_DIR"
    echo "reader: capture state must be owner-controlled mode 0600" >&2
    exit 1
fi

# Read exactly one immutable snapshot while holding the same lock used by the
# capture writer and dispatcher. Atomic file replacement alone does not make a
# sequence of independent jq reads a coherent authorization snapshot.
state_json="$(<"$STATE_FILE")"
portable_lock_release "$STATE_LOCK_DIR"

# Sanity gate: a PRESENT-but-corrupt snapshot is a genuine failure -> abort
# cycle (cycle.error) rather than silently no-op on unreadable state.
if ! jq empty <<<"$state_json" 2>/dev/null; then
    echo "reader: session-limit-state.json present but not valid JSON: $STATE_FILE" >&2
    exit 1
fi

sp_state="$(jq -r '.active_run_state_snapshot.sprint_plan.state // ""' <<<"$state_json")"
br_state="$(jq -r '.active_run_state_snapshot.bridge.state // ""' <<<"$state_json")"
capture_id="$(jq -r '.capture_id // ""' <<<"$state_json")"
reset_epoch="$(jq -r '.reset_at_epoch // ""' <<<"$state_json")"
consumed_at="$(jq -r '.consumed_at // ""' <<<"$state_json")"
target_repo="$(jq -r '.review_target.repo // ""' <<<"$state_json")"
target_pr="$(jq -r '.review_target.pr_number // ""' <<<"$state_json")"
lifecycle="$(jq -r '.lifecycle // "pending"' <<<"$state_json")"
attempt_count="$(jq -r '.attempt_count // 0' <<<"$state_json")"
claimed_epoch="$(jq -r '.claimed_at_epoch // 0' <<<"$state_json")"
retry_after_epoch="$(jq -r '.retry_after_epoch // 0' <<<"$state_json")"
now_epoch="${LOA_SESSION_CAP_NOW_EPOCH:-$(date +%s)}"
max_age="${LOA_SESSION_CAP_MAX_RESET_AGE_SECONDS:-21600}"
max_attempts="${LOA_SESSION_CAP_MAX_ATTEMPTS:-3}"
claim_lease="${LOA_SESSION_CAP_CLAIM_LEASE_SECONDS:-3600}"

eligible="false"
reason="eligible"
if [[ -z "$capture_id" ]]; then
    reason="missing capture_id (legacy marker is not dispatchable)"
elif ! [[ "$target_repo" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ && "$target_pr" =~ ^[1-9][0-9]*$ ]]; then
    reason="exact review target is missing or invalid"
elif [[ -n "$consumed_at" ]]; then
    reason="capture already consumed"
elif ! [[ "$reset_epoch" =~ ^[0-9]+$ && "$now_epoch" =~ ^[0-9]+$ && "$max_age" =~ ^[0-9]+$ && "$attempt_count" =~ ^[0-9]+$ && "$max_attempts" =~ ^[0-9]+$ && "$claimed_epoch" =~ ^[0-9]+$ && "$retry_after_epoch" =~ ^[0-9]+$ && "$claim_lease" =~ ^[0-9]+$ ]] || (( claim_lease < 2100 )); then
    reason="capture reset/freshness fields are invalid"
elif (( now_epoch < reset_epoch )); then
    reason="capture reset time has not arrived"
elif (( now_epoch - reset_epoch > max_age )); then
    reason="capture is outside the post-reset eligibility window"
elif (( attempt_count >= max_attempts )); then
    reason="capture exhausted its bounded retry budget"
else
    case "$lifecycle" in
        pending) eligible="true" ;;
        retryable_failure)
            if (( now_epoch >= retry_after_epoch )); then eligible="true"; else reason="capture retry backoff is active"; fi
            ;;
        claimed)
            if (( now_epoch - claimed_epoch >= claim_lease )); then eligible="true"; reason="stale claim is retryable"; else reason="capture claim lease is active"; fi
            ;;
        completed|consumed|failed) reason="capture lifecycle is terminal (${lifecycle})" ;;
        *) reason="capture lifecycle is invalid (${lifecycle})" ;;
    esac
fi

emit "$(jq -nc --arg cid "$cycle_id" --arg sid "$schedule_id" \
    --argjson eligible "$eligible" --arg capture "$capture_id" \
    --arg reset "$reset_epoch" --arg reason "$reason" \
    --arg repo "$target_repo" --arg pr "$target_pr" \
    --arg sp "$sp_state" --arg br "$br_state" \
    '{cycle_id:$cid, schedule_id:$sid, state_present:true,
      eligible:$eligible, capture_id:($capture | if length == 0 then null else . end),
      review_target:{repo:($repo | if length == 0 then null else . end), pr_number:($pr | if test("^[1-9][0-9]*$") then tonumber else null end)},
      reset_at_epoch:($reset | if test("^[0-9]+$") then tonumber else null end),
      eligibility_reason:$reason, sprint_plan_state:$sp, bridge_state:$br}')"
