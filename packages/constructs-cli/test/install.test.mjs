// Install integrity + containment (T3.1 · T3.2 · T3.3).
//
// The red-team fixtures in fixtures/redteam/ are the ONLY mechanical security
// guard for this surface while the red-team infra defect stands (NOTES.md
// BLOCKER) — every containment rule pins one, and T3.2b has a second model
// review them adversarially before the tasks close.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign as cryptoSign, createHash } from 'node:crypto';
import { mkdtemp, mkdir, writeFile, readFile, readdir, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  install,
  validateFileList,
  treeHash,
  verifyAttestation,
  attestationBytes,
  readRegistryAnchor,
  BUDGETS,
  InstallError,
} from '../lib/install.mjs';
import { verifyReceipt } from '../lib/station.mjs';
import { run } from '../lib/exec.mjs';
import { EXIT } from '../lib/contract.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REDTEAM = path.join(HERE, 'fixtures', 'redteam');

const b64 = (s) => Buffer.from(s, 'utf8').toString('base64');

const GOOD_FILES = [
  { path: 'construct.yaml', content: b64('name: goodpack\nslug: goodpack\n') },
  { path: 'skills/greet/SKILL.md', content: b64('# greet\n') },
];

async function loadRedteam(name) {
  return JSON.parse(await readFile(path.join(REDTEAM, name), 'utf8')).pack.files;
}

/** A consuming root with a registry.yaml anchoring `goodpack` to its true hash. */
async function makeRoot({ treeHashValue = null, attested = false, commit = null, gitUrl = 'https://example.invalid/x.git' } = {}) {
  const root = await mkdtemp(path.join(tmpdir(), 'install-root-'));
  const lines = [
    'version: 1',
    '',
    'constructs:',
    '  goodpack:',
    `    git_url: ${gitUrl}`,
    '    description: "fixture pack"',
  ];
  if (treeHashValue) lines.push(`    tree_hash: ${JSON.stringify(treeHashValue)}`);
  if (attested) lines.push('    attested: true');
  if (commit) lines.push(`    commit: ${JSON.stringify(commit)}`);
  await writeFile(path.join(root, 'registry.yaml'), lines.join('\n') + '\n');
  return root;
}

async function writePayload(dir, files, { attestation = null, manifest = null } = {}) {
  const file = path.join(dir, 'payload.json');
  await writeFile(file, JSON.stringify({ pack: { slug: 'goodpack', version: '1.0.0', manifest, files, ...(attestation ? { attestation } : {}) } }));
  return file;
}

const rejectsInstall = (promise, exitCode, code) =>
  assert.rejects(promise, (err) => {
    assert.ok(err instanceof InstallError, `expected InstallError, got ${err?.name}: ${err?.message}`);
    assert.equal(err.exitCode, exitCode, `exit ${err.exitCode} ≠ ${exitCode}: ${err.message}`);
    if (code) assert.equal(err.code, code, `code ${err.code} ≠ ${code}: ${err.message}`);
    return true;
  });

// ── T3.2 · containment: one red-team fixture per rule ─────────────────────────

test('redteam: traversal-shaped name rejected', async () => {
  const { problems } = validateFileList(await loadRedteam('traversal-name.json'));
  assert.match(problems.join(' '), /traversal-shaped/);
});

test('redteam: absolute path rejected', async () => {
  const { problems } = validateFileList(await loadRedteam('absolute-path.json'));
  assert.match(problems.join(' '), /absolute path/);
});

test('redteam: symlink entry rejected outright', async () => {
  const { problems } = validateFileList(await loadRedteam('symlink-entry.json'));
  assert.match(problems.join(' '), /symlink entry/);
});

test('redteam: backslash names rejected', async () => {
  const { problems } = validateFileList(await loadRedteam('backslash-name.json'));
  assert.match(problems.join(' '), /backslashes/);
});

test('redteam: duplicate paths rejected', async () => {
  const { problems } = validateFileList(await loadRedteam('duplicate-path.json'));
  assert.match(problems.join(' '), /duplicate/);
});

test('redteam: oversized single file breaches the budget', () => {
  const huge = 'A'.repeat(Math.ceil((BUDGETS.max_single_file_bytes + 1024) / 3) * 4);
  const { problems } = validateFileList([{ path: 'big.bin', content: huge }]);
  assert.match(problems.join(' '), /single-file budget/);
});

