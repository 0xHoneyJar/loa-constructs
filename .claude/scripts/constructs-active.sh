#!/usr/bin/env bash
# =============================================================================
# constructs-active — agent active-context reporter (cycle-004 L1)
# =============================================================================
# Answers: "what's informing this agent's current response?" in read-mode
# latency per doctrine §16.4 transparency invariant.
#
# Combines four signal sources:
#   1. Recent trajectory rows (what I invoked this turn) — ~/.../.run/construct-trajectory.jsonl
#   2. Recent feedback-v3 rows (what Verdicts I've emitted) — .run/feedback-v3.jsonl
#   3. Project CLAUDE.md hints (mode/lens declared by project)
#   4. Installed packs (what's AVAILABLE vs what's ACTIVE)
#
# Read modes per doctrine §14.3:
#   glance    (<1s) — single line: active constructs + mode + lens
#   orient    (~5s) — multi-line: by source, with recent-invocation counts
#   intervene (JSON) — full structured snapshot, pipeable to downstream tools
#
# Doctrine compliance:
#   §16.4 transparency invariant — active set visible in read-mode latency
#   §16.3 composition determinism — explicit reporting of what's in scope
#   §14.3 read-modes — three output tiers
#   §13.1 shell-first — no TypeScript, no frameworks
#
# Usage:
#   constructs-active              # glance mode (default)
#   constructs-active --orient     # orient mode
#   constructs-active --intervene  # intervene mode (JSON)
#   constructs-active --since 30m  # trajectory window (default: 10m)
#   constructs-active --project /path  # override project root
#
# Exit codes:
#   0 — success
#   1 — missing dependency (jq / yq)
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${PROJECT_ROOT:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
PACKS_DIR="${LOA_CONSTRUCTS_DIR:-$HOME/.loa/constructs/packs}"
TRAJECTORY_FILE="${LOA_TRAJECTORY_FILE:-$PROJECT_ROOT/.run/construct-trajectory.jsonl}"
FEEDBACK_FILE="${LOA_FEEDBACK_V3_FILE:-$PROJECT_ROOT/.run/feedback-v3.jsonl}"
GLOBAL_CLAUDE_MD="${HOME}/.claude/CLAUDE.md"

MODE="glance"
SINCE="10m"

# Parse args
while [[ $# -gt 0 ]]; do
    case "$1" in
        --glance) MODE="glance"; shift ;;
        --orient) MODE="orient"; shift ;;
        --intervene|--json) MODE="intervene"; shift ;;
        --since) SINCE="$2"; shift 2 ;;
        --project) PROJECT_ROOT="$2"; TRAJECTORY_FILE="$PROJECT_ROOT/.run/construct-trajectory.jsonl"; FEEDBACK_FILE="$PROJECT_ROOT/.run/feedback-v3.jsonl"; shift 2 ;;
        -h|--help)
            sed -n '2,35p' "$0" | sed 's/^# \{0,1\}//'
            exit 0
            ;;
        *)
            echo "unknown flag: $1" >&2
            exit 1
            ;;
    esac
done

command -v jq &>/dev/null || { echo "jq required" >&2; exit 1; }

# Compute cutoff timestamp from --since value.
# Supports "Nm" (minutes), "Nh" (hours), "Nd" (days).
compute_cutoff() {
    local s="$1"
    local n="${s%[mhd]}"
    local unit="${s: -1}"
    local seconds=0
    case "$unit" in
        m) seconds=$((n * 60)) ;;
        h) seconds=$((n * 3600)) ;;
        d) seconds=$((n * 86400)) ;;
        *) seconds=600 ;;  # 10m default
    esac
    # BSD/GNU compat
    date -u -v"-${seconds}S" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null \
        || date -u -d "@$(( $(date +%s) - seconds ))" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null \
        || echo "1970-01-01T00:00:00Z"
}

CUTOFF=$(compute_cutoff "$SINCE")

# --- Signal 1: Recent trajectory rows ---
recent_trajectory=$(
    if [[ -f "$TRAJECTORY_FILE" ]]; then
        jq -c --arg cutoff "$CUTOFF" 'select(.timestamp >= $cutoff)' "$TRAJECTORY_FILE" 2>/dev/null || echo ""
    fi
)

# Active constructs: unique construct_slug from entry rows without matching exit (in-flight)
# OR recent entry+exit pairs within window.
active_constructs=$(
    if [[ -n "$recent_trajectory" ]]; then
        echo "$recent_trajectory" | jq -s '[.[] | .construct_slug] | unique'
    else
        echo "[]"
    fi
)
invocation_count=$(echo "$recent_trajectory" | awk '/^\{/{c++} END{print c+0}')

# --- Signal 2: Recent feedback-v3 Verdicts ---
recent_verdicts=$(
    if [[ -f "$FEEDBACK_FILE" ]]; then
        jq -c --arg cutoff "$CUTOFF" 'select(.timestamp_end >= $cutoff)' "$FEEDBACK_FILE" 2>/dev/null || echo ""
    fi
)
verdict_count=$(echo "$recent_verdicts" | awk '/^\{/{c++} END{print c+0}')
verdict_personas=$(
    if [[ -n "$recent_verdicts" ]]; then
        echo "$recent_verdicts" | jq -s '[.[] | .persona] | unique'
    else
        echo "[]"
    fi
)

