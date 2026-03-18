#!/usr/bin/env bash
# =============================================================================
# sync-packs.sh — Sync global construct packs to local repo on session start
# =============================================================================
# Runs as a SessionStart hook from ~/.claude/settings.json.
# Creates symlinks from .claude/constructs/packs/<slug> → ~/.loa/constructs/packs/<slug>
#
# Design:
#   - Symlinks, not copies: global store IS the source of truth
#   - Skip non-loa repos silently (no .claude/ dir)
#   - Replace real directories with symlinks (transition from old per-repo model)
#   - Report changes to stderr (visible in session start output)
#   - Timeout-safe: < 1 second for 25+ packs (symlinks are instant)
#
# Usage:
#   sync-packs.sh              # Normal (SessionStart hook)
#   sync-packs.sh --status     # Show current sync state
#   sync-packs.sh --json       # JSON output
#   sync-packs.sh --force      # Re-create all symlinks
#
# Deployment:
#   This file is the canonical source. populate-global-store.sh copies it
#   to ~/.loa/scripts/sync-packs.sh where the SessionStart hook references it.
#
# Environment:
#   LOA_GLOBAL_STORE    Override global store path (default: ~/.loa/constructs)
#   LOA_SYNC_DISABLED   Set to 1 to skip sync silently
#
# Exit Codes:
#   0 = success (or graceful skip)
#   1 = error
# =============================================================================

set -euo pipefail

# =============================================================================
# Configuration
# =============================================================================

GLOBAL_STORE="${LOA_GLOBAL_STORE:-${HOME}/.loa/constructs}"
GLOBAL_PACKS="${GLOBAL_STORE}/packs"
GLOBAL_META="${GLOBAL_STORE}/global.json"

JSON_OUTPUT=false
STATUS_ONLY=false
FORCE=false

# =============================================================================
# Argument Parsing
# =============================================================================

while [[ $# -gt 0 ]]; do
    case "$1" in
        --json)   JSON_OUTPUT=true; shift ;;
        --status) STATUS_ONLY=true; shift ;;
        --force)  FORCE=true; shift ;;
        --help)
            echo "Usage: sync-packs.sh [--status] [--json] [--force]" >&2
            echo "  Syncs global construct packs to local repo via symlinks." >&2
            exit 0
            ;;
        *) shift ;;
    esac
done

# =============================================================================
# Early exits (silent — these are expected conditions)
# =============================================================================

# Disabled via env
[[ "${LOA_SYNC_DISABLED:-0}" == "1" ]] && exit 0

# Not in a git repo
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0

# No .claude directory (not a loa-managed project)
[[ -d "${REPO_ROOT}/.claude" ]] || exit 0

# No global store (populate hasn't been run yet)
[[ -d "$GLOBAL_PACKS" ]] || exit 0

# =============================================================================
# Status mode
# =============================================================================

LOCAL_PACKS="${REPO_ROOT}/.claude/constructs/packs"
SYNC_STATE="${REPO_ROOT}/.claude/constructs/.sync-state.json"

if [[ "$STATUS_ONLY" == "true" ]]; then
    if [[ -f "$SYNC_STATE" ]]; then
        cat "$SYNC_STATE"
    else
        echo '{"status": "never synced"}'
    fi
    exit 0
fi

# =============================================================================
# Sync: symlink global packs → local
# =============================================================================

mkdir -p "$LOCAL_PACKS"

added=0
updated=0
removed=0
unchanged=0

