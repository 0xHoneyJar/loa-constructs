# Postgres Cutover — Non-Migration Acknowledgment

**Cycle**: constructs-network-migration · 2026-05-05
**Task**: T-1.4 (FR-1.4 + ADR-001)
**Author**: claude-opus-4-7 in session with @zksoju

## Substrate change

The `loa-constructs-api` service migrates its Postgres backend from a retired
Supabase tenant to a fresh Railway Postgres instance.

| | Before | After |
|---|---|---|
| Provider | Supabase (`postgres.ccrjfpzdgiuqqwmmgrap`) | Railway Postgres |
| Project | THJ Supabase org (retired) | `constructs network` (Railway) |
| Status | dead — `ENOTFOUND` since at least 2026-05-01 | provisioned fresh in T-1.4 |
| `DATABASE_URL` | pooler.supabase.com:6543 | Railway-provided service reference |

## Zero data migration — by design

There is **no ETL** between the two databases. There is **no restore step**.
This is a greenfield Postgres init.

Empirical justification:
- The Supabase tenant has been unreachable since 2026-05-01 (PRD §1).
  Recovery by snapshot is not available and the operator has confirmed
  Supabase is retired org-wide.
- Construct-registry data is not in Postgres anyway. Per FR-1.4 + ADR-002
  the `packs` / `skills` / `skill_versions` tables get a 30-day deprecation
  comment (migration `0014`) before drop in a follow-on cycle. Reads switch
  to `registry-loader.ts` against `loa-constructs/registry.yaml` (FR-1.6).
- Ops-state tables (`users`, `subscriptions`, `api_keys`, `team_members`,
  etc.) are reseeded **lazily** per FR-1.4.2:
  - `users` — repopulated on next Dynamic Labs wallet re-auth
  - `subscriptions` — reconciled from Stripe via `apps/api/scripts/reconcile-stripe.ts` (T-1.10)
  - `api_keys` — declared lost (operators rotate via dashboard on first use)
  - `discovery_runs` / `visibility_transitions` / `construct_verifications` /
    `graduation_requests` — empty until next event

## Tables created on the fresh Postgres

After `bun --filter api db:migrate` runs, the schema is:

| Migration | Tables | Source |
|---|---|---|
| `0000` – `0013` | existing ops-state schema | committed history (Drizzle 0000-0013) |
| `0014_deprecate_registry_tables.sql` (T-1.6) | adds COMMENTs to `packs` / `skills` / `skill_versions` | SDD §4.3 |
| `0015_trajectory_events.sql` (T-1.7) | `trajectory_events` + `consumer_cursors` | SDD §2.4.1 |
| `0016_webhook_security_state.sql` (T-1.8) | `webhook_nonces` + `rate_limit_buckets` + `last_known_registry` | SDD §4.2.5 |

## Acceptance verification (T-1.4 acceptance gate)

- [ ] Railway dashboard shows new Postgres service in `constructs network` project
- [ ] `DATABASE_URL` env var on `loa-constructs-api` points at the new service via Railway service reference
- [ ] `bun --filter api db:migrate` applies migrations 0000-0016 cleanly
- [ ] `apps/api/v1/health` returns `db_status: "connected"` after deploy
- [ ] This document committed (acknowledges greenfield init explicitly)

## What is NOT a regression

The empty-data state at cutover is **expected**, not a bug:
- `/v1/constructs?per_page=1` returning `{"data": [...], "total": 18}` comes
  from `registry-loader.ts` (yaml-source, T-1.11a) — never touches Postgres.
- `/v1/users` and similar ops-state endpoints will return empty until users
  re-auth. This is the FR-1.4.2 lazy-reconcile path.

## Rollback

Per FR-4.1 + AC-1.7 rollback drill: if the new Postgres fails to come up or
fails health, revert by restoring the prior `DATABASE_URL` env var. The old
Supabase URL is preserved in this doc for record but the host is dead, so
rollback in practice means redeploying the service with `DATABASE_URL` unset
(API enters degraded mode with registry-yaml-only paths still working).

## References

- PRD §1 (problem statement) · §4.1 FR-1.4 · §4.4 reconciliation
- SDD §2.1.2 (Postgres provisioning) · §4.3 (deprecated tables) · ADR-001 / ADR-002
- Sprint plan T-1.4 acceptance gate
