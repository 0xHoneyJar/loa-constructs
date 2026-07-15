#!/usr/bin/env bash
# session-cap-bb dispatcher.sh — phase 2 (dispatcher) for the post-reset
# bridgebuilder fan-out (bd-fanout-real-dispatch-9jv6 Tranche 1).
#
# On action:dispatch, fires the bridgebuilder-review headless entrypoint
# (resources/entry.sh — the same binary spiral-harness.sh already runs
# unattended) with the exact captured --repo <owner/repo> and --pr <number>.
# It never expands one interrupted review into a repository-wide sweep. On action:noop it
# short-circuits (exit 0, nothing was in flight). This is the only mutating
# phase. Before invocation it atomically claims the capture marker by its ID;
# success acknowledges it as completed while a nonzero exit records a bounded,
# retryable failure. Downstream nonzero exits remain typed delivery data so
# awaiter/logger still execute. The capture ID is the idempotency key.
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
DECIDER_FILE="${HANDOFF_DIR}/decider.json"

write_out() { session_cap_handoff_write "${HANDOFF_DIR}/dispatcher.json" "$1"; }

action="noop"
capture_id=""
repo=""
pr_number=""
if [[ -f "$DECIDER_FILE" ]] && jq empty "$DECIDER_FILE" 2>/dev/null; then
    action="$(jq -r '.action // "noop"' "$DECIDER_FILE")"
    capture_id="$(jq -r '.capture_id // ""' "$DECIDER_FILE")"
    repo="$(jq -r '.review_target.repo // ""' "$DECIDER_FILE")"
    pr_number="$(jq -r '.review_target.pr_number // ""' "$DECIDER_FILE")"
fi

if [[ "$action" != "dispatch" ]]; then
    write_out "$(jq -nc --arg cid "$cycle_id" --arg sid "$schedule_id" \
        '{cycle_id:$cid, schedule_id:$sid, dispatched:false,
          reason:"nothing was in flight (decider noop)"}')"
    exit 0
fi

BB_ENTRY="${LOA_SESSION_CAP_BB_ENTRY:-${_here}/../../../bridgebuilder-review/resources/entry.sh}"
if [[ ! -f "$BB_ENTRY" ]]; then
    echo "dispatcher: bridgebuilder entrypoint not found: $BB_ENTRY" >&2
    exit 1
fi

if [[ -z "$capture_id" ]]; then
    echo "dispatcher: dispatch decision has no capture_id; refusing unowned event" >&2
    exit 1
fi

# Capture and dispatch use the same state-file lock. The lock covers each
# read-check-write transition; the downstream review runs outside it under a
# lease-backed claim so capture writes are not blocked for the review duration.
_repo_root="$(cd "${_here}/../../../../.." && pwd -P)"
STATE_FILE="${LOA_SESSION_CAP_STATE_FILE:-${_repo_root}/.run/session-limit-state.json}"
# shellcheck source=/dev/null
. "${_repo_root}/.claude/scripts/compat-lib.sh"
# shellcheck source=/dev/null
. "${_repo_root}/.claude/scripts/lib/session-cap-state-lib.sh"
STATE_LOCK_DIR="${STATE_FILE}.lock"
if ! portable_lock_acquire "$STATE_LOCK_DIR"; then
    echo "dispatcher: timed out acquiring capture state lock" >&2
    exit 1
fi

if [[ ! -f "$STATE_FILE" ]]; then
    portable_lock_release "$STATE_LOCK_DIR"
    echo "dispatcher: capture marker disappeared before claim" >&2
    exit 1
fi
if ! session_cap_state_file_is_secure "$STATE_FILE"; then
    portable_lock_release "$STATE_LOCK_DIR"
    echo "dispatcher: capture state must be owner-controlled mode 0600" >&2
    exit 1
fi
if ! jq empty "$STATE_FILE" 2>/dev/null; then
    portable_lock_release "$STATE_LOCK_DIR"
    echo "dispatcher: capture marker became invalid before claim" >&2
    exit 1
