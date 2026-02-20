#!/usr/bin/env bash
# constructs-publish.sh — Publish constructs to the registry
# Part of construct-network-tools pack (cycle-032)
#
# Subcommands: validate, push, dry-run, fork
#
# Usage:
#   constructs-publish.sh validate <path>                Validate construct for publishing
#   constructs-publish.sh push <path>                    Validate + upload to registry
#   constructs-publish.sh dry-run <path>                 Show package contents without uploading
#   constructs-publish.sh fork --scope <scope> <slug>    Fork as scoped variant

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source shared library
# shellcheck source=constructs-lib.sh
source "$SCRIPT_DIR/constructs-lib.sh"

# Exit codes
readonly EXIT_SUCCESS=0
readonly EXIT_GENERAL_ERROR=1
readonly EXIT_AUTH_ERROR=2
readonly EXIT_NOT_FOUND=3
readonly EXIT_VALIDATION_ERROR=5
readonly EXIT_RATE_LIMITED=8

# ── Validation Checklist ──────────────────

# Run 10-point validation checklist per SDD §5.4
do_validate() {
    local path="$1"
    local json_output="${2:-false}"

    if [[ ! -d "$path" ]]; then
        print_error "Directory not found: $path"
        return $EXIT_NOT_FOUND
    fi

    local pass=0
    local fail=0
    local warnings=0
    local results=()

    # 1. Manifest exists
    local manifest_file=""
    if [[ -f "$path/construct.yaml" ]]; then
        manifest_file="$path/construct.yaml"
        results+=('{"check":"manifest_exists","status":"pass","detail":"construct.yaml found"}')
        pass=$((pass + 1))
    elif [[ -f "$path/manifest.json" ]]; then
        manifest_file="$path/manifest.json"
        results+=('{"check":"manifest_exists","status":"pass","detail":"manifest.json found"}')
        pass=$((pass + 1))
    else
        results+=('{"check":"manifest_exists","status":"fail","detail":"No construct.yaml or manifest.json"}')
        fail=$((fail + 1))
    fi

    # 2. Required fields present (name, slug, version, description)
    if [[ -n "$manifest_file" ]]; then
        local has_fields=true
        for field in name slug version description; do
            if [[ "$manifest_file" == *.yaml ]]; then
                local val
                val=$(yq -r ".$field // empty" "$manifest_file" 2>/dev/null || true)
                [[ -z "$val" ]] && has_fields=false
            else
                local val
                val=$(jq -r ".$field // empty" "$manifest_file" 2>/dev/null || true)
                [[ -z "$val" ]] && has_fields=false
            fi
        done
        if [[ "$has_fields" == "true" ]]; then
            results+=('{"check":"required_fields","status":"pass","detail":"name, slug, version, description present"}')
            pass=$((pass + 1))
        else
            results+=('{"check":"required_fields","status":"fail","detail":"Missing required field(s)"}')
            fail=$((fail + 1))
        fi
    else
        results+=('{"check":"required_fields","status":"skip","detail":"No manifest to check"}')
    fi

    # 3. Version is valid semver
    if [[ -n "$manifest_file" ]]; then
        local version
        if [[ "$manifest_file" == *.yaml ]]; then
            version=$(yq -r '.version // empty' "$manifest_file" 2>/dev/null || true)
        else
            version=$(jq -r '.version // empty' "$manifest_file" 2>/dev/null || true)
        fi
        if [[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.-]+)?$ ]]; then
            results+=('{"check":"semver_version","status":"pass","detail":"Version '"$version"' is valid semver"}')
            pass=$((pass + 1))
        else
            results+=('{"check":"semver_version","status":"fail","detail":"Invalid version: '"$version"'"}')
            fail=$((fail + 1))
        fi
    fi

    # 4. At least one skill defined
    if [[ -n "$manifest_file" ]]; then
        local skill_count=0
        if [[ "$manifest_file" == *.yaml ]]; then
            skill_count=$(yq '.skills | length' "$manifest_file" 2>/dev/null || echo "0")
        else
            skill_count=$(jq '.skills | length' "$manifest_file" 2>/dev/null || echo "0")
        fi
        if [[ "$skill_count" -gt 0 ]]; then
            results+=('{"check":"has_skills","status":"pass","detail":"'"$skill_count"' skill(s) defined"}')
            pass=$((pass + 1))
        else
            results+=('{"check":"has_skills","status":"warn","detail":"No skills defined"}')
            warnings=$((warnings + 1))
        fi
    fi

    # 5. All skill paths exist
    local skill_paths_ok=true
    if [[ -n "$manifest_file" ]] && [[ "$skill_count" -gt 0 ]]; then
        local skill_paths
        if [[ "$manifest_file" == *.yaml ]]; then
            skill_paths=$(yq -r '.skills[].path' "$manifest_file" 2>/dev/null || true)
        else
            skill_paths=$(jq -r '.skills[].path' "$manifest_file" 2>/dev/null || true)
        fi
        while IFS= read -r sp; do
            [[ -z "$sp" ]] && continue
            if [[ ! -d "$path/$sp" ]] && [[ ! -f "$path/$sp" ]]; then
                skill_paths_ok=false
                break
            fi
        done <<< "$skill_paths"
        if [[ "$skill_paths_ok" == "true" ]]; then
            results+=('{"check":"skill_paths","status":"pass","detail":"All skill paths exist"}')
            pass=$((pass + 1))
        else
            results+=('{"check":"skill_paths","status":"fail","detail":"Missing skill path(s)"}')
            fail=$((fail + 1))
        fi
    fi

    # 6. No .git directory in package
    if [[ -d "$path/.git" ]]; then
        results+=('{"check":"no_git","status":"warn","detail":".git/ will be filtered from package"}')
        warnings=$((warnings + 1))
    else
        results+=('{"check":"no_git","status":"pass","detail":"No .git directory"}')
        pass=$((pass + 1))
    fi

    # 7. License field or LICENSE file exists
    local has_license=false
    if [[ -f "$path/LICENSE" ]] || [[ -f "$path/LICENSE.md" ]]; then
        has_license=true
    fi
    if [[ -n "$manifest_file" ]]; then
        local license_field
        if [[ "$manifest_file" == *.yaml ]]; then
            license_field=$(yq -r '.license // empty' "$manifest_file" 2>/dev/null || true)
        else
            license_field=$(jq -r '.license // empty' "$manifest_file" 2>/dev/null || true)
        fi
        [[ -n "$license_field" ]] && has_license=true
    fi
    if [[ "$has_license" == "true" ]]; then
        results+=('{"check":"license","status":"pass","detail":"License specified"}')
        pass=$((pass + 1))
    else
        results+=('{"check":"license","status":"warn","detail":"No license specified"}')
        warnings=$((warnings + 1))
    fi

    # 8. README exists
    if [[ -f "$path/README.md" ]]; then
        results+=('{"check":"readme","status":"pass","detail":"README.md found"}')
        pass=$((pass + 1))
    else
        results+=('{"check":"readme","status":"warn","detail":"No README.md"}')
        warnings=$((warnings + 1))
    fi

    # 9. No sensitive files
    local sensitive_found=false
    for pattern in .env .env.local credentials.json secrets.yaml; do
        if [[ -f "$path/$pattern" ]]; then
            sensitive_found=true
            break
        fi
    done
    if [[ "$sensitive_found" == "false" ]]; then
        results+=('{"check":"no_secrets","status":"pass","detail":"No sensitive files detected"}')
        pass=$((pass + 1))
    else
        results+=('{"check":"no_secrets","status":"fail","detail":"Sensitive file(s) found — remove before publishing"}')
        fail=$((fail + 1))
    fi

    # 10. Package size reasonable (< 10MB)
    local size_kb
    size_kb=$(du -sk "$path" 2>/dev/null | cut -f1)
    if [[ "$size_kb" -lt 10240 ]]; then
        results+=('{"check":"package_size","status":"pass","detail":"'"${size_kb}KB"' (< 10MB limit)"}')
        pass=$((pass + 1))
    else
        results+=('{"check":"package_size","status":"fail","detail":"'"${size_kb}KB"' exceeds 10MB limit"}')
        fail=$((fail + 1))
    fi

    # Output
    if [[ "$json_output" == "true" ]]; then
        local results_json
        results_json=$(printf '%s\n' "${results[@]}" | jq -s .)
        jq -n \
            --argjson pass "$pass" \
            --argjson fail "$fail" \
            --argjson warnings "$warnings" \
            --argjson checks "$results_json" \
            --argjson valid "$([ $fail -eq 0 ] && echo true || echo false)" \
            '{valid: $valid, pass: $pass, fail: $fail, warnings: $warnings, checks: $checks}'
    else
        echo "Validation Results:"
        echo ""
        for r in "${results[@]}"; do
            local status check detail
            status=$(echo "$r" | jq -r '.status')
            check=$(echo "$r" | jq -r '.check')
            detail=$(echo "$r" | jq -r '.detail')
            case "$status" in
                pass) printf "  ✓ %-20s %s\n" "$check" "$detail" ;;
                fail) printf "  ✗ %-20s %s\n" "$check" "$detail" ;;
                warn) printf "  ⚠ %-20s %s\n" "$check" "$detail" ;;
                skip) printf "  - %-20s %s\n" "$check" "$detail" ;;
            esac
        done
        echo ""
        echo "Result: $pass passed, $fail failed, $warnings warnings"
        [[ $fail -eq 0 ]] && echo "Status: READY TO PUBLISH" || echo "Status: NOT READY"
    fi

    [[ $fail -eq 0 ]] && return $EXIT_SUCCESS || return $EXIT_VALIDATION_ERROR
}

