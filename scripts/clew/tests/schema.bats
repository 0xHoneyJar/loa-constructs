#!/usr/bin/env bats
# Task 1.2 — schema unit + rejection tests (mandatory test #5).
# Exercised through ledger_append (exit 2 == schema-invalid, no append).

load helper
setup()    { clew_setup; }
teardown() { clew_teardown; }

@test "valid seed line passes and is appended" {
  run bash "$LEDGER_APPEND" smol-comms-register "$(seed_line)"
  [ "$status" -eq 0 ]
  [ -f "$(ledger_file smol-comms-register)" ]
  run wc -l < "$(ledger_file smol-comms-register)"
  [ "${output// /}" -eq 1 ]
}

@test "integer line_hint is rejected (FR-1: line_hint is a text snippet, never coordinates)" {
  local bad
  bad="$(python3 -c 'import json,sys;d=json.loads(sys.argv[1]);d["target"]["line_hint"]=42;print(json.dumps(d))' "$(seed_line)")"
  run bash "$LEDGER_APPEND" smol-comms-register "$bad"
  [ "$status" -eq 2 ]
  [ ! -s "$(ledger_file smol-comms-register)" 2>/dev/null ] || [ ! -f "$(ledger_file smol-comms-register)" ]
}

@test "missing target.construct is rejected" {
  local bad
  bad="$(python3 -c 'import json,sys;d=json.loads(sys.argv[1]);del d["target"]["construct"];print(json.dumps(d))' "$(seed_line)")"
  run bash "$LEDGER_APPEND" smol-comms-register "$bad"
  [ "$status" -eq 2 ]
}

@test "unknown extra key is rejected (additionalProperties:false)" {
  local bad
  bad="$(python3 -c 'import json,sys;d=json.loads(sys.argv[1]);d["bogus"]=1;print(json.dumps(d))' "$(seed_line)")"
  run bash "$LEDGER_APPEND" smol-comms-register "$bad"
  [ "$status" -eq 2 ]
}

@test "wrong tier const is rejected" {
  local bad
  bad="$(python3 -c 'import json,sys;d=json.loads(sys.argv[1]);d["tier"]="project";print(json.dumps(d))' "$(seed_line)")"
  run bash "$LEDGER_APPEND" smol-comms-register "$bad"
  [ "$status" -eq 2 ]
}

@test "malformed JSON is rejected (not appended)" {
  run bash "$LEDGER_APPEND" smol-comms-register '{not json'
  [ "$status" -eq 2 ]
}
