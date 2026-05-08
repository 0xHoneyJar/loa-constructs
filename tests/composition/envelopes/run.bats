#!/usr/bin/env bats
# Sprint 2 (S2-T6) — envelope hash chain bats matrix.
#
# Run via: bats tests/composition/envelopes/run.bats
#
# Covers:
#   S2-T1 envelope-builder.sh    — invocation + handoff envelope construction
#   S2-T2 envelope-chain.sh      — two-pass self-hash + chain validation
#   S2-T3 composition_id         — deterministic derivation
#   S2-T4 compose-dry-run.sh     — full envelope preview report
#   S2-T6 [ENVELOPE-CHAIN-BROKEN]— tampering sentinel (closes Sprint 1 deferral)

setup() {
  REPO_ROOT="$(cd "${BATS_TEST_DIRNAME:-tests/composition/envelopes}/../../.." && pwd)"
  CHAIN="$REPO_ROOT/.claude/scripts/lib/envelope-chain.sh"
  BUILDER="$REPO_ROOT/.claude/scripts/lib/envelope-builder.sh"
  DRYRUN="$REPO_ROOT/.claude/scripts/lib/compose-dry-run.sh"
  FIXTURE_DIR="$REPO_ROOT/tests/composition/envelopes/fixtures"
  GOLDEN_PATH="$REPO_ROOT/tests/composition/validators/fixtures/golden-path.valid.yaml"
  TMPDIR_FIX="$(mktemp -d)"
  export TMPDIR_FIX
}

teardown() {
  rm -rf "$TMPDIR_FIX"
}

# --- composition_id (S2-T3) ---------------------------------------------------

@test "composition_id is deterministic for the same content" {
  run "$CHAIN" compose-id --composition "$GOLDEN_PATH"
  [ "$status" -eq 0 ]
  id1="$output"
  run "$CHAIN" compose-id --composition "$GOLDEN_PATH"
  id2="$output"
  [ "$id1" = "$id2" ]
}

@test "composition_id changes across content (different fixtures)" {
  run "$CHAIN" compose-id --composition "$GOLDEN_PATH"
  id_golden="$output"
  run "$CHAIN" compose-id --composition "$REPO_ROOT/tests/composition/validators/fixtures/iterate-no-max.invalid.yaml"
  id_iter="$output"
  [ "$id_golden" != "$id_iter" ]
}

@test "composition_id format matches schema regex" {
  run "$CHAIN" compose-id --composition "$GOLDEN_PATH"
  [[ "$output" =~ ^[A-Za-z0-9_./-]+@sha256:[0-9a-f]{12,64}$ ]]
}

# --- two-pass self-hash (S2-T2) ----------------------------------------------

@test "self-hash is idempotent across populated/unpopulated states" {
  cat > "$TMPDIR_FIX/inv.json" <<'EOF'
{
  "schema_version": "loa.construct.invocation.v0",
  "stage_id": "test.stage-1",
  "stage_pass": 1,
  "construct_slug": "test",
  "prev_hash": null
}
EOF
  run "$CHAIN" self-hash --envelope "$TMPDIR_FIX/inv.json"
  [ "$status" -eq 0 ]
  hash1="$output"
  jq --arg h "$hash1" '.invocation_hash = $h' "$TMPDIR_FIX/inv.json" > "$TMPDIR_FIX/inv2.json"
  run "$CHAIN" self-hash --envelope "$TMPDIR_FIX/inv2.json"
  hash2="$output"
  [ "$hash1" = "$hash2" ]
}

# --- envelope construction (S2-T1) -------------------------------------------

@test "envelope-builder constructs valid invocation envelope" {
  run "$BUILDER" invocation \
    --composition "$GOLDEN_PATH" \
    --stage 1 \
    --run-id "test_run_001" \
    --quiet \
    --out "$TMPDIR_FIX/inv.json"
  [ "$status" -eq 0 ]
  [ -f "$TMPDIR_FIX/inv.json" ]
  # Required fields per SDD §3.1
  jq -e '.schema_version == "loa.construct.invocation.v0"' "$TMPDIR_FIX/inv.json" >/dev/null
  jq -e '.run_id == "test_run_001"' "$TMPDIR_FIX/inv.json" >/dev/null
  jq -e '.composition_id | startswith("golden-path.valid.yaml@sha256:")' "$TMPDIR_FIX/inv.json" >/dev/null
  jq -e '.prev_hash == null' "$TMPDIR_FIX/inv.json" >/dev/null
  jq -e '.invocation_hash | startswith("sha256:")' "$TMPDIR_FIX/inv.json" >/dev/null
}

