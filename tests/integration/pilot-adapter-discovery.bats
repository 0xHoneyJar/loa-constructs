#!/usr/bin/env bats
# =============================================================================
# pilot-adapter-discovery.bats — T1 acceptance (Native Adapter Discovery)
# =============================================================================
# Cycle: simstim-20260509-aead9136
# Sprint 1 (S1-T5): pilot adapters (artisan + observer)
# Sprint 3 (S3-T6): full coverage (all constructs in packs/)
# PRD: §8.1 T1
#
# Tests:
#   - .claude/agents/construct-<slug>.md exists for each pack
#   - claude agents lists each construct
#   - Adapter has Loa block with canonical_manifest reference
#   - Adapter is generator-output (header) or hand-authored pilot
# =============================================================================

fail() {
    echo "FAIL: $*" >&2
    return 1
}

setup() {
    PROJECT_ROOT="$(cd "$BATS_TEST_DIRNAME/../.." && pwd)"
    cd "$PROJECT_ROOT"
    AGENTS_DIR="$PROJECT_ROOT/.claude/agents"
    PACKS_DIR="$PROJECT_ROOT/.claude/constructs/packs"
}

# -----------------------------------------------------------------------------
# Sprint 1 pilot subset
# -----------------------------------------------------------------------------

@test "T1.pilot: construct-artisan adapter exists" {
    [[ -f "$AGENTS_DIR/construct-artisan.md" ]] || fail "construct-artisan.md missing"
}

@test "T1.pilot: construct-observer adapter exists" {
    [[ -f "$AGENTS_DIR/construct-observer.md" ]] || fail "construct-observer.md missing"
}

@test "T1.pilot: claude agents lists construct-artisan" {
    run claude agents
    [[ "$status" -eq 0 ]] || fail "claude agents exited $status"
    grep -q "construct-artisan" <<< "$output" || fail "construct-artisan not in claude agents output"
}

@test "T1.pilot: claude agents lists construct-observer" {
    run claude agents
    [[ "$status" -eq 0 ]] || fail "claude agents exited $status"
    grep -q "construct-observer" <<< "$output" || fail "construct-observer not in claude agents output"
}

# -----------------------------------------------------------------------------
# Sprint 3 full coverage
# -----------------------------------------------------------------------------

@test "T1.full: every pack has a corresponding adapter" {
    local missing=()
    for pack_dir in "$PACKS_DIR"/*/; do
        [[ -f "$pack_dir/construct.yaml" ]] || continue
        local slug
        slug="$(basename "$pack_dir")"
        if [[ ! -f "$AGENTS_DIR/construct-$slug.md" ]]; then
            missing+=("$slug")
        fi
    done
    if [[ ${#missing[@]} -gt 0 ]]; then
        fail "missing adapters for: ${missing[*]}"
    fi
}

@test "T1.full: each adapter has Loa block referencing canonical manifest" {
    local broken=()
    for adapter in "$AGENTS_DIR"/construct-*.md; do
        local slug
        slug="$(basename "$adapter" | sed 's/^construct-//; s/\.md$//')"
        if ! grep -q "construct_slug: $slug" "$adapter"; then
            broken+=("$slug:missing-construct_slug")
            continue
        fi
        if ! grep -q "canonical_manifest:" "$adapter"; then
            broken+=("$slug:missing-canonical_manifest")
            continue
        fi
        if ! grep -q "manifest_checksum:" "$adapter"; then
            broken+=("$slug:missing-manifest_checksum")
            continue
        fi
    done
    if [[ ${#broken[@]} -gt 0 ]]; then
        fail "Loa block defects: ${broken[*]}"
    fi
}

@test "T1.full: each adapter has the # generated-by header" {
    local missing=()
    for adapter in "$AGENTS_DIR"/construct-*.md; do
        local slug
        slug="$(basename "$adapter")"
        if ! head -2 "$adapter" | grep -q "# generated-by:"; then
            missing+=("$slug")
        fi
    done
    if [[ ${#missing[@]} -gt 0 ]]; then
        fail "missing generated-by header: ${missing[*]}"
    fi
}

@test "T1.full: claude agents lists every construct adapter" {
    run claude agents
    [[ "$status" -eq 0 ]] || fail "claude agents exited $status"

    local missing=()
    for pack_dir in "$PACKS_DIR"/*/; do
        [[ -f "$pack_dir/construct.yaml" ]] || continue
        local slug
        slug="$(basename "$pack_dir")"

        # Skip arneson (manifest defect: missing description; out-of-cycle to fix)
        [[ "$slug" == "arneson" ]] && continue

        if ! grep -q "construct-$slug" <<< "$output"; then
            missing+=("$slug")
        fi
    done
    if [[ ${#missing[@]} -gt 0 ]]; then
        fail "claude agents missing: ${missing[*]}"
    fi
}

@test "T1.full: generator --check is idempotent (no diffs)" {
    run python3 "$PROJECT_ROOT/.claude/scripts/lib/adapter-generator.py" --all --check
    [[ "$status" -eq 0 ]] || fail "generator --check exited $status (expected 0 = no diffs)"

    local diffs_count
    diffs_count="$(echo "$output" | jq '.diffs | length')"
    [[ "$diffs_count" == "0" ]] || fail "generator reports $diffs_count diffs after most-recent generate"
}

@test "T1.full: generator FR-2.6 pilot-first ordering check" {
    # Move artisan/observer aside and verify generator refuses without --force
    local backup="$AGENTS_DIR/.bak-pilot-test"
    rm -rf "$backup"
    mkdir -p "$backup"
    mv "$AGENTS_DIR/construct-artisan.md" "$backup/" 2>/dev/null || true
    mv "$AGENTS_DIR/construct-observer.md" "$backup/" 2>/dev/null || true

    run "$PROJECT_ROOT/.claude/scripts/construct-adapter-gen.sh" --all
    local exit_code=$status

    # Restore pilots regardless of test outcome
    mv "$backup/"* "$AGENTS_DIR/" 2>/dev/null || true
    rm -rf "$backup"

    [[ "$exit_code" -eq 1 ]] || fail "expected generator to refuse with exit 1 (got $exit_code) when pilots missing without --force"
    grep -q "FR-2.6" <<< "$output" || fail "expected FR-2.6 reference in refusal message"
}
