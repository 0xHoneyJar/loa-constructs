#!/usr/bin/env bats
# Sprint 1 (S1-T6) — bats wrapper exercising the stream-graph validator
# against the fixture matrix at tests/composition/validators/fixtures/.
#
# Run via: bats tests/composition/validators/run.bats
#
# Sprint 1 covers FIVE error classes:
#   [STREAM-NO-PRODUCER]       fixture: stream-no-producer.invalid.yaml
#   [STREAM-SCHEMA-MISMATCH]   fixture: stream-schema-mismatch.invalid.yaml
#   [STAGE-OUT-OF-DOMAIN]      fixture: stage-out-of-domain.invalid.yaml   (S1-T4)
#   [ITERATION-NO-MAX]         fixture: iterate-no-max.invalid.yaml
#   [ITERATION-NO-TERMINATION] fixture: iterate-no-termination.invalid.yaml (S1-T6)
#
# The sixth S1-T1 acceptance class — [ENVELOPE-CHAIN-BROKEN] — is the
# natural responsibility of envelope-chain.sh in Sprint 2 and gains its
# fixture there.

setup() {
  REPO_ROOT="$(cd "${BATS_TEST_DIRNAME:-tests/composition/validators}/../../.." && pwd)"
  VALIDATOR="$REPO_ROOT/.claude/scripts/lib/compose-stream-graph.sh"
  FIXTURE_DIR="$REPO_ROOT/tests/composition/validators/fixtures"
}

@test "golden-path: validator accepts (exit 0, errors[] empty)" {
  run "$VALIDATOR" "$FIXTURE_DIR/golden-path.valid.yaml"
  [ "$status" -eq 0 ]
  [[ "$output" == *'"ok": true'* ]]
}

@test "stream-no-producer: validator rejects with [STREAM-NO-PRODUCER]" {
  run "$VALIDATOR" "$FIXTURE_DIR/stream-no-producer.invalid.yaml"
  [ "$status" -eq 1 ]
  [[ "$output" == *'[STREAM-NO-PRODUCER]'* ]]
}

@test "stream-schema-mismatch: validator rejects with [STREAM-SCHEMA-MISMATCH]" {
  run "$VALIDATOR" "$FIXTURE_DIR/stream-schema-mismatch.invalid.yaml"
  [ "$status" -eq 1 ]
  [[ "$output" == *'[STREAM-SCHEMA-MISMATCH]'* ]]
}

@test "stage-out-of-domain: validator rejects with [STAGE-OUT-OF-DOMAIN]" {
  run "$VALIDATOR" "$FIXTURE_DIR/stage-out-of-domain.invalid.yaml"
  [ "$status" -eq 1 ]
  [[ "$output" == *'[STAGE-OUT-OF-DOMAIN]'* ]]
}

@test "stage-out-of-domain: --no-domain-check skips the gate" {
  run "$VALIDATOR" "$FIXTURE_DIR/stage-out-of-domain.invalid.yaml" --no-domain-check
  # With domain check disabled, this fixture has no other defects — should pass.
  [ "$status" -eq 0 ]
  [[ "$output" == *'"ok": true'* ]]
}

@test "iterate-no-max: validator rejects with both [ITERATION-NO-MAX] and [ITERATION-NO-TERMINATION]" {
  run "$VALIDATOR" "$FIXTURE_DIR/iterate-no-max.invalid.yaml"
  [ "$status" -eq 1 ]
  [[ "$output" == *'[ITERATION-NO-MAX]'* ]]
  [[ "$output" == *'[ITERATION-NO-TERMINATION]'* ]]
}

@test "iterate-no-termination: validator rejects with [ITERATION-NO-TERMINATION] only" {
  run "$VALIDATOR" "$FIXTURE_DIR/iterate-no-termination.invalid.yaml"
  [ "$status" -eq 1 ]
  [[ "$output" == *'[ITERATION-NO-TERMINATION]'* ]]
  # max_iterations IS present in this fixture, so [ITERATION-NO-MAX] MUST NOT fire.
  [[ "$output" != *'[ITERATION-NO-MAX]'* ]]
}

@test "validator emits valid JSON for every fixture" {
  for fixture in "$FIXTURE_DIR"/*.yaml; do
    run "$VALIDATOR" "$fixture"
    [ "$status" -eq 0 ] || [ "$status" -eq 1 ]
    echo "$output" | python3 -c "import json,sys; json.loads(sys.stdin.read())"
  done
}
