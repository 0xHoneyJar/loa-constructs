#!/usr/bin/env bash
# =============================================================================
# Loa Constructs - Registration Script
# =============================================================================
# Register a new construct on the Loa Constructs Registry.
#
# Usage:
#   constructs-register.sh <slug> --git-url <url> [--name "Name"] [--git-ref <ref>]
#
# Exit Codes:
#   0 = success
#   1 = authentication error
#   2 = network error
#   3 = not found
#   5 = validation error
#   6 = general error
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source shared library
if [[ -f "$SCRIPT_DIR/constructs-lib.sh" ]]; then
    source "$SCRIPT_DIR/constructs-lib.sh"
else
    echo "ERROR: constructs-lib.sh not found" >&2
    exit 6
fi

# Exit codes
EXIT_SUCCESS=0
EXIT_AUTH_ERROR=1
EXIT_NETWORK_ERROR=2
EXIT_VALIDATION_ERROR=5
EXIT_ERROR=6

# =============================================================================
# Argument Parsing
# =============================================================================

show_usage() {
    cat << 'EOF'
Usage: constructs-register.sh <slug> --git-url <url> [options]

Register a new construct from a git repository.

Arguments:
    <slug>                  Construct slug (lowercase, hyphens, 3-100 chars)

Options:
    --git-url <url>         Git repository URL (required, HTTPS only)
    --name "Display Name"   Display name (defaults to slug)
    --git-ref <ref>         Git branch/tag (default: main)
    -h, --help              Show this help

Examples:
    constructs-register.sh my-construct --git-url https://github.com/org/construct-my-construct.git
    constructs-register.sh my-pack --git-url https://github.com/org/construct-my-pack.git --name "My Pack"
EOF
}

parse_args() {
    SLUG=""
    GIT_URL=""
    NAME=""
    GIT_REF="main"

    while [[ $# -gt 0 ]]; do
        case "$1" in
            --git-url)
                [[ -n "${2:-}" ]] || { echo "ERROR: --git-url requires a value" >&2; exit $EXIT_VALIDATION_ERROR; }
                GIT_URL="$2"
                shift 2
                ;;
            --name)
                [[ -n "${2:-}" ]] || { echo "ERROR: --name requires a value" >&2; exit $EXIT_VALIDATION_ERROR; }
                NAME="$2"
                shift 2
                ;;
            --git-ref)
                [[ -n "${2:-}" ]] || { echo "ERROR: --git-ref requires a value" >&2; exit $EXIT_VALIDATION_ERROR; }
                GIT_REF="$2"
                shift 2
                ;;
            -h|--help)
                show_usage
                exit $EXIT_SUCCESS
                ;;
            -*)
                echo "ERROR: Unknown option: $1" >&2
                show_usage
                exit $EXIT_VALIDATION_ERROR
                ;;
            *)
                if [[ -z "$SLUG" ]]; then
                    SLUG="$1"
                else
                    echo "ERROR: Unexpected argument: $1" >&2
                    exit $EXIT_VALIDATION_ERROR
                fi
                shift
                ;;
        esac
    done

    # Validate required args
    if [[ -z "$SLUG" ]]; then
        echo "ERROR: Missing construct slug" >&2
        show_usage
        exit $EXIT_VALIDATION_ERROR
    fi

    if [[ -z "$GIT_URL" ]]; then
        echo "ERROR: --git-url is required" >&2
        show_usage
        exit $EXIT_VALIDATION_ERROR
    fi

    # Default name to slug
    [[ -z "$NAME" ]] && NAME="$SLUG"
}

# =============================================================================
# Registration
# =============================================================================

