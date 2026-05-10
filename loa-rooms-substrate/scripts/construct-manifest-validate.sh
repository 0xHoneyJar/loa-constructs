#!/usr/bin/env bash
# =============================================================================
# construct-manifest-validate.sh — Construct manifest v4 validator
# =============================================================================
# Cycle: simstim-20260509-aead9136 (Sprint 1, S1-T3)
# SDD: §2.1 (manifest v4 schema, backward compat with v3)
#
# Validates .claude/constructs/packs/<slug>/construct.yaml against
# .claude/data/schemas/construct-manifest-v4.schema.json. v3 manifests pass
# (informational warnings only); v4 manifests must conform fully.
#
# Exit codes:
#   0 = PASS (with optional warnings)
#   1 = FAIL (schema violation)
#
# Usage:
#   construct-manifest-validate.sh <slug>
#   construct-manifest-validate.sh --all
#   construct-manifest-validate.sh --path <yaml_path>
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SCHEMA_PATH="$PROJECT_ROOT/.claude/data/schemas/construct-manifest-v4.schema.json"
PACKS_DIR="$PROJECT_ROOT/.claude/constructs/packs"

usage() {
    cat <<EOF
Usage:
  construct-manifest-validate.sh <slug>          Validate one construct
  construct-manifest-validate.sh --all           Validate all constructs in packs/
  construct-manifest-validate.sh --path <path>   Validate a specific yaml file

Options:
  --json                Output JSON results
  --strict              Treat v3 warnings as errors

Exit codes:
  0  All validated manifests pass
  1  At least one manifest failed validation
EOF
}

MODE=""
TARGET=""
OUTPUT_JSON=0
STRICT=0

while [[ $# -gt 0 ]]; do
    case "$1" in
        --all) MODE="all"; shift ;;
        --path) MODE="path"; TARGET="$2"; shift 2 ;;
        --json) OUTPUT_JSON=1; shift ;;
        --strict) STRICT=1; shift ;;
        -h|--help) usage; exit 0 ;;
        -*) echo "ERROR: unknown flag '$1'" >&2; exit 1 ;;
        *) MODE="slug"; TARGET="$1"; shift ;;
    esac
done

if [[ -z "$MODE" ]]; then
    usage >&2
    exit 1
fi

validate_one() {
    local yaml_path="$1"
    local slug="$2"

    if [[ ! -f "$yaml_path" ]]; then
        echo "FAIL: $slug — manifest not found at $yaml_path" >&2
        return 1
    fi

    python3 - "$yaml_path" "$SCHEMA_PATH" "$slug" "$STRICT" <<'PYEOF'
import json, sys, yaml, jsonschema

yaml_path, schema_path, slug, strict = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4] == "1"

try:
    with open(yaml_path) as f:
        manifest = yaml.safe_load(f)
except yaml.YAMLError as e:
    print(json.dumps({"slug": slug, "ok": False, "reason": "yaml_parse_error", "error": str(e)}))
    sys.exit(1)

with open(schema_path) as f:
    schema = json.load(f)

validator = jsonschema.Draft202012Validator(schema)
errors = sorted(validator.iter_errors(manifest), key=lambda e: e.absolute_path)
if errors:
    err_msgs = [{"path": list(e.absolute_path), "message": e.message} for e in errors]
    print(json.dumps({"slug": slug, "ok": False, "reason": "schema_violation", "errors": err_msgs}))
    sys.exit(1)

# Schema passed. Check v3 → v4 readiness as warnings.
warnings = []
schema_version = manifest.get("schema_version")
if schema_version == 3:
    if "tools" not in manifest:
        warnings.append("v3 manifest: no 'tools' block (generator will infer from skills + baseline)")
    if "adapter" not in manifest:
        warnings.append("v3 manifest: no 'adapter' block (generator will use defaults)")

if strict and warnings:
    print(json.dumps({"slug": slug, "ok": False, "reason": "warnings_in_strict", "warnings": warnings}))
    sys.exit(1)

print(json.dumps({"slug": slug, "ok": True, "schema_version": schema_version, "warnings": warnings}))
sys.exit(0)
PYEOF
}

run_for_slug() {
    local slug="$1"
    local yaml_path="$PACKS_DIR/$slug/construct.yaml"
    validate_one "$yaml_path" "$slug"
}

run_for_path() {
    local yaml_path="$1"
    local slug
    slug="$(basename "$(dirname "$yaml_path")")"
    [[ "$slug" == "." || "$slug" == "/" ]] && slug="standalone"
    validate_one "$yaml_path" "$slug"
}

run_for_all() {
    local total=0 failures=0 warnings_total=0
    local results=()

    for pack_dir in "$PACKS_DIR"/*/; do
        local slug
        slug="$(basename "$pack_dir")"
        local yaml_path="$pack_dir/construct.yaml"
        [[ -f "$yaml_path" ]] || continue

        total=$((total + 1))
        local result
        if result="$(validate_one "$yaml_path" "$slug" 2>&1)"; then
            results+=("$result")
            local w_count
            w_count="$(echo "$result" | jq -r '.warnings | length' 2>/dev/null || echo 0)"
            warnings_total=$((warnings_total + w_count))
        else
            failures=$((failures + 1))
            results+=("$result")
        fi
    done

    if [[ "$OUTPUT_JSON" == "1" ]]; then
        printf '%s\n' "${results[@]}" | jq -s --argjson total "$total" --argjson failures "$failures" --argjson warnings "$warnings_total" \
            '{summary: {total: $total, failures: $failures, warnings: $warnings}, results: .}'
    else
        for r in "${results[@]}"; do
            local ok="$(echo "$r" | jq -r '.ok')"
            local s="$(echo "$r" | jq -r '.slug')"
            if [[ "$ok" == "true" ]]; then
                local v="$(echo "$r" | jq -r '.schema_version')"
                local w="$(echo "$r" | jq -r '.warnings | length')"
                if [[ "$w" -gt 0 ]]; then
                    echo "PASS: $s (schema_version=$v, warnings=$w)"
                else
                    echo "PASS: $s (schema_version=$v)"
                fi
            else
                local reason="$(echo "$r" | jq -r '.reason')"
                echo "FAIL: $s — $reason" >&2
                echo "$r" | jq -r '.errors[]? | "  - \(.path | tojson): \(.message)"' >&2
            fi
        done
        echo "---"
        echo "Summary: $total total, $failures failures, $warnings_total warnings"
    fi

    [[ $failures -gt 0 ]] && return 1
    return 0
}

case "$MODE" in
    slug) run_for_slug "$TARGET" ;;
    path) run_for_path "$TARGET" ;;
    all) run_for_all ;;
esac
