// Stationing tests (T2.5 · T2.6 · T2.7 · T2.8).
//
// Every fixture is a real git repository in a mktemp dir — the gate under test IS
// git state (committed-on-default-branch), so faking it would test nothing.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, copyFile, appendFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  station,
  validateStationing,
  recordStationing,
  verifyReceipt,
  probeLoaMount,
  snapshotAuthInputs,
  readAuthority,
  effectiveTier,
  observationsSegmentPath,
  canonicalize,
  StationError,
  TIER_ORDER,
} from '../lib/station.mjs';
import { run } from '../lib/exec.mjs';
import { EXIT } from '../lib/contract.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

const MANIFEST = `schema_version: "1.0"
region: fixture-region
maintainers:
  - "@fixture"
outcomes:
  - id: fixture-outcome
    description: "the fixture stays coherent"
scopes:
  - "src/**"
loadout:
  - construct: saaty
    outcomes: [fixture-outcome]
    authority_tier: observe
  - construct: gecko
    outcomes: [fixture-outcome]
    authority_tier: gate
`;

async function gitIn(dir, args) {
  const res = await run('git', args, { cwd: dir, allowNonZero: true });
  if (res.exitCode !== 0) throw new Error(`git ${args.join(' ')} failed: ${res.stderr}`);
  return res.stdout.trim();
}

async function commitAll(dir, message) {
  await gitIn(dir, ['add', '-A']);
  await gitIn(dir, ['-c', 'user.email=fixture@test', '-c', 'user.name=fixture', 'commit', '-q', '-m', message]);
}

/**
 * A fixture region: git repo + territory manifest + (optionally) the audit
 * substrate. `mount: 'stub'` creates empty marker files (enough for the probe);
 * `mount: 'real'` copies the actual audit validator so verify-chain runs.
 */
async function makeRegion({ manifest = MANIFEST, mount = 'stub', commit = true } = {}) {
  const dir = await mkdtemp(path.join(tmpdir(), 'station-fixture-'));
  await gitIn(dir, ['init', '-q']);
  await gitIn(dir, ['symbolic-ref', 'HEAD', 'refs/heads/main']);

  await mkdir(path.join(dir, 'grimoires'), { recursive: true });
  await writeFile(path.join(dir, 'grimoires', 'territory.yaml'), manifest);

  if (mount === 'stub' || mount === 'real') {
    await mkdir(path.join(dir, '.claude', 'scripts'), { recursive: true });
    await mkdir(path.join(dir, 'lib'), { recursive: true });
    if (mount === 'real') {
      await copyFile(path.join(REPO_ROOT, '.claude', 'scripts', 'audit-envelope.sh'), path.join(dir, '.claude', 'scripts', 'audit-envelope.sh'));
      await copyFile(path.join(REPO_ROOT, '.claude', 'scripts', 'compat-lib.sh'), path.join(dir, '.claude', 'scripts', 'compat-lib.sh'));
      await copyFile(path.join(REPO_ROOT, 'lib', 'jcs.sh'), path.join(dir, 'lib', 'jcs.sh'));
    } else {
      await writeFile(path.join(dir, '.claude', 'scripts', 'audit-envelope.sh'), '# stub\n');
      await writeFile(path.join(dir, 'lib', 'jcs.sh'), '# stub\n');
    }
  }

  if (commit) await commitAll(dir, 'fixture: region genesis');
  return dir;
}

const rejectsStation = (promise, exitCode, messageRe) =>
  assert.rejects(promise, (err) => {
    assert.ok(err instanceof StationError, `expected StationError, got ${err?.name}: ${err?.message}`);
    assert.equal(err.exitCode, exitCode, `exit ${err.exitCode} ≠ ${exitCode}: ${err.message}`);
    if (messageRe) assert.match(err.message + (err.fix ?? ''), messageRe);
    return true;
  });

// ── T2.7 · the mount precondition guards the door ─────────────────────────────

test('station: unmounted region → exit 3, names mount-loa.sh, no partial write', async () => {
  const dir = await makeRegion({ mount: 'none' });
  await rejectsStation(
    station({ slug: 'saaty', region: 'fixture-region', regionRoot: dir }),
    EXIT.REFUSED,
    /mount-loa\.sh/
  );
  // No partial write: the receipts tree must not exist at all.
  await assert.rejects(readdir(path.join(dir, 'grimoires', 'loa', 'territory', 'receipts')));
});

test('probeLoaMount names exactly what is missing', async () => {
  const dir = await makeRegion({ mount: 'none' });
  const probe = await probeLoaMount(dir);
  assert.equal(probe.mounted, false);
  assert.deepEqual(probe.missing.sort(), ['.claude/scripts/audit-envelope.sh', 'lib/jcs.sh']);
});

// ── T2.5 · validation gates ───────────────────────────────────────────────────

