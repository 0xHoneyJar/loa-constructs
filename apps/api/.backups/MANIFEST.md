# Backup Manifest — constructs-network-prod

Backup metadata is tracked here. **Dumps themselves live in R2, never in git.**

## Pipeline

| Component | Location |
|---|---|
| Workflow | `.github/workflows/backup-db.yml` |
| Schedule | Daily at 03:00 UTC |
| Source | `constructs-network-prod` (Turso, aws-us-east-1) |
| Destination | `s3://0xhoneyjar-backups/loa-constructs-api/{YYYY-MM-DD}.sql.gz` |
| Retention | 30 days (set R2 bucket lifecycle policy) |
| Restore runbook | `apps/api/docs/disaster-recovery.md` §4 |

## Required secrets (operator setup)

Repo-level GitHub Actions secrets:

- `TURSO_AUTH_TOKEN` — read access to prod DB (can be a scoped read-only token per SDD §6.1.2)
- `R2_ACCESS_KEY_ID` — R2 bucket writer
- `R2_SECRET_ACCESS_KEY` — R2 bucket writer
- `R2_ACCOUNT_ID` — Cloudflare account ID (appears in R2 endpoint URL)

Repo-level GitHub Actions variables (optional):

- `TURSO_DATABASE_NAME` — defaults to `constructs-network-prod`
- `R2_BUCKET` — defaults to `0xhoneyjar-backups`

## Recent runs

_Populated by the workflow via a future `actions/upload-artifact` hook._
_Until then, see the Actions tab for run history._

## Restore drill

Quarterly drill recommended:

1. Download latest dump from R2.
2. Provision a scratch Turso DB: `turso db create constructs-restore-drill-YYYY-MM-DD`.
3. Pipe dump into shell: `gunzip -c <dump>.sql.gz | turso db shell constructs-restore-drill-YYYY-MM-DD`.
4. Run read-only smoke: `turso db shell ... "SELECT COUNT(*) FROM packs"` (expect ≥ 20).
5. Destroy scratch DB: `turso db destroy constructs-restore-drill-YYYY-MM-DD`.
6. Record drill outcome in this manifest under "Recent runs".

## Cross-refs

- SDD §8 Backup + Disaster Recovery
- PRD NFR7 Backup + DR
- Doctrine: [[saas-exit-vectors]] — R2 is a dependency; backup exfil path out of Turso is the insurance on that dependency.
