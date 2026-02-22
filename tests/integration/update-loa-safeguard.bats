#!/usr/bin/env bats
# Integration tests for BUG-331: /update-loa merge must not delete downstream files
#
# When upstream (loa/main) deletes files that exist in downstream projects,
# the Phase 5.3 collateral deletion safeguard must restore non-framework
# files before committing. Framework-zone deletions propagate normally.
#
# Fix: PR #330 (commit cf67cd3) — --no-commit merge + deletion safeguard

setup() {
    BATS_TEST_DIR="$(cd "$(dirname "$BATS_TEST_FILENAME")" && pwd)"
    PROJECT_ROOT="$(cd "$BATS_TEST_DIR/../.." && pwd)"

    # Create isolated temp directory for each test
    export TEST_TMPDIR="${BATS_TMPDIR:-/tmp}/update-loa-safeguard-test-$$"
    mkdir -p "$TEST_TMPDIR"
}

teardown() {
    cd /
    rm -rf "$TEST_TMPDIR"
}

# Helper: create a downstream repo with both framework and project files
create_downstream_repo() {
    local repo="$TEST_TMPDIR/downstream"
    mkdir -p "$repo"
    cd "$repo"
    git init -b main >/dev/null 2>&1
    git config user.email "test@test.com"
    git config user.name "Test"

    # Framework files (owned by upstream)
    mkdir -p .claude/scripts .claude/commands
    printf "framework-script" > .claude/scripts/update.sh
    printf "update-loa-cmd" > .claude/commands/update-loa.md
    printf "1.0.0" > .loa-version.json
    printf "# CLAUDE" > CLAUDE.md

    # Downstream project files (NOT owned by upstream)
    mkdir -p app/routes src/lib grimoires/loa components
    printf "export default function Home() {}" > app/routes/index.tsx
    printf "export const helper = true" > src/lib/utils.ts
    printf "# Notes" > grimoires/loa/NOTES.md
    printf "export function Button() {}" > components/Button.tsx
    printf "downstream-readme" > README.md
    printf "project-config" > .loa.config.yaml

    git add -A >/dev/null 2>&1
    git commit -m "initial downstream" >/dev/null 2>&1

    printf "%s" "$repo"
}

# Helper: create an upstream repo that deletes non-framework files
create_upstream_with_deletions() {
    local upstream="$TEST_TMPDIR/upstream"
    local downstream="$1"

    # Clone downstream as upstream starting point
    git clone "$downstream" "$upstream" >/dev/null 2>&1
    cd "$upstream"
    git config user.email "test@test.com"
    git config user.name "Test"

    # Upstream cleanup: delete project files (simulates cycle-014)
    git rm app/routes/index.tsx >/dev/null 2>&1
    git rm src/lib/utils.ts >/dev/null 2>&1
    git rm grimoires/loa/NOTES.md >/dev/null 2>&1
    git rm components/Button.tsx >/dev/null 2>&1

    # Also update a framework file (should propagate)
    printf "framework-script-v2" > .claude/scripts/update.sh
    git add .claude/scripts/update.sh >/dev/null 2>&1

    git commit -m "cleanup: remove non-framework files from upstream" >/dev/null 2>&1

    printf "%s" "$upstream"
}

# Helper: simulate the Phase 5.3 safeguard logic
# This replicates the fix from PR #330
run_safeguarded_merge() {
    local upstream_path="$1"

    # Add upstream as remote
    git remote add loa "$upstream_path" >/dev/null 2>&1 || git remote set-url loa "$upstream_path" >/dev/null 2>&1
    git fetch loa >/dev/null 2>&1

    # Phase 5: --no-commit --no-ff merge (no-ff prevents fast-forward bypass)
    git merge loa/main --no-commit --no-ff --allow-unrelated-histories >/dev/null 2>&1 || true

    # Phase 5.3: Collateral Deletion Safeguard
    # Framework zone allowlist — deletions in these paths are OK
    local framework_zones=(
        ".claude/"
        ".loa-version.json"
        "CLAUDE.md"
        "PROCESS.md"
        ".gitattributes"
        "INSTALLATION.md"
        ".loa.config.yaml.example"
    )

    local restored=0
    while IFS= read -r deleted_file; do
        [ -z "$deleted_file" ] && continue

        local is_framework=false
        for zone in "${framework_zones[@]}"; do
            if [[ "$deleted_file" == ${zone}* ]]; then
                is_framework=true
                break
            fi
        done

        if [ "$is_framework" = false ]; then
            # Restore non-framework file from HEAD (pre-merge)
            git checkout HEAD -- "$deleted_file" >/dev/null 2>&1 && ((restored++)) || true
        fi
    done < <(git diff --cached --diff-filter=D --name-only 2>/dev/null)

    # Commit the safeguarded merge
    git commit -m "merge upstream with safeguard (restored $restored files)" --no-edit >/dev/null 2>&1 || true

    printf "%d" "$restored"
}

# ============================================================
# Test: Upstream deletes downstream file → safeguard restores it
# ============================================================