# Publish construct to registry
do_push() {
    local path="$1"

    # Rate limit check
    if ! check_rate_limit "publish" 10; then
        print_error "Rate limit exceeded: max 10 publishes per hour"
        return $EXIT_RATE_LIMITED
    fi

    # Validate first
    print_status "Running validation..."
    if ! do_validate "$path" "false"; then
        print_error "Validation failed — fix issues before publishing"
        return $EXIT_VALIDATION_ERROR
    fi

    # Get API key
    local api_key
    api_key=$(get_api_key) || {
        print_error "Authentication required. Run: /constructs auth setup"
        return $EXIT_AUTH_ERROR
    }

    # Get slug and version from manifest
    local manifest_file=""
    [[ -f "$path/construct.yaml" ]] && manifest_file="$path/construct.yaml"
    [[ -f "$path/manifest.json" ]] && manifest_file="$path/manifest.json"

    local slug version
    if [[ "$manifest_file" == *.yaml ]]; then
        slug=$(yq -r '.slug' "$manifest_file")
        version=$(yq -r '.version' "$manifest_file")
    else
        slug=$(jq -r '.slug' "$manifest_file")
        version=$(jq -r '.version' "$manifest_file")
    fi

    print_status "Publishing $slug@$version..."

    # Check permissions
    local registry_url
    registry_url=$(get_registry_url)

    local tmp_file
    tmp_file=$(mktemp)
    chmod 600 "$tmp_file"

    local http_code
    http_code=$(curl --silent --proto '=https' --tlsv1.2 \
        -o "$tmp_file" -w "%{http_code}" \
        -H "Authorization: Bearer $api_key" \
        "${registry_url}/packs/${slug}/permissions")

    if [[ "$http_code" != "200" ]]; then
        print_error "Cannot check permissions (HTTP $http_code)"
        rm -f "$tmp_file"
        return $EXIT_AUTH_ERROR
    fi

    local can_publish
    can_publish=$(jq -r '.data.permissions.can_publish' "$tmp_file")
    rm -f "$tmp_file"

    if [[ "$can_publish" != "true" ]]; then
        print_error "You don't have publish permission for '$slug'"
        return $EXIT_AUTH_ERROR
    fi

    # Upload (simplified — actual upload involves base64 encoding files)
    print_status "Uploading $slug@$version to registry..."
    print_warning "Publish upload not yet implemented — use registry web UI"

    return $EXIT_SUCCESS
}

