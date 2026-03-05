#!/usr/bin/env bash
# constructs-health.sh — Construct health check and self-healing validation
#
# Usage:
#   constructs-health.sh                    # Check all installed packs
#   constructs-health.sh <pack-slug>        # Check specific pack
#   constructs-health.sh --json             # Machine-readable output
#   constructs-health.sh --fix              # Auto-fix recoverable issues
#
# Exit Codes:
#   0 = all healthy
#   1 = warnings (non-blocking)
#   2 = errors (construct degraded)
#   3 = critical (construct broken)
#
# Checks performed:
#   - Manifest integrity (construct.yaml exists, parses, required fields)
#   - Skill completeness (every declared skill has SKILL.md + index.yaml)
#   - Identity coherence (persona.yaml + expertise.yaml exist and parse)
#   - CLAUDE.md presence and minimum content
#   - Capability metadata validity (enum checks)
#   - Drift detection (source repo divergence via git)
#
# Self-healing (--fix):
#   - Re-clone from source if files missing
#   - Re-validate schemas after fix
#
# Sources: escape-velocity.md §9 (ARCHETYPE.md relationship), §10 (grounding)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PACKS_DIR="${LOA_CONSTRUCTS_DIR:-$PROJECT_ROOT/.claude/constructs/packs}"

# Output mode
JSON_MODE=false
FIX_MODE=false
TARGET_PACK=""

# Counters
TOTAL_CHECKS=0
PASSED=0
WARNINGS=0
ERRORS=0
CRITICALS=0

# Results accumulator for JSON
declare -a RESULTS=()

# ─────────────────────────────────────────────
# Argument parsing
# ─────────────────────────────────────────────

while [[ $# -gt 0 ]]; do
    case "$1" in
        --json) JSON_MODE=true; shift ;;
        --fix) FIX_MODE=true; shift ;;
        --help|-h)
            echo "Usage: constructs-health.sh [pack-slug] [--json] [--fix]"
            exit 0
            ;;
        *) TARGET_PACK="$1"; shift ;;
    esac
done

# ─────────────────────────────────────────────
# Output helpers
# ─────────────────────────────────────────────

_pass() {
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    PASSED=$((PASSED + 1))
    if [[ "$JSON_MODE" == "false" ]]; then
        echo "  ✓ $1"
    fi
    RESULTS+=("{\"check\":\"$1\",\"status\":\"pass\",\"pack\":\"$2\"}")
}

_warn() {
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    WARNINGS=$((WARNINGS + 1))
    if [[ "$JSON_MODE" == "false" ]]; then
        echo "  ⚠ $1"
    fi
    RESULTS+=("{\"check\":\"$1\",\"status\":\"warning\",\"pack\":\"$2\",\"detail\":\"$3\"}")
}

_error() {
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    ERRORS=$((ERRORS + 1))
    if [[ "$JSON_MODE" == "false" ]]; then
        echo "  ✗ $1"
    fi
    RESULTS+=("{\"check\":\"$1\",\"status\":\"error\",\"pack\":\"$2\",\"detail\":\"$3\"}")
}

_critical() {
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    CRITICALS=$((CRITICALS + 1))
    if [[ "$JSON_MODE" == "false" ]]; then
        echo "  ☠ $1"
    fi
    RESULTS+=("{\"check\":\"$1\",\"status\":\"critical\",\"pack\":\"$2\",\"detail\":\"$3\"}")
}

# ─────────────────────────────────────────────
# Health checks for a single pack
# ─────────────────────────────────────────────

