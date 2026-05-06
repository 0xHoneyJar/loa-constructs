/**
 * Tests for yaml-source construct read path (T-1.11e).
 * Cycle: constructs-network-migration
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { RegistryLoader } from '../lib/registry-loader.js';
import {
  listConstructsFromRegistry,
  getConstructBySlugFromRegistry,
  mapRegistryEntryToConstruct,
} from './constructs-yaml.js';

vi.mock('../lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
  },
}));

const SAMPLE_YAML = `version: 1
constructs:
  artisan:
    git_url: https://github.com/0xHoneyJar/construct-artisan.git
    description: Taste made measurable — design physics, animation, accessibility
    category: design
    author: 0xHoneyJar
  beehive:
    git_url: https://github.com/0xHoneyJar/construct-beehive.git
    description: User research + feedback pipeline
    category: analytics
    author: 0xHoneyJar
  k-hole:
    git_url: https://github.com/0xHoneyJar/construct-k-hole.git
    description: Deep research engine — grounded search, source synthesis
    category: analytics
    author: 0xHoneyJar
`;

function setupSeed(dir: string, body: string) {
  mkdirSync(dir, { recursive: true });
  const seedPath = join(dir, 'registry.yaml');
  const seedHashPath = join(dir, 'registry.yaml.sha256');
  writeFileSync(seedPath, body, 'utf8');
  const hash = createHash('sha256').update(body).digest('hex');
  writeFileSync(seedHashPath, hash, 'utf8');
  return { seedPath, seedHashPath };
}

async function bootTestLoader(yaml: string): Promise<RegistryLoader> {
  const tmp = mkdtempSync(join(tmpdir(), 'constructs-yaml-test-'));
  const { seedPath, seedHashPath } = setupSeed(tmp, yaml);

  // Production loader contract: cold-start seed loads first, then a fetch
  // attempt. We inject a fetch that rejects so the loader stays at
  // cold-start, populated from the seed. refreshIntervalMs=0 disables
  // the timer (Vitest doesn't like leaked intervals).
  const loader = new RegistryLoader({
    seedPath,
    seedHashPath,
    fetchImpl: vi.fn().mockRejectedValue(new Error('test: no network')),
    refreshIntervalMs: 0,
  });
  await loader.boot();
  return loader;
}

describe('mapRegistryEntryToConstruct', () => {
  it('maps the 4 yaml fields to the Construct response shape with sensible defaults', () => {
    const entry = {
      slug: 'artisan',
      git_url: 'https://github.com/0xHoneyJar/construct-artisan.git',
      description: 'Taste made measurable',
      category: 'design',
      author: '0xHoneyJar',
    };
    const c = mapRegistryEntryToConstruct(entry);

    // From yaml
    expect(c.id).toBe('artisan');
    expect(c.slug).toBe('artisan');
    expect(c.name).toBe('artisan');
    expect(c.description).toBe('Taste made measurable');
    expect(c.category).toBe('design');
    expect(c.gitUrl).toBe(entry.git_url);
    expect(c.repositoryUrl).toBe(entry.git_url);
    expect(c.owner).toEqual({
      name: '0xHoneyJar',
      type: 'team',
      avatarUrl: null,
    });

    // Documented defaults
    expect(c.type).toBe('pack');
    expect(c.constructType).toBe('skill-pack');
    expect(c.tierRequired).toBe('free');
    expect(c.visibility).toBe('public');
    expect(c.verificationTier).toBe('curated');
    expect(c.maturity).toBe('stable');
    expect(c.icon).toBeNull();
    expect(c.logoMark).toBeNull();
    expect(c.downloads).toBe(0);
    expect(c.rating).toBeNull();
    expect(c.isFeatured).toBe(false);
    expect(c.manifest).toBeNull();
  });

  it('truncates long description into shortDescription (cap 80 chars + ellipsis)', () => {
    const entry = {
      slug: 'long',
      git_url: 'https://example.com/x.git',
      description: 'a'.repeat(150),
      category: 'design',
      author: '0xHoneyJar',
    };
    const c = mapRegistryEntryToConstruct(entry);
    expect(c.shortDescription?.length).toBeLessThanOrEqual(80);
    expect(c.shortDescription?.endsWith('...')).toBe(true);
    expect(c.description).toHaveLength(150); // not truncated
  });

  it('preserves short description verbatim', () => {
    const entry = {
      slug: 'short',
      git_url: 'https://example.com/x.git',
      description: 'tiny',
      category: 'design',
      author: '0xHoneyJar',
    };
    const c = mapRegistryEntryToConstruct(entry);
    expect(c.shortDescription).toBe('tiny');
  });
});

describe('listConstructsFromRegistry', () => {
  let loader: RegistryLoader;
  beforeEach(async () => {
    loader = await bootTestLoader(SAMPLE_YAML);
  });
  afterEach(() => {
    loader.stop();
  });

  it('lists all entries with default pagination', async () => {
    const result = await listConstructsFromRegistry({}, loader);
    expect(result.total).toBe(3);
    expect(result.constructs).toHaveLength(3);
    expect(result.page).toBe(1);
    expect(result.totalPages).toBe(1);
    // Alphabetical by slug
    expect(result.constructs.map((c) => c.slug)).toEqual([
      'artisan',
      'beehive',
      'k-hole',
    ]);
  });

  it('filters by category (case-insensitive)', async () => {
    const result = await listConstructsFromRegistry(
      { category: 'analytics' },
      loader,
    );
    expect(result.total).toBe(2);
    expect(result.constructs.map((c) => c.slug)).toEqual(['beehive', 'k-hole']);
  });

  it('filters by query against slug/description/category/author', async () => {
    expect(
      (await listConstructsFromRegistry({ query: 'research' }, loader)).total,
    ).toBe(2); // beehive ("User research") + k-hole ("Deep research engine")
    expect(
      (await listConstructsFromRegistry({ query: 'analytics' }, loader)).total,
    ).toBe(2);
    expect(
      (await listConstructsFromRegistry({ query: '0xhoneyjar' }, loader)).total,
    ).toBe(3);
    expect(
      (await listConstructsFromRegistry({ query: 'nope' }, loader)).total,
    ).toBe(0);
  });

  it('paginates correctly', async () => {
    const page1 = await listConstructsFromRegistry({ page: 1, limit: 2 }, loader);
    expect(page1.constructs).toHaveLength(2);
    expect(page1.totalPages).toBe(2);
    expect(page1.constructs.map((c) => c.slug)).toEqual(['artisan', 'beehive']);

    const page2 = await listConstructsFromRegistry({ page: 2, limit: 2 }, loader);
    expect(page2.constructs).toHaveLength(1);
    expect(page2.constructs[0]?.slug).toBe('k-hole');
  });

  it('caps limit at MAX_PAGE_SIZE (100)', async () => {
    const result = await listConstructsFromRegistry({ limit: 500 }, loader);
    expect(result.limit).toBe(100);
  });

  it('returns empty when type filter is paid (registry has no paid)', async () => {
    const result = await listConstructsFromRegistry({ tier: 'pro' }, loader);
    expect(result.total).toBe(0);
  });

  it('returns empty when type is non-pack (yaml is pack-only currently)', async () => {
    const result = await listConstructsFromRegistry({ type: 'skill' }, loader);
    expect(result.total).toBe(0);
  });

  it('returns empty when featured filter is set (no featured flag in yaml)', async () => {
    const result = await listConstructsFromRegistry({ featured: true }, loader);
    expect(result.total).toBe(0);
  });

  it('returns empty when loader is not booted (graceful)', async () => {
    const unbooted = new RegistryLoader({
      seedPath: '/tmp/__nonexistent__/seed.yaml',
      seedHashPath: '/tmp/__nonexistent__/seed.sha256',
      fetchImpl: vi.fn(),
      refreshIntervalMs: 0,
    });
    // Don't call boot — getRegistry() throws → service catches → returns empty.
    const result = await listConstructsFromRegistry({}, unbooted);
    expect(result.total).toBe(0);
    expect(result.constructs).toEqual([]);
  });
});

describe('getConstructBySlugFromRegistry', () => {
  let loader: RegistryLoader;
  beforeEach(async () => {
    loader = await bootTestLoader(SAMPLE_YAML);
  });
  afterEach(() => {
    loader.stop();
  });

  it('returns the construct when slug exists', async () => {
    const c = await getConstructBySlugFromRegistry('k-hole', loader);
    expect(c).not.toBeNull();
    expect(c?.slug).toBe('k-hole');
    expect(c?.category).toBe('analytics');
    expect(c?.gitUrl).toBe('https://github.com/0xHoneyJar/construct-k-hole.git');
  });

  it('returns null when slug does not exist', async () => {
    const c = await getConstructBySlugFromRegistry('does-not-exist', loader);
    expect(c).toBeNull();
  });

  it('returns null when loader is not booted (graceful)', async () => {
    const unbooted = new RegistryLoader({
      seedPath: '/tmp/__nonexistent__/seed.yaml',
      seedHashPath: '/tmp/__nonexistent__/seed.sha256',
      fetchImpl: vi.fn(),
      refreshIntervalMs: 0,
    });
    const c = await getConstructBySlugFromRegistry('artisan', unbooted);
    expect(c).toBeNull();
  });
});
