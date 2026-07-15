#!/usr/bin/env bash
# Re-enter one session-cap Bridgebuilder schedule only when durable retry state
# is due. Pending events remain owned by their reset-window cron invocation.
set -euo pipefail

SCHEDULE_YAML="${1:?schedule yaml required}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd -P)"
STATE_FILE="${LOA_SESSION_CAP_STATE_FILE:-${REPO_ROOT}/.run/session-limit-state.json}"
CYCLE_LIB="${LOA_SESSION_CAP_CYCLE_LIB:-${REPO_ROOT}/.claude/scripts/lib/scheduled-cycle-lib.sh}"
# shellcheck source=/dev/null
. "${REPO_ROOT}/.claude/scripts/compat-lib.sh"
# shellcheck source=/dev/null
. "${REPO_ROOT}/.claude/scripts/lib/session-cap-state-lib.sh"
STATE_LOCK_DIR="${STATE_FILE}.lock"

if ! portable_lock_acquire "$STATE_LOCK_DIR"; then
    echo "session-cap-reconcile: timed out acquiring capture state lock" >&2
    exit 1
fi
if [[ ! -f "$STATE_FILE" ]]; then
    portable_lock_release "$STATE_LOCK_DIR"
    exit 0
fi
if ! session_cap_state_file_is_secure "$STATE_FILE"; then
    portable_lock_release "$STATE_LOCK_DIR"
    echo "session-cap-reconcile: capture state must be owner-controlled mode 0600" >&2
    exit 1
fi
state_json="$(<"$STATE_FILE")"
portable_lock_release "$STATE_LOCK_DIR"
jq empty <<<"$state_json" 2>/dev/null || exit 0

now_epoch="${LOA_SESSION_CAP_NOW_EPOCH:-$(date +%s)}"
reset_epoch="$(jq -r '.reset_at_epoch // 0' <<<"$state_json")"
lifecycle="$(jq -r '.lifecycle // ""' <<<"$state_json")"
attempt_count="$(jq -r '.attempt_count // 0' <<<"$state_json")"
retry_after="$(jq -r '.retry_after_epoch // 0' <<<"$state_json")"
claimed_epoch="$(jq -r '.claimed_at_epoch // 0' <<<"$state_json")"
max_age="${LOA_SESSION_CAP_MAX_RESET_AGE_SECONDS:-21600}"
max_attempts="${LOA_SESSION_CAP_MAX_ATTEMPTS:-3}"
claim_lease="${LOA_SESSION_CAP_CLAIM_LEASE_SECONDS:-3600}"

for value in "$now_epoch" "$reset_epoch" "$attempt_count" "$retry_after" "$claimed_epoch" "$max_age" "$max_attempts" "$claim_lease"; do
    [[ "$value" =~ ^[0-9]+$ ]] || exit 0
done
(( claim_lease >= 2100 )) || exit 0
(( now_epoch >= reset_epoch && now_epoch - reset_epoch <= max_age && attempt_count < max_attempts )) || exit 0

due="false"
case "$lifecycle" in
    retryable_failure) (( now_epoch >= retry_after )) && due="true" ;;
    claimed) (( now_epoch - claimed_epoch >= claim_lease )) && due="true" ;;
esac
[[ "$due" == "true" ]] || exit 0

exec "$CYCLE_LIB" invoke "$SCHEDULE_YAML"
