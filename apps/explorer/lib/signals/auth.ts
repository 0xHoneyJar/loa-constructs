import crypto from 'crypto';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

// In-memory key validation cache (SHA256 of full key → { appSlug, validatedAt })
type KeyCacheEntry = { appSlug: string; validatedAt: number };
const keyCache = new Map<string, KeyCacheEntry>();
const KEY_CACHE_TTL_MS = 60_000; // 60s
const KEY_CACHE_MAX_ENTRIES = 5_000;

// Origin validation — allowed origins per app (no localhost: portless handles local dev)
const ALLOWED_ORIGINS: Record<string, string[]> = {
  'midi-interface': ['https://midi.0xhoneyjar.xyz'],
  'mibera-honeyroad': ['https://honeyroad.xyz', 'https://mibera.0xhoneyjar.xyz'],
  'set-and-forgetti': ['https://app.setandforgetti.io'],
  'apdao-auction-house': ['https://apiologydao.0xhoneyjar.xyz'],
  'mcv-interface': ['https://moneycomb.0xhoneyjar.xyz'],
  'cubquests-interface': ['https://cubquests.com', 'https://cubquests.0xhoneyjar.xyz'],
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

/**
 * Validate an API key against Convex, with in-memory SHA256 cache.
 * Returns { appSlug } on success, null on invalid key.
 * Throws on transport/server errors.
 */
export async function validateSignalKey(
  convex: ConvexHttpClient,
  apiKey: string,
): Promise<{ appSlug: string } | null> {
  const prefix = apiKey.substring(0, 12);
  const now = Date.now();

  pruneKeyCache(now);

  const hash = cacheKeyHash(apiKey);
  const cached = keyCache.get(hash);
  if (cached && now - cached.validatedAt < KEY_CACHE_TTL_MS) {
    return { appSlug: cached.appSlug };
  }

  const result = await convex.action(api.signals.verifySignalKey, {
    keyPrefix: prefix,
    rawKey: apiKey,
  });

  if (!result) return null;

  keyCache.set(hash, {
    appSlug: result.appSlug,
    validatedAt: now,
  });

  return { appSlug: result.appSlug };
}

/**
 * Validate request origin against allowed origins for the app.
 * Returns true if origin is allowed or if no origin header (server-side caller).
 * Deny-by-default: apps not in ALLOWED_ORIGINS are rejected.
 */
export function validateOrigin(appSlug: string, origin: string): boolean {
  // Server-side callers (SDKs, cron jobs) legitimately omit Origin/Referer.
  // API key is the primary auth; origin check is defense-in-depth for browser CSRF.
  if (origin === '') return true;

  const allowedOrigins = ALLOWED_ORIGINS[appSlug];
  if (!allowedOrigins) return false; // Deny-by-default for unknown apps

  // Parse to canonical origin to prevent prefix-matching bypasses
  try {
    const parsed = new URL(origin).origin;
    return allowedOrigins.includes(parsed);
  } catch {
    return false;
  }
}
