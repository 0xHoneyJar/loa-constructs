#!/usr/bin/env bash
# =============================================================================
# migrate-subagents-to-agents.sh — Sprint 6 migration
# =============================================================================
# Cycle: simstim-20260509-aead9136 (Sprint 6, S6-T2)
# PRD: FR-9 + FR-10
# SDD: §2.8.2
#
# Migrates .claude/subagents/*.md → .claude/agents/loa-validator-*.md.
# Renames frontmatter `name:` field. Updates loader references.
#
# Per Sprint 0 amendment + bridge iter 1 M-2: prefix is `loa-validator-`
# (not just `loa-`) — reserves loa- namespace for future general-purpose
# Loa agent classes.
#
# Usage:
#   migrate-subagents-to-agents.sh           Execute migration
#   migrate-subagents-to-agents.sh --dry-run Show what would happen
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_ROOT="$(cd "$PROJECT_ROOT/.." && pwd)"
SUBAGENTS_DIR="$PROJECT_ROOT/.claude/subagents"
AGENTS_DIR="$PROJECT_ROOT/.claude/agents"

DRY_RUN=0
case "${1:-}" in
    --dry-run) DRY_RUN=1 ;;
    -h|--help)
        cat <<EOF
Usage: migrate-subagents-to-agents.sh [--dry-run]

