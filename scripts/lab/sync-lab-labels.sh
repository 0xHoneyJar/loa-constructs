#!/usr/bin/env bash
# Sync canonical Lab GitHub labels from .github/lab-labels.yaml (#247)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MANIFEST="$REPO_ROOT/.github/lab-labels.yaml"
REPO="${1:-0xHoneyJar/loa-constructs}"

if [[ ! -f "$MANIFEST" ]]; then
  echo "Missing manifest: $MANIFEST" >&2
  exit 1
fi

while IFS= read -r label; do
  [[ -z "$label" ]] && continue
  gh label create "$label" --repo "$REPO" --force 2>/dev/null || \
    gh label create "$label" --repo "$REPO" --color "5319e7" --force
  echo "  synced: $label"
done < <(yq eval '.labels[][]' "$MANIFEST")

echo "Lab labels synced to $REPO"
