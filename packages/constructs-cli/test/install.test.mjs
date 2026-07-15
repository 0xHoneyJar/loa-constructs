// Install integrity + containment (T3.1 · T3.2 · T3.3).
//
// The red-team fixtures in fixtures/redteam/ are the ONLY mechanical security
// guard for this surface while the red-team infra defect stands (NOTES.md
// BLOCKER) — every containment rule pins one, and T3.2b has a second model
// review them adversarially before the tasks close.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign as cryptoSign, createHash } from 'node:crypto';
import { mkdtemp, mkdir, writeFile, readFile, readdir, symlink, chmod, stat } from 'node:fs/promises';
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
  commitInstallTransaction,
  BUDGETS,
  InstallError,
} from '../lib/install.mjs';
import { verifyReceipt, writeRecordUnlocked } from '../lib/station.mjs';
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

test('containment accepts uppercase names and rejects the exact C0 plus DEL byte set', () => {
  const uppercase = validateFileList([{ path: 'Skills/README.md', content: b64('ok') }]);
  assert.deepEqual(uppercase.problems, []);

  const controls = [...Array.from({ length: 32 }, (_, i) => String.fromCharCode(i)), String.fromCharCode(0x7f)];
  for (const control of controls) {
    const verdict = validateFileList([{ path: `skills/bad${control}name.md`, content: b64('bad') }]);
    assert.match(verdict.problems.join(' '), /control bytes/);
  }
});

test('containment accepts only canonical padded base64 content', () => {
  for (const content of [null, 42, '%%%', 'YQ', 'YQ===', 'YQ==\n', 'YR==', 'YWF=']) {
    const verdict = validateFileList([{ path: 'skills/value.bin', content }]);
    assert.match(verdict.problems.join(' '), /canonical padded base64/);
  }

  assert.deepEqual(validateFileList([{ path: 'skills/empty.bin', content: '' }]).problems, []);
  assert.deepEqual(validateFileList([{ path: 'skills/value.bin', content: 'YQ==' }]).problems, []);
});