Migrates .claude/subagents/*.md → .claude/agents/loa-validator-*.md.
Updates loader references in:
  .claude/commands/validate.md
  .claude/protocols/subagent-invocation.md
  .claude/protocols/structured-memory.md

Removes .claude/subagents/ directory after migration.
EOF
        exit 0
        ;;
esac

if [[ ! -d "$SUBAGENTS_DIR" ]]; then
    echo "[migrate] $SUBAGENTS_DIR not found — nothing to migrate (already done?)"
    exit 0
fi

# Slug-rename map (matches inventory)
declare -A SLUG_MAP=(
    ["architecture-validator"]="architecture"
    ["documentation-coherence"]="documentation"
    ["goal-validator"]="goal"
    ["security-scanner"]="security"
    ["test-adequacy-reviewer"]="test-adequacy"
)

# Output paths
declare -A TARGET_PATH

run() {
    if [[ "$DRY_RUN" == "1" ]]; then
        echo "DRY-RUN: $*"
    else
        eval "$@"
    fi
}

migrate_one() {
    local src="$1"
    local old_slug new_slug new_path
    old_slug="$(basename "$src" .md)"
    new_slug="${SLUG_MAP[$old_slug]:-$old_slug}"
    new_path="$AGENTS_DIR/loa-validator-$new_slug.md"

    if [[ ! -f "$src" ]]; then
        echo "[migrate] SKIP (not found): $src"
        return 0
    fi

    if [[ -f "$new_path" ]]; then
        echo "[migrate] WARN: target already exists: $new_path"
        return 0
    fi

    # Read content; rewrite frontmatter
    if [[ "$DRY_RUN" == "1" ]]; then
        echo "DRY-RUN: would migrate $src → $new_path with frontmatter rewrite"
        return 0
    fi

    python3 - "$src" "$new_path" "loa-validator-$new_slug" <<'PYEOF'
import sys, re

src_path, dst_path, new_name = sys.argv[1], sys.argv[2], sys.argv[3]

with open(src_path) as f:
    content = f.read()

# Parse front matter
m = re.match(r"^---\s*\n(.*?)\n---\s*\n", content, re.DOTALL)
if not m:
    # No frontmatter — just write a new file with loa-validator-name frontmatter
    new_content = f"""---
name: {new_name}
model: inherit
---

{content}
"""
else:
    fm_text = m.group(1)
    rest = content[m.end():]

    # Replace name: <X>
    fm_lines = []
    found_name = False
    found_model = False
    for line in fm_text.splitlines():
        if re.match(r"^name:\s*", line):
            fm_lines.append(f"name: {new_name}")
            found_name = True
        elif re.match(r"^model:\s*", line):
            fm_lines.append(line)
            found_model = True
        elif re.match(r"^agent:\s*", line):
            # `agent: Explore` (legacy) → drop; native CC subagents declare tools, not agent type.
            # Comment for trace: keep field history but inert.
            fm_lines.append(f"# legacy field removed: {line}")
        else:
            fm_lines.append(line)

    if not found_name:
        fm_lines.insert(0, f"name: {new_name}")
    if not found_model:
        fm_lines.append("model: inherit")

    # Add tools allowlist if not present (native CC subagent format)
    has_tools = any(re.match(r"^tools:\s*", l) for l in fm_lines)
    if not has_tools:
        fm_lines.append("tools: Read, Grep, Glob, Bash")

    # Add migration provenance under `loa:` block
    fm_lines.append("loa:")
    fm_lines.append("  legacy_path: .claude/subagents/" + src_path.split("/")[-1])
    fm_lines.append("  agent_class: validator")
    fm_lines.append("  cycle:")
    fm_lines.append("    migrated_in: simstim-20260509-aead9136")
    fm_lines.append("    sprint: cycle-construct-rooms-sprint-6")

    new_content = "---\n" + "\n".join(fm_lines) + "\n---\n" + rest

with open(dst_path, "w") as f:
    f.write(new_content)
PYEOF

    echo "[migrate] $src → $new_path"
}

migrate_readme() {
    local src="$SUBAGENTS_DIR/README.md"
    local dst="$AGENTS_DIR/loa-validators-README.md"

    [[ -f "$src" ]] || return 0
    [[ -f "$dst" ]] && return 0

    if [[ "$DRY_RUN" == "1" ]]; then
        echo "DRY-RUN: would migrate $src → $dst"
        return 0
    fi

    cp "$src" "$dst"
    echo "[migrate] $src → $dst"
}

update_loaders() {
    # Update .claude/commands/validate.md
    local validate_md="$PROJECT_ROOT/.claude/commands/validate.md"
    if [[ -f "$validate_md" ]]; then
        if grep -q "\.claude/subagents/" "$validate_md"; then
            if [[ "$DRY_RUN" == "1" ]]; then
                echo "DRY-RUN: would update path in $validate_md"
            else
                sed -i.bak 's|\.claude/subagents/{type}\.md|.claude/agents/loa-validator-{type}.md|g; s|\.claude/subagents/\([a-z][a-z0-9_-]*\)\.md|.claude/agents/loa-validator-\1.md|g' "$validate_md"
                rm -f "$validate_md.bak"
                echo "[migrate] updated loader: $validate_md"
            fi
        fi
    fi

    # Update .claude/protocols/subagent-invocation.md
    local proto_md="$PROJECT_ROOT/.claude/protocols/subagent-invocation.md"
    if [[ -f "$proto_md" ]]; then
        if grep -q "\.claude/subagents/" "$proto_md"; then
            if [[ "$DRY_RUN" == "1" ]]; then
                echo "DRY-RUN: would update path in $proto_md"
            else
                sed -i.bak 's|\.claude/subagents/{type}\.md|.claude/agents/loa-validator-{type}.md|g; s|\.claude/subagents/README\.md|.claude/agents/loa-validators-README.md|g; s|\.claude/subagents/|.claude/agents/loa-validator-|g' "$proto_md"
                rm -f "$proto_md.bak"
                echo "[migrate] updated protocol: $proto_md"
            fi
        fi
    fi

    # Update .claude/protocols/structured-memory.md
    local sm_md="$PROJECT_ROOT/.claude/protocols/structured-memory.md"
    if [[ -f "$sm_md" ]]; then
        if grep -q "\.claude/subagents/" "$sm_md"; then
            if [[ "$DRY_RUN" == "1" ]]; then
                echo "DRY-RUN: would update path in $sm_md"
            else
                sed -i.bak 's|\.claude/subagents/security-scanner\.md|.claude/agents/loa-validator-security.md|g; s|\.claude/subagents/|.claude/agents/loa-validator-|g' "$sm_md"
                rm -f "$sm_md.bak"
                echo "[migrate] updated structured-memory: $sm_md"
            fi
        fi
    fi
}

remove_subagents_dir() {
    if [[ "$DRY_RUN" == "1" ]]; then
        echo "DRY-RUN: would rm -rf $SUBAGENTS_DIR"
        return 0
    fi

    # Remove only if empty after migration
    rm -f "$SUBAGENTS_DIR"/*.md 2>/dev/null || true
    rmdir "$SUBAGENTS_DIR" 2>/dev/null && echo "[migrate] removed $SUBAGENTS_DIR" || echo "[migrate] WARN: $SUBAGENTS_DIR not empty; leaving in place"
}

main() {
    echo "[migrate] starting Sprint 6 migration (.claude/subagents/ → .claude/agents/loa-validator-*)"
    [[ "$DRY_RUN" == "1" ]] && echo "[migrate] DRY-RUN mode"

    for f in "$SUBAGENTS_DIR"/*.md; do
        [[ "$(basename "$f")" == "README.md" ]] && continue
        migrate_one "$f"
    done

    migrate_readme
    update_loaders
    remove_subagents_dir

    echo "[migrate] complete"
}

main