test('station: ratified stationing validates clean', async () => {
  const dir = await makeRegion();
  const v = await validateStationing({ slug: 'saaty', region: 'fixture-region', regionRoot: dir });
  assert.equal(v.ratified, true);
  assert.deepEqual(v.blockers, []);
  assert.match(v.snapshot.manifest_hash, /^sha256:[0-9a-f]{64}$/);
  assert.match(v.snapshot.head, /^[0-9a-f]{40}$/);
  assert.equal(v.snapshot.default_branch, 'main');
  assert.equal(v.snapshot.l4_ledger_tip, 'absent');
});

test('station: uncommitted manifest edit → dry-run only; the write refuses', async () => {
  const dir = await makeRegion();
  await appendFile(path.join(dir, 'grimoires', 'territory.yaml'), '# worktree-only edit\n');

  const report = await station({ slug: 'saaty', region: 'fixture-region', regionRoot: dir, dryRun: true });
  assert.equal(report.mode, 'dry-run');
  assert.equal(report.ratified, false);
  assert.match(report.blockers.join(' '), /uncommitted/);

  await rejectsStation(
    station({ slug: 'saaty', region: 'fixture-region', regionRoot: dir }),
    EXIT.REFUSED,
    /not ratified/
  );
});

test('station: non-default branch → refused with a teaching error', async () => {
  const dir = await makeRegion();
  await gitIn(dir, ['checkout', '-q', '-b', 'feature/tangent']);
  await rejectsStation(
    station({ slug: 'saaty', region: 'fixture-region', regionRoot: dir }),
    EXIT.REFUSED,
    /default branch/
  );
});

test('station: foreign manifest → exit 3, never authors another region', async () => {
  const dir = await makeRegion();
  await rejectsStation(
    station({ slug: 'saaty', region: 'some-other-region', regionRoot: dir }),
    EXIT.REFUSED,
    /foreign/
  );
});

test('station: construct absent from the loadout → caller error naming the fix', async () => {
  const dir = await makeRegion();
  await rejectsStation(
    station({ slug: 'not-stationed', region: 'fixture-region', regionRoot: dir }),
    EXIT.CALLER_ERROR,
    /loadout/
  );
});

// ── T2.6 · receipts ───────────────────────────────────────────────────────────

test('receipt: written content-addressed, verifies standalone, idempotent re-write', async () => {
  const dir = await makeRegion();
  const first = await station({ slug: 'saaty', region: 'fixture-region', regionRoot: dir });
  assert.equal(first.mode, 'recorded');
  assert.equal(first.idempotent, false);
  assert.match(path.basename(first.receipt_path), /^[0-9a-f]{64}\.json$/);

  const verdict = await verifyReceipt(first.receipt_path);
  assert.equal(verdict.valid, true, verdict.problems.join('; '));
  assert.equal(verdict.payload.construct, 'saaty');
  assert.equal(verdict.payload.authority_tier, 'observe');

  // Same content again (SOURCE_DATE_EPOCH pins ts) → idempotent, one file.
  process.env.SOURCE_DATE_EPOCH = '1752300000';
  try {
    const a = await station({ slug: 'saaty', region: 'fixture-region', regionRoot: dir });
    const b = await station({ slug: 'saaty', region: 'fixture-region', regionRoot: dir });
    assert.equal(a.receipt_path, b.receipt_path);
    assert.equal(b.idempotent, true);
  } finally {
    delete process.env.SOURCE_DATE_EPOCH;
  }
});

test('receipt: tampered file fails standalone verification', async () => {
  const dir = await makeRegion();
  const { receipt_path } = await station({ slug: 'saaty', region: 'fixture-region', regionRoot: dir });
  const doc = JSON.parse(await readFile(receipt_path, 'utf8'));
  doc.authority_tier = 'gate'; // the forgery this model exists to catch
  await writeFile(receipt_path, `${canonicalize(doc)}\n`);
  const verdict = await verifyReceipt(receipt_path);
  assert.equal(verdict.valid, false);
  assert.match(verdict.problems.join(' '), /content-address mismatch/);
});

test('receipt: TOCTOU — any snapshot input changed between validate and write → refused', async () => {
  const dir = await makeRegion();
  const validation = await validateStationing({ slug: 'saaty', region: 'fixture-region', regionRoot: dir });

  // The race: a new commit lands (HEAD moves, manifest re-ratified) after validate.
  await appendFile(path.join(dir, 'grimoires', 'territory.yaml'), '# racing edit\n');
  await commitAll(dir, 'racing commit');

  await rejectsStation(recordStationing(validation), EXIT.REFUSED, /changed between validate and write/);
});

