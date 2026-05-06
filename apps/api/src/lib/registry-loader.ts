/**
 * Registry yaml loader — T-1.11a (FR-1.6 core)
 * Cycle: constructs-network-migration
 * SDD: grimoires/loa/sdd-constructs-network-migration-2026-05-05.md §2.1.3
 *
 * Substrate-stable read path for the construct registry. Reads the canonical
 * yaml from raw.githubusercontent.com on boot and on a 5-min interval. Falls
 * back to a committed seed at startup so the API serves data even if GitHub
 * is unreachable. Schema-validates with Zod on every load — invalid payloads
 * never replace a valid cache.
 *
 * Per PRD v1.1 correction (2026-05-06): the canonical source is
 *   raw.githubusercontent.com/0xHoneyJar/loa-constructs/main/registry.yaml
 * NOT loa-compositions as the original SDD §2.1.3 lifecycle text said. This
 * matches the path-filtered T-1.0 webhook caller in .github/workflows/
 * registry-refresh.yml.
 *
 * Scope of T-1.11a: core loader. Webhook auth chain → T-1.11b. GH rate-limit
 * fallback to authenticated `gh api` → T-1.11c. Cache-state response headers
 * → T-1.11d. Route migration off Postgres `packs` reads → T-1.9.
 */
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve as resolvePath } from 'node:path';
import { z } from 'zod';
import yaml from 'js-yaml';
import { logger } from './logger.js';

// ----------------------------------------------------------------------------
// Schema
// ----------------------------------------------------------------------------

/**
 * Per-construct shape in registry.yaml. Matches the actual file at the repo
 * root, not the richer aspirational shape in SDD §2.1.3 line 192-204 (those
 * extended fields like install_url/version/visibility/tier come from each
 * construct's own manifest, not from the registry index).
 */
export const RegistryEntrySchema = z.object({
  git_url: z.string().url(),
  description: z.string().min(1).max(500),
  category: z.string().min(1).max(50),
  author: z.string().min(1).max(100),
});

export type RegistryEntry = z.infer<typeof RegistryEntrySchema> & { slug: string };

/**
 * Full registry document shape:
 *   version: 1
 *   constructs:
 *     <slug>: { git_url, description, category, author }
 */
export const RegistryYamlSchema = z.object({
  version: z.literal(1),
  constructs: z.record(z.string().regex(/^[a-z0-9-]+$/), RegistryEntrySchema),
});

export type RegistryYaml = z.infer<typeof RegistryYamlSchema>;

// ----------------------------------------------------------------------------
// State
// ----------------------------------------------------------------------------

export type RegistrySource = 'fresh' | 'cached' | 'stale' | 'cold-start';

export interface RegistryState {
  entries: Map<string, RegistryEntry>;
  source: RegistrySource;
  fetched_at: string;
  commit_sha: string | null;
  content_hash: string;
  etag: string | null;
}

// ----------------------------------------------------------------------------
// Loader
// ----------------------------------------------------------------------------

export interface LoaderOptions {
  /** Override default raw.gh URL (test injection) */
  fetchUrl?: string;
  /** Override default seed file path (test injection) */
  seedPath?: string;
  /** Override default seed-sha256 file path (test injection) */
  seedHashPath?: string;
  /** Override default fetch timeout in ms (test injection) */
  fetchTimeoutMs?: number;
  /** Override default refresh interval in ms (default 5min · 0 disables) */
  refreshIntervalMs?: number;
  /** Inject fetch (test mocking) */
  fetchImpl?: typeof globalThis.fetch;
}

const DEFAULT_FETCH_URL =
  'https://raw.githubusercontent.com/0xHoneyJar/loa-constructs/main/registry.yaml';
const DEFAULT_SEED_PATH = resolvePath(
  process.cwd(),
  'apps/api/.cache/registry.yaml',
);
const DEFAULT_SEED_HASH_PATH = resolvePath(
  process.cwd(),
  'apps/api/.cache/registry.yaml.sha256',
);
const DEFAULT_FETCH_TIMEOUT_MS = 5_000;
const DEFAULT_REFRESH_INTERVAL_MS = 5 * 60 * 1_000;

/**
 * GH rate-limit fallback threshold (T-1.11c · FR-1.6.6).
 * When raw.githubusercontent.com returns X-RateLimit-Remaining < this,
 * subsequent fetches add `Authorization: Bearer $GITHUB_TOKEN` so we
 * graduate from the 60-req/hour anonymous quota to the 5000-req/hour
 * authenticated quota (which Railway env already has provisioned).
 */
const RATE_LIMIT_FALLBACK_THRESHOLD = 10;

export class RegistryLoader {
  private state: RegistryState | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  /**
   * Sticky flag — once we observed a low rate-limit-remaining, all subsequent
   * fetches use Authorization. Reset only on process restart (intentional —
   * the budget resets hourly anyway).
   */
  private useAuthFallback = false;
  private readonly opts: Required<Omit<LoaderOptions, 'fetchImpl' | 'fetchUrl' | 'seedPath' | 'seedHashPath'>> & {
    fetchUrl: string;
    seedPath: string;
    seedHashPath: string;
    fetchImpl: typeof globalThis.fetch;
  };

