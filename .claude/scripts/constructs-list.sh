#!/usr/bin/env bash
# =============================================================================
# constructs-list — agent-facing pack enumeration (cycle-003 Leg L6)
# =============================================================================
# Answers "what THJ constructs are installed, and what's their state?" from
# ~/.loa/constructs/packs/*/{construct.yaml,.source.json}.
#
# Honors the read-mode discipline from bonfire-construct-pipe-doctrine §14.3:
#
#   glance   — one-line summary per pack, table-style. Default.
#   orient   — multi-line summary with description + key metadata.
#   intervene — full JSON dump per pack, pipeable.
#
# Usage:
#   constructs-list                 # glance mode (default)
#   constructs-list --orient        # orient mode
#   constructs-list --intervene     # intervene mode (JSON)
#   constructs-list --json          # alias for --intervene
#
# Exit codes:
#   0 = success
#   1 = ~/.loa/constructs/packs not found (no installs)
#   2 = dependency missing (yq)
#
# Doctrine reference:
#   grimoires/loa-constructs-seed-2026-04-21/bonfire-construct-pipe-doctrine.md
#   §14.3 (read-modes), §3 (stream-type vocabulary)
# =============================================================================

set -euo pipefail

PACKS_DIR="${LOA_CONSTRUCTS_DIR:-$HOME/.loa/constructs/packs}"
MODE="glance"

for arg in "$@"; do
    case "$arg" in
        --glance) MODE="glance" ;;
        --orient) MODE="orient" ;;
        --intervene|--json) MODE="intervene" ;;
        -h|--help)
            sed -n '2,25p' "$0" | sed 's/^# //;s/^#//'
            exit 0
            ;;
        *)
            echo "unknown flag: $arg" >&2
            exit 2
            ;;
    esac
done

if [[ ! -d "$PACKS_DIR" ]]; then
    echo "no constructs installed at $PACKS_DIR" >&2
    exit 1
fi

if ! command -v yq >/dev/null 2>&1; then
    echo "yq not found on PATH (needed to parse construct.yaml)" >&2
    exit 2
fi

# Read pack metadata into a JSON array, one object per pack.
# Graceful on missing .source.json (most current installs lack it — cycle-003 F22).
emit_pack_json() {
    local pack_dir="$1"
    local slug; slug="$(basename "$pack_dir")"
    local yaml="$pack_dir/construct.yaml"
    local source_json="$pack_dir/.source.json"

    local name="" version="" description="" visibility="" schema_version="" skill_count=0 command_count=0
    local reads_count=0 writes_count=0
    if [[ -f "$yaml" ]]; then
        name=$(yq -r '.name // ""' "$yaml" 2>/dev/null)
        version=$(yq -r '.version // ""' "$yaml" 2>/dev/null)
        description=$(yq -r '.description // .short_description // ""' "$yaml" 2>/dev/null)
        visibility=$(yq -r '.visibility // "unknown"' "$yaml" 2>/dev/null)
        schema_version=$(yq -r '.schema_version // ""' "$yaml" 2>/dev/null)
        skill_count=$(yq -r '(.skills // []) | length' "$yaml" 2>/dev/null)
        command_count=$(yq -r '(.commands // []) | length' "$yaml" 2>/dev/null)
        # cycle-005 L7 · surface stream declarations (doctrine §3)
        reads_count=$(yq -r '(.reads // .streams.reads // []) | length' "$yaml" 2>/dev/null)
        writes_count=$(yq -r '(.writes // .streams.writes // []) | length' "$yaml" 2>/dev/null)
    fi

    # cycle-005 L7 · persona handles (yaml declaration OR identity/<HANDLE>.md filenames)
    local personas_json="[]"
    if [[ -f "$yaml" ]]; then
        personas_json=$(yq -o=json '.personas // []' "$yaml" 2>/dev/null || echo "[]")
        # If empty list, probe identity dir
        if [[ "$(echo "$personas_json" | jq 'length')" == "0" && -d "$pack_dir/identity" ]]; then
            personas_json=$(
                find "$pack_dir/identity" -maxdepth 1 -name '*.md' -print 2>/dev/null \
                  | while read -r f; do
                      base=$(basename "$f" .md)
                      [[ "$base" =~ ^[A-Z][A-Z0-9_]+$ ]] && printf '%s\n' "$base"
                    done | LC_ALL=C sort -u | jq -R . | jq -sc .
            )
            [[ -z "$personas_json" ]] && personas_json="[]"
        fi
    fi

    local source_repo="" source_commit="" installed_at="" source_state="no_source_json"
    if [[ -f "$source_json" ]]; then
        source_repo=$(jq -r '.source_repo // ""' "$source_json" 2>/dev/null)
        source_commit=$(jq -r '.source_commit // ""' "$source_json" 2>/dev/null)
        installed_at=$(jq -r '.installed_at // ""' "$source_json" 2>/dev/null)
        source_state="tracked"
    fi

    # Drift check: if it's a git repo, compare HEAD vs .source.json source_commit
    local drift_state="unknown"
    if [[ -d "$pack_dir/.git" ]]; then
        local current_commit
        current_commit=$(git -C "$pack_dir" rev-parse HEAD 2>/dev/null || echo "")
        if [[ -n "$current_commit" && -n "$source_commit" ]]; then
            if [[ "$current_commit" == "$source_commit" ]]; then
                drift_state="clean"
            else
                drift_state="drifted"
            fi
        else
            drift_state="git_only"
        fi
    elif [[ -L "$pack_dir" ]]; then
        drift_state="symlink"
    fi

    jq -n \
        --arg slug "$slug" \
        --arg name "$name" \
        --arg version "$version" \
        --arg description "$description" \
        --arg visibility "$visibility" \
        --arg schema_version "$schema_version" \
        --argjson skill_count "${skill_count:-0}" \
        --argjson command_count "${command_count:-0}" \
        --argjson reads_count "${reads_count:-0}" \
        --argjson writes_count "${writes_count:-0}" \
        --argjson personas "$personas_json" \
        --arg source_repo "$source_repo" \
        --arg source_commit "$source_commit" \
        --arg installed_at "$installed_at" \
        --arg source_state "$source_state" \
        --arg drift_state "$drift_state" \
        --arg pack_dir "$pack_dir" \
        '{slug:$slug, name:$name, version:$version, description:$description,
          visibility:$visibility, schema_version:$schema_version,
          skill_count:$skill_count, command_count:$command_count,
          reads_count:$reads_count, writes_count:$writes_count,
          personas:$personas,
          source_repo:$source_repo, source_commit:$source_commit,
          installed_at:$installed_at, source_state:$source_state,
          drift_state:$drift_state, pack_dir:$pack_dir}'
}

