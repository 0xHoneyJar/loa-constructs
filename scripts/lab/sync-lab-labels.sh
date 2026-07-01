#!/usr/bin/env bash
# Sync canonical colon-form Lab GitHub labels from .github/lab-labels.yaml (#247).
# Aligned with loa-freeside/tools/hivemind/label-setup.sh (ratified 2026-06-01).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MANIFEST="$REPO_ROOT/.github/lab-labels.yaml"
REPO="${1:-0xHoneyJar/loa-constructs}"

if [[ ! -f "$MANIFEST" ]]; then
  echo "Missing manifest: $MANIFEST" >&2
  exit 1
fi

if ! command -v yq >/dev/null 2>&1; then
  echo "yq required to read $MANIFEST" >&2
  exit 1
fi

n=0
while IFS=$'\t' read -r name color; do
  [[ -z "$name" ]] && continue
  gh label create "$name" --repo "$REPO" --color "$color" \
    --description "hivemind taxonomy" --force
  echo "  synced: $name"
  n=$((n + 1))
done < <(yq eval '.labels[][] | [.name, .color] | @tsv' "$MANIFEST")

echo "Lab labels synced to $REPO ($n labels)"
