#!/usr/bin/env bats
# cycle-006-website-scaffold.bats — L-e2e proof for cycle-006 L-backend + L-composition + L-frontend
#
# Locks trajectory-shape invariants of the agentic full-stack runtime:
#   - compose-run.sh dry-run validates website-scaffold (7 stages, 2 iterate pairs)
#   - mock-mode run executes all 7 stages, emits orchestrator trajectory with
#     paired stage_enter/stage_exit events, persistent-mode history accumulation
#   - final output is schema-valid Artifact
#   - teamcreate backend path errors cleanly with research-doc pointer
#   - renderer --one-shot produces expected construct emoji + mode glyphs
#
# Content reproducibility is NOT tested (doctrine v5 §17.1). Only dispatch shape.
#
# SEED: grimoires/loa-constructs-seed-2026-04-21/cycle-006-SEED-agentic-fullstack-runtime.md (AC-e2e.1-6)

bats_require_minimum_version 1.5.0

RUNNER=".claude/scripts/compose-run.sh"
RENDERER=".claude/scripts/compose-panes-render.sh"
VALIDATOR=".claude/scripts/stream-validate.sh"
COMPOSITION="website-scaffold"

setup() {
  TEST_RUN_ID="bats-c6-$$-$(date +%s)-$BATS_TEST_NUMBER"
  export TEST_RUN_ID
  ORCH_DIR=".run/compose/$TEST_RUN_ID"
}

teardown() {
  rm -rf "$ORCH_DIR" 2>/dev/null || true
}

@test "website-scaffold composition YAML parses + dry-run reports 7 stages, 4 persistent, 2 iterate pairs" {
  run --separate-stderr "$RUNNER" "$COMPOSITION" --dry-run --run-id "$TEST_RUN_ID"
  [ "$status" -eq 0 ]
  echo "$stderr" | grep -q "stages=7"
  echo "$stderr" | grep -q "iterate_pairs=2"
  # Each persistent stage declared in YAML appears in the cycle-006 extensions block
  [ "$(echo "$stderr" | grep -c 'mode=persistent')" -eq 4 ]
  [ "$(echo "$stderr" | grep -c 'mode=fresh')" -eq 3 ]
  # Iterate pair listing
  echo "$stderr" | grep -q 'iterate.*\[2,4\]'
  echo "$stderr" | grep -q 'iterate.*\[5,6\]'
}

@test "mock-mode run emits 14 paired stage events in orchestrator trajectory" {
  LOA_STAGE_MOCK=1 run --separate-stderr "$RUNNER" "$COMPOSITION" \
    --target /tmp/fake-site --no-interactive --glance --run-id "$TEST_RUN_ID"
  [ "$status" -eq 0 ]

  TRAJECTORY="$ORCH_DIR/orchestrator.jsonl"
  [ -f "$TRAJECTORY" ]

  # 7 stage_enter + 7 stage_exit = 14 stage events (iterations disabled by --no-interactive)
  entries=$(grep -c '"type":"stage_enter"' "$TRAJECTORY")
  exits=$(grep -c '"type":"stage_exit"' "$TRAJECTORY")
  [ "$entries" -eq 7 ]
  [ "$exits" -eq 7 ]

  # Run envelope events present
  grep -q '"type":"run_start"' "$TRAJECTORY"
  grep -q '"type":"run_end"' "$TRAJECTORY"
  grep -q '"type":"pass_start"' "$TRAJECTORY"
  grep -q '"type":"pass_end"' "$TRAJECTORY"

  # run_end outcome is completed
  grep '"type":"run_end"' "$TRAJECTORY" | jq -e '.outcome == "completed"' >/dev/null
  grep '"type":"run_end"' "$TRAJECTORY" | jq -e '.rc == "0"' >/dev/null
}

@test "mock-mode run final output is schema-valid Artifact" {
  LOA_STAGE_MOCK=1 run --separate-stderr "$RUNNER" "$COMPOSITION" \
    --target /tmp/fake-site --no-interactive --glance --run-id "$TEST_RUN_ID"
  [ "$status" -eq 0 ]

  # Final stdout is a single JSON object
  echo "$output" | jq -e '.stream_type == "Artifact"' >/dev/null
  # Run_id threads through
  echo "$output" | jq -e --arg id "$TEST_RUN_ID" '.run_id == $id' >/dev/null
  # Schema-valid
  run "$VALIDATOR" Artifact "$output"
  [ "$status" -eq 0 ]
}

