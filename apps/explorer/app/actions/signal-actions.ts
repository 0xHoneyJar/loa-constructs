'use server';

import { getConvexClient } from '@/lib/convex/server';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';

export async function updateSignalStatus(
  signalId: string,
  status: string,
  note?: string,
) {
  const convex = getConvexClient();
  const writeKey = process.env.CONVEX_WRITE_KEY;
  if (!convex || !writeKey) throw new Error('not configured');

  await convex.action(api.signals.updateStatusFromDashboard, {
    writeKey,
    signalId: signalId as Id<'signals'>,
    status,
    resolutionNote: note,
  });
}

export async function escalateSignal(signalId: string) {
  const convex = getConvexClient();
  const writeKey = process.env.CONVEX_WRITE_KEY;
  if (!convex || !writeKey) throw new Error('not configured');

  await convex.action(api.signals.escalate, {
    writeKey,
    signalId: signalId as Id<'signals'>,
  });
}
