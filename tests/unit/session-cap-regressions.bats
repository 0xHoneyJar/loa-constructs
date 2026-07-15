#!/usr/bin/env bats

setup() {
    umask 077
    REPO_ROOT="$(cd "$BATS_TEST_DIRNAME/../.." && pwd)"
    # shellcheck source=/dev/null
    source "$REPO_ROOT/.claude/scripts/lib/session-cap-state-lib.sh"
    FANOUT="$REPO_ROOT/.claude/scripts/session-cap-fanout.sh"
    RECONCILER="$REPO_ROOT/.claude/scripts/session-cap-reconcile.sh"
    L3_LIB="$REPO_ROOT/.claude/scripts/lib/scheduled-cycle-lib.sh"
    READER="$REPO_ROOT/.claude/skills/scheduled-cycle-template/contracts/session-cap-bb/reader.sh"
    DECIDER="$REPO_ROOT/.claude/skills/scheduled-cycle-template/contracts/session-cap-bb/decider.sh"
    DISPATCHER="$REPO_ROOT/.claude/skills/scheduled-cycle-template/contracts/session-cap-bb/dispatcher.sh"
    AWAITER="$REPO_ROOT/.claude/skills/scheduled-cycle-template/contracts/session-cap-bb/awaiter.sh"
    LOGGER="$REPO_ROOT/.claude/skills/scheduled-cycle-template/contracts/session-cap-bb/logger.sh"
}

teardown() {
    local pid="${session_cap_cleanup_pid:-}"
    [[ -n "$pid" ]] || return 0

    # Release the fixture first so both the dispatcher and its child have a
    # normal exit path. Bound that grace period, then terminate and reap the
    # dispatcher so an assertion failure can never strand the Bats shard.
    [[ -z "${session_cap_cleanup_release:-}" ]] || touch "$session_cap_cleanup_release" 2>/dev/null || true
    for _ in $(seq 1 100); do
        kill -0 "$pid" 2>/dev/null || break
        sleep 0.02
    done
    kill "$pid" 2>/dev/null || true
    wait "$pid" 2>/dev/null || true
}

file_mode() {
    if [[ "$(uname -s)" == "Darwin" ]]; then
        stat -f '%Lp' "$1"
    else
        stat -c '%a' "$1"
    fi
}

@test "session-limit reset parsing is portable for an injected UTC instant" {
    run bash -c 'source "$1"; session_limit_parse_reset "$2" "$3"' -- \
        "$REPO_ROOT/.claude/scripts/lib/session-limit-lib.sh" \
        "You've hit your session limit; resets 02:00 (UTC)" 1767225600
    [ "$status" -eq 0 ]
    [ "$output" = "2026-01-01T02:00:00+00:00" ]

    run bash -c 'source "$1"; session_limit_parse_reset_epoch "$2" "$3"' -- \
        "$REPO_ROOT/.claude/scripts/lib/session-limit-lib.sh" \
        "You've hit your session limit; resets 02:00 (UTC)" 1767225600
    [ "$status" -eq 0 ]
    [ "$output" = "1767232800" ]
}

@test "final-time normalization rechecks collisions after nudging" {
    run bash -c 'source "$1"; _available_final_time 23 59 1 "|0:1|"' -- "$FANOUT"
    [ "$status" -eq 0 ]
    [ "$output" = "0 2" ]
}

@test "final-time uniqueness spans every reset window in one timezone" {
    run bash -c 'source "$1"; _available_final_time 10 29 1 "|UTC|10:31|" UTC' -- "$FANOUT"
    [ "$status" -eq 0 ]
    [ "$output" = "10 32" ]

    # The same wall-clock digits in another timezone remain a distinct slot.
    run bash -c 'source "$1"; _available_final_time 10 29 1 "|UTC|10:31|" America/New_York' -- "$FANOUT"
    [ "$status" -eq 0 ]
    [ "$output" = "10 31" ]
}

@test "fanout jitter carries into the next hour and day" {
    run bash -c 'source "$1"; _final_time 23 58 7' -- "$FANOUT"
    [ "$status" -eq 0 ]
    [ "$output" = "0 5" ]

    run bash -c 'source "$1"; _final_time 23 59 1' -- "$FANOUT"
    [ "$status" -eq 0 ]
    [ "$output" = "0 1" ]
}

@test "capture defaults to its repository root instead of caller cwd" {
    fake_repo="$BATS_TEST_TMPDIR/fake-repo"
    elsewhere="$BATS_TEST_TMPDIR/elsewhere"
    mkdir -p "$fake_repo/.claude/scripts/lib" "$elsewhere"
    cp "$REPO_ROOT/.claude/scripts/session-limit-capture.sh" "$fake_repo/.claude/scripts/"
    cp "$REPO_ROOT/.claude/scripts/compat-lib.sh" "$fake_repo/.claude/scripts/"
    cp "$REPO_ROOT/.claude/scripts/lib/session-limit-lib.sh" "$fake_repo/.claude/scripts/lib/"
    cp "$REPO_ROOT/.claude/scripts/lib/session-cap-state-lib.sh" "$fake_repo/.claude/scripts/lib/"
    now_epoch=1767225600
    reset_time="02:00"

    run env LOA_SESSION_CAP_BB_REPO="0xHoneyJar/fake-repo" LOA_SESSION_CAP_BB_PR=99 \
        LOA_SESSION_CAP_NOW_EPOCH="$now_epoch" \
        bash -c 'cd "$1" && "$2" --raw "$3"' -- \
        "$elsewhere" "$fake_repo/.claude/scripts/session-limit-capture.sh" \
        "You've hit your session limit; resets ${reset_time} (UTC)"
    [ "$status" -eq 0 ]
    [ -f "$fake_repo/.run/session-limit-state.json" ]
    [ ! -e "$elsewhere/.run/session-limit-state.json" ]
    jq -e '.capture_id | startswith("sha256:")' "$fake_repo/.run/session-limit-state.json"
    [ "$(jq -r '.lifecycle' "$fake_repo/.run/session-limit-state.json")" = "pending" ]
    jq -e '.review_target == {repo:"0xHoneyJar/fake-repo", pr_number:99}' "$fake_repo/.run/session-limit-state.json"
    [ "$(file_mode "$fake_repo/.run")" = "700" ]
    [ "$(file_mode "$fake_repo/.run/session-limit-state.json")" = "600" ]
}