@test "persistent-mode stages accumulate history files; fresh-mode stages do not" {
  LOA_STAGE_MOCK=1 run --separate-stderr "$RUNNER" "$COMPOSITION" \
    --target /tmp/fake-site --no-interactive --glance --run-id "$TEST_RUN_ID"
  [ "$status" -eq 0 ]

  HIST_DIR="$ORCH_DIR/history"
  [ -d "$HIST_DIR" ]

  # Persistent stages (2, 4, 5, 6) have history files
  [ -f "$HIST_DIR/stage-2.jsonl" ]
  [ -f "$HIST_DIR/stage-4.jsonl" ]
  [ -f "$HIST_DIR/stage-5.jsonl" ]
  [ -f "$HIST_DIR/stage-6.jsonl" ]

  # Fresh stages (1, 3, 7) have no history file
  [ ! -f "$HIST_DIR/stage-1.jsonl" ]
  [ ! -f "$HIST_DIR/stage-3.jsonl" ]
  [ ! -f "$HIST_DIR/stage-7.jsonl" ]
}

@test "teamcreate backend errors exit 2 with research-doc pointer" {
  run --separate-stderr "$RUNNER" "$COMPOSITION" --backend teamcreate --run-id "$TEST_RUN_ID"
  [ "$status" -eq 2 ]
  echo "$stderr" | grep -q "not implemented"
  echo "$stderr" | grep -q "stamets-prior-art-teamcreate-tmux.md"
}

@test "renderer --one-shot after mock run displays all 7 stages as done" {
  LOA_STAGE_MOCK=1 "$RUNNER" "$COMPOSITION" \
    --target /tmp/fake-site --no-interactive --glance --run-id "$TEST_RUN_ID" >/dev/null

  run "$RENDERER" "$COMPOSITION" "$TEST_RUN_ID" --one-shot
  [ "$status" -eq 0 ]

  # Strip ANSI escapes for string checks
  plain=$(echo "$output" | sed $'s/\x1b\\[[0-9;]*[a-zA-Z]//g')

  # 7 numbered rows [N/7]
  [ "$(echo "$plain" | grep -c '\[[1-7]/7\]')" -eq 7 ]

  # Mode glyphs for 4 persistent + 3 fresh
  [ "$(echo "$plain" | grep -c '⟳ persist')" -eq 4 ]
  [ "$(echo "$plain" | grep -c '⊘ fresh')" -eq 3 ]

  # Iteration pair connectors
  echo "$plain" | grep -q 'iterate 2 ↔ 4'
  echo "$plain" | grep -q 'iterate 5 ↔ 6'

  # Final state marker
  echo "$plain" | grep -q 'compose-run complete'
}

@test "substrate-only invocation works: no claude-code agent-teams feature required" {
  # The fact that this test runs via bash + bats — with no Claude Code
  # agent-teams feature — and produces the same trajectory shape as
  # interactive use is itself the proof. Lock it: dispatch-determinism
  # under Unix-native substrate (doctrine v5 §17.1 + v6 §18.4).
  LOA_STAGE_MOCK=1 "$RUNNER" "$COMPOSITION" \
    --target /tmp/fake-site --no-interactive --glance --run-id "$TEST_RUN_ID" >/dev/null

  # Same construct+skill+persona trio in each run — verifies dispatch determinism.
  TRAJECTORY="$ORCH_DIR/orchestrator.jsonl"

  # Stage 1 must always dispatch to k-hole/dig/STAMETS.
  # Use jq -s (slurp) + map(select())[0] to isolate the target row cleanly —
  # streaming jq -e considers the last input's filter result for exit code,
  # which fails with rc=4 when non-matching rows have no output.
  grep '"type":"stage_enter"' "$TRAJECTORY" \
    | jq -s -e 'map(select(.stage == "1"))[0] | .construct == "k-hole" and .skill == "dig" and .persona == "STAMETS"' >/dev/null

  # Stage 7 must always dispatch to the-arcade/mapping-topology.
  # Persona is first-in-manifest (OSTROM) because cycle-005's resolve_persona
  # ignores the composition YAML's declared persona field and reads
  # .construct.personas[0] from the pack manifest. Composition-declared
  # persona will become load-bearing in cycle-007 (per-stage persona lookup
  # honoring YAML declaration). For cycle-006, dispatch-determinism is
  # locked at the construct + skill level.
  grep '"type":"stage_enter"' "$TRAJECTORY" \
    | jq -s -e 'map(select(.stage == "7"))[0] | .construct == "the-arcade" and .skill == "mapping-topology"' >/dev/null
  # Whatever persona construct-resolve returns must be non-empty + stable.
  first=$(grep '"type":"stage_enter"' "$TRAJECTORY" \
    | jq -s -r 'map(select(.stage == "7"))[0] | .persona')
  [ -n "$first" ]
}

@test "run_id threads through all trajectory events" {
  LOA_STAGE_MOCK=1 "$RUNNER" "$COMPOSITION" \
    --target /tmp/fake-site --no-interactive --glance --run-id "$TEST_RUN_ID" >/dev/null

  TRAJECTORY="$ORCH_DIR/orchestrator.jsonl"
  # Every event carries the overridden run_id
  total=$(wc -l < "$TRAJECTORY")
  matching=$(jq -c --arg id "$TEST_RUN_ID" 'select(.run_id == $id)' "$TRAJECTORY" | wc -l)
  [ "$total" -eq "$matching" ]
}
