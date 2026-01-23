#!/usr/bin/env bash
# Melange Protocol v2 - Label Setup Script
# Creates all required labels for a repository
#
# Usage: ./create-labels.sh OWNER/REPO [CONSTRUCTS...]
# Example: ./create-labels.sh myorg/myrepo sigil loa hivemind

set -euo pipefail

REPO="${1:?Usage: ./create-labels.sh OWNER/REPO [CONSTRUCTS...]}"
shift

# Default constructs if none provided
CONSTRUCTS=("${@:-sigil loa loa-constructs hivemind ruggy}")

echo "Creating Melange labels in $REPO..."

# Type label
gh label create "melange" \
  --repo "$REPO" \
  --color "7B68EE" \
  --description "Melange protocol thread" \
  --force

# Routing labels (to: and from:)
for construct in "${CONSTRUCTS[@]}"; do
  gh label create "to:$construct" \
    --repo "$REPO" \
    --color "0052CC" \
    --description "Addressed to $construct Construct" \
    --force

  gh label create "from:$construct" \
    --repo "$REPO" \
    --color "C5DEF5" \
    --description "Sent by $construct Construct" \
    --force
done

# Impact labels
gh label create "impact:game-changing" \
  --repo "$REPO" \
  --color "B60205" \
  --description "Blocks core workflow" \
  --force

gh label create "impact:important" \
  --repo "$REPO" \
  --color "FBCA04" \
  --description "Significant friction" \
  --force

gh label create "impact:nice-to-have" \
  --repo "$REPO" \
  --color "C2E0C6" \
  --description "Improvement" \
  --force

# Status labels (full lifecycle)
gh label create "status:open" \
  --repo "$REPO" \
  --color "0E8A16" \
  --description "Awaiting response" \
  --force

gh label create "status:accepted" \
  --repo "$REPO" \
  --color "0E8A16" \
  --description "Receiver working on it" \
  --force

gh label create "status:blocked" \
  --repo "$REPO" \
  --color "FBCA04" \
  --description "Waiting on external" \
  --force

gh label create "status:declined" \
  --repo "$REPO" \
  --color "6A737D" \
  --description "Receiver declined" \
  --force

gh label create "status:resolved" \
  --repo "$REPO" \
  --color "6A737D" \
  --description "Completed" \
  --force

gh label create "status:verified" \
  --repo "$REPO" \
  --color "0E8A16" \
  --description "Resolution confirmed by sender" \
  --force

gh label create "status:reopened" \
  --repo "$REPO" \
  --color "FBCA04" \
  --description "Follow-up needed after resolution" \
  --force

# Intent labels
for intent in request ask report; do
  gh label create "intent:$intent" \
    --repo "$REPO" \
    --color "D4C5F9" \
    --description "Intent: $intent" \
    --force
done

echo "✓ Melange labels created in $REPO"
