#!/usr/bin/env bash
# =============================================================================
# Loa Constructs - Installation Script
# =============================================================================
# Install packs and skills from the Loa Constructs Registry.
#
# Usage:
#   constructs-install.sh pack <slug>              # Install a pack
#   constructs-install.sh skill <vendor/slug>      # Install a skill
#   constructs-install.sh uninstall pack <slug>    # Remove a pack
#   constructs-install.sh uninstall skill <slug>   # Remove a skill
#   constructs-install.sh link-commands <slug>     # Re-link pack commands
#
# Exit Codes:
#   0 = success
#   1 = authentication error
#   2 = network error
#   3 = not found
#   4 = extraction error
#   5 = validation error
#   6 = general error
#
# Environment Variables:
#   LOA_CONSTRUCTS_API_KEY  - API key for authentication
#   LOA_REGISTRY_URL        - Override API URL
#   LOA_OFFLINE             - Set to 1 for offline mode (skip download)
#
# Sources: GitHub Issue #20, GitHub Issue #21
# =============================================================================

set -euo pipefail

# Get script directory for sourcing dependencies
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source shared library
if [[ -f "$SCRIPT_DIR/constructs-lib.sh" ]]; then
    source "$SCRIPT_DIR/constructs-lib.sh"
else
    echo "ERROR: constructs-lib.sh not found" >&2
    exit 6
fi

# Source cross-platform compatibility library
if [[ -f "$SCRIPT_DIR/compat-lib.sh" ]]; then
    source "$SCRIPT_DIR/compat-lib.sh"
fi

# =============================================================================
# Exit Codes
# =============================================================================

EXIT_SUCCESS=0
EXIT_AUTH_ERROR=1
EXIT_NETWORK_ERROR=2
EXIT_NOT_FOUND=3
EXIT_EXTRACT_ERROR=4
EXIT_VALIDATION_ERROR=5
EXIT_ERROR=6

# =============================================================================
# Authentication
# =============================================================================

# NOTE: check_file_permissions() and get_api_key() moved to constructs-lib.sh (Issue #104)

# =============================================================================
# Directory Management
# =============================================================================

# Get constructs directory
get_constructs_dir() {
    echo "${LOA_CONSTRUCTS_DIR:-.claude/constructs}"
}

# Get packs directory
get_packs_dir() {
    echo "$(get_constructs_dir)/packs"
}

# Get skills directory
get_skills_dir() {
    echo "$(get_constructs_dir)/skills"
}

# Get commands directory
get_commands_dir() {
    echo ".claude/commands"
}

# =============================================================================
# Symlink Validation (Security: HIGH-003 - Fixed)
# =============================================================================

# Validate that a symlink target resolves within expected directory
# Args:
#   $1 - Target path (the path the symlink will point to)
#   $2 - Expected base directory component (e.g., "constructs/packs")
#   $3 - Link location directory (where the symlink will be created)
# Returns: 0 if valid, 1 if outside expected directory
validate_symlink_target() {
    local target="$1"
    local expected_base="$2"
    local link_dir="${3:-.claude/commands}"

    # SECURITY: Check for path traversal components explicitly
    # This catches encoded paths and various bypass attempts
    if [[ "$target" == *".."* ]]; then
        # Count the depth of traversal vs path components
        local traversal_count
        local path_depth
        traversal_count=$(echo "$target" | grep -o '\.\.' | wc -l)
        path_depth=$(echo "$target" | tr '/' '\n' | grep -v '^\.\.$' | grep -v '^$' | wc -l)

        # If traversing more than expected depth, block it
        # constructs symlinks should only go up 1-2 levels max
        if [[ $traversal_count -gt 2 ]]; then
            print_warning "Symlink target has excessive traversal: $target"
            return 1
        fi
    fi

    # SECURITY: Verify target contains expected base path component
    if [[ "$target" != *"$expected_base"* ]]; then
        print_warning "Symlink target outside expected directory: $target (expected: $expected_base)"
        return 1
    fi

    # SECURITY: If the target already exists, verify it resolves correctly
    # Portable: readlink -f → realpath → cd+pwd fallback (macOS compat)
    if [[ -d "$link_dir" ]]; then
        local project_root
        project_root=$(cd "$link_dir" && pwd)
        local resolved_target

        # Create a temporary test to verify resolution
        # Use cd to the link directory and resolve from there
        if command -v get_canonical_path &>/dev/null; then
            resolved_target=$(cd "$link_dir" && get_canonical_path "$target")
        else
            resolved_target=$(cd "$link_dir" && (readlink -f "$target" 2>/dev/null || realpath "$target" 2>/dev/null || echo ""))
        fi

        if [[ -n "$resolved_target" ]]; then
            # Get the constructs directory absolute path
            local constructs_abs constructs_dir
            constructs_dir=$(get_constructs_dir)
            if command -v get_canonical_path &>/dev/null; then
                constructs_abs=$(get_canonical_path "$constructs_dir")
            else
                constructs_abs=$(readlink -f "$constructs_dir" 2>/dev/null || realpath "$constructs_dir" 2>/dev/null || (cd "$constructs_dir" 2>/dev/null && pwd -P) || echo "")
            fi

            # Verify resolved path is within constructs
            if [[ -n "$constructs_abs" ]] && [[ "$resolved_target" != "$constructs_abs"* ]]; then
                print_warning "Symlink resolves outside constructs: $resolved_target"
                return 1
            fi
        fi
    fi

    return 0
}

# =============================================================================
# Command Symlinking (Fixes GitHub Issue #21)
# =============================================================================

