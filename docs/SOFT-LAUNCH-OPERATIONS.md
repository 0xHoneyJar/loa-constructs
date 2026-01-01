# Soft Launch Operations Guide

> Loa Skills Registry - Production Operations Without Billing

## Overview

This guide covers operating the Loa Skills Registry during soft launch, where:
- Billing is not yet configured (Reap Global integration planned)
- Users are created and managed manually
- Subscriptions are granted via scripts
- Email verification is skipped (pre-verified users)

## Prerequisites

1. **Database**: Neon PostgreSQL connection string
2. **Node.js**: v20+ with pnpm
3. **Fly CLI** (for deployment): `curl -L https://fly.io/install.sh | sh`

## Environment Configuration

### Minimum Required Variables

```bash
# Required - API will not start without these
DATABASE_URL="postgresql://user:password@host.neon.tech/dbname?sslmode=require"
JWT_SECRET="<min-32-char-secret>"  # Generate: openssl rand -hex 32
NODE_ENV="production"
```

### Optional Variables

```bash
# Rate limiting (disabled without Redis)
REDIS_URL="redis://..."

# Email (skipped without Resend)
RESEND_API_KEY="re_..."

# Storage (falls back to DB without R2)
R2_ACCOUNT_ID="..."
R2_ACCESS_KEY_ID="..."
R2_SECRET_ACCESS_KEY="..."
R2_BUCKET="loa-skills"

# OAuth (disabled without credentials)
GITHUB_CLIENT_ID="..."
GITHUB_CLIENT_SECRET="..."
```

## Scripts Reference

All scripts are in the `scripts/` directory. Run with:
```bash
DATABASE_URL="..." npx tsx scripts/<script>.ts
```

### User Management

#### Create a User
```bash
npx tsx scripts/create-user.ts <email> "<name>" [password]

# Examples:
npx tsx scripts/create-user.ts user@example.com "John Doe"
npx tsx scripts/create-user.ts user@example.com "John Doe" "secure-password"
```

Creates a user with:
- Pre-verified email (no email confirmation needed)
- Auto-generated password if not provided
- Role: `user`

#### Grant Subscription
```bash
npx tsx scripts/grant-subscription.ts <email> [tier]

# Tiers: free, pro, team, enterprise (default: pro)
# Examples:
npx tsx scripts/grant-subscription.ts user@example.com
npx tsx scripts/grant-subscription.ts user@example.com enterprise
```

Grants:
- 1-year subscription
- Active status
- Updates existing subscription if present

### Team Management

#### Seed THJ Team
```bash
npx tsx scripts/seed-thj-team.ts
```

Creates/updates accounts in the `THJ_TEAM` array (edit the script to add members).

### Validation

#### Test Environment Config
```bash
npx tsx scripts/test-env-config.ts
```

Validates that:
- Required variables are set
- JWT_SECRET meets length requirements
- Shows which optional services are available

## Deployment

### Initial Deployment

1. **Install Fly CLI**:
   ```bash
   curl -L https://fly.io/install.sh | sh
   fly auth login
   ```

2. **Create App** (first time only):
   ```bash
   cd apps/api
   fly apps create loa-skills-api
   ```

3. **Set Secrets**:
   ```bash
   fly secrets set \
     DATABASE_URL="postgresql://..." \
     JWT_SECRET="$(openssl rand -hex 32)"
   ```

4. **Deploy**:
   ```bash
   fly deploy
   ```

Or use the helper script:
```bash
./scripts/deploy-soft-launch.sh
```

### Subsequent Deployments

```bash
cd apps/api
fly deploy
```

### Check Status

```bash
fly status --app loa-skills-api
fly logs --app loa-skills-api
curl https://loa-skills-api.fly.dev/v1/health
```

## User Onboarding Flow

### For THJ Team Members

1. Add to `scripts/seed-thj-team.ts`
2. Run seed script
3. Share credentials securely

### For Early Access Users

1. Create user:
   ```bash
   npx tsx scripts/create-user.ts user@example.com "User Name"
   ```

2. Grant subscription:
   ```bash
   npx tsx scripts/grant-subscription.ts user@example.com pro
   ```

3. Share credentials via secure channel

### For Discount/Trial Users

Same as early access, but with lower tier:
```bash
npx tsx scripts/grant-subscription.ts user@example.com free
```

## Pack Management

### Available Packs

GTM Collective pack is already imported:
- Pack ID: `113d4686-1c8c-4953-a8f9-8b433e6ee909`
- Tier: `pro` (accessible to pro, team, enterprise)
- `thjBypass: true` (THJ users can access regardless of subscription)

### Adding New Packs

Use the import script:
```bash
npx tsx scripts/import-gtm-collective.ts
```

Or create new import scripts following the same pattern.

## Monitoring

### Health Check

```bash
curl https://loa-skills-api.fly.dev/v1/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-01-02T00:00:00.000Z",
  "version": "0.1.0"
}
```

### Logs

```bash
fly logs --app loa-skills-api
```

### Database Inspection

Use Drizzle Studio:
```bash
cd apps/api
DATABASE_URL="..." npx drizzle-kit studio
```

## Troubleshooting

### API Won't Start

1. Check DATABASE_URL is valid
2. Ensure JWT_SECRET is at least 32 characters
3. Check Fly logs: `fly logs --app loa-skills-api`

### User Can't Access Pack

1. Verify subscription:
   ```sql
   SELECT * FROM subscriptions WHERE user_id = 'xxx';
   ```

2. Check subscription status is 'active' and tier matches pack requirements

3. Grant/update subscription:
   ```bash
   npx tsx scripts/grant-subscription.ts user@example.com pro
   ```

### Rate Limiting Issues

Without Redis, rate limiting is disabled. If needed:
1. Set up Upstash Redis
2. Add REDIS_URL secret
3. Redeploy

## Transitioning to Full Launch

When ready to enable billing with Reap Global:

1. **Integrate Reap Global**:
   - Update subscription service to use Reap Global API
   - Configure webhooks for payment events
   - Map Reap Global plans to subscription tiers

2. **Enable Email** (for verification):
   ```bash
   fly secrets set RESEND_API_KEY="re_..."
   ```

3. **Update Manual Grants**:
   - Existing subscriptions remain valid
   - New users subscribe via Reap Global

4. **Update Pack thjBypass**:
   - Set `thjBypass: false` on packs
   - Enforce subscription requirements

## Security Notes

- JWT_SECRET should be unique to production
- Never commit credentials to git
- Use Fly secrets for sensitive values
- Rotate JWT_SECRET periodically (invalidates all tokens)
- Monitor logs for suspicious activity

## Future: Reap Global Integration

The current Stripe-based billing code will be refactored to use Reap Global. Key areas:
- `apps/api/src/services/stripe.ts` → Reap Global service
- `apps/api/src/routes/billing.ts` → Reap Global webhooks
- `apps/api/src/db/schema.ts` → subscriptions table (may need updates)

Until then, use manual subscription grants via scripts.
