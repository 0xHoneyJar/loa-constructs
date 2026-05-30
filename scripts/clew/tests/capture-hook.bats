#!/usr/bin/env bats
# Task 1.5 — `>>clew` capture hook: marker parsing, explicit-slug capture,
# bare-marker refusal (no silent wrong-ledger write), verbatim preservation.

load helper
setup()    { clew_setup; }
teardown() { clew_teardown; }

@test "explicit marker captures exactly one line to the named construct" {
  run bash "$CAPTURE_HOOK" '>>clew@smol-comms-register: agents should use normal casing'
  [ "$status" -eq 0 ]
  local f; f="$(ledger_file smol-comms-register)"
  [ -f "$f" ]
  run wc -l < "$f"
  [ "${output// /}" -eq 1 ]
}

@test "captured line is schema-valid and preserves the verbatim trigger" {
  bash "$CAPTURE_HOOK" '>>clew@smol-comms-register: keep "quotes" and $vars verbatim'
  local f; f="$(ledger_file smol-comms-register)"
  run python3 -c '
import json,sys
d=json.loads(open(sys.argv[1]).readline())
assert d["tier"]=="construct", d["tier"]
assert d["target"]["construct"]=="smol-comms-register"
assert d["target"]["skill_slug"]=="smol-comms-register"
assert d["captured_by"]=="clew-marker"
assert d["trigger"]=="keep \"quotes\" and $vars verbatim", d["trigger"]
print("ok")' "$f"
  [ "$status" -eq 0 ]
  [ "$output" = "ok" ]
}

@test "construct/skill form sets a distinct skill_slug" {
  bash "$CAPTURE_HOOK" '>>clew@observer/observing-users: the diagnostic skipped step 3'
  local f; f="$(ledger_file observer)"
  [ -f "$f" ]
  run python3 -c 'import json,sys;d=json.loads(open(sys.argv[1]).readline());print(d["target"]["construct"],d["target"]["skill_slug"])' "$f"
  [ "$output" = "observer observing-users" ]
}

@test "bare '>>clew:' without a construct does NOT capture (FR-2: no silent wrong-ledger write)" {
  run bash "$CAPTURE_HOOK" '>>clew: I noticed something but did not say where'
  [ "$status" -eq 0 ]
  # nothing written anywhere under the test root
  run find "$TEST_ROOT" -name LEARNINGS.jsonl
  [ -z "$output" ]
}

@test "prompt without a marker is a silent pass-through (no capture)" {
  run bash "$CAPTURE_HOOK" 'just a normal prompt with no marker'
  [ "$status" -eq 0 ]
  run find "$TEST_ROOT" -name LEARNINGS.jsonl
  [ -z "$output" ]
}

@test "reads the marker from stdin JSON (UserPromptSubmit shape)" {
  run bash -c 'printf "%s" "{\"prompt\":\">>clew@artisan: warmth token drifted\"}" | bash "$1"' _ "$CAPTURE_HOOK"
  [ "$status" -eq 0 ]
  [ -f "$(ledger_file artisan)" ]
}