@test "capture identity includes the exact review target" {
    fake_repo="$BATS_TEST_TMPDIR/identity-repo"
    mkdir -p "$fake_repo/.claude/scripts/lib"
    cp "$REPO_ROOT/.claude/scripts/session-limit-capture.sh" "$fake_repo/.claude/scripts/"
    cp "$REPO_ROOT/.claude/scripts/compat-lib.sh" "$fake_repo/.claude/scripts/"
    cp "$REPO_ROOT/.claude/scripts/lib/session-limit-lib.sh" "$fake_repo/.claude/scripts/lib/"
    cp "$REPO_ROOT/.claude/scripts/lib/session-cap-state-lib.sh" "$fake_repo/.claude/scripts/lib/"
    now_epoch=1767225600
    reset_time="02:00"

    run env LOA_SESSION_CAP_BB_REPO="0xHoneyJar/fake-repo" LOA_SESSION_CAP_BB_PR=42 \
        LOA_SESSION_CAP_NOW_EPOCH="$now_epoch" LOA_SESSION_CAP_EVENT_NONCE="fixed-event" \
        "$fake_repo/.claude/scripts/session-limit-capture.sh" --raw \
        "You've hit your session limit; resets ${reset_time} (UTC)"
    [ "$status" -eq 0 ]
    first_id="$(jq -r '.capture_id' "$fake_repo/.run/session-limit-state.json")"

    run env LOA_SESSION_CAP_BB_REPO="0xHoneyJar/fake-repo" LOA_SESSION_CAP_BB_PR=43 \
        LOA_SESSION_CAP_NOW_EPOCH="$now_epoch" LOA_SESSION_CAP_EVENT_NONCE="fixed-event" \
        "$fake_repo/.claude/scripts/session-limit-capture.sh" --raw \
        "You've hit your session limit; resets ${reset_time} (UTC)"
    [ "$status" -eq 0 ]
    second_id="$(jq -r '.capture_id' "$fake_repo/.run/session-limit-state.json")"
    [ "$first_id" != "$second_id" ]
    jq -e '.identity_version == 1 and .event_nonce == "fixed-event" and .review_target.pr_number == 43' \
        "$fake_repo/.run/session-limit-state.json"
}

@test "fanout rejects unsafe windows and phases before generation" {
    run bash -c '
        source "$1"
        _validate_window "10:15 UTC"
        ! _validate_window "10:99 UTC"
        ! _validate_window "10:15 UTC;touch_/tmp/x"
        _validate_phase bridgebuilder
        ! _validate_phase "../../oops"
    ' -- "$FANOUT"
    [ "$status" -eq 0 ]
}

@test "crontab block uses scheduler timezone semantics" {
    run bash -c '
        source "$1"
        CRON_LINES=("UTC|5 0 * * * true")
        _build_crontab_block
    ' -- "$FANOUT"
    [ "$status" -eq 0 ]
    [[ "$output" == *"CRON_TZ=UTC"* ]]
    [[ "$output" == *$'CRON_TZ=UTC\nTZ=UTC\n5 0 * * * true'* ]]
}

@test "crontab block restores the preceding explicit timezone assignments" {
    run bash -c '
        source "$1"
        existing="CRON_TZ=America/New_York
TZ=America/Los_Angeles
15 9 * * * existing-job"
        cron_restore="$(_last_env_assignment "$existing" CRON_TZ)"
        tz_restore="$(_last_env_assignment "$existing" TZ)"
        CRON_LINES=("UTC|5 0 * * * managed-job")
        _build_crontab_block "$cron_restore" "$tz_restore"
    ' -- "$FANOUT"
    [ "$status" -eq 0 ]
    [[ "$output" == *$'5 0 * * * managed-job\nCRON_TZ=America/New_York\nTZ=America/Los_Angeles\n# loa-cycle117-session-cap-fanout END'* ]]
}

@test "fanout gives retry state one five-minute reconciliation owner" {
    work="$BATS_TEST_TMPDIR/reconcile-cron"
    mkdir -p "$work/schedules"
    cat > "$work/config.yaml" <<'YAML'
session_cap:
  reset_windows: ["10:15 UTC"]
  post_reset_fanout:
    enabled: true
    phases: [bridgebuilder]
    cron_jitter_min: 7
YAML

    run env LOA_SESSION_CAP_CONFIG_FILE="$work/config.yaml" \
        LOA_SESSION_CAP_SCHEDULES_DIR="$work/schedules" \
        bash -c 'source "$1"; _LIB=/usr/bin/true; _plan "$2"; _build_crontab_block' -- \
        "$FANOUT" "$work/schedules"
    [ "$status" -eq 0 ]
    [ "$(printf '%s\n' "$output" | awk '/retry-reconciler/{count++} END{print count+0}')" = "1" ]
    [[ "$output" == *"*/5 * * * *"*"session-cap-reconcile.sh"* ]]
}

