#!/usr/bin/env bash
# constructs-link.sh — Symlink-based construct development workflow
# Part of construct-network-tools pack (cycle-032)
#
# Subcommands: link, unlink, list, status
#
# Usage:
#   constructs-link.sh link <path>        Link a local construct for development
#   constructs-link.sh unlink <slug>      Unlink and restore from shadow
#   constructs-link.sh list               Show all active links
#   constructs-link.sh status <slug>      Show link health and drift

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source shared library
# shellcheck source=constructs-lib.sh
source "$SCRIPT_DIR/constructs-lib.sh"

# Exit codes
readonly EXIT_SUCCESS=0
readonly EXIT_GENERAL_ERROR=1
readonly EXIT_NOT_FOUND=3
readonly EXIT_VALIDATION_ERROR=5
readonly EXIT_ALREADY_EXISTS=7

# ── Subcommands ──────────────────

# Link a local construct directory for development
# Creates symlink from .claude/constructs/packs/<slug> → target path
do_link() {
    local target_path="$1"

    # Resolve to absolute path
    if [[ ! "$target_path" = /* ]]; then
        target_path="$(cd "$target_path" 2>/dev/null && pwd)" || {
            print_error "Path does not exist: $1"
            return $EXIT_NOT_FOUND
        }
    fi

    if [[ ! -d "$target_path" ]]; then
        print_error "Directory not found: $target_path"
        return $EXIT_NOT_FOUND
    fi

    # Auto-detect slug from construct.yaml or manifest.json
    local slug=""
    if [[ -f "$target_path/construct.yaml" ]]; then
        if command -v yq >/dev/null 2>&1; then
            slug=$(yq -r '.slug // empty' "$target_path/construct.yaml" 2>/dev/null || true)
        fi
    fi
    if [[ -z "$slug" ]] && [[ -f "$target_path/manifest.json" ]]; then
        slug=$(jq -r '.slug // empty' "$target_path/manifest.json" 2>/dev/null || true)
    fi
    if [[ -z "$slug" ]]; then
        # Fall back to directory name
        slug=$(basename "$target_path")
    fi

    validate_safe_identifier "$slug" || {
        print_error "Invalid slug: $slug"
        return $EXIT_VALIDATION_ERROR
    }

    # Ensure .construct/ exists
    ensure_construct_dir

    local packs_dir
    packs_dir="$(get_registry_packs_dir)"
    mkdir -p "$packs_dir"

    local link_path="$packs_dir/$slug"

    # Check if already linked
    if [[ -L "$link_path" ]]; then
        local existing_target
        existing_target=$(readlink "$link_path")
        if [[ "$existing_target" == "$target_path" ]]; then
            print_warning "Already linked: $slug → $target_path"
            return $EXIT_SUCCESS
        fi
        print_error "Slug '$slug' is already linked to: $existing_target"
        print_error "Unlink first with: constructs-link.sh unlink $slug"
        return $EXIT_ALREADY_EXISTS
    fi

    # Check if installed (non-symlink)
    if [[ -d "$link_path" ]] && [[ ! -L "$link_path" ]]; then
        # Preserve shadow before replacing
        preserve_shadow "$slug" "$link_path"
        # Move installed version aside
        mv "$link_path" "$link_path.pre-link"
        print_status "Existing install preserved to $link_path.pre-link"
    fi

    # Create symlink
    ln -s "$target_path" "$link_path"

    # Update state
    update_state_link "$slug" "$target_path"

    # Symlink commands if they exist
    if [[ -f "$target_path/construct.yaml" ]] || [[ -f "$target_path/manifest.json" ]]; then
        local manifest_file=""
        if [[ -f "$target_path/construct.yaml" ]]; then
            manifest_file="$target_path/construct.yaml"
        elif [[ -f "$target_path/manifest.json" ]]; then
            manifest_file="$target_path/manifest.json"
        fi

        if [[ -n "$manifest_file" ]]; then
            print_status "Linked: $slug → $target_path"
        fi
    fi

    print_success "Construct '$slug' linked for development"
    echo "  Source: $target_path"
    echo "  Target: $link_path"
}

# Unlink a construct and optionally restore from shadow/pre-link backup
do_unlink() {
    local slug="$1"

    validate_safe_identifier "$slug" || {
        print_error "Invalid slug: $slug"
        return $EXIT_VALIDATION_ERROR
    }

    local packs_dir
    packs_dir="$(get_registry_packs_dir)"
    local link_path="$packs_dir/$slug"

    if [[ ! -L "$link_path" ]]; then
        print_error "Not a linked construct: $slug"
        return $EXIT_NOT_FOUND
    fi

    # Remove symlink
    rm "$link_path"

    # Restore from pre-link backup if it exists
    if [[ -d "$link_path.pre-link" ]]; then
        mv "$link_path.pre-link" "$link_path"
        print_status "Restored previous installation for $slug"
    fi

    # Update state
    remove_state_link "$slug"

    print_success "Construct '$slug' unlinked"
}

# List all active construct links
do_list() {
    local packs_dir
    packs_dir="$(get_registry_packs_dir)"

    if [[ ! -d "$packs_dir" ]]; then
        echo "No constructs directory found."
        return $EXIT_SUCCESS
    fi

    local found=0
    echo "Active construct links:"
    echo ""

    for entry in "$packs_dir"/*; do
        if [[ -L "$entry" ]]; then
            local slug
            slug=$(basename "$entry")
            local target
            target=$(readlink "$entry")
            local status_icon="✓"

            # Check if target exists
            if [[ ! -d "$target" ]]; then
                status_icon="✗"
            fi

            printf "  %s %-25s → %s\n" "$status_icon" "$slug" "$target"
            found=$((found + 1))
        fi
    done

    if [[ $found -eq 0 ]]; then
        echo "  (none)"
    fi
    echo ""
    echo "$found linked construct(s)"
}

# Show detailed status for a linked construct
do_status() {
    local slug="$1"

    validate_safe_identifier "$slug" || {
        print_error "Invalid slug: $slug"
        return $EXIT_VALIDATION_ERROR
    }

    local packs_dir
    packs_dir="$(get_registry_packs_dir)"
    local link_path="$packs_dir/$slug"

    if [[ ! -L "$link_path" ]]; then
        # Check if installed (not linked)
        if [[ -d "$link_path" ]]; then
            echo "Status: INSTALLED (not linked)"
            echo "  Path: $link_path"
        else
            print_error "Construct not found: $slug"
            return $EXIT_NOT_FOUND
        fi
        return $EXIT_SUCCESS
    fi

    local target
    target=$(readlink "$link_path")

    echo "Construct: $slug"
    echo "Status:    LINKED"
    echo "Source:    $target"

    # Check target health
    if [[ ! -d "$target" ]]; then
        echo "Health:    BROKEN (target directory missing)"
        return $EXIT_SUCCESS
    fi

    echo "Health:    OK"

    # Check for shadow (drift detection)
    local construct_dir
    construct_dir="$(get_construct_dir)"
    local shadow_dir="$construct_dir/shadow/$slug"

    if [[ -d "$shadow_dir" ]]; then
        local cached_hash=""
        if [[ -f "$construct_dir/cache/merkle/$slug.hash" ]]; then
            cached_hash=$(cat "$construct_dir/cache/merkle/$slug.hash")
        fi

        local current_hash
        current_hash=$(compute_merkle_hash "$target")

        if [[ "$cached_hash" == "$current_hash" ]]; then
            echo "Drift:     NONE (matches shadow)"
        else
            echo "Drift:     DETECTED"
            echo "  Shadow:  ${cached_hash:0:20}..."
            echo "  Current: ${current_hash:0:20}..."
        fi
    else
        echo "Drift:     N/A (no shadow)"
    fi

    # Show version if manifest exists
    if [[ -f "$target/construct.yaml" ]] && command -v yq >/dev/null 2>&1; then
        local version
        version=$(yq -r '.version // "unknown"' "$target/construct.yaml" 2>/dev/null || echo "unknown")
        echo "Version:   $version"
    elif [[ -f "$target/manifest.json" ]]; then
        local version
        version=$(jq -r '.version // "unknown"' "$target/manifest.json" 2>/dev/null || echo "unknown")
        echo "Version:   $version"
    fi
}

# ── Usage ──────────────────

show_usage() {
    cat <<EOF
Usage: constructs-link.sh <command> [args]

Commands:
  link <path>       Link a local construct directory for development
  unlink <slug>     Unlink and restore from shadow
  list              Show all active links
  status <slug>     Show link health and drift

Examples:
  constructs-link.sh link ../construct-observer
  constructs-link.sh unlink observer
  constructs-link.sh list
  constructs-link.sh status observer

Exit Codes:
  0  Success
  1  General error
  3  Not found
  5  Validation error
  7  Already exists
EOF
}

# ── Main ──────────────────

main() {
    local command="${1:-}"

    case "$command" in
        link)
            [[ -z "${2:-}" ]] && { print_error "Usage: constructs-link.sh link <path>"; return $EXIT_VALIDATION_ERROR; }
            do_link "$2"
            ;;
        unlink)
            [[ -z "${2:-}" ]] && { print_error "Usage: constructs-link.sh unlink <slug>"; return $EXIT_VALIDATION_ERROR; }
            do_unlink "$2"
            ;;
        list)
            do_list
            ;;
        status)
            [[ -z "${2:-}" ]] && { print_error "Usage: constructs-link.sh status <slug>"; return $EXIT_VALIDATION_ERROR; }
            do_status "$2"
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
