#!/usr/bin/env bash
# =============================================================================
# populate-global-store.sh — Populate ~/.loa/constructs/packs/ from cache
# =============================================================================
# Copies construct packs from .cache/construct-repos/ to the global store
# so that any repo with the loa framework can sync them on session start.
#
# This is the "farmer" script — loa-constructs is the source of truth for
# all construct pack content. Run after seed:auto to keep global store current.
#
# Usage:
#   scripts/populate-global-store.sh              # Populate all
#   scripts/populate-global-store.sh --only k-hole,artisan
#   scripts/populate-global-store.sh --dry-run    # Show what would be copied
#   scripts/populate-global-store.sh --json       # JSON output
#
# Exit Codes:
#   0 = success
#   1 = no cache directory found
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CACHE_DIR="${REPO_ROOT}/.cache/construct-repos"
GLOBAL_STORE="${LOA_GLOBAL_STORE:-${HOME}/.loa/constructs}"
GLOBAL_PACKS="${GLOBAL_STORE}/packs"
GLOBAL_META="${GLOBAL_STORE}/global.json"

# Shared construct-clew ledger lock — coordinate the preserve→rm→restore below with
# concurrent `ledger_append` captures (SDD §3.5). Degrade to unlocked (current
# behavior) if the helper is absent.
if [[ -f "${SCRIPT_DIR}/clew/clew-lock.sh" ]]; then
    # shellcheck source=scripts/clew/clew-lock.sh
    source "${SCRIPT_DIR}/clew/clew-lock.sh"
else
    clew_run_locked() { shift 3; [[ "${1:-}" == "--" ]] && shift; "$@"; }
fi

# Re-copy one pack from cache, preserving its construct-clew ledger byte-identically
# across the destructive clean. Called under the stable ledger lock (clew_run_locked).
_clew_populate_pack() {
    local dest="$1" repo_dir="$2"
    local keep="" allowed_dir allowed_file
    # Preserve the pack-root ledger (outside the allowlist copy) before the clean.
    if [[ -f "${dest}/LEARNINGS.jsonl" ]]; then
        keep="$(mktemp -d)"
        cp -p "${dest}/LEARNINGS.jsonl" "${keep}/LEARNINGS.jsonl"
    fi
    rm -rf "$dest"
    mkdir -p "$dest"
    for allowed_dir in "${ALLOWED_DIRS[@]}"; do
        [[ -d "${repo_dir}/${allowed_dir}" ]] && cp -R "${repo_dir}/${allowed_dir}" "${dest}/${allowed_dir}"
    done
    for allowed_file in "${ALLOWED_ROOT_FILES[@]}"; do
        [[ -f "${repo_dir}/${allowed_file}" ]] && cp "${repo_dir}/${allowed_file}" "${dest}/${allowed_file}"
    done
    # Restore the preserved ledger byte-identically (SDD §3.5 invariant).
    if [[ -n "$keep" ]]; then
        cp -p "${keep}/LEARNINGS.jsonl" "${dest}/LEARNINGS.jsonl"
        chmod 0600 "${dest}/LEARNINGS.jsonl"
        rm -rf "$keep"
    fi
}

DRY_RUN=false
JSON_OUTPUT=false
ONLY_SLUGS=()

# Allowed directories to copy from construct repos
ALLOWED_DIRS=(skills commands identity scripts templates contexts)
# Allowed root files
ALLOWED_ROOT_FILES=(construct.yaml construct.json CLAUDE.md manifest.json README.md)

# =============================================================================
# Argument Parsing
# =============================================================================

while [[ $# -gt 0 ]]; do
    case "$1" in
        --dry-run)  DRY_RUN=true; shift ;;
        --json)     JSON_OUTPUT=true; shift ;;
        --only)
            IFS=',' read -ra ONLY_SLUGS <<< "$2"
            shift 2
            ;;
        *)
            echo "Unknown argument: $1" >&2
            exit 1
            ;;
    esac
done

# =============================================================================
# Utilities
# =============================================================================

log() {
    [[ "$JSON_OUTPUT" == "true" ]] && return
    echo "$@" >&2
}