@test "envelope-builder constructs valid handoff envelope linked to invocation" {
  "$BUILDER" invocation \
    --composition "$GOLDEN_PATH" \
    --stage 1 \
    --run-id "test_run_001" \
    --quiet \
    --out "$TMPDIR_FIX/inv.json"
  inv_hash=$(jq -r '.invocation_hash' "$TMPDIR_FIX/inv.json")

  run "$BUILDER" handoff \
    --invocation "$TMPDIR_FIX/inv.json" \
    --status success \
    --outputs '[{"type":"Signal","uri":"/tmp/x","schema_id":"loa.stream.Signal.v1","hash":"sha256:abc","domain":{"primary":"design","produced_by":"artisan"}}]' \
    --summary "test" \
    --quiet \
    --out "$TMPDIR_FIX/handoff.json"
  [ "$status" -eq 0 ]
  # Handoff's prev_hash MUST equal the paired invocation's invocation_hash.
  prev=$(jq -r '.prev_hash' "$TMPDIR_FIX/handoff.json")
  [ "$prev" = "$inv_hash" ]
}

@test "envelope-builder rejects status=success with error populated" {
  "$BUILDER" invocation \
    --composition "$GOLDEN_PATH" \
    --stage 1 \
    --run-id "test_run_001" \
    --quiet \
    --out "$TMPDIR_FIX/inv.json"

  run "$BUILDER" handoff \
    --invocation "$TMPDIR_FIX/inv.json" \
    --status success \
    --error '{"code":"[X]","message":"forbidden","recoverable":false}' \
    --quiet
  [ "$status" -eq 1 ]
  [[ "$output" == *"forbids"* ]] || [[ "$output" == *"CONTRACT"* ]]
}

@test "envelope-builder rejects failure status without error block" {
  "$BUILDER" invocation \
    --composition "$GOLDEN_PATH" \
    --stage 1 \
    --run-id "test_run_001" \
    --quiet \
    --out "$TMPDIR_FIX/inv.json"

  run "$BUILDER" handoff \
    --invocation "$TMPDIR_FIX/inv.json" \
    --status failure \
    --quiet
  [ "$status" -eq 1 ]
  [[ "$output" == *"requires error"* ]] || [[ "$output" == *"CONTRACT"* ]]
}

# --- chain validation (S2-T2 + S2-T5) ----------------------------------------

@test "chain validation accepts a valid 2-envelope chain" {
  "$BUILDER" invocation \
    --composition "$GOLDEN_PATH" --stage 1 --run-id "r1" --quiet \
    --out "$TMPDIR_FIX/stage-1.invocation.json"

  "$BUILDER" handoff \
    --invocation "$TMPDIR_FIX/stage-1.invocation.json" \
    --status success \
    --outputs '[{"type":"Signal","uri":"/tmp/x","schema_id":"loa.stream.Signal.v1","hash":"sha256:abc","domain":{"primary":"design","produced_by":"artisan"}}]' \
    --summary "ok" \
    --quiet \
    --out "$TMPDIR_FIX/stage-1.handoff.json"

  run "$CHAIN" validate --envelopes \
    "$TMPDIR_FIX/stage-1.invocation.json" "$TMPDIR_FIX/stage-1.handoff.json"
  [ "$status" -eq 0 ]
  [[ "$output" == *'"ok": true'* ]]
}

# --- [ENVELOPE-CHAIN-BROKEN] sentinel — closes Sprint 1 deferral -------------

