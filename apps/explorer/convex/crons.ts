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

// Check heartbeat health every hour (offset by running both)
crons.interval(
  'signals/heartbeat-check',
  { hours: 1 },
  internal.signals.checkHeartbeat,
);

export default crons;