# Compute SHA-256 content hash for a directory (portable, deterministic)
compute_dir_hash() {
    local dir="$1"
    local hash_input=""

    while IFS= read -r -d '' file; do
        local rel_path="${file#${dir}/}"
        local file_hash
        file_hash=$(shasum -a 256 "$file" 2>/dev/null | cut -d' ' -f1)
        hash_input+="${rel_path}:${file_hash}\n"
    done < <(find "$dir" -type f -not -path '*/.git/*' -not -path '*/node_modules/*' -not -name '.DS_Store' -print0 | LC_ALL=C sort -z)

    if [[ -z "$hash_input" ]]; then
        echo "sha256:empty"
        return
    fi

    local root_hash
    root_hash=$(printf '%b' "$hash_input" | shasum -a 256 | cut -d' ' -f1)
    echo "sha256:${root_hash}"
}

# Extract version from construct.yaml
get_pack_version() {
    local pack_dir="$1"
    local manifest="${pack_dir}/construct.yaml"

    if [[ -f "$manifest" ]] && command -v yq &>/dev/null; then
        yq eval '.version // "unknown"' "$manifest" 2>/dev/null || echo "unknown"
    elif [[ -f "${pack_dir}/construct.json" ]] && command -v jq &>/dev/null; then
        jq -r '.version // "unknown"' "${pack_dir}/construct.json" 2>/dev/null || echo "unknown"
    elif [[ -f "${pack_dir}/manifest.json" ]] && command -v jq &>/dev/null; then
        jq -r '.version // "unknown"' "${pack_dir}/manifest.json" 2>/dev/null || echo "unknown"
    else
        echo "unknown"
    fi
}

# Extract slug from directory name (strip "construct-" prefix)
slug_from_dir() {
    local dirname="$1"
    echo "${dirname#construct-}"
}

# =============================================================================
# Main
# =============================================================================

