#!/usr/bin/env bash
# =============================================================================
# skill-pre.sh — PreToolUse:Skill trajectory entry hook (cycle-003 L3)
# =============================================================================
# Reads the Skill tool invocation event from stdin, resolves the skill name
# to an installed THJ construct, and emits an entry row via construct-invoke.sh.
# Stashes the session_id in a temp file keyed by skill so the post-hook can
# pair the exit row.
#
# Non-THJ-construct skills are skipped (no-op) so this hook never interferes
# with non-construct tool use.
#
# Doctrine: bonfire-construct-pipe-doctrine.md §13.3 L3 — construct-invoke
# must fire when the agent invokes a THJ construct skill.
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${PROJECT_ROOT:-$(cd "$SCRIPT_DIR/../../.." && pwd)}"
INVOKE_SH="$PROJECT_ROOT/.claude/scripts/construct-invoke.sh"
PACKS_DIR="${LOA_CONSTRUCTS_DIR:-$HOME/.loa/constructs/packs}"
STASH_DIR="${TMPDIR:-/tmp}/construct-invoke"

# Read Claude Code hook event JSON from stdin (PreToolUse payload).
# Shape (expected): { "tool_name": "Skill", "tool_input": { "skill": "<name>", "args": "..." } }
event_json=$(cat 2>/dev/null || echo "{}")
skill_name=$(echo "$event_json" | jq -r '.tool_input.skill // .skill // empty' 2>/dev/null)

if [[ -z "$skill_name" ]]; then
    # No skill name — can't trace. Silent no-op.
    exit 0
fi

# Check if this skill belongs to an installed THJ construct pack.
# Skills are nested under packs/*/skills/<skill-slug>/SKILL.md.
# Resolution: find any pack whose skills/ contains a dir matching skill_name.
construct_slug=""
if [[ -d "$PACKS_DIR" ]]; then
    for pack_dir in "$PACKS_DIR"/*/; do
        [[ -d "$pack_dir/skills/$skill_name" ]] || continue
        construct_slug=$(basename "${pack_dir%/}")
        break
    done
fi

if [[ -z "$construct_slug" ]]; then
    # Skill not resolved to a THJ construct — probably global Anthropic skill
    # or user-custom. Silent no-op so we don't pollute trajectory.
    exit 0
fi

# Resolve persona: read construct.yaml .name (pack-name as persona). Fall back to slug.
# Note: .identity.persona is a file PATH (identity/persona.yaml), not the persona name itself,
# so we don't dereference it here. Trajectory uses pack-name as the human-readable handle.
persona="$construct_slug"
pack_yaml="$PACKS_DIR/$construct_slug/construct.yaml"
if [[ -f "$pack_yaml" ]] && command -v yq &>/dev/null; then
    declared_name=$(yq -r '.name // ""' "$pack_yaml" 2>/dev/null)
    if [[ -n "$declared_name" ]] && [[ "$declared_name" != "null" ]]; then
        persona="$declared_name"
    fi
fi

# Emit entry row via construct-invoke.sh; captures session_id on stdout.
if [[ -x "$INVOKE_SH" ]]; then
    session_id=$("$INVOKE_SH" entry "$persona" "$construct_slug" "skill:$skill_name" 2>/dev/null || echo "")
    if [[ -n "$session_id" ]]; then
        mkdir -p "$STASH_DIR" 2>/dev/null || true
        echo "$session_id" > "$STASH_DIR/skill_${skill_name}.sid" 2>/dev/null || true
        # Also stash start time for duration computation in post-hook.
        date -u +%s > "$STASH_DIR/skill_${skill_name}.t0" 2>/dev/null || true
    fi
fi

exit 0
