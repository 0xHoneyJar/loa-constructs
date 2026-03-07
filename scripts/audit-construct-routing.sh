#!/usr/bin/env bash
# audit-construct-routing.sh — Check a construct for routing conventions
# Usage: ./scripts/audit-construct-routing.sh [path-to-construct]
# Run from construct root if no path given.
set -euo pipefail

DIR="${1:-.}"
errors=0
warnings=0

echo "=== Construct Routing Audit ==="
echo "Path: $DIR"
echo ""

# Check construct.yaml exists
if [[ ! -f "$DIR/construct.yaml" ]]; then
  echo "FATAL: No construct.yaml found"
  exit 1
fi

name=$(yq '.name' "$DIR/construct.yaml")
echo "Construct: $name"
echo ""

# --- Commands ---
echo "--- Commands ---"

# Count command files on disk
if [[ -d "$DIR/commands" ]]; then
  cmd_files=$(find "$DIR/commands" -name "*.md" -type f | wc -l | tr -d ' ')
else
  cmd_files=0
fi
cmd_declared=$(yq '.commands // [] | length' "$DIR/construct.yaml" 2>/dev/null || echo "0")

if [[ "$cmd_files" -gt 0 && "$cmd_declared" -eq 0 ]]; then
  echo "ERROR: $cmd_files command file(s) on disk but 0 declared in construct.yaml"
  echo "  The install script uses the commands array to create symlinks."
  echo "  Without it, slash commands never register."
  errors=$((errors + 1))
elif [[ "$cmd_files" -eq 0 && "$cmd_declared" -eq 0 ]]; then
  echo "OK: No commands (skill-only construct — relies on trigger routing)"
else
  echo "OK: $cmd_declared command(s) declared, $cmd_files file(s) on disk"
fi

# Check each command file for frontmatter
if [[ "$cmd_files" -gt 0 ]]; then
  for cmd in "$DIR"/commands/*.md; do
    basename=$(basename "$cmd")
    first_line=$(head -1 "$cmd")
    if [[ "$first_line" != "---" ]]; then
      echo "ERROR: $basename missing YAML frontmatter (first line is '$first_line', expected '---')"
      errors=$((errors + 1))
    else
      has_agent=$(grep -c "^agent:" "$cmd" 2>/dev/null || echo "0")
      has_agent_path=$(grep -c "^agent_path:" "$cmd" 2>/dev/null || echo "0")
      has_context=$(grep -c "^context_files:" "$cmd" 2>/dev/null || echo "0")

      if [[ "$has_agent" -eq 0 ]]; then
        echo "ERROR: $basename missing 'agent:' field in frontmatter"
        errors=$((errors + 1))
      fi
      if [[ "$has_agent_path" -eq 0 ]]; then
        echo "ERROR: $basename missing 'agent_path:' field in frontmatter"
        errors=$((errors + 1))
      fi
      if [[ "$has_context" -eq 0 ]]; then
        echo "WARN: $basename missing 'context_files:' — identity won't auto-load"
        warnings=$((warnings + 1))
      fi
    fi
  done
fi

echo ""

# --- Skills ---
echo "--- Skills ---"

skill_count=$(yq '.skills | length' "$DIR/construct.yaml" 2>/dev/null || echo "0")
echo "Skills declared: $skill_count"

for i in $(seq 0 $((skill_count - 1))); do
  slug=$(yq ".skills[$i].slug" "$DIR/construct.yaml")
  path=$(yq ".skills[$i].path" "$DIR/construct.yaml")
  index="$DIR/$path/index.yaml"

  if [[ ! -f "$index" ]]; then
    echo "ERROR: $slug — index.yaml not found at $index"
    errors=$((errors + 1))
    continue
  fi

  # Check triggers
  has_triggers=$(yq '.triggers | length' "$index" 2>/dev/null || echo "0")
  if [[ "$has_triggers" -eq 0 ]]; then
    echo "WARN: $slug — no triggers (invisible to natural language routing)"
    warnings=$((warnings + 1))
  else
    echo "OK: $slug — $has_triggers trigger(s)"
  fi

  # Check capabilities nesting
  has_caps=$(yq '.capabilities.model_tier' "$index" 2>/dev/null || echo "null")
  flat_tier=$(yq '.model_tier' "$index" 2>/dev/null || echo "null")
  if [[ "$has_caps" == "null" && "$flat_tier" != "null" ]]; then
    echo "WARN: $slug — capabilities at top level (should be nested under 'capabilities:')"
    warnings=$((warnings + 1))
  fi

  # Check description pattern
  desc=$(yq '.description' "$index" 2>/dev/null)
  if [[ "$desc" != *"Use this skill IF"* && "$desc" != *"use this skill"* ]]; then
    echo "INFO: $slug — description doesn't use 'Use this skill IF...' routing pattern"
  fi
done

echo ""

# --- Identity ---
echo "--- Identity ---"

claude_md="$DIR/CLAUDE.md"
if [[ -f "$claude_md" ]]; then
  lines=$(wc -l < "$claude_md" | tr -d ' ')
  echo "OK: CLAUDE.md present ($lines lines)"
else
  echo "ERROR: CLAUDE.md not found"
  errors=$((errors + 1))
fi

narrative=$(find "$DIR/identity" -name "*.md" -type f 2>/dev/null | head -1)
if [[ -n "$narrative" ]]; then
  echo "OK: Identity narrative found: $narrative"
else
  echo "WARN: No identity narrative (.md) in identity/"
  warnings=$((warnings + 1))
fi

echo ""

# --- Summary ---
echo "==========================="
if [[ $errors -eq 0 && $warnings -eq 0 ]]; then
  echo "PASS — no issues found"
elif [[ $errors -eq 0 ]]; then
  echo "PASS with $warnings warning(s)"
else
  echo "FAIL — $errors error(s), $warnings warning(s)"
fi
echo "==========================="

exit $errors
