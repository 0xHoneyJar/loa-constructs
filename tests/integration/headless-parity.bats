#!/usr/bin/env bats
# =============================================================================
# headless-parity.bats — T5 acceptance (Headless Parity)
# =============================================================================
# Cycle: simstim-20260509-aead9136 (Sprint 4, S4-T3)
# PRD: §8.5 T5
# SDD: §2.6.3
#
# Validates handoff-parity-check.sh:
#   - Native ↔ headless pair with allowed-only diffs → exit 0
#   - Substantive divergence → exit 1
#   - Strict mode treats allowed diffs as failures
#   - Missing input → exit 2
# =============================================================================

fail() {
    echo "FAIL: $*" >&2
    return 1
}

setup() {
    PROJECT_ROOT="$(cd "$BATS_TEST_DIRNAME/../.." && pwd)"
    cd "$PROJECT_ROOT"
    PARITY="$PROJECT_ROOT/.claude/scripts/handoff-parity-check.sh"
    NATIVE="$PROJECT_ROOT/tests/fixtures/handoff-packets/parity-pair/native-artisan-stage0.json"
    HEADLESS="$PROJECT_ROOT/tests/fixtures/handoff-packets/parity-pair/headless-artisan-stage0.json"

    [[ -f "$PARITY" ]] || skip "handoff-parity-check.sh not found"
    [[ -f "$NATIVE" ]] || skip "native fixture not found"
    [[ -f "$HEADLESS" ]] || skip "headless fixture not found"
}

@test "T5: native ↔ headless pair with allowed-only diffs returns exit 0" {
    run "$PARITY" "$NATIVE" "$HEADLESS" --json
    [[ "$status" -eq 0 ]] || fail "expected exit 0, got $status; output: $output"
    local ok
    ok="$(echo "$output" | jq -r '.ok')"
    [[ "$ok" == "true" ]] || fail "expected ok=true, got $ok"
    local substantive
    substantive="$(echo "$output" | jq -r '.substantive_diffs | length')"
    [[ "$substantive" == "0" ]] || fail "expected 0 substantive diffs, got $substantive"
}

@test "T5: only runtime-specific fields differ" {
    run "$PARITY" "$NATIVE" "$HEADLESS" --json
    [[ "$status" -eq 0 ]] || fail "parity check failed: $output"

    local fields
    fields="$(echo "$output" | jq -r '.allowed_diffs[].field' | sort)"

    grep -q "^agent_id$" <<< "$fields" || fail "agent_id should appear in allowed_diffs"
    grep -q "^transcript_path$" <<< "$fields" || fail "transcript_path should appear in allowed_diffs"
    grep -q "^invocation_mode$" <<< "$fields" || fail "invocation_mode should appear in allowed_diffs"
}

@test "T5: substantive divergence returns exit 1" {
    local tampered
    tampered="$(mktemp /tmp/tampered-handoff.XXXXXX.json)"
    python3 -c "import json,sys; d=json.load(open('$HEADLESS')); d['verdict']['score']=2; json.dump(d, open(sys.argv[1],'w'))" "$tampered"

    run "$PARITY" "$NATIVE" "$tampered"
    rm -f "$tampered"

    [[ "$status" -eq 1 ]] || fail "expected exit 1 on substantive diff, got $status"
}

@test "T5: strict mode treats allowed diffs as substantive" {
    run "$PARITY" "$NATIVE" "$HEADLESS" --strict
    [[ "$status" -eq 1 ]] || fail "expected --strict to fail on runtime-only diffs, got exit $status"
}

@test "T5: missing input file returns exit 2" {
    run "$PARITY" "$NATIVE" "/tmp/nonexistent-headless-packet.json"
    [[ "$status" -eq 2 ]] || fail "expected exit 2 for missing input, got $status"
}

@test "T5: identical packets parity-pass with zero diffs" {
    local copy
    copy="$(mktemp /tmp/copy-of-native.XXXXXX.json)"
    cp "$NATIVE" "$copy"

    run "$PARITY" "$NATIVE" "$copy" --json
    rm -f "$copy"

    [[ "$status" -eq 0 ]] || fail "identical packets should parity-pass; got $status"
    local total
    total="$(echo "$output" | jq -r '.allowed_diffs + .substantive_diffs | length')"
    [[ "$total" == "0" ]] || fail "identical packets should have 0 diffs, got $total"
}

@test "T5: invalid JSON returns exit 2" {
    local bad
    bad="$(mktemp /tmp/bad-json.XXXXXX.json)"
    echo "not json {{{" > "$bad"

    run "$PARITY" "$NATIVE" "$bad"
    rm -f "$bad"

    [[ "$status" -eq 2 ]] || fail "expected exit 2 for invalid JSON, got $status"
}