# Symlink pack commands to .claude/commands/
# Args:
#   $1 - Pack slug
# Returns: Number of commands linked
symlink_pack_commands() {
    local pack_slug="$1"
    local pack_dir="$(get_packs_dir)/$pack_slug"
    local commands_source="$pack_dir/commands"
    local commands_target="$(get_commands_dir)"
    local linked=0

    # Check if pack has commands
    if [[ ! -d "$commands_source" ]]; then
        echo "0"
        return 0
    fi

    # Ensure commands target directory exists
    mkdir -p "$commands_target"

    # Symlink each command
    for cmd in "$commands_source"/*.md; do
        [[ -f "$cmd" ]] || continue

        local filename
        filename=$(basename "$cmd")

        # Calculate relative path from .claude/commands/ to pack commands
        local relative_path="../constructs/packs/$pack_slug/commands/$filename"
        local target_link="$commands_target/$filename"

        # Check for existing file/symlink
        if [[ -e "$target_link" ]] || [[ -L "$target_link" ]]; then
            if [[ -L "$target_link" ]]; then
                # It's a symlink - check if it points to a constructs pack
                local existing_target
                existing_target=$(readlink "$target_link" 2>/dev/null || echo "")
                if [[ "$existing_target" == *"constructs/packs"* ]]; then
                    # Remove old pack symlink
                    rm -f "$target_link"
                else
                    print_warning "  Skipping $filename: symlink exists to custom location"
                    continue
                fi
            else
                # It's a regular file - don't overwrite
                print_warning "  Skipping $filename: user file exists (not overwriting)"
                continue
            fi
        fi

        # Validate symlink target (M-003)
        if ! validate_symlink_target "$relative_path" "constructs/packs"; then
            print_warning "  Skipping $filename: symlink validation failed"
            continue
        fi

        # Create symlink
        ln -sf "$relative_path" "$target_link"
        ((linked++))
    done

    echo "$linked"
}

# Remove pack command symlinks
# Args:
#   $1 - Pack slug
# Returns: Number of commands unlinked
unlink_pack_commands() {
    local pack_slug="$1"
    local pack_dir="$(get_packs_dir)/$pack_slug"
    local commands_source="$pack_dir/commands"
    local commands_target="$(get_commands_dir)"
    local unlinked=0

    # Check if pack has commands
    if [[ ! -d "$commands_source" ]]; then
        echo "0"
        return 0
    fi

    # Remove symlinks for each command
    for cmd in "$commands_source"/*.md; do
        [[ -f "$cmd" ]] || continue

        local filename
        filename=$(basename "$cmd")
        local target_link="$commands_target/$filename"

        # Check if it's our symlink
        if [[ -L "$target_link" ]]; then
            local existing_target
            existing_target=$(readlink "$target_link" 2>/dev/null || echo "")
            if [[ "$existing_target" == *"constructs/packs/$pack_slug"* ]]; then
                rm -f "$target_link"
                ((unlinked++))
            fi
        fi
    done

    echo "$unlinked"
}

# =============================================================================
# Skill Symlinking (for Claude Code discovery)
# =============================================================================
# Fixed: Skills are now symlinked directly to .claude/skills/ (flat structure)
# instead of .claude/constructs/skills/<pack>/ which Claude Code doesn't discover.
# See: https://github.com/0xHoneyJar/loa-constructs/issues/76

# Symlink pack skills to .claude/skills for Claude Code discovery
# Args:
#   $1 - Pack slug
# Returns: Number of skills linked
symlink_pack_skills() {
    local pack_slug="$1"
    local pack_dir="$(get_packs_dir)/$pack_slug"
    local skills_source="$pack_dir/skills"
    # Use repo root to ensure correct path regardless of cwd
    local repo_root
    repo_root="$(cd "$SCRIPT_DIR/../.." && pwd)"
    local skills_target="$repo_root/.claude/skills"
    local linked=0

    # Check if pack has skills
    if [[ ! -d "$skills_source" ]]; then
        echo "0"
        return 0
    fi

    # Create target directory (should already exist but ensure it does)
    mkdir -p "$skills_target"

    # Symlink each skill directory
    for skill in "$skills_source"/*/; do
        [[ -d "$skill" ]] || continue

        local skill_name
        skill_name=$(basename "$skill")
        # Relative path from .claude/skills/ to .claude/constructs/packs/<pack>/skills/<skill>
        local relative_path="../constructs/packs/$pack_slug/skills/$skill_name"
        local target_link="$skills_target/$skill_name"

        # Check for collision with existing non-symlink path (directory, file, etc.)
        if [[ -e "$target_link" ]] && [[ ! -L "$target_link" ]]; then
            print_warning "  Skipping skill $skill_name: existing non-symlink path present"
            continue
        fi

        # Remove existing symlink if present (from same or different pack)
        if [[ -L "$target_link" ]]; then
            rm -f "$target_link"
        fi

        # Validate symlink target (M-003)
        if ! validate_symlink_target "$relative_path" "constructs/packs/$pack_slug/skills" "$skills_target"; then
            print_warning "  Skipping skill $skill_name: symlink validation failed"
            continue
        fi

        # Create symlink
        ln -sf "$relative_path" "$target_link"
        ((linked++))
    done

    echo "$linked"
}

