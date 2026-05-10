#!/usr/bin/env bash
# =============================================================================
# migrate-subagents-verify.sh — Sprint 6 post-migration verification (T8)
# =============================================================================
# Cycle: simstim-20260509-aead9136 (Sprint 6, S6-T3)
# PRD: §8.8 T8
# SDD: §2.8.3
#
# Verifies the .claude/subagents/ → .claude/agents/loa-validator-* migration:
#   - Old directory removed
#   - All 5 loa-validator-* adapters present
#   - claude agents lists each
#   - No remaining references in active code (excluding provenance trail)
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$PROJECT_ROOT"

EXIT_CODE=0
echo "[verify] T8 acceptance check"

# 1. .claude/subagents/ removed
if [[ -d "$PROJECT_ROOT/.claude/subagents" ]]; then
    if [[ -n "$(ls -A "$PROJECT_ROOT/.claude/subagents" 2>/dev/null)" ]]; then
        echo "  FAIL: .claude/subagents/ exists and is non-empty"
        EXIT_CODE=1
    else
        echo "  WARN: .claude/subagents/ exists but empty (rm with: rmdir .claude/subagents)"
    fi
else
    echo "  OK: .claude/subagents/ removed"
fi

# 2. All 5 loa-validator-* adapters present
EXPECTED=(architecture documentation goal security test-adequacy)
MISSING=()
for v in "${EXPECTED[@]}"; do
    if [[ ! -f "$PROJECT_ROOT/.claude/agents/loa-validator-$v.md" ]]; then
        MISSING+=("loa-validator-$v.md")
    fi
done
if [[ ${#MISSING[@]} -gt 0 ]]; then
    echo "  FAIL: missing validator adapters: ${MISSING[*]}"
    EXIT_CODE=1
else
    echo "  OK: 5 loa-validator-*.md adapters present"
fi

# 3. claude agents lists each
if command -v claude >/dev/null 2>&1; then
    LISTED="$(claude agents 2>&1 | grep -c "loa-validator-" || true)"
    if [[ "$LISTED" -lt 5 ]]; then
        echo "  FAIL: claude agents lists $LISTED loa-validator-* (expected ≥5)"
        EXIT_CODE=1
    else
        echo "  OK: claude agents lists $LISTED loa-validator-* adapters"
    fi
else
    echo "  SKIP: claude CLI not available"
fi

# 4. Zero blocking references (provenance + migration script excluded)
# FR-10.3 spirit: zero loader references in COMMITTED code. Excluded as
# documentation/provenance (per the .gitignore pattern these are not committed):
#   grimoires/loa/{prd,sdd,sprint}.md   — cycle PRD/SDD/sprint documenting migration
#   .run/spike/                          — cycle spike reports
#   .run/bridge-reviews/                 — cycle bridge reviews
#   .run/sprint-*-close.md               — sprint close summaries
#   .run/migration/                      — migration inventory
#   migrate-subagents*                   — migration script itself (rollback)
#   legacy_path:                         — provenance frontmatter in migrated adapters
HITS="$( { grep -r "\.claude/subagents/" . \
    --include="*.md" --include="*.sh" --include="*.ts" --include="*.json" --include="*.py" --include="*.yaml" --include="*.yml" \
    2>/dev/null \
    | grep -v "/archive/" \
    | grep -v "/grimoires/loa/archive/" \
    | grep -v "/_archive/" \
    | grep -v "node_modules" \
    | grep -v "/.run/" \
    | grep -v "/grimoires/loa/prd.md" \
    | grep -v "/grimoires/loa/sdd.md" \
    | grep -v "/grimoires/loa/sprint.md" \
    | grep -v "/grimoires/loa/context/" \
    | grep -v "/.cache/" \
    | grep -v "/docs/runtime/construct-adapters.md" \
    | grep -v "/tests/" \
    | grep -v "subagents-loaders.txt" \
    | grep -v "migrate-subagents" \
    | grep -v "legacy_path:" \
    || true; } | wc -l | tr -d ' ')"

if [[ "$HITS" -gt 0 ]]; then
    echo "  FAIL: $HITS blocking reference(s) to .claude/subagents/ remain:"
    grep -r "\.claude/subagents/" . \
        --include="*.md" --include="*.sh" --include="*.ts" --include="*.json" --include="*.py" --include="*.yaml" --include="*.yml" \
        2>/dev/null \
        | grep -v "/archive/" \
        | grep -v "/grimoires/loa/archive/" \
        | grep -v "/_archive/" \
        | grep -v "node_modules" \
        | grep -v "/.run/" \
        | grep -v "/grimoires/loa/prd.md" \
        | grep -v "/grimoires/loa/sdd.md" \
        | grep -v "/grimoires/loa/sprint.md" \
    | grep -v "/grimoires/loa/context/" \
    | grep -v "/.cache/" \
    | grep -v "/docs/runtime/construct-adapters.md" \
    | grep -v "/tests/" \
        | grep -v "subagents-loaders.txt" \
        | grep -v "migrate-subagents" \
        | grep -v "legacy_path:" \
        | head -10 \
        | sed 's/^/    /'
    EXIT_CODE=1
else
    echo "  OK: zero blocking references in active code"
fi

if [[ "$EXIT_CODE" -eq 0 ]]; then
    echo "[verify] T8 PASS"
else
    echo "[verify] T8 FAIL"
fi
exit $EXIT_CODE