test('redteam: entry-count flood breaches the budget', () => {
  const files = Array.from({ length: BUDGETS.max_entry_count + 1 }, (_, i) => ({ path: `f${i}.md`, content: 'eA==' }));
  const { problems } = validateFileList(files);
  assert.match(problems.join(' '), /entry-count flood/);
});

test('redteam: total-bytes budget enforced across entries', () => {
  const chunk = 'A'.repeat(Math.ceil((BUDGETS.max_single_file_bytes - 1024) / 4) * 4);
  const files = Array.from({ length: 12 }, (_, i) => ({ path: `part${i}.bin`, content: chunk }));
  const { problems } = validateFileList(files);
  assert.match(problems.join(' '), /totals .* over the budget/);
});

test('zero archive-parsing code ships (asserted)', async () => {
  const src = await readFile(new URL('../lib/install.mjs', import.meta.url), 'utf8');
  // Import-specifier smells — comments legitimately SAY "tarball" while explaining why none is parsed.
  for (const smell of ["'node:zlib'", "'adm-zip'", "'extract-zip'", "'unzipper'", "'tar-stream'", "'tar-fs'", "'node-tar'"]) {
    assert.ok(!src.includes(smell), `install.mjs mentions ${smell} — the no-archive-parser invariant regressed`);
  }
});

// ── T3.1 · integrity + attestation ────────────────────────────────────────────

test('install (payload rung): verified against the registry anchor; receipt validates standalone', async () => {
  const expected = treeHash(GOOD_FILES);
  const root = await makeRoot({ treeHashValue: expected });
  const payload = await writePayload(root, GOOD_FILES);

  const result = await install({ slug: 'goodpack', root, payloadFile: payload });
  assert.equal(result.mode, 'installed');
  assert.equal(result.payload.install.outcome, 'verified');
  assert.match(result.payload.install.anchor, /^registry:sha256:/);
  const files = await readdir(path.join(result.path, 'skills', 'greet'));
  assert.ok(files.includes('SKILL.md'));

  const verdict = await verifyReceipt(result.receipt_path);
  assert.equal(verdict.valid, true, verdict.problems.join('; '));
  assert.equal(verdict.payload.kind, 'install');
});

test('install: tampered pack → exit 4, nothing lands', async () => {
  const expected = treeHash(GOOD_FILES);
  const root = await makeRoot({ treeHashValue: expected });
  const tampered = [...GOOD_FILES.slice(0, 1), { path: 'skills/greet/SKILL.md', content: b64('# greet (tampered)\n') }];
  const payload = await writePayload(root, tampered);

  await rejectsInstall(install({ slug: 'goodpack', root, payloadFile: payload }), EXIT.INTEGRITY_MISMATCH, 'HASH_MISMATCH');
  await assert.rejects(readdir(path.join(root, '.claude', 'constructs', 'packs', 'goodpack')));
});

test('install: --allow-integrity-mismatch bypasses the HASH check only, logged with reason', async () => {
  const root = await makeRoot({ treeHashValue: `sha256:${'1'.repeat(64)}` });
  const payload = await writePayload(root, GOOD_FILES);

  await rejectsInstall(install({ slug: 'goodpack', root, payloadFile: payload, allowIntegrityMismatch: true }), EXIT.CALLER_ERROR);

  const result = await install({ slug: 'goodpack', root, payloadFile: payload, allowIntegrityMismatch: true, reason: 'fixture: knowingly testing the override lane' });
  assert.equal(result.payload.install.outcome, 'hash-overridden');
  assert.match(result.payload.install.override_reason, /knowingly/);
});

test('install: no anchor anywhere → refused, never pretend-verified', async () => {
  const root = await makeRoot({});
  const payload = await writePayload(root, GOOD_FILES);
  await rejectsInstall(install({ slug: 'goodpack', root, payloadFile: payload }), EXIT.INTEGRITY_MISMATCH, 'NO_ANCHOR');
});

