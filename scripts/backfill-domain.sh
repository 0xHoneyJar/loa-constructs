#!/usr/bin/env bash
# backfill-domain.sh — Add domain field to all construct repos
#
# Reads domain assignments from PRD, adds domain: [<category>] to each
# construct.yaml via GitHub API (no clone required).
#
# Usage:
#   ./scripts/backfill-domain.sh              # Dry run (report only)
#   ./scripts/backfill-domain.sh --apply      # Apply changes via PRs
#
# Requires: gh CLI authenticated with write access to 0xHoneyJar org

set -euo pipefail

ORG="${CONSTRUCTS_ORG:-0xHoneyJar}"
APPLY=false
[[ "${1:-}" == "--apply" ]] && APPLY=true

# Domain assignments from PRD §FR-3.2
declare -A DOMAINS=(
  [artisan]="design"
  [the-easel]="design"
  [webgl-particles]="design"
  [webreel]="design"
  [observer]="analytics"
  [k-hole]="analytics"
  [crucible]="security"
  [hardening]="security"
  [dynamic-auth]="security"
  [protocol]="development"
  [beacon]="operations"
  [herald]="operations"
  [gtm-collective]="marketing"
  [social-oracle]="marketing"
  [growthpages]="marketing"
  [mibera-codex]="documentation"
)

echo ""
echo "  Domain Backfill — ${ORG}"
echo "  ════════════════════════════════════════"
echo ""

updated=0
skipped=0
errors=0

for slug in "${!DOMAINS[@]}"; do
  domain="${DOMAINS[$slug]}"
  repo="construct-${slug}"

  # Check if construct.yaml exists
  if ! gh api "repos/${ORG}/${repo}/contents/construct.yaml" --silent 2>/dev/null; then
    echo "  SKIP  ${slug} — no construct.yaml"
    skipped=$((skipped + 1))
    continue
  fi

  # Get current content
  content=$(gh api "repos/${ORG}/${repo}/contents/construct.yaml" --jq '.content' 2>/dev/null | base64 -d)

  # Check if domain already exists
  if echo "$content" | grep -q "^domain:"; then
    current=$(echo "$content" | grep "^domain:" | head -1)
    echo "  OK    ${slug} — already has ${current}"
    skipped=$((skipped + 1))
    continue
  fi

  if [[ "$APPLY" == "false" ]]; then
    echo "  NEED  ${slug} → domain: [${domain}]"
    updated=$((updated + 1))
    continue
  fi

  # Add domain field after description line
  new_content=$(echo "$content" | sed "/^description:/a\\
domain:\\
  - ${domain}")

  # Get SHA for update
  sha=$(gh api "repos/${ORG}/${repo}/contents/construct.yaml" --jq '.sha' 2>/dev/null)

  # Update via API
  encoded=$(echo "$new_content" | base64)
  if gh api "repos/${ORG}/${repo}/contents/construct.yaml" \
    --method PUT \
    --field message="chore: add domain field for category derivation" \
    --field content="${encoded}" \
    --field sha="${sha}" \
    --silent 2>/dev/null; then
    echo "  DONE  ${slug} → domain: [${domain}]"
    updated=$((updated + 1))
  else
    echo "  ERR   ${slug} — API update failed"
    errors=$((errors + 1))
  fi
done

echo ""
echo "  Summary: ${updated} updated, ${skipped} skipped, ${errors} errors"

if [[ "$APPLY" == "false" && "$updated" -gt 0 ]]; then
  echo ""
  echo "  Dry run complete. To apply: ./scripts/backfill-domain.sh --apply"
fi

echo ""