# Remove pack skill symlinks from .claude/skills/
# Args:
#   $1 - Pack slug
unlink_pack_skills() {
    local pack_slug="$1"
    local pack_dir="$(get_packs_dir)/$pack_slug"
    local skills_source="$pack_dir/skills"
    # Use repo root to ensure correct path regardless of cwd
    local repo_root
    repo_root="$(cd "$SCRIPT_DIR/../.." && pwd)"
    local skills_target="$repo_root/.claude/skills"

    # Check if pack has skills directory
    if [[ ! -d "$skills_source" ]]; then
        return 0
    fi

    # Remove symlinks for each skill in this pack
    for skill in "$skills_source"/*/; do
        [[ -d "$skill" ]] || continue

        local skill_name
        skill_name=$(basename "$skill")
        local target_link="$skills_target/$skill_name"

        # Only remove if it's a symlink pointing to this pack
        if [[ -L "$target_link" ]]; then
            local link_target
            link_target=$(readlink "$target_link" 2>/dev/null || echo "")
            if [[ "$link_target" == *"constructs/packs/$pack_slug/skills/"* ]]; then
                rm -f "$target_link"
            fi
        fi
    done

    # Also clean up legacy location if it exists
    local legacy_target="$(get_skills_dir)/$pack_slug"
    if [[ -d "$legacy_target" ]]; then
        rm -rf "$legacy_target"
    fi
}

# =============================================================================
# Pack Installation
# =============================================================================

# Download and install a pack from the registry
# Args:
#   $1 - Pack slug
do_install_pack() {
    local pack_slug="$1"
    local api_key
    local registry_url
    local packs_dir

    print_status "$icon_valid" "Installing pack: $pack_slug"

    # Check offline mode
    if [[ "${LOA_OFFLINE:-}" == "1" ]]; then
        print_error "ERROR: Cannot install packs in offline mode"
        return $EXIT_NETWORK_ERROR
    fi

    # Get authentication
    api_key=$(get_api_key)
    if [[ -z "$api_key" ]]; then
        print_error "ERROR: No API key found"
        echo ""
        echo "To authenticate, either:"
        echo "  1. Set LOA_CONSTRUCTS_API_KEY environment variable"
        echo "  2. Run /skill-login to save credentials"
        echo "  3. Create ~/.loa/credentials.json with {\"api_key\": \"your-key\"}"
        return $EXIT_AUTH_ERROR
    fi

    # Get registry URL
    registry_url=$(get_registry_url)

    # Create directories
    packs_dir=$(get_packs_dir)
    mkdir -p "$packs_dir"

    # Ensure constructs directory is gitignored
    ensure_constructs_gitignored

    echo "  Downloading from $registry_url/packs/$pack_slug/download..."

    # Download pack
    # SECURITY (MEDIUM-001): Use environment variable for auth header
    # Avoids process substitution file descriptor exposure via lsof
    local response
    local http_code
    local tmp_file
    tmp_file=$(mktemp) || { print_error "mktemp failed"; return 1; }
    chmod 600 "$tmp_file"  # CRITICAL-001 FIX

    # Disable command tracing during API call to prevent key leakage
    { set +x; } 2>/dev/null || true

    # Use environment variable instead of process substitution for security
    local auth_header="Authorization: Bearer $api_key"
    # HIGH-002 FIX: Enforce HTTPS and TLS 1.2+
    http_code=$(curl -s -w "%{http_code}" --proto =https --tlsv1.2 --max-time 300 \
        -H "$auth_header" \
        -H "Accept: application/json" \
        "$registry_url/packs/$pack_slug/download" \
        -o "$tmp_file" 2>/dev/null) || {
        unset auth_header
        rm -f "$tmp_file"
        print_error "ERROR: Network error while downloading pack"
        echo "  Check your network connection and try again"
        return $EXIT_NETWORK_ERROR
    }
    unset auth_header

    # Check HTTP status
    case "$http_code" in
        200)
            # Success
            ;;
        401|403)
            rm -f "$tmp_file"
            print_error "ERROR: Authentication failed (HTTP $http_code)"
            echo "  Your API key may be invalid or expired"
            echo "  Run /skill-login to re-authenticate"
            return $EXIT_AUTH_ERROR
            ;;
        404)
            rm -f "$tmp_file"
            print_error "ERROR: Pack '$pack_slug' not found"
            echo "  Check the pack name and try again"
            return $EXIT_NOT_FOUND
            ;;
        *)
            rm -f "$tmp_file"
            print_error "ERROR: API returned HTTP $http_code"
            return $EXIT_NETWORK_ERROR
            ;;
    esac

    # Parse response and extract files
    local pack_dir="$packs_dir/$pack_slug"

    # Check source_type from download response — branch on git vs registry
    local source_type
    source_type=$(jq -r '.data.pack.source_type // "registry"' "$tmp_file" 2>/dev/null || echo "registry")

    if [[ "$source_type" == "git" ]]; then
        local git_url git_ref last_synced_at
        git_url=$(jq -r '.data.pack.git_url // ""' "$tmp_file" 2>/dev/null || echo "")
        git_ref=$(jq -r '.data.pack.git_ref // "main"' "$tmp_file" 2>/dev/null || echo "main")
        last_synced_at=$(jq -r '.data.pack.last_synced_at // ""' "$tmp_file" 2>/dev/null || echo "")

        if [[ -n "$git_url" ]]; then
            echo "  Git-sourced pack detected, attempting clone..."
            if do_install_pack_git "$pack_slug" "$git_url" "$git_ref" "$pack_dir" "$last_synced_at"; then
                # Save license from download response (before deleting tmp_file)
                local license_token license_expires_at license_watermark
                license_token=$(jq -r '.data.license.token // ""' "$tmp_file" 2>/dev/null || echo "")
                license_expires_at=$(jq -r '.data.license.expires_at // ""' "$tmp_file" 2>/dev/null || echo "")
                license_watermark=$(jq -r '.data.license.watermark // ""' "$tmp_file" 2>/dev/null || echo "")

                # Git clone succeeded — clean up download response
                rm -f "$tmp_file"

                if [[ -n "$license_token" ]]; then
                    echo "{\"token\":\"$license_token\",\"expires_at\":\"$license_expires_at\",\"watermark\":\"$license_watermark\"}" > "$pack_dir/.license.json"
                fi

                # Continue to symlinks, validation, and meta update
                echo "  Linking commands..."
                local commands_linked
                commands_linked=$(symlink_pack_commands "$pack_slug")
                echo "  Created $commands_linked command symlinks"

                echo "  Linking skills..."
                local skills_linked
                skills_linked=$(symlink_pack_skills "$pack_slug")
                echo "  Created $skills_linked skill symlinks"

                echo "  Validating license..."
                local validator="$SCRIPT_DIR/constructs-loader.sh"
                if [[ -x "$validator" ]]; then
                    local validation_result=0
                    "$validator" validate-pack "$pack_dir" >/dev/null 2>&1 || validation_result=$?
                    case $validation_result in
                        0) print_success "  License valid" ;;
                        1) print_warning "  License in grace period - please renew soon" ;;
                        2) print_error "  License expired - pack may not work correctly" ;;
                        3) print_warning "  No license file found - pack may be free tier" ;;
                        *) print_warning "  License validation returned code $validation_result" ;;
                    esac
                fi

                update_pack_meta "$pack_slug" "$pack_dir" "git" "$git_url" "$git_ref"

                echo ""
                print_success "Pack '$pack_slug' installed via git clone!"

                local commands_dir="$pack_dir/commands"
                if [[ -d "$commands_dir" ]]; then
                    echo ""
                    echo "Available commands:"
                    for cmd in "$commands_dir"/*.md; do
                        [[ -f "$cmd" ]] || continue
                        local cmd_name
                        cmd_name=$(basename "$cmd" .md)
                        echo "  /$cmd_name"
                    done
                fi

                return $EXIT_SUCCESS
            else
                echo "  Falling back to base64 extraction..."
            fi
        fi
    fi

    echo "  Extracting files..."

    # Create pack directory
    mkdir -p "$pack_dir"

    # Extract using Python (jq doesn't handle base64 well)
    # SECURITY: Pass variables via environment to prevent code injection (CRIT-001)
    export LOA_TMP_FILE="$tmp_file"
    export LOA_PACK_DIR="$pack_dir"
    if ! python3 << 'PYEOF'
import json
import base64
import os
import sys

def safe_path_join(base_dir, path):
    """
    Safely join paths, preventing path traversal attacks (CRIT-002).
    Returns the full path if safe, raises ValueError otherwise.
    """
    # Normalize the base directory
    real_base = os.path.realpath(base_dir)

    # Join and normalize the full path
    full_path = os.path.normpath(os.path.join(base_dir, path))
    real_path = os.path.realpath(os.path.join(base_dir, os.path.dirname(path)))

    # For new files, check that the parent directory is within base
    # (realpath on non-existent file returns the path itself)
    parent_dir = os.path.dirname(full_path)
    if parent_dir:
        os.makedirs(parent_dir, exist_ok=True)
        real_parent = os.path.realpath(parent_dir)
        if not real_parent.startswith(real_base + os.sep) and real_parent != real_base:
            raise ValueError(f"Path traversal attempt blocked: {path}")

    # Also check for suspicious path components
    path_parts = path.replace('\\', '/').split('/')
    if '..' in path_parts:
        raise ValueError(f"Path contains traversal component: {path}")

    return full_path

try:
    # Get paths from environment (prevents shell injection)
    tmp_file = os.environ.get('LOA_TMP_FILE')
    pack_dir = os.environ.get('LOA_PACK_DIR')

    if not tmp_file or not pack_dir:
        print("ERROR: Required environment variables not set", file=sys.stderr)
        sys.exit(1)

    with open(tmp_file, 'r') as f:
        data = json.load(f)

    # Handle nested response structure
    if 'data' in data:
        data = data['data']

    # Get pack info
    pack_info = data.get('pack', data)

    # Write manifest (safe - fixed filename)
    manifest = pack_info.get('manifest', {})
    if manifest:
        with open(os.path.join(pack_dir, 'manifest.json'), 'w') as f:
            json.dump(manifest, f, indent=2)

    # Write license (safe - fixed filename)
    license_data = data.get('license', {})
    if license_data:
        with open(os.path.join(pack_dir, '.license.json'), 'w') as f:
            json.dump(license_data, f, indent=2)

    # Extract files with path traversal protection
    files = pack_info.get('files', [])
    extracted = 0
    blocked = 0
    for file_info in files:
        path = file_info.get('path', '')
        content = file_info.get('content', '')

        if not path or not content:
            continue

        # Validate and create full path (CRIT-002: path traversal protection)
        try:
            full_path = safe_path_join(pack_dir, path)
        except ValueError as e:
            print(f"  BLOCKED: {e}", file=sys.stderr)
            blocked += 1
            continue

        # Decode and write
        try:
            decoded = base64.b64decode(content)
            with open(full_path, 'wb') as f:
                f.write(decoded)
            extracted += 1
        except Exception as e:
            print(f"  Warning: Failed to extract {path}: {e}", file=sys.stderr)

    print(f"  Extracted {extracted} files")
    if blocked > 0:
        print(f"  SECURITY: Blocked {blocked} suspicious paths", file=sys.stderr)

except json.JSONDecodeError as e:
    print(f"ERROR: Invalid JSON response: {e}", file=sys.stderr)
    sys.exit(1)
except Exception as e:
    print(f"ERROR: Extraction failed: {e}", file=sys.stderr)
    sys.exit(1)
PYEOF
    then
        rm -f "$tmp_file"
        rm -rf "$pack_dir"
        print_error "ERROR: Failed to extract pack files"
        return $EXIT_EXTRACT_ERROR
    fi

    rm -f "$tmp_file"

    # Symlink commands
    echo "  Linking commands..."
    local commands_linked
    commands_linked=$(symlink_pack_commands "$pack_slug")
    echo "  Created $commands_linked command symlinks"

    # Symlink skills for loader discovery
    echo "  Linking skills..."
    local skills_linked
    skills_linked=$(symlink_pack_skills "$pack_slug")
    echo "  Created $skills_linked skill symlinks"

    # Validate pack license
    echo "  Validating license..."
    local validator="$SCRIPT_DIR/constructs-loader.sh"
    if [[ -x "$validator" ]]; then
        local validation_result=0
        "$validator" validate-pack "$pack_dir" >/dev/null 2>&1 || validation_result=$?

        case $validation_result in
            0)
                print_success "  License valid"
                ;;
            1)
                print_warning "  License in grace period - please renew soon"
                ;;
            2)
                print_error "  License expired - pack may not work correctly"
                ;;
            3)
                print_warning "  No license file found - pack may be free tier"
                ;;
            *)
                print_warning "  License validation returned code $validation_result"
                ;;
        esac
    fi

    # Update registry meta
    update_pack_meta "$pack_slug" "$pack_dir"

    echo ""
    print_success "Pack '$pack_slug' installed successfully!"

    # List available commands
    local commands_dir="$pack_dir/commands"
    if [[ -d "$commands_dir" ]]; then
        echo ""
        echo "Available commands:"
        for cmd in "$commands_dir"/*.md; do
            [[ -f "$cmd" ]] || continue
            local cmd_name
            cmd_name=$(basename "$cmd" .md)
            echo "  /$cmd_name"
        done
    fi

    return $EXIT_SUCCESS
}

# Install pack via git clone with base64 fallback
# @see sprint.md T1.7: Install Script — Git Clone Support
# Args:
#   $1 - Pack slug
#   $2 - Git URL
#   $3 - Git ref (branch/tag)
#   $4 - Pack directory (target)
do_install_pack_git() {
    local pack_slug="$1"
    local git_url="$2"
    local git_ref="${3:-main}"
    local pack_dir="$4"
    local last_synced_at="${5:-}"

    # Staleness warning: log if last_synced_at > 7 days ago
    if [[ -n "$last_synced_at" ]]; then
        local synced_epoch
        synced_epoch=$(date -j -f "%Y-%m-%dT%H:%M:%S" "${last_synced_at%%.*}" "+%s" 2>/dev/null || date -d "${last_synced_at}" "+%s" 2>/dev/null || echo "0")
        local now_epoch
        now_epoch=$(date "+%s")
        local seven_days=$((7 * 24 * 60 * 60))
        if [[ $((now_epoch - synced_epoch)) -gt $seven_days ]]; then
            print_warning "  Pack was last synced over 7 days ago. Consider asking the author to sync."
        fi
    fi

    # Validate HTTPS
    if [[ ! "$git_url" =~ ^https:// ]]; then
        print_error "ERROR: Only HTTPS git URLs are allowed"
        return 1
    fi

    # Reject credentials in URL (userinfo)
    if [[ "$git_url" =~ ^https://[^/]*@ ]]; then
        print_error "ERROR: Git URLs with embedded credentials are not allowed"
        return 1
    fi

    # Check git is available
    if ! command -v git &>/dev/null; then
        print_error "ERROR: git is not installed"
        return 1
    fi

    echo "  Cloning from $git_url (ref: $git_ref)..."

    # Clone to a temp directory first
    local tmp_clone
    tmp_clone=$(mktemp -d) || { print_error "mktemp failed"; return 1; }

    local clone_result=0
    GIT_TERMINAL_PROMPT=0 GIT_LFS_SKIP_SMUDGE=1 \
        git clone --depth 1 --branch "$git_ref" --single-branch \
        -c submodule.recurse=false \
        "$git_url" "$tmp_clone" 2>/dev/null || clone_result=$?

    if [[ $clone_result -ne 0 ]]; then
        rm -rf "$tmp_clone"
        print_warning "  Git clone failed (exit $clone_result), falling back to base64 download"
        return 1
    fi

    # Remove .git/ directory (no history at install site)
    rm -rf "$tmp_clone/.git"

    # Tree validation: reject symlinks
    local symlinks
    symlinks=$(find "$tmp_clone" -type l 2>/dev/null | head -1)
    if [[ -n "$symlinks" ]]; then
        rm -rf "$tmp_clone"
        print_error "ERROR: Symlinks detected in repository"
        return 1
    fi

    # Tree validation: reject path traversal components (.. in path segments)
    local traversal=0
    while IFS= read -r -d '' f; do
        [[ "$f" == "$tmp_clone" ]] && continue
        local rel="${f#$tmp_clone/}"
        if [[ "$rel" == "/"* || "$rel" == ".." || "$rel" == "../"* || "$rel" == *"/../"* || "$rel" == *"/.." ]]; then
            traversal=1
            break
        fi
    done < <(find "$tmp_clone" -print0 2>/dev/null)

    if [[ $traversal -eq 1 ]]; then
        rm -rf "$tmp_clone"
        print_error "ERROR: Path traversal detected in repository"
        return 1
    fi

    # Verify manifest exists
    if [[ ! -f "$tmp_clone/construct.yaml" ]] && [[ ! -f "$tmp_clone/manifest.json" ]]; then
        rm -rf "$tmp_clone"
        print_error "ERROR: No manifest found in repository"
        return 1
    fi

    # Move to pack directory
    rm -rf "$pack_dir"
    mv "$tmp_clone" "$pack_dir"

    # Get the git commit for metadata
    local git_commit="unknown"
    if command -v git &>/dev/null; then
        # We removed .git, but we can parse from clone output or use the ref
        git_commit="$git_ref"
    fi

    echo "  Clone successful"
    return 0
}

# Update pack metadata in .constructs-meta.json
# Args:
#   $1 - Pack slug
#   $2 - Pack directory
#   $3 - Source type (optional: "git" or "registry")
#   $4 - Git URL (optional)
#   $5 - Git commit/ref (optional)
update_pack_meta() {
    local pack_slug="$1"
    local pack_dir="$2"
    local source_type="${3:-registry}"
    local git_url="${4:-}"
    local git_commit="${5:-}"
    local meta_path
    meta_path=$(get_registry_meta_path)
    local now
    now=$(date -u +%Y-%m-%dT%H:%M:%SZ)

    # Get pack version from manifest (try construct.yaml first, then manifest.json)
    local version="unknown"
    if [[ -f "$pack_dir/construct.yaml" ]] && command -v python3 &>/dev/null; then
        version=$(python3 -c "
import yaml, sys
try:
    with open('$pack_dir/construct.yaml') as f:
        d = yaml.safe_load(f)
    print(d.get('version', 'unknown'))
except: print('unknown')
" 2>/dev/null || echo "unknown")
    fi
    if [[ "$version" == "unknown" ]]; then
        local manifest_file="$pack_dir/manifest.json"
        if [[ -f "$manifest_file" ]]; then
            version=$(jq -r '.version // "unknown"' "$manifest_file" 2>/dev/null || echo "unknown")
        fi
    fi

    # Get license expiry
    local license_expires=""
    local license_file="$pack_dir/.license.json"
    if [[ -f "$license_file" ]]; then
        license_expires=$(jq -r '.expires_at // ""' "$license_file" 2>/dev/null || echo "")
    fi

    # Get skills list
    local skills_json="[]"
    if [[ -d "$pack_dir/skills" ]]; then
        skills_json=$(find "$pack_dir/skills" -mindepth 1 -maxdepth 1 -type d -exec basename {} \; | jq -R -s 'split("\n") | map(select(length > 0))')
    fi

    # Ensure meta file exists
    init_registry_meta

    # Update meta with git fields when applicable
    local tmp_file="${meta_path}.tmp"
    if [[ "$source_type" == "git" ]]; then
        jq --arg slug "$pack_slug" \
           --arg version "$version" \
           --arg installed_at "$now" \
           --arg license_expires "$license_expires" \
           --arg source_type "$source_type" \
           --arg git_url "$git_url" \
           --arg git_commit "$git_commit" \
           --argjson skills "$skills_json" \
           '.installed_packs[$slug] = {
               "version": $version,
               "installed_at": $installed_at,
               "registry": "default",
               "license_expires": $license_expires,
               "source_type": $source_type,
               "git_url": $git_url,
               "git_commit": $git_commit,
               "skills": $skills
           }' "$meta_path" > "$tmp_file" && mv "$tmp_file" "$meta_path"
    else
        jq --arg slug "$pack_slug" \
           --arg version "$version" \
           --arg installed_at "$now" \
           --arg license_expires "$license_expires" \
           --argjson skills "$skills_json" \
           '.installed_packs[$slug] = {
               "version": $version,
               "installed_at": $installed_at,
               "registry": "default",
               "license_expires": $license_expires,
               "skills": $skills
           }' "$meta_path" > "$tmp_file" && mv "$tmp_file" "$meta_path"
    fi
}

# =============================================================================
# Skill Installation
# =============================================================================

# Download and install a skill from the registry
# Args:
#   $1 - Skill slug (vendor/name)
do_install_skill() {
    local skill_slug="$1"
    local api_key
    local registry_url
    local skills_dir

    print_status "$icon_valid" "Installing skill: $skill_slug"

    # Check offline mode
    if [[ "${LOA_OFFLINE:-}" == "1" ]]; then
        print_error "ERROR: Cannot install skills in offline mode"
        return $EXIT_NETWORK_ERROR
    fi

    # Get authentication
    api_key=$(get_api_key)
    if [[ -z "$api_key" ]]; then
        print_error "ERROR: No API key found"
        echo ""
        echo "To authenticate, either:"
        echo "  1. Set LOA_CONSTRUCTS_API_KEY environment variable"
        echo "  2. Run /skill-login to save credentials"
        return $EXIT_AUTH_ERROR
    fi

    # Get registry URL
    registry_url=$(get_registry_url)

    # Create directories
    skills_dir=$(get_skills_dir)
    mkdir -p "$skills_dir"

    # Ensure constructs directory is gitignored
    ensure_constructs_gitignored

    echo "  Downloading from $registry_url/skills/$skill_slug/download..."

    # Download skill
    local http_code
    local tmp_file
    tmp_file=$(mktemp) || { print_error "mktemp failed"; return 1; }
    chmod 600 "$tmp_file"  # CRITICAL-001 FIX

    # Disable command tracing during API call to prevent key leakage
    { set +x; } 2>/dev/null || true

    # Use local variable instead of process substitution for security (MED-002)
    # Process substitution creates a temporary file descriptor readable by other processes
    local auth_header="Authorization: Bearer $api_key"
    # HIGH-002 FIX: Enforce HTTPS and TLS 1.2+
    http_code=$(curl -s -w "%{http_code}" --proto =https --tlsv1.2 --max-time 300 \
        -H "$auth_header" \
        -H "Accept: application/json" \
        "$registry_url/skills/$skill_slug/download" \
        -o "$tmp_file" 2>/dev/null) || {
        unset auth_header
        rm -f "$tmp_file"
        print_error "ERROR: Network error while downloading skill"
        return $EXIT_NETWORK_ERROR
    }
    unset auth_header

    # Check HTTP status
    case "$http_code" in
        200)
            # Success
            ;;
        401|403)
            rm -f "$tmp_file"
            print_error "ERROR: Authentication failed (HTTP $http_code)"
            return $EXIT_AUTH_ERROR
            ;;
        404)
            rm -f "$tmp_file"
            print_error "ERROR: Skill '$skill_slug' not found"
            return $EXIT_NOT_FOUND
            ;;
        *)
            rm -f "$tmp_file"
            print_error "ERROR: API returned HTTP $http_code"
            return $EXIT_NETWORK_ERROR
            ;;
    esac

    # Determine directory structure
    # skill_slug might be "vendor/name" or just "name"
    local skill_dir
    if [[ "$skill_slug" == *"/"* ]]; then
        skill_dir="$skills_dir/$skill_slug"
    else
        skill_dir="$skills_dir/default/$skill_slug"
    fi

    echo "  Extracting files..."

    # Create skill directory
    mkdir -p "$skill_dir"

    # Extract using Python
    # SECURITY: Pass variables via environment to prevent code injection (CRIT-001)
    export LOA_TMP_FILE="$tmp_file"
    export LOA_SKILL_DIR="$skill_dir"
    if ! python3 << 'PYEOF'
import json
import base64
import os
import sys

def safe_path_join(base_dir, path):
    """
    Safely join paths, preventing path traversal attacks (CRIT-002).
    Returns the full path if safe, raises ValueError otherwise.
    """
    # Normalize the base directory
    real_base = os.path.realpath(base_dir)

    # Join and normalize the full path
    full_path = os.path.normpath(os.path.join(base_dir, path))

    # For new files, check that the parent directory is within base
    parent_dir = os.path.dirname(full_path)
    if parent_dir:
        os.makedirs(parent_dir, exist_ok=True)
        real_parent = os.path.realpath(parent_dir)
        if not real_parent.startswith(real_base + os.sep) and real_parent != real_base:
            raise ValueError(f"Path traversal attempt blocked: {path}")

    # Also check for suspicious path components
    path_parts = path.replace('\\', '/').split('/')
    if '..' in path_parts:
        raise ValueError(f"Path contains traversal component: {path}")

    return full_path

try:
    # Get paths from environment (prevents shell injection)
    tmp_file = os.environ.get('LOA_TMP_FILE')
    skill_dir = os.environ.get('LOA_SKILL_DIR')

    if not tmp_file or not skill_dir:
        print("ERROR: Required environment variables not set", file=sys.stderr)
        sys.exit(1)

    with open(tmp_file, 'r') as f:
        data = json.load(f)

    # Handle nested response structure
    if 'data' in data:
        data = data['data']

    # Get skill info
    skill_info = data.get('skill', data)

    # Write license (safe - fixed filename)
    license_data = data.get('license', {})
    if license_data:
        with open(os.path.join(skill_dir, '.license.json'), 'w') as f:
            json.dump(license_data, f, indent=2)

    # Extract files with path traversal protection
    files = skill_info.get('files', [])
    extracted = 0
    blocked = 0
    for file_info in files:
        path = file_info.get('path', '')
        content = file_info.get('content', '')

        if not path or not content:
            continue

        # Validate and create full path (CRIT-002: path traversal protection)
        try:
            full_path = safe_path_join(skill_dir, path)
        except ValueError as e:
            print(f"  BLOCKED: {e}", file=sys.stderr)
            blocked += 1
            continue

        # Decode and write
        try:
            decoded = base64.b64decode(content)
            with open(full_path, 'wb') as f:
                f.write(decoded)
            extracted += 1
        except Exception as e:
            print(f"  Warning: Failed to extract {path}: {e}", file=sys.stderr)

    print(f"  Extracted {extracted} files")
    if blocked > 0:
        print(f"  SECURITY: Blocked {blocked} suspicious paths", file=sys.stderr)

except json.JSONDecodeError as e:
    print(f"ERROR: Invalid JSON response: {e}", file=sys.stderr)
    sys.exit(1)
except Exception as e:
    print(f"ERROR: Extraction failed: {e}", file=sys.stderr)
    sys.exit(1)
PYEOF
    then
        rm -f "$tmp_file"
        rm -rf "$skill_dir"
        print_error "ERROR: Failed to extract skill files"
        return $EXIT_EXTRACT_ERROR
    fi

    rm -f "$tmp_file"

    # Validate skill license
    echo "  Validating license..."
    local validator="$SCRIPT_DIR/constructs-loader.sh"
    if [[ -x "$validator" ]]; then
        local validation_result=0
        "$validator" validate "$skill_dir" >/dev/null 2>&1 || validation_result=$?

        case $validation_result in
            0)
                print_success "  License valid"
                ;;
            1)
                print_warning "  License in grace period"
                ;;
            2)
                print_error "  License expired"
                ;;
            *)
                print_warning "  License validation returned code $validation_result"
                ;;
        esac
    fi

    # Update registry meta
    update_skill_meta "$skill_slug" "$skill_dir"

    echo ""
    print_success "Skill '$skill_slug' installed successfully!"

    return $EXIT_SUCCESS
}

# Update skill metadata in .constructs-meta.json
# Args:
#   $1 - Skill slug
#   $2 - Skill directory
update_skill_meta() {
    local skill_slug="$1"
    local skill_dir="$2"
    local meta_path
    meta_path=$(get_registry_meta_path)
    local now
    now=$(date -u +%Y-%m-%dT%H:%M:%SZ)

    # Get skill version from index.yaml
    local version="unknown"
    local index_file="$skill_dir/index.yaml"
    if [[ -f "$index_file" ]] && command -v yq &>/dev/null; then
        local yq_version_output
        yq_version_output=$(yq --version 2>&1 || echo "")
        if echo "$yq_version_output" | grep -q "mikefarah\|version.*4"; then
            version=$(yq eval '.version // "unknown"' "$index_file" 2>/dev/null || echo "unknown")
        else
            version=$(yq '.version // "unknown"' "$index_file" 2>/dev/null || echo "unknown")
        fi
    fi

    # Get license expiry
    local license_expires=""
    local license_file="$skill_dir/.license.json"
    if [[ -f "$license_file" ]]; then
        license_expires=$(jq -r '.expires_at // ""' "$license_file" 2>/dev/null || echo "")
    fi

    # Ensure meta file exists
    init_registry_meta

    # Update meta
    local tmp_file="${meta_path}.tmp"
    jq --arg slug "$skill_slug" \
       --arg version "$version" \
       --arg installed_at "$now" \
       --arg license_expires "$license_expires" \
       '.installed_skills[$slug] = {
           "version": $version,
           "installed_at": $installed_at,
           "registry": "default",
           "license_expires": $license_expires,
           "from_pack": null
       }' "$meta_path" > "$tmp_file" && mv "$tmp_file" "$meta_path"
}

# =============================================================================
# Uninstall Commands
# =============================================================================

# Uninstall a pack
# Args:
#   $1 - Pack slug
do_uninstall_pack() {
    local pack_slug="$1"
    local pack_dir="$(get_packs_dir)/$pack_slug"

    print_status "$icon_warning" "Uninstalling pack: $pack_slug"

    # Check if pack exists
    if [[ ! -d "$pack_dir" ]]; then
        print_error "ERROR: Pack '$pack_slug' is not installed"
        return $EXIT_NOT_FOUND
    fi

    # Remove command symlinks first
    echo "  Removing command symlinks..."
    local commands_unlinked
    commands_unlinked=$(unlink_pack_commands "$pack_slug")
    echo "  Removed $commands_unlinked command symlinks"

    # Remove skill symlinks
    echo "  Removing skill symlinks..."
    unlink_pack_skills "$pack_slug"

    # Remove pack directory
    echo "  Removing pack files..."
    rm -rf "$pack_dir"

    # Update registry meta
    local meta_path
    meta_path=$(get_registry_meta_path)
    if [[ -f "$meta_path" ]]; then
        local tmp_file="${meta_path}.tmp"
        jq --arg slug "$pack_slug" 'del(.installed_packs[$slug])' "$meta_path" > "$tmp_file" && mv "$tmp_file" "$meta_path"
    fi

    echo ""
    print_success "Pack '$pack_slug' uninstalled successfully!"

    return $EXIT_SUCCESS
}

# Uninstall a skill
# Args:
#   $1 - Skill slug
do_uninstall_skill() {
    local skill_slug="$1"
    local skills_dir
    skills_dir=$(get_skills_dir)

    print_status "$icon_warning" "Uninstalling skill: $skill_slug"

    # Find skill directory
    local skill_dir
    if [[ -d "$skills_dir/$skill_slug" ]]; then
        skill_dir="$skills_dir/$skill_slug"
    elif [[ -d "$skills_dir/default/$skill_slug" ]]; then
        skill_dir="$skills_dir/default/$skill_slug"
    else
        print_error "ERROR: Skill '$skill_slug' is not installed"
        return $EXIT_NOT_FOUND
    fi

    # Check if it's a symlink (pack skill)
    if [[ -L "$skill_dir" ]]; then
        print_error "ERROR: Skill '$skill_slug' is part of a pack"
        echo "  Uninstall the pack instead, or remove the symlink manually"
        return $EXIT_ERROR
    fi

    # Remove skill directory
    echo "  Removing skill files..."
    rm -rf "$skill_dir"

    # Update registry meta
    local meta_path
    meta_path=$(get_registry_meta_path)
    if [[ -f "$meta_path" ]]; then
        local tmp_file="${meta_path}.tmp"
        jq --arg slug "$skill_slug" 'del(.installed_skills[$slug])' "$meta_path" > "$tmp_file" && mv "$tmp_file" "$meta_path"
    fi

    echo ""
    print_success "Skill '$skill_slug' uninstalled successfully!"

    return $EXIT_SUCCESS
}

# =============================================================================
# Re-link Commands (for manual fixing)
# =============================================================================

# Re-link pack commands (useful after updates or manual changes)
# Args:
#   $1 - Pack slug (or "all" for all packs)
do_link_commands() {
    local pack_slug="$1"
    local packs_dir
    packs_dir=$(get_packs_dir)

    if [[ "$pack_slug" == "all" ]]; then
        # Link all packs
        local total_linked=0
        for pack_path in "$packs_dir"/*/; do
            [[ -d "$pack_path" ]] || continue
            local slug
            slug=$(basename "$pack_path")

            echo "Linking commands for pack: $slug"
            local linked
            linked=$(symlink_pack_commands "$slug")
            echo "  Created $linked command symlinks"
            total_linked=$((total_linked + linked))
        done
        echo ""
        print_success "Total: $total_linked command symlinks created"
    else
        # Link specific pack
        local pack_dir="$packs_dir/$pack_slug"
        if [[ ! -d "$pack_dir" ]]; then
            print_error "ERROR: Pack '$pack_slug' is not installed"
            return $EXIT_NOT_FOUND
        fi

        echo "Linking commands for pack: $pack_slug"
        local linked
        linked=$(symlink_pack_commands "$pack_slug")
        print_success "Created $linked command symlinks"
    fi

    return $EXIT_SUCCESS
}