test('attestation: signed pack verifies; STRIP-ATTACK refused with NO override', async () => {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const pem = publicKey.export({ type: 'spki', format: 'pem' });
  const manifest = { name: 'goodpack', slug: 'goodpack' };
  const expected = treeHash(GOOD_FILES);
  const signature = cryptoSign(null, attestationBytes(manifest, expected), privateKey).toString('base64');
  const keyProvider = async () => ({ public_key: pem, status: 'active' });

  const root = await makeRoot({ treeHashValue: expected, attested: true });

  // Signed: verifies.
  const good = await writePayload(root, GOOD_FILES, { manifest, attestation: { signature, key_id: 'pub-1' } });
  const ok = await install({ slug: 'goodpack', root, payloadFile: good, keyProvider, dryRun: true });
  assert.equal(ok.payload.install.outcome, 'attested-verified');
  assert.equal(ok.payload.install.key_id, 'pub-1');

  // Stripped: STRIP-ATTACK, and the override flag is powerless against it.
  const stripped = await writePayload(root, GOOD_FILES, { manifest });
  await rejectsInstall(install({ slug: 'goodpack', root, payloadFile: stripped, keyProvider }), EXIT.INTEGRITY_MISMATCH, 'STRIP_ATTACK');
  await rejectsInstall(
    install({ slug: 'goodpack', root, payloadFile: stripped, keyProvider, allowIntegrityMismatch: true, reason: 'trying to override a strip attack' }),
    EXIT.INTEGRITY_MISMATCH,
    'STRIP_ATTACK'
  );
});

test('attestation: revoked key refuses; wrong signature refuses', async () => {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const pem = publicKey.export({ type: 'spki', format: 'pem' });
  const manifest = { name: 'goodpack' };
  const expected = treeHash(GOOD_FILES);
  const signature = cryptoSign(null, attestationBytes(manifest, expected), privateKey).toString('base64');

  await assert.rejects(
    verifyAttestation({ manifest, tree_hash: expected, attestation: { signature, key_id: 'pub-1' }, keyProvider: async () => ({ public_key: pem, status: 'revoked' }) }),
    (err) => err.code === 'KEY_REVOKED'
  );

  const { privateKey: otherKey } = generateKeyPairSync('ed25519');
  const wrongSig = cryptoSign(null, attestationBytes(manifest, expected), otherKey).toString('base64');
  await assert.rejects(
    verifyAttestation({ manifest, tree_hash: expected, attestation: { signature: wrongSig, key_id: 'pub-1' }, keyProvider: async () => ({ public_key: pem, status: 'active' }) }),
    (err) => err.code === 'SIGNATURE_INVALID'
  );
});

test('attestation: verifies against a known-good JCS vector', async () => {
  // The signed bytes are JCS({manifest, tree_hash}) — pin the canonical form so a
  // canonicalization drift breaks loudly here, not silently at verify time.
  // expiry is INSIDE the signed object (T3.2b) — null when absent, so a stripped
  // expiry changes the bytes and the signature simply fails.
  const bytes = attestationBytes({ b: 2, a: [1.5, 'x'] }, 'sha256:abc');
  assert.equal(bytes.toString('utf8'), '{"expiry":null,"manifest":{"a":[1.5,"x"],"b":2},"tree_hash":"sha256:abc"}');
  const withExpiry = attestationBytes({ b: 2 }, 'sha256:abc', '2027-01-01T00:00:00Z');
  assert.equal(withExpiry.toString('utf8'), '{"expiry":"2027-01-01T00:00:00Z","manifest":{"b":2},"tree_hash":"sha256:abc"}');
});

// ── T3.2 · landing safety ─────────────────────────────────────────────────────

test('install: refuses to overwrite an unmanaged directory', async () => {
  const expected = treeHash(GOOD_FILES);
  const root = await makeRoot({ treeHashValue: expected });
  const payload = await writePayload(root, GOOD_FILES);
  const target = path.join(root, '.claude', 'constructs', 'packs', 'goodpack');
  await mkdir(target, { recursive: true });
  await writeFile(path.join(target, 'precious-user-work.md'), 'mine');

  await rejectsInstall(install({ slug: 'goodpack', root, payloadFile: payload }), EXIT.REFUSED);
  const kept = await readdir(target);
  assert.ok(kept.includes('precious-user-work.md'), 'user work must survive the refusal');
});

