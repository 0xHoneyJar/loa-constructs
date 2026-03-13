# Explorer Convex Functions

Convex deployment: dev `doting-jackal-397`, prod `quaint-anaconda-866`.

## Signal Pipeline

| Function | Type | Purpose |
|----------|------|---------|
| `signals.ingest` | action | Entry point — validates CONVEX_WRITE_KEY, rate limits, deduplicates, schedules classify + Discord alert |
| `signals.insert` | mutation | Inserts signal to DB |
| `signals.classify` | internal action | Sends signal to Claude Haiku 4.5, stores classification result |
| `signals.sovereigntyGatedEscalate` | internal action | Checks sovereignty tier + circuit breaker, schedules Linear issue creation |
| `signals.alertDiscord` | internal action | Posts Discord embed for critical/high signals |
| `signals.patchClassification` | mutation | Updates signal with classification result |
| `signals.statusCounts` | query | Dashboard counts by app and status |
| `signals.recalculateSovereignty` | mutation | Recomputes sovereignty tiers from override rates |

## Linear Integration

| Function | Type | Purpose |
|----------|------|---------|
| `linear.createLinearIssue` | internal action | GraphQL mutation to create Linear issue, routes to Product or Infrastructure team |
| `linear.patchLinearIssue` | mutation | Stores linearIssueId + linearIssueUrl back on signal |

## Cron Jobs

| Name | Interval | Handler |
|------|----------|---------|
| `presence/cleanup` | 30s | `dashboardPresence.cleanupExpired` |
| `signals/retry-classification` | 5m | `signals.retryFailedClassifications` |
| `signals/check-linear-failures` | 15m | `signals.checkLinearFailures` |
| `signals/reconcile-linear` | 1h | `signals.reconcile` |
| `signals/heartbeat` | 1h | `signals.sendHeartbeat` |
| `signals/heartbeat-check` | 1h | `signals.checkHeartbeat` |
| `signals/recalculate-sovereignty` | 1h | `signals.recalculateSovereignty` |
| `signals/purge-expired` | 24h | `signals.purgeExpired` |

## Schema Tables

| Table | Purpose |
|-------|---------|
| `signals` | Core signal store (feedback + error_report discriminated union) |
| `signalKeys` | Per-app API keys (hash-validated, never stores raw key) |
| `signalRateLimits` | Per-key rate limit counters (100/hr) |
| `sovereigntyState` | Per-app sovereignty tiers + circuit breaker state |
| `dashboardPresence` | Real-time dashboard user presence |

## Required Environment Variables

| Variable | Purpose |
|----------|---------|
| `CONVEX_WRITE_KEY` | Shared secret — must match Vercel route handler |
| `ANTHROPIC_API_KEY` | Claude Haiku 4.5 for signal classification |
| `LINEAR_API_KEY` | Linear issue creation for escalated signals |
| `LINEAR_TEAM_PRODUCT` | Linear team ID for product/feedback issues |
| `LINEAR_TEAM_INFRASTRUCTURE` | Linear team ID for infrastructure/error issues |
| `DISCORD_SIGNALS_WEBHOOK_URL` | Discord webhook for critical/high signal alerts |

## Architecture Reference

See `grimoires/loa/context/ruggy-signal-architecture.md` for full Mermaid diagrams of the signal flow, ingestion sequence, sovereignty engine, and security model.
