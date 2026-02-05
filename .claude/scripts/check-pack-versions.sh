#!/usr/bin/env bash
# =============================================================================
# check-pack-versions.sh - Enforce version bumps when pack content changes
# =============================================================================
# Usage:
#   check-pack-versions.sh [BASE_REF]        # Default: origin/main
#   check-pack-versions.sh --json [BASE_REF]  # JSON output
#
# Exits 0 if all packs are consistent, 1 if any violations found.

set -euo pipefail

PACKS_DIR="apps/sandbox/packs"
BASE_REF="${1:-origin/main}"
JSON_MODE=false

if [[ "${1:-}" == "--json" ]]; then
  JSON_MODE=true
  BASE_REF="${2:-origin/main}"
fi

VIOLATIONS=()
PASSED=()
SKIPPED=()

for pack_dir in "$PACKS_DIR"/*/; do
  [[ -d "$pack_dir" ]] || continue
  pack_name=$(basename "$pack_dir")
  manifest="$pack_dir/manifest.json"

  [[ -f "$manifest" ]] || { SKIPPED+=("$pack_name:no-manifest"); continue; }

  # Check if any non-CHANGELOG content changed
  changed_files=$(git diff --name-only "$BASE_REF" -- "$pack_dir" 2>/dev/null | grep -v "CHANGELOG.md" || true)

  if [[ -z "$changed_files" ]]; then
    SKIPPED+=("$pack_name:no-changes")
    continue
  fi

  # Get current version
  current_version=$(jq -r '.version // "0.0.0"' "$manifest")

  # Get base version (handle new packs gracefully)
  base_version=$(git show "$BASE_REF:$manifest" 2>/dev/null | jq -r '.version // "0.0.0"' 2>/dev/null || echo "NEW_PACK")

  if [[ "$base_version" == "NEW_PACK" ]]; then
    PASSED+=("$pack_name:new-pack:$current_version")
    continue
  fi

  if [[ "$current_version" == "$base_version" ]]; then
    VIOLATIONS+=("$pack_name:version-not-bumped:$current_version")
    if [[ "$JSON_MODE" == false ]]; then
      echo "ERROR: Pack '$pack_name' has content changes but version not bumped ($current_version)"
      echo "  Changed files:"
      echo "$changed_files" | sed 's/^/    /'
    fi
    continue
  fi

  # Version was bumped — check for changelog entry
  changelog="$pack_dir/CHANGELOG.md"
  if [[ ! -f "$changelog" ]]; then
    VIOLATIONS+=("$pack_name:no-changelog")
    if [[ "$JSON_MODE" == false ]]; then
      echo "ERROR: Pack '$pack_name' bumped to $current_version but has no CHANGELOG.md"
    fi
    continue
  fi

  if ! grep -q "## \[$current_version\]" "$changelog"; then
    VIOLATIONS+=("$pack_name:missing-changelog-entry:$current_version")
    if [[ "$JSON_MODE" == false ]]; then
      echo "ERROR: Pack '$pack_name' bumped to $current_version but CHANGELOG.md has no entry for it"
    fi
    continue
  fi

  PASSED+=("$pack_name:$base_version->$current_version")
done

# Output
if [[ "$JSON_MODE" == true ]]; then
  echo "{"
  echo "  \"base_ref\": \"$BASE_REF\","
  echo "  \"violations\": $(printf '%s\n' "${VIOLATIONS[@]:-}" | jq -R . | jq -s .),"
  echo "  \"passed\": $(printf '%s\n' "${PASSED[@]:-}" | jq -R . | jq -s .),"
  echo "  \"skipped\": $(printf '%s\n' "${SKIPPED[@]:-}" | jq -R . | jq -s .),"
  echo "  \"success\": $([ ${#VIOLATIONS[@]} -eq 0 ] && echo true || echo false)"
  echo "}"
else
  echo ""
  echo "Pack Version Check Summary (base: $BASE_REF)"
  echo "============================================="
  [[ ${#PASSED[@]} -gt 0 ]] && echo "  PASSED:  ${PASSED[*]}"
  [[ ${#SKIPPED[@]} -gt 0 ]] && echo "  SKIPPED: ${SKIPPED[*]}"
  [[ ${#VIOLATIONS[@]} -gt 0 ]] && echo "  FAILED:  ${VIOLATIONS[*]}"
  echo ""
fi

if [[ ${#VIOLATIONS[@]} -gt 0 ]]; then
  exit 1
fi

echo "All pack versions are consistent."
exit 0
