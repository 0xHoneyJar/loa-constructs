#!/usr/bin/env bash
# constructs-cli.sh - Manage Forge packs in Loa Constructs Registry
#
# Usage:
#   ./scripts/constructs-cli.sh <command> [args]
#
# Commands:
#   list              List local packs with registry status
#   upload <pack>     Create pack and upload version
#   submit <pack>     Submit pack for review
#   status <pack>     Check review status
#   approve <pack>    Admin approve pack
#   publish <pack>    Full pipeline: upload → submit → approve

set -euo pipefail

# ═══════════════════════════════════════════════════════════════════════════════
# Exit Codes
# ═══════════════════════════════════════════════════════════════════════════════
readonly EXIT_SUCCESS=0
readonly EXIT_ERROR=1
readonly EXIT_AUTH=2
readonly EXIT_NETWORK=3
readonly EXIT_NOT_FOUND=4
readonly EXIT_VALIDATION=5

# ═══════════════════════════════════════════════════════════════════════════════
# Configuration
# ═══════════════════════════════════════════════════════════════════════════════
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SANDBOX_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PACKS_DIR="$SANDBOX_ROOT/packs"

# Default API URL
API_URL="${LOA_CONSTRUCTS_API_URL:-https://api.constructs.network/v1}"
API_KEY=""
ADMIN_KEY=""

load_config() {
    local env_file="$SANDBOX_ROOT/.env"

    if [[ -f "$env_file" ]]; then
        # Source .env file safely
        while IFS='=' read -r key value; do
            # Skip comments and empty lines
            [[ "$key" =~ ^#.*$ || -z "$key" ]] && continue
            # Remove quotes from value
            value="${value%\"}"
            value="${value#\"}"
            value="${value%\'}"
            value="${value#\'}"
            # Export the variable
            export "$key=$value"
        done < "$env_file"
    fi

    API_KEY="${LOA_CONSTRUCTS_API_KEY:-}"
    ADMIN_KEY="${LOA_CONSTRUCTS_ADMIN_KEY:-}"
    API_URL="${LOA_CONSTRUCTS_API_URL:-https://api.constructs.network/v1}"

    if [[ -z "$API_KEY" ]]; then
        log_error "LOA_CONSTRUCTS_API_KEY not set"
        log_info "Create .env file with: LOA_CONSTRUCTS_API_KEY=sk_your_key"
        return $EXIT_AUTH
    fi
}

# ═══════════════════════════════════════════════════════════════════════════════
# Logging
# ═══════════════════════════════════════════════════════════════════════════════
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[0;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}ℹ${NC} $*"
}

log_success() {
    echo -e "${GREEN}✓${NC} $*"
}

log_error() {
    echo -e "${RED}✗${NC} $*" >&2
}

log_warn() {
    echo -e "${YELLOW}⚠${NC} $*"
}

# ═══════════════════════════════════════════════════════════════════════════════
# Utilities
# ═══════════════════════════════════════════════════════════════════════════════
validate_pack_slug() {
    local slug="$1"
    if [[ ! "$slug" =~ ^[a-z0-9-]+$ ]]; then
        log_error "Invalid pack slug: must be lowercase alphanumeric with hyphens"
        return $EXIT_VALIDATION
    fi
}

find_packs() {
    cd "$PACKS_DIR"
    for dir in */; do
        # Look for manifest.json in each pack directory
        if [[ -f "${dir}manifest.json" ]]; then
            echo "${dir%/}"
        fi
    done
}

get_pack_version() {
    local pack_dir="$1"
    local index_file="$PACKS_DIR/$pack_dir/index.yaml"
    local manifest_file="$PACKS_DIR/$pack_dir/manifest.json"

    if [[ -f "$manifest_file" ]]; then
        jq -r '.version // ""' "$manifest_file" 2>/dev/null
    elif [[ -f "$index_file" ]]; then
        grep -E '^version:' "$index_file" | sed 's/version:[[:space:]]*//' | tr -d '"' | tr -d "'"
    else
        echo ""
    fi
}

get_pack_name() {
    local pack_dir="$1"
    local index_file="$PACKS_DIR/$pack_dir/index.yaml"
    local manifest_file="$PACKS_DIR/$pack_dir/manifest.json"

    if [[ -f "$manifest_file" ]]; then
        jq -r '.name // ""' "$manifest_file" 2>/dev/null || echo "$pack_dir"
    elif [[ -f "$index_file" ]]; then
        grep -E '^name:' "$index_file" | sed 's/name:[[:space:]]*//' | tr -d '"' | tr -d "'"
    else
        echo "$pack_dir"
    fi
}

get_pack_description() {
    local pack_dir="$1"
    local index_file="$PACKS_DIR/$pack_dir/index.yaml"
    local manifest_file="$PACKS_DIR/$pack_dir/manifest.json"

    if [[ -f "$manifest_file" ]]; then
        jq -r '.description // ""' "$manifest_file" 2>/dev/null || echo "Forge pack: $pack_dir"
    elif [[ -f "$index_file" ]]; then
        grep -E '^description:' "$index_file" | sed 's/description:[[:space:]]*//' | tr -d '"' | tr -d "'"
    else
        echo "Forge pack: $pack_dir"
    fi
}

detect_mime() {
    local file="$1"
    local ext="${file##*.}"
    case "$ext" in
        yaml|yml) echo "text/yaml" ;;
        md) echo "text/markdown" ;;
        json) echo "application/json" ;;
        sh) echo "application/x-sh" ;;
        txt) echo "text/plain" ;;
        *) echo "application/octet-stream" ;;
    esac
}

