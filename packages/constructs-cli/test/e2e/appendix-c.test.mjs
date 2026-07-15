// T3.11 — the E2E acceptance task (PRD Appendix C, goal_validation).
//
// One run proves G-1, G-2, G-3, G-4, G-5a, G-6 in sequence. A failure names
// WHICH GOAL broke — the test titles are the goal ids, so a red line in CI is
// already a triage answer.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { run } from '../../lib/exec.mjs';
import { capabilities, EXIT_CODES } from '../../lib/contract.mjs';
import { verifyObservations } from '../../lib/observe.mjs';
import { treeHash, install } from '../../lib/install.mjs';
import { verifyReceipt } from '../../lib/station.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PKG = path.resolve(HERE, '..', '..');
const REPO_ROOT = path.resolve(PKG, '..', '..');
const BIN = path.join(PKG, 'bin', 'constructs.mjs');

const cli = (args, opts = {}) =>
  run(process.execPath, [BIN, ...args], { cwd: REPO_ROOT, allowNonZero: true, timeoutMs: 30_000, ...opts });

// ── G-1 · launcher-reachable capability ───────────────────────────────────────

test('G-1: the veve declares a discoverable capability whose contract round-trips', async () => {
  const veve = JSON.parse(await readFile(path.join(PKG, 'veve.json'), 'utf8'));
  assert.equal(veve.binary.runtime, 'node');
  assert.ok(veve.vectors.length >= 6, 'at least 6 golden vectors (PRD FR-6)');
  assert.equal(veve.determinism.class, 'attestable');

  // The launcher's round-trip is `loa run constructs capabilities` — its payload
  // is exactly this, produced by the entry the veve names.
  const entry = path.join(PKG, veve.binary.entry.replace(/^\.\//, ''));
  const res = await run(process.execPath, [entry, 'capabilities', '--json'], { cwd: REPO_ROOT, timeoutMs: 20_000 });
  const payload = JSON.parse(res.stdout);
  assert.equal(payload.tool, 'constructs');
  assert.equal(payload.contract_version, capabilities().contract_version);
});

// ── G-2 · born agent-ergonomic ────────────────────────────────────────────────

test('G-2: golden vectors are byte-stable and the exit-code dictionary is honored', async () => {
  const vectors = await run(process.execPath, [path.join(PKG, 'test', 'vectors', 'run-vectors.mjs')], { cwd: PKG, timeoutMs: 60_000, allowNonZero: true });
  assert.equal(vectors.exitCode, 0, `vectors drifted:\n${vectors.stdout}\n${vectors.stderr}`);

  // Exit 0 on an empty/ok read; exit 2 on a caller error, with stdout EMPTY.
  const help = await cli(['--help']);
  assert.equal(help.exitCode, 0);
  const bad = await cli(['not-a-verb-at-all']);
  assert.equal(bad.exitCode, 2, 'unknown verb is a CALLER error');
  assert.equal(bad.stdout, '', 'stdout stays data-only — diagnostics belong on stderr');
  assert.match(bad.stderr, /error:/);

  // The dictionary published in capabilities is the one the code uses.
  const caps = JSON.parse((await cli(['capabilities', '--json'])).stdout);
  assert.deepEqual(Object.keys(caps.exit_codes), Object.keys(EXIT_CODES));

  // The scorecard + pinned rubric exist in-tree (NFR-8).
  const rubric = await readFile(path.join(REPO_ROOT, 'agent_ergonomics_audit', 'rubric.lock'), 'utf8');
  assert.match(rubric, /rubric_version: "1\.0\.0"/);
  await readFile(path.join(REPO_ROOT, 'agent_ergonomics_audit', 'scorecard.md'), 'utf8');
});

// ── G-3 · territory legibility ────────────────────────────────────────────────

test('G-3: atlas and where answer from COMPUTED territory with provenance', async () => {
  const atlas = JSON.parse((await cli(['atlas', '--json'])).stdout);
  assert.equal(atlas.vantage, 'operator-local');
  assert.ok(atlas.regions.some((r) => r.region === 'loa-constructs'), 'the self-host region is on the map');
  assert.match(atlas.ratification, /unchecked/, 'the map states what it did not verify');

  const where = JSON.parse((await cli(['where', 'packages/loa-registry', '--json'])).stdout);
  for (const field of ['zone', 'region', 'owner', 'loadout', 'gate', 'provenance']) {
    assert.ok(field in where, `where must answer ${field} (PRD G-3)`);
  }
  assert.equal(where.region, 'loa-constructs');
  assert.equal(where.provenance.vantage, 'operator-local');
});

// ── G-4 · stationing grammar ──────────────────────────────────────────────────

test('G-4: the manifest validates, station --dry-run round-trips, L4 tiers are display-only', async () => {
  const dry = await cli(['station', 'gecko', '--region', 'loa-constructs', '--dry-run', '--json']);
  assert.equal(dry.exitCode, 0, dry.stderr);
  const report = JSON.parse(dry.stdout);
  assert.equal(report.mode, 'dry-run');
  assert.equal(report.payload.authority_tier, 'observe', 'production stays observe-only this cycle');
  // Ceiling vs earned rendered SEPARATELY; unknown/unverifiable is treated as observe.
  assert.equal(report.authority.ceiling, 'observe');
  assert.ok(['observe', 'unknown'].includes(report.authority.earned));
  assert.equal(report.authority.effective, 'observe');
  // The L4 tier-up/auto-drop proof itself runs in test/l4.test.mjs against the fixture.
});

// ── G-5a · the grammar proven, producer-side ──────────────────────────────────

test('G-5a: a real governed observation exists, chain-verified, citing a declared outcome', async () => {
  const result = await verifyObservations({ regionRoot: REPO_ROOT, chainMode: 'chain-only' });
  assert.ok(result.total_rows >= 1, 'the falsifiable proof artifact (PRD FR-14)');
  for (const seg of result.segments) {
    assert.equal(seg.chain, 'verified');
    assert.deepEqual(seg.problems, []);
  }
  // …and the L6 ratification handoff is written + indexed (PRD FR-15).
  const index = await readFile(path.join(REPO_ROOT, 'grimoires', 'loa', 'handoffs', 'INDEX.md'), 'utf8');
  assert.match(index, /territory-grammar-freeside-ratification/);
});

// ── G-6 · consolidation begun ─────────────────────────────────────────────────

test('G-6: install integrity holds end-to-end and the legacy surfaces point here', async () => {
  // Install integrity vector: a tampered payload cannot land.
  const root = await mkdtemp(path.join(tmpdir(), 'appendixc-'));
  const files = [{ path: 'construct.yaml', content: Buffer.from('slug: p\n').toString('base64') }];
  await writeFile(
    path.join(root, 'registry.yaml'),
    `version: 1\n\nconstructs:\n  p:\n    git_url: https://example.invalid/p.git\n    tree_hash: ${JSON.stringify(treeHash(files))}\n`
  );
  const payload = path.join(root, 'payload.json');
  await writeFile(payload, JSON.stringify({ pack: { slug: 'p', version: '1.0.0', files } }));

  const ok = await install({ slug: 'p', root, payloadFile: payload });
  assert.equal(ok.payload.install.outcome, 'verified');
  const verdict = await verifyReceipt(ok.receipt_path);
  assert.equal(verdict.valid, true, verdict.problems.join('; '));

  await writeFile(payload, JSON.stringify({ pack: { slug: 'p', version: '1.0.0', files: [{ path: 'construct.yaml', content: Buffer.from('slug: tampered\n').toString('base64') }] } }));
  await assert.rejects(install({ slug: 'p', root, payloadFile: payload }), (err) => err.exitCode === 4);

  // The legacy npx surface prints the migration pointer — on STDERR only.
  const legacy = await run(process.execPath, [path.join(REPO_ROOT, 'packages', 'loa-registry', 'bin', 'constructs.ts'), '--version'], {
    cwd: REPO_ROOT,
    allowNonZero: true,
    timeoutMs: 30_000,
  });
  assert.match(legacy.stderr, /superseded by the `constructs` capability binary/);
  assert.ok(!legacy.stdout.includes('superseded'), 'the pointer must not contaminate stdout (Axiom 4)');
});
