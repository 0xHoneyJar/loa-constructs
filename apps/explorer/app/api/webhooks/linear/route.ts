import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getConvexClient } from '@/lib/convex/server';
import { internal } from '@/convex/_generated/api';

export async function POST(req: NextRequest) {
  const secret = process.env.LINEAR_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'not configured' }, { status: 500 });
  }

  // HMAC-SHA256 signature verification
  const signature = req.headers.get('linear-signature');
  const rawBody = await req.text();

  if (!signature) {
    return NextResponse.json({ error: 'missing signature' }, { status: 401 });
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  if (signature !== expectedSignature) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  let payload: LinearWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  // Only process Issue events with status changes
  if (payload.type !== 'Issue' || payload.action !== 'update') {
    return NextResponse.json({ ok: true });
  }

  const updatedFields = payload.updatedFrom;
  if (!updatedFields?.stateId) {
    // No status change
    return NextResponse.json({ ok: true });
  }

  const issueId = payload.data?.id;
  const stateName = payload.data?.state?.name;

  if (!issueId || !stateName) {
    return NextResponse.json({ ok: true });
  }

  // Sync status back to Convex
  const convex = getConvexClient();
  if (convex) {
    try {
      // Use HTTP client to call internal mutation via API
      // Since ConvexHttpClient can't call internal functions directly,
      // we'll use the signals.patchFromLinear which is already internal.
      // We need a public mutation for this.
      await fetch(`${process.env.CONVEX_URL}/api/mutation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: 'signals:patchFromLinear',
          args: { linearIssueId: issueId, status: stateName },
        }),
      });
    } catch (err) {
      console.error('[webhook/linear] Failed to sync status:', err);
    }
  }

  return NextResponse.json({ ok: true });
}

interface LinearWebhookPayload {
  type: string;
  action: string;
  data?: {
    id?: string;
    state?: { name?: string };
  };
  updatedFrom?: {
    stateId?: string;
  };
}
