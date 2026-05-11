#!/usr/bin/env bash
# =============================================================================
# handoff-parity-check.sh — Native ↔ Headless handoff packet parity (T5)
# =============================================================================
# Cycle: simstim-20260509-aead9136 (Sprint 4, S4-T2)
# PRD: FR-6 (headless parity); §8.5 T5 acceptance
# SDD: §2.6.3
#
# Compares two handoff packets (one native, one headless) emitted by the same
# composition stage. Reports differences and classifies them as:
#
#   ALLOWED — runtime-specific (agent_id, transcript_path, transcript_excerpt,
#             invocation_mode, created_at)
#   SUBSTANTIVE — anything else; FAIL T5 if any present
#
# Exit codes:
#   0 = parity (only allowed differences)
#   1 = substantive divergence (T5 fails)
#   2 = invalid input (file missing, malformed JSON, etc.)
#
# Usage:
#   handoff-parity-check.sh <native_packet> <headless_packet> [options]
#
# Options:
#   --json    Output structured JSON
#   --strict  Treat any difference (including allowed) as failure
# =============================================================================
set -euo pipefail

usage() {
    cat <<EOF
Usage: handoff-parity-check.sh <native_packet> <headless_packet> [options]

Options:
  --json    Output structured JSON to stdout
  --strict  Treat any difference (including allowed) as substantive

Exit codes:
  0  Parity (only runtime-specific differences)
  1  Substantive divergence
  2  Invalid input
EOF
}

NATIVE=""
HEADLESS=""
OUTPUT_JSON=0
STRICT=0

while [[ $# -gt 0 ]]; do
    case "$1" in
        --json) OUTPUT_JSON=1; shift ;;
        --strict) STRICT=1; shift ;;
        -h|--help) usage; exit 0 ;;
        -*) echo "ERROR: unknown flag '$1'" >&2; exit 2 ;;
        *)
            if [[ -z "$NATIVE" ]]; then NATIVE="$1"
            elif [[ -z "$HEADLESS" ]]; then HEADLESS="$1"
            else echo "ERROR: extra arg '$1'" >&2; exit 2; fi
            shift
            ;;
    esac
done

if [[ -z "$NATIVE" ]] || [[ -z "$HEADLESS" ]]; then
    usage >&2
    exit 2
fi

if [[ ! -f "$NATIVE" ]]; then
    echo "ERROR: native packet not found: $NATIVE" >&2
    exit 2
fi
if [[ ! -f "$HEADLESS" ]]; then
    echo "ERROR: headless packet not found: $HEADLESS" >&2
    exit 2
fi

# Allowed-difference field set (per PRD FR-6.1 + SDD §2.6.3)
# These fields are expected to differ between native (interactive) and
# headless executions. Any difference outside this set is substantive.
ALLOWED_DIFFS_REGEX='^(agent_id|transcript_path|transcript_excerpt|invocation_mode|created_at)$'

# Compute difference using Python for reliable JSON-aware comparison
RESULT="$(python3 - "$NATIVE" "$HEADLESS" "$STRICT" <<'PYEOF'
import json, sys, re

native_path, headless_path, strict_str = sys.argv[1], sys.argv[2], sys.argv[3]
strict = strict_str == "1"

ALLOWED = re.compile(r'^(agent_id|transcript_path|transcript_excerpt|invocation_mode|created_at)$')

try:
    with open(native_path) as f:
        native = json.load(f)
    with open(headless_path) as f:
        headless = json.load(f)
except json.JSONDecodeError as e:
    print(json.dumps({"ok": False, "reason": "invalid_json", "error": str(e)}))
    sys.exit(2)

native_keys = set(native.keys())
headless_keys = set(headless.keys())
all_keys = native_keys | headless_keys

allowed_diffs = []
substantive_diffs = []

for key in sorted(all_keys):
    n_val = native.get(key)
    h_val = headless.get(key)
    if n_val == h_val:
        continue

    is_allowed = bool(ALLOWED.match(key)) and not strict
    diff_entry = {
        "field": key,
        "native": n_val,
        "headless": h_val,
        "in_native": key in native_keys,
        "in_headless": key in headless_keys,
    }
    if is_allowed:
        allowed_diffs.append(diff_entry)
    else:
        substantive_diffs.append(diff_entry)

ok = len(substantive_diffs) == 0
print(json.dumps({
    "ok": ok,
    "reason": ("parity" if ok else "substantive_divergence"),
    "allowed_diffs": allowed_diffs,
    "substantive_diffs": substantive_diffs,
    "native": native_path,
    "headless": headless_path,
}, indent=2))
PYEOF
)"

OK_FLAG="$(echo "$RESULT" | jq -r '.ok')"
SUBSTANTIVE_COUNT="$(echo "$RESULT" | jq -r '.substantive_diffs | length')"
ALLOWED_COUNT="$(echo "$RESULT" | jq -r '.allowed_diffs | length')"

if [[ "$OUTPUT_JSON" == "1" ]]; then
    if [[ "$OK_FLAG" == "true" ]]; then
        echo "$RESULT" | jq '. + {exit_code: 0}'
    else
        echo "$RESULT" | jq '. + {exit_code: 1}'
    fi
else
    if [[ "$OK_FLAG" == "true" ]]; then
        echo "PARITY: $ALLOWED_COUNT allowed difference(s); 0 substantive"
        if [[ "$ALLOWED_COUNT" -gt 0 ]]; then
            echo "$RESULT" | jq -r '.allowed_diffs[] | "  - \(.field): native=\(.native | tojson) headless=\(.headless | tojson)"'
        fi
    else
        echo "FAIL: $SUBSTANTIVE_COUNT substantive difference(s) (T5 not satisfied)" >&2
        echo "$RESULT" | jq -r '.substantive_diffs[] | "  - \(.field): native=\(.native | tojson) headless=\(.headless | tojson)"' >&2
    fi
fi

if [[ "$OK_FLAG" == "true" ]]; then
    exit 0
else
    exit 1
fi