encode_file() {
    local file="$1"
    base64 < "$file" | tr -d '\n'
}

# ═══════════════════════════════════════════════════════════════════════════════
# API Functions
# ═══════════════════════════════════════════════════════════════════════════════
api_get() {
    local endpoint="$1"
    local response
    local http_code

    response=$(curl -s -w "\n%{http_code}" \
        -H "Authorization: Bearer $API_KEY" \
        -H "Content-Type: application/json" \
        "$API_URL$endpoint" 2>/dev/null) || {
        log_error "Network error: Could not connect to API"
        return $EXIT_NETWORK
    }

    http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')

    handle_api_response "$http_code" "$body" "$endpoint"
    local result=$?

    if [[ $result -eq 0 ]]; then
        echo "$body"
    fi
    return $result
}

api_post_json() {
    local endpoint="$1"
    local data="$2"
    local auth_key="${3:-$API_KEY}"
    local response
    local http_code

    response=$(curl -s -w "\n%{http_code}" \
        -X POST \
        -H "Authorization: Bearer $auth_key" \
        -H "Content-Type: application/json" \
        -d "$data" \
        "$API_URL$endpoint" 2>/dev/null) || {
        log_error "Network error: Could not connect to API"
        return $EXIT_NETWORK
    }

    http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')

    handle_api_response "$http_code" "$body" "$endpoint"
    local result=$?

    if [[ $result -eq 0 ]]; then
        echo "$body"
    fi
    return $result
}

handle_api_response() {
    local http_code="$1"
    local body="$2"
    local endpoint="${3:-}"

    case "$http_code" in
        200|201)
            return 0
            ;;
        401)
            log_error "Authentication failed: Invalid or expired API key"
            return $EXIT_AUTH
            ;;
        404)
            log_error "Resource not found: $endpoint"
            return $EXIT_NOT_FOUND
            ;;
        409)
            # Conflict - resource already exists (idempotent)
            log_warn "Resource already exists"
            return 0
            ;;
        422)
            local msg=$(echo "$body" | jq -r '.message // .error // "Validation error"' 2>/dev/null || echo "Validation error")
            log_error "Validation error: $msg"
            return $EXIT_VALIDATION
            ;;
        5*)
            log_error "Server error ($http_code)"
            return $EXIT_NETWORK
            ;;
        *)
            log_error "Unexpected error: HTTP $http_code"
            return $EXIT_ERROR
            ;;
    esac
}

# ═══════════════════════════════════════════════════════════════════════════════
# Commands
# ═══════════════════════════════════════════════════════════════════════════════
cmd_list() {
    log_info "Discovering local packs..."

    local packs
    packs=$(find_packs)

    if [[ -z "$packs" ]]; then
        log_warn "No packs found in $PACKS_DIR"
        return 0
    fi

    # Get registry status
    local registry_packs=""
    registry_packs=$(api_get "/creator/packs" 2>/dev/null) || registry_packs="[]"

    # Print header
    echo ""
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║  Forge Packs Status                                          ║"
    echo "╠══════════════════════════════════════════════════════════════╣"
    printf "║  %-14s │ %-6s │ %-8s │ %-18s ║\n" "Pack" "Local" "Registry" "Status"
    echo "╠═════════════════╪════════╪══════════╪════════════════════════╣"

    # Process each pack
    while IFS= read -r pack; do
        [[ -z "$pack" ]] && continue

        local local_version=$(get_pack_version "$pack")
        local registry_version="-"
        local status="⬜ not uploaded"

        # Check registry status
        if [[ "$registry_packs" != "[]" ]]; then
            local pack_data=$(echo "$registry_packs" | jq -r ".[] | select(.slug == \"$pack\")" 2>/dev/null)
            if [[ -n "$pack_data" ]]; then
                registry_version=$(echo "$pack_data" | jq -r '.latestVersion // "-"' 2>/dev/null)
                local review_status=$(echo "$pack_data" | jq -r '.reviewStatus // "draft"' 2>/dev/null)

                case "$review_status" in
                    published|approved)
                        status="✅ published"
                        ;;
                    pending_review|pending)
                        status="⏳ pending_review"
                        ;;
                    rejected)
                        status="❌ rejected"
                        ;;
                    draft|*)
                        status="📝 draft"
                        ;;
                esac
            fi
        fi

        printf "║  %-14s │ %-6s │ %-8s │ %-18s ║\n" "$pack" "${local_version:-?}" "$registry_version" "$status"
    done <<< "$packs"

    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""
}

