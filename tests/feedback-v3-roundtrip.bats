#!/usr/bin/env bats
# feedback-v3-roundtrip.bats — Cycle-001, Leg E (Task E-2)
# Validates feedback-v3 JSON instances against the schema.
#
# Requires: ajv-cli or npx ajv-cli (JSON Schema Draft-07 validator)
# SEED: grimoires/loa-constructs-seed-2026-04-21/SEED-loa-constructs-infrastructure-cycle.md

SCHEMA_PATH=".claude/schemas/feedback-v3.schema.json"

# Helper: validate a JSON string against the schema
validate_instance() {
  local instance_json="$1"
  local tmp
  tmp=$(mktemp /tmp/feedback-v3-test-XXXX.json)
  echo "$instance_json" > "$tmp"

  local result
  if command -v ajv &>/dev/null; then
    result=$(ajv validate -s "$SCHEMA_PATH" -d "$tmp" 2>&1)
    local exit_code=$?
  elif command -v npx &>/dev/null; then
    result=$(npx --yes ajv-cli validate -s "$SCHEMA_PATH" -d "$tmp" 2>&1)
    local exit_code=$?
  else
    # Fallback: use Python jsonschema
    result=$(python3 -c "
import json, sys
try:
    import jsonschema
    with open('$SCHEMA_PATH') as sf, open('$tmp') as df:
        schema = json.load(sf)
        instance = json.load(df)
    jsonschema.validate(instance, schema)
    print('valid')
    sys.exit(0)
except jsonschema.ValidationError as e:
    print(f'invalid: {e.message}', file=sys.stderr)
    sys.exit(1)
except ImportError:
    print('jsonschema not available', file=sys.stderr)
    sys.exit(2)
" 2>&1)
    local exit_code=$?
  fi

  rm -f "$tmp"
  echo "$result"
  return $exit_code
}

# Test 1: minimal valid instance (only required fields)
@test "minimal valid feedback-v3 instance passes validation" {
  local instance='{
    "schema_version": "3.0.0",
    "persona": "ALEXANDER",
    "session_id": "00000000-0000-0000-0000-000000000001",
    "trigger": "/feel",
    "timestamp_start": "2026-04-21T10:00:00Z",
    "timestamp_end": "2026-04-21T10:30:00Z",
    "findings": [],
    "kansei_signals": {}
  }'

  run validate_instance "$instance"
  [ "$status" -eq 0 ]
}

# Test 2: full valid instance (all optional fields included)
@test "full feedback-v3 instance passes validation" {
  local instance='{
    "schema_version": "3.0.0",
    "persona": "KEEPER",
    "session_id": "00000000-0000-0000-0000-000000000002",
    "trigger": "/tend",
    "timestamp_start": "2026-04-21T10:00:00Z",
    "timestamp_end": "2026-04-21T10:45:00Z",
    "findings": [
      {
        "id": "F-001",
        "severity": "HIGH",
        "description": "Token drift detected in navigation component",
        "suggestion": "Update to use oklch tokens from taste.md"
      },
      {
        "id": "F-002",
        "severity": "LOW",
        "description": "Missing aria-label on icon button"
      }
    ],
    "kansei_signals": {
      "Q1": true,
      "Q2": false,
      "Q3": null,
      "Q4": true,
      "Q5": true
    }
  }'

  run validate_instance "$instance"
  [ "$status" -eq 0 ]
}

# Test 3: deliberately invalid instance (missing schema_version) — must fail
@test "feedback-v3 instance missing schema_version fails validation" {
  local instance='{
    "persona": "STAMETS",
    "session_id": "00000000-0000-0000-0000-000000000003",
    "trigger": "/dig",
    "timestamp_start": "2026-04-21T11:00:00Z",
    "timestamp_end": "2026-04-21T11:30:00Z",
    "findings": [],
    "kansei_signals": {}
  }'

  run validate_instance "$instance"
  [ "$status" -ne 0 ]
}