# =============================================================================
# CLAUDE.md Injection — Sentinel Block Architecture (SDD §F / §7.2)
# =============================================================================
#
# Architecture: Single Managed Import
#   Root CLAUDE.md gets ONE sentinel block with ONE @import to a managed file.
#   Individual construct imports are added to the managed file only.
#   This means root CLAUDE.md is mutated once, then never again.
#
# Layout:
#   Root CLAUDE.md:
#     @.claude/loa/CLAUDE.loa.md              (Loa framework - existing)
#     <!-- constructs:begin -->
#     @.claude/constructs/CLAUDE.constructs.md (single managed import)
#     <!-- constructs:end -->
#
#   .claude/constructs/CLAUDE.constructs.md:   (managed by installer)
#     @.claude/constructs/packs/observer/CLAUDE.md
#     @.claude/constructs/packs/artisan/CLAUDE.md
# =============================================================================

# Portable mkdir-based lock (macOS + Linux compatible)
_inject_lock_dir=""

_inject_acquire_lock() {
    local root="${CONSTRUCTS_ROOT:-.}"
    _inject_lock_dir="$root/.constructs-inject.lock"
    local timeout=10
    local start=$SECONDS

    while ! mkdir "$_inject_lock_dir" 2>/dev/null; do
        if [ $((SECONDS - start)) -ge $timeout ]; then
            # Check for stale lock via PID file
            if [ -f "$_inject_lock_dir/pid" ]; then
                local lock_pid
                lock_pid=$(cat "$_inject_lock_dir/pid")
                if ! kill -0 "$lock_pid" 2>/dev/null; then
                    rm -rf "$_inject_lock_dir"
                    continue
                fi
            fi
            echo "ERROR: Lock held >${timeout}s. Another install may be running." >&2
            return 1
        fi
        sleep 0.5
    done
    echo $$ > "$_inject_lock_dir/pid"
}

