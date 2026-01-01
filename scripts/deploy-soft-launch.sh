#!/bin/bash
# Deploy Loa Constructs API to Fly.io (Soft Launch)
# @see sprint.md T17.4: Deploy API to Fly.io
#
# Prerequisites:
#   1. Install Fly CLI: curl -L https://fly.io/install.sh | sh
#   2. Authenticate: fly auth login
#   3. Create app (first time): fly apps create loa-constructs-api
#
# Usage:
#   ./scripts/deploy-soft-launch.sh

set -e

echo ""
echo "Loa Constructs - Soft Launch Deployment"
echo "============================================="
echo ""

# Check for fly CLI
if ! command -v fly &> /dev/null && ! command -v flyctl &> /dev/null; then
    echo "ERROR: Fly CLI not found"
    echo ""
    echo "Install with: curl -L https://fly.io/install.sh | sh"
    echo "Then authenticate: fly auth login"
    exit 1
fi

# Use flyctl if fly is not available
FLY_CMD=${FLY_CMD:-$(command -v fly || command -v flyctl)}

cd "$(dirname "$0")/../apps/api"

echo "Checking Fly.io authentication..."
$FLY_CMD auth whoami || {
    echo "ERROR: Not authenticated. Run: fly auth login"
    exit 1
}

echo ""
echo "Checking app status..."
APP_EXISTS=$($FLY_CMD apps list --json 2>/dev/null | grep -c '"loa-constructs-api"' || true)

if [ "$APP_EXISTS" -eq 0 ]; then
    echo "App 'loa-constructs-api' not found. Creating..."
    $FLY_CMD apps create loa-constructs-api --org personal
fi

echo ""
echo "Current secrets configuration:"
$FLY_CMD secrets list --app loa-constructs-api 2>/dev/null || echo "(no secrets set)"

echo ""
echo "============================================="
echo "SOFT LAUNCH - Minimum Required Secrets"
echo "============================================="
echo ""
echo "Set these secrets before deploying:"
echo ""
echo "  fly secrets set DATABASE_URL=\"postgresql://...\" \\"
echo "                  JWT_SECRET=\"\$(openssl rand -hex 32)\""
echo ""
echo "Optional (for full functionality):"
echo "  fly secrets set REDIS_URL=\"...\" \\"
echo "                  STRIPE_SECRET_KEY=\"...\" \\"
echo "                  RESEND_API_KEY=\"...\""
echo ""

read -p "Are secrets configured? Deploy now? (y/N) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Deploying to Fly.io..."
    $FLY_CMD deploy --app loa-constructs-api

    echo ""
    echo "Deployment complete! Checking health..."
    sleep 5

    $FLY_CMD status --app loa-constructs-api

    echo ""
    echo "Health check:"
    curl -s https://loa-constructs-api.fly.dev/v1/health | jq . || echo "(waiting for deployment)"

    echo ""
    echo "============================================="
    echo "NEXT STEPS"
    echo "============================================="
    echo ""
    echo "1. Seed THJ team users:"
    echo "   DATABASE_URL=\"...\" npx tsx scripts/create-user.ts admin@thehoneyjar.xyz \"THJ Admin\""
    echo "   DATABASE_URL=\"...\" npx tsx scripts/grant-subscription.ts admin@thehoneyjar.xyz pro"
    echo ""
    echo "2. Verify API is working:"
    echo "   curl https://loa-constructs-api.fly.dev/v1/health"
    echo "   curl https://loa-constructs-api.fly.dev/v1/packs"
    echo ""
else
    echo ""
    echo "Deployment cancelled. Set secrets first, then run this script again."
fi
