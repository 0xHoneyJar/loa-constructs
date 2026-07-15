#!/usr/bin/env bash
# =============================================================================
# session-limit-capture.sh — snapshot a session/usage cap + live run state
# =============================================================================
# Part of: cycle-117 session-economy (bd-c117-a-session-cap-x04j, issue #1177 A).
#
# Usage: session-limit-capture.sh --raw '<full error text>'
#
# Given a Claude session-limit / usage-cap error string, parse its reset time
# and write .run/session-limit-state.json: hit_at (now, UTC), reset_at (ISO +
# offset), reset_at_epoch (plain unix epoch, for jq-side comparison), and an
# EMBEDDED scalar snapshot of the live run/bridge/simstim state (never bare path
# references — the snapshot must survive the referenced files being mutated or
# deleted by a later run before the resume reminder fires).
#
# The post-session-limit-reminder.sh UserPromptSubmit hook later detects this
# marker and, once now >= reset_at_epoch, injects a one-shot resume reminder.
#
# Exit 1 (with a message on stderr) when --raw is not a recognized cap string
# or its reset time cannot be parsed (e.g. GNU-date-only ceiling on macOS).
# =============================================================================

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
. "$SCRIPT_DIR/lib/session-limit-lib.sh"
# shellcheck source=/dev/null
. "$SCRIPT_DIR/compat-lib.sh"
# shellcheck source=/dev/null
. "$SCRIPT_DIR/lib/session-cap-state-lib.sh"

RAW=""
while [[ $# -gt 0 ]]; do
    case "$1" in
        --raw) RAW="${2:-}"; shift 2 ;;
        --raw=*) RAW="${1#--raw=}"; shift ;;
        *) shift ;;
    esac
done

if [[ -z "$RAW" ]]; then
    echo "session-limit-capture: --raw '<error text>' is required" >&2
    exit 1
fi

if ! session_limit_matches "$RAW"; then
    echo "session-limit-capture: input is not a recognized session-limit string; nothing captured" >&2
    exit 1
fi

NOW_EPOCH="${LOA_SESSION_CAP_NOW_EPOCH:-$(date +%s)}"
if ! [[ "$NOW_EPOCH" =~ ^[0-9]+$ ]]; then
    echo "session-limit-capture: current epoch is not numeric" >&2
    exit 1
fi
RESET_ISO="$(session_limit_parse_reset "$RAW" "$NOW_EPOCH")" || {
    echo "session-limit-capture: could not parse reset time (see session-limit-lib.sh)" >&2
    exit 1
}
RESET_EPOCH="$(session_limit_parse_reset_epoch "$RAW" "$NOW_EPOCH")" || {
    echo "session-limit-capture: could not parse reset epoch" >&2
    exit 1
}
if [[ ! "$RESET_EPOCH" =~ ^[0-9]+$ ]]; then
    echo "session-limit-capture: parsed reset epoch is not numeric" >&2
    exit 1
fi

HIT_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

PROJECT_ROOT="${PROJECT_ROOT:-$(cd "$SCRIPT_DIR/../.." && pwd -P)}"
if ! PROJECT_ROOT="$(cd "$PROJECT_ROOT" 2>/dev/null && pwd -P)"; then
    echo "session-limit-capture: PROJECT_ROOT does not resolve to a directory" >&2
    exit 1
fi
RUN_DIR="$PROJECT_ROOT/.run"
if ! session_cap_prepare_state_dir "$RUN_DIR"; then
    echo "session-limit-capture: state directory must be owner-controlled mode 0700" >&2
    exit 1
fi
STATE_FILE="$RUN_DIR/session-limit-state.json"

SPRINT_FILE="$RUN_DIR/sprint-plan-state.json"
BRIDGE_FILE="$RUN_DIR/bridge-state.json"
SIMSTIM_FILE="$RUN_DIR/simstim-state.json"