_inject_release_lock() {
    if [ -n "$_inject_lock_dir" ] && [ -d "$_inject_lock_dir" ]; then
        rm -rf "$_inject_lock_dir"
    fi
}

# Validate slug format and reject symlinks on path components
_inject_validate_paths() {
    local slug="$1"
    local root="${CONSTRUCTS_ROOT:-.}"

    # Validate slug format (kebab-case, matches construct.schema.json pattern)
    if ! echo "$slug" | grep -qE '^[a-z0-9][a-z0-9-]*[a-z0-9]$'; then
        echo "ERROR: Invalid slug format: $slug" >&2
        return 1
    fi

    # Check for symlinks on critical paths (pre-lock, defense-in-depth)
    # NOTE: Authoritative symlink check is inside inject_construct_claude_md()
    # after lock acquisition. This early check is an optimization to fail fast
    # before attempting lock. TOCTOU between here and the post-lock check is
    # mitigated by the redundant check after lock (see inject_construct_claude_md).
    if [ -L "$root/CLAUDE.md" ]; then
        echo "ERROR: CLAUDE.md is a symlink — refusing to modify" >&2
        return 1
    fi
}

# Inject a construct's CLAUDE.md import into the managed file + sentinel block
# Usage: inject_construct_claude_md <slug>
# Environment: CONSTRUCTS_ROOT (optional, defaults to ".")
inject_construct_claude_md() {
    local slug="$1"
    local root="${CONSTRUCTS_ROOT:-.}"
    local claude_md="$root/CLAUDE.md"
    local managed_dir="$root/.claude/constructs"
    local managed_file="$managed_dir/CLAUDE.constructs.md"
    local import_line="@.claude/constructs/packs/${slug}/CLAUDE.md"
    local managed_import="@.claude/constructs/CLAUDE.constructs.md"
    local sentinel_begin="<!-- constructs:begin -->"
    local sentinel_end="<!-- constructs:end -->"

    # Step 1: Validate paths
    _inject_validate_paths "$slug" || return 1

    # Step 2: Acquire lock
    _inject_acquire_lock || return 1
    # Ensure lock is released on exit
    trap '_inject_release_lock' EXIT

    # Step 3: Update managed file (create dir if needed)
    mkdir -p "$managed_dir"

    if [ -f "$managed_file" ] && grep -qF "$import_line" "$managed_file" 2>/dev/null; then
        # Already present — idempotent, skip
        :
    else
        # Append import line via atomic write
        local tmp_managed
        tmp_managed=$(mktemp "$managed_dir/CLAUDE.constructs.md.XXXXXX")
        if [ -f "$managed_file" ]; then
            cat "$managed_file" > "$tmp_managed"
        fi
        echo "$import_line" >> "$tmp_managed"
        mv "$tmp_managed" "$managed_file"
    fi

    # Step 4: Ensure sentinel block in root CLAUDE.md
    if [ -L "$claude_md" ]; then
        echo "ERROR: CLAUDE.md is a symlink — refusing to modify" >&2
        _inject_release_lock
        trap - EXIT
        return 1
    fi

    if [ -f "$claude_md" ]; then
        # Check if sentinel already present
        if grep -qF "$sentinel_begin" "$claude_md" 2>/dev/null; then
            # Sentinel exists — check if managed import is inside
            if grep -qF "$managed_import" "$claude_md" 2>/dev/null; then
                # All good, nothing to do
                :
            else
                # Sentinel exists but managed import missing — malformed state
                echo "WARNING: Sentinel block exists but managed import missing. Adding import." >&2
                local tmp_claude
                tmp_claude=$(mktemp "$root/CLAUDE.md.XXXXXX")
                # Insert managed import after sentinel_begin
                while IFS= read -r line || [ -n "$line" ]; do
                    echo "$line" >> "$tmp_claude"
                    if [ "$line" = "$sentinel_begin" ]; then
                        echo "$managed_import" >> "$tmp_claude"
                    fi
                done < "$claude_md"
                mv "$tmp_claude" "$claude_md"
            fi
        else
            # No sentinel — add it
            local tmp_claude
            tmp_claude=$(mktemp "$root/CLAUDE.md.XXXXXX")
            cat "$claude_md" > "$tmp_claude"
            # Append sentinel block at end
            {
                echo ""
                echo "$sentinel_begin"
                echo "$managed_import"
                echo "$sentinel_end"
            } >> "$tmp_claude"
            mv "$tmp_claude" "$claude_md"
        fi
    else
        # No CLAUDE.md — create with sentinel block
        local tmp_claude
        tmp_claude=$(mktemp "$root/CLAUDE.md.XXXXXX")
        {
            echo "$sentinel_begin"
            echo "$managed_import"
            echo "$sentinel_end"
        } > "$tmp_claude"
        mv "$tmp_claude" "$claude_md"
    fi

    # Step 5: Release lock
    _inject_release_lock
    trap - EXIT
    return 0
}