@test "BUG-331: upstream deletes downstream file — safeguard restores it" {
    local downstream
    downstream=$(create_downstream_repo)
    cd "$downstream"

    local upstream
    upstream=$(create_upstream_with_deletions "$downstream")

    # Run the safeguarded merge
    local restored
    restored=$(run_safeguarded_merge "$upstream")

    # Non-framework files must be restored
    [ -f app/routes/index.tsx ]
    [ -f src/lib/utils.ts ]
    [ -f grimoires/loa/NOTES.md ]
    [ -f components/Button.tsx ]

    # Content preserved
    [ "$(cat app/routes/index.tsx)" = "export default function Home() {}" ]
    [ "$(cat src/lib/utils.ts)" = "export const helper = true" ]

    # Should have restored 4 files
    [ "$restored" -eq 4 ]
}

# ============================================================
# Test: Upstream deletes framework file → deletion propagates
# ============================================================

@test "BUG-331: upstream deletes framework file — deletion propagates (allowlisted)" {
    local downstream
    downstream=$(create_downstream_repo)
    cd "$downstream"

    # Create upstream that deletes a framework file
    local upstream="$TEST_TMPDIR/upstream-fw"
    git clone "$downstream" "$upstream" >/dev/null 2>&1
    cd "$upstream"
    git config user.email "test@test.com"
    git config user.name "Test"
    git rm .claude/commands/update-loa.md >/dev/null 2>&1
    git commit -m "remove old command" >/dev/null 2>&1

    cd "$downstream"
    local restored
    restored=$(run_safeguarded_merge "$upstream")

    # Framework deletion should propagate (NOT restored)
    [ ! -f .claude/commands/update-loa.md ]

    # No files should have been restored
    [ "$restored" -eq 0 ]
}

# ============================================================
# Test: Mixed deletions → only non-framework restored
# ============================================================

@test "BUG-331: mixed deletions — only non-framework files restored" {
    local downstream
    downstream=$(create_downstream_repo)
    cd "$downstream"

    # Create upstream that deletes both framework and project files
    local upstream="$TEST_TMPDIR/upstream-mixed"
    git clone "$downstream" "$upstream" >/dev/null 2>&1
    cd "$upstream"
    git config user.email "test@test.com"
    git config user.name "Test"
    git rm .claude/commands/update-loa.md >/dev/null 2>&1    # framework — should propagate
    git rm app/routes/index.tsx >/dev/null 2>&1              # project — should be restored
    git rm components/Button.tsx >/dev/null 2>&1             # project — should be restored
    git commit -m "mixed cleanup" >/dev/null 2>&1

    cd "$downstream"
    local restored
    restored=$(run_safeguarded_merge "$upstream")

    # Framework deletion propagated
    [ ! -f .claude/commands/update-loa.md ]

    # Project files restored
    [ -f app/routes/index.tsx ]
    [ -f components/Button.tsx ]

    # Exactly 2 restored
    [ "$restored" -eq 2 ]
}

# ============================================================
# Test: No deletions → safeguard is a no-op
# ============================================================

@test "BUG-331: no deletions — safeguard is a no-op" {
    local downstream
    downstream=$(create_downstream_repo)
    cd "$downstream"

    # Create upstream that only adds/modifies (no deletions)
    local upstream="$TEST_TMPDIR/upstream-noop"
    git clone "$downstream" "$upstream" >/dev/null 2>&1
    cd "$upstream"
    git config user.email "test@test.com"
    git config user.name "Test"
    printf "framework-script-v2" > .claude/scripts/update.sh
    git add .claude/scripts/update.sh >/dev/null 2>&1
    git commit -m "update framework only" >/dev/null 2>&1

    cd "$downstream"
    local restored
    restored=$(run_safeguarded_merge "$upstream")

    # All files still present
    [ -f app/routes/index.tsx ]
    [ -f src/lib/utils.ts ]
    [ -f components/Button.tsx ]

    # Framework file updated
    [ "$(cat .claude/scripts/update.sh)" = "framework-script-v2" ]

    # Nothing restored (no deletions)
    [ "$restored" -eq 0 ]
}

# ============================================================
# Test: File only exists downstream → unaffected by merge
# ============================================================

@test "BUG-331: file only exists downstream — unaffected by merge" {
    local downstream
    downstream=$(create_downstream_repo)
    cd "$downstream"

    # Add a file that never existed in upstream
    printf "downstream-only" > app/routes/dashboard.tsx
    git add app/routes/dashboard.tsx >/dev/null 2>&1
    git commit -m "add downstream-only file" >/dev/null 2>&1

    # Create upstream from original (doesn't have dashboard.tsx)
    local upstream="$TEST_TMPDIR/upstream-nofile"
    git clone "$downstream" "$upstream" >/dev/null 2>&1
    cd "$upstream"
    git config user.email "test@test.com"
    git config user.name "Test"
    # Remove the downstream-only file to simulate it never existing upstream
    git rm app/routes/dashboard.tsx >/dev/null 2>&1
    git commit -m "clean upstream" >/dev/null 2>&1
    # Now add a framework change to create a merge target
    printf "framework-v2" > .claude/scripts/update.sh
    git add .claude/scripts/update.sh >/dev/null 2>&1
    git commit -m "framework update" >/dev/null 2>&1

    cd "$downstream"
    local restored
    restored=$(run_safeguarded_merge "$upstream")

    # Downstream-only file must survive
    [ -f app/routes/dashboard.tsx ]
    [ "$(cat app/routes/dashboard.tsx)" = "downstream-only" ]
}