# Collect all packs as JSON stream.
all_packs_json=$(
    for pack_dir in "$PACKS_DIR"/*/; do
        [[ -d "$pack_dir" ]] || continue
        emit_pack_json "${pack_dir%/}"
    done | jq -s '.'
)

# Glyph map for source_state + drift_state combined.
state_glyph() {
    local source_state="$1" drift_state="$2"
    case "$source_state:$drift_state" in
        tracked:clean)      echo "✓"  ;;
        tracked:drifted)    echo "△"  ;;
        tracked:git_only)   echo "?"  ;;
        no_source_json:*)   echo "·"  ;;  # F22 majority case — installed but untracked
        *)                  echo " "  ;;
    esac
}

case "$MODE" in
    glance)
        # One line per pack. Table of slug + version + state + skills + visibility.
        printf "%-3s %-24s %-10s %-8s %4s %4s %s\n" \
            "ST" "slug" "version" "visib." "skl" "cmd" "name"
        printf "%-3s %-24s %-10s %-8s %4s %4s %s\n" \
            "--" "----" "-------" "------" "---" "---" "----"
        echo "$all_packs_json" | jq -r '.[] |
            [.source_state, .drift_state, .slug, .version, .visibility,
             .skill_count, .command_count, .name] | @tsv' |
        while IFS=$'\t' read -r ss ds slug ver vis skl cmd nm; do
            glyph=$(state_glyph "$ss" "$ds")
            printf "%-3s %-24s %-10s %-8s %4s %4s %s\n" \
                "$glyph" "$slug" "$ver" "$vis" "$skl" "$cmd" "$nm"
        done
        echo ""
        # Footer: summary line.
        total=$(echo "$all_packs_json" | jq 'length')
        tracked=$(echo "$all_packs_json" | jq '[.[] | select(.source_state == "tracked")] | length')
        drifted=$(echo "$all_packs_json" | jq '[.[] | select(.drift_state == "drifted")] | length')
        untracked=$(echo "$all_packs_json" | jq '[.[] | select(.source_state == "no_source_json")] | length')
        echo "${total} packs · ${tracked} tracked (✓/△) · ${untracked} untracked (·) · ${drifted} drifted (△)"
        ;;
    orient)
        echo "$all_packs_json" | jq -r '.[] |
            "──────────────────────────────────────────\n" +
            "\(.slug) \(.version)  [\(.visibility)]\n" +
            "  \(.name)\n" +
            "  \(.description)\n" +
            "  skills: \(.skill_count) · commands: \(.command_count) · schema_v\(.schema_version)\n" +
            "  personas: " + (if (.personas | length) > 0 then (.personas | map("@" + .) | join(", ")) else "(none declared)" end) + "\n" +
            "  streams: reads=\(.reads_count) writes=\(.writes_count)" + (if (.reads_count + .writes_count) == 0 then " ⚠ undeclared" else "" end) + "\n" +
            "  state: \(.source_state) · drift: \(.drift_state)\n" +
            (if .source_repo != "" then "  source: \(.source_repo) @ \(.source_commit)\n" else "  source: (no .source.json — untracked install)\n" end)'
        ;;
    intervene)
        echo "$all_packs_json"
        ;;
esac
