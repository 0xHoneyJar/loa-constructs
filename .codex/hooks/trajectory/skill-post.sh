#!/usr/bin/env bash
# =============================================================================
# skill-post.sh — PostToolUse:Skill trajectory exit hook (cycle-003 L3)
# =============================================================================
# Pairs with skill-pre.sh. Reads stashed session_id + start timestamp, emits
# exit row with computed duration_ms via construct-invoke.sh.
#
# Doctrine: bonfire-construct-pipe-doctrine.md §13.3 L3.
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${PROJECT_ROOT:-$(cd "$SCRIPT_DIR/../../.." && pwd)}"
INVOKE_SH="$PROJECT_ROOT/.claude/scripts/construct-invoke.sh"
PACKS_DIR="${LOA_CONSTRUCTS_DIR:-$HOME/.loa/constructs/packs}"
STASH_DIR="${TMPDIR:-/tmp}/construct-invoke"

event_json=$(cat 2>/dev/null || echo "{}")
skill_name=$(echo "$event_json" | jq -r '.tool_input.skill // .skill // empty' 2>/dev/null)

if [[ -z "$skill_name" ]]; then
    exit 0
fi

# Fetch stashed session state.
sid_file="$STASH_DIR/skill_${skill_name}.sid"
t0_file="$STASH_DIR/skill_${skill_name}.t0"

if [[ ! -f "$sid_file" ]]; then
    # No pre-hook stashed state — skill wasn't a THJ construct or pre-hook didn't fire.
    exit 0
fi

session_id=$(cat "$sid_file" 2>/dev/null || echo "")
t0=$(cat "$t0_file" 2>/dev/null || echo "")
t1=$(date -u +%s)
duration_ms=""
if [[ -n "$t0" ]] && [[ "$t0" =~ ^[0-9]+$ ]]; then
    duration_ms=$(( (t1 - t0) * 1000 ))
fi

# Re-resolve construct_slug + persona (same logic as pre-hook).
construct_slug=""
if [[ -d "$PACKS_DIR" ]]; then
    for pack_dir in "$PACKS_DIR"/*/; do
        [[ -d "$pack_dir/skills/$skill_name" ]] || continue
        construct_slug=$(basename "${pack_dir%/}")
        break
    done
fi

if [[ -z "$construct_slug" ]]; then
    # Cleanup stash + exit.
    rm -f "$sid_file" "$t0_file" 2>/dev/null || true
    exit 0
fi

persona="$construct_slug"
pack_yaml="$PACKS_DIR/$construct_slug/construct.yaml"
if [[ -f "$pack_yaml" ]] && command -v yq &>/dev/null; then
    declared_name=$(yq -r '.name // ""' "$pack_yaml" 2>/dev/null)
    if [[ -n "$declared_name" ]] && [[ "$declared_name" != "null" ]]; then
        persona="$declared_name"
    fi
fi

# Outcome is "pass" by default; PostToolUse doesn't carry a success flag natively.
# Real outcome resolution (via Verdict stream) is future-cycle work.
outcome="${LOA_SKILL_OUTCOME:-pass}"

if [[ -x "$INVOKE_SH" ]]; then
    # Arg order: <persona> <slug> <duration_ms> <outcome> <trigger>
    # session_id auto-resolves via the pre-hook's temp-file stash (keyed by persona+slug).
    "$INVOKE_SH" exit "$persona" "$construct_slug" "$duration_ms" "$outcome" "skill:$skill_name" >/dev/null 2>&1 || true
fi

# Cleanup stash files.
rm -f "$sid_file" "$t0_file" 2>/dev/null || true

exit 0