  constructor(opts: LoaderOptions = {}) {
    this.opts = {
      fetchUrl: opts.fetchUrl ?? DEFAULT_FETCH_URL,
      seedPath: opts.seedPath ?? DEFAULT_SEED_PATH,
      seedHashPath: opts.seedHashPath ?? DEFAULT_SEED_HASH_PATH,
      fetchTimeoutMs: opts.fetchTimeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS,
      refreshIntervalMs: opts.refreshIntervalMs ?? DEFAULT_REFRESH_INTERVAL_MS,
      fetchImpl: opts.fetchImpl ?? globalThis.fetch.bind(globalThis),
    };
  }

  /** Test-only: read sticky auth-fallback state. */
  __isUsingAuthFallback(): boolean {
    return this.useAuthFallback;
  }

  /**
   * Boot lifecycle (SDD §2.1.3):
   *   1. read seed from disk (cold-start guard, integrity-checked)
   *   2. attempt fetch from raw.gh (5s timeout · fall back on fail)
   *   3. validate via Zod · on success: promote · on regression: keep seed
   *   4. start interval refresh
   */
  async boot(): Promise<RegistryState> {
    // Step 1: cold-start seed. Hash mismatch is fail-loud — a tampered or
    // corrupted seed must not silently propagate.
    const seed = this.loadSeed();
    this.state = {
      entries: new Map(seed.entries),
      source: 'cold-start',
      fetched_at: new Date().toISOString(),
      commit_sha: null,
      content_hash: seed.content_hash,
      etag: null,
    };

    // Step 2-3: try to upgrade to fresh from gh raw.
    try {
      await this.refresh();
    } catch (e) {
      logger.warn({
        msg: 'Registry: boot fetch failed, serving cold-start seed',
        error: e instanceof Error ? e.message : String(e),
      });
      // state stays as cold-start
    }

    // Step 4: schedule interval refresh (unless disabled in tests).
    if (this.opts.refreshIntervalMs > 0 && !this.timer) {
      this.timer = setInterval(() => {
        this.refresh().catch((err) => {
          logger.warn({
            msg: 'Registry: interval refresh failed',
            error: err instanceof Error ? err.message : String(err),
          });
        });
      }, this.opts.refreshIntervalMs);
      // Don't keep the event loop alive just for this tick.
      this.timer.unref?.();
    }

    return this.state;
  }

