import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

crons.interval(
  'presence/cleanup',
  { seconds: 30 },
  internal.dashboardPresence.cleanupExpired,
);

// --- Signals (cycle-044) ---

// Retry unclassified signals every 5 minutes
crons.interval(
  'signals/retry-classification',
  { minutes: 5 },
  internal.signals.retryFailedClassifications,
);

// Reconcile Linear issue statuses — hourly
crons.interval(
  'signals/reconcile-linear',
  { hours: 1 },
  internal.signals.reconcile,
);

// Purge signals older than 90 days — daily
crons.interval(
  'signals/purge-expired',
  { hours: 24 },
  internal.signals.purgeExpired,
);

// Send heartbeat signal every hour
crons.interval(
  'signals/heartbeat',
  { hours: 1 },
  internal.signals.sendHeartbeat,
);

// Check heartbeat health every 2 hours (offset from sendHeartbeat to avoid collision)
crons.interval(
  'signals/heartbeat-check',
  { hours: 2 },
  internal.signals.checkHeartbeat,
);

// --- Ruggy Ecosystem Intelligence (cycle-045) ---

// Recalculate sovereignty tiers hourly
crons.interval(
  'signals/recalculate-sovereignty',
  { hours: 1 },
  internal.signals.recalculateSovereignty,
);

// Check for Linear creation failures every 15 minutes
crons.interval(
  'signals/check-linear-failures',
  { minutes: 15 },
  internal.signals.checkLinearFailures,
);

// --- Analytics Digest ---

// Daily digest to Telegram at 14:00 UTC
crons.cron(
  'analytics/daily-digest',
  '0 14 * * *',
  internal.telegram.sendDigest,
);

export default crons;
