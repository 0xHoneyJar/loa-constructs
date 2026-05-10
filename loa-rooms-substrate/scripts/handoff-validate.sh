#!/usr/bin/env bash
# =============================================================================
# handoff-validate.sh — Construct handoff packet validator
# =============================================================================
# Cycle: simstim-20260509-aead9136 (Sprint 1, S1-T1)
# PRD: FR-3 (handoff packet schema, three-tier policy)
# SDD: §2.4 (validator behavior FR-3.1c)
#
# Validates a construct-handoff packet JSON file against
# .claude/data/trajectory-schemas/construct-handoff.schema.json.
#
# Three-tier exit codes (PRD FR-3.1c):
#   0 = OK or recommended-warning (≤ recommended_field_threshold missing)
#   1 = FAIL (required-field missing or schema violation)
#   2 = BLOCKER (recommended-field overage > threshold)
#
# Configuration:
#   .loa.config.yaml::handoff_packet.recommended_field_threshold (default 2)
#
# Usage:
#   handoff-validate.sh <packet_path> [--json] [--threshold N]
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SCHEMA_PATH="$PROJECT_ROOT/.claude/data/trajectory-schemas/construct-handoff.schema.json"

usage() {
    cat <<EOF
Usage: handoff-validate.sh <packet_path> [options]

Options:
  --json              Output structured JSON to stdout
  --threshold N       Override recommended-field threshold (default: from .loa.config.yaml or 2)
  --schema PATH       Override schema path (testing only)
  -h, --help          Show this help

Exit codes:
  0  OK (all required present; ≤ threshold recommended missing)
  1  FAIL (required field missing or schema violation)
  2  BLOCKER (recommended overage > threshold)
EOF
}

PACKET_PATH=""
OUTPUT_JSON=0
THRESHOLD=""
SCHEMA_OVERRIDE=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --json) OUTPUT_JSON=1; shift ;;
        --threshold) THRESHOLD="$2"; shift 2 ;;
        --schema) SCHEMA_OVERRIDE="$2"; shift 2 ;;
        -h|--help) usage; exit 0 ;;
        -*) echo "ERROR: unknown flag '$1'" >&2; usage >&2; exit 1 ;;
        *) if [[ -z "$PACKET_PATH" ]]; then PACKET_PATH="$1"; else echo "ERROR: extra arg '$1'" >&2; exit 1; fi; shift ;;
    esac
done

if [[ -z "$PACKET_PATH" ]]; then
    echo "ERROR: packet_path required" >&2
    usage >&2
    exit 1
fi

if [[ ! -f "$PACKET_PATH" ]]; then
    echo "ERROR: packet not found: $PACKET_PATH" >&2
    exit 1
fi

[[ -n "$SCHEMA_OVERRIDE" ]] && SCHEMA_PATH="$SCHEMA_OVERRIDE"

if [[ ! -f "$SCHEMA_PATH" ]]; then
    echo "ERROR: schema not found: $SCHEMA_PATH" >&2
    exit 1
fi

# Resolve threshold: --threshold flag > config > default 2
if [[ -z "$THRESHOLD" ]]; then
    if command -v yq >/dev/null 2>&1 && [[ -f "$PROJECT_ROOT/.loa.config.yaml" ]]; then
        THRESHOLD="$(yq -r '.handoff_packet.recommended_field_threshold // "2"' "$PROJECT_ROOT/.loa.config.yaml" 2>/dev/null || echo "2")"
    else
        THRESHOLD="2"
    fi
fi

# Validate threshold is integer
if ! [[ "$THRESHOLD" =~ ^[0-9]+$ ]]; then
    echo "ERROR: invalid threshold '$THRESHOLD' (must be non-negative integer)" >&2
    exit 1
fi

# Required tier per PRD FR-3.1
REQUIRED_FIELDS=("construct_slug" "output_type" "verdict" "invocation_mode" "cycle_id")
RECOMMENDED_FIELDS=("persona" "output_refs" "evidence")

# Run JSON Schema validation via python
SCHEMA_RESULT="$(python3 - <<PYEOF
import json, sys
try:
    import jsonschema
except ImportError:
    print(json.dumps({"ok": False, "reason": "jsonschema_not_installed"}))
    sys.exit(0)

try:
    with open("$PACKET_PATH") as f:
        packet = json.load(f)
except json.JSONDecodeError as e:
    print(json.dumps({"ok": False, "reason": "invalid_json", "error": str(e)}))
    sys.exit(0)