# Remove a construct's import from the managed file
# Usage: remove_construct_claude_md <slug>
# Environment: CONSTRUCTS_ROOT (optional, defaults to ".")
remove_construct_claude_md() {
    local slug="$1"
    local root="${CONSTRUCTS_ROOT:-.}"
    local managed_dir="$root/.claude/constructs"
    local managed_file="$managed_dir/CLAUDE.constructs.md"
    local import_line="@.claude/constructs/packs/${slug}/CLAUDE.md"

    # Step 1: Validate slug
    if ! echo "$slug" | grep -qE '^[a-z0-9][a-z0-9-]*[a-z0-9]$'; then
        echo "ERROR: Invalid slug format: $slug" >&2
        return 1
    fi

    # Step 2: Acquire lock
    _inject_acquire_lock || return 1
    trap '_inject_release_lock' EXIT

    # Step 3: Remove import from managed file
    if [ -f "$managed_file" ]; then
        local tmp_managed
        tmp_managed=$(mktemp "$managed_dir/CLAUDE.constructs.md.XXXXXX")
        grep -vF "$import_line" "$managed_file" > "$tmp_managed" 2>/dev/null || true
        mv "$tmp_managed" "$managed_file"
    fi

    # Step 4: Release lock
    _inject_release_lock
    trap - EXIT
    return 0
}

