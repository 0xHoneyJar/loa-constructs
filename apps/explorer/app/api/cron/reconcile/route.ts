import { NextRequest, NextResponse } from 'next/server';
import { getConvexClient } from '@/lib/convex/server';
import { api } from '@/convex/_generated/api';

const MAX_RUNTIME_MS = 50_000;

const API_BASE =
  process.env.CONSTRUCTS_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'https://api.constructs.network/v1';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const convex = getConvexClient();
  if (!convex) {
    return NextResponse.json({ error: 'convex not configured' }, { status: 503 });
  }

  const writeKey = process.env.CONVEX_WRITE_KEY;
  if (!writeKey) {
    return NextResponse.json({ error: 'write key not configured' }, { status: 503 });
  }

  const start = Date.now();
  const reconciled = 0;
  let batches = 0;

  try {
    // Get existing Convex events for deduplication
    const existingEvents = await convex.query(api.installEvents.recent, { limit: 200 });
    const _existingSlugs = new Set(
      existingEvents.map((e) => `${e.packSlug}:${e.timestamp}`),
    );

    // Fetch recent installs from Supabase via API (last 24h)
    const _since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const response = await fetch(
      `${API_BASE}/admin/analytics/installs?period=7d`,
      {
        headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
      },
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: 'failed to fetch installs', status: response.status },
        { status: 502 },
      );
    }

    // Backfill any gaps found
    // For now, the reconciliation is a placeholder that logs metrics
    // Full implementation requires the install events API to return individual events
    batches = 1;

    while (Date.now() - start < MAX_RUNTIME_MS) {
      // Time budget guard — break when no more work
      break;
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: 'reconciliation failed',
        message: error instanceof Error ? error.message : 'unknown',
        reconciled,
        batches,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ reconciled, batches });
}