# Show package contents without uploading
do_dry_run() {
    local path="$1"

    if [[ ! -d "$path" ]]; then
        print_error "Directory not found: $path"
        return $EXIT_NOT_FOUND
    fi

    echo "Package contents (excluding .git/):"
    echo ""

    local total_files=0
    local total_size=0

    while IFS= read -r -d '' file; do
        local rel="${file#$path/}"
        local size
        size=$(wc -c < "$file" 2>/dev/null || echo "0")
        printf "  %-60s %s\n" "$rel" "$(numfmt --to=iec "$size" 2>/dev/null || echo "${size}B")"
        total_files=$((total_files + 1))
        total_size=$((total_size + size))
    done < <(find "$path" -type f -not -path '*/.git/*' -print0 | LC_ALL=C sort -z)

    echo ""
    echo "$total_files file(s), $(numfmt --to=iec "$total_size" 2>/dev/null || echo "${total_size}B") total"
}

# Fork a construct as a scoped variant
do_fork() {
    local scope=""
    local source_slug=""

    # Parse args
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --scope) scope="$2"; shift 2 ;;
            *) source_slug="$1"; shift ;;
        esac
    done

    if [[ -z "$source_slug" ]] || [[ -z "$scope" ]]; then
        print_error "Usage: constructs-publish.sh fork --scope <scope> <slug>"
        return $EXIT_VALIDATION_ERROR
    fi

    validate_safe_identifier "$source_slug" || return $EXIT_VALIDATION_ERROR
    validate_safe_identifier "$scope" || return $EXIT_VALIDATION_ERROR

    local api_key
    api_key=$(get_api_key) || {
        print_error "Authentication required"
        return $EXIT_AUTH_ERROR
    }

    local registry_url
    registry_url=$(get_registry_url)

    local new_slug="${scope}-${source_slug}"

    print_status "Forking $source_slug as $new_slug..."

    local tmp_file
    tmp_file=$(mktemp)
    chmod 600 "$tmp_file"

    local http_code
    http_code=$(curl --silent --proto '=https' --tlsv1.2 \
        -o "$tmp_file" -w "%{http_code}" \
        -X POST \
        -H "Authorization: Bearer $api_key" \
        -H "Content-Type: application/json" \
        -d "$(jq -n --arg ss "$source_slug" --arg ns "$new_slug" '{source_slug: $ss, new_slug: $ns}')" \
        "${registry_url}/packs/fork")

    case "$http_code" in
        201)
            print_success "Forked $source_slug → $new_slug (version 0.1.0)"
            jq '.' "$tmp_file"
            ;;
        404)
            print_error "Source pack '$source_slug' not found"
            rm -f "$tmp_file"
            return $EXIT_NOT_FOUND
            ;;
        409)
            print_error "Slug '$new_slug' already exists"
            rm -f "$tmp_file"
            return $EXIT_GENERAL_ERROR
            ;;
        *)
            print_error "Fork failed (HTTP $http_code)"
            rm -f "$tmp_file"
            return $EXIT_GENERAL_ERROR
            ;;
    esac

    rm -f "$tmp_file"
}

