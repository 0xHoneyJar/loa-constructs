/**
 * Registry loader tests — T-1.11a.
 * Cycle: constructs-network-migration
 * Acceptance gate (sprint plan): Cold-start path tested via integration test ·
 *   interval refresh proven · Zod regression detection emits Verdict severity:high ·
 *   failure modes per AC-1.4: cold-start (cache file present) / GitHub outage
 *   (timeout 5s · serve stale) / malformed update (Zod fail · keep prev cache)
 *   / stale cache recovery (next interval reattempt).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { RegistryLoader } from './registry-loader.js';

// Mock the logger so we can assert on schema-regression Verdict emission.
vi.mock('./logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
  },
}));

// Pull the mock in for assertions.
import { logger } from './logger.js';

const SAMPLE_YAML = `version: 1
constructs:
  artisan:
    git_url: https://github.com/0xHoneyJar/construct-artisan.git
    description: Taste made measurable
    category: design
    author: 0xHoneyJar
  beehive:
    git_url: https://github.com/0xHoneyJar/construct-beehive.git
    description: User research + feedback pipeline
    category: analytics
    author: 0xHoneyJar
`;

const FRESH_YAML = `version: 1
constructs:
  artisan:
    git_url: https://github.com/0xHoneyJar/construct-artisan.git
    description: Taste made measurable
    category: design
    author: 0xHoneyJar
  beehive:
    git_url: https://github.com/0xHoneyJar/construct-beehive.git
    description: User research + feedback pipeline
    category: analytics
    author: 0xHoneyJar
  k-hole:
    git_url: https://github.com/0xHoneyJar/construct-k-hole.git
    description: Deep research engine
    category: analytics
    author: 0xHoneyJar
`;

const MALFORMED_YAML = `version: 1
constructs:
  artisan:
    git_url: NOT-A-URL
    description: ""
    category: design
    author: 0xHoneyJar
`;

function setupSeed(dir: string, body: string): { seedPath: string; seedHashPath: string } {
  mkdirSync(dir, { recursive: true });
  const seedPath = join(dir, 'registry.yaml');
  const seedHashPath = join(dir, 'registry.yaml.sha256');
  writeFileSync(seedPath, body, 'utf8');
  const hash = createHash('sha256').update(body).digest('hex');
  writeFileSync(seedHashPath, hash, 'utf8');
  return { seedPath, seedHashPath };
}

function mkResponse(body: string, init: ResponseInit = {}): Response {
  return new Response(body, { status: 200, ...init });
}

describe('RegistryLoader.boot — cold-start guard', () => {
  let tmp: string;
  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'registry-loader-test-'));
    vi.clearAllMocks();
  });
  afterEach(() => {
    // tmp is auto-cleaned by os; skip explicit unlink for speed
  });

  it('seeds from disk when fetch succeeds (then promotes to fresh)', async () => {
    const { seedPath, seedHashPath } = setupSeed(tmp, SAMPLE_YAML);
    const fetchImpl = vi.fn().mockResolvedValue(mkResponse(FRESH_YAML, { headers: { etag: 'W/"abc"' } }));

    const loader = new RegistryLoader({
      seedPath,
      seedHashPath,
      fetchImpl,
      refreshIntervalMs: 0,
    });
    const state = await loader.boot();

    expect(state.source).toBe('fresh');
    expect(state.entries.size).toBe(3);
    expect(state.entries.get('k-hole')?.category).toBe('analytics');
    expect(state.etag).toBe('W/"abc"');
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it('serves cold-start seed when GitHub fetch fails', async () => {
    const { seedPath, seedHashPath } = setupSeed(tmp, SAMPLE_YAML);
    const fetchImpl = vi.fn().mockRejectedValue(new Error('ENOTFOUND raw.githubusercontent.com'));

    const loader = new RegistryLoader({
      seedPath,
      seedHashPath,
      fetchImpl,
      refreshIntervalMs: 0,
    });
    const state = await loader.boot();

    expect(state.source).toBe('cold-start');
    expect(state.entries.size).toBe(2);
    expect(state.entries.get('artisan')?.author).toBe('0xHoneyJar');
  });

  it('fails loud when seed integrity hash does not match', async () => {
    const dir = tmp;
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'registry.yaml'), SAMPLE_YAML);
    writeFileSync(join(dir, 'registry.yaml.sha256'), 'wronghash', 'utf8');

    const loader = new RegistryLoader({
      seedPath: join(dir, 'registry.yaml'),
      seedHashPath: join(dir, 'registry.yaml.sha256'),
      fetchImpl: vi.fn(),
      refreshIntervalMs: 0,
    });

    await expect(loader.boot()).rejects.toThrow(/integrity check failed/);
  });

  it('throws when seed file is missing', async () => {
    const loader = new RegistryLoader({
      seedPath: join(tmp, 'does-not-exist.yaml'),
      seedHashPath: join(tmp, 'does-not-exist.sha256'),
      fetchImpl: vi.fn(),
      refreshIntervalMs: 0,
    });
    await expect(loader.boot()).rejects.toThrow(/cold-start seed missing/);
  });
});

describe('RegistryLoader.refresh — fetch lifecycle', () => {
  let tmp: string;
  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'registry-loader-test-'));
    vi.clearAllMocks();
  });

  it('promotes Zod-valid fetch to fresh', async () => {
    const { seedPath, seedHashPath } = setupSeed(tmp, SAMPLE_YAML);
    const fetchImpl = vi.fn().mockResolvedValue(mkResponse(FRESH_YAML));

    const loader = new RegistryLoader({ seedPath, seedHashPath, fetchImpl, refreshIntervalMs: 0 });
    const state = await loader.boot();

    expect(state.source).toBe('fresh');
    expect(state.entries.size).toBe(3);
  });

  it('keeps cache + emits high-severity log on Zod schema regression', async () => {
    const { seedPath, seedHashPath } = setupSeed(tmp, SAMPLE_YAML);
    const fetchImpl = vi.fn().mockResolvedValue(mkResponse(MALFORMED_YAML));

    const loader = new RegistryLoader({ seedPath, seedHashPath, fetchImpl, refreshIntervalMs: 0 });
    const state = await loader.boot();

    expect(state.source).toBe('stale');
    // Cache entries unchanged from cold-start.
    expect(state.entries.size).toBe(2);
    // Verdict severity:high message emitted per SDD §2.1.3 step 4.
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        msg: expect.stringContaining('Verdict severity:high'),
      }),
    );
  });

  it('handles 304 Not Modified by refreshing fetched_at and keeping entries', async () => {
    const { seedPath, seedHashPath } = setupSeed(tmp, SAMPLE_YAML);
    let call = 0;
    const fetchImpl = vi.fn().mockImplementation(() => {
      call++;
      // First call: 200 with fresh content + ETag. Second call: 304.
      if (call === 1) return Promise.resolve(mkResponse(FRESH_YAML, { headers: { etag: 'W/"v1"' } }));
      // 304 is a null-body status per WHATWG fetch spec.
      return Promise.resolve(new Response(null, { status: 304 }));
    });

    const loader = new RegistryLoader({ seedPath, seedHashPath, fetchImpl, refreshIntervalMs: 0 });
    await loader.boot();
    const before = loader.getRegistry();
    expect(before.source).toBe('fresh');
    expect(before.entries.size).toBe(3);

    // wait a tick so fetched_at can change
    await new Promise((r) => setTimeout(r, 5));
    const after = await loader.refresh();

    expect(after.entries.size).toBe(3);
    expect(after.fetched_at).not.toBe(before.fetched_at);
    // Second call should have sent If-None-Match
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const [, init] = fetchImpl.mock.calls[1];
    expect((init as RequestInit).headers).toMatchObject({ 'If-None-Match': 'W/"v1"' });
  });

  it('marks state stale on non-2xx HTTP response', async () => {
    const { seedPath, seedHashPath } = setupSeed(tmp, SAMPLE_YAML);
    const fetchImpl = vi.fn().mockResolvedValue(new Response('Not Found', { status: 404 }));

    const loader = new RegistryLoader({ seedPath, seedHashPath, fetchImpl, refreshIntervalMs: 0 });
    const state = await loader.boot();

    expect(state.source).toBe('stale');
    expect(state.entries.size).toBe(2);
  });

  it('aborts fetch on timeout and keeps cache', async () => {
    const { seedPath, seedHashPath } = setupSeed(tmp, SAMPLE_YAML);
    // Hang forever — AbortController should kill it.
    const fetchImpl = vi.fn().mockImplementation((_url, init) => {
      return new Promise((_resolve, reject) => {
        const signal = (init as RequestInit).signal as AbortSignal | undefined;
        signal?.addEventListener('abort', () => {
          const err = new Error('aborted');
          err.name = 'AbortError';
          reject(err);
        });
      });
    });

    const loader = new RegistryLoader({
      seedPath,
      seedHashPath,
      fetchImpl,
      refreshIntervalMs: 0,
      fetchTimeoutMs: 50,
    });
    const state = await loader.boot();

    // Fetch failed → boot fell back to cold-start seed.
    expect(state.source).toBe('cold-start');
    expect(state.entries.size).toBe(2);
  });

  it('refresh(commit_sha) pins URL to specific SHA (webhook integrity path · FR-1.6.4)', async () => {
    const { seedPath, seedHashPath } = setupSeed(tmp, SAMPLE_YAML);
    // Each fetch must return a fresh Response — they're single-use.
    const fetchImpl = vi.fn().mockImplementation(() => Promise.resolve(mkResponse(FRESH_YAML)));

    const loader = new RegistryLoader({
      seedPath,
      seedHashPath,
      fetchImpl,
      refreshIntervalMs: 0,
      fetchUrl: 'https://raw.githubusercontent.com/0xHoneyJar/loa-constructs/main/registry.yaml',
    });
    await loader.boot();
    fetchImpl.mockClear();

    await loader.refresh('abc1234');

    const [url] = fetchImpl.mock.calls[0];
    expect(url).toBe(
      'https://raw.githubusercontent.com/0xHoneyJar/loa-constructs/abc1234/registry.yaml',
    );
  });
});

describe('RegistryLoader recovery — stale → fresh', () => {
  let tmp: string;
  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'registry-loader-test-'));
    vi.clearAllMocks();
  });

  it('recovers to fresh on next interval after a transient failure', async () => {
    const { seedPath, seedHashPath } = setupSeed(tmp, SAMPLE_YAML);
    let call = 0;
    const fetchImpl = vi.fn().mockImplementation(() => {
      call++;
      if (call === 1) return Promise.reject(new Error('transient network blip'));
      return Promise.resolve(mkResponse(FRESH_YAML));
    });

    const loader = new RegistryLoader({ seedPath, seedHashPath, fetchImpl, refreshIntervalMs: 0 });
    const boot = await loader.boot();
    expect(boot.source).toBe('cold-start');
    expect(boot.entries.size).toBe(2);

    const recovered = await loader.refresh();
    expect(recovered.source).toBe('fresh');
    expect(recovered.entries.size).toBe(3);
  });
});

describe('RegistryLoader.health and getEntry', () => {
  let tmp: string;
  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'registry-loader-test-'));
    vi.clearAllMocks();
  });

  it('returns health snapshot after boot', async () => {
    const { seedPath, seedHashPath } = setupSeed(tmp, SAMPLE_YAML);
    const fetchImpl = vi.fn().mockResolvedValue(mkResponse(FRESH_YAML));

    const loader = new RegistryLoader({ seedPath, seedHashPath, fetchImpl, refreshIntervalMs: 0 });
    await loader.boot();

    const h = loader.health();
    expect(h.source).toBe('fresh');
    expect(h.entries_count).toBe(3);
    expect(typeof h.last_updated).toBe('string');
  });

  it('getEntry resolves slug to entry', async () => {
    const { seedPath, seedHashPath } = setupSeed(tmp, FRESH_YAML);
    const fetchImpl = vi.fn().mockRejectedValue(new Error('no network'));

    const loader = new RegistryLoader({ seedPath, seedHashPath, fetchImpl, refreshIntervalMs: 0 });
    await loader.boot();

    expect(loader.getEntry('k-hole')?.description).toBe('Deep research engine');
    expect(loader.getEntry('does-not-exist')).toBeUndefined();
  });
});