# Resume scope is an authorization input, not something the dispatcher may
# rediscover broadly later. Explicit overrides win; otherwise resolve exactly
# one open PR for the current branch. Failure to resolve is recorded as null and
# the downstream reader fails closed.
TARGET_REPO="${LOA_SESSION_CAP_BB_REPO:-}"
TARGET_PR="${LOA_SESSION_CAP_BB_PR:-}"
if [[ -z "$TARGET_REPO" ]]; then
    origin_url="$(git -C "$PROJECT_ROOT" remote get-url origin 2>/dev/null || true)"
    TARGET_REPO="$(printf '%s' "$origin_url" | sed -E 's#\.git$##; s#^.*[:/]([^/]+/[^/]+)$#\1#')"
fi
if [[ -z "$TARGET_PR" && "$TARGET_REPO" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]] \
    && command -v gh >/dev/null 2>&1; then
    current_branch="$(git -C "$PROJECT_ROOT" branch --show-current 2>/dev/null || true)"
    if [[ -n "$current_branch" ]]; then
        pr_candidates="$(gh pr list --repo "$TARGET_REPO" --head "$current_branch" --state open \
            --json number --jq '.[].number' 2>/dev/null || true)"
        [[ "$pr_candidates" =~ ^[0-9]+$ ]] && TARGET_PR="$pr_candidates"
    fi
fi
if ! [[ "$TARGET_REPO" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]]; then TARGET_REPO=""; fi
if ! [[ "$TARGET_PR" =~ ^[1-9][0-9]*$ ]]; then TARGET_PR=""; fi
TARGET_PR_JSON="${TARGET_PR:-null}"

# Extract a scalar from a state file, falling back to a default when the file
# is absent, jq is missing, or the field is null. Embeds the VALUE, not a path.
_snap() {
    local file="$1" query="$2" default="$3" val
    if [[ -f "$file" ]]; then
        val="$(jq -r "$query // \"$default\"" "$file" 2>/dev/null)" || val="$default"
        [[ -n "$val" ]] || val="$default"
        printf '%s' "$val"
    else
        printf '%s' "$default"
    fi
}

sp_state="$(_snap "$SPRINT_FILE" '.state' 'unknown')"
sp_current="$(_snap "$SPRINT_FILE" '.sprints.current' 'null')"
sp_cycle="$(_snap "$SPRINT_FILE" '.cycle' 'null')"
sp_plan="$(_snap "$SPRINT_FILE" '.plan_id' 'null')"
br_state="$(_snap "$BRIDGE_FILE" '.state' 'unknown')"
br_iter="$(_snap "$BRIDGE_FILE" '.current_iteration' '0')"
ss_state="$(_snap "$SIMSTIM_FILE" '.state' 'unknown')"
ss_phase="$(_snap "$SIMSTIM_FILE" '.phase' 'unknown')"

# Truncate the raw string for provenance (bounded — the error text is short).
RAW_TRUNC="${RAW:0:400}"
# The delivery key fingerprints the complete semantic operation. A per-event
# nonce keeps two otherwise identical captures distinct, while every retry of
# this durable capture continues to reuse the resulting capture_id.
EVENT_NONCE="${LOA_SESSION_CAP_EVENT_NONCE:-}"
if [[ -z "$EVENT_NONCE" ]]; then
    if command -v uuidgen >/dev/null 2>&1; then
        EVENT_NONCE="$(uuidgen | tr '[:upper:]' '[:lower:]')"
    else
        EVENT_NONCE="$(printf '%s' "${NOW_EPOCH}:$$:${RANDOM}:${RANDOM}" | sha256_portable | awk '{print $1}')"
    fi