@test "crontab marker ownership fails closed on malformed boundaries" {
    run bash -c '
        source "$1"
        _validate_managed_markers "ordinary job"
        ! _validate_managed_markers "$MARKER_BEGIN
ordinary job"
        ! _validate_managed_markers "$MARKER_END
$MARKER_BEGIN"
        ! _validate_managed_markers "$MARKER_BEGIN
$MARKER_END
$MARKER_END"
        _validate_managed_markers "$MARKER_BEGIN
managed job
$MARKER_END"
    ' -- "$FANOUT"
    [ "$status" -eq 0 ]
}

@test "crontab replacement refuses a stale whole-document snapshot" {
    work="$BATS_TEST_TMPDIR/crontab-drift"
    bin="$work/bin"
    mkdir -p "$bin"
    cat > "$bin/crontab" <<'SH'
#!/usr/bin/env bash
if [[ "${1:-}" == "-l" ]]; then
    printf 'concurrent edit\n'
    exit 0
fi
printf 'unexpected replacement\n' >> "$CRONTAB_CALLS"
exit 0
SH
    chmod +x "$bin/crontab"

    run env PATH="$bin:$PATH" CRONTAB_CALLS="$work/calls" bash -c '
        source "$1"
        ! _crontab_replace_if_unchanged "old snapshot" "replacement"
    ' -- "$FANOUT"
    [ "$status" -eq 0 ]
    [ ! -e "$work/calls" ]
}

@test "failed crontab install restores the prior managed schedules" {
    work="$BATS_TEST_TMPDIR/install"
    bin="$work/bin"
    schedules="$work/schedules"
    mkdir -p "$bin" "$schedules"

    cat > "$work/config.yaml" <<'YAML'
session_cap:
  reset_windows: ["23:58 UTC"]
  post_reset_fanout:
    enabled: true
    phases: [bridgebuilder]
    cron_jitter_min: 7
YAML
    printf 'old schedule\n' > "$schedules/session-cap-fanout-w0-old.yaml"
    cat > "$bin/crontab" <<'SH'
#!/usr/bin/env bash
if [[ "${1:-}" == "-l" ]]; then
    exit 0
fi
exit 1
SH
    chmod +x "$bin/crontab"

    run env \
        PATH="$bin:$PATH" \
        LOA_SESSION_CAP_CONFIG_FILE="$work/config.yaml" \
        LOA_SESSION_CAP_SCHEDULES_DIR="$schedules" \
        LOA_SESSION_CAP_CRON_TZ_SUPPORTED=true \
        "$FANOUT" install

    [ "$status" -eq 1 ]
    [ "$(cat "$schedules/session-cap-fanout-w0-old.yaml")" = "old schedule" ]
    [ ! -e "$schedules/session-cap-fanout-w0-bridgebuilder.yaml" ]
}

@test "uninstall removes only its crontab block and managed schedules" {
    work="$BATS_TEST_TMPDIR/uninstall-success"
    bin="$work/bin"
    schedules="$work/schedules"
    state="$work/crontab"
    mkdir -p "$bin" "$schedules"
    printf 'managed\n' > "$schedules/session-cap-fanout-w0-bridgebuilder.yaml"
    printf 'keep\n' > "$schedules/operator-owned.yaml"
    cat > "$state" <<'CRON'
15 1 * * * unrelated-before
# loa-cycle117-session-cap-fanout BEGIN
20 1 * * * managed
# loa-cycle117-session-cap-fanout END
25 1 * * * unrelated-after
CRON
    cat > "$bin/crontab" <<'SH'
#!/usr/bin/env bash
if [[ "${1:-}" == "-l" ]]; then
    cat "$CRONTAB_STATE"
elif [[ "${1:-}" == "-" ]]; then
    cat > "$CRONTAB_STATE"
else
    exit 2
fi
SH
    chmod +x "$bin/crontab"

    run env PATH="$bin:$PATH" CRONTAB_STATE="$state" \
        LOA_SESSION_CAP_SCHEDULES_DIR="$schedules" \
        LOA_SESSION_CAP_CRONTAB_LOCK_DIR="$work/lock" \
        "$FANOUT" uninstall
    [ "$status" -eq 0 ]
    [ ! -e "$schedules/session-cap-fanout-w0-bridgebuilder.yaml" ]
    [ "$(cat "$schedules/operator-owned.yaml")" = "keep" ]
    [ "$(awk '/loa-cycle117-session-cap-fanout/{count++} END{print count+0}' "$state")" = "0" ]
    [ "$(awk '/unrelated-/{count++} END{print count+0}' "$state")" = "2" ]
}

@test "failed uninstall restores managed schedules" {
    work="$BATS_TEST_TMPDIR/uninstall-failure"
    bin="$work/bin"
    schedules="$work/schedules"
    state="$work/crontab"
    mkdir -p "$bin" "$schedules"
    printf 'managed\n' > "$schedules/session-cap-fanout-w0-bridgebuilder.yaml"
    cat > "$state" <<'CRON'
# loa-cycle117-session-cap-fanout BEGIN
20 1 * * * managed
# loa-cycle117-session-cap-fanout END
CRON
    cat > "$bin/crontab" <<'SH'
#!/usr/bin/env bash
if [[ "${1:-}" == "-l" ]]; then
    cat "$CRONTAB_STATE"
    exit 0
fi
exit 1
SH
    chmod +x "$bin/crontab"

    run env PATH="$bin:$PATH" CRONTAB_STATE="$state" \
        LOA_SESSION_CAP_SCHEDULES_DIR="$schedules" \
        LOA_SESSION_CAP_CRONTAB_LOCK_DIR="$work/lock" \
        "$FANOUT" uninstall
    [ "$status" -eq 1 ]
    [ "$(cat "$schedules/session-cap-fanout-w0-bridgebuilder.yaml")" = "managed" ]
}

