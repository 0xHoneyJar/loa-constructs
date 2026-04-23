# Disaster Recovery — constructs-api

Runbook for incident response on `api.constructs.network` (Railway) +
`constructs-network-prod` (Turso managed libSQL).

- Sovereign-landing scope: pre-launch, no external users → data loss is
  acceptable; registry content is reproducible via `POST /v1/admin/discover`.
- [[saas-exit-vectors]] instance-1 is the governing doctrine — managed vendor
  chosen for leverage, with an explicit exit plan if the vendor misbehaves.

## 0 · Contacts + endpoints

| Thing | Where |
|---|---|
| API prod URL | `https://api.constructs.network` |
| Turso DB | `libsql://constructs-network-prod-zksoju.aws-us-east-1.turso.io` |
| Turso region | AWS us-east-1 |
| Railway project | `constructs network` / service `loa-constructs-api` |
| Operator | @zksoju |
| Related seed | `grimoires/loa-constructs-seed-2026-04-21/cycle-012-SEED-*` |

## 1 · Fast rollback (cycle-012 cutover)

If the cycle-012 deploy misbehaves and you need to return to the prior
Postgres-backed API state:

```bash
# 1. Confirm: Supabase DB still paused? If unpaused, old API will resume.
#    If paused, rollback is moot (old API can't read anyway).
railway variables --kv | grep -c "^DATABASE_URL="   # should be 1 (still set)

# 2. Roll Railway back to the pre-cutover deployment
railway redeploy --help   # inspect
# OR: re-run `railway up` from the pre-cycle-012 HEAD
git checkout main
railway up --detach --service loa-constructs-api

# 3. Unset TURSO_* vars (optional — they're inert on old code)
railway variables delete TURSO_DATABASE_URL --skip-deploys
railway variables delete TURSO_AUTH_TOKEN --skip-deploys
```

The Turso DB keeps all seeded data while Railway runs the old image — when
you redeploy the cycle-012 branch the data is intact. No migration step
required.

## 2 · Scenario: Turso compute unreachable

Symptom: `/v1/health/ready` returns `503 db_unreachable`.

```bash
# Quick diagnosis
turso db show constructs-network-prod
turso db shell constructs-network-prod "SELECT 1"

# If Turso outage and restoration <1h expected:
#   Railway load balancer drops unhealthy instance — no action needed.
#   API returns 503 on writes, 200 on /v1/health (liveness, no DB).

# If >1h expected: break-glass fallback (see §4).
```

## 3 · Scenario: Turso project locked (billing / account)

Restore most recent dump to a fresh Turso DB OR self-host `sqld` on Railway:

```bash
# Option A: fresh Turso DB
turso db create constructs-network-prod-<suffix>
# Restore from backup (see §5)
aws s3 cp s3://0xhoneyjar-backups/loa-constructs-api/<date>.sql.gz - \
  | gunzip \
  | turso db shell constructs-network-prod-<suffix>

# New URL + token
NEW_URL=$(turso db show constructs-network-prod-<suffix> --url)
NEW_TOKEN=$(turso db tokens create constructs-network-prod-<suffix>)

railway variables --set "TURSO_DATABASE_URL=$NEW_URL" \
                  --set "TURSO_AUTH_TOKEN=$NEW_TOKEN"
# Railway auto-redeploys
```

## 4 · Scenario: Accidental data loss

If a bad `POST /v1/admin/discover` or manual query wipes `packs`:

```bash
# Newest backup
LATEST=$(aws s3 ls s3://0xhoneyjar-backups/loa-constructs-api/ \
  | sort | tail -1 | awk '{print $NF}')

aws s3 cp s3://0xhoneyjar-backups/loa-constructs-api/$LATEST - \
  | gunzip \
  | turso db shell constructs-network-prod
```

Alternatively, because registry content is reproducible, you can just:

```bash
curl -X POST "https://api.constructs.network/v1/admin/discover?owner=0xHoneyJar" \
  -H "Authorization: Bearer $CONSTRUCTS_ADMIN_TOKEN"
```

This repopulates `packs` + `skills` from GitHub. View + download counters
are lost (acceptable — pre-launch, no external traffic relied on them).

## 5 · Backups (see T1.10 / NFR7)

- Daily dump via GitHub Action → R2 (or S3), retention 30 days
- Manifest `apps/api/.backups/MANIFEST.md` tracks backup provenance (no
  content committed to git).
- Restore procedure documented in §3 and §4 above.

## 6 · Break-glass read-only fallback

If Turso is unreachable AND recovery >1h:

```bash
# 1. Copy newest dump to local better-sqlite3 file
aws s3 cp s3://0xhoneyjar-backups/loa-constructs-api/<latest>.sql.gz - \
  | gunzip > /tmp/readonly.db

# 2. Flip Railway into read-only mode
railway variables --set "READONLY_FALLBACK=1" \
                  --set "READONLY_DB_PATH=/tmp/readonly.db"

# 3. When Turso returns:
railway variables delete READONLY_FALLBACK
railway variables delete READONLY_DB_PATH
```

*Read-only fallback requires the `READONLY_FALLBACK` branch in `src/db/index.ts`
— not yet wired in cycle-012; tracked as tech debt for a future hardening
cycle.*

## 7 · Token rotation (see SDD §6.1.2)

Monthly cadence for `CONSTRUCTS_ADMIN_TOKEN`:

```bash
NEW="cto_$(openssl rand -hex 32)"
railway variables --set "CONSTRUCTS_ADMIN_TOKEN=$NEW"
# Railway auto-redeploys
# Update CI / cron consumers with the new value
```

Turso auth token rotation:

```bash
turso db tokens invalidate constructs-network-prod
NEW_TOKEN=$(turso db tokens create constructs-network-prod)
railway variables --set "TURSO_AUTH_TOKEN=$NEW_TOKEN"
```

## 8 · Single-instance constraint (see SDD §6.2.1)

The Railway service MUST run as **one instance** (rate-limit uses process-local
maps). If traffic ever justifies horizontal scaling, escalation path:

1. Move rate-limit to SQLite-backed `stats_events` table (SDD §2.5 optional,
   kept as escape hatch). Per-row INSERT + cleanup. ~2 hrs work.
2. Move rate-limit to Cloudflare edge layer.
3. Accept rank-signal degradation.

Trigger: sustained >100 req/sec OR evidence of rank-poisoning attempts.
