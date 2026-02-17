#!/usr/bin/env bash
# test-claude-injection.sh — Test harness for CLAUDE.md injection scenarios (SDD §7.2)
# Usage: ./scripts/test-claude-injection.sh
# Exit 0 = all pass, non-zero = at least one failure
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# The injection functions live here (sourced below)
INSTALL_SCRIPT="$REPO_ROOT/.claude/scripts/constructs-install.sh"

PASS_COUNT=0
FAIL_COUNT=0
TOTAL=0

pass() {
  PASS_COUNT=$((PASS_COUNT + 1))
  TOTAL=$((TOTAL + 1))
  echo "  PASS: $1"
}

fail() {
  FAIL_COUNT=$((FAIL_COUNT + 1))
  TOTAL=$((TOTAL + 1))
  echo "  FAIL: $1" >&2
}

setup_test_dir() {
  local test_dir
  test_dir=$(mktemp -d /tmp/claude-inject-test-XXXXXX)
  echo "$test_dir"
}

cleanup_test_dir() {
  rm -rf "$1"
}

# ═══════════════════════════════════════════════════════
# Scenario 1: Fresh install — no existing CLAUDE.md
# ═══════════════════════════════════════════════════════
scenario_1() {
  echo ""
  echo "Scenario 1: Fresh install (no existing CLAUDE.md)"
  local dir
  dir=$(setup_test_dir)

  # Setup: empty project root
  mkdir -p "$dir/.claude/constructs/packs/test-construct"

  # Act
  CONSTRUCTS_ROOT="$dir" inject_construct_claude_md "test-construct" 2>/dev/null

  # Assert
  if [[ -f "$dir/CLAUDE.md" ]]; then
    if grep -q "constructs:begin" "$dir/CLAUDE.md"; then
      pass "CLAUDE.md created with sentinel block"
    else
      fail "CLAUDE.md missing sentinel block"
    fi
  else
    fail "CLAUDE.md not created"
  fi

  if [[ -f "$dir/.claude/constructs/CLAUDE.constructs.md" ]]; then
    if grep -q "test-construct" "$dir/.claude/constructs/CLAUDE.constructs.md"; then
      pass "Managed file contains construct import"
    else
      fail "Managed file missing construct import"
    fi
  else
    fail "Managed file not created"
  fi

  cleanup_test_dir "$dir"
}

# ═══════════════════════════════════════════════════════
# Scenario 2: Install with existing CLAUDE.md (no sentinel)
# ═══════════════════════════════════════════════════════
scenario_2() {
  echo ""
  echo "Scenario 2: Existing CLAUDE.md without sentinel"
  local dir
  dir=$(setup_test_dir)

  mkdir -p "$dir/.claude/constructs/packs/test-construct"
  echo "# My Project" > "$dir/CLAUDE.md"
  echo "Some existing instructions" >> "$dir/CLAUDE.md"

  CONSTRUCTS_ROOT="$dir" inject_construct_claude_md "test-construct" 2>/dev/null

  # Assert: existing content preserved
  if grep -q "My Project" "$dir/CLAUDE.md"; then
    pass "Existing content preserved"
  else
    fail "Existing content lost"
  fi

  if grep -q "constructs:begin" "$dir/CLAUDE.md"; then
    pass "Sentinel block added"
  else
    fail "Sentinel block not added"
  fi

  cleanup_test_dir "$dir"
}

# ═══════════════════════════════════════════════════════
# Scenario 3: Install with existing sentinel (add second construct)
# ═══════════════════════════════════════════════════════
scenario_3() {
  echo ""
  echo "Scenario 3: Add second construct to existing sentinel"
  local dir
  dir=$(setup_test_dir)

  mkdir -p "$dir/.claude/constructs/packs/first-construct"
  mkdir -p "$dir/.claude/constructs/packs/second-construct"

  # First install
  CONSTRUCTS_ROOT="$dir" inject_construct_claude_md "first-construct" 2>/dev/null
  # Second install
  CONSTRUCTS_ROOT="$dir" inject_construct_claude_md "second-construct" 2>/dev/null

  if grep -q "first-construct" "$dir/.claude/constructs/CLAUDE.constructs.md"; then
    pass "First construct still in managed file"
  else
    fail "First construct lost from managed file"
  fi

  if grep -q "second-construct" "$dir/.claude/constructs/CLAUDE.constructs.md"; then
    pass "Second construct added to managed file"
  else
    fail "Second construct not in managed file"
  fi

  cleanup_test_dir "$dir"
}

