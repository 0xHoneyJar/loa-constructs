#!/usr/bin/env bats
# cycle-005-compose-runner.bats — L8 e2e proof for construct-compose.sh (cycle-005 L1)
#
# Locks behavior of the composition runner:
#   - dry-run validates type compatibility without executing
#   - live run executes all stages sequentially, emits trajectory rows,
#     produces schema-valid final output, respects --run-id
#   - type-mismatch composition fails loud at the right stage
#   - three read-modes (glance / orient / intervene) behave per doctrine §14.3
#
# SEED: grimoires/loa-constructs-seed-2026-04-21/cycle-005-SEED-runtime-integration.md (AC-L8.*)

bats_require_minimum_version 1.5.0

RUNNER=".claude/scripts/construct-compose.sh"
VALIDATOR=".claude/scripts/stream-validate.sh"

setup() {
  TEST_COMPOSITIONS_DIR=$(mktemp -d /tmp/compose-test.XXXXXX)
  TEST_RUN_FILE=$(mktemp /tmp/compose-run.XXXXXX.jsonl)
  export LOA_TRAJECTORY_FILE="$TEST_RUN_FILE"
}

teardown() {
  rm -rf "$TEST_COMPOSITIONS_DIR"
  rm -f "$TEST_RUN_FILE"
}

@test "dry-run on feel-audit validates plan without executing" {
  before=$(wc -l < "$TEST_RUN_FILE" 2>/dev/null || echo 0)
  run "$RUNNER" feel-audit --target src/Button.tsx --dry-run
  [ "$status" -eq 0 ]
  echo "$output" | grep -q "composition=feel-audit"
  echo "$output" | grep -q "stage 1: artisan::decomposing-feel"
  echo "$output" | grep -q "stage 3: observer::analyzing-gaps"
  echo "$output" | grep -q "dry-run OK"
  after=$(wc -l < "$TEST_RUN_FILE" 2>/dev/null || echo 0)
  [ "$before" = "$after" ]
}

@test "live run on feel-audit executes 3 stages, emits 6 trajectory rows, final output is schema-valid Verdict" {
  RUN_ID="bats-$$-$(date +%s)"
  before=$(wc -l < "$TEST_RUN_FILE" 2>/dev/null || echo 0)
  run --separate-stderr "$RUNNER" feel-audit --target src/Button.tsx --run-id "$RUN_ID" --glance
  [ "$status" -eq 0 ]

  final_json="$output"
  # Final output MUST be a valid Verdict row with the overridden run_id
  echo "$final_json" | jq -e '.stream_type == "Verdict"' >/dev/null
  echo "$final_json" | jq -e --arg id "$RUN_ID" '.run_id == $id' >/dev/null

  # Validate against Verdict schema
  run "$VALIDATOR" Verdict "$final_json"
  [ "$status" -eq 0 ]

  # Trajectory delta must be 6 (3 entry + 3 exit)
  after=$(wc -l < "$TEST_RUN_FILE" 2>/dev/null || echo 0)
  delta=$((after - before))
  [ "$delta" -eq 6 ]

  # Session IDs paired: each entry's session_id appears in the next exit
  recent=$(tail -6 "$TEST_RUN_FILE")
  entries=$(echo "$recent" | jq -r 'select(.event=="entry") | .session_id' | sort)
  exits=$(echo "$recent"   | jq -r 'select(.event=="exit")  | .session_id' | sort)
  [ "$entries" = "$exits" ]
}

@test "type-mismatch composition fails at exact stage with clear error" {
  cat > "$TEST_COMPOSITIONS_DIR/broken.yaml" <<'YAML'
name: broken
chain:
  - stage: 1
    construct: artisan
    skill: decomposing-feel
    reads: [Artifact]
    writes: [Signal]
  - stage: 2
    construct: observer
    skill: analyzing-gaps
    reads: [Verdict]
    writes: [Verdict]
inputs:
  - type: Artifact
    name: target
YAML
  run "$RUNNER" broken --dry-run --compositions-dir "$TEST_COMPOSITIONS_DIR"
  [ "$status" -eq 2 ]
  echo "$output" | grep -q "type mismatch at stage 2"
  echo "$output" | grep -q "reads 'Verdict'"
}

@test "missing composition file exits 1 with legible error" {
  run "$RUNNER" nonexistent --dry-run --compositions-dir "$TEST_COMPOSITIONS_DIR"
  [ "$status" -eq 1 ]
  echo "$output" | grep -q "composition not found"
}

@test "orient read-mode prints per-stage timings to stderr" {
  run bash -c "$RUNNER feel-audit --target t.tsx --orient 2>&1 >/dev/null"
  [ "$status" -eq 0 ]
  echo "$output" | grep -q "run_id="
  echo "$output" | grep -q "stage 1:artisan/decomposing-feel"
  echo "$output" | grep -q "stage 3:observer/analyzing-gaps"
  echo "$output" | grep -q "final writes: Verdict"
}

@test "intervene read-mode emits structured JSON summary" {
  run bash -c "$RUNNER feel-audit --target t.tsx --intervene 2>&1 >/dev/null"
  [ "$status" -eq 0 ]
  # Extract JSON from output — it's the trailing JSON block on stderr
  # Grab the last JSON object from the output
  json=$(printf '%s\n' "$output" | awk '/^{/,/^}$/' | tail -n +1)
  echo "$json" | jq -e '.composition == "feel-audit"' >/dev/null
  echo "$json" | jq -e '.stages | length == 3' >/dev/null
  echo "$json" | jq -e '.final_type == "Verdict"' >/dev/null
}