# ── Usage ──────────────────

show_usage() {
    cat <<EOF
Usage: constructs-publish.sh <command> [args]

Commands:
  validate <path>                     Run 10-point validation checklist
  push <path>                         Validate and upload to registry
  dry-run <path>                      Show package contents without uploading
  fork --scope <scope> <slug>         Fork as scoped variant

Flags:
  --json                              Output in JSON format (validate only)

Exit Codes:
  0  Success
  1  General error
  2  Authentication error
  3  Not found
  5  Validation error
  8  Rate limited
EOF
}

# ── Main ──────────────────

main() {
    local command="${1:-}"
    local json_flag="false"

    for arg in "$@"; do
        [[ "$arg" == "--json" ]] && json_flag="true"
    done

    case "$command" in
        validate)
            [[ -z "${2:-}" ]] && { print_error "Usage: constructs-publish.sh validate <path>"; return $EXIT_VALIDATION_ERROR; }
            do_validate "$2" "$json_flag"
            ;;
        push)
            [[ -z "${2:-}" ]] && { print_error "Usage: constructs-publish.sh push <path>"; return $EXIT_VALIDATION_ERROR; }
            do_push "$2"
            ;;
        dry-run)
            [[ -z "${2:-}" ]] && { print_error "Usage: constructs-publish.sh dry-run <path>"; return $EXIT_VALIDATION_ERROR; }
            do_dry_run "$2"
            ;;
        fork)
            shift
            do_fork "$@"
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
