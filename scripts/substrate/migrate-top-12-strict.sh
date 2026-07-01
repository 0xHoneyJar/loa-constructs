#!/usr/bin/env bash
# Validate strict-tier migration for top-12 packs from local GitHub clones (#227).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
VALIDATE="$REPO_ROOT/.claude/scripts/construct-validate.sh"
MIGRATE="$SCRIPT_DIR/migrate-strict-manifest.py"
SEARCH_ROOT="${CONSTRUCTS_LOCAL_ROOT:-$HOME/Documents/GitHub}"

PACKS=(artisan observer protocol beacon mibera-codex k-hole the-easel gecko crucible hardening kansei showcase)

pass=0
fail=0

for slug in "${PACKS[@]}"; do
  dir="$SEARCH_ROOT/construct-$slug"
  if [[ ! -d "$dir/construct.yaml" && -d "$SEARCH_ROOT/$slug/construct.yaml" ]]; then
    dir="$SEARCH_ROOT/$slug"
  fi
  if [[ ! -f "$dir/construct.yaml" ]]; then
    echo "SKIP $slug (no local clone at $dir)"
    continue
  fi
  echo "==> $slug ($dir)"
  python3 "$MIGRATE" "$dir"
  if "$VALIDATE" "$dir" --strict; then
    pass=$((pass + 1))
  else
    fail=$((fail + 1))
  fi
done

echo ""
echo "strict validation: $pass passed, $fail failed"
[[ $fail -eq 0 ]]
