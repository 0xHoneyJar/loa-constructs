#!/usr/bin/env bats

setup() {
    REPO_ROOT="$(cd "$BATS_TEST_DIRNAME/../.." && pwd)"
    FANOUT="$REPO_ROOT/.claude/scripts/session-cap-fanout.sh"
    DECIDER="$REPO_ROOT/.claude/skills/scheduled-cycle-template/contracts/session-cap-bb/decider.sh"
}

@test "fanout jitter carries into the next hour and day" {
    run bash -c 'source "$1"; _final_time 23 58 7' -- "$FANOUT"
    [ "$status" -eq 0 ]
    [ "$output" = "0 5" ]

    run bash -c 'source "$1"; _final_time 23 59 1' -- "$FANOUT"
    [ "$status" -eq 0 ]
    [ "$output" = "0 1" ]
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
        jq -n --arg state "$state" '{bridge_state:$state}' > "$handoff/reader.json"

        run env TMPDIR="$BATS_TEST_TMPDIR" "$DECIDER" "$cycle" schedule 1 '[]'
        [ "$status" -eq 0 ]
        [ "$(jq -r '.action' <<<"$output")" = "dispatch" ]
    done
}