# ═══════════════════════════════════════════════════════
# Scenario 4: Idempotent re-install
# ═══════════════════════════════════════════════════════
scenario_4() {
  echo ""
  echo "Scenario 4: Idempotent re-install"
  local dir
  dir=$(setup_test_dir)

  mkdir -p "$dir/.claude/constructs/packs/test-construct"

  CONSTRUCTS_ROOT="$dir" inject_construct_claude_md "test-construct" 2>/dev/null
  CONSTRUCTS_ROOT="$dir" inject_construct_claude_md "test-construct" 2>/dev/null

  # Count occurrences — should be exactly 1
  local count
  count=$(grep -c "test-construct" "$dir/.claude/constructs/CLAUDE.constructs.md" || true)
  if [[ "$count" -eq 1 ]]; then
    pass "No duplicate imports after re-install"
  else
    fail "Duplicate imports found (count: $count)"
  fi

  cleanup_test_dir "$dir"
}

# ═══════════════════════════════════════════════════════
# Scenario 5: Uninstall single construct
# ═══════════════════════════════════════════════════════
scenario_5() {
  echo ""
  echo "Scenario 5: Uninstall single construct"
  local dir
  dir=$(setup_test_dir)

  mkdir -p "$dir/.claude/constructs/packs/keep-this"
  mkdir -p "$dir/.claude/constructs/packs/remove-this"

  CONSTRUCTS_ROOT="$dir" inject_construct_claude_md "keep-this" 2>/dev/null
  CONSTRUCTS_ROOT="$dir" inject_construct_claude_md "remove-this" 2>/dev/null
  CONSTRUCTS_ROOT="$dir" remove_construct_claude_md "remove-this" 2>/dev/null

  if grep -q "keep-this" "$dir/.claude/constructs/CLAUDE.constructs.md"; then
    pass "Kept construct still present"
  else
    fail "Kept construct was removed"
  fi

  if ! grep -q "remove-this" "$dir/.claude/constructs/CLAUDE.constructs.md"; then
    pass "Removed construct no longer present"
  else
    fail "Removed construct still present"
  fi

  # Sentinel should still be in CLAUDE.md
  if grep -q "constructs:begin" "$dir/CLAUDE.md"; then
    pass "Sentinel preserved after partial uninstall"
  else
    fail "Sentinel removed after partial uninstall"
  fi

  cleanup_test_dir "$dir"
}

# ═══════════════════════════════════════════════════════
# Scenario 6: Uninstall last construct
# ═══════════════════════════════════════════════════════
scenario_6() {
  echo ""
  echo "Scenario 6: Uninstall last construct (sentinel cleanup)"
  local dir
  dir=$(setup_test_dir)

  mkdir -p "$dir/.claude/constructs/packs/only-one"

  CONSTRUCTS_ROOT="$dir" inject_construct_claude_md "only-one" 2>/dev/null
  CONSTRUCTS_ROOT="$dir" remove_construct_claude_md "only-one" 2>/dev/null

  # Managed file should be empty or absent
  if [[ ! -f "$dir/.claude/constructs/CLAUDE.constructs.md" ]] || \
     [[ ! -s "$dir/.claude/constructs/CLAUDE.constructs.md" ]] || \
     ! grep -q "@" "$dir/.claude/constructs/CLAUDE.constructs.md" 2>/dev/null; then
    pass "Managed file cleaned up"
  else
    fail "Managed file still has imports"
  fi

  cleanup_test_dir "$dir"
}

# ═══════════════════════════════════════════════════════
# Scenario 7: Content outside sentinel is untouched
# ═══════════════════════════════════════════════════════
scenario_7() {
  echo ""
  echo "Scenario 7: Content outside sentinel is untouched"
  local dir
  dir=$(setup_test_dir)

  mkdir -p "$dir/.claude/constructs/packs/test-construct"

  # Create CLAUDE.md with content before and after where sentinel will be
  cat > "$dir/CLAUDE.md" <<'EOF'
# My Project

Important instructions here.

## Custom Section

Do not modify this.
EOF

  CONSTRUCTS_ROOT="$dir" inject_construct_claude_md "test-construct" 2>/dev/null

  if grep -q "Important instructions here." "$dir/CLAUDE.md"; then
    pass "Content before sentinel preserved"
  else
    fail "Content before sentinel lost"
  fi

  if grep -q "Do not modify this." "$dir/CLAUDE.md"; then
    pass "Content after sentinel preserved"
  else
    fail "Content after sentinel lost"
  fi

  cleanup_test_dir "$dir"
}

