#!/usr/bin/env bats
# =============================================================================
# composition-pilot.bats — T2 + T3 + T4 acceptance test scaffolds
# =============================================================================
# Cycle: simstim-20260509-aead9136 (Sprint 2, S2-T3..T5)
# PRD: §8.2 T2, §8.3 T3, §8.4 T4
#
# T2 — Explicit invocation only in rooms
# T3 — Handoff packet surfacing
# T4 — Composition as visible agent chain
#
# Sprint 2 scope: artifact-level assertions (dispatch prompts, room packets,
# orchestrator log entries). Per-operator-rehearsal portion of T4 (actual
# spawning of subagents in operator's session) is deferred to S2-T7
# (operator workflow rehearsal task added per bridge iter 1 finding M-2).
# =============================================================================

fail() {
    echo "FAIL: $*" >&2
    return 1
}

setup() {
    PROJECT_ROOT="$(cd "$BATS_TEST_DIRNAME/../.." && pwd)"
    cd "$PROJECT_ROOT"
    DISPATCHER="$PROJECT_ROOT/.claude/scripts/compose-dispatch.sh"
    HANDOFF_VALIDATOR="$PROJECT_ROOT/.claude/scripts/handoff-validate.sh"
    ROOM_VALIDATOR="$PROJECT_ROOT/.claude/scripts/room-packet-validate.sh"
    FIXTURE="$PROJECT_ROOT/tests/fixtures/compositions/artisan-observer.composition.yaml"

    [[ -f "$DISPATCHER" ]] || skip "compose-dispatch.sh not found"
    [[ -f "$FIXTURE" ]] || skip "artisan-observer fixture not found"

    # Run dispatcher in interactive mode; record run_id
    RUN_OUTPUT="$($DISPATCHER "$FIXTURE" --interactive --json 2>&1)" || true
    RUN_ID="$(echo "$RUN_OUTPUT" | jq -r '.run_id // empty')"
    RUN_DIR="$PROJECT_ROOT/.run/compose/$RUN_ID"
}

teardown() {
    # Optional: clean up run dir? Leave for inspection. Manual cleanup via cycle-close.
    :
}

# -----------------------------------------------------------------------------
# T2 — Explicit invocation only in rooms
# -----------------------------------------------------------------------------

@test "T2: dispatch prompts use @agent-construct-X (not Agent() tool calls)" {
    [[ -n "$RUN_ID" ]] || fail "dispatcher did not produce run_id"

    local stage0_prompt="$RUN_DIR/dispatch-prompts/stage-0.prompt.md"
    local stage1_prompt="$RUN_DIR/dispatch-prompts/stage-1.prompt.md"

    [[ -f "$stage0_prompt" ]] || fail "stage 0 dispatch prompt missing"
    [[ -f "$stage1_prompt" ]] || fail "stage 1 dispatch prompt missing"

    # Sprint 0 finding: prompts MUST instruct @-mention, NOT Agent() tool call
    grep -q "@agent-construct-artisan" "$stage0_prompt" || fail "stage 0 missing @agent-construct-artisan invocation"
    grep -q "@agent-construct-observer" "$stage1_prompt" || fail "stage 1 missing @agent-construct-observer invocation"

    # Negative: ensure NO Agent() tool call language (which would not work for project agents)
    ! grep -q "Agent(subagent_type" "$stage0_prompt" || fail "stage 0 incorrectly references Agent(subagent_type)"
    ! grep -q "Agent(subagent_type" "$stage1_prompt" || fail "stage 1 incorrectly references Agent(subagent_type)"
}

@test "T2: orchestrator log records stage_dispatch_pending_operator events" {
    [[ -n "$RUN_ID" ]] || fail "no run_id"
    local log="$RUN_DIR/orchestrator.jsonl"
    [[ -f "$log" ]] || fail "orchestrator log missing"

    local pending_count
    pending_count="$(grep -c '"event":"stage_dispatch_pending_operator"' "$log" || true)"
    [[ "$pending_count" == "2" ]] || fail "expected 2 pending-operator events, got $pending_count"
}

# -----------------------------------------------------------------------------
# T3 — Handoff packet surfacing
# -----------------------------------------------------------------------------

@test "T3: dispatch prompts reference handoff packet paths" {
    [[ -n "$RUN_ID" ]] || fail "no run_id"
    local stage0_prompt="$RUN_DIR/dispatch-prompts/stage-0.prompt.md"

    grep -q "envelopes/00.artisan.handoff.json" "$stage0_prompt" || fail "stage 0 prompt missing expected handoff path"
    grep -q "construct_slug" "$stage0_prompt" || fail "stage 0 prompt missing required-field hint"
    grep -q "construct-handoff.schema.json" "$stage0_prompt" || fail "stage 0 prompt missing schema reference"
}

