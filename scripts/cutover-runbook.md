# Infrastructure Cutover Runbook

> **Version**: 1.0.0
> **Last Updated**: 2026-02-02
> **Sprint**: Sprint 3 (T24.8) - Infrastructure Migration
> **Estimated Total Time**: 45-60 minutes

---

## Pre-Cutover Checklist

Before starting cutover, verify ALL items are complete:

- [ ] Sprint 2 complete: Railway + Supabase staging deployed
- [ ] Sprint 3 validations passed:
  - [ ] T24.1: Contract tests pass against staging
  - [ ] T24.2: Concurrency test (50 req) passes
  - [ ] T24.3: Stripe webhooks tested
  - [ ] T24.4: CLI install flow verified
  - [ ] T24.5: Backfill dry-run verified
- [ ] T24.6: Production Stripe webhook registered (dual-secret ready)
- [ ] T24.7: DNS TTL reduced to 60 seconds
- [ ] T24.9: Rollback drill completed (RTO ≤15 min verified)
- [ ] Team notified of cutover window
- [ ] Monitoring dashboards open (Sentry, Railway metrics)

---

## Emergency Contacts

| Role | Name | Contact |
|------|------|---------|
| Platform Lead | TBD | TBD |
| On-Call Engineer | TBD | TBD |
| Stripe Support | N/A | support.stripe.com |

---

## Phase 1: Pre-Cutover Backup (T-15 min)

**Estimated Time**: 5 minutes

### 1.1 Create Final Neon Backup

```bash
# Set Neon connection string
export NEON_URL="postgresql://[user]:[password]@[host]/[database]?sslmode=require"

# Create timestamped backup
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
pg_dump "$NEON_URL" \
  --format=custom \
  --no-owner \
  --file="backup_pre_cutover_${TIMESTAMP}.dump"

# Verify backup
pg_restore --list "backup_pre_cutover_${TIMESTAMP}.dump" | head -20
echo "Backup size: $(du -h backup_pre_cutover_${TIMESTAMP}.dump | cut -f1)"
```

### 1.2 Record Pre-Freeze State

```bash
# Record current max updated_at for verification
psql "$NEON_URL" -c "SELECT MAX(updated_at) as last_update FROM packs;"
# Save this timestamp: __________________

# Record row counts
psql "$NEON_URL" -c "
SELECT
  (SELECT COUNT(*) FROM users) as users,
  (SELECT COUNT(*) FROM packs) as packs,
  (SELECT COUNT(*) FROM pack_versions) as versions,
  (SELECT COUNT(*) FROM subscriptions) as subscriptions;
"
```

---

## Phase 2: Multi-Layer Write Freeze (T-0)

**Estimated Time**: 10 minutes

> ⚠️ **CRITICAL**: Execute steps IN ORDER. Do not skip ahead.

### 2.1 Pause Stripe Webhooks

```
1. Go to: https://dashboard.stripe.com/webhooks
2. Find webhook for api.constructs.network (Fly.io)
3. Click "..." → "Pause webhook"
4. Verify status shows "Paused"
```

**Verification**: Stripe dashboard shows webhook paused

### 2.2 Enable HTTP Maintenance Mode on Fly.io

```bash
# Set maintenance mode
fly secrets set MAINTENANCE_MODE=true -a loa-constructs-api

# Wait for deployment
fly status -a loa-constructs-api
```

### 2.3 Verify Maintenance Mode Active

```bash
# Test that writes are blocked
curl -X POST https://api.constructs.network/v1/test \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Expected response:
# HTTP 503
# {"error":"Service temporarily unavailable","retry_after":300}
```

**Verification**: POST returns 503 with Retry-After header

### 2.4 Apply Database-Level Write Block

```bash
# Connect to Neon and revoke write permissions
psql "$NEON_URL" -c "
REVOKE INSERT, UPDATE, DELETE
ON ALL TABLES IN SCHEMA public
FROM api_user;
"
```

### 2.5 Wait for In-Flight Request Drain

```bash
# Wait 30 seconds for active requests to complete
echo "Waiting 30 seconds for request drain..."
sleep 30
```