test('containment rejects every Windows-forbidden filename character, including NTFS ADS', async () => {
  const verdict = validateFileList(await loadRedteam('win32-forbidden-chars.json'));
  assert.equal(verdict.problems.filter((problem) => /forbidden in Windows filenames/.test(problem)).length, 7);
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
  assert.equal(result.payload.install.transaction_state, 'committed');
  assert.match(result.payload.install.anchor, /^registry:sha256:/);
  const files = await readdir(path.join(result.path, 'skills', 'greet'));
  assert.ok(files.includes('SKILL.md'));

  const verdict = await verifyReceipt(result.receipt_path);
  assert.equal(verdict.valid, true, verdict.problems.join('; '));
  assert.equal(verdict.payload.kind, 'install');
  const prepared = await verifyReceipt(result.prepared_receipt_path);
  assert.equal(prepared.valid, true, prepared.problems.join('; '));
  assert.equal(prepared.payload.install.transaction_state, 'prepared');
  assert.equal(prepared.payload.install.transaction_id, verdict.payload.install.transaction_id);
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

async function makeSha256Upstream() {
  const dir = await mkdtemp(path.join(tmpdir(), 'install-upstream-sha256-'));
  const git = (args) => run('git', args, { cwd: dir, allowNonZero: false, timeoutMs: 20_000 });
  await git(['init', '-q', '--object-format=sha256']);
  await git(['symbolic-ref', 'HEAD', 'refs/heads/main']);
  await writeFile(path.join(dir, 'construct.yaml'), 'name: goodpack\nslug: goodpack\n');
  await git(['add', '-A']);
  await git(['-c', 'user.email=f@t', '-c', 'user.name=f', 'commit', '-q', '-m', 'sha256 genesis']);
  const { stdout } = await run('git', ['rev-parse', 'HEAD'], { cwd: dir });
  return { dir, head: stdout.trim() };
}

test('git rung: anchored to the registry-recorded commit', async () => {
  const upstream = await makeUpstream();
  const root = await makeRoot({ gitUrl: upstream.dir, commit: upstream.head });
  const result = await install({ slug: 'goodpack', root, rung: 'git' });
  assert.equal(result.mode, 'installed');
  assert.equal(result.payload.install.anchor, `registry-commit:${upstream.head}`);
  assert.match(result.payload.install.tree_hash, /^sha256:[0-9a-f]{64}$/);
  assert.notEqual(result.payload.install.tree_hash, `sha256:${'0'.repeat(64)}`);
});

test('git rung: tree budgets are enforced before checkout', async () => {
  const upstream = await makeUpstream();
  await writeFile(path.join(upstream.dir, 'oversized.bin'), Buffer.alloc(BUDGETS.max_single_file_bytes + 1));
  await run('git', ['add', '-A'], { cwd: upstream.dir });
  await run('git', ['-c', 'user.email=f@t', '-c', 'user.name=f', 'commit', '-q', '-m', 'oversized blob'], { cwd: upstream.dir });
  const root = await makeRoot({ gitUrl: upstream.dir });
  await rejectsInstall(install({ slug: 'goodpack', root, rung: 'git' }), EXIT.INTEGRITY_MISMATCH, 'GIT_BUDGET_EXCEEDED');
});

test('git rung: executable bits are cleared before the pack lands', async () => {
  const upstream = await makeUpstream();
  const script = path.join(upstream.dir, 'run-me.sh');
  await writeFile(script, '#!/usr/bin/env bash\nexit 0\n');
  await chmod(script, 0o755);
  await run('git', ['add', '-A'], { cwd: upstream.dir });
  await run('git', ['-c', 'user.email=f@t', '-c', 'user.name=f', 'commit', '-q', '-m', 'executable file'], { cwd: upstream.dir });
  const root = await makeRoot({ gitUrl: upstream.dir });
  const result = await install({ slug: 'goodpack', root, rung: 'git' });
  assert.equal((await stat(path.join(result.path, 'run-me.sh'))).mode & 0o111, 0);
});

test('git rung: SHA-256 commit identities work for pinned and persisted TOFU anchors', async () => {
  const upstream = await makeSha256Upstream();
  assert.equal(upstream.head.length, 64);

  const pinnedRoot = await makeRoot({ gitUrl: upstream.dir, commit: upstream.head });
  const pinned = await install({ slug: 'goodpack', root: pinnedRoot, rung: 'git' });
  assert.equal(pinned.payload.install.anchor, `registry-commit:${upstream.head}`);

  const tofuRoot = await makeRoot({ gitUrl: upstream.dir });
  await install({ slug: 'goodpack', root: tofuRoot, rung: 'git' });
  const second = await install({ slug: 'goodpack', root: tofuRoot, rung: 'git' });
  assert.equal(second.mode, 'installed');
  const anchor = JSON.parse(await readFile(path.join(tofuRoot, 'grimoires', 'loa', 'territory', 'anchors', 'goodpack.json'), 'utf8'));
  assert.equal(anchor.commit, upstream.head);
  assert.equal(anchor.object_format, 'sha256');
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

test('git rung: option-shaped or unsupported registry URLs are rejected before clone', async () => {
  for (const gitUrl of ['--upload-pack=/tmp/attacker', 'http://example.invalid/pack.git']) {
    const root = await makeRoot({ gitUrl });
    await rejectsInstall(install({ slug: 'goodpack', root, rung: 'git' }), EXIT.INTEGRITY_MISMATCH, 'UNSAFE_GIT_URL');
  }
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

  // Rotation is possible, but only as a knowing, reasoned act — and the receipt
  // records it AS an override, with the reason (audit): an override that leaves no
  // trace is not forensics, it is a rumour.
  const rotated = await install({ slug: 'goodpack', root, rung: 'git', allowIntegrityMismatch: true, reason: 'fixture: knowingly rotating the anchor' });
  assert.equal(rotated.mode, 'installed');
  assert.equal(rotated.payload.install.outcome, 'hash-overridden');
  assert.match(rotated.payload.install.override_reason, /knowingly rotating/);
  assert.match(rotated.payload.install.anchor, /rotated from/);
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

test('T3.2b: stale backup recovery state is preserved and blocks a new install', async () => {
  const expected = treeHash(GOOD_FILES);
  const root = await makeRoot({ treeHashValue: expected });
  const payload = await writePayload(root, GOOD_FILES);
  const first = await install({ slug: 'goodpack', root, payloadFile: payload });
  const parent = path.dirname(first.path);
  const stale = path.join(parent, '.backup-goodpack-stale-transaction');
  await mkdir(stale);
  await writeFile(path.join(stale, 'recover-me.md'), 'old pack recovery state\n');

  await rejectsInstall(install({ slug: 'goodpack', root, payloadFile: payload }), EXIT.REFUSED, 'RECOVERY_STATE_EXISTS');
  assert.equal(await readFile(path.join(stale, 'recover-me.md'), 'utf8'), 'old pack recovery state\n');
  assert.equal((await readdir(first.path)).includes('.construct-meta.json'), true);
});

// ── review pass 1 (sprint-229) regressions ───────────────────────────────────

test('S229-1: a --dry-run git install NEVER writes trust state', async () => {
  const upstream = await makeUpstream();
  const root = await makeRoot({ gitUrl: upstream.dir });
  const anchorFile = path.join(root, 'grimoires', 'loa', 'territory', 'anchors', 'goodpack.json');

  const dry = await install({ slug: 'goodpack', root, rung: 'git', dryRun: true });
  assert.equal(dry.mode, 'dry-run');
  await assert.rejects(readFile(anchorFile, 'utf8'), 'a dry run must not pin an anchor');
  await assert.rejects(readdir(path.join(root, '.claude')), 'a dry run must not create install directories');

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

test('S229-5: a prepared-receipt failure leaves the working pack untouched', async () => {
  const expected = treeHash(GOOD_FILES);
  const root = await makeRoot({ treeHashValue: expected });
  const payload = await writePayload(root, GOOD_FILES);

  const first = await install({ slug: 'goodpack', root, payloadFile: payload });
  const originalMeta = await readFile(path.join(first.path, '.construct-meta.json'), 'utf8');

  // Replace the receipts DIRECTORY with a file so the write-ahead record fails.
  const territory = path.join(root, 'grimoires', 'loa', 'territory');
  const receiptsDir = path.join(territory, 'receipts');
  const { rm: rmFs } = await import('node:fs/promises');
  await rmFs(receiptsDir, { recursive: true, force: true });
  await writeFile(receiptsDir, 'not a directory');

  await assert.rejects(install({ slug: 'goodpack', root, payloadFile: payload }));
  // The prepared record lands first, so this failure means the
  // swap never happened at all — the working pack is untouched, not "restored".
  const surviving = await readFile(path.join(root, '.claude', 'constructs', 'packs', 'goodpack', '.construct-meta.json'), 'utf8');
  assert.equal(surviving, originalMeta, 'the working pack must be untouched when the record cannot be written');
});


// ── review pass 2 (sprint-229): ordering IS the transaction ───────────────────

test('S229-P2: failed landing leaves only a prepared receipt and does not rotate TOFU', async () => {
  const root = await makeRoot();
  const receiptsDir = path.join(root, 'grimoires', 'loa', 'territory', 'receipts');
  const packsDir = path.join(root, '.claude', 'constructs', 'packs');
  await mkdir(receiptsDir, { recursive: true });
  await mkdir(packsDir, { recursive: true });

  const receiptPayload = {
    record_version: '1.0',
    kind: 'install',
    ts: '2026-07-14T00:00:00Z',
    actor: 'test',
    construct: 'goodpack',
    install: {
      rung: 'registry-git',
      tree_hash: `sha256:${'0'.repeat(64)}`,
      outcome: 'verified',
      anchor: `first-seen:${'a'.repeat(40)}`,
    },
  };

  await assert.rejects(commitInstallTransaction({
    root,
    slug: 'goodpack',
    stage: path.join(packsDir, 'missing-stage'),
    receiptsDir,
    receiptPayload,
    pendingAnchor: 'a'.repeat(40),
  }));

  const records = (await readdir(receiptsDir)).filter((name) => name.endsWith('.json'));
  assert.equal(records.length, 1, 'a failed landing records one prepared fact, never completion');
  const prepared = JSON.parse(await readFile(path.join(receiptsDir, records[0]), 'utf8'));
  assert.equal(prepared.install.transaction_state, 'prepared');
  await assert.rejects(readFile(path.join(root, 'grimoires', 'loa', 'territory', 'anchors', 'goodpack.json')));
  await assert.rejects(readdir(path.join(packsDir, 'goodpack')));
});

test('S229-P4: committed-metadata failure restores both the previous pack and TOFU anchor', async () => {
  const root = await makeRoot();
  const receiptsDir = path.join(root, 'grimoires', 'loa', 'territory', 'receipts');
  const packsDir = path.join(root, '.claude', 'constructs', 'packs');
  const target = path.join(packsDir, 'goodpack');
  const stage = path.join(packsDir, '.stage-goodpack');
  const anchorFile = path.join(root, 'grimoires', 'loa', 'territory', 'anchors', 'goodpack.json');
  await mkdir(receiptsDir, { recursive: true });
  await mkdir(target, { recursive: true });
  await mkdir(stage, { recursive: true });
  await mkdir(path.dirname(anchorFile), { recursive: true });
  await writeFile(path.join(target, '.construct-meta.json'), '{"generation":"old"}\n');
  await writeFile(path.join(stage, '.construct-meta.json'), '{"generation":"new"}\n');
  const priorAnchor = `${JSON.stringify({ slug: 'goodpack', commit: 'a'.repeat(40), first_seen_at: '2026-07-14T00:00:00Z' }, null, 2)}\n`;
  await writeFile(anchorFile, priorAnchor);

  const receiptPayload = {
    record_version: '1.0',
    kind: 'install',
    ts: '2026-07-14T00:00:00Z',
    actor: 'test',
    construct: 'goodpack',
    install: {
      rung: 'registry-git',
      tree_hash: `sha256:${'0'.repeat(64)}`,
      outcome: 'hash-overridden',
      anchor: `first-seen:${'b'.repeat(40)} (rotated from ${'a'.repeat(40)})`,
      override_reason: 'fixture rotation',
    },
  };
  let writes = 0;
  const failCommittedRecord = async (...args) => {
    writes++;
    if (writes === 2) throw Object.assign(new Error('simulated committed-record I/O failure'), { code: 'EIO' });
    return writeRecordUnlocked(...args);
  };

  await assert.rejects(
    commitInstallTransaction({
      root,
      slug: 'goodpack',
      stage,
      receiptsDir,
      receiptPayload,
      pendingAnchor: 'b'.repeat(40),
      recordWriter: failCommittedRecord,
    }),
    (err) => err instanceof InstallError && err.code === 'METADATA_COMMIT_FAILED'
  );

  assert.equal(await readFile(path.join(target, '.construct-meta.json'), 'utf8'), '{"generation":"old"}\n');
  assert.equal(await readFile(anchorFile, 'utf8'), priorAnchor);
  const records = (await readdir(receiptsDir)).filter((name) => name.endsWith('.json'));
  assert.equal(records.length, 1);
  assert.equal(JSON.parse(await readFile(path.join(receiptsDir, records[0]), 'utf8')).install.transaction_state, 'prepared');
  assert.deepEqual((await readdir(packsDir)).filter((name) => name.startsWith('.backup-')), []);
});

test('S229-P4: rollback preserves a concurrently substituted target and the recoverable backup', async () => {
  const root = await makeRoot();
  const receiptsDir = path.join(root, 'grimoires', 'loa', 'territory', 'receipts');
  const packsDir = path.join(root, '.claude', 'constructs', 'packs');
  const target = path.join(packsDir, 'goodpack');
  const stage = path.join(packsDir, '.stage-goodpack');
  await mkdir(receiptsDir, { recursive: true });
  await mkdir(target, { recursive: true });
  await mkdir(stage, { recursive: true });
  await writeFile(path.join(target, '.construct-meta.json'), '{"generation":"old"}\n');
  await writeFile(path.join(stage, '.construct-meta.json'), '{"generation":"new"}\n');
  const receiptPayload = {
    record_version: '1.0',
    kind: 'install',
    ts: '2026-07-14T00:00:00Z',
    actor: 'test',
    construct: 'goodpack',
    install: {
      rung: 'payload-file',
      tree_hash: `sha256:${'0'.repeat(64)}`,
      outcome: 'verified',
      anchor: `registry:sha256:${'0'.repeat(64)}`,
    },
  };
  let writes = 0;
  const substituteThenFail = async (...args) => {
    writes++;
    if (writes === 2) {
      const { rm: rmFs } = await import('node:fs/promises');
      await rmFs(target, { recursive: true, force: true });
      await mkdir(target, { recursive: true });
      await writeFile(path.join(target, 'user-work.md'), 'preserve me\n');
      await writeFile(path.join(target, '.construct-meta.json'), '{"generation":"concurrent"}\n');
      throw Object.assign(new Error('simulated committed-record I/O failure'), { code: 'EIO' });
    }
    return writeRecordUnlocked(...args);
  };

  await assert.rejects(
    commitInstallTransaction({ root, slug: 'goodpack', stage, receiptsDir, receiptPayload, recordWriter: substituteThenFail }),
    (err) => err instanceof InstallError && err.code === 'ROLLBACK_FAILED'
  );
  assert.equal(await readFile(path.join(target, 'user-work.md'), 'utf8'), 'preserve me\n');
  const backups = (await readdir(packsDir)).filter((name) => name.startsWith('.backup-'));
  assert.equal(backups.length, 1);
  assert.equal(await readFile(path.join(packsDir, backups[0], '.construct-meta.json'), 'utf8'), '{"generation":"old"}\n');
});

test('S229-P4: non-ENOENT target lookup failures are surfaced, not treated as absence', async () => {
  const root = await makeRoot();
  const receiptsDir = path.join(root, 'grimoires', 'loa', 'territory', 'receipts');
  const packsDir = path.join(root, '.claude', 'constructs', 'packs');
  const stage = path.join(packsDir, '.stage-goodpack');
  await mkdir(receiptsDir, { recursive: true });
  await mkdir(stage, { recursive: true });
  await writeFile(path.join(stage, '.construct-meta.json'), '{}\n');
  const receiptPayload = {
    record_version: '1.0',
    kind: 'install',
    ts: '2026-07-14T00:00:00Z',
    actor: 'test',
    construct: 'goodpack',
    install: {
      rung: 'payload-file',
      tree_hash: `sha256:${'0'.repeat(64)}`,
      outcome: 'verified',
      anchor: `registry:sha256:${'0'.repeat(64)}`,
    },
  };

  await assert.rejects(
    commitInstallTransaction({ root, slug: 'x'.repeat(300), stage, receiptsDir, receiptPayload }),
    (err) => err instanceof InstallError && err.code === 'FILESYSTEM_LOOKUP_FAILED'
  );
});

test('S229-P2: a pack is NEVER visible without a prepared record', async () => {
  const upstream = await makeUpstream();
  const root = await makeRoot({ gitUrl: upstream.dir });
  const packDir = path.join(root, '.claude', 'constructs', 'packs', 'goodpack');
  const anchorFile = path.join(root, 'grimoires', 'loa', 'territory', 'anchors', 'goodpack.json');
  const receiptsDir = path.join(root, 'grimoires', 'loa', 'territory', 'receipts');

  // Block the receipt write. The install must fail BEFORE the pack is visible.
  await mkdir(path.dirname(receiptsDir), { recursive: true });
  await writeFile(receiptsDir, 'not a directory');
  await assert.rejects(install({ slug: 'goodpack', root, rung: 'git' }));
  await assert.rejects(readdir(packDir), 'no pack may exist when its record could not be written');

  // Unblock: the next run writes a prepared record, lands the pack, then publishes
  // the anchor and committed record.
  const { rm: rmFs } = await import('node:fs/promises');
  await rmFs(receiptsDir, { force: true });
  const ok = await install({ slug: 'goodpack', root, rung: 'git' });
  assert.equal(ok.mode, 'installed');
  assert.equal(JSON.parse(await readFile(anchorFile, 'utf8')).commit, upstream.head);
  const verdict = await verifyReceipt(ok.receipt_path);
  assert.equal(verdict.valid, true, verdict.problems.join('; '));
});

test('S229-P2: an unmanaged target is refused BEFORE anything durable is written', async () => {
  const expected = treeHash(GOOD_FILES);
  const root = await makeRoot({ treeHashValue: expected });
  const payload = await writePayload(root, GOOD_FILES);
  const target = path.join(root, '.claude', 'constructs', 'packs', 'goodpack');
  await mkdir(target, { recursive: true });
  await writeFile(path.join(target, 'user-work.md'), 'mine');

  await rejectsInstall(install({ slug: 'goodpack', root, payloadFile: payload }), EXIT.REFUSED);

  // Nothing durable was written: no receipt, no residue.
  await assert.rejects(readdir(path.join(root, 'grimoires', 'loa', 'territory', 'receipts')));
  assert.deepEqual(
    (await readdir(path.join(root, '.claude', 'constructs', 'packs'))).filter((f) => f.startsWith('.')),
    []
  );
});

test('S229-P3: a target substituted after the pre-check is still refused (the swap revalidates)', async () => {
  const expected = treeHash(GOOD_FILES);
  const root = await makeRoot({ treeHashValue: expected });
  const payload = await writePayload(root, GOOD_FILES);
  const target = path.join(root, '.claude', 'constructs', 'packs', 'goodpack');

  // A managed pack exists (passes the pre-check)…
  await install({ slug: 'goodpack', root, payloadFile: payload });
  // …and is then swapped for an UNMANAGED directory holding user work. The swap
  // must revalidate the directory it actually moves, not trust the earlier check.
  const { rm: rmFs } = await import('node:fs/promises');
  await rmFs(target, { recursive: true, force: true });
  await mkdir(target, { recursive: true });
  await writeFile(path.join(target, 'user-work.md'), 'mine');

  await rejectsInstall(install({ slug: 'goodpack', root, payloadFile: payload }), EXIT.REFUSED);
  const kept = await readdir(target);
  assert.ok(kept.includes('user-work.md'), 'user work survives, and is put back where it was');
});