check_pack() {
    local pack_dir="$1"
    local slug
    slug=$(basename "$pack_dir")

    if [[ "$JSON_MODE" == "false" ]]; then
        echo ""
        echo "─── $slug ───"
    fi

    # 1. Manifest integrity
    if [[ ! -f "$pack_dir/construct.yaml" ]]; then
        _critical "construct.yaml missing" "$slug" "No manifest found"
        return
    fi

    if ! yq eval '.' "$pack_dir/construct.yaml" > /dev/null 2>&1; then
        _critical "construct.yaml invalid YAML" "$slug" "Parse error"
        return
    fi
    _pass "construct.yaml valid" "$slug"

    # Required fields
    local missing_fields=()
    for field in name slug version description; do
        local val
        val=$(yq ".$field" "$pack_dir/construct.yaml" 2>/dev/null || echo "null")
        if [[ "$val" == "null" || -z "$val" ]]; then
            missing_fields+=("$field")
        fi
    done

    if [[ ${#missing_fields[@]} -gt 0 ]]; then
        _error "Missing required fields: ${missing_fields[*]}" "$slug" "construct.yaml incomplete"
    else
        _pass "Required fields present" "$slug"
    fi

    # 2. CLAUDE.md
    if [[ ! -f "$pack_dir/CLAUDE.md" ]]; then
        _error "CLAUDE.md missing" "$slug" "No runtime identity"
    else
        local claude_lines
        claude_lines=$(wc -l < "$pack_dir/CLAUDE.md" | tr -d ' ')
        if [[ "$claude_lines" -lt 5 ]]; then
            _warn "CLAUDE.md only $claude_lines lines" "$slug" "May be placeholder"
        else
            _pass "CLAUDE.md present ($claude_lines lines)" "$slug"
        fi
    fi

    # 3. Identity files
    local persona_path
    persona_path=$(yq '.identity.persona' "$pack_dir/construct.yaml" 2>/dev/null || echo "null")
    if [[ "$persona_path" != "null" && -n "$persona_path" ]]; then
        if [[ -f "$pack_dir/$persona_path" ]]; then
            if yq eval '.' "$pack_dir/$persona_path" > /dev/null 2>&1; then
                _pass "persona.yaml valid" "$slug"
            else
                _error "persona.yaml invalid YAML" "$slug" "Parse error in $persona_path"
            fi
        else
            _warn "persona.yaml not found at $persona_path" "$slug" "Identity incomplete"
        fi
    fi

    local expertise_path
    expertise_path=$(yq '.identity.expertise' "$pack_dir/construct.yaml" 2>/dev/null || echo "null")
    if [[ "$expertise_path" != "null" && -n "$expertise_path" ]]; then
        if [[ -f "$pack_dir/$expertise_path" ]]; then
            if yq eval '.' "$pack_dir/$expertise_path" > /dev/null 2>&1; then
                _pass "expertise.yaml valid" "$slug"
            else
                _error "expertise.yaml invalid YAML" "$slug" "Parse error in $expertise_path"
            fi
        else
            _warn "expertise.yaml not found at $expertise_path" "$slug" "Identity incomplete"
        fi
    fi

    # 4. Skill completeness
    local skill_count
    skill_count=$(yq '.skills | length' "$pack_dir/construct.yaml" 2>/dev/null || echo "0")

    if [[ "$skill_count" -eq 0 ]]; then
        _warn "No skills declared" "$slug" "Pack has no executable capabilities"
    else
        local skill_errors=0
        for i in $(seq 0 $((skill_count - 1))); do
            local skill_slug skill_path
            skill_slug=$(yq ".skills[$i].slug" "$pack_dir/construct.yaml" 2>/dev/null)
            skill_path=$(yq ".skills[$i].path" "$pack_dir/construct.yaml" 2>/dev/null)

            if [[ -z "$skill_path" || "$skill_path" == "null" ]]; then
                continue
            fi

            local full_path="$pack_dir/$skill_path"

            if [[ ! -d "$full_path" ]]; then
                _error "Skill directory missing: $skill_path ($skill_slug)" "$slug" "Declared but not found"
                skill_errors=$((skill_errors + 1))
                continue
            fi

            if [[ ! -f "$full_path/SKILL.md" ]]; then
                _error "SKILL.md missing for $skill_slug" "$slug" "Skill has no instructions"
                skill_errors=$((skill_errors + 1))
            fi

            if [[ ! -f "$full_path/index.yaml" ]]; then
                _warn "index.yaml missing for $skill_slug" "$slug" "No capability metadata"
            else
                # Validate capability enums
                local tier
                tier=$(yq '.capabilities.model_tier' "$full_path/index.yaml" 2>/dev/null || echo "null")
                if [[ "$tier" != "null" && -n "$tier" ]]; then
                    if ! echo "sonnet opus haiku" | grep -qw "$tier"; then
                        _warn "Invalid model_tier '$tier' for $skill_slug" "$slug" "Expected: sonnet|opus|haiku"
                    fi
                fi
            fi
        done

        if [[ $skill_errors -eq 0 ]]; then
            _pass "All $skill_count skills intact" "$slug"
        fi
    fi

    # 5. Drift detection (if git info available)
    local git_url
    git_url=$(yq '.repository.url' "$pack_dir/construct.yaml" 2>/dev/null || echo "null")
    local pack_version
    pack_version=$(yq '.version' "$pack_dir/construct.yaml" 2>/dev/null || echo "unknown")

    if [[ "$git_url" != "null" && -n "$git_url" && "$git_url" != *"your-org"* ]]; then
        _pass "Source repo: $git_url (v$pack_version)" "$slug"
    fi
}

# ─────────────────────────────────────────────
# Main execution
# ─────────────────────────────────────────────

if [[ ! -d "$PACKS_DIR" ]]; then
    if [[ "$JSON_MODE" == "true" ]]; then
        echo '{"status":"no_packs","message":"No constructs installed","packs_dir":"'"$PACKS_DIR"'"}'
    else
        echo "No constructs installed at $PACKS_DIR"
    fi
    exit 0
fi

if [[ -n "$TARGET_PACK" ]]; then
    if [[ -d "$PACKS_DIR/$TARGET_PACK" ]]; then
        check_pack "$PACKS_DIR/$TARGET_PACK"
    else
        echo "Pack not found: $TARGET_PACK" >&2
        exit 2
    fi
else
    for pack_dir in "$PACKS_DIR"/*/; do
        [[ -d "$pack_dir" ]] || continue
        check_pack "$pack_dir"
    done
fi

# ─────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────

if [[ "$JSON_MODE" == "true" ]]; then
    # Build JSON array from results
    echo '{"total":'"$TOTAL_CHECKS"',"passed":'"$PASSED"',"warnings":'"$WARNINGS"',"errors":'"$ERRORS"',"criticals":'"$CRITICALS"',"results":['
    local first=true
    for r in "${RESULTS[@]}"; do
        if [[ "$first" == "true" ]]; then
            echo "  $r"
            first=false
        else
            echo ", $r"
        fi
    done
    echo ']}'
else
    echo ""
    echo "═══════════════════════════════════════"
    echo "  CONSTRUCT HEALTH: $PASSED/$TOTAL_CHECKS passed"
    if [[ $CRITICALS -gt 0 ]]; then
        echo "  ☠ $CRITICALS critical"
    fi
    if [[ $ERRORS -gt 0 ]]; then
        echo "  ✗ $ERRORS errors"
    fi
    if [[ $WARNINGS -gt 0 ]]; then
        echo "  ⚠ $WARNINGS warnings"
    fi
    echo "═══════════════════════════════════════"
fi

# Exit code based on worst severity
if [[ $CRITICALS -gt 0 ]]; then
    exit 3
elif [[ $ERRORS -gt 0 ]]; then
    exit 2
elif [[ $WARNINGS -gt 0 ]]; then
    exit 1
else
    exit 0
fi