### 2.6 Verify No Writes During Freeze

```bash
# Check that max updated_at matches pre-freeze value
psql "$NEON_URL" -c "SELECT MAX(updated_at) as last_update FROM packs;"

# Compare with value from 1.2: __________________
# If different, STOP and investigate!
```

**Verification**: MAX(updated_at) matches pre-freeze timestamp

### 2.7 Scale Fly.io to Zero

```bash
# Scale down after verification (not before!)
fly scale count 0 -a loa-constructs-api

# Verify scaled down
fly status -a loa-constructs-api
```

**Verification**: Fly.io shows 0 running instances

---

## Phase 3: Data Migration (T+10 min)

**Estimated Time**: 15 minutes

### 3.1 Run Final Data Migration

```bash
# Set connection strings
export NEON_URL="postgresql://..."
export SUPABASE_DIRECT_URL="postgresql://...@db.[project].supabase.co:5432/postgres"

# Verify using direct port (5432), NOT pooler (6543)
echo "$SUPABASE_DIRECT_URL" | grep -q ":5432" || echo "ERROR: Use port 5432!"

# Run migration script
./scripts/migrate-data.sh --mode full
```

### 3.2 Verify Migration

```bash
# Run verification script
pnpm tsx scripts/verify-migration.ts

# Expected output: All checks PASS
```

### 3.3 Run Backfill Script

```bash
# Publish draft packs that have versions
pnpm tsx scripts/backfill-published-packs.ts

# Verify output shows 4+ packs published
# Save audit log location: __________________
```

---

## Phase 4: Switch Traffic to Railway (T+25 min)

**Estimated Time**: 10 minutes

### 4.1 Update DNS CNAME

```bash
# In DNS provider (Cloudflare/Route53/etc):
# Update CNAME for api.constructs.network
# FROM: loa-constructs-api.fly.dev
# TO:   [railway-app].railway.app

# Verify change with dig
dig api.constructs.network CNAME

# Wait for propagation (should be fast with 60s TTL)
sleep 120
```

### 4.2 Verify Traffic Flowing to Railway

```bash
# Health check
curl https://api.constructs.network/v1/health

# Expected: {"status":"healthy",...}

# List constructs
curl https://api.constructs.network/v1/constructs | jq '.data | length'

# Expected: 4+ packs
```

---

## Phase 5: Read-Only Validation (T+35 min)

**Estimated Time**: 10 minutes

### 5.1 Verify Core Endpoints

```bash
# Health endpoint
curl -s https://api.constructs.network/v1/health | jq '.status'
# Expected: "healthy"

# Constructs list
curl -s https://api.constructs.network/v1/constructs | jq '.data[].slug'
# Expected: observer, crucible, etc.

# Single pack
curl -s https://api.constructs.network/v1/packs/observer | jq '.status'
# Expected: "published"
```

### 5.2 Check Error Rates

```
1. Open Sentry dashboard
2. Filter to last 15 minutes
3. Verify no new errors
4. Check Railway metrics for response times
```

### 5.3 Run Contract Tests

```bash
# Run contract tests against production
API_URL=https://api.constructs.network pnpm --filter @loa-constructs/api test:contract
```

---

## Phase 6: 60-Minute Validation Window (T+35 to T+95)

**Estimated Time**: 60 minutes (monitoring)

### 6.1 Continuous Monitoring

Monitor these metrics for 60 minutes:

| Metric | Threshold | Check |
|--------|-----------|-------|
| Error rate | < 0.1% | Sentry dashboard |
| P95 latency | < 200ms | Railway metrics |
| DB connections | < 80% pool | Supabase dashboard |
| Success rate | > 99.9% | Railway metrics |

### 6.2 Periodic Health Checks

Run every 10 minutes:

```bash
# Quick health check
curl -s https://api.constructs.network/v1/health | jq -c '{status,timestamp}'
```

### 6.3 CLI Install Test

```bash
# Test pack installation
cd /tmp && loa install observer --registry https://api.constructs.network
```

---

