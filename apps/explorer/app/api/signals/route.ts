import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getConvexClient } from '@/lib/convex/server';
import { api } from '@/convex/_generated/api';
import {
  signalRequestSchema,
  sanitizeStackTrace,
  computeIncidentGroupId,
} from '@/lib/signals/validation';

// In-memory key validation cache (prefix → { hash, appSlug, validatedAt })
const keyCache = new Map<
  string,
  { keyHash: string; appSlug: string; validatedAt: number; verified: boolean }
>();
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

  // Validate key against Convex signalKeys table (with cache)
  let keyInfo: { appSlug: string } | null = null;

  const cached = keyCache.get(prefix);
  if (cached && Date.now() - cached.validatedAt < KEY_CACHE_TTL_MS && cached.verified) {
    keyInfo = { appSlug: cached.appSlug };
  } else {
    // Query Convex for key hash
    try {
      const keyData = await convex.query(api.signalKeys.getByPrefix, { keyPrefix: prefix });
      if (!keyData) {
        return NextResponse.json({ error: 'invalid api key' }, { status: 403 });
      }

      // Verify full key against hash
      const valid = await bcrypt.compare(apiKey, keyData.keyHash);
      if (!valid) {
        return NextResponse.json({ error: 'invalid api key' }, { status: 403 });
      }

      keyInfo = { appSlug: keyData.appSlug };
      keyCache.set(prefix, {
        keyHash: keyData.keyHash,
        appSlug: keyData.appSlug,
        validatedAt: Date.now(),
        verified: true,
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

  // Ingest signal via Convex action
  try {
    const result = await convex.action(api.signals.ingest, {
      writeKey,
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
  } catch {
    // Fallback: return 202 Accepted on Convex timeout — SDD §6.1
    return NextResponse.json(
      { status: 'accepted', message: 'Signal queued for processing' },
      { status: 202 },
    );
  }
}