register_construct() {
    local slug="$SLUG"
    local git_url="$GIT_URL"
    local name="$NAME"
    local git_ref="$GIT_REF"

    # Validate slug format
    if type validate_safe_identifier &>/dev/null; then
        validate_safe_identifier "$slug" || {
            echo "ERROR: Invalid slug format. Must be lowercase alphanumeric with hyphens." >&2
            exit $EXIT_VALIDATION_ERROR
        }
    fi

    # Validate URL format
    if type validate_url &>/dev/null; then
        validate_url "$git_url" || {
            echo "ERROR: Invalid URL format. Must be HTTPS." >&2
            exit $EXIT_VALIDATION_ERROR
        }
    fi

    # Resolve API key
    local api_key
    api_key=$(get_api_key 2>/dev/null) || true
    if [[ -z "$api_key" ]]; then
        echo "ERROR: No API key found. Run /constructs auth setup" >&2
        exit $EXIT_AUTH_ERROR
    fi

    # Build request body
    local body
    body=$(jq -n \
        --arg slug "$slug" \
        --arg name "$name" \
        --arg git_url "$git_url" \
        --arg git_ref "$git_ref" \
        '{slug: $slug, name: $name, git_url: $git_url, git_ref: $git_ref}')

    # Resolve registry URL
    local registry_url
    registry_url=$(get_registry_url)

    # SHELL-002: Use curl config file to avoid exposing API key in process list
    local curl_config
    curl_config=$(mktemp)
    chmod 600 "$curl_config"
    echo "header = \"Authorization: Bearer ${api_key}\"" > "$curl_config"

    echo "Registering construct: $slug"
    echo "  Repository: $git_url ($git_ref)"
    echo ""

    local tmp_file
    tmp_file=$(mktemp)
    chmod 600 "$tmp_file"

    local http_code
    http_code=$(curl -s -w "%{http_code}" \
        --config "$curl_config" \
        --proto =https --tlsv1.2 --max-time 120 \
        -H "Content-Type: application/json" \
        -d "$body" \
        "${registry_url}/constructs/register" \
        -o "$tmp_file" 2>/dev/null) || {
        rm -f "$curl_config" "$tmp_file"
        echo "ERROR: Network error — could not reach registry" >&2
        exit $EXIT_NETWORK_ERROR
    }

    rm -f "$curl_config"

    # Handle response
    case "$http_code" in
        201)
            local status source_type next_step
            status=$(jq -r '.data.status // "unknown"' "$tmp_file" 2>/dev/null)
            source_type=$(jq -r '.data.source_type // empty' "$tmp_file" 2>/dev/null)
            next_step=$(jq -r '.data.next_step // empty' "$tmp_file" 2>/dev/null)

            echo "  Registered: $slug (status: $status)"
            [[ -n "$source_type" ]] && echo "  Source: $source_type ($git_url)"
            echo ""
            if [[ -n "$next_step" ]]; then
                echo "  Next: $next_step"
            fi
            echo "  To populate initial version: /constructs sync $slug"

            rm -f "$tmp_file"
            return $EXIT_SUCCESS
            ;;
        401|403)
            echo "ERROR: Authentication failed. Check your API key." >&2
            rm -f "$tmp_file"
            exit $EXIT_AUTH_ERROR
            ;;
        409)
            local error_msg
            error_msg=$(jq -r '.error.message // "Slug already taken"' "$tmp_file" 2>/dev/null)
            echo "ERROR: $error_msg" >&2
            rm -f "$tmp_file"
            exit $EXIT_VALIDATION_ERROR
            ;;
        422)
            local error_msg
            error_msg=$(jq -r '.error.message // "Validation failed"' "$tmp_file" 2>/dev/null)
            echo "ERROR: $error_msg" >&2
            rm -f "$tmp_file"
            exit $EXIT_VALIDATION_ERROR
            ;;
        429)
            echo "ERROR: Rate limited. Maximum 5 registrations per 24 hours." >&2
            rm -f "$tmp_file"
            exit $EXIT_ERROR
            ;;
        *)
            local error_msg
            error_msg=$(jq -r '.error.message // "Unknown error"' "$tmp_file" 2>/dev/null)
            echo "ERROR: Registration failed (HTTP $http_code): $error_msg" >&2
            rm -f "$tmp_file"
            exit $EXIT_ERROR
            ;;
    esac
}

# =============================================================================
# Main
# =============================================================================

parse_args "$@"
register_construct