## Phase 7: Enable Writes (T+95 min)

**Estimated Time**: 5 minutes

### 7.1 Disable Maintenance Mode on Railway

```bash
# In Railway dashboard or CLI:
railway variables set MAINTENANCE_MODE=false

# Redeploy to apply
railway up
```

### 7.2 Resume Stripe Webhooks

```
1. Go to: https://dashboard.stripe.com/webhooks
2. Find NEW webhook for Railway URL
3. Verify it's active
4. (Old Fly.io webhook stays paused)
```

### 7.3 Verify Write Operations

```bash
# Test write endpoint (requires auth)
curl -X POST https://api.constructs.network/v1/test-write \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Expected: 200 OK
```

---

## Phase 8: Post-Cutover (T+100 min)

### 8.1 Update Documentation

- [ ] Update API URL in Loa CLI default config
- [ ] Update dashboard environment variables
- [ ] Update internal documentation

### 8.2 72-Hour Monitoring

Continue monitoring for 72 hours:

- Error rates
- Latency P50/P95/P99
- Database connections
- Stripe webhook success rate

### 8.3 Decommission Old Infrastructure (T+72 hours)

After 72 hours stable:

```bash
# 1. Disable old Stripe webhook
# (Stripe dashboard → webhooks → delete Fly.io endpoint)

# 2. Archive Neon database
# (Neon dashboard → project → archive)

# 3. Delete Fly.io app
fly apps destroy loa-constructs-api
```

---

## Rollback Procedure

> ⚠️ **Use only if critical issues discovered during validation**

### Quick Rollback (< 1 hour after cutover)

**Estimated Time**: 15 minutes (validated in T24.9)

#### R1. Enable Maintenance Mode on Railway

```bash
railway variables set MAINTENANCE_MODE=true
railway up
```

#### R2. Restore Fly.io Write Permissions

```bash
psql "$NEON_URL" -c "
GRANT INSERT, UPDATE, DELETE
ON ALL TABLES IN SCHEMA public
TO api_user;
"
```

#### R3. Scale Up Fly.io

```bash
fly scale count 2 -a loa-constructs-api
fly status -a loa-constructs-api
```

#### R4. Disable Maintenance Mode on Fly.io

```bash
fly secrets set MAINTENANCE_MODE=false -a loa-constructs-api
```

#### R5. Revert DNS

```bash
# Update CNAME back to Fly.io
# api.constructs.network → loa-constructs-api.fly.dev
```

#### R6. Resume Old Stripe Webhook

```
1. Stripe dashboard → webhooks
2. Find Fly.io webhook
3. Click "Resume"
```

#### R7. Verify Rollback

```bash
curl https://api.constructs.network/v1/health
curl https://api.constructs.network/v1/constructs
```

### Extended Rollback (> 1 hour)

If rollback needed after writes occurred on Supabase:

1. Follow Quick Rollback steps
2. Identify writes made to Supabase since cutover
3. Replay those writes to Neon manually
4. Document data reconciliation

---

## Appendix: Connection Strings

| Environment | Variable | Notes |
|-------------|----------|-------|
| Neon (source) | `NEON_URL` | Full connection string |
| Supabase Direct | `SUPABASE_DIRECT_URL` | Port 5432, for migrations |
| Supabase Pooled | `DATABASE_URL` | Port 6543, for runtime |
| Railway | `RAILWAY_URL` | Railway app URL |

---

## Appendix: Timing Summary

| Phase | Start | Duration | Cumulative |
|-------|-------|----------|------------|
| Pre-Cutover Backup | T-15 | 5 min | - |
| Write Freeze | T-0 | 10 min | 10 min |
| Data Migration | T+10 | 15 min | 25 min |
| Traffic Switch | T+25 | 10 min | 35 min |
| Read-Only Validation | T+35 | 10 min | 45 min |
| Validation Window | T+35 | 60 min | 95 min |
| Enable Writes | T+95 | 5 min | 100 min |

**Total Cutover Time**: ~100 minutes (1 hour 40 minutes)
**Rollback Window**: Until T+95 (before writes enabled)
