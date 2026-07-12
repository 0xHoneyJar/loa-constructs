#!/usr/bin/env bash
# constructs-diff.sh — Divergence detection for constructs
# Part of construct-network-tools pack (cycle-032)
#
# Subcommands: check, diff, hash
#
# Usage:
#   constructs-diff.sh check <slug>     O(1) root hash comparison
#   constructs-diff.sh diff <slug>      Full file-level diff as JSON
#   constructs-diff.sh hash <path>      Compute Merkle root hash of directory

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source shared library
# shellcheck source=constructs-lib.sh
source "$SCRIPT_DIR/constructs-lib.sh"

# Exit codes
readonly EXIT_SUCCESS=0
readonly EXIT_GENERAL_ERROR=1
readonly EXIT_NO_SHADOW=3
readonly EXIT_VALIDATION_ERROR=5

# ── Subcommands ──────────────────

# O(1) root hash comparison using cached .hash file
do_check() {
    local slug="$1"
    local json_output="${2:-false}"

    validate_safe_identifier "$slug" || return $EXIT_VALIDATION_ERROR

    local construct_dir
    construct_dir="$(get_construct_dir)"
    local shadow_dir="$construct_dir/shadow/$slug"
    local hash_file="$construct_dir/cache/merkle/$slug.hash"

    if [[ ! -d "$shadow_dir" ]]; then
        if [[ "$json_output" == "true" ]]; then
            echo '{"status":"no_shadow","slug":"'"$slug"'","message":"No shadow directory found"}'
        else
            print_error "No shadow found for '$slug' — install or link first"
        fi
        return $EXIT_NO_SHADOW
    fi

    local packs_dir
    packs_dir="$(get_registry_packs_dir)"
    local current_dir="$packs_dir/$slug"

    if [[ ! -d "$current_dir" ]]; then
        if [[ "$json_output" == "true" ]]; then
            echo '{"status":"not_installed","slug":"'"$slug"'"}'
        else
            print_error "Construct '$slug' is not installed"
        fi
        return $EXIT_NO_SHADOW
    fi

    # Get cached shadow hash
    local shadow_hash=""
    if [[ -f "$hash_file" ]]; then
        shadow_hash=$(cat "$hash_file")
    else
        shadow_hash=$(compute_merkle_hash "$shadow_dir")
        echo "$shadow_hash" > "$hash_file"
    fi

    # Compute current hash
    local current_hash
    current_hash=$(compute_merkle_hash "$current_dir")

    local changed="false"
    if [[ "$shadow_hash" != "$current_hash" ]]; then
        changed="true"
    fi

    if [[ "$json_output" == "true" ]]; then
        jq -n \
            --arg slug "$slug" \
            --arg shadow_hash "$shadow_hash" \
            --arg current_hash "$current_hash" \
            --argjson changed "$changed" \
            '{status: "checked", slug: $slug, shadow_hash: $shadow_hash, current_hash: $current_hash, changed: $changed}'
    else
        if [[ "$changed" == "true" ]]; then
            echo "CHANGED: $slug"
            echo "  Shadow:  ${shadow_hash:0:20}..."
            echo "  Current: ${current_hash:0:20}..."
        else
            echo "UNCHANGED: $slug"
        fi
    fi
}

