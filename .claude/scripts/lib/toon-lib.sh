#!/usr/bin/env bash
# =============================================================================
# TOON (Token-Oriented Object Notation) — Tabular Encoder
# =============================================================================
# Converts JSON arrays of uniform objects to TOON tabular format.
# Achieves ~39.6% fewer tokens than JSON for uniform array output.
#
# Usage:
#   source "$(dirname "$0")/lib/toon-lib.sh"
#   toon_encode_tabular "packs" "$json_array"
#
# Sources: sdd.md:§2.1 (TOON Encoder Library), prd.md:FR-1.1
# =============================================================================

# Detect if a JSON array is uniform (all objects have same keys)
# Args: $1 = JSON array string
# Returns: 0 if uniform, 1 if not
# Stdout: comma-separated key list if uniform
toon_detect_uniform() {
    local json="$1"

    # Requires jq
    if ! command -v jq &>/dev/null; then
        return 1
    fi

    # Extract keys from first object, compare against all objects
    local first_keys
    first_keys=$(echo "$json" | jq -r '
        if (type == "array" and length > 0 and (.[0] | type) == "object")
        then [.[0] | keys[]] | join(",")
        else empty
        end
    ' 2>/dev/null) || return 1

    [[ -z "$first_keys" ]] && return 1

    # Verify all objects have identical keys
    local all_same
    all_same=$(echo "$json" | jq -r --arg fk "$first_keys" '
        [.[] | [keys[]] | join(",")] | all(. == $fk)
    ' 2>/dev/null) || return 1

    [[ "$all_same" == "true" ]] || return 1
    echo "$first_keys"
    return 0
}

# Encode a JSON array to TOON tabular format
# Args:
#   $1 = label (e.g., "packs")
#   $2 = JSON array string (uniform objects)
# Stdout: TOON tabular output
# Returns: 0 on success, 1 on non-uniform/non-array input
toon_encode_tabular() {
    local label="$1"
    local json="$2"

    # Requires jq
    if ! command -v jq &>/dev/null; then
        return 1
    fi

    # Handle empty array as valid case — emit header-only
    local count
    count=$(echo "$json" | jq 'if type == "array" then length else -1 end' 2>/dev/null) || return 1
    [[ "$count" == "-1" ]] && return 1

    if [[ "$count" == "0" ]]; then
        echo "${label}[0]{}:"
        return 0
    fi

    # Detect uniformity and get keys
    local keys
    keys=$(toon_detect_uniform "$json") || {
        # Non-uniform: caller handles fallback
        return 1
    }

    # Header: label[count]{field1,field2,...}:
    echo "${label}[${count}]{${keys}}:"

    # Value rows: CSV-style, 2-space indent
    echo "$json" | jq -r --arg keys "$keys" '
        ($keys | split(",")) as $fields |
        .[] | [.[$fields[]]] | map(tostring) | "  " + join(",")
    '
}
