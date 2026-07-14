#!/usr/bin/env bash
# session-cap-bb decider.sh — phase 1 (decider) for the post-reset bridgebuilder
# fan-out (bd-fanout-real-dispatch-9jv6 Tranche 1).
#
# FAIL-CLOSED: emits action:dispatch ONLY when the captured snapshot shows a
# sprint_plan state in {RUNNING, HALTED}, or bridge state in
# {RUNNING, ITERATING, FINALIZING, HALTED} (i.e. something was demonstrably
# interrupted at cap time); every other case — snapshot absent, unreadable, or
# in a terminal/idle state — is action:noop. Side-effect-free apart from writing
# its own handoff file.
#
# Args: $1 cycle_id  $2 schedule_id  $3 phase_index  $4 prior_phases_json
set -euo pipefail

cycle_id="${1:?cycle_id required}"
schedule_id="${2:?schedule_id required}"

_sanitize() { printf '%s' "$1" | tr -c 'A-Za-z0-9._-' '_'; }
HANDOFF_DIR="${TMPDIR:-/tmp}/loa-session-cap-bb.$(_sanitize "$cycle_id")"
mkdir -p "$HANDOFF_DIR"
READER_FILE="${HANDOFF_DIR}/reader.json"

sp_state=""
br_state=""
eligible="false"
capture_id=""
target_repo=""
target_pr=""
if [[ -f "$READER_FILE" ]] && jq empty "$READER_FILE" 2>/dev/null; then
    sp_state="$(jq -r '.sprint_plan_state // ""' "$READER_FILE")"
    br_state="$(jq -r '.bridge_state // ""' "$READER_FILE")"
    eligible="$(jq -r '.eligible // false' "$READER_FILE")"
    capture_id="$(jq -r '.capture_id // ""' "$READER_FILE")"
    target_repo="$(jq -r '.review_target.repo // ""' "$READER_FILE")"
    target_pr="$(jq -r '.review_target.pr_number // ""' "$READER_FILE")"
fi

action="noop"
if [[ "$eligible" == "true" && "$target_repo" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ && "$target_pr" =~ ^[1-9][0-9]*$ ]]; then
    case "$sp_state" in RUNNING|HALTED) action="dispatch" ;; esac
    case "$br_state" in RUNNING|ITERATING|FINALIZING|HALTED) action="dispatch" ;; esac
fi

jq -nc --arg cid "$cycle_id" --arg sid "$schedule_id" --arg act "$action" \
    --argjson eligible "$eligible" --arg capture "$capture_id" \
    --arg repo "$target_repo" --arg pr "$target_pr" \
    --arg sp "$sp_state" --arg br "$br_state" \
    '{cycle_id:$cid, schedule_id:$sid, action:$act,
      eligible:$eligible, capture_id:($capture | if length == 0 then null else . end),
      review_target:{repo:($repo | if length == 0 then null else . end), pr_number:($pr | if test("^[1-9][0-9]*$") then tonumber else null end)},
      sprint_plan_state:$sp, bridge_state:$br}' \
    | tee "${HANDOFF_DIR}/decider.json"
