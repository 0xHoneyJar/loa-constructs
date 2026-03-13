import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getConvexClient } from '@/lib/convex/server';
import { api } from '@/convex/_generated/api';
import {
  signalRequestSchema,
  sanitizeStackTrace,
  computeIncidentGroupId,
} from '@/lib/signals/validation';

// In-memory key validation cache (SHA256 of full key → { appSlug, validatedAt })
type KeyCacheEntry = { appSlug: string; validatedAt: number };
const keyCache = new Map<string, KeyCacheEntry>();
const KEY_CACHE_TTL_MS = 60_000; // 60s
const KEY_CACHE_MAX_ENTRIES = 5_000;

// Origin validation — allowed origins per app (SDD §4.1, Sprint 1.5)
const ALLOWED_ORIGINS: Record<string, string[]> = {
  'midi-interface': ['https://mibera.xyz', 'http://localhost:3000'],
  'mibera-honeyroad': ['https://honeyroad.xyz', 'http://localhost:3000'],
  'set-and-forgetti': ['https://setandforgetti.com', 'http://localhost:3000'],
  'apdao-auction-house': ['https://apiology.xyz', 'http://localhost:3000'],
  'mcv-interface': ['https://moneycomb.xyz', 'http://localhost:3000'],
  'cubquests-interface': ['https://cubquests.xyz', 'http://localhost:3000'],
};

function cacheKeyHash(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

function pruneKeyCache(now: number) {
  for (const [k, v] of keyCache) {
    if (now - v.validatedAt >= KEY_CACHE_TTL_MS) keyCache.delete(k);
  }
  if (keyCache.size > KEY_CACHE_MAX_ENTRIES) {
    const oldest = [...keyCache.entries()]
      .sort((a, b) => a[1].validatedAt - b[1].validatedAt)
      .slice(0, keyCache.size - KEY_CACHE_MAX_ENTRIES);
    for (const [k] of oldest) keyCache.delete(k);
  }
}

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

  const now = Date.now();
  pruneKeyCache(now);
  const cacheKey = cacheKeyHash(apiKey);
  const cached = keyCache.get(cacheKey);

  if (cached && now - cached.validatedAt < KEY_CACHE_TTL_MS) {
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
      keyCache.set(cacheKey, {
        appSlug: result.appSlug,
        validatedAt: now,
      });
    } catch {
      return NextResponse.json({ error: 'key validation failed' }, { status: 500 });
    }
  }

  // Origin validation (SDD §4.1 — SKP-001 mitigation)
  const origin = req.headers.get('origin') || req.headers.get('referer') || '';
  const allowedOrigins = ALLOWED_ORIGINS[keyInfo.appSlug];
  if (allowedOrigins) {
    const originMatch = allowedOrigins.some(
      (allowed) => origin === allowed || origin.startsWith(allowed + '/'),
    );
    if (!originMatch && origin !== '') {
      return NextResponse.json(
        { error: 'origin not allowed for this key' },
        { status: 403 },
      );
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
    // Only 202 for known transient transport failures
    const isTransient =
      /timeout|timed out|ECONNRESET|ENOTFOUND|fetch failed|network/i.test(message);
    if (isTransient) {
      return NextResponse.json(
        { status: 'accepted', message: 'Signal accepted; downstream processing delayed' },
        { status: 202 },
      );
    }

    // Non-transient: don't fabricate success
    console.error('[api/signals] ingest failed:', err);
    return NextResponse.json({ error: 'ingestion failed' }, { status: 500 });
  }
}