@test "bridge decider resumes every active bridge lifecycle state" {
    for state in RUNNING ITERATING FINALIZING HALTED; do
        cycle="cycle-${state}"
        handoff="$BATS_TEST_TMPDIR/loa-session-cap-bb.${cycle}"
        mkdir -m 700 -p "$handoff"
        jq -n --arg state "$state" \
            '{eligible:true, capture_id:"capture-active", review_target:{repo:"0xHoneyJar/fixture", pr_number:42}, bridge_state:$state}' > "$handoff/reader.json"

        run env TMPDIR="$BATS_TEST_TMPDIR" "$DECIDER" "$cycle" schedule 1 '[]'
        [ "$status" -eq 0 ]
        [ "$(jq -r '.action' <<<"$output")" = "dispatch" ]
    done
}

@test "reader dispatches only a fresh unconsumed capture" {
    state_file="$BATS_TEST_TMPDIR/session-limit-state.json"
    cat > "$state_file" <<'JSON'
{
  "capture_id": "capture-fresh",
  "review_target": {"repo":"0xHoneyJar/fixture","pr_number":42},
  "lifecycle": "pending",
  "consumed_at": null,
  "reset_at_epoch": 100,
  "active_run_state_snapshot": {
    "sprint_plan": {"state": "RUNNING"},
    "bridge": {"state": "ITERATING"}
  }
}
JSON

    run env TMPDIR="$BATS_TEST_TMPDIR" LOA_SESSION_CAP_STATE_FILE="$state_file" \
        LOA_SESSION_CAP_NOW_EPOCH=120 LOA_SESSION_CAP_MAX_RESET_AGE_SECONDS=60 \
        "$READER" fresh schedule 0 '[]'
    [ "$status" -eq 0 ]
    [ "$(jq -r '.eligible' <<<"$output")" = "true" ]
    if [[ "$(uname -s)" == "Darwin" ]]; then
        mode="$(stat -f '%Lp' "$BATS_TEST_TMPDIR/loa-session-cap-bb.fresh/reader.json")"
    else
        mode="$(stat -c '%a' "$BATS_TEST_TMPDIR/loa-session-cap-bb.fresh/reader.json")"
    fi
    [[ "$mode" = "600" || "$mode" = "0600" ]]

    run env TMPDIR="$BATS_TEST_TMPDIR" LOA_SESSION_CAP_STATE_FILE="$state_file" \
        LOA_SESSION_CAP_NOW_EPOCH=120 LOA_SESSION_CAP_MAX_RESET_AGE_SECONDS=60 \
        "$READER" fresh schedule 0 '[]'
    [ "$status" -eq 1 ]

    jq 'del(.review_target)' "$state_file" > "$state_file.tmp"
    mv "$state_file.tmp" "$state_file"
    run env TMPDIR="$BATS_TEST_TMPDIR" LOA_SESSION_CAP_STATE_FILE="$state_file" \
        LOA_SESSION_CAP_NOW_EPOCH=120 LOA_SESSION_CAP_MAX_RESET_AGE_SECONDS=60 \
        "$READER" untargeted schedule 0 '[]'
    [ "$status" -eq 0 ]
    [ "$(jq -r '.eligible' <<<"$output")" = "false" ]
    [[ "$(jq -r '.eligibility_reason' <<<"$output")" == *"exact review target"* ]]

    jq '.review_target = {repo:"0xHoneyJar/fixture", pr_number:42} | .consumed_at = "2026-07-14T00:00:00Z"' "$state_file" > "$state_file.tmp"
    mv "$state_file.tmp" "$state_file"
    run env TMPDIR="$BATS_TEST_TMPDIR" LOA_SESSION_CAP_STATE_FILE="$state_file" \
        LOA_SESSION_CAP_NOW_EPOCH=120 LOA_SESSION_CAP_MAX_RESET_AGE_SECONDS=60 \
        "$READER" consumed schedule 0 '[]'
    [ "$status" -eq 0 ]
    [ "$(jq -r '.eligible' <<<"$output")" = "false" ]

    jq '.consumed_at = null | .reset_at_epoch = 1' "$state_file" > "$state_file.tmp"
    mv "$state_file.tmp" "$state_file"
    run env TMPDIR="$BATS_TEST_TMPDIR" LOA_SESSION_CAP_STATE_FILE="$state_file" \
        LOA_SESSION_CAP_NOW_EPOCH=120 LOA_SESSION_CAP_MAX_RESET_AGE_SECONDS=60 \
        "$READER" stale schedule 0 '[]'
    [ "$status" -eq 0 ]
    [ "$(jq -r '.eligible' <<<"$output")" = "false" ]
    [[ "$(jq -r '.eligibility_reason' <<<"$output")" == *"outside"* ]]
}

