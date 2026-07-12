#!/usr/bin/env bash
# =============================================================================
# Loa Constructs - Ensure Script
# =============================================================================
# Install packs if absent; optionally resync from local GitHub SoT.
#
# Usage:
#   construct-ensure.sh <slug> [slug...]     Install-if-absent
#   construct-ensure.sh --resync <slug>      Force resync one pack
#   construct-ensure.sh --resync --all       Resync all installed packs
#
# Issue #253: installs-if-absent alone never updates; --resync is the cross-session
# sync primitive that re-pulls each pack's GitHub SoT and re-copies into .loa.
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_SCRIPT="$SCRIPT_DIR/constructs-install.sh"

if [[ ! -x "$INSTALL_SCRIPT" ]]; then
    echo "ERROR: constructs-install.sh not found at $INSTALL_SCRIPT" >&2
    exit 6
fi

if [[ -f "$SCRIPT_DIR/constructs-lib.sh" ]]; then
    # shellcheck source=constructs-lib.sh
    source "$SCRIPT_DIR/constructs-lib.sh"
fi

show_usage() {
    cat << 'EOF'
Usage: construct-ensure.sh [options] [pack-slug...]

Options:
    --resync          Re-pull GitHub SoT and re-copy (requires slug or --all)
    --all             With --resync, resync every installed pack
    -h, --help        Show this help

Examples:
    construct-ensure.sh gecko keeper           # install if absent
    construct-ensure.sh --resync gecko         # force resync from GitHub SoT
    construct-ensure.sh --resync --all         # resync all installed packs
EOF
}

RESYNC=false
RESYNC_ALL=false
PACKS=()

while [[ $# -gt 0 ]]; do
    case "$1" in
        --resync)
            RESYNC=true
            shift
            ;;
        --all)
            RESYNC_ALL=true
            shift
            ;;
        -h|--help|help)
            show_usage
            exit 0
            ;;
        -*)
            echo "ERROR: Unknown option: $1" >&2
            show_usage
            exit 6
            ;;
        *)
            PACKS+=("$1")
            shift
            ;;
    esac
done

if [[ "$RESYNC" == "true" ]]; then
    if [[ "$RESYNC_ALL" == "true" ]]; then
        exec "$INSTALL_SCRIPT" resync --all
    fi
    if [[ ${#PACKS[@]} -eq 0 ]]; then
        echo "ERROR: --resync requires a pack slug or --all" >&2
        show_usage
        exit 6
    fi
    for slug in "${PACKS[@]}"; do
        "$INSTALL_SCRIPT" resync "$slug"
    done
    exit 0
fi

if [[ ${#PACKS[@]} -eq 0 ]]; then
    show_usage
    exit 6
fi

packs_dir="${LOA_CONSTRUCTS_DIR:-.claude/constructs}/packs"

for slug in "${PACKS[@]}"; do
    if [[ -d "$packs_dir/$slug" ]]; then
        echo "Pack '$slug' already installed at $packs_dir/$slug"
        continue
    fi
    "$INSTALL_SCRIPT" pack "$slug"
done