test('install: nothing lands executable', async () => {
  const expected = treeHash(GOOD_FILES);
  const root = await makeRoot({ treeHashValue: expected });
  const payload = await writePayload(root, GOOD_FILES);
  const result = await install({ slug: 'goodpack', root, payloadFile: payload });
  const { stat } = await import('node:fs/promises');
  const info = await stat(path.join(result.path, 'skills', 'greet', 'SKILL.md'));
  assert.equal(info.mode & 0o111, 0, 'no +x by default');
});

// ── T3.3 · git rung: registry-pinned anchor, TOFU surfaced ────────────────────

async function makeUpstream() {
  const dir = await mkdtemp(path.join(tmpdir(), 'install-upstream-'));
  const git = (args) => run('git', args, { cwd: dir, allowNonZero: false, timeoutMs: 20_000 });
  await git(['init', '-q']);
  await git(['symbolic-ref', 'HEAD', 'refs/heads/main']);
  await writeFile(path.join(dir, 'construct.yaml'), 'name: goodpack\nslug: goodpack\n');
  await git(['add', '-A']);
  await git(['-c', 'user.email=f@t', '-c', 'user.name=f', 'commit', '-q', '-m', 'genesis']);
  const { stdout } = await run('git', ['rev-parse', 'HEAD'], { cwd: dir });
  return { dir, head: stdout.trim() };
}

test('git rung: anchored to the registry-recorded commit', async () => {
  const upstream = await makeUpstream();
  const root = await makeRoot({ gitUrl: upstream.dir, commit: upstream.head });
  const result = await install({ slug: 'goodpack', root, rung: 'git' });
  assert.equal(result.mode, 'installed');
  assert.equal(result.payload.install.anchor, `registry-commit:${upstream.head}`);
});

test('git rung: absent commit pin → TOFU, recorded as first-seen and surfaced', async () => {
  const upstream = await makeUpstream();
  const root = await makeRoot({ gitUrl: upstream.dir });
  const result = await install({ slug: 'goodpack', root, rung: 'git' });
  assert.match(result.payload.install.anchor, new RegExp(`^first-seen:${upstream.head}`));
});

test('git rung: registry pin that does not exist in the repo → integrity mismatch', async () => {
  const upstream = await makeUpstream();
  const root = await makeRoot({ gitUrl: upstream.dir, commit: '0'.repeat(40) });
  await rejectsInstall(install({ slug: 'goodpack', root, rung: 'git' }), EXIT.INTEGRITY_MISMATCH, 'ANCHOR_MISMATCH');
});

test('git rung: repo-borne symlink rejected outright', async () => {
  const upstream = await makeUpstream();
  await symlink('/etc/passwd', path.join(upstream.dir, 'sneaky-link'));
  await run('git', ['add', '-A'], { cwd: upstream.dir });
  await run('git', ['-c', 'user.email=f@t', '-c', 'user.name=f', 'commit', '-q', '-m', 'add symlink'], { cwd: upstream.dir });
  const root = await makeRoot({ gitUrl: upstream.dir });
  await rejectsInstall(install({ slug: 'goodpack', root, rung: 'git' }), EXIT.INTEGRITY_MISMATCH, 'CONTAINMENT');
});

// ── T3.2b · the four classes a second model found that the author's fixtures missed ──
//
// This is the whole point of T3.2b: a self-authored guard reviewed by its author
// is not a guard. Each of these was a REAL bypass before the fix.

test('T3.2b: case-folding alias collision refused (two entries, one file on macOS/Windows)', async () => {
  const { problems } = validateFileList(await loadRedteam('case-alias-collision.json'));
  assert.match(problems.join(' '), /collides with/);
});

test('T3.2b: Unicode NFC/NFD alias collision refused (two entries, one file on APFS)', async () => {
  const { problems } = validateFileList(await loadRedteam('unicode-normalize-collision.json'));
  assert.match(problems.join(' '), /collides with/);
});