@test "dispatcher completes one capture and never dispatches it twice" {
    state_file="$BATS_TEST_TMPDIR/claim-state.json"
    calls="$BATS_TEST_TMPDIR/bb-calls"
    args_file="$BATS_TEST_TMPDIR/bb-args"
    mock_bb="$BATS_TEST_TMPDIR/mock-bb.sh"
    cat > "$state_file" <<'JSON'
{"capture_id":"capture-once","review_target":{"repo":"0xHoneyJar/fixture","pr_number":42},"lifecycle":"pending","consumed_at":null,"reset_at_epoch":100,"active_run_state_snapshot":{"bridge":{"state":"ITERATING"}}}
JSON
    cat > "$mock_bb" <<'SH'
#!/usr/bin/env bash
printf '%s\n' "${BRIDGEBUILDER_IDEMPOTENCY_KEY:-missing}" >> "$MOCK_BB_CALLS"
printf '%s\n' "$*" >> "$MOCK_BB_ARGS"
SH
    chmod +x "$mock_bb"

    for cycle in first second; do
        handoff="$BATS_TEST_TMPDIR/loa-session-cap-bb.${cycle}"
        mkdir -m 700 -p "$handoff"
        jq -n '{action:"dispatch", capture_id:"capture-once", review_target:{repo:"0xHoneyJar/fixture", pr_number:42}}' > "$handoff/decider.json"
        run bash -c 'umask 022; exec "$@"' -- env \
            TMPDIR="$BATS_TEST_TMPDIR" MOCK_BB_CALLS="$calls" MOCK_BB_ARGS="$args_file" \
            LOA_SESSION_CAP_STATE_FILE="$state_file" LOA_SESSION_CAP_BB_REPO="0xHoneyJar/fixture" \
            LOA_SESSION_CAP_BB_ENTRY="$mock_bb" LOA_SESSION_CAP_NOW_EPOCH=120 \
            "$DISPATCHER" "$cycle" schedule 2 '[]'
        [ "$status" -eq 0 ]
        if [[ "$cycle" == "first" ]]; then
            [ "$(jq -r '.dispatched' <<<"$output")" = "true" ]
        else
            [ "$(jq -r '.dispatched' <<<"$output")" = "false" ]
        fi
    done

    [ "$(wc -l < "$calls" | tr -d ' ')" = "1" ]
    [ "$(cat "$calls")" = "capture-once" ]
    [ "$(cat "$args_file")" = "--repo 0xHoneyJar/fixture --pr 42" ]
    [ "$(jq -r '.lifecycle' "$state_file")" = "completed" ]
    [ "$(jq -r '.attempt_count' "$state_file")" = "1" ]
    [ "$(_session_cap_state_mode "$state_file")" = "600" ]
}

@test "dispatcher retries failures with one idempotency key and a bounded budget" {
    state_file="$BATS_TEST_TMPDIR/retry-state.json"
    calls="$BATS_TEST_TMPDIR/retry-calls"
    mock_bb="$BATS_TEST_TMPDIR/failing-bb.sh"
    cat > "$state_file" <<'JSON'
{"capture_id":"capture-retry","review_target":{"repo":"0xHoneyJar/fixture","pr_number":42},"lifecycle":"pending","attempt_count":0,"consumed_at":null,"reset_at_epoch":100,"active_run_state_snapshot":{"bridge":{"state":"ITERATING"}}}
JSON
    cat > "$mock_bb" <<'SH'
#!/usr/bin/env bash
printf '%s\n' "${BRIDGEBUILDER_IDEMPOTENCY_KEY:-missing}" >> "$MOCK_BB_CALLS"
exit 7
SH
    chmod +x "$mock_bb"

    for cycle in retry-one retry-two; do
        handoff="$BATS_TEST_TMPDIR/loa-session-cap-bb.${cycle}"
        mkdir -m 700 -p "$handoff"
        jq -n '{action:"dispatch", capture_id:"capture-retry", review_target:{repo:"0xHoneyJar/fixture", pr_number:42}}' > "$handoff/decider.json"
        run env TMPDIR="$BATS_TEST_TMPDIR" MOCK_BB_CALLS="$calls" \
            LOA_SESSION_CAP_STATE_FILE="$state_file" LOA_SESSION_CAP_BB_REPO="0xHoneyJar/fixture" \
            LOA_SESSION_CAP_BB_ENTRY="$mock_bb" LOA_SESSION_CAP_MAX_ATTEMPTS=2 \
            LOA_SESSION_CAP_RETRY_DELAY_SECONDS=0 LOA_SESSION_CAP_NOW_EPOCH=120 \
            "$DISPATCHER" "$cycle" schedule 2 '[]'
        [ "$status" -eq 0 ]
        [ "$(jq -r '.bb_exit_code' <<<"$output")" = "7" ]
    done

    [ "$(wc -l < "$calls" | tr -d ' ')" = "2" ]
    [ "$(sort -u "$calls")" = "capture-retry" ]
    [ "$(jq -r '.lifecycle' "$state_file")" = "failed" ]
    [ "$(jq -r '.attempt_count' "$state_file")" = "2" ]

    handoff="$BATS_TEST_TMPDIR/loa-session-cap-bb.retry-three"
    mkdir -m 700 -p "$handoff"
    jq -n '{action:"dispatch", capture_id:"capture-retry", review_target:{repo:"0xHoneyJar/fixture", pr_number:42}}' > "$handoff/decider.json"
    run env TMPDIR="$BATS_TEST_TMPDIR" MOCK_BB_CALLS="$calls" \
        LOA_SESSION_CAP_STATE_FILE="$state_file" LOA_SESSION_CAP_BB_REPO="0xHoneyJar/fixture" \
        LOA_SESSION_CAP_BB_ENTRY="$mock_bb" LOA_SESSION_CAP_MAX_ATTEMPTS=2 \
        LOA_SESSION_CAP_RETRY_DELAY_SECONDS=0 LOA_SESSION_CAP_NOW_EPOCH=120 \
        "$DISPATCHER" retry-three schedule 2 '[]'
    [ "$status" -eq 0 ]
    [ "$(jq -r '.dispatched' <<<"$output")" = "false" ]
    [ "$(wc -l < "$calls" | tr -d ' ')" = "2" ]
}