@test "[ENVELOPE-CHAIN-BROKEN] fires on single-byte tamper of handoff body" {
  "$BUILDER" invocation \
    --composition "$GOLDEN_PATH" --stage 1 --run-id "r1" --quiet \
    --out "$TMPDIR_FIX/stage-1.invocation.json"

  "$BUILDER" handoff \
    --invocation "$TMPDIR_FIX/stage-1.invocation.json" \
    --status success \
    --outputs '[{"type":"Signal","uri":"/tmp/x","schema_id":"loa.stream.Signal.v1","hash":"sha256:abc","domain":{"primary":"design","produced_by":"artisan"}}]' \
    --summary "ok" \
    --quiet \
    --out "$TMPDIR_FIX/stage-1.handoff.json"

  # Tamper: change a non-hash field
  jq '.summary.text = "tampered"' "$TMPDIR_FIX/stage-1.handoff.json" > "$TMPDIR_FIX/x" && mv "$TMPDIR_FIX/x" "$TMPDIR_FIX/stage-1.handoff.json"

  run "$CHAIN" validate --envelopes \
    "$TMPDIR_FIX/stage-1.invocation.json" "$TMPDIR_FIX/stage-1.handoff.json"
  [ "$status" -eq 1 ]
  [[ "$output" == *'[ENVELOPE-CHAIN-BROKEN]'* ]]
  [[ "$output" == *"self-hash mismatch"* ]]
}

@test "[ENVELOPE-CHAIN-BROKEN] fires when handoff prev_hash diverges from paired invocation" {
  "$BUILDER" invocation \
    --composition "$GOLDEN_PATH" --stage 1 --run-id "r1" --quiet \
    --out "$TMPDIR_FIX/stage-1.invocation.json"

  "$BUILDER" handoff \
    --invocation "$TMPDIR_FIX/stage-1.invocation.json" \
    --status success \
    --outputs '[{"type":"Signal","uri":"/tmp/x","schema_id":"loa.stream.Signal.v1","hash":"sha256:abc","domain":{"primary":"design","produced_by":"artisan"}}]' \
    --summary "ok" \
    --quiet \
    --out "$TMPDIR_FIX/stage-1.handoff.json"

  # Tamper prev_hash + recompute handoff_hash so self-hash passes but linkage fails.
  jq '.prev_hash = "sha256:0000000000000000000000000000000000000000000000000000000000000000"' \
    "$TMPDIR_FIX/stage-1.handoff.json" > "$TMPDIR_FIX/x"
  new_hash=$(python3 -c '
import sys, json, hashlib
e = json.load(open(sys.argv[1]))
e.pop("handoff_hash", None)
canonical = json.dumps(e, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()
print("sha256:" + hashlib.sha256(canonical).hexdigest())
' "$TMPDIR_FIX/x")
  jq --arg h "$new_hash" '.handoff_hash = $h' "$TMPDIR_FIX/x" > "$TMPDIR_FIX/stage-1.handoff.json"

  run "$CHAIN" validate --envelopes \
    "$TMPDIR_FIX/stage-1.invocation.json" "$TMPDIR_FIX/stage-1.handoff.json"
  [ "$status" -eq 1 ]
  [[ "$output" == *'[ENVELOPE-CHAIN-BROKEN]'* ]]
  [[ "$output" == *"prev_hash"* ]]
}

# --- dry-run (S2-T4) ---------------------------------------------------------

@test "dry-run produces schema-valid output for golden path" {
  run "$DRYRUN" "$GOLDEN_PATH"
  [ "$status" -eq 0 ]
  echo "$output" > "$TMPDIR_FIX/dr.json"
  python3 -c "
import json, jsonschema
schema = json.loads(open('$REPO_ROOT/.claude/data/dry-run-fixture.schema.json').read())
data = json.loads(open('$TMPDIR_FIX/dr.json').read())
jsonschema.validate(instance=data, schema=schema)
print('SCHEMA VALID')
"
}

@test "dry-run errors[] is empty for a valid composition (CI gate condition)" {
  run "$DRYRUN" "$GOLDEN_PATH"
  [ "$status" -eq 0 ]
  echo "$output" | python3 -c "
import json, sys
d = json.loads(sys.stdin.read())
assert d['errors'] == [], f'errors should be empty, got {d[\"errors\"]}'
"
}

@test "dry-run errors[] is non-empty for a known-bad composition" {
  run "$DRYRUN" "$REPO_ROOT/tests/composition/validators/fixtures/stream-no-producer.invalid.yaml"
  [ "$status" -eq 1 ]
  echo "$output" | python3 -c "
import json, sys
d = json.loads(sys.stdin.read())
assert len(d['errors']) > 0, 'errors should be non-empty for bad fixture'
codes = [e['code'] for e in d['errors']]
assert '[STREAM-NO-PRODUCER]' in codes, f'expected [STREAM-NO-PRODUCER] in codes, got {codes}'
"
}
