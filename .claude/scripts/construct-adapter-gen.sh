#!/usr/bin/env bash
# =============================================================================
# construct-adapter-gen.sh — Construct adapter generator (CLI wrapper)
# =============================================================================
# Cycle: simstim-20260509-aead9136 (Sprint 3)
# PRD: FR-2 (manifest-driven adapter generator)
# SDD: §2.3 (generator architecture)
#
# Bash wrapper around .claude/scripts/lib/adapter-generator.py.
# Reads constructs from .claude/constructs/packs/<slug>/construct.yaml,
# renders .claude/scripts/templates/construct-adapter.template.md,
# writes .claude/agents/construct-<slug>.md.
#
# Usage:
#   construct-adapter-gen.sh                  # generate all (FR-2.6 enforced)
#   construct-adapter-gen.sh --construct X    # generate one
#   construct-adapter-gen.sh --check          # diff-only; exit 1 if any change
#   construct-adapter-gen.sh --force          # bypass FR-2.6 + hand-edit refusal
#   construct-adapter-gen.sh --dry-run        # report what would happen
#   construct-adapter-gen.sh --report         # write .run/adapter-gen/last-run.json
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_ROOT="$(cd "$PROJECT_ROOT/.." && pwd)"
PYTHON_GEN="$PROJECT_ROOT/.claude/scripts/lib/adapter-generator.py"

usage() {
    cat <<EOF
Usage: construct-adapter-gen.sh [options]

Options:
  --construct SLUG    Generate adapter for one construct
  --all               Generate all (default if no --construct)
  --check             Exit 1 if any adapter would change (CI gate)
  --force             Bypass FR-2.6 pilot-first ordering + hand-edit refusal
  --dry-run           Report what would happen, do not write
  --report            Write summary to .run/adapter-gen/last-run.json
  -h, --help          Show this help

Pilot-first ordering (FR-2.6 BINDING):
  Generator refuses to produce adapters for non-pilot constructs unless both
  .claude/agents/construct-artisan.md AND .claude/agents/construct-observer.md
  exist. --force bypasses this check (use only for initial bootstrap).
EOF
}

CONSTRUCT=""
ALL=1
CHECK=0
FORCE=0
DRY_RUN=0
REPORT=0

while [[ $# -gt 0 ]]; do
    case "$1" in
        --construct) CONSTRUCT="$2"; ALL=0; shift 2 ;;
        --all) ALL=1; shift ;;
        --check) CHECK=1; shift ;;
        --force) FORCE=1; shift ;;
        --dry-run) DRY_RUN=1; shift ;;
        --report) REPORT=1; shift ;;
        -h|--help) usage; exit 0 ;;
        *) echo "ERROR: unknown flag '$1'" >&2; usage >&2; exit 1 ;;
    esac
done

# FR-2.6 pilot-first ordering check
if [[ "$ALL" == "1" ]] && [[ "$FORCE" != "1" ]]; then
    PILOT_ARTISAN="$PROJECT_ROOT/.claude/agents/construct-artisan.md"
    PILOT_OBSERVER="$PROJECT_ROOT/.claude/agents/construct-observer.md"
    if [[ ! -f "$PILOT_ARTISAN" ]] || [[ ! -f "$PILOT_OBSERVER" ]]; then
        echo "ERROR: FR-2.6 pilot-first ordering: artisan + observer adapters must exist before generator runs against all constructs." >&2
        echo "       Missing artisan: $([[ ! -f "$PILOT_ARTISAN" ]] && echo "true" || echo "false")" >&2
        echo "       Missing observer: $([[ ! -f "$PILOT_OBSERVER" ]] && echo "true" || echo "false")" >&2
        echo "       Use --force to bypass (initial bootstrap only)." >&2
        exit 1
    fi
fi

PY_ARGS=()
if [[ -n "$CONSTRUCT" ]]; then
    PY_ARGS+=(--slug "$CONSTRUCT")
elif [[ "$ALL" == "1" ]]; then
    PY_ARGS+=(--all)
fi
[[ "$CHECK" == "1" ]] && PY_ARGS+=(--check)
[[ "$FORCE" == "1" ]] && PY_ARGS+=(--force)
[[ "$DRY_RUN" == "1" ]] && PY_ARGS+=(--dry-run)

OUTPUT="$(python3 "$PYTHON_GEN" "${PY_ARGS[@]}" 2>&1)"
EXIT_CODE=$?

if [[ "$REPORT" == "1" ]]; then
    REPORT_DIR="$PROJECT_ROOT/.run/adapter-gen"
    mkdir -p "$REPORT_DIR"
    REPORT_PATH="$REPORT_DIR/last-run.json"
    echo "$OUTPUT" > "$REPORT_PATH"
    echo "[adapter-gen] report: $REPORT_PATH"
fi

echo "$OUTPUT"
exit "$EXIT_CODE"