test('T3.2b: attestation expiry is INSIDE the signed bytes — stripping it breaks the signature', async () => {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const pem = publicKey.export({ type: 'spki', format: 'pem' });
  const keyProvider = async () => ({ public_key: pem, status: 'active' });
  const manifest = { name: 'goodpack' };
  const hash = treeHash(GOOD_FILES);
  const expiry = '2027-01-01T00:00:00Z';

  // Signed WITH the expiry: verifies.
  const sig = cryptoSign(null, attestationBytes(manifest, hash, expiry), privateKey).toString('base64');
  const ok = await verifyAttestation({ manifest, tree_hash: hash, attestation: { signature: sig, key_id: 'k1', expiry }, keyProvider });
  assert.equal(ok.verified, true);

  // Same signature, expiry STRIPPED → the signed bytes change → signature fails.
  await assert.rejects(
    verifyAttestation({ manifest, tree_hash: hash, attestation: { signature: sig, key_id: 'k1' }, keyProvider }),
    (err) => err.code === 'SIGNATURE_INVALID'
  );
  // Same signature, expiry EXTENDED → likewise fails.
  await assert.rejects(
    verifyAttestation({ manifest, tree_hash: hash, attestation: { signature: sig, key_id: 'k1', expiry: '2099-01-01T00:00:00Z' }, keyProvider }),
    (err) => err.code === 'SIGNATURE_INVALID'
  );
  // A malformed expiry is named, not silently ignored.
  const badSig = cryptoSign(null, attestationBytes(manifest, hash, 'not-a-date'), privateKey).toString('base64');
  await assert.rejects(
    verifyAttestation({ manifest, tree_hash: hash, attestation: { signature: badSig, key_id: 'k1', expiry: 'not-a-date' }, keyProvider }),
    (err) => err.code === 'ATTESTATION_MALFORMED'
  );
});

test('T3.2b: TOFU actually pins — a changed remote HEAD is refused, not silently re-anchored', async () => {
  const upstream = await makeUpstream();
  const root = await makeRoot({ gitUrl: upstream.dir });

  const first = await install({ slug: 'goodpack', root, rung: 'git' });
  assert.match(first.payload.install.anchor, new RegExp(`^first-seen:${upstream.head}`));

  // Upstream moves (a compromised repo, or merely an updated one — the tool cannot tell).
  await writeFile(path.join(upstream.dir, 'construct.yaml'), 'name: goodpack\nslug: goodpack\nadded: later\n');
  await run('git', ['add', '-A'], { cwd: upstream.dir });
  await run('git', ['-c', 'user.email=f@t', '-c', 'user.name=f', 'commit', '-q', '-m', 'upstream moves'], { cwd: upstream.dir });

  await rejectsInstall(install({ slug: 'goodpack', root, rung: 'git' }), EXIT.INTEGRITY_MISMATCH, 'TOFU_MISMATCH');

  // Rotation is possible, but only as a knowing, reasoned act.
  const rotated = await install({ slug: 'goodpack', root, rung: 'git', allowIntegrityMismatch: true, reason: 'fixture: knowingly rotating the anchor' });
  assert.equal(rotated.mode, 'installed');
});

test('T3.2b: replacing an installed pack is a SWAP — the old pack is never deleted before the new one lands', async () => {
  const expected = treeHash(GOOD_FILES);
  const root = await makeRoot({ treeHashValue: expected });
  const payload = await writePayload(root, GOOD_FILES);

  const first = await install({ slug: 'goodpack', root, payloadFile: payload });
  const before = JSON.parse(await readFile(path.join(first.path, '.construct-meta.json'), 'utf8'));

  const second = await install({ slug: 'goodpack', root, payloadFile: payload });
  assert.equal(second.mode, 'installed');
  const after = JSON.parse(await readFile(path.join(second.path, '.construct-meta.json'), 'utf8'));
  assert.equal(after.tree_hash, before.tree_hash);

  // No backup residue left behind.
  const parent = path.join(root, '.claude', 'constructs', 'packs');
  const residue = (await readdir(parent)).filter((f) => f.startsWith('.backup-'));
  assert.deepEqual(residue, []);
});

// ── review pass 1 (sprint-229) regressions ───────────────────────────────────

test('S229-1: a --dry-run git install NEVER writes trust state', async () => {
  const upstream = await makeUpstream();
  const root = await makeRoot({ gitUrl: upstream.dir });
  const anchorFile = path.join(root, 'grimoires', 'loa', 'territory', 'anchors', 'goodpack.json');

  const dry = await install({ slug: 'goodpack', root, rung: 'git', dryRun: true });
  assert.equal(dry.mode, 'dry-run');
  await assert.rejects(readFile(anchorFile, 'utf8'), 'a dry run must not pin an anchor');

  // And the real install still pins it.
  await install({ slug: 'goodpack', root, rung: 'git' });
  const pinned = JSON.parse(await readFile(anchorFile, 'utf8'));
  assert.equal(pinned.commit, upstream.head);
});