# --- Signal 3: Project CLAUDE.md mode/lens hints ---
project_modes=""
project_lenses=""
if [[ -f "$PROJECT_ROOT/CLAUDE.md" ]]; then
    # Simple heuristic: grep for "FEEL mode"/"@ALEXANDER"/"/feel" style mentions
    # Future: a structured ACTIVE_MODE frontmatter
    project_modes=$(grep -oE '\b(FEEL|ARCH|DIG|SHIP|FRAME|TEND)[[:space:]]+mode\b' "$PROJECT_ROOT/CLAUDE.md" 2>/dev/null | awk '{print $1}' | sort -u | head -5 | tr '\n' ',' | sed 's/,$//')
    project_lenses=$(grep -oE '\b(craft|keeper|canon|GTM|weaver|ecosystem)[[:space:]]+lens\b' "$PROJECT_ROOT/CLAUDE.md" 2>/dev/null | awk '{print $1}' | sort -u | head -5 | tr '\n' ',' | sed 's/,$//')
fi

# --- Signal 4: Installed packs count ---
installed_pack_count=0
if [[ -d "$PACKS_DIR" ]]; then
    installed_pack_count=$(ls -d "$PACKS_DIR"/*/ 2>/dev/null | wc -l | tr -d ' ')
fi

# --- Signal 5: Global Operator OS detection ---
global_os_present=false
[[ -f "$GLOBAL_CLAUDE_MD" ]] && grep -q "Operator OS" "$GLOBAL_CLAUDE_MD" 2>/dev/null && global_os_present=true

# --- Output by mode ---
case "$MODE" in
    glance)
        # One-line summary
        active_brief=$(echo "$active_constructs" | jq -r 'if length == 0 then "none" elif length > 3 then (.[0:3] | join(",")) + "+\((length - 3))" else join(",") end')
        mode_brief="${project_modes:-no-mode}"
        lens_brief="${project_lenses:-no-lens}"
        printf "🧬 active: %s · mode: %s · lens: %s · trajectory: %s invocations/%s · verdicts: %s · packs installed: %s\n" \
            "$active_brief" "$mode_brief" "$lens_brief" "$invocation_count" "$SINCE" "$verdict_count" "$installed_pack_count"
        ;;
    orient)
        # Multi-line structured report
        echo "════════════════════════════════════════════════════════════"
        echo "🧬 CONSTRUCTS ACTIVE (window: $SINCE · as of $(date -u +%Y-%m-%dT%H:%M:%SZ))"
        echo "════════════════════════════════════════════════════════════"
        echo ""
        echo "Trajectory (recent invocations):"
        if [[ "$invocation_count" -eq 0 ]]; then
            echo "   (no invocations in window)"
        else
            echo "$recent_trajectory" | jq -s 'group_by(.construct_slug) | .[] | {slug: .[0].construct_slug, count: length, latest: (max_by(.timestamp).timestamp)}' | jq -rc '"   \(.slug)  ·  \(.count) invocations  ·  latest \(.latest)"'
        fi
        echo ""
        echo "Verdicts emitted (recent feedback-v3):"
        if [[ "$verdict_count" -eq 0 ]]; then
            echo "   (none emitted in window)"
        else
            echo "   $verdict_count verdicts from personas: $(echo "$verdict_personas" | jq -rc 'join(", ")')"
        fi
        echo ""
        echo "Project-declared context (from CLAUDE.md):"
        echo "   modes mentioned: ${project_modes:-none}"
        echo "   lenses mentioned: ${project_lenses:-none}"
        echo ""
        echo "Environment:"
        echo "   installed packs: $installed_pack_count (see: constructs-list)"
        echo "   Operator OS loaded: $global_os_present"
        echo "   trajectory file: $([ -f "$TRAJECTORY_FILE" ] && echo "$TRAJECTORY_FILE" || echo "(none)")"
        echo "   feedback file: $([ -f "$FEEDBACK_FILE" ] && echo "$FEEDBACK_FILE" || echo "(none)")"
        echo ""
        echo "════════════════════════════════════════════════════════════"
        ;;
    intervene)
        # Full structured JSON
        jq -n \
            --arg mode "$MODE" \
            --arg window "$SINCE" \
            --arg cutoff "$CUTOFF" \
            --arg now "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
            --argjson active_constructs "$active_constructs" \
            --argjson invocation_count "$invocation_count" \
            --argjson verdict_count "$verdict_count" \
            --argjson verdict_personas "$verdict_personas" \
            --arg project_modes "$project_modes" \
            --arg project_lenses "$project_lenses" \
            --argjson installed_pack_count "$installed_pack_count" \
            --argjson global_os_present "$global_os_present" \
            --arg trajectory_file "$TRAJECTORY_FILE" \
            --arg feedback_file "$FEEDBACK_FILE" \
            --arg project_root "$PROJECT_ROOT" \
            '{
              mode: $mode,
              window: $window,
              window_cutoff: $cutoff,
              generated_at: $now,
              active_constructs: $active_constructs,
              trajectory: {
                invocation_count: $invocation_count,
                file: $trajectory_file
              },
              verdicts: {
                count: $verdict_count,
                personas: $verdict_personas,
                file: $feedback_file
              },
              project_context: {
                root: $project_root,
                modes_mentioned: $project_modes,
                lenses_mentioned: $project_lenses
              },
              environment: {
                installed_pack_count: $installed_pack_count,
                operator_os_loaded: $global_os_present
              }
            }'
        ;;
esac