fi
EVENT_NONCE="${EVENT_NONCE:0:128}"
IDENTITY_JSON="$(jq -cnS \
    --argjson identity_version 1 \
    --arg event_nonce "$EVENT_NONCE" \
    --argjson captured_at_epoch "$NOW_EPOCH" \
    --argjson reset_at_epoch "$RESET_EPOCH" \
    --arg raw "$RAW_TRUNC" \
    --arg target_repo "$TARGET_REPO" \
    --argjson target_pr "$TARGET_PR_JSON" \
    --arg sp_state "$sp_state" --arg sp_current "$sp_current" --arg sp_cycle "$sp_cycle" --arg sp_plan "$sp_plan" \
    --arg br_state "$br_state" --arg br_iter "$br_iter" \
    --arg ss_state "$ss_state" --arg ss_phase "$ss_phase" \
    '{identity_version:$identity_version, event_nonce:$event_nonce,
      captured_at_epoch:$captured_at_epoch, reset_at_epoch:$reset_at_epoch, raw:$raw,
      review_target:{repo:($target_repo | if length == 0 then null else . end), pr_number:$target_pr},
      active_run_state_snapshot:{
        sprint_plan:{state:$sp_state,current:$sp_current,cycle:$sp_cycle,plan_id:$sp_plan},
        bridge:{state:$br_state,current_iteration:$br_iter},
        simstim:{state:$ss_state,phase:$ss_phase}
      }}')" || {
    echo "session-limit-capture: failed to build canonical identity" >&2
    exit 1
}
CAPTURE_HASH="$(printf '%s' "$IDENTITY_JSON" | sha256_portable | awk '{print $1}')"
CAPTURE_ID="sha256:${CAPTURE_HASH}"

SNAP="$(jq -n \
    --arg capture_id "$CAPTURE_ID" \
    --arg event_nonce "$EVENT_NONCE" \
    --arg hit_at "$HIT_AT" \
    --arg reset_at "$RESET_ISO" \
    --argjson reset_at_epoch "$RESET_EPOCH" \
    --arg raw "$RAW_TRUNC" \
    --arg target_repo "$TARGET_REPO" \
    --argjson target_pr "$TARGET_PR_JSON" \
    --arg sp_state "$sp_state" \
    --arg sp_current "$sp_current" \
    --arg sp_cycle "$sp_cycle" \
    --arg sp_plan "$sp_plan" \
    --arg br_state "$br_state" \
    --arg br_iter "$br_iter" \
    --arg ss_state "$ss_state" \
    --arg ss_phase "$ss_phase" \
    '{
        capture_id: $capture_id,
        identity_version: 1,
        event_nonce: $event_nonce,
        lifecycle: "pending",
        attempt_count: 0,
        claimed_at: null,
        claimed_at_epoch: null,
        claimed_by: null,
        consumed_at: null,
        consumed_by: null,
        retry_after_epoch: null,
        last_error: null,
        hit_at: $hit_at,
        reset_at: $reset_at,
        reset_at_epoch: $reset_at_epoch,
        raw: $raw,
        review_target: {
            repo: ($target_repo | if length == 0 then null else . end),
            pr_number: $target_pr
        },
        active_run_state_snapshot: {
            sprint_plan: { state: $sp_state, current: $sp_current, cycle: $sp_cycle, plan_id: $sp_plan },
            bridge: { state: $br_state, current_iteration: $br_iter },
            simstim: { state: $ss_state, phase: $ss_phase }
        }
    }' 2>/dev/null)" || {
    echo "session-limit-capture: failed to build snapshot JSON (jq unavailable?)" >&2
    exit 1
}

# Atomic write: sibling .tmp in the SAME directory (guaranteed same filesystem),
# then mv. Never mktemp-in-/tmp + mv (that is copy+unlink across EXDEV, not
# atomic). Capture and dispatch share one lock domain so the read-check-write
# transaction cannot overwrite a newer event.
STATE_LOCK_DIR="${STATE_FILE}.lock"
if ! portable_lock_acquire "$STATE_LOCK_DIR"; then
    echo "session-limit-capture: timed out acquiring state lock" >&2
    exit 1
fi
TMP="${STATE_FILE}.tmp.$$"
if (umask 077 && printf '%s\n' "$SNAP" > "$TMP") 2>/dev/null \
    && chmod 600 "$TMP" \
    && session_cap_state_file_is_secure "$TMP" \
    && mv -f "$TMP" "$STATE_FILE" 2>/dev/null \
    && session_cap_state_file_is_secure "$STATE_FILE"; then
    portable_lock_release "$STATE_LOCK_DIR"
    echo "session-limit-capture: wrote $STATE_FILE (reset_at=$RESET_ISO)" >&2
    exit 0
else
    rm -f "$TMP" 2>/dev/null || true
    portable_lock_release "$STATE_LOCK_DIR"
    echo "session-limit-capture: failed to write $STATE_FILE" >&2
    exit 1
fi
