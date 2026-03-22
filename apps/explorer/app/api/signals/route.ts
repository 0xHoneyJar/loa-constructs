import { NextRequest, NextResponse } from 'next/server';
import { getConvexClient } from '@/lib/convex/server';
import { api } from '@/convex/_generated/api';
import {
  signalRequestSchema,
  sanitizeStackTrace,
  computeIncidentGroupId,
} from '@/lib/signals/validation';
import { validateSignalKey, validateOrigin } from '@/lib/signals/auth';

function corsHeaders(origin: string) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin') || '';
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin') || '';
  const cors = corsHeaders(origin);
  const json = (data: unknown, status: number) =>
    NextResponse.json(data, { status, headers: cors });

  const convex = getConvexClient();
  if (!convex) {
    return json({ error: 'service unavailable' }, 503);
  }

  // Extract API key from Authorization header
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('sk_')) {
    return json({ error: 'unauthorized' }, 401);
  }

  const apiKey = authHeader;
  const prefix = apiKey.substring(0, 12);

  // Validate key via Convex (with in-memory SHA256 cache)
  let keyInfo: { appSlug: string } | null = null;
  try {
    keyInfo = await validateSignalKey(convex, apiKey);
    if (!keyInfo) {
      return json({ error: 'invalid api key' }, 403);
    }
  } catch {
    return json({ error: 'key validation failed' }, 500);
  }

  // Origin validation (server-side callers without origin are allowed)
  const reqOrigin = origin || req.headers.get('referer') || '';
  if (!validateOrigin(keyInfo.appSlug, reqOrigin)) {
    return json({ error: 'origin not allowed for this key' }, 403);
  }

  // Parse and validate request body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid json' }, 400);
  }

  const parsed = signalRequestSchema.safeParse(body);
  if (!parsed.success) {
    return json(
      { error: 'validation failed', details: parsed.error.issues },
      400,
    );
  }

  const signal = parsed.data;

  // Sanitize stack traces
  if (signal.data.type === 'error_report' && signal.data.stackTrace) {
    signal.data.stackTrace = sanitizeStackTrace(signal.data.stackTrace);
  }

  const incidentGroupId = computeIncidentGroupId(
    keyInfo.appSlug,
    signal.source,
    signal.data,
  );

  const writeKey = process.env.CONVEX_WRITE_KEY;
  if (!writeKey) {
    return json({ error: 'server misconfigured' }, 500);
  }

  // Ingest signal via Convex action (rate limiting wired inside)
  try {
    const result = await convex.action(api.signals.ingest, {
      writeKey,
      keyPrefix: prefix,
      appSlug: keyInfo.appSlug,
      source: signal.source,
      severity: signal.severity,
      title: signal.title,
      data: signal.data,
      incidentGroupId,
      timestamp: new Date().toISOString(),
    });

    return json(
      {
        signalId: result.signalId,
        incidentGroupId,
        status: result.deduplicated ? 'deduplicated' : 'created',
      },
      201,
    );
  } catch (err) {
    // Differentiate error types instead of catch-all 202 (MEDIUM-003)
    const message = err instanceof Error ? err.message : '';
    if (message === 'rate limit exceeded') {
      return json({ error: 'rate limit exceeded' }, 429);
    }
    if (message === 'unauthorized') {
      return json({ error: 'unauthorized' }, 401);
    }
    // Only 202 for known transient transport failures
    const isTransient =
      /timeout|timed out|ECONNRESET|ENOTFOUND|fetch failed|network/i.test(message);
    if (isTransient) {
      return json(
        { status: 'accepted', message: 'Signal accepted; downstream processing delayed' },
        202,
      );
    }

    // Non-transient: don't fabricate success
    console.error('[api/signals] ingest failed:', err);
    return json({ error: 'ingestion failed' }, 500);
  }
}