@test "T3: room packets contain expected_output_type per stage writes" {
    [[ -n "$RUN_ID" ]] || fail "no run_id"

    local rooms_count
    rooms_count="$(grep -c '"event":"stage_enter"' "$RUN_DIR/orchestrator.jsonl" || true)"
    [[ "$rooms_count" == "2" ]] || fail "expected 2 stage_enter events, got $rooms_count"

    # Pull room paths from log
    local room_paths
    room_paths="$(jq -r 'select(.event == "stage_enter") | .payload.room_path' "$RUN_DIR/orchestrator.jsonl")"

    while read -r room_path; do
        [[ -f "$room_path" ]] || fail "room packet missing: $room_path"
        run "$ROOM_VALIDATOR" "$room_path" --json
        [[ "$status" -eq 0 ]] || fail "room packet validation failed: $room_path"
        local expected_output
        expected_output="$(jq -r '.expected_output_type' "$room_path")"
        [[ "$expected_output" == "Verdict" ]] || fail "room packet expected Verdict, got $expected_output"
    done <<< "$room_paths"
}

# -----------------------------------------------------------------------------
# T4 — Composition as visible agent chain
# -----------------------------------------------------------------------------

@test "T4: two stages dispatched (room packets + dispatch prompts)" {
    [[ -n "$RUN_ID" ]] || fail "no run_id"

    local prompts_count
    prompts_count="$(ls "$RUN_DIR/dispatch-prompts/" 2>/dev/null | wc -l | tr -d ' ')"
    [[ "$prompts_count" == "2" ]] || fail "expected 2 dispatch prompts, got $prompts_count"

    local rooms_count
    rooms_count="$(jq -r 'select(.event == "stage_enter") | .payload.room_id' "$RUN_DIR/orchestrator.jsonl" | wc -l | tr -d ' ')"
    [[ "$rooms_count" == "2" ]] || fail "expected 2 room packets, got $rooms_count"
}

@test "T4: stage 1's room packet inputs reference stage 0's expected outputs" {
    [[ -n "$RUN_ID" ]] || fail "no run_id"

    local stage1_room_path
    stage1_room_path="$(jq -r 'select(.event == "stage_enter" and .payload.stage == 1) | .payload.room_path' "$RUN_DIR/orchestrator.jsonl" | head -1)"
    [[ -f "$stage1_room_path" ]] || fail "stage 1 room packet missing"

    # Stage 1's inputs come from stage 0's prior_handoff (which is empty in dry/no-handoff run)
    # So we assert the field EXISTS but may be empty until operator-paste produces stage 0's handoff
    local has_inputs_field
    has_inputs_field="$(jq 'has("inputs")' "$stage1_room_path")"
    [[ "$has_inputs_field" == "true" ]] || fail "stage 1 room packet missing inputs field"

    # Stage 1 reads Verdict per fixture; expected_output should be Verdict
    local expected
    expected="$(jq -r '.expected_output_type' "$stage1_room_path")"
    [[ "$expected" == "Verdict" ]] || fail "stage 1 expected Verdict, got $expected"
}

@test "T4: orchestrator log shape — start, 2x stage_enter, 2x dispatch_pending, awaiting_operator" {
    [[ -n "$RUN_ID" ]] || fail "no run_id"
    local log="$RUN_DIR/orchestrator.jsonl"

    [[ "$(grep -c '"event":"compose.start"' "$log" || true)" == "1" ]] || fail "missing compose.start"
    [[ "$(grep -c '"event":"stage_enter"' "$log" || true)" == "2" ]] || fail "expected 2 stage_enter"
    [[ "$(grep -c '"event":"stage_dispatch_pending_operator"' "$log" || true)" == "2" ]] || fail "expected 2 stage_dispatch_pending"
    [[ "$(grep -c '"event":"compose.awaiting_operator"' "$log" || true)" == "1" ]] || fail "missing compose.awaiting_operator"
}

# -----------------------------------------------------------------------------
# Sprint 0 amendment compliance — invocation path correctness
# -----------------------------------------------------------------------------

@test "amendment: room packet invocation_path is at_mention (not agent_call)" {
    [[ -n "$RUN_ID" ]] || fail "no run_id"

    local room_paths
    room_paths="$(jq -r 'select(.event == "stage_enter") | .payload.room_path' "$RUN_DIR/orchestrator.jsonl")"

    while read -r room_path; do
        local path
        path="$(jq -r '.invocation_path' "$room_path")"
        [[ "$path" == "at_mention" ]] || fail "room packet $room_path has invocation_path=$path (expected at_mention)"
    done <<< "$room_paths"
}
