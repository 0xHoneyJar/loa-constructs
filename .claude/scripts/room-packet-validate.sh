#!/usr/bin/env bash
# =============================================================================
# room-packet-validate.sh — Room activation packet validator
# =============================================================================
# Cycle: simstim-20260509-aead9136 (Sprint 1, S1-T2)
# PRD: FR-4.6 + FR-4.8
# SDD: §2.5
#
# Validates a room activation packet JSON file against
# .claude/data/trajectory-schemas/room-activation-packet.schema.json AND
# verifies room_id is content-addressable: SHA-256(jcs_canonical(packet_body
# without room_id field)) matches the supplied room_id.
#
# Exit codes:
#   0 = OK (schema valid + room_id matches)
#   1 = FAIL (schema violation OR room_id mismatch)
#
# Usage:
#   room-packet-validate.sh <packet_path> [--json] [--no-id-check]
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SCHEMA_PATH="$PROJECT_ROOT/.claude/data/trajectory-schemas/room-activation-packet.schema.json"

usage() {
    cat <<EOF
Usage: room-packet-validate.sh <packet_path> [options]

Options:
  --json              Output structured JSON to stdout
  --no-id-check       Skip room_id derivation check (schema-only validation)
  --schema PATH       Override schema path
  -h, --help          Show this help
EOF
}

PACKET_PATH=""
OUTPUT_JSON=0
SKIP_ID_CHECK=0
SCHEMA_OVERRIDE=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --json) OUTPUT_JSON=1; shift ;;
        --no-id-check) SKIP_ID_CHECK=1; shift ;;
        --schema) SCHEMA_OVERRIDE="$2"; shift 2 ;;
        -h|--help) usage; exit 0 ;;
        -*) echo "ERROR: unknown flag '$1'" >&2; exit 1 ;;
        *) if [[ -z "$PACKET_PATH" ]]; then PACKET_PATH="$1"; else echo "ERROR: extra arg" >&2; exit 1; fi; shift ;;
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

# Schema validation + room_id derivation in single Python pass
RESULT="$(python3 - <<PYEOF
import json, sys, hashlib

try:
    import jsonschema
except ImportError:
    print(json.dumps({"ok": False, "reason": "jsonschema_not_installed"}))
    sys.exit(0)

try:
    import rfc8785
except ImportError:
    rfc8785 = None  # JCS only required for id check

try:
    with open("$PACKET_PATH") as f:
        packet = json.load(f)
except json.JSONDecodeError as e:
    print(json.dumps({"ok": False, "reason": "invalid_json", "error": str(e)}))
    sys.exit(0)

with open("$SCHEMA_PATH") as f:
    schema = json.load(f)

validator = jsonschema.Draft202012Validator(schema)
errors = sorted(validator.iter_errors(packet), key=lambda e: e.absolute_path)
if errors:
    err_msgs = [{"path": list(e.absolute_path), "message": e.message} for e in errors]
    print(json.dumps({"ok": False, "reason": "schema_violation", "errors": err_msgs}))
    sys.exit(0)

skip_id_check = $SKIP_ID_CHECK == 1
if skip_id_check:
    print(json.dumps({"ok": True, "reason": "schema_only", "schema_valid": True, "id_check": "skipped"}))
    sys.exit(0)

if rfc8785 is None:
    print(json.dumps({"ok": False, "reason": "rfc8785_not_installed", "schema_valid": True}))
    sys.exit(0)

# Derive room_id: sha256 of JCS-canonical packet body without room_id
claimed_id = packet.get("room_id", "")
body = {k: v for k, v in packet.items() if k != "room_id"}
canonical = rfc8785.dumps(body)
computed_id = "sha256:" + hashlib.sha256(canonical).hexdigest()

if claimed_id != computed_id:
    print(json.dumps({
        "ok": False,
        "reason": "room_id_mismatch",
        "schema_valid": True,
        "claimed": claimed_id,
        "computed": computed_id
    }))
    sys.exit(0)

print(json.dumps({"ok": True, "reason": "all_valid", "schema_valid": True, "id_check": "passed"}))
PYEOF
)"

OK_FLAG="$(echo "$RESULT" | jq -r '.ok')"

if [[ "$OUTPUT_JSON" == "1" ]]; then
    if [[ "$OK_FLAG" == "true" ]]; then
        echo "$RESULT" | jq '. + {exit_code: 0}'
    else
        echo "$RESULT" | jq '. + {exit_code: 1}'
    fi
fi

if [[ "$OK_FLAG" == "true" ]]; then
    [[ "$OUTPUT_JSON" != "1" ]] && echo "OK: room packet valid"
    exit 0
else
    REASON="$(echo "$RESULT" | jq -r '.reason')"
    if [[ "$OUTPUT_JSON" != "1" ]]; then
        echo "FAIL: $REASON" >&2
        echo "$RESULT" | jq -r '.errors[]? | "  - \(.path | tojson): \(.message)"' >&2 || true
        if [[ "$REASON" == "room_id_mismatch" ]]; then
            echo "$RESULT" | jq -r '"  claimed:  \(.claimed)\n  computed: \(.computed)"' >&2
        fi
    fi
    exit 1
fi