# Create/update symlinks for each global pack
for pack_dir in "$GLOBAL_PACKS"/*/; do
    [[ -d "$pack_dir" ]] || continue
    slug=$(basename "$pack_dir")
    local_pack="${LOCAL_PACKS}/${slug}"
    # Normalize: remove trailing slash for consistent symlink targets
    global_target="${pack_dir%/}"

    if [[ -L "$local_pack" ]] && [[ "$FORCE" == "false" ]]; then
        # Already a symlink — check if target is correct
        current_target=$(readlink "$local_pack" 2>/dev/null || echo "")
        if [[ "$current_target" == "$global_target" ]]; then
            unchanged=$((unchanged + 1))
            continue
        fi
        # Wrong target — fix it
        rm "$local_pack"
        ln -s "$global_target" "$local_pack"
        updated=$((updated + 1))
    elif [[ -d "$local_pack" ]] || [[ -L "$local_pack" ]]; then
        # Real directory or stale symlink — replace with correct symlink
        rm -rf "$local_pack"
        ln -s "$global_target" "$local_pack"
        updated=$((updated + 1))
    else
        # Missing — create symlink
        ln -s "$global_target" "$local_pack"
        added=$((added + 1))
    fi
done

# Clean: remove symlinks for packs no longer in global store
for local_entry in "$LOCAL_PACKS"/*/; do
    [[ -e "$local_entry" ]] || [[ -L "${local_entry%/}" ]] || continue
    slug=$(basename "${local_entry%/}")
    if [[ ! -d "${GLOBAL_PACKS}/${slug}" ]]; then
        local_path="${LOCAL_PACKS}/${slug}"
        if [[ -L "$local_path" ]]; then
            # Only remove symlinks (not manually placed real directories)
            rm "$local_path"
            removed=$((removed + 1))
        fi
    fi
done

# =============================================================================
# Register pack commands in .claude/commands/
# =============================================================================
# Creates symlinks from .claude/commands/<name>.md → pack command files.
# Framework commands (real files) take precedence — never overwritten.

LOCAL_COMMANDS="${REPO_ROOT}/.claude/commands"
cmd_registered=0
cmd_skipped=0

if [[ -d "$LOCAL_COMMANDS" ]]; then
    for pack_dir in "$LOCAL_PACKS"/*/; do
        [[ -d "$pack_dir" ]] || continue
        slug=$(basename "$pack_dir")
        cmd_dir="${pack_dir}commands"
        [[ -d "$cmd_dir" ]] || continue

        for cmd_file in "$cmd_dir"/*.md; do
            [[ -f "$cmd_file" ]] || continue
            cmd_name=$(basename "$cmd_file")
            local_cmd="${LOCAL_COMMANDS}/${cmd_name}"

            if [[ -e "$local_cmd" ]] || [[ -L "$local_cmd" ]]; then
                # Already exists (framework command or another pack) — don't overwrite
                cmd_skipped=$((cmd_skipped + 1))
            else
                # Register: symlink to pack command via relative path
                ln -s "../constructs/packs/${slug}/commands/${cmd_name}" "$local_cmd"
                cmd_registered=$((cmd_registered + 1))
            fi
        done
    done
fi

# =============================================================================
# Write sync state
# =============================================================================

total=$((added + updated + unchanged))
now=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
global_pack_count=0
[[ -f "$GLOBAL_META" ]] && command -v jq &>/dev/null && \
    global_pack_count=$(jq -r '.pack_count // 0' "$GLOBAL_META" 2>/dev/null || echo 0)

# Ensure constructs dir exists for state file
mkdir -p "$(dirname "$SYNC_STATE")"

cat > "$SYNC_STATE" << EOF
{
  "synced_at": "${now}",
  "packs_added": ${added},
  "packs_updated": ${updated},
  "packs_removed": ${removed},
  "packs_unchanged": ${unchanged},
  "packs_total": ${total},
  "commands_registered": ${cmd_registered},
  "commands_skipped": ${cmd_skipped},
  "global_total": ${global_pack_count},
  "global_store": "${GLOBAL_PACKS}",
  "method": "symlink"
}
EOF

# =============================================================================
# Output
# =============================================================================

if [[ "$JSON_OUTPUT" == "true" ]]; then
    cat "$SYNC_STATE"
elif [[ $added -gt 0 ]] || [[ $updated -gt 0 ]] || [[ $removed -gt 0 ]] || [[ $cmd_registered -gt 0 ]]; then
    # Only report when changes happen (silent on no-op)
    msg="packs synced: +${added} ~${updated} -${removed} (${total} total)"
    [[ $cmd_registered -gt 0 ]] && msg+=", commands: +${cmd_registered}"
    echo "$msg" >&2
fi