fi
current_capture="$(jq -r '.capture_id // ""' "$STATE_FILE")"
state_repo="$(jq -r '.review_target.repo // ""' "$STATE_FILE")"
state_pr="$(jq -r '.review_target.pr_number // ""' "$STATE_FILE")"
lifecycle="$(jq -r '.lifecycle // "pending"' "$STATE_FILE")"
attempt_count="$(jq -r '.attempt_count // 0' "$STATE_FILE")"
claimed_epoch="$(jq -r '.claimed_at_epoch // 0' "$STATE_FILE")"
retry_after_epoch="$(jq -r '.retry_after_epoch // 0' "$STATE_FILE")"
reset_epoch="$(jq -r '.reset_at_epoch // ""' "$STATE_FILE")"
sp_state="$(jq -r '.active_run_state_snapshot.sprint_plan.state // ""' "$STATE_FILE")"
br_state="$(jq -r '.active_run_state_snapshot.bridge.state // ""' "$STATE_FILE")"
now_epoch="${LOA_SESSION_CAP_NOW_EPOCH:-$(date +%s)}"
max_age="${LOA_SESSION_CAP_MAX_RESET_AGE_SECONDS:-21600}"
max_attempts="${LOA_SESSION_CAP_MAX_ATTEMPTS:-3}"
claim_lease="${LOA_SESSION_CAP_CLAIM_LEASE_SECONDS:-3600}"
if ! [[ "$claim_lease" =~ ^[0-9]+$ ]] || (( claim_lease < 2100 )); then
    portable_lock_release "$STATE_LOCK_DIR"
    echo "dispatcher: claim lease must be at least 2100s (review timeout plus safety margin)" >&2
    exit 1
fi
interrupted="false"
case "$sp_state" in RUNNING|HALTED) interrupted="true" ;; esac
case "$br_state" in RUNNING|ITERATING|FINALIZING|HALTED) interrupted="true" ;; esac
claimable="false"
fresh="false"
if [[ "$reset_epoch" =~ ^[0-9]+$ && "$now_epoch" =~ ^[0-9]+$ && "$max_age" =~ ^[0-9]+$ ]] \
    && (( now_epoch >= reset_epoch && now_epoch - reset_epoch <= max_age )); then
    fresh="true"
fi
if [[ "$attempt_count" =~ ^[0-9]+$ && "$max_attempts" =~ ^[0-9]+$ && "$claimed_epoch" =~ ^[0-9]+$ && "$retry_after_epoch" =~ ^[0-9]+$ && "$claim_lease" =~ ^[0-9]+$ ]] && (( attempt_count < max_attempts )); then
    case "$lifecycle" in
        pending) claimable="true" ;;
        retryable_failure) (( now_epoch >= retry_after_epoch )) && claimable="true" ;;
        claimed) (( now_epoch - claimed_epoch >= claim_lease )) && claimable="true" ;;
    esac
fi
if [[ ! "$state_repo" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ || ! "$state_pr" =~ ^[1-9][0-9]*$ \
    || "$current_capture" != "$capture_id" || "$state_repo" != "$repo" || "$state_pr" != "$pr_number" \
    || "$fresh" != "true" || "$interrupted" != "true" || "$claimable" != "true" ]]; then
    portable_lock_release "$STATE_LOCK_DIR"
    write_out "$(jq -nc --arg cid "$cycle_id" --arg sid "$schedule_id" --arg capture "$capture_id" \
        '{cycle_id:$cid, schedule_id:$sid, capture_id:$capture, dispatched:false,
          reason:"capture target changed, is terminal, or has an active claim"}')"
    exit 0
fi

# The handoff is only a request. The durable snapshot observed under the state
# lock is the sole authority for the exact downstream target.
capture_id="$current_capture"
repo="$state_repo"
pr_number="$state_pr"

