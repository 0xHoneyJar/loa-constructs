import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { validateManifest, detectConflicts, atlas, where, TerritoryError, MAX_SOURCES } from '../lib/territory.mjs';

const VALID = {
  schema_version: '1.0',
  region: 'loa-constructs',
  maintainers: ['@janitooor'],
  outcomes: [{ id: 'registry-sot-coherence', description: 'the rungs agree or the disagreement is surfaced' }],
  scopes: ['packages/**', 'registry.yaml'],
  loadout: [{ construct: 'saaty', outcomes: ['registry-sot-coherence'], authority_tier: 'observe' }],
  trust: { promote_after_accepted_observations: 25, window_days: 30, cooldown_hours: 72 },
};

const clone = (o) => JSON.parse(JSON.stringify(o));

// ── validator (T2.1) ──────────────────────────────────────────────────────────

test('territory: a valid manifest passes', async () => {
  await assert.doesNotReject(validateManifest(clone(VALID)));
});

test('territory: rejects a bad region slug', async () => {
  const doc = clone(VALID);
  doc.region = 'Bad_Region';
  await assert.rejects(validateManifest(doc), (err) => {
    assert.ok(err instanceof TerritoryError);
    assert.match(err.details.join(' '), /does not match/);
    return true;
  });
});

test('territory: rejects an unknown authority tier', async () => {
  const doc = clone(VALID);
  doc.loadout[0].authority_tier = 'god';
  await assert.rejects(validateManifest(doc), (err) => {
    assert.match(err.details.join(' '), /must be one of/);
    return true;
  });
});

test('territory: rejects a scope that escapes the repo', async () => {
  const doc = clone(VALID);
  doc.scopes = ['../../etc/**'];
  await assert.rejects(validateManifest(doc), (err) => {
    assert.match(err.details.join(' '), /invalid scope/);
    return true;
  });
});

test('territory: rejects an absolute scope', async () => {
  const doc = clone(VALID);
  doc.scopes = ['/etc/passwd'];
  await assert.rejects(validateManifest(doc), TerritoryError);
});

test('territory: INTRA-region scope overlap is an error — a region must not claim one path twice', async () => {
  const doc = clone(VALID);
  doc.scopes = ['packages/**', 'packages/loa-registry/**'];
  await assert.rejects(validateManifest(doc), (err) => {
    assert.match(err.details.join(' '), /overlap within one region/);
    return true;
  });
});

test('territory: a warden may not claim an outcome the region never declared', async () => {
  const doc = clone(VALID);
  doc.loadout[0].outcomes = ['an-outcome-nobody-declared'];
  await assert.rejects(validateManifest(doc), (err) => {
    assert.match(err.details.join(' '), /does not declare/);
    return true;
  });
});

