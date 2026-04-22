#!/usr/bin/env bash
# =============================================================================
# constructs-sweep — backfill commands: declarations into pack construct.yaml
# =============================================================================
# Closes cycle-004 F28 at ecosystem scale: when a pack has command .md files
# in commands/ but doesn't declare them in construct.yaml, the resolver can't
# route via command tier. This sweep generates the yaml block from filesystem
# truth and (optionally) opens an upstream PR.
#
# Behavior:
#   1. For each target pack, scan commands/*.md
#   2. If construct.yaml lacks commands: declarations matching, generate them
#   3. --dry-run: print proposed yaml diff; no changes
#   4. --apply <pack>:  write to upstream repo + open PR (one pack at a time)
#   5. --audit-all: just print which packs are out-of-sync (no changes)
#
# Doctrine compliance:
#   §16.3 dispatch determinism — closes the L2 contract's command tier for
#         packs that have command files but didn't declare them
#   §13.1 shell-first
#
# Usage:
#   constructs-sweep --audit-all              # which packs out of sync?
#   constructs-sweep --dry-run <pack-slug>    # preview yaml additions
#   constructs-sweep --apply <pack-slug>      # write to upstream repo, open PR
#
# Exit codes:
#   0 = success / no work needed
#   1 = pack not found / not installed
#   2 = upstream PR creation failed
#   3 = dependency missing
# =============================================================================

set -euo pipefail

PACKS_DIR="${LOA_CONSTRUCTS_DIR:-$HOME/.loa/constructs/packs}"
ORG="${CONSTRUCTS_ORG:-0xHoneyJar}"
MODE=""
TARGET=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --audit-all) MODE="audit"; shift ;;
        --dry-run)   MODE="dry-run"; TARGET="$2"; shift 2 ;;
        --apply)     MODE="apply"; TARGET="$2"; shift 2 ;;
        -h|--help)
            sed -n '2,30p' "$0" | sed 's/^# \{0,1\}//'
            exit 0
            ;;
        *)
            echo "unknown flag: $1" >&2; exit 1 ;;
    esac
done

command -v yq &>/dev/null || { echo "yq required" >&2; exit 3; }
command -v jq &>/dev/null || { echo "jq required" >&2; exit 3; }