main() {
    if [[ ! -d "$CACHE_DIR" ]]; then
        log "ERROR: Cache directory not found: $CACHE_DIR"
        log "Run 'bun run seed:auto' first to clone construct repos."
        exit 1
    fi

    # Ensure global store exists
    if [[ "$DRY_RUN" == "false" ]]; then
        mkdir -p "$GLOBAL_PACKS"
    fi

    # Deploy sync-packs.sh to global scripts directory
    local sync_script="${SCRIPT_DIR}/sync-packs.sh"
    local global_sync="${HOME}/.loa/scripts/sync-packs.sh"
    if [[ -f "$sync_script" ]] && [[ "$DRY_RUN" == "false" ]]; then
        mkdir -p "$(dirname "$global_sync")"
        cp "$sync_script" "$global_sync"
        chmod +x "$global_sync"
        log "Deployed sync-packs.sh → ${global_sync}"
    fi

    local total=0
    local synced=0
    local skipped=0
    local errors=0
    local packs_json="{"
    local first_pack=true

    for repo_dir in "$CACHE_DIR"/construct-*/; do
        [[ -d "$repo_dir" ]] || continue

        local dir_name
        dir_name=$(basename "$repo_dir")
        local slug
        slug=$(slug_from_dir "$dir_name")
        total=$((total + 1))

        # Filter by --only if specified
        if [[ ${#ONLY_SLUGS[@]} -gt 0 ]]; then
            local found=false
            for s in "${ONLY_SLUGS[@]}"; do
                [[ "$s" == "$slug" ]] && found=true && break
            done
            [[ "$found" == "false" ]] && { skipped=$((skipped + 1)); continue; }
        fi

        # Must have construct.yaml, construct.json, or manifest.json
        if [[ ! -f "${repo_dir}/construct.yaml" ]] && [[ ! -f "${repo_dir}/construct.json" ]] && [[ ! -f "${repo_dir}/manifest.json" ]]; then
            log "  SKIP: ${slug} (no construct.yaml, construct.json, or manifest.json)"
            skipped=$((skipped + 1))
            continue
        fi

        local dest="${GLOBAL_PACKS}/${slug}"
        local version
        version=$(get_pack_version "$repo_dir")

        if [[ "$DRY_RUN" == "true" ]]; then
            log "  [dry-run] Would populate: ${slug} (v${version})"
            synced=$((synced + 1))
            continue
        fi

        # Clean+recopy the pack, holding the STABLE shared ledger lock so a
        # concurrent `>>clew` capture during this preserve→rm→restore window is
        # serialized and never silently clobbered (SDD §3.5 / §6.1). 30s wait, then
        # proceed loud (a capture should hold the lock for <10ms).
        if ! clew_run_locked "$GLOBAL_PACKS" "$slug" 30 -- _clew_populate_pack "$dest" "$repo_dir"; then
            log "  ⚠ clew: ledger lock contended for ${slug}; pack re-copied without lock coordination"
            _clew_populate_pack "$dest" "$repo_dir"
        fi

        # Compute content hash
        local hash
        hash=$(compute_dir_hash "$dest")

        # Build JSON entry
        local now
        now=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
        if [[ "$first_pack" == "true" ]]; then
            first_pack=false
        else
            packs_json+=","
        fi
        packs_json+="\"${slug}\":{\"version\":\"${version}\",\"hash\":\"${hash}\",\"populated_at\":\"${now}\"}"

        log "  OK: ${slug} (v${version}, ${hash:0:20}...)"
        synced=$((synced + 1))
    done

    # Sync persona files to grimoires/personas/ for @-mention access
    # (Glob/CC file picker can't follow symlinks — need real copies)
    local personas_dir="${REPO_ROOT}/grimoires/personas"
    if [[ -d "${REPO_ROOT}/grimoires" ]] && [[ "$DRY_RUN" == "false" ]]; then
        mkdir -p "$personas_dir"
        local persona_map=(
            "artisan:identity/ALEXANDER.md:ALEXANDER.md"
            "k-hole:identity/STAMETS.md:STAMETS.md"
            "observer:identity/KEEPER.md:KEEPER.md"
            "the-arcade:identity/OSTROM.md:OSTROM.md"
            "the-arcade:identity/BARTH.md:BARTH.md"
            "the-arcade:identity/OPERATOR.md:OPERATOR.md"
        )
        local persona_synced=0
        for entry in "${persona_map[@]}"; do
            IFS=':' read -r p_slug p_src p_dest <<< "$entry"
            local src="${GLOBAL_PACKS}/${p_slug}/${p_src}"
            if [[ -f "$src" ]]; then
                cp "$src" "${personas_dir}/${p_dest}"
                persona_synced=$((persona_synced + 1))
            fi
        done
        [[ $persona_synced -gt 0 ]] && log "Synced ${persona_synced} personas → grimoires/personas/"
    fi

    # Write global.json manifest
    if [[ "$DRY_RUN" == "false" ]]; then
        local now
        now=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
        packs_json+="}"

        cat > "$GLOBAL_META" << METAEOF
{
  "schema_version": 1,
  "last_populated": "${now}",
  "source": "loa-constructs seed pipeline",
  "source_repo": "0xHoneyJar/loa-constructs",
  "pack_count": ${synced},
  "packs": ${packs_json}
}
METAEOF
    fi

    # Output
    if [[ "$JSON_OUTPUT" == "true" ]]; then
        jq -n \
            --arg store "$GLOBAL_PACKS" \
            --argjson total "$total" \
            --argjson synced "$synced" \
            --argjson skipped "$skipped" \
            --argjson errors "$errors" \
            --argjson dry_run "$DRY_RUN" \
            '{
                global_store: $store,
                total: $total,
                synced: $synced,
                skipped: $skipped,
                errors: $errors,
                dry_run: $dry_run
            }'
    else
        log ""
        log "Global store: ${GLOBAL_PACKS}"
        log "Total: ${total} | Synced: ${synced} | Skipped: ${skipped} | Errors: ${errors}"
        if [[ "$DRY_RUN" == "true" ]]; then
            log "(dry run — no files written)"
        else
            log "Manifest: ${GLOBAL_META}"
        fi
    fi
}

main