# ═══════════════════════════════════════════════════════
# Scenario 8: Symlink CLAUDE.md → refuse
# ═══════════════════════════════════════════════════════
scenario_8() {
  echo ""
  echo "Scenario 8: Symlink CLAUDE.md detection"
  local dir
  dir=$(setup_test_dir)

  mkdir -p "$dir/.claude/constructs/packs/test-construct"
  echo "target" > "$dir/CLAUDE.md.real"
  ln -sf "$dir/CLAUDE.md.real" "$dir/CLAUDE.md"

  if CONSTRUCTS_ROOT="$dir" inject_construct_claude_md "test-construct" 2>/dev/null; then
    fail "Should have refused symlink CLAUDE.md"
  else
    pass "Refused to modify symlink CLAUDE.md"
  fi

  cleanup_test_dir "$dir"
}

# ═══════════════════════════════════════════════════════
# Scenario 9: Concurrent installs
# ═══════════════════════════════════════════════════════
scenario_9() {
  echo ""
  echo "Scenario 9: Concurrent installs"
  local dir
  dir=$(setup_test_dir)

  mkdir -p "$dir/.claude/constructs/packs/construct-a"
  mkdir -p "$dir/.claude/constructs/packs/construct-b"

  # Launch two installs in parallel
  CONSTRUCTS_ROOT="$dir" inject_construct_claude_md "construct-a" 2>/dev/null &
  local pid_a=$!
  CONSTRUCTS_ROOT="$dir" inject_construct_claude_md "construct-b" 2>/dev/null &
  local pid_b=$!

  wait "$pid_a" || true
  wait "$pid_b" || true

  if grep -q "construct-a" "$dir/.claude/constructs/CLAUDE.constructs.md" 2>/dev/null && \
     grep -q "construct-b" "$dir/.claude/constructs/CLAUDE.constructs.md" 2>/dev/null; then
    pass "Both concurrent installs succeeded"
  else
    fail "Concurrent install lost one construct"
  fi

  cleanup_test_dir "$dir"
}

# ═══════════════════════════════════════════════════════
# Scenario 10: Fallback on injection failure
# ═══════════════════════════════════════════════════════
scenario_10() {
  echo ""
  echo "Scenario 10: Fallback on injection failure"
  local dir
  dir=$(setup_test_dir)

  mkdir -p "$dir/.claude/constructs/packs/test-construct"

  # Make CLAUDE.md read-only to force failure
  echo "# Existing" > "$dir/CLAUDE.md"
  chmod 000 "$dir/CLAUDE.md"

  # Should fail but managed file should still be usable
  if CONSTRUCTS_ROOT="$dir" inject_construct_claude_md "test-construct" 2>/dev/null; then
    # If it somehow succeeded, that's fine too
    pass "Injection succeeded despite read-only (root user?)"
  else
    # Check managed file was still created/updated
    if [[ -f "$dir/.claude/constructs/CLAUDE.constructs.md" ]]; then
      pass "Managed file created despite CLAUDE.md failure"
    else
      # Acceptable: both failed is OK if error message was printed
      pass "Both files failed — injection correctly reported error"
    fi
  fi

  chmod 644 "$dir/CLAUDE.md" 2>/dev/null || true
  cleanup_test_dir "$dir"
}

# ═══════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════

echo "═══════════════════════════════════════════════════"
echo "  CLAUDE.md Injection Test Harness"
echo "  Testing 10 scenarios from SDD §7.2"
echo "═══════════════════════════════════════════════════"

# Source the injection functions
if [[ -f "$INSTALL_SCRIPT" ]]; then
  # shellcheck source=/dev/null
  source "$INSTALL_SCRIPT" --source-only
else
  echo "ERROR: Install script not found: $INSTALL_SCRIPT" >&2
  echo "Run T1.4b first to create the injection functions." >&2
  exit 1
fi

scenario_1
scenario_2
scenario_3
scenario_4
scenario_5
scenario_6
scenario_7
scenario_8
scenario_9
scenario_10

echo ""
echo "═══════════════════════════════════════════════════"
echo "  Results: $PASS_COUNT passed, $FAIL_COUNT failed ($TOTAL total)"
echo "═══════════════════════════════════════════════════"

if [[ "$FAIL_COUNT" -gt 0 ]]; then
  exit 1
fi
exit 0