@test "dispatcher and reader fail closed on a lease shorter than the review timeout" {
    state_file="$BATS_TEST_TMPDIR/short-lease-state.json"
    calls="$BATS_TEST_TMPDIR/short-lease-calls"
    mock_bb="$BATS_TEST_TMPDIR/short-lease-bb.sh"
    handoff="$BATS_TEST_TMPDIR/loa-session-cap-bb.short-lease"
    mkdir -m 700 -p "$handoff"
    cat > "$state_file" <<'JSON'
{"capture_id":"capture-short-lease","review_target":{"repo":"0xHoneyJar/fixture","pr_number":42},"lifecycle":"pending","attempt_count":0,"consumed_at":null,"reset_at_epoch":100,"active_run_state_snapshot":{"bridge":{"state":"ITERATING"}}}
JSON
    jq -n '{action:"dispatch", capture_id:"capture-short-lease", review_target:{repo:"0xHoneyJar/fixture", pr_number:42}}' > "$handoff/decider.json"
    cat > "$mock_bb" <<'SH'
#!/usr/bin/env bash
touch "$MOCK_BB_CALLS"
SH
    chmod +x "$mock_bb"

    run env TMPDIR="$BATS_TEST_TMPDIR" MOCK_BB_CALLS="$calls" \
        LOA_SESSION_CAP_STATE_FILE="$state_file" LOA_SESSION_CAP_BB_ENTRY="$mock_bb" \
        LOA_SESSION_CAP_CLAIM_LEASE_SECONDS=0 LOA_SESSION_CAP_NOW_EPOCH=120 \
        "$DISPATCHER" short-lease schedule 2 '[]'
    [ "$status" -eq 1 ]
    [ ! -e "$calls" ]
    [ "$(jq -r '.lifecycle' "$state_file")" = "pending" ]

    run env TMPDIR="$BATS_TEST_TMPDIR" LOA_SESSION_CAP_STATE_FILE="$state_file" \
        LOA_SESSION_CAP_NOW_EPOCH=120 LOA_SESSION_CAP_CLAIM_LEASE_SECONDS=0 \
        "$READER" short-lease-reader schedule 0 '[]'
    [ "$status" -eq 0 ]
    [ "$(jq -r '.eligible' <<<"$output")" = "false" ]
}

@test "all session-cap consumers refuse group-readable authorization state" {
    state_file="$BATS_TEST_TMPDIR/insecure-state.json"
    schedule="$BATS_TEST_TMPDIR/insecure-schedule.yaml"
    handoff="$BATS_TEST_TMPDIR/loa-session-cap-bb.insecure-state"
    cat > "$state_file" <<'JSON'
{"capture_id":"capture-insecure","review_target":{"repo":"0xHoneyJar/fixture","pr_number":42},"lifecycle":"pending","attempt_count":0,"consumed_at":null,"reset_at_epoch":100,"active_run_state_snapshot":{"bridge":{"state":"ITERATING"}}}
JSON
    printf 'schedule_id: insecure\n' > "$schedule"
    chmod 644 "$state_file"

    run env TMPDIR="$BATS_TEST_TMPDIR" LOA_SESSION_CAP_STATE_FILE="$state_file" \
        LOA_SESSION_CAP_NOW_EPOCH=120 "$READER" insecure-state schedule 0 '[]'
    [ "$status" -eq 1 ]
    [[ "$output" == *"owner-controlled mode 0600"* ]]

    mkdir -m 700 -p "$handoff"
    jq -n '{action:"dispatch", capture_id:"capture-insecure", review_target:{repo:"0xHoneyJar/fixture", pr_number:42}}' > "$handoff/decider.json"
    run env TMPDIR="$BATS_TEST_TMPDIR" LOA_SESSION_CAP_STATE_FILE="$state_file" \
        LOA_SESSION_CAP_NOW_EPOCH=120 "$DISPATCHER" insecure-state schedule 2 '[]'
    [ "$status" -eq 1 ]
    [[ "$output" == *"owner-controlled mode 0600"* ]]

    run env LOA_SESSION_CAP_STATE_FILE="$state_file" LOA_SESSION_CAP_NOW_EPOCH=120 \
        "$RECONCILER" "$schedule"
    [ "$status" -eq 1 ]
    [[ "$output" == *"owner-controlled mode 0600"* ]]
}

@test "dispatcher independently refuses a stale reset handoff" {
    state_file="$BATS_TEST_TMPDIR/stale-dispatch-state.json"
    calls="$BATS_TEST_TMPDIR/stale-dispatch-calls"
    mock_bb="$BATS_TEST_TMPDIR/stale-dispatch-bb.sh"
    handoff="$BATS_TEST_TMPDIR/loa-session-cap-bb.stale-dispatch"
    mkdir -m 700 -p "$handoff"
    cat > "$state_file" <<'JSON'
{"capture_id":"capture-stale","review_target":{"repo":"0xHoneyJar/fixture","pr_number":42},"lifecycle":"pending","attempt_count":0,"consumed_at":null,"reset_at_epoch":1,"active_run_state_snapshot":{"bridge":{"state":"ITERATING"}}}
JSON
    jq -n '{action:"dispatch", capture_id:"capture-stale", review_target:{repo:"0xHoneyJar/fixture", pr_number:42}}' > "$handoff/decider.json"
    cat > "$mock_bb" <<'SH'
#!/usr/bin/env bash
touch "$MOCK_BB_CALLS"
SH
    chmod +x "$mock_bb"

    run env TMPDIR="$BATS_TEST_TMPDIR" MOCK_BB_CALLS="$calls" \
        LOA_SESSION_CAP_STATE_FILE="$state_file" LOA_SESSION_CAP_BB_ENTRY="$mock_bb" \
        LOA_SESSION_CAP_NOW_EPOCH=120 LOA_SESSION_CAP_MAX_RESET_AGE_SECONDS=60 \
        "$DISPATCHER" stale-dispatch schedule 2 '[]'
    [ "$status" -eq 0 ]
    [ "$(jq -r '.dispatched' <<<"$output")" = "false" ]
    [ ! -e "$calls" ]
    [ "$(jq -r '.lifecycle' "$state_file")" = "pending" ]
}