# =============================================================================
# Command Line Interface
# =============================================================================

show_usage() {
    cat << 'EOF'
Usage: constructs-install.sh <command> [arguments]

Commands:
    pack <slug>              Install a pack from the registry
    skill <vendor/slug>      Install a skill from the registry
    uninstall pack <slug>    Uninstall a pack
    uninstall skill <slug>   Uninstall a skill
    link-commands <slug>     Re-link pack commands (use "all" for all packs)

Exit Codes:
    0 = success
    1 = authentication error
    2 = network error
    3 = not found
    4 = extraction error
    5 = validation error
    6 = general error

Environment Variables:
    LOA_CONSTRUCTS_API_KEY  API key for authentication
    LOA_REGISTRY_URL        Override registry API URL
    LOA_OFFLINE             Set to 1 for offline mode

Examples:
    constructs-install.sh pack gtm-collective
    constructs-install.sh skill thj/terraform-assistant
    constructs-install.sh uninstall pack gtm-collective
    constructs-install.sh link-commands all

Authentication:
    Set LOA_CONSTRUCTS_API_KEY environment variable, or create:
    ~/.loa/credentials.json with {"api_key": "your-key"}

After Installation:
    Pack commands will be available as slash commands (e.g., /gtm-setup)
    Skills will be available in the skill loader (constructs-loader.sh list)
EOF
}

