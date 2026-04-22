# Registry Ingest Pipeline

> *"constructs install construct-creator returned HTTP 500 post-push."* — operator 2026-04-22, cycle-006 L-meta-pack close
>
> State of the pipeline that takes a `0xHoneyJar/construct-*` repo from push → discoverable in `constructs.network`.

---

## Current state (post-cycle-007)

```
  operator pushes construct-* to 0xHoneyJar/*
                    │
                    │  ✗ NO WEBHOOK
                    ▼
  constructs.network registry (unaware)
                    │
                    │  ○ operator manually runs:
                    │      POST /v1/admin/discover?owner=0xHoneyJar
                    ▼
  Discovery service (apps/api/src/services/discovery.ts)
    │
    ├─ fetchOrgRepos('0xHoneyJar') — lists construct-* repos
    ├─ fetchManifest(repo)         — reads construct.yaml from each
    ├─ For NEW repo  → db.insert(packs) with status='published' ✓
    └─ For EXISTING  → db.update(packs) — status unchanged
                    │
                    ▼
  /v1/constructs/<slug> — returns published packs ✓
```

## The three structural gaps

| # | Gap | Status (post-cycle-007) |
|---|---|---|
| 1 | **No ingest trigger** — github push to `0xHoneyJar/*` doesn't notify the registry | ✗ deferred to cycle-008 |
| 2 | **No namespace-scan cron** — `POST /v1/admin/discover` is operator-manual; no schedule fires it | ✗ deferred to cycle-008 |
| 3 | **Draft-default gate** — `createPack()` defaults to `status='draft'`, requiring manual publish | ✓ resolved: the **discovery path** (services/discovery.ts:272) inserts with `status: 'published'` for org-sync packs. The default in `createPack()` (services/packs.ts:190) remains `'draft'` correctly — user-submitted packs should enter the admin-review gate. |

**Honest read**: gap (3) was a FALSE PREMISE for the 0xHoneyJar auto-discovery path — discovery already publishes. The symptom (`constructs install construct-creator` → 500) is most likely because **discovery hadn't been re-run** between operator push and `constructs install` attempt. Gaps (1) and (2) ARE real — without webhook or cron, discovery only runs when operator manually triggers.

## How to unblock today (manual operator action)

To ingest a freshly-pushed construct on `0xHoneyJar`:

```bash
# Option A — hit the admin endpoint directly (requires admin JWT)
curl -X POST "https://api.constructs.network/v1/admin/discover?owner=0xHoneyJar" \
  -H "Authorization: Bearer $ADMIN_JWT"

# Option B — dry-run first, then commit
curl -X POST "https://api.constructs.network/v1/admin/discover?owner=0xHoneyJar&dryRun=true" \
  -H "Authorization: Bearer $ADMIN_JWT"
curl -X POST "https://api.constructs.network/v1/admin/discover?owner=0xHoneyJar" \
  -H "Authorization: Bearer $ADMIN_JWT"
```

A new pack appears at `/v1/constructs/<slug>` immediately on successful discovery.

## Deferred to cycle-008

### Webhook path (fast — ≤1 min from push to discoverable)

GitHub org webhook → `POST /v1/admin/ingest` (new endpoint) with repo name. Server fetches construct.yaml, validates via construct-validate.sh, inserts pack. Requires:

- Webhook endpoint on `apps/api` (authenticated via webhook secret)
- Webhook installed on `0xHoneyJar` org in GitHub settings
- Minimum: trigger on `push` events to `construct-*` repos on default branch

### Cron path (slower — bounded by interval)

Scheduled job fires `POST /v1/admin/discover?owner=0xHoneyJar` every N minutes. Requires:

- Scheduled worker (Railway cron, GitHub Actions schedule, or similar)
- Admin JWT available to the scheduled context
- Idempotency invariant already met by discovery service (existing packs are update-merged, not duplicated)

Either path satisfies **AC-RA.1** (ingest trigger exists) + **AC-RA.5** (smoke test: push → discoverable within N minutes).

### Pack validation pre-insert

**AC-RA.2** — currently discovery fetches the manifest but doesn't run `construct-validate.sh` before inserting. Future cycle: wire validator into the ingest path so malformed manifests are rejected with actionable error rather than silently inserting invalid rows.

### Backfill (cycle-008+)

**AC-RA.4** — a one-time operator run of `POST /v1/admin/discover?owner=0xHoneyJar` picks up any packs that landed during the manual-only era. `construct-creator` from cycle-006 should resolve on next discovery.

## Related

- `apps/api/src/services/discovery.ts` — implementation
- `apps/api/src/routes/admin.ts:1072` — POST /v1/admin/discover route
- `apps/api/src/db/seed-publish-packs.ts` — legacy script that bulk-publishes draft packs (still useful for one-time cleanup if any drafts linger)
- `grimoires/loa-constructs-seed-2026-04-21/cycle-007-SEED-world-consolidation.md` §L-registry-automation
- Related issues: #72 (registry returning stale data) · #57 (DB migrations on Fly.io)

## Sources

- SEED cycle-007 §L-registry-automation (operator direction 2026-04-23 late)
- Operator cycle-006 L-meta-pack close — the originating 500-error
- Code inspection: services/discovery.ts + services/packs.ts + routes/admin.ts
