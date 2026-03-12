import { NextRequest, NextResponse } from 'next/server';
import { getConvexClient } from '@/lib/convex/server';
import { api } from '@/convex/_generated/api';
import {
  signalRequestSchema,
  sanitizeStackTrace,
  computeIncidentGroupId,
} from '@/lib/signals/validation';

// In-memory key validation cache (prefix → { appSlug, validatedAt })
const keyCache = new Map<string, { appSlug: string; validatedAt: number }>();
const KEY_CACHE_TTL_MS = 60_000; // 60s

export async function POST(req: NextRequest) {
  const convex = getConvexClient();
  if (!convex) {
    return NextResponse.json({ error: 'service unavailable' }, { status: 503 });
  }

  // Extract API key from Authorization header
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('sk_')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const apiKey = authHeader;
  const prefix = apiKey.substring(0, 12);

  // Validate key via Convex action — hash never leaves Convex (HIGH-004)
  let keyInfo: { appSlug: string } | null = null;

  const cached = keyCache.get(prefix);
  if (cached && Date.now() - cached.validatedAt < KEY_CACHE_TTL_MS) {
    keyInfo = { appSlug: cached.appSlug };
  } else {
    try {
      const result = await convex.action(api.signals.verifySignalKey, {
        keyPrefix: prefix,
        rawKey: apiKey,
      });
      if (!result) {
        return NextResponse.json({ error: 'invalid api key' }, { status: 403 });
      }
      keyInfo = { appSlug: result.appSlug };
      keyCache.set(prefix, {
        appSlug: result.appSlug,
        validatedAt: Date.now(),
      });
    } catch {
      return NextResponse.json({ error: 'key validation failed' }, { status: 500 });
    }
  }

  // Parse and validate request body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const parsed = signalRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation failed', details: parsed.error.issues },
      { status: 400 },
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
    return NextResponse.json({ error: 'server misconfigured' }, { status: 500 });
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

    return NextResponse.json(
      {
        signalId: result.signalId,
        incidentGroupId,
        status: result.deduplicated ? 'deduplicated' : 'created',
      },
      { status: 201 },
    );
  } catch (err) {
    // Differentiate error types instead of catch-all 202 (MEDIUM-003)
    const message = err instanceof Error ? err.message : '';
    if (message === 'rate limit exceeded') {
      return NextResponse.json({ error: 'rate limit exceeded' }, { status: 429 });
    }
    if (message === 'unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    // Timeout/network — fallback 202 Accepted (SDD §6.1)
    return NextResponse.json(
      { status: 'accepted', message: 'Signal queued for processing' },
      { status: 202 },
    );
  }
}
