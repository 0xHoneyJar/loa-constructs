#!/usr/bin/env bats

setup() {
    REPO_ROOT="$(cd "$BATS_TEST_DIRNAME/../.." && pwd)"
    FANOUT="$REPO_ROOT/.claude/scripts/session-cap-fanout.sh"
    READER="$REPO_ROOT/.claude/skills/scheduled-cycle-template/contracts/session-cap-bb/reader.sh"
    DECIDER="$REPO_ROOT/.claude/skills/scheduled-cycle-template/contracts/session-cap-bb/decider.sh"
    DISPATCHER="$REPO_ROOT/.claude/skills/scheduled-cycle-template/contracts/session-cap-bb/dispatcher.sh"
    AWAITER="$REPO_ROOT/.claude/skills/scheduled-cycle-template/contracts/session-cap-bb/awaiter.sh"
    LOGGER="$REPO_ROOT/.claude/skills/scheduled-cycle-template/contracts/session-cap-bb/logger.sh"
}

@test "final-time normalization rechecks collisions after nudging" {
    run bash -c 'source "$1"; _available_final_time 23 59 1 "|0:1|"' -- "$FANOUT"
    [ "$status" -eq 0 ]
    [ "$output" = "0 2" ]
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
    if [[ "$(uname -s)" == "Darwin" ]]; then
        skip "session-limit parser is explicitly GNU-date-only"
    fi
    fake_repo="$BATS_TEST_TMPDIR/fake-repo"
    elsewhere="$BATS_TEST_TMPDIR/elsewhere"
    mkdir -p "$fake_repo/.claude/scripts/lib" "$elsewhere"
    cp "$REPO_ROOT/.claude/scripts/session-limit-capture.sh" "$fake_repo/.claude/scripts/"
    cp "$REPO_ROOT/.claude/scripts/compat-lib.sh" "$fake_repo/.claude/scripts/"
    cp "$REPO_ROOT/.claude/scripts/lib/session-limit-lib.sh" "$fake_repo/.claude/scripts/lib/"
    reset_time="$(date -u -d '+2 hours' +%H:%M)"

    run bash -c 'cd "$1" && "$2" --raw "$3"' -- \
        "$elsewhere" "$fake_repo/.claude/scripts/session-limit-capture.sh" \
        "You've hit your session limit; resets ${reset_time} (UTC)"
    [ "$status" -eq 0 ]
    [ -f "$fake_repo/.run/session-limit-state.json" ]
    [ ! -e "$elsewhere/.run/session-limit-state.json" ]
    jq -e '.capture_id | startswith("sha256:")' "$fake_repo/.run/session-limit-state.json"
    [ "$(jq -r '.lifecycle' "$fake_repo/.run/session-limit-state.json")" = "pending" ]
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

@test "bridge decider resumes every active bridge lifecycle state" {
    for state in RUNNING ITERATING FINALIZING HALTED; do
        cycle="cycle-${state}"
        handoff="$BATS_TEST_TMPDIR/loa-session-cap-bb.${cycle}"
        mkdir -p "$handoff"
        jq -n --arg state "$state" \
            '{eligible:true, capture_id:"capture-active", bridge_state:$state}' > "$handoff/reader.json"

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

    jq '.consumed_at = "2026-07-14T00:00:00Z"' "$state_file" > "$state_file.tmp"
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
    mock_bb="$BATS_TEST_TMPDIR/mock-bb.sh"
    cat > "$state_file" <<'JSON'
{"capture_id":"capture-once","lifecycle":"pending","consumed_at":null}
JSON
    cat > "$mock_bb" <<'SH'
#!/usr/bin/env bash
printf '%s\n' "${BRIDGEBUILDER_IDEMPOTENCY_KEY:-missing}" >> "$MOCK_BB_CALLS"
SH
    chmod +x "$mock_bb"

    for cycle in first second; do
        handoff="$BATS_TEST_TMPDIR/loa-session-cap-bb.${cycle}"
        mkdir -p "$handoff"
        jq -n '{action:"dispatch", capture_id:"capture-once"}' > "$handoff/decider.json"
        run env TMPDIR="$BATS_TEST_TMPDIR" MOCK_BB_CALLS="$calls" \
            LOA_SESSION_CAP_STATE_FILE="$state_file" LOA_SESSION_CAP_BB_REPO="0xHoneyJar/fixture" \
            LOA_SESSION_CAP_BB_ENTRY="$mock_bb" "$DISPATCHER" "$cycle" schedule 2 '[]'
        [ "$status" -eq 0 ]
        if [[ "$cycle" == "first" ]]; then
            [ "$(jq -r '.dispatched' <<<"$output")" = "true" ]
        else
            [ "$(jq -r '.dispatched' <<<"$output")" = "false" ]
        fi
    done

    [ "$(wc -l < "$calls" | tr -d ' ')" = "1" ]
    [ "$(cat "$calls")" = "capture-once" ]
    [ "$(jq -r '.lifecycle' "$state_file")" = "completed" ]
    [ "$(jq -r '.attempt_count' "$state_file")" = "1" ]
}

@test "dispatcher retries failures with one idempotency key and a bounded budget" {
    state_file="$BATS_TEST_TMPDIR/retry-state.json"
    calls="$BATS_TEST_TMPDIR/retry-calls"
    mock_bb="$BATS_TEST_TMPDIR/failing-bb.sh"
    cat > "$state_file" <<'JSON'
{"capture_id":"capture-retry","lifecycle":"pending","attempt_count":0,"consumed_at":null}
JSON
    cat > "$mock_bb" <<'SH'
#!/usr/bin/env bash
printf '%s\n' "${BRIDGEBUILDER_IDEMPOTENCY_KEY:-missing}" >> "$MOCK_BB_CALLS"
exit 7
SH
    chmod +x "$mock_bb"

    for cycle in retry-one retry-two; do
        handoff="$BATS_TEST_TMPDIR/loa-session-cap-bb.${cycle}"
        mkdir -p "$handoff"
        jq -n '{action:"dispatch", capture_id:"capture-retry"}' > "$handoff/decider.json"
        run env TMPDIR="$BATS_TEST_TMPDIR" MOCK_BB_CALLS="$calls" \
            LOA_SESSION_CAP_STATE_FILE="$state_file" LOA_SESSION_CAP_BB_REPO="0xHoneyJar/fixture" \
            LOA_SESSION_CAP_BB_ENTRY="$mock_bb" LOA_SESSION_CAP_MAX_ATTEMPTS=2 \
            LOA_SESSION_CAP_RETRY_DELAY_SECONDS=0 "$DISPATCHER" "$cycle" schedule 2 '[]'
        [ "$status" -eq 7 ]
    done

    [ "$(wc -l < "$calls" | tr -d ' ')" = "2" ]
    [ "$(sort -u "$calls")" = "capture-retry" ]
    [ "$(jq -r '.lifecycle' "$state_file")" = "failed" ]
    [ "$(jq -r '.attempt_count' "$state_file")" = "2" ]

    handoff="$BATS_TEST_TMPDIR/loa-session-cap-bb.retry-three"
    mkdir -p "$handoff"
    jq -n '{action:"dispatch", capture_id:"capture-retry"}' > "$handoff/decider.json"
    run env TMPDIR="$BATS_TEST_TMPDIR" MOCK_BB_CALLS="$calls" \
        LOA_SESSION_CAP_STATE_FILE="$state_file" LOA_SESSION_CAP_BB_REPO="0xHoneyJar/fixture" \
        LOA_SESSION_CAP_BB_ENTRY="$mock_bb" LOA_SESSION_CAP_MAX_ATTEMPTS=2 \
        LOA_SESSION_CAP_RETRY_DELAY_SECONDS=0 "$DISPATCHER" retry-three schedule 2 '[]'
    [ "$status" -eq 0 ]
    [ "$(jq -r '.dispatched' <<<"$output")" = "false" ]
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
    mkdir -p "$handoff"
    printf '%s\n' '{"capture_id":"capture-old","lifecycle":"pending","attempt_count":0,"consumed_at":null}' > "$state_file"
    jq -n '{action:"dispatch", capture_id:"capture-old"}' > "$handoff/decider.json"
    cat > "$mock_bb" <<'SH'
#!/usr/bin/env bash
touch "$MOCK_BB_STARTED"
while [[ ! -e "$MOCK_BB_RELEASE" ]]; do sleep 0.02; done
SH
    chmod +x "$mock_bb"

    env TMPDIR="$BATS_TEST_TMPDIR" MOCK_BB_STARTED="$started" MOCK_BB_RELEASE="$release" \
        LOA_SESSION_CAP_STATE_FILE="$state_file" LOA_SESSION_CAP_BB_REPO="0xHoneyJar/fixture" \
        LOA_SESSION_CAP_BB_ENTRY="$mock_bb" "$DISPATCHER" "$cycle" schedule 2 '[]' \
        > "$output_file" &
    dispatcher_pid=$!

    for _ in $(seq 1 100); do
        [[ -e "$started" ]] && break
        sleep 0.02
    done
    [ -e "$started" ]

    bash -c '
        source "$1"
        portable_lock_acquire "${2}.lock"
        printf "%s\n" "{\"capture_id\":\"capture-new\",\"lifecycle\":\"pending\",\"attempt_count\":0,\"consumed_at\":null}" > "${2}.tmp.new"
        mv -f "${2}.tmp.new" "$2"
        portable_lock_release "${2}.lock"
    ' -- "$compat" "$state_file"
    touch "$release"
    wait "$dispatcher_pid"

    [ "$(jq -r '.capture_id' "$state_file")" = "capture-new" ]
    [ "$(jq -r '.lifecycle' "$state_file")" = "pending" ]
    [ "$(jq -r '.delivery_state' "$output_file")" = "state_changed" ]
}

@test "awaiter and logger preserve numeric bridgebuilder exit codes" {
    cycle="typed-exit"
    handoff="$BATS_TEST_TMPDIR/loa-session-cap-bb.${cycle}"
    mkdir -p "$handoff"
    jq -n '{dispatched:true, repo:"0xHoneyJar/fixture", bb_exit_code:7}' > "$handoff/dispatcher.json"

    run env TMPDIR="$BATS_TEST_TMPDIR" "$AWAITER" "$cycle" schedule 3 '[]'
    [ "$status" -eq 0 ]
    jq -e '.bb_exit_code == 7 and (.bb_exit_code | type) == "number"' <<<"$output"

    run env TMPDIR="$BATS_TEST_TMPDIR" "$LOGGER" "$cycle" schedule 4 '[]'
    [ "$status" -eq 0 ]
    jq -e '.bb_exit_code == 7 and (.bb_exit_code | type) == "number"' <<<"$output"
}
