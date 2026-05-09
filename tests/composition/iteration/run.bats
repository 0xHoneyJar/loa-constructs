#!/usr/bin/env bats
# Sprint 5 (S5-T5..T8) — iteration auditor.
#
# Run via: bats tests/composition/iteration/run.bats
#
# Covers:
#   S5-T5 Phase 1 (enumerate) — walks compositions, reports iterate: compliance
#   S5-T8 iteration validation (FR-7.2: max_iterations + terminate_when required)
#
# Phase 2 (dual-run with L1/L2/L3 diff) ships a stub here; full live integration
# is Sprint 5b once Sprint 3+4 executors support both persistent_leak +
# stream_edge semantics.

setup() {
  REPO_ROOT="$(cd "${BATS_TEST_DIRNAME:-tests/composition/iteration}/../../.." && pwd -P)"
  AUDIT="$REPO_ROOT/.claude/scripts/lib/compose-iteration-audit.sh"
  TMPDIR_FIX="$(mktemp -d)"
  mkdir -p "$TMPDIR_FIX/compositions"
}

teardown() {
  [[ -d "$TMPDIR_FIX" ]] && find "$TMPDIR_FIX" -delete 2>/dev/null || true
}

# --- Phase 1: enumerate (S5-T5) ----------------------------------------------

@test "enumerate: empty root → no findings + exit 0" {
  run "$AUDIT" --phase enumerate --root "$TMPDIR_FIX" --json
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '.compositions_with_iterate == 0' >/dev/null
  echo "$output" | jq -e '.violations | length == 0' >/dev/null
}

@test "enumerate: compliant composition (max + terminate present) → exit 0" {
  cat > "$TMPDIR_FIX/compositions/compliant.yaml" <<'YML'
schema_version: "1.2"
kind: workflow
name: compliant
description: iterate with both required fields
intent: test fixture
iterate:
  - [1, 2]
max_iterations: 5
terminate_when: "score >= threshold"
chain:
  - stage: 1
    construct: artisan
    skill: decomposing-feel
  - stage: 2
    construct: observer
    skill: observing-users
YML
  run "$AUDIT" --phase enumerate --root "$TMPDIR_FIX" --json
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '.compositions_with_iterate == 1' >/dev/null
  echo "$output" | jq -e '.compliant == 1' >/dev/null
  echo "$output" | jq -e '.violations | length == 0' >/dev/null
}

@test "enumerate: non-compliant composition (missing terminate_when) → exit 1" {
  cat > "$TMPDIR_FIX/compositions/no-term.yaml" <<'YML'
schema_version: "1.2"
kind: workflow
name: no-term
description: iterate with max but no terminate_when
intent: test fixture
iterate:
  - [1, 2]
max_iterations: 5
chain:
  - stage: 1
    construct: artisan
    skill: decomposing-feel
  - stage: 2
    construct: observer
    skill: observing-users
YML
  run "$AUDIT" --phase enumerate --root "$TMPDIR_FIX" --json
  [ "$status" -eq 1 ]
  echo "$output" | jq -e '.violations | length == 1' >/dev/null
  echo "$output" | jq -e '.violations[0].has_terminate_when == false' >/dev/null
}

@test "enumerate: detects iteration_mode flag (default persistent_leak)" {
  cat > "$TMPDIR_FIX/compositions/with-mode.yaml" <<'YML'
schema_version: "1.2"
kind: workflow
name: with-mode
description: iterate with explicit stream_edge mode
intent: test fixture
iterate: [[1, 2]]
max_iterations: 5
terminate_when: "done"
iteration_mode: stream_edge
chain:
  - stage: 1
    construct: artisan
  - stage: 2
    construct: observer
YML
  run "$AUDIT" --phase enumerate --root "$TMPDIR_FIX" --json
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '.all_compositions[0].iteration_mode == "stream_edge"' >/dev/null
}

@test "enumerate: composition without iterate: block is silently ignored" {
  cat > "$TMPDIR_FIX/compositions/no-iterate.yaml" <<'YML'
schema_version: "1.2"
kind: workflow
name: no-iterate
description: no iteration
intent: test fixture
chain:
  - stage: 1
    construct: artisan
YML
  run "$AUDIT" --phase enumerate --root "$TMPDIR_FIX" --json
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '.compositions_with_iterate == 0' >/dev/null
}

# --- Phase 2: dual-run stub (S5-T6 partial) ---------------------------------

@test "dual-run stub: emits scope note + L1/L2/L3 layered table" {
  cat > "$TMPDIR_FIX/compositions/dr.yaml" <<'YML'
schema_version: "1.2"
kind: workflow
name: dr
description: dual-run target
intent: test fixture
iterate: [[1, 2]]
max_iterations: 3
terminate_when: "done"
chain:
  - stage: 1
    construct: artisan
    skill: decomposing-feel
  - stage: 2
    construct: observer
    skill: observing-users
YML
  run "$AUDIT" --phase dual-run --composition "$TMPDIR_FIX/compositions/dr.yaml" --json
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '.phase == "dual-run"' >/dev/null
  echo "$output" | jq -e '.diff_layers | length == 3' >/dev/null
  # L1 + L2 are gating; L3 is informational.
  echo "$output" | jq -e '.diff_layers[0].gate == true' >/dev/null  # L1
  echo "$output" | jq -e '.diff_layers[1].gate == true' >/dev/null  # L2
  echo "$output" | jq -e '.diff_layers[2].gate == false' >/dev/null # L3
  echo "$output" | jq -e '.scope_note | contains("Sprint 5b")' >/dev/null
}
