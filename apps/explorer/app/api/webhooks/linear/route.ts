import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getConvexClient } from '@/lib/convex/server';
import { api } from '@/convex/_generated/api';

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

  // Timing-safe comparison (MEDIUM-002)
  try {
    const sigBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    if (
      sigBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
    ) {
      return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
    }
  } catch {
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

  // Sync status back to Convex via public action (HIGH-003)
  const convex = getConvexClient();
  const writeKey = process.env.CONVEX_WRITE_KEY;
  if (convex && writeKey) {
    try {
      await convex.action(api.signals.patchFromLinearWebhook, {
        writeKey,
        linearIssueId: issueId,
        status: stateName,
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
