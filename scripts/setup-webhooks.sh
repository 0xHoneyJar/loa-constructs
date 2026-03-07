#!/usr/bin/env bash
# setup-webhooks.sh — Configure a single org-level GitHub webhook
#
# One webhook on the org catches pushes to ALL construct-* repos.
# The API's POST /v1/webhooks/github handler already filters by
# matching github_repo_id or git_url — no per-repo config needed.
#
# Prerequisites:
#   - gh CLI authenticated with org admin access
#   - GITHUB_WEBHOOK_SECRET env var (must match API server config)
#
# Usage:
#   GITHUB_WEBHOOK_SECRET="your-secret" bash scripts/setup-webhooks.sh
#   GITHUB_WEBHOOK_SECRET="your-secret" bash scripts/setup-webhooks.sh --dry-run

set -euo pipefail

ORG="${CONSTRUCTS_ORG:-0xHoneyJar}"
WEBHOOK_URL="${CONSTRUCTS_WEBHOOK_URL:-https://api.constructs.network/v1/webhooks/github}"
SECRET="${GITHUB_WEBHOOK_SECRET:-}"
DRY_RUN=false

if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
fi

if [[ -z "$SECRET" && "$DRY_RUN" == "false" ]]; then
  echo "ERROR: GITHUB_WEBHOOK_SECRET is required (must match API server)"
  echo "Usage: GITHUB_WEBHOOK_SECRET=\"...\" bash scripts/setup-webhooks.sh"
  exit 1
fi

echo "Checking org-level webhook for ${ORG}..."
echo ""

# Check if org webhook already exists
existing=$(gh api "orgs/${ORG}/hooks" --jq "[.[] | select(.config.url == \"${WEBHOOK_URL}\")] | length" 2>/dev/null || echo "0")

if [[ "$existing" -gt 0 ]]; then
  echo "Org webhook already exists pointing to ${WEBHOOK_URL}"
  echo ""

  # Show details
  gh api "orgs/${ORG}/hooks" --jq ".[] | select(.config.url == \"${WEBHOOK_URL}\") | \"  ID: \(.id)\n  Active: \(.active)\n  Events: \(.events | join(\", \"))\n  Created: \(.created_at)\"" 2>/dev/null
  echo ""
  echo "Nothing to do. All construct-* repo pushes already route to the API."
  exit 0
fi

if [[ "$DRY_RUN" == "true" ]]; then
  echo "WOULD CREATE org webhook:"
  echo "  Org:    ${ORG}"
  echo "  URL:    ${WEBHOOK_URL}"
  echo "  Events: push"
  echo ""
  echo "(dry run — no webhook created)"
  exit 0
fi

# Create org-level webhook
echo "Creating org-level webhook..."
if gh api "orgs/${ORG}/hooks" \
  --method POST \
  --field "name=web" \
  --field "active=true" \
  --field "events[]=push" \
  --field "config[url]=${WEBHOOK_URL}" \
  --field "config[content_type]=json" \
  --field "config[secret]=${SECRET}" \
  --field "config[insecure_ssl]=0" \
  > /dev/null 2>&1; then
  echo "OK — org webhook created"
  echo ""
  echo "All pushes to ${ORG}/* repos now fire to ${WEBHOOK_URL}"
  echo "The API filters by github_repo_id/git_url — only registered constructs sync."
  echo ""
  echo "IMPORTANT: Set GITHUB_WEBHOOK_SECRET on your API server (Railway) to the same secret."
else
  echo "FAIL — could not create org webhook"
  echo "You may need org admin permissions. Check: gh api orgs/${ORG}/hooks"
  exit 1
fi