test('S229-2: a malformed TOFU anchor fails CLOSED — unknown trust is never fresh trust', async () => {
  const upstream = await makeUpstream();
  const root = await makeRoot({ gitUrl: upstream.dir });
  await install({ slug: 'goodpack', root, rung: 'git' });

  const anchorFile = path.join(root, 'grimoires', 'loa', 'territory', 'anchors', 'goodpack.json');
  await writeFile(anchorFile, '{ this is not json');
  await rejectsInstall(install({ slug: 'goodpack', root, rung: 'git' }), EXIT.INTEGRITY_MISMATCH, 'TOFU_MALFORMED');

  await writeFile(anchorFile, JSON.stringify({ slug: 'goodpack', commit: 'not-a-sha' }));
  await rejectsInstall(install({ slug: 'goodpack', root, rung: 'git' }), EXIT.INTEGRITY_MISMATCH, 'TOFU_MALFORMED');
});

test('S229-3: an unreadable/malformed registry fails CLOSED — never a silent fallback to the API hash', async () => {
  const root = await makeRoot({ treeHashValue: treeHash(GOOD_FILES) });
  const payload = await writePayload(root, GOOD_FILES);
  // Anchors are outside the vendored YAML subset — the parser refuses them by design.
  await writeFile(path.join(root, 'registry.yaml'), 'constructs:\n  goodpack: &a\n    git_url: x\n  other: *a\n');
  await rejectsInstall(install({ slug: 'goodpack', root, payloadFile: payload }), EXIT.INTEGRITY_MISMATCH, 'REGISTRY_MALFORMED');

  // An unreadable (but present) registry is likewise a failure, not an absence.
  const { chmod } = await import('node:fs/promises');
  if (typeof process.getuid !== 'function' || process.getuid() !== 0) {
    await writeFile(path.join(root, 'registry.yaml'), 'version: 1\n');
    await chmod(path.join(root, 'registry.yaml'), 0o000);
    try {
      await rejectsInstall(install({ slug: 'goodpack', root, payloadFile: payload }), EXIT.INTEGRITY_MISMATCH, 'REGISTRY_UNREADABLE');
    } finally {
      await chmod(path.join(root, 'registry.yaml'), 0o644);
    }
  }
});

test('S229-4: Win32 reserved device names and trailing-dot aliases refused', async () => {
  const reserved = validateFileList(await loadRedteam('win32-reserved-name.json'));
  assert.match(reserved.problems.join(' '), /reserved device name/);

  const trailing = validateFileList(await loadRedteam('win32-trailing-dot.json'));
  assert.match(trailing.problems.join(' '), /dot or space|collides with/);
});

test('S229-5: a receipt failure rolls the pack back — never installed-but-unrecorded', async () => {
  const expected = treeHash(GOOD_FILES);
  const root = await makeRoot({ treeHashValue: expected });
  const payload = await writePayload(root, GOOD_FILES);

  const first = await install({ slug: 'goodpack', root, payloadFile: payload });
  const originalMeta = await readFile(path.join(first.path, '.construct-meta.json'), 'utf8');

  // Make the receipts dir un-writable so the receipt write fails AFTER the pack
  // has been swapped in. The working pack must come back.
  // Replace the receipts DIRECTORY with a file: mkdir/write then fails hard
  // (ENOTDIR), after the pack has already been swapped in.
  const territory = path.join(root, 'grimoires', 'loa', 'territory');
  const receiptsDir = path.join(territory, 'receipts');
  const { rm: rmFs } = await import('node:fs/promises');
  await rmFs(receiptsDir, { recursive: true, force: true });
  await writeFile(receiptsDir, 'not a directory');

  await assert.rejects(install({ slug: 'goodpack', root, payloadFile: payload }));
  const surviving = await readFile(path.join(root, '.claude', 'constructs', 'packs', 'goodpack', '.construct-meta.json'), 'utf8');
  assert.equal(surviving, originalMeta, 'a failed receipt write must restore the pack that was working');
});
