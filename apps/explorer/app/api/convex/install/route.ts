import { NextRequest, NextResponse } from 'next/server';
import { getConvexClient } from '@/lib/convex/server';
import { api } from '@/convex/_generated/api';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const writeKey = process.env.CONVEX_WRITE_KEY;

  if (!writeKey || authHeader !== `Bearer ${writeKey}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const convex = getConvexClient();
  if (!convex) {
    return NextResponse.json({ error: 'convex not configured' }, { status: 503 });
  }

  const body = await req.json();
  await convex.mutation(api.installEvents.record, {
    writeKey,
    packSlug: body.packSlug,
    packName: body.packName,
    action: body.action,
    timestamp: body.timestamp,
  });

  return NextResponse.json({ ok: true });
}
