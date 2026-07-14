#!/usr/bin/env bash
# session-cap-bb dispatcher.sh — phase 2 (dispatcher) for the post-reset
# bridgebuilder fan-out (bd-fanout-real-dispatch-9jv6 Tranche 1).
#
# On action:dispatch, fires the bridgebuilder-review headless entrypoint
# (resources/entry.sh — the same binary spiral-harness.sh already runs
# unattended) with --repo <owner/repo> and NO --pr, so BB self-discovers open
# PRs and dedups on its own incremental per-PR diff hashing. On action:noop it
# short-circuits (exit 0, nothing was in flight). This is the only mutating
# phase. Before invocation it atomically consumes the capture marker by its
# capture_id. A repeated or concurrent cycle therefore no-ops before BB; the
# capture_id is also passed as the downstream idempotency key.
#
# Args: $1 cycle_id  $2 schedule_id  $3 phase_index  $4 prior_phases_json
set -euo pipefail

cycle_id="${1:?cycle_id required}"
schedule_id="${2:?schedule_id required}"

_here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
_sanitize() { printf '%s' "$1" | tr -c 'A-Za-z0-9._-' '_'; }
HANDOFF_DIR="${TMPDIR:-/tmp}/loa-session-cap-bb.$(_sanitize "$cycle_id")"
mkdir -p "$HANDOFF_DIR"
DECIDER_FILE="${HANDOFF_DIR}/decider.json"

write_out() { printf '%s' "$1" | tee "${HANDOFF_DIR}/dispatcher.json"; }

action="noop"
capture_id=""
if [[ -f "$DECIDER_FILE" ]] && jq empty "$DECIDER_FILE" 2>/dev/null; then
    action="$(jq -r '.action // "noop"' "$DECIDER_FILE")"
    capture_id="$(jq -r '.capture_id // ""' "$DECIDER_FILE")"
fi

if [[ "$action" != "dispatch" ]]; then
    write_out "$(jq -nc --arg cid "$cycle_id" --arg sid "$schedule_id" \
        '{cycle_id:$cid, schedule_id:$sid, dispatched:false,
          reason:"nothing was in flight (decider noop)"}')"
    exit 0
fi

# Resolve owner/repo: explicit override wins, else derive from the git origin.
repo="${LOA_SESSION_CAP_BB_REPO:-}"
if [[ -z "$repo" ]]; then
    url="$(git remote get-url origin 2>/dev/null || true)"
    repo="$(printf '%s' "$url" | sed -E 's#\.git$##; s#^.*[:/]([^/]+/[^/]+)$#\1#')"
fi
if [[ -z "$repo" ]]; then
    echo "dispatcher: could not resolve owner/repo (set LOA_SESSION_CAP_BB_REPO or a git origin)" >&2
    exit 1
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

# Atomic one-shot claim. mkdir is the portable compare-and-set primitive here;
# the capture-specific lock means a different future capture is never blocked by
# an orphan from an older event. The marker is consumed before BB starts so a
# crash cannot turn one cap event into repeated unattended reviews.
_repo_root="$(cd "${_here}/../../../../.." && pwd -P)"
STATE_FILE="${LOA_SESSION_CAP_STATE_FILE:-${_repo_root}/.run/session-limit-state.json}"
safe_capture="$(_sanitize "$capture_id")"
CLAIM_DIR="${STATE_FILE}.${safe_capture}.claim"
if ! mkdir "$CLAIM_DIR" 2>/dev/null; then
    write_out "$(jq -nc --arg cid "$cycle_id" --arg sid "$schedule_id" --arg capture "$capture_id" \
        '{cycle_id:$cid, schedule_id:$sid, capture_id:$capture, dispatched:false,
          reason:"capture claim is already held"}')"
    exit 0
fi
cleanup_claim() { rmdir "$CLAIM_DIR" 2>/dev/null || true; }
trap cleanup_claim EXIT

if [[ ! -f "$STATE_FILE" ]] || ! jq empty "$STATE_FILE" 2>/dev/null; then
    echo "dispatcher: capture marker disappeared or became invalid before claim" >&2
    exit 1
fi
current_capture="$(jq -r '.capture_id // ""' "$STATE_FILE")"
consumed_at="$(jq -r '.consumed_at // ""' "$STATE_FILE")"
if [[ "$current_capture" != "$capture_id" || -n "$consumed_at" ]]; then
    write_out "$(jq -nc --arg cid "$cycle_id" --arg sid "$schedule_id" --arg capture "$capture_id" \
        '{cycle_id:$cid, schedule_id:$sid, capture_id:$capture, dispatched:false,
          reason:"capture changed or was already consumed"}')"
    exit 0
fi

claimed_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
state_tmp="${STATE_FILE}.tmp.$$"
if ! jq --arg capture "$capture_id" --arg ts "$claimed_at" --arg cycle "$cycle_id" \
    'if .capture_id == $capture and (.consumed_at == null or .consumed_at == "") then
       .lifecycle = "consumed" |
       .consumed_at = $ts |
       .consumed_by = {contract:"session-cap-bb", cycle_id:$cycle}
     else error("capture is not claimable") end' \
    "$STATE_FILE" > "$state_tmp" || ! mv -f "$state_tmp" "$STATE_FILE"; then
    rm -f "$state_tmp"
    echo "dispatcher: failed to atomically consume capture $capture_id" >&2
    exit 1
fi

# Fire BB with NO --pr: it self-discovers open PRs and dedups internally.
rc=0
if [[ -x "$BB_ENTRY" ]]; then
    BRIDGEBUILDER_IDEMPOTENCY_KEY="$capture_id" "$BB_ENTRY" --repo "$repo" || rc=$?
else
    BRIDGEBUILDER_IDEMPOTENCY_KEY="$capture_id" bash "$BB_ENTRY" --repo "$repo" || rc=$?
fi

write_out "$(jq -nc --arg cid "$cycle_id" --arg sid "$schedule_id" \
    --arg capture "$capture_id" --arg repo "$repo" --argjson ec "$rc" \
    '{cycle_id:$cid, schedule_id:$sid, capture_id:$capture, dispatched:true, repo:$repo,
      bb_exit_code:$ec}')"
exit "$rc"
