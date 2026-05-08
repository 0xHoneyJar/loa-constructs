#!/usr/bin/env bats
# Sprint 1 (S1-T6) — bats wrapper exercising the stream-graph validator
# against the fixture matrix at tests/composition/validators/fixtures/.
#
# Run via: bats tests/composition/validators/run.bats
#
# Sprint 1 cut covers four error classes: STREAM-NO-PRODUCER, STREAM-SCHEMA-MISMATCH,
# ITERATION-NO-MAX, ITERATION-NO-TERMINATION. The remaining two from S1-T1
# acceptance (STAGE-OUT-OF-DOMAIN, ENVELOPE-CHAIN-BROKEN) land in follow-on
# Sprint 1 + Sprint 2 work and gain their own fixtures then.

setup() {
  # Resolve repo root from BATS_TEST_DIRNAME (tests/composition/validators/).
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

@test "iterate-no-max: validator rejects with both [ITERATION-NO-MAX] and [ITERATION-NO-TERMINATION]" {
  run "$VALIDATOR" "$FIXTURE_DIR/iterate-no-max.invalid.yaml"
  [ "$status" -eq 1 ]
  [[ "$output" == *'[ITERATION-NO-MAX]'* ]]
  [[ "$output" == *'[ITERATION-NO-TERMINATION]'* ]]
}

@test "validator emits valid JSON for every fixture" {
  for fixture in "$FIXTURE_DIR"/*.yaml; do
    run "$VALIDATOR" "$fixture"
    # Exit code may be 0 or 1 depending on fixture intent; both should produce valid JSON
    [ "$status" -eq 0 ] || [ "$status" -eq 1 ]
    echo "$output" | python3 -c "import json,sys; json.loads(sys.stdin.read())"
  done
}