except Exception as e:
    print(json.dumps({"ok": False, "reason": "read_error", "error": str(e)}))
    sys.exit(0)

with open("$SCHEMA_PATH") as f:
    schema = json.load(f)

try:
    jsonschema.Draft202012Validator.check_schema(schema)
except jsonschema.SchemaError as e:
    print(json.dumps({"ok": False, "reason": "schema_invalid", "error": str(e)}))
    sys.exit(0)

validator = jsonschema.Draft202012Validator(schema)
errors = sorted(validator.iter_errors(packet), key=lambda e: e.absolute_path)
if errors:
    err_msgs = [{"path": list(e.absolute_path), "message": e.message} for e in errors]
    print(json.dumps({"ok": False, "reason": "schema_violation", "errors": err_msgs, "packet_keys": list(packet.keys())}))
    sys.exit(0)

print(json.dumps({"ok": True, "packet_keys": list(packet.keys())}))
PYEOF
)"

# Parse python result
SCHEMA_OK="$(echo "$SCHEMA_RESULT" | jq -r '.ok')"
PACKET_KEYS="$(echo "$SCHEMA_RESULT" | jq -r '.packet_keys[]?')"

if [[ "$SCHEMA_OK" != "true" ]]; then
    REASON="$(echo "$SCHEMA_RESULT" | jq -r '.reason')"
    if [[ "$OUTPUT_JSON" == "1" ]]; then
        echo "$SCHEMA_RESULT" | jq '. + {exit_code: 1}'
    else
        echo "FAIL: schema validation — reason=$REASON" >&2
        echo "$SCHEMA_RESULT" | jq -r '.errors[]? | "  - \(.path | tojson): \(.message)"' >&2
    fi
    exit 1
fi

# Schema passed. Now check three-tier semantics.
MISSING_REQUIRED=()
for f in "${REQUIRED_FIELDS[@]}"; do
    if ! grep -qx "$f" <<< "$PACKET_KEYS"; then
        MISSING_REQUIRED+=("$f")
    fi
done

if [[ ${#MISSING_REQUIRED[@]} -gt 0 ]]; then
    if [[ "$OUTPUT_JSON" == "1" ]]; then
        jq -n --argjson m "$(printf '%s\n' "${MISSING_REQUIRED[@]}" | jq -R . | jq -s .)" \
            '{ok: false, reason: "required_field_missing", missing: $m, exit_code: 1}'
    else
        echo "FAIL: required field(s) missing: ${MISSING_REQUIRED[*]}" >&2
    fi
    exit 1
fi

MISSING_RECOMMENDED=()
for f in "${RECOMMENDED_FIELDS[@]}"; do
    if ! grep -qx "$f" <<< "$PACKET_KEYS"; then
        MISSING_RECOMMENDED+=("$f")
    fi
done

RECOMMENDED_COUNT=${#MISSING_RECOMMENDED[@]}

if [[ $RECOMMENDED_COUNT -gt $THRESHOLD ]]; then
    if [[ "$OUTPUT_JSON" == "1" ]]; then
        jq -n --argjson m "$(printf '%s\n' "${MISSING_RECOMMENDED[@]}" | jq -R . | jq -s .)" \
            --argjson c "$RECOMMENDED_COUNT" --argjson t "$THRESHOLD" \
            '{ok: false, reason: "recommended_field_overage", missing: $m, count: $c, threshold: $t, exit_code: 2}'
    else
        echo "BLOCKER: $RECOMMENDED_COUNT recommended field(s) missing exceeds threshold $THRESHOLD" >&2
        echo "  Missing: ${MISSING_RECOMMENDED[*]}" >&2
    fi
    exit 2
fi

if [[ $RECOMMENDED_COUNT -gt 0 ]]; then
    if [[ "$OUTPUT_JSON" == "1" ]]; then
        jq -n --argjson m "$(printf '%s\n' "${MISSING_RECOMMENDED[@]}" | jq -R . | jq -s .)" \
            --argjson c "$RECOMMENDED_COUNT" --argjson t "$THRESHOLD" \
            '{ok: true, reason: "recommended_field_warning", missing: $m, count: $c, threshold: $t, exit_code: 0}'
    else
        echo "WARN: $RECOMMENDED_COUNT recommended field(s) missing (threshold $THRESHOLD): ${MISSING_RECOMMENDED[*]}" >&2
    fi
    exit 0
fi

if [[ "$OUTPUT_JSON" == "1" ]]; then
    jq -n '{ok: true, reason: "all_tiers_present", exit_code: 0}'
else
    echo "OK: handoff packet valid"
fi
exit 0
