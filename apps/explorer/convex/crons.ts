import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

crons.interval(
  'presence/cleanup',
  { seconds: 30 },
  internal.dashboardPresence.cleanupExpired,
);

export default crons;