test('receipt: two divergent clones merge conflict-free and both verify', async () => {
  const origin = await makeRegion();
  const cloneA = await mkdtemp(path.join(tmpdir(), 'station-clone-a-'));
  const cloneB = await mkdtemp(path.join(tmpdir(), 'station-clone-b-'));
  await gitIn(origin, ['clone', '-q', origin, path.join(cloneA, 'r')]);
  await gitIn(origin, ['clone', '-q', origin, path.join(cloneB, 'r')]);
  const a = path.join(cloneA, 'r');
  const b = path.join(cloneB, 'r');

  // Divergent acts: different constructs, different clones, no coordination.
  const ra = await station({ slug: 'saaty', region: 'fixture-region', regionRoot: a });
  const rb = await station({ slug: 'gecko', region: 'fixture-region', regionRoot: b });
  await commitAll(a, 'station saaty');
  await commitAll(b, 'station gecko');

  // Merge B into A: two added files, no shared JSONL, no chain — nothing conflicts.
  await gitIn(a, ['remote', 'add', 'peer', b]);
  await gitIn(a, ['fetch', '-q', 'peer']);
  await gitIn(a, ['-c', 'user.email=fixture@test', '-c', 'user.name=fixture', 'merge', '-q', '--no-edit', 'peer/main']);

  const receiptsDir = path.join(a, 'grimoires', 'loa', 'territory', 'receipts');
  const files = (await readdir(receiptsDir)).filter((f) => f.endsWith('.json'));
  assert.equal(files.length, 2);
  for (const f of files) {
    const verdict = await verifyReceipt(path.join(receiptsDir, f));
    assert.equal(verdict.valid, true, `${f}: ${verdict.problems.join('; ')}`);
  }
  assert.ok(ra.receipt_hash !== rb.receipt_hash);
});

test('observations: per-actor segments — one writer per file, sanitized name', () => {
  const p = observationsSegmentPath('/region', 'saaty');
  assert.equal(p, path.join('/region', 'grimoires', 'loa', 'territory', 'observations', 'saaty.jsonl'));
  assert.match(observationsSegmentPath('/region', 'weird/../actor'), /weird-\.\.-actor\.jsonl$/);
});

// ── T2.8 · authority: verify-or-observe ───────────────────────────────────────

test('authority: no ledger → earned observe (birth tier), chain absent', async () => {
  const dir = await makeRegion();
  const a = await readAuthority({ regionRoot: dir, region: 'fixture-region', construct: 'saaty' });
  assert.deepEqual(a, { earned: 'observe', chain: 'absent', in_cooldown_until: null });
});

test('authority: tampered ledger → authority unknown, never a tier', async () => {
  const dir = await makeRegion({ mount: 'real' });
  await mkdir(path.join(dir, '.run'), { recursive: true });
  // A forged ledger claiming gate — prev_hash chain cannot verify.
  const forged = [
    JSON.stringify({ prev_hash: 'GENESIS', event_type: 'trust.grant', payload: { scope: 'fixture-region', capability: 'station/saaty', actor: 'saaty', to_tier: 'gate' } }),
    JSON.stringify({ prev_hash: 'not-a-real-hash', event_type: 'trust.grant', payload: { scope: 'fixture-region', capability: 'station/saaty', actor: 'saaty', to_tier: 'gate' } }),
  ].join('\n');
  await writeFile(path.join(dir, '.run', 'trust-ledger.jsonl'), `${forged}\n`);

  const a = await readAuthority({ regionRoot: dir, region: 'fixture-region', construct: 'saaty' });
  assert.equal(a.earned, 'unknown');
  assert.equal(a.chain, 'unverified');
});

test('authority: enforcement matrix — effective = min(earned, ceiling); earned > ceiling impossible', () => {
  const tiers = ['observe', 'advise', 'gate'];
  for (const ceiling of tiers) {
    for (const earned of [...tiers, 'unknown']) {
      const eff = effectiveTier(earned, ceiling);
      assert.ok(TIER_ORDER[eff] <= TIER_ORDER[ceiling], `effective ${eff} exceeds ceiling ${ceiling}`);
      if (earned === 'unknown') assert.equal(eff, 'observe', 'unknown must be treated as observe');
    }
  }
  assert.equal(effectiveTier('gate', 'observe'), 'observe');
  assert.equal(effectiveTier('advise', 'gate'), 'advise');
});

test('authority: display-only this cycle — the receipt records the ceiling, never the earned tier', async () => {
  const dir = await makeRegion();
  const { payload } = await station({ slug: 'gecko', region: 'fixture-region', regionRoot: dir });
  // gecko's manifest ceiling is gate; with no ledger its earned tier is observe.
  // The receipt must carry the CEILING (declared fact), not the earned tier —
  // and nothing in the write path branched on earned.
  assert.equal(payload.authority_tier, 'gate');
  const a = await readAuthority({ regionRoot: dir, region: 'fixture-region', construct: 'gecko' });
  assert.equal(a.earned, 'observe');
});

// ── snapshot shape ────────────────────────────────────────────────────────────

test('snapshot: carries all four authorization inputs', async () => {
  const dir = await makeRegion();
  const snap = await snapshotAuthInputs(dir);
  assert.deepEqual(
    Object.keys(snap).filter((k) => !k.startsWith('_')).sort(),
    ['default_branch', 'head', 'l4_ledger_tip', 'manifest_hash']
  );
});