claimed_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
claim_id="${cycle_id}:$$:${now_epoch}"
state_tmp="${STATE_FILE}.tmp.$$"
if ! (umask 077 && jq --arg capture "$capture_id" --arg ts "$claimed_at" --argjson epoch "$now_epoch" \
    --arg cycle "$cycle_id" --arg claim "$claim_id" \
    'if .capture_id == $capture then
       .lifecycle = "claimed" |
       .attempt_count = ((.attempt_count // 0) + 1) |
       .claimed_at = $ts |
       .claimed_at_epoch = $epoch |
       .claimed_by = {contract:"session-cap-bb", cycle_id:$cycle, claim_id:$claim} |
       .retry_after_epoch = null |
       .last_error = null
     else error("capture is not claimable") end' \
    "$STATE_FILE" > "$state_tmp") \
    || ! chmod 600 "$state_tmp" \
    || ! session_cap_state_file_is_secure "$state_tmp" \
    || ! mv -f "$state_tmp" "$STATE_FILE" \
    || ! session_cap_state_file_is_secure "$STATE_FILE"; then
    rm -f "$state_tmp"
    portable_lock_release "$STATE_LOCK_DIR"
    echo "dispatcher: failed to atomically claim capture $capture_id" >&2
    exit 1
fi
portable_lock_release "$STATE_LOCK_DIR"

# Fire BB for the exact captured target only.
rc=0
if [[ -x "$BB_ENTRY" ]]; then
    BRIDGEBUILDER_IDEMPOTENCY_KEY="$capture_id" "$BB_ENTRY" --repo "$repo" --pr "$pr_number" || rc=$?
else
    BRIDGEBUILDER_IDEMPOTENCY_KEY="$capture_id" bash "$BB_ENTRY" --repo "$repo" --pr "$pr_number" || rc=$?
fi

# Acknowledge only after the downstream command returns. If a newer capture was
# written in the meantime, leave it untouched. A crashed dispatcher leaves a
# claimed marker whose lease expires into a safe retry with the same key.
delivery_state="state_changed"
if portable_lock_acquire "$STATE_LOCK_DIR"; then
    if [[ -f "$STATE_FILE" ]] && ! session_cap_state_file_is_secure "$STATE_FILE"; then
        portable_lock_release "$STATE_LOCK_DIR"
        echo "dispatcher: capture state must remain owner-controlled mode 0600" >&2
        exit 1
    fi
    if [[ -f "$STATE_FILE" ]] && jq empty "$STATE_FILE" 2>/dev/null \
        && [[ "$(jq -r '.capture_id // ""' "$STATE_FILE")" == "$capture_id" ]] \
        && [[ "$(jq -r '.claimed_by.claim_id // ""' "$STATE_FILE")" == "$claim_id" ]]; then
        finished_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
        finished_epoch="${LOA_SESSION_CAP_NOW_EPOCH:-$(date +%s)}"
        attempts="$(jq -r '.attempt_count // 1' "$STATE_FILE")"
        retry_delay="${LOA_SESSION_CAP_RETRY_DELAY_SECONDS:-300}"
        [[ "$retry_delay" =~ ^[0-9]+$ ]] || retry_delay=300
        if (( rc == 0 )); then
            update_filter='.lifecycle="completed" | .consumed_at=$ts | .consumed_by={contract:"session-cap-bb", cycle_id:$cycle} | .claimed_at=null | .claimed_at_epoch=null | .claimed_by=null | .last_error=null'
            delivery_state="completed"
        elif [[ "$attempts" =~ ^[0-9]+$ ]] && (( attempts >= max_attempts )); then
            update_filter='.lifecycle="failed" | .claimed_at=null | .claimed_at_epoch=null | .claimed_by=null | .last_error={exit_code:$rc, at:$ts} | .retry_after_epoch=null'
            delivery_state="failed"
        else
            update_filter='.lifecycle="retryable_failure" | .claimed_at=null | .claimed_at_epoch=null | .claimed_by=null | .last_error={exit_code:$rc, at:$ts} | .retry_after_epoch=($epoch + $delay)'
            delivery_state="retryable_failure"
        fi
        state_tmp="${STATE_FILE}.tmp.$$"
        if ! (umask 077 && jq --arg ts "$finished_at" --arg cycle "$cycle_id" --argjson rc "$rc" \
            --argjson epoch "$finished_epoch" --argjson delay "$retry_delay" "$update_filter" \
            "$STATE_FILE" > "$state_tmp") \
            || ! chmod 600 "$state_tmp" \
            || ! session_cap_state_file_is_secure "$state_tmp" \
            || ! mv -f "$state_tmp" "$STATE_FILE" \
            || ! session_cap_state_file_is_secure "$STATE_FILE"; then
            rm -f "$state_tmp"
            portable_lock_release "$STATE_LOCK_DIR"
            echo "dispatcher: failed to record delivery outcome" >&2
            exit 1
        fi
    fi
    portable_lock_release "$STATE_LOCK_DIR"
else
    echo "dispatcher: timed out recording delivery outcome" >&2
    exit 1
fi

write_out "$(jq -nc --arg cid "$cycle_id" --arg sid "$schedule_id" \
    --arg capture "$capture_id" --arg repo "$repo" --argjson pr "$pr_number" --arg state "$delivery_state" --argjson ec "$rc" \
    '{cycle_id:$cid, schedule_id:$sid, capture_id:$capture, dispatched:true, repo:$repo,
      pr_number:$pr, delivery_state:$state, bb_exit_code:$ec}')"
# A downstream review failure is a typed delivery outcome. Returning success
# keeps the L3 cycle alive so awaiter/logger record it; orchestration failures
# above still return nonzero.
exit 0