cmd_upload() {
    local pack_slug="$1"

    validate_pack_slug "$pack_slug" || return $?

    local pack_dir="$REPO_ROOT/$pack_slug"
    if [[ ! -d "$pack_dir" ]]; then
        log_error "Pack directory not found: $pack_dir"
        return $EXIT_NOT_FOUND
    fi

    if [[ ! -f "$pack_dir/index.yaml" && ! -f "$pack_dir/manifest.json" ]]; then
        log_error "Missing index.yaml or manifest.json in $pack_dir"
        return $EXIT_VALIDATION
    fi

    local pack_name=$(get_pack_name "$pack_slug")
    local pack_version=$(get_pack_version "$pack_slug")
    local pack_description=$(get_pack_description "$pack_slug")

    if [[ -z "$pack_version" ]]; then
        log_error "Could not read version from index.yaml"
        return $EXIT_VALIDATION
    fi

    log_info "Uploading $pack_slug v$pack_version..."

    # Step 1: Create pack (idempotent - 409 is OK)
    log_info "Creating pack entry..."
    local create_data=$(jq -n \
        --arg name "$pack_name" \
        --arg slug "$pack_slug" \
        --arg desc "$pack_description" \
        '{name: $name, slug: $slug, description: $desc}')

    api_post_json "/packs" "$create_data" >/dev/null 2>&1 || {
        local result=$?
        # Only fail on non-conflict errors
        if [[ $result -ne 0 ]]; then
            return $result
        fi
    }

    # Step 2: Collect and encode files
    log_info "Collecting pack files..."
    local files_json="[]"

    while IFS= read -r -d '' file; do
        local rel_path="${file#$pack_dir/}"
        local mime=$(detect_mime "$file")
        local content=$(encode_file "$file")

        files_json=$(echo "$files_json" | jq \
            --arg path "$rel_path" \
            --arg content "$content" \
            --arg mime "$mime" \
            '. + [{path: $path, content: $content, mimeType: $mime}]')
    done < <(find "$pack_dir" -type f -print0)

    local file_count=$(echo "$files_json" | jq 'length')
    log_info "Uploading $file_count files..."

    # Step 3: Upload version
    local version_data=$(jq -n \
        --arg version "$pack_version" \
        --argjson files "$files_json" \
        '{version: $version, files: $files}')

    local result
    result=$(api_post_json "/packs/$pack_slug/versions" "$version_data") || return $?

    log_success "Uploaded $pack_slug v$pack_version ($file_count files)"
    return 0
}

cmd_submit() {
    local pack_slug="$1"

    validate_pack_slug "$pack_slug" || return $?

    log_info "Submitting $pack_slug for review..."

    local result
    result=$(api_post_json "/packs/$pack_slug/submit" "{}") || return $?

    local submission_id=$(echo "$result" | jq -r '.submissionId // .id // "unknown"' 2>/dev/null)
    log_success "Submitted $pack_slug for review (ID: $submission_id)"
    return 0
}

cmd_status() {
    local pack_slug="$1"

    validate_pack_slug "$pack_slug" || return $?

    log_info "Checking status for $pack_slug..."

    local result
    result=$(api_get "/packs/$pack_slug/review-status") || return $?

    local status=$(echo "$result" | jq -r '.status // .reviewStatus // "unknown"' 2>/dev/null)
    local version=$(echo "$result" | jq -r '.version // .latestVersion // "?"' 2>/dev/null)
    local updated=$(echo "$result" | jq -r '.updatedAt // .lastUpdated // "?"' 2>/dev/null)

    echo ""
    echo "Pack: $pack_slug"
    echo "Version: $version"
    echo "Status: $status"
    echo "Updated: $updated"
    echo ""

    return 0
}