  /**
   * Pull a fresh copy from raw.gh and (if Zod validates) promote into cache.
   * Failure modes per SDD §2.1.3:
   *   - timeout: keep current cache, emit medium-severity log line
   *   - 304 Not Modified: noop, refresh fetched_at
   *   - 200 + Zod regression: keep current cache, emit high-severity Verdict
   *   - 200 + Zod success: promote
   *   - network/HTTP error: keep current cache, emit medium
   */
  async refresh(commit_sha?: string): Promise<RegistryState> {
    if (!this.state) {
      throw new Error('Registry: refresh called before boot');
    }

    const url = commit_sha
      ? this.opts.fetchUrl.replace('/main/', `/${commit_sha}/`)
      : this.opts.fetchUrl;

    const headers: Record<string, string> = {};
    if (this.state.etag && !commit_sha) {
      headers['If-None-Match'] = this.state.etag;
    }
    // T-1.11c (FR-1.6.6) — once we've seen a low rate-limit-remaining,
    // attach Bearer auth so subsequent fetches use the 5000/hr authenticated
    // quota instead of the 60/hr anonymous one.
    if (this.useAuthFallback && process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.opts.fetchTimeoutMs);
    let res: Response;
    try {
      res = await this.opts.fetchImpl(url, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    // T-1.11c (FR-1.6.6) — graduate to authenticated quota if we're close
    // to the anonymous-tier ceiling. One-shot trip: stays sticky until
    // process restart. We check on every response (200, 304, even non-2xx)
    // since GitHub returns the rate-limit headers across all status codes.
    const remaining = res.headers.get('x-ratelimit-remaining');
    if (
      remaining !== null &&
      Number.isFinite(Number(remaining)) &&
      Number(remaining) < RATE_LIMIT_FALLBACK_THRESHOLD &&
      !this.useAuthFallback
    ) {
      if (process.env.GITHUB_TOKEN) {
        this.useAuthFallback = true;
        logger.warn({
          msg: 'Registry: GH rate-limit low, switching to authenticated quota',
          remaining: Number(remaining),
        });
      } else {
        logger.warn({
          msg: 'Registry: GH rate-limit low but GITHUB_TOKEN unset (no fallback)',
          remaining: Number(remaining),
        });
      }
    }

    if (res.status === 304) {
      // Not modified — same content as last fetch. Bridgebuilder F015 closure:
      // promote source to 'fresh' since the server has affirmed our cached
      // content is still current. Previously left source as-is, which left
      // misleading 'cold-start' labels on cached content that had been
      // re-validated by GitHub.
      this.state = {
        ...this.state,
        fetched_at: new Date().toISOString(),
        source: 'fresh',
      };
      return this.state;
    }

    if (!res.ok) {
      // 5xx, 404, etc. Keep current cache, mark stale-ish.
      logger.warn({
        msg: 'Registry: non-2xx fetch, keeping cache',
        status: res.status,
        url,
      });
      this.state = { ...this.state, source: 'stale' };
      return this.state;
    }

    const body = await res.text();
    const etag = res.headers.get('etag');

    let parsed: unknown;
    try {
      parsed = yaml.load(body);
    } catch (e) {
      logger.warn({
        msg: 'Registry: yaml parse failed, keeping cache',
        error: e instanceof Error ? e.message : String(e),
      });
      this.state = { ...this.state, source: 'stale' };
      return this.state;
    }

    const validation = RegistryYamlSchema.safeParse(parsed);
    if (!validation.success) {
      // Schema regression — explicit high-severity log per SDD §2.1.3 step 4.
      logger.warn({
        msg: 'Registry: Verdict severity:high evidence:{schema_regression_detected}',
        prev_entries_count: this.state.entries.size,
        zod_issues: validation.error.issues.slice(0, 5).map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      });
      this.state = { ...this.state, source: 'stale' };
      return this.state;
    }

    const entries = entriesFromYaml(validation.data);
    const content_hash = sha256(body);

    this.state = {
      entries,
      source: 'fresh',
      fetched_at: new Date().toISOString(),
      commit_sha: commit_sha ?? null,
      content_hash,
      etag,
    };
    logger.info({
      msg: 'Registry: refreshed',
      entries: entries.size,
      content_hash,
      commit_sha: this.state.commit_sha,
    });
    return this.state;
  }

  getRegistry(): RegistryState {
    if (!this.state) {
      throw new Error('Registry: getRegistry called before boot');
    }
    return this.state;
  }

  getEntry(slug: string): RegistryEntry | undefined {
    return this.state?.entries.get(slug);
  }

  health(): { source: RegistrySource; last_updated: string; entries_count: number } {
    if (!this.state) {
      return { source: 'cold-start', last_updated: '0', entries_count: 0 };
    }
    return {
      source: this.state.source,
      last_updated: this.state.fetched_at,
      entries_count: this.state.entries.size,
    };
  }

  /** Stop the interval timer (use in tests + graceful shutdown). */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  // --------------------------------------------------------------------------
  // internals
  // --------------------------------------------------------------------------

  private loadSeed(): { entries: Map<string, RegistryEntry>; content_hash: string } {
    if (!existsSync(this.opts.seedPath)) {
      throw new Error(`Registry: cold-start seed missing at ${this.opts.seedPath}`);
    }
    const body = readFileSync(this.opts.seedPath, 'utf8');
    const content_hash = sha256(body);

    // Integrity check — committed sha256 vs computed sha256 of the seed.
    //
    // Bridgebuilder F008 disclosure: this is a CORRUPTION-DETECTION mechanism,
    // NOT cryptographic authenticity. Both the seed and the .sha256 file live
    // in the same repo, so any actor with write access can update them in
    // lockstep. The runtime fetch path uses HMAC-signed webhooks for stronger
    // guarantees; this cold-start path's tamper resistance is bounded by repo
    // ACLs + branch protection. For stronger cold-start authenticity, sign the
    // seed with the maintainer-root-pubkey at .claude/data/maintainer-root-pubkey.txt
    // (deferred to a follow-on hardening pass).
    if (existsSync(this.opts.seedHashPath)) {
      const expected = readFileSync(this.opts.seedHashPath, 'utf8').trim();
      if (expected && expected !== content_hash) {
        throw new Error(
          `Registry: cold-start seed integrity check failed (expected ${expected}, got ${content_hash})`,
        );
      }
    }

    let parsed: unknown;
    try {
      parsed = yaml.load(body);
    } catch (e) {
      throw new Error(
        `Registry: cold-start seed yaml parse failed: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
    const validation = RegistryYamlSchema.safeParse(parsed);
    if (!validation.success) {
      throw new Error(
        `Registry: cold-start seed Zod validation failed: ${validation.error.issues.map((i) => i.message).join(', ')}`,
      );
    }

    return { entries: entriesFromYaml(validation.data), content_hash };
  }
}

// ----------------------------------------------------------------------------
// helpers
// ----------------------------------------------------------------------------

function entriesFromYaml(data: RegistryYaml): Map<string, RegistryEntry> {
  const m = new Map<string, RegistryEntry>();
  for (const [slug, entry] of Object.entries(data.constructs)) {
    m.set(slug, { slug, ...entry });
  }
  return m;
}

function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

// ----------------------------------------------------------------------------
// module-level singleton (production path)
// ----------------------------------------------------------------------------

let _instance: RegistryLoader | null = null;

export function getRegistryLoader(): RegistryLoader {
  if (!_instance) {
    _instance = new RegistryLoader();
  }
  return _instance;
}

/** Test-only helper to reset the singleton between tests. */
export function __resetRegistryLoaderForTests(): void {
  _instance?.stop();
  _instance = null;
}
