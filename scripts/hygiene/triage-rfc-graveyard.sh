#!/usr/bin/env bash
# Triage Tier-6 RFC graveyard — close stale unlabeled issues with pointer (#248 hygiene).
set -euo pipefail

REPO="${1:-0xHoneyJar/loa-constructs}"
COMMENT="Triaged 2026-06-30 via four-construct backlog lens (GECKO/MINKOWSKI/SAATY). This RFC has had no activity for 60+ days and no assignee. Closing as stale — reopen or link a new issue if still relevant."

ISSUES=(91 93 103 105 106 110 118 122 126 128 182 183 184 222)

for num in "${ISSUES[@]}"; do
  echo "Closing #$num..."
  gh issue close "$num" --repo "$REPO" --comment "$COMMENT" || echo "  failed #$num"
done

echo "Hygiene sweep complete for ${#ISSUES[@]} issues"