main() {
    local command="${1:-}"

    if [[ -z "$command" ]]; then
        show_usage
        exit $EXIT_ERROR
    fi

    case "$command" in
        pack)
            [[ -n "${2:-}" ]] || { print_error "ERROR: Missing pack slug"; show_usage; exit $EXIT_ERROR; }
            do_install_pack "$2"
            ;;
        skill)
            [[ -n "${2:-}" ]] || { print_error "ERROR: Missing skill slug"; show_usage; exit $EXIT_ERROR; }
            do_install_skill "$2"
            ;;
        uninstall)
            local type="${2:-}"
            local slug="${3:-}"
            [[ -n "$type" ]] || { print_error "ERROR: Missing uninstall type (pack/skill)"; exit $EXIT_ERROR; }
            [[ -n "$slug" ]] || { print_error "ERROR: Missing slug to uninstall"; exit $EXIT_ERROR; }
            case "$type" in
                pack)
                    do_uninstall_pack "$slug"
                    ;;
                skill)
                    do_uninstall_skill "$slug"
                    ;;
                *)
                    print_error "ERROR: Unknown uninstall type: $type (use 'pack' or 'skill')"
                    exit $EXIT_ERROR
                    ;;
            esac
            ;;
        link-commands)
            [[ -n "${2:-}" ]] || { print_error "ERROR: Missing pack slug (or 'all')"; exit $EXIT_ERROR; }
            do_link_commands "$2"
            ;;
        -h|--help|help)
            show_usage
            exit $EXIT_SUCCESS
            ;;
        *)
            print_error "ERROR: Unknown command: $command"
            show_usage
            exit $EXIT_ERROR
            ;;
    esac
}

# Only run main if not being sourced
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
