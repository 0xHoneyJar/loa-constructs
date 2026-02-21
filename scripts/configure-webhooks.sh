#!/usr/bin/env bash
# Configure GitHub webhooks on all construct-* repos
# Requires: gh CLI authenticated, GITHUB_WEBHOOK_SECRET env var
#
# Usage: GITHUB_WEBHOOK_SECRET=your_secret ./scripts/configure-webhooks.sh
#
# Security: Secret is passed via stdin (--input), not command-line args,
# to avoid exposure in process listings (ps aux).

set -euo pipefail

ORG="0xHoneyJar"
WEBHOOK_URL="https://api.constructs.network/v1/webhooks/github"
REPOS=(
  "construct-observer"
  "construct-crucible"
  "construct-artisan"
  "construct-beacon"
  "construct-gtm-collective"
)

if [[ -z "${GITHUB_WEBHOOK_SECRET:-}" ]]; then
  echo "ERROR: GITHUB_WEBHOOK_SECRET environment variable is required"
  exit 1
fi

if ! command -v gh &>/dev/null; then
  echo "ERROR: gh CLI is required (https://cli.github.com)"
  exit 1
fi

echo "Configuring webhooks for ${#REPOS[@]} repos..."
echo "  URL: ${WEBHOOK_URL}"
echo ""

SUCCESS=0
FAILED=0

for repo in "${REPOS[@]}"; do
  echo "  ${repo}..."

  # Check if webhook already exists
  EXISTING=$(gh api "repos/${ORG}/${repo}/hooks" --jq "[.[] | select(.config.url == \"${WEBHOOK_URL}\")] | length" 2>&1 || echo "0")

  if [[ "$EXISTING" -gt 0 ]]; then
    # Update existing webhook — pass body via stdin to avoid secret in process args
    HOOK_ID=$(gh api "repos/${ORG}/${repo}/hooks" --jq "[.[] | select(.config.url == \"${WEBHOOK_URL}\")][0].id")
    printf '{"config":{"url":"%s","content_type":"json","secret":"%s"},"events":["push"],"active":true}' \
      "${WEBHOOK_URL}" "${GITHUB_WEBHOOK_SECRET}" \
      | gh api --method PATCH "repos/${ORG}/${repo}/hooks/${HOOK_ID}" --input - --silent && {
        echo "    Updated (hook ${HOOK_ID})"
        ((SUCCESS++))
      } || {
        echo "    FAILED to update"
        ((FAILED++))
      }
  else
    # Create new webhook — pass body via stdin to avoid secret in process args
    printf '{"name":"web","config":{"url":"%s","content_type":"json","secret":"%s"},"events":["push"],"active":true}' \
      "${WEBHOOK_URL}" "${GITHUB_WEBHOOK_SECRET}" \
      | gh api --method POST "repos/${ORG}/${repo}/hooks" --input - --silent && {
        echo "    Created"
        ((SUCCESS++))
      } || {
        echo "    FAILED to create"
        ((FAILED++))
      }
  fi
done

echo ""
echo "Done: ${SUCCESS} succeeded, ${FAILED} failed"
exit $FAILED