@test "phase handoff rejects group-readable scratch state" {
    handoff="$BATS_TEST_TMPDIR/loa-session-cap-bb.insecure-handoff"
    mkdir -m 755 -p "$handoff"
    jq -n '{eligible:true, capture_id:"capture", review_target:{repo:"0xHoneyJar/fixture", pr_number:42}, bridge_state:"ITERATING"}' > "$handoff/reader.json"

    run env TMPDIR="$BATS_TEST_TMPDIR" "$DECIDER" insecure-handoff schedule 1 '[]'
    [ "$status" -ne 0 ]
}

@test "reconciler wakes only due durable retry state" {
    state_file="$BATS_TEST_TMPDIR/reconcile-state.json"
    calls="$BATS_TEST_TMPDIR/reconcile-calls"
    mock_cycle="$BATS_TEST_TMPDIR/mock-cycle-lib.sh"
    schedule="$BATS_TEST_TMPDIR/reconcile.yaml"
    printf 'schedule_id: reconcile\n' > "$schedule"
    cat > "$mock_cycle" <<'SH'
#!/usr/bin/env bash
printf '%s\n' "$*" >> "$MOCK_CYCLE_CALLS"
SH
    chmod +x "$mock_cycle"
    cat > "$state_file" <<'JSON'
{"capture_id":"capture-due","review_target":{"repo":"0xHoneyJar/fixture","pr_number":42},"lifecycle":"retryable_failure","attempt_count":1,"reset_at_epoch":100,"retry_after_epoch":119}
JSON

    run env MOCK_CYCLE_CALLS="$calls" LOA_SESSION_CAP_STATE_FILE="$state_file" \
        LOA_SESSION_CAP_CYCLE_LIB="$mock_cycle" LOA_SESSION_CAP_NOW_EPOCH=120 \
        "$RECONCILER" "$schedule"
    [ "$status" -eq 0 ]
    [ "$(cat "$calls")" = "invoke $schedule" ]

    jq '.lifecycle="pending"' "$state_file" > "$state_file.tmp"
    mv "$state_file.tmp" "$state_file"
    run env MOCK_CYCLE_CALLS="$calls" LOA_SESSION_CAP_STATE_FILE="$state_file" \
        LOA_SESSION_CAP_CYCLE_LIB="$mock_cycle" LOA_SESSION_CAP_NOW_EPOCH=120 \
        "$RECONCILER" "$schedule"
    [ "$status" -eq 0 ]
    [ "$(wc -l < "$calls" | tr -d ' ')" = "1" ]

    jq '.lifecycle="claimed" | .claimed_at_epoch=100' "$state_file" > "$state_file.tmp"
    mv "$state_file.tmp" "$state_file"
    run env MOCK_CYCLE_CALLS="$calls" LOA_SESSION_CAP_STATE_FILE="$state_file" \
        LOA_SESSION_CAP_CYCLE_LIB="$mock_cycle" LOA_SESSION_CAP_NOW_EPOCH=3700 \
        "$RECONCILER" "$schedule"
    [ "$status" -eq 0 ]
    [ "$(wc -l < "$calls" | tr -d ' ')" = "2" ]
}

@test "an in-flight dispatch never overwrites a newer capture" {
    state_file="$BATS_TEST_TMPDIR/interleaved-state.json"
    mock_bb="$BATS_TEST_TMPDIR/blocked-bb.sh"
    started="$BATS_TEST_TMPDIR/bb-started"
    release="$BATS_TEST_TMPDIR/bb-release"
    output_file="$BATS_TEST_TMPDIR/dispatcher-output"
    compat="$REPO_ROOT/.claude/scripts/compat-lib.sh"
    cycle="interleaved"
    handoff="$BATS_TEST_TMPDIR/loa-session-cap-bb.${cycle}"
    mkdir -m 700 -p "$handoff"
    printf '%s\n' '{"capture_id":"capture-old","review_target":{"repo":"0xHoneyJar/fixture","pr_number":42},"lifecycle":"pending","attempt_count":0,"consumed_at":null,"reset_at_epoch":100,"active_run_state_snapshot":{"bridge":{"state":"ITERATING"}}}' > "$state_file"
    jq -n '{action:"dispatch", capture_id:"capture-old", review_target:{repo:"0xHoneyJar/fixture", pr_number:42}}' > "$handoff/decider.json"
    cat > "$mock_bb" <<'SH'
#!/usr/bin/env bash
touch "$MOCK_BB_STARTED"
deadline=$((SECONDS + 10))
while [[ ! -e "$MOCK_BB_RELEASE" ]]; do
    (( SECONDS < deadline )) || exit 124
    sleep 0.02
done
SH
    chmod +x "$mock_bb"

    env TMPDIR="$BATS_TEST_TMPDIR" MOCK_BB_STARTED="$started" MOCK_BB_RELEASE="$release" \
        LOA_SESSION_CAP_STATE_FILE="$state_file" LOA_SESSION_CAP_BB_REPO="0xHoneyJar/fixture" \
        LOA_SESSION_CAP_BB_ENTRY="$mock_bb" LOA_SESSION_CAP_NOW_EPOCH=120 \
        "$DISPATCHER" "$cycle" schedule 2 '[]' \
        > "$output_file" &
    dispatcher_pid=$!
    session_cap_cleanup_pid="$dispatcher_pid"
    session_cap_cleanup_release="$release"

    for _ in $(seq 1 100); do
        [[ -e "$started" ]] && break
        sleep 0.02
    done
    [ -e "$started" ]

    bash -c '
        source "$1"
        portable_lock_acquire "${2}.lock"
        printf "%s\n" "{\"capture_id\":\"capture-new\",\"review_target\":{\"repo\":\"0xHoneyJar/fixture\",\"pr_number\":43},\"lifecycle\":\"pending\",\"attempt_count\":0,\"consumed_at\":null}" > "${2}.tmp.new"
        mv -f "${2}.tmp.new" "$2"
        portable_lock_release "${2}.lock"
    ' -- "$compat" "$state_file"
    touch "$release"
    wait "$dispatcher_pid"
    session_cap_cleanup_pid=""

    [ "$(jq -r '.capture_id' "$state_file")" = "capture-new" ]
    [ "$(jq -r '.lifecycle' "$state_file")" = "pending" ]
    [ "$(jq -r '.delivery_state' "$output_file")" = "state_changed" ]
}