# Discover commands/*.md → propose yaml entries.
# Returns JSON array of {name, path} entries to ADD (already-declared ones excluded).
discover_command_drift() {
    local pack_dir="$1"
    local cmd_dir="$pack_dir/commands"
    local yaml="$pack_dir/construct.yaml"

    [[ ! -d "$cmd_dir" ]] && { echo "[]"; return; }
    [[ ! -f "$yaml" ]] && { echo "[]"; return; }

    # Names already declared in yaml
    local declared
    declared=$(yq -o=json '.commands // [] | map(.name)' "$yaml" 2>/dev/null || echo "[]")

    # Names from filesystem
    local fs_cmds=()
    for f in "$cmd_dir"/*.md; do
        [[ -f "$f" ]] || continue
        fs_cmds+=("$(basename "$f" .md)")
    done

    [[ ${#fs_cmds[@]} -eq 0 ]] && { echo "[]"; return; }

    # Compute drift = filesystem - declared
    printf '%s\n' "${fs_cmds[@]}" | jq -R . | jq -sc --argjson declared "$declared" \
        '. - $declared | map({name: ., path: ("commands/" + . + ".md")})'
}

emit_yaml_addition() {
    local additions_json="$1"
    [[ "$additions_json" == "[]" ]] && return
    echo "commands:"
    echo "$additions_json" | jq -r '.[] | "  - name: \(.name)\n    path: \(.path)"'
}

case "$MODE" in
    audit)
        printf "%-22s %-9s %s\n" "pack" "drift" "missing-commands"
        printf "%-22s %-9s %s\n" "----" "-----" "-----------------"
        for pack in "$PACKS_DIR"/*/; do
            slug=$(basename "$pack")
            additions=$(discover_command_drift "$pack")
            count=$(echo "$additions" | jq 'length')
            if [[ "$count" -gt 0 ]]; then
                names=$(echo "$additions" | jq -r '[.[].name] | join(", ")')
                printf "%-22s %-9s %s\n" "$slug" "$count drift" "$names"
            fi
        done
        ;;

    dry-run)
        [[ -z "$TARGET" ]] && { echo "--dry-run requires <pack-slug>"; exit 1; }
        pack="$PACKS_DIR/$TARGET"
        [[ ! -d "$pack" ]] && { echo "pack not installed: $TARGET" >&2; exit 1; }
        additions=$(discover_command_drift "$pack")
        count=$(echo "$additions" | jq 'length')
        if [[ "$count" -eq 0 ]]; then
            echo "✓ $TARGET — no drift, construct.yaml commands already in sync"
            exit 0
        fi
        echo "── Proposed addition to $TARGET/construct.yaml ──"
        emit_yaml_addition "$additions"
        echo ""
        echo "── Would open PR on upstream construct-$TARGET repo ──"
        echo "Use: constructs-sweep --apply $TARGET"
        ;;

    apply)
        [[ -z "$TARGET" ]] && { echo "--apply requires <pack-slug>"; exit 1; }
        pack="$PACKS_DIR/$TARGET"
        [[ ! -d "$pack" ]] && { echo "pack not installed: $TARGET" >&2; exit 1; }
        additions=$(discover_command_drift "$pack")
        count=$(echo "$additions" | jq 'length')
        if [[ "$count" -eq 0 ]]; then
            echo "✓ $TARGET — no drift; nothing to apply"
            exit 0
        fi

        # Clone upstream into temp, edit yaml, open PR
        local_repo="$ORG/construct-$TARGET"
        tmpdir=$(mktemp -d)
        echo "→ cloning $local_repo into $tmpdir"
        if ! gh repo clone "$local_repo" "$tmpdir/repo" -- --depth=20 2>&1 | tail -3; then
            echo "clone failed: $local_repo" >&2
            exit 2
        fi
        cd "$tmpdir/repo"

        # Append commands: block to construct.yaml (or merge if exists)
        # Simple strategy: yq -i to add. If commands already exists but partial,
        # the additions are computed against current yaml so this is safe.
        for entry in $(echo "$additions" | jq -c '.[]'); do
            name=$(echo "$entry" | jq -r '.name')
            path=$(echo "$entry" | jq -r '.path')
            yq -i ".commands += [{\"name\": \"$name\", \"path\": \"$path\"}]" construct.yaml
        done

        branch="cycle-004-sweep-add-commands"
        git checkout -b "$branch"
        git add construct.yaml
        git commit -m "feat(commands): declare $count commands in construct.yaml — cycle-004 F28 sweep

Closes the L2 invocation-contract gap where commands existed as files in
commands/ but weren't declared in construct.yaml — making them invisible
to the resolver's command tier.

Generated by constructs-sweep.sh from filesystem truth.

Per loa-constructs cycle-004 doctrine §16.3 (composition determinism).
Reference: https://github.com/0xHoneyJar/loa-constructs/blob/main/grimoires/loa-constructs-seed-2026-04-21/cycle-004-L2-invocation-contract.md
"
        git push -u origin "$branch"
        gh pr create --title "feat: declare commands in construct.yaml (cycle-004 F28 sweep)" \
            --body "$(printf 'Auto-generated by [constructs-sweep](https://github.com/0xHoneyJar/loa-constructs/blob/main/.claude/scripts/constructs-sweep.sh) per cycle-004 L2 invocation-contract gap (F28).\n\nAdded %s command declaration(s) to construct.yaml. Each command file already exists in commands/; this PR just makes them visible to the resolver command tier.\n\n%s\n' "$count" "$(echo "$additions" | jq -r '.[] | "- " + .name')")" \
            --base main 2>&1 | tail -3
        echo "→ PR opened on $local_repo"
        rm -rf "$tmpdir"
        ;;

    *)
        echo "usage: constructs-sweep [--audit-all | --dry-run <slug> | --apply <slug>]"
        exit 1
        ;;
esac