# Full file-level diff between shadow and current
do_diff() {
    local slug="$1"
    local json_output="${2:-false}"

    validate_safe_identifier "$slug" || return $EXIT_VALIDATION_ERROR

    local construct_dir
    construct_dir="$(get_construct_dir)"
    local shadow_dir="$construct_dir/shadow/$slug"

    if [[ ! -d "$shadow_dir" ]]; then
        if [[ "$json_output" == "true" ]]; then
            echo '{"status":"no_shadow","slug":"'"$slug"'"}'
        else
            print_error "No shadow found for '$slug'"
        fi
        return $EXIT_NO_SHADOW
    fi

    local packs_dir
    packs_dir="$(get_registry_packs_dir)"
    local current_dir="$packs_dir/$slug"

    if [[ ! -d "$current_dir" ]]; then
        if [[ "$json_output" == "true" ]]; then
            echo '{"status":"not_installed","slug":"'"$slug"'"}'
        else
            print_error "Construct '$slug' is not installed"
        fi
        return $EXIT_NO_SHADOW
    fi

    # Collect file lists (LC_ALL=C sort for determinism)
    local shadow_files current_files
    shadow_files=$(cd "$shadow_dir" && find . -type f -not -path '*/.git/*' | LC_ALL=C sort)
    current_files=$(cd "$current_dir" && find . -type f -not -path '*/.git/*' | LC_ALL=C sort)

    local added=()
    local modified=()
    local deleted=()

    # Find added and modified files
    while IFS= read -r file; do
        [[ -z "$file" ]] && continue
        local rel="${file#./}"
        if [[ ! -f "$shadow_dir/$rel" ]]; then
            added+=("$rel")
        else
            local shadow_hash current_hash
            shadow_hash=$(compute_file_sha256 "$shadow_dir/$rel")
            current_hash=$(compute_file_sha256 "$current_dir/$rel")
            if [[ "$shadow_hash" != "$current_hash" ]]; then
                modified+=("$rel")
            fi
        fi
    done <<< "$current_files"

    # Find deleted files
    while IFS= read -r file; do
        [[ -z "$file" ]] && continue
        local rel="${file#./}"
        if [[ ! -f "$current_dir/$rel" ]]; then
            deleted+=("$rel")
        fi
    done <<< "$shadow_files"

    local total_changes=$(( ${#added[@]} + ${#modified[@]} + ${#deleted[@]} ))

    if [[ "$json_output" == "true" ]]; then
        # Build JSON output
        local added_json modified_json deleted_json
        added_json=$(printf '%s\n' "${added[@]:-}" | jq -R . | jq -s .)
        modified_json=$(printf '%s\n' "${modified[@]:-}" | jq -R . | jq -s .)
        deleted_json=$(printf '%s\n' "${deleted[@]:-}" | jq -R . | jq -s .)

        # Filter out empty strings
        added_json=$(echo "$added_json" | jq '[.[] | select(. != "")]')
        modified_json=$(echo "$modified_json" | jq '[.[] | select(. != "")]')
        deleted_json=$(echo "$deleted_json" | jq '[.[] | select(. != "")]')

        jq -n \
            --arg slug "$slug" \
            --argjson added "$added_json" \
            --argjson modified "$modified_json" \
            --argjson deleted "$deleted_json" \
            --argjson total "$total_changes" \
            '{status: "diffed", slug: $slug, added: $added, modified: $modified, deleted: $deleted, total_changes: $total}'
    else
        echo "Diff for: $slug"
        echo ""

        if [[ ${#added[@]} -gt 0 ]]; then
            echo "Added (${#added[@]}):"
            for f in "${added[@]}"; do
                echo "  + $f"
            done
        fi

        if [[ ${#modified[@]} -gt 0 ]]; then
            echo "Modified (${#modified[@]}):"
            for f in "${modified[@]}"; do
                echo "  ~ $f"
            done
        fi

        if [[ ${#deleted[@]} -gt 0 ]]; then
            echo "Deleted (${#deleted[@]}):"
            for f in "${deleted[@]}"; do
                echo "  - $f"
            done
        fi

        if [[ $total_changes -eq 0 ]]; then
            echo "  No changes detected"
        else
            echo ""
            echo "$total_changes total change(s)"
        fi
    fi
}

# Compute Merkle root hash of arbitrary directory
do_hash() {
    local path="$1"
    local json_output="${2:-false}"

    if [[ ! -d "$path" ]]; then
        print_error "Directory not found: $path"
        return $EXIT_GENERAL_ERROR
    fi

    local hash
    hash=$(compute_merkle_hash "$path")

    if [[ "$json_output" == "true" ]]; then
        jq -n --arg path "$path" --arg hash "$hash" '{path: $path, hash: $hash}'
    else
        echo "$hash  $path"
    fi
}

# ── Usage ──────────────────

show_usage() {
    cat <<EOF
Usage: constructs-diff.sh <command> [args] [--json]

Commands:
  check <slug>     O(1) root hash comparison (uses cached .hash)
  diff <slug>      Full file-level diff as JSON
  hash <path>      Compute Merkle root hash of arbitrary directory

Flags:
  --json           Output in JSON format

Exit Codes:
  0  Success
  1  General error
  3  No shadow / not installed
  5  Validation error
EOF
}

# ── Main ──────────────────

main() {
    local command="${1:-}"
    local json_flag="false"

    # Check for --json flag anywhere in args
    for arg in "$@"; do
        if [[ "$arg" == "--json" ]]; then
            json_flag="true"
        fi
    done

    case "$command" in
        check)
            [[ -z "${2:-}" ]] && { print_error "Usage: constructs-diff.sh check <slug>"; return $EXIT_VALIDATION_ERROR; }
            do_check "$2" "$json_flag"
            ;;
        diff)
            [[ -z "${2:-}" ]] && { print_error "Usage: constructs-diff.sh diff <slug>"; return $EXIT_VALIDATION_ERROR; }
            do_diff "$2" "$json_flag"
            ;;
        hash)
            [[ -z "${2:-}" ]] && { print_error "Usage: constructs-diff.sh hash <path>"; return $EXIT_VALIDATION_ERROR; }
            do_hash "$2" "$json_flag"
            ;;
        -h|--help|help)
            show_usage
            ;;
        *)
            print_error "Unknown command: $command"
            show_usage
            return $EXIT_GENERAL_ERROR
            ;;
    esac
}

# Source-vs-execute guard
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