@test "awaiter and logger preserve numeric bridgebuilder exit codes" {
    cycle="typed-exit"
    handoff="$BATS_TEST_TMPDIR/loa-session-cap-bb.${cycle}"
    mkdir -m 700 -p "$handoff"
    jq -n '{dispatched:true, repo:"0xHoneyJar/fixture", delivery_state:"retryable_failure", bb_exit_code:7}' > "$handoff/dispatcher.json"

    run env TMPDIR="$BATS_TEST_TMPDIR" "$AWAITER" "$cycle" schedule 3 '[]'
    [ "$status" -eq 0 ]
    jq -e '.bb_exit_code == 7 and (.bb_exit_code | type) == "number"' <<<"$output"
    [ "$(jq -r '.terminal_state' <<<"$output")" = "failed" ]

    run env TMPDIR="$BATS_TEST_TMPDIR" "$LOGGER" "$cycle" schedule 4 '[]'
    [ "$status" -eq 0 ]
    jq -e '.bb_exit_code == 7 and (.bb_exit_code | type) == "number" and .delivery_state == "retryable_failure"' <<<"$output"
}

@test "nonzero bridgebuilder delivery still completes all five L3 phases" {
    if ! python3 -c 'import yaml, rfc8785, jsonschema' 2>/dev/null; then
        skip "scheduled-cycle integration dependencies are not installed"
    fi
    state_file="$BATS_TEST_TMPDIR/l3-failure-state.json"
    calls="$BATS_TEST_TMPDIR/l3-failure-calls"
    cycles_log="$BATS_TEST_TMPDIR/l3-failure-cycles.jsonl"
    lock_dir="$BATS_TEST_TMPDIR/l3-failure-locks"
    mock_bb="$BATS_TEST_TMPDIR/l3-failure-bb.sh"
    schedule="$BATS_TEST_TMPDIR/l3-failure.yaml"
    now_epoch="$(date +%s)"
    mkdir -p "$lock_dir"
    jq -n --argjson reset "$((now_epoch - 1))" \
        '{capture_id:"capture-l3-failure", review_target:{repo:"0xHoneyJar/fixture", pr_number:42}, lifecycle:"pending", attempt_count:0, consumed_at:null, reset_at_epoch:$reset, active_run_state_snapshot:{sprint_plan:{state:"RUNNING"}, bridge:{state:"ITERATING"}}}' \
        > "$state_file"
    cat > "$mock_bb" <<'SH'
#!/usr/bin/env bash
printf '%s\n' "$*" >> "$MOCK_BB_CALLS"
exit 7
SH
    chmod +x "$mock_bb"
    cat > "$schedule" <<YAML
schedule_id: session-cap-l3-failure
schedule: "*/5 * * * *"
dispatch_contract:
  reader: "$READER"
  decider: "$DECIDER"
  dispatcher: "$DISPATCHER"
  awaiter: "$AWAITER"
  logger: "$LOGGER"
  budget_estimate_usd: 0
  timeout_seconds: 30
YAML

    run env \
        LOA_CYCLES_LOG="$cycles_log" \
        LOA_L3_LOCK_DIR="$lock_dir" \
        LOA_L3_PHASE_PATH_ALLOWED_PREFIXES="$REPO_ROOT/.claude/skills" \
        LOA_L3_PHASE_ENV_PASSTHROUGH="LOA_SESSION_CAP_STATE_FILE LOA_SESSION_CAP_NOW_EPOCH LOA_SESSION_CAP_BB_ENTRY LOA_SESSION_CAP_MAX_ATTEMPTS LOA_SESSION_CAP_RETRY_DELAY_SECONDS MOCK_BB_CALLS" \
        LOA_AUDIT_VERIFY_SIGS=0 \
        LOA_SESSION_CAP_STATE_FILE="$state_file" \
        LOA_SESSION_CAP_NOW_EPOCH="$now_epoch" \
        LOA_SESSION_CAP_BB_ENTRY="$mock_bb" \
        LOA_SESSION_CAP_MAX_ATTEMPTS=3 \
        LOA_SESSION_CAP_RETRY_DELAY_SECONDS=300 \
        MOCK_BB_CALLS="$calls" \
        "$L3_LIB" invoke "$schedule" --cycle-id session-cap-l3-failure
    [ "$status" -eq 0 ]
    [ "$(jq -s '[.[] | select(.event_type == "cycle.phase")] | length' "$cycles_log")" = "5" ]
    [ "$(jq -s '[.[] | select(.event_type == "cycle.phase" and .payload.phase == "logger")] | length' "$cycles_log")" = "1" ]
    [ "$(jq -s '[.[] | select(.event_type == "cycle.complete")] | length' "$cycles_log")" = "1" ]
    [ "$(jq -r '.lifecycle' "$state_file")" = "retryable_failure" ]
    [ "$(cat "$calls")" = "--repo 0xHoneyJar/fixture --pr 42" ]
}