cmd_approve() {
    local pack_slug="$1"

    validate_pack_slug "$pack_slug" || return $?

    if [[ -z "$ADMIN_KEY" ]]; then
        log_error "LOA_CONSTRUCTS_ADMIN_KEY not set (required for approve)"
        return $EXIT_AUTH
    fi

    log_info "Approving $pack_slug..."

    # First, get the pack ID
    local pack_info
    pack_info=$(api_get "/packs/$pack_slug") || return $?

    local pack_id=$(echo "$pack_info" | jq -r '.id' 2>/dev/null)
    if [[ -z "$pack_id" || "$pack_id" == "null" ]]; then
        log_error "Could not get pack ID for $pack_slug"
        return $EXIT_NOT_FOUND
    fi

    # Approve the pack
    local approve_data='{"action": "approve"}'
    local result
    result=$(api_post_json "/admin/packs/$pack_id/review" "$approve_data" "$ADMIN_KEY") || return $?

    log_success "Approved $pack_slug"
    return 0
}

cmd_publish() {
    local pack_slug="$1"

    validate_pack_slug "$pack_slug" || return $?

    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo "  Publishing $pack_slug"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""

    # Step 1: Upload
    echo "Step 1/3: Upload"
    cmd_upload "$pack_slug" || {
        log_error "Upload failed"
        return $?
    }
    echo ""

    # Step 2: Submit
    echo "Step 2/3: Submit"
    cmd_submit "$pack_slug" || {
        log_error "Submit failed"
        return $?
    }
    echo ""

    # Step 3: Approve (optional - requires admin key)
    echo "Step 3/3: Approve"
    if [[ -n "$ADMIN_KEY" ]]; then
        cmd_approve "$pack_slug" || {
            log_error "Approve failed"
            return $?
        }
    else
        log_warn "Skipping approve (no admin key)"
        log_info "Pack is pending review"
    fi
    echo ""

    # Final status
    echo "═══════════════════════════════════════════════════════════════"
    cmd_status "$pack_slug"

    log_success "Publish pipeline complete for $pack_slug"
    return 0
}

cmd_help() {
    cat << 'EOF'
constructs-cli.sh - Manage Forge packs in Loa Constructs Registry

USAGE:
    ./scripts/constructs-cli.sh <command> [args]

COMMANDS:
    list              List local packs with registry status
    upload <pack>     Create pack and upload version
    submit <pack>     Submit pack for review
    status <pack>     Check review status
    approve <pack>    Admin approve pack (requires admin key)
    publish <pack>    Full pipeline: upload → submit → approve
    help              Show this help message

ENVIRONMENT:
    LOA_CONSTRUCTS_API_KEY      API key for authentication (required)
    LOA_CONSTRUCTS_ADMIN_KEY    Admin key for approve command (optional)
    LOA_CONSTRUCTS_API_URL      API base URL (default: https://api.constructs.network/v1)

EXIT CODES:
    0    Success
    1    General error
    2    Authentication error
    3    Network error
    4    Resource not found
    5    Validation error

EXAMPLES:
    ./scripts/constructs-cli.sh list
    ./scripts/constructs-cli.sh upload observer
    ./scripts/constructs-cli.sh publish llm-ready
EOF
}

# ═══════════════════════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════════════════════
main() {
    local command="${1:-help}"
    shift || true

    # Load configuration for commands that need it
    if [[ "$command" != "help" ]]; then
        load_config || return $?
    fi

    case "$command" in
        list)
            cmd_list
            ;;
        upload)
            if [[ $# -lt 1 ]]; then
                log_error "Usage: $0 upload <pack>"
                return $EXIT_ERROR
            fi
            cmd_upload "$1"
            ;;
        submit)
            if [[ $# -lt 1 ]]; then
                log_error "Usage: $0 submit <pack>"
                return $EXIT_ERROR
            fi
            cmd_submit "$1"
            ;;
        status)
            if [[ $# -lt 1 ]]; then
                log_error "Usage: $0 status <pack>"
                return $EXIT_ERROR
            fi
            cmd_status "$1"
            ;;
        approve)
            if [[ $# -lt 1 ]]; then
                log_error "Usage: $0 approve <pack>"
                return $EXIT_ERROR
            fi
            cmd_approve "$1"
            ;;
        publish)
            if [[ $# -lt 1 ]]; then
                log_error "Usage: $0 publish <pack>"
                return $EXIT_ERROR
            fi
            cmd_publish "$1"
            ;;
        help|--help|-h)
            cmd_help
            ;;
        *)
            log_error "Unknown command: $command"
            echo ""
            cmd_help
            return $EXIT_ERROR
            ;;
    esac
}

main "$@"