test('territory: a warden may not watch territory the region does not claim', async () => {
  const doc = clone(VALID);
  doc.loadout[0].scopes = ['some/other/place/**'];
  await assert.rejects(validateManifest(doc), (err) => {
    assert.match(err.details.join(' '), /outside the region's declared scopes/);
    return true;
  });
});

test('territory: missing required fields are named', async () => {
  await assert.rejects(validateManifest({ region: 'x' }), (err) => {
    assert.match(err.details.join(' '), /missing required property/);
    return true;
  });
});

// ── cross-region conflicts (T2.2) ─────────────────────────────────────────────

test('territory: CROSS-region overlap surfaces as a CONFLICT naming both maintainers — never auto-resolved', () => {
  const conflicts = detectConflicts([
    { region: 'alpha', maintainers: ['@a'], scopes: ['apps/**'] },
    { region: 'beta', maintainers: ['@b'], scopes: ['apps/api/**'] },
  ]);
  assert.equal(conflicts.length, 1);
  assert.deepEqual(conflicts[0].regions, ['alpha', 'beta']);
  assert.deepEqual(conflicts[0].maintainers, ['@a', '@b']);
  // Layered oversight is legitimate — the point is that a human decides, not the tool.
  assert.match(conflicts[0].note, /never auto-resolved/);
});

test('territory: disjoint regions produce no conflict', () => {
  assert.equal(
    detectConflicts([
      { region: 'alpha', scopes: ['apps/**'] },
      { region: 'beta', scopes: ['packages/**'] },
    ]).length,
    0
  );
});

// ── atlas (T2.3) ──────────────────────────────────────────────────────────────

async function fixtureRegion(name, manifest) {
  const root = await mkdtemp(path.join(tmpdir(), `territory-${name}-`));
  await mkdir(path.join(root, 'grimoires'), { recursive: true });
  await writeFile(path.join(root, 'grimoires', 'territory.yaml'), manifest, 'utf8');
  return root;
}

test('atlas: is deterministic — the same estate produces byte-identical JSON', async () => {
  const root = await fixtureRegion(
    'det',
    `schema_version: "1.0"
region: alpha
outcomes:
  - id: one
    description: the first outcome
scopes:
  - apps/**
loadout: []
`
  );
  const a = await atlas({ sources: [root] });
  const b = await atlas({ sources: [root] });
  assert.equal(JSON.stringify(a), JSON.stringify(b));
  assert.equal(a.vantage, 'operator-local');
  assert.equal(a.regions[0].region, 'alpha');
});

test('atlas: one unreachable source is reported as PARTIAL — it never aborts the whole read', async () => {
  const root = await fixtureRegion(
    'partial',
    `schema_version: "1.0"
region: alpha
outcomes:
  - id: one
    description: the first outcome
scopes:
  - apps/**
loadout: []
`
  );
  const map = await atlas({ sources: [root, '/nonexistent/region/path'] });
  // The good source still answers.
  assert.equal(map.regions.length, 1);
  // And the bad one is NAMED rather than silently dropped (HIGH-4, review pass 1:
  // a nonexistent SOURCE is a failure to see, not an undeclared region — only a
  // missing manifest on an existing source means "not declared").
  assert.equal(map.partial, true);
  assert.equal(map.failed_sources.length, 1);
  assert.match(map.failed_sources[0].error, /does not exist/);
});

test('atlas: an invalid manifest lands in failed_sources — the map degrades, it does not lie', async () => {
  const root = await fixtureRegion('bad', 'schema_version: "1.0"\nregion: Bad_Slug\noutcomes: []\nscopes: []\n');
  const map = await atlas({ sources: [root] });
  assert.equal(map.partial, true);
  assert.equal(map.failed_sources.length, 1);
  assert.match(map.failed_sources[0].error, /invalid/);
});

test('atlas: refuses an unbounded discovery set', async () => {
  const sources = Array.from({ length: MAX_SOURCES + 1 }, (_, i) => `/tmp/region-${i}`);
  await assert.rejects(atlas({ sources }), (err) => {
    assert.match(err.message, /bound of 32/);
    return true;
  });
});

test('atlas: authority is a CEILING and the effective tier is observe until L4 verifies', async () => {
  const root = await fixtureRegion(
    'auth',
    `schema_version: "1.0"
region: alpha
outcomes:
  - id: one
    description: the first outcome
scopes:
  - apps/**
loadout:
  - construct: saaty
    outcomes:
      - one
    authority_tier: gate
`
  );
  const map = await atlas({ sources: [root] });
  const warden = map.regions[0].loadout[0];
  assert.equal(warden.authority_ceiling, 'gate', 'the manifest declares the ceiling');
  assert.equal(warden.authority_earned, 'unknown', 'the earned tier comes from the L4 ledger, not the manifest');
  assert.equal(warden.authority_effective, 'observe', 'unknown authority is treated as observe — verify-or-observe');
});

// ── where (T2.4) ──────────────────────────────────────────────────────────────

test('where: nearest-scope-wins resolves nested claims', async () => {
  const root = await fixtureRegion(
    'where',
    `schema_version: "1.0"
region: alpha
maintainers:
  - "@a"
outcomes:
  - id: one
    description: the first outcome
scopes:
  - apps/**
loadout:
  - construct: gecko
    outcomes:
      - one
`
  );
  const answer = await where('apps/api/src/app.ts', { sources: [root] });
  assert.equal(answer.region, 'alpha');
  assert.deepEqual(answer.owner, ['@a']);
  assert.equal(answer.matched_scope, 'apps/**');
  assert.equal(answer.loadout[0].construct, 'gecko');
  assert.match(answer.gate, /git-permissions/);
});

test('where: an unclaimed path says so plainly', async () => {
  const root = await fixtureRegion(
    'unclaimed',
    `schema_version: "1.0"
region: alpha
outcomes:
  - id: one
    description: the first outcome
scopes:
  - apps/**
loadout: []
`
  );
  const answer = await where('somewhere/else.ts', { sources: [root] });
  assert.equal(answer.region, null);
  assert.match(answer.provenance.resolved_by, /no region claims/);
});

// ── review pass 1 regressions (engineer-feedback.md, cycle 2) ─────────────────

test('HIGH-3: the bin answers and EXITS well under the default timeout (deadline timer cleared)', async () => {
  const { run } = await import('../lib/exec.mjs');
  const BIN = new URL('../bin/constructs.mjs', import.meta.url).pathname;
  const dir = await mkdtemp(path.join(tmpdir(), 'atlas-timing-'));
  const started = Date.now();
  const res = await run(process.execPath, [BIN, 'atlas', '--json'], { cwd: dir, allowNonZero: true, timeoutMs: 20_000 });
  const wall = Date.now() - started;
  assert.equal(res.exitCode, 0, res.stderr);
  assert.ok(wall < 4000, `atlas took ${wall}ms — a lingering deadline timer is holding the event loop open`);
});

test('HIGH-4: a nonexistent source lands in failed_sources with partial:true', async () => {
  const map = await atlas({ sources: ['/definitely-not-a-real-source-dir'] });
  assert.equal(map.partial, true);
  assert.equal(map.failed_sources.length, 1);
  assert.match(map.failed_sources[0].error, /does not exist/);
});

test('HIGH-4: a permission-denied manifest is a failed source, not an undeclared region', async (t) => {
  if (typeof process.getuid === 'function' && process.getuid() === 0) {
    t.skip('root ignores file modes');
    return;
  }
  const { chmod } = await import('node:fs/promises');
  const dir = await mkdtemp(path.join(tmpdir(), 'territory-eacces-'));
  await mkdir(path.join(dir, 'grimoires'), { recursive: true });
  const file = path.join(dir, 'grimoires', 'territory.yaml');
  await writeFile(file, 'region: locked\n');
  await chmod(file, 0o000);
  try {
    const map = await atlas({ sources: [dir] });
    assert.equal(map.partial, true);
    assert.equal(map.failed_sources.length, 1);
    assert.match(map.failed_sources[0].error, /unreadable/);
  } finally {
    await chmod(file, 0o644);
  }
});

test('MEDIUM-6: the atlas says its ratification honesty out loud', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'atlas-honesty-'));
  const map = await atlas({ sources: [dir] });
  assert.equal(map.ratification_status, 'unchecked');
  assert.match(map.ratification, /unchecked/);
});
