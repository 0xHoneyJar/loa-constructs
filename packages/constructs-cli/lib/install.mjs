// Integrity-verified acquisition (T3.1 · T3.2 · T3.3 — PRD FR-18/FR-19).
//
// There is NO archive parser here, on purpose: a pack payload is a JSON
// file-list ({path, content_base64}[]) — the code reality of the registry
// [CODE:packages/loa-registry/bin/constructs.ts:265-380] — and the git rung
// uses git itself. The zip-slip/zip-bomb/device-node class evaporates by
// construction. What remains, and is validated here: file NAMES and payload
// BUDGETS (T3.2), the content hash against its registry anchor (T3.1/T3.3),
// and the attestation chain when the registry says the pack is attested.
//
// v1 trust boundary, stated honestly (SDD §5): TLS + registry-anchored
// consistency. Defends tampered packs, stripped signatures on attested packs,
// path escapes, stale local state. Does NOT defend a full API-origin or
// registry compromise — the receipt records enough for retroactive audit.

import { createHash, createPublicKey, verify as cryptoVerify } from 'node:crypto';
import { readFile, writeFile, mkdir, rename, rm, stat, lstat, readdir, access } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { jcsCanonicalize } from './vendor/jcs.mjs';
import { apiFetch } from './sot.mjs';
import { parse as parseYaml } from './vendor/yaml-subset.mjs';
import { withReceiptLock, writeRecordUnlocked, installReceiptSchema } from './station.mjs';
import { validate as validateSchema } from './vendor/schema-subset.mjs';
import { run } from './exec.mjs';
import { EXIT } from './contract.mjs';

export class InstallError extends Error {
  constructor(message, exitCode = EXIT.INTEGRITY_MISMATCH, { code = null, details = [], fix = null } = {}) {
    super(message);
    this.name = 'InstallError';
    this.exitCode = exitCode;
    this.code = code;
    this.details = details;
    this.fix = fix;
  }
}

// ── payload budgets (T3.2) — enforced BEFORE any write ────────────────────────

export const BUDGETS = Object.freeze({
  max_total_bytes: 32 * 1024 * 1024,
  max_entry_count: 2048,
  max_single_file_bytes: 4 * 1024 * 1024,
});

const CONTROL_BYTES_RE = /[\u0000-\u001f]/; // control bytes in a file NAME are never legitimate

/**
 * The portable collision key (T3.2b, adversarial fixture review).
 *
 * `treeHash` sorts entries but `stageFileList` writes them in PAYLOAD order, and
 * real filesystems alias names: macOS/Windows fold case, and HFS+/APFS normalize
 * Unicode. So two entries that hash as distinct can land on ONE file, and which
 * content survives depends on write order — an attacker picks the order, the hash
 * still matches the anchor. Colliding entries are refused BEFORE hashing.
 */
export function collisionKey(p) {
  return p.normalize('NFC').toLowerCase();
}

/**
 * Containment for file NAMES + budgets. Every rule here has a red-team fixture
 * in test/fixtures/redteam/ that fails the build if it regresses.
 */
export function validateFileList(files) {
  const problems = [];
  if (!Array.isArray(files) || files.length === 0) {
    return { problems: ['payload has no files array — nothing to install'], totalBytes: 0 };
  }
  if (files.length > BUDGETS.max_entry_count) {
    problems.push(`payload has ${files.length} entries, over the budget of ${BUDGETS.max_entry_count} (entry-count flood)`);
  }
  let totalBytes = 0;
  const seen = new Map();
  for (const [i, f] of files.entries()) {
    const where = `files[${i}]`;
    if (typeof f?.path !== 'string' || f.path.length === 0) {
      problems.push(`${where}: missing path`);
      continue;
    }
    if (path.isAbsolute(f.path) || /^[A-Za-z]:[\\/]/.test(f.path)) {
      problems.push(`${where}: absolute path ${JSON.stringify(f.path)} rejected`);
    }
    const segments = f.path.split('/');
    if (segments.includes('..') || segments.includes('') || segments.includes('.')) {
      problems.push(`${where}: traversal-shaped path ${JSON.stringify(f.path)} rejected`);
    }
    if (f.path.includes('\\') || CONTROL_BYTES_RE.test(f.path)) {
      problems.push(`${where}: control bytes or backslashes in path rejected`);
    }
    // The file-list has NO legitimate symlink use — any entry declaring one is hostile.
    if (f.symlink !== undefined || f.link !== undefined || f.type === 'symlink' || (typeof f.mode === 'number' && (f.mode & 0o170000) === 0o120000)) {
      problems.push(`${where}: symlink entry ${JSON.stringify(f.path)} rejected outright`);
    }
    const key = collisionKey(f.path);
    if (seen.has(key)) {
      const prior = seen.get(key);
      problems.push(
        prior === f.path
          ? `${where}: duplicate path ${JSON.stringify(f.path)}`
          : `${where}: ${JSON.stringify(f.path)} collides with ${JSON.stringify(prior)} on a case-folding or Unicode-normalizing filesystem — two entries, one file, and write order would decide the winner`
      );
    }
    seen.set(key, f.path);

    const bytes = typeof f.content === 'string' ? Buffer.byteLength(f.content, 'base64') : 0;
    if (bytes > BUDGETS.max_single_file_bytes) {
      problems.push(`${where}: ${bytes} bytes exceeds the single-file budget of ${BUDGETS.max_single_file_bytes}`);
    }
    totalBytes += bytes;
  }
  if (totalBytes > BUDGETS.max_total_bytes) {
    problems.push(`payload totals ${totalBytes} bytes, over the budget of ${BUDGETS.max_total_bytes}`);
  }
  return { problems, totalBytes };
}

// ── tree hash — the API's EXACT recipe ────────────────────────────────────────
//
// sha256 over sorted `${path}:${sha256(content)}` lines, where content is the
// STORED (base64) string [CODE:apps/api/src/routes/packs.ts:1655-1659]. Matching
// the registry's recipe byte-for-byte is the point; do not "improve" it here.

export function treeHash(files) {
  const lines = files
    .map((f) => `${f.path}:${createHash('sha256').update(f.content || '', 'utf8').digest('hex')}`)
    .sort()
    .join('\n');
  return `sha256:${createHash('sha256').update(lines, 'utf8').digest('hex')}`;
}

// ── registry anchor (FR-18 r2 · T3.3) ─────────────────────────────────────────

export async function readRegistryAnchor(slug, registryFile = 'registry.yaml') {
  let doc;
  try {
    doc = parseYaml(await readFile(registryFile, 'utf8'));
  } catch {
    return null; // no tracked registry here — the anchor simply doesn't exist
  }
  const rec = doc?.constructs?.[slug] ?? null;
  if (!rec) return null;
  return {
    git_url: rec.git_url ?? null,
    commit: rec.commit ?? null,          // optional pin — absent means TOFU on the git rung
    tree_hash: rec.tree_hash ?? null,    // optional expected hash — the trust anchor
    attested: rec.attested === true,     // registry-declared; a stripped sig on an attested pack is an attack
  };
}

// ── attestation (T3.1) — the audit substrate's crypto, exactly ────────────────

/**
 * Signed bytes = JCS({expiry, manifest, tree_hash}), Ed25519, single signature v1.
 *
 * `expiry` is INSIDE the signed object (T3.2b): binding it outside the signature
 * let an attacker strip or extend it while keeping a valid signature — enforcement
 * of a field nobody signed is theatre. `null` when absent, so a stripped expiry
 * changes the signed bytes and the signature simply fails.
 */
export function attestationBytes(manifest, tree_hash, expiry = null) {
  return Buffer.from(jcsCanonicalize({ expiry: expiry ?? null, manifest: manifest ?? null, tree_hash }), 'utf8');
}

export async function fetchPublisherKey(keyId, { fetchImpl = null } = {}) {
  const res = fetchImpl ? await fetchImpl(keyId) : (await apiFetch(`/public-keys/${encodeURIComponent(keyId)}`, { noCache: true })).data;
  const key = res?.public_key ?? res?.key ?? res?.data?.public_key ?? null;
  const status = res?.status ?? res?.data?.status ?? 'active';
  return { pem: key, status };
}

export async function verifyAttestation({ manifest, tree_hash, attestation, keyProvider = null, now = new Date() }) {
  if (!attestation?.signature || !attestation?.key_id) {
    throw new InstallError(
      '[STRIP-ATTACK] the registry declares this pack ATTESTED, but the payload carries no signature/key id — a stripped signature is a downgrade attack, and there is NO override for it',
      EXIT.INTEGRITY_MISMATCH,
      { code: 'STRIP_ATTACK', fix: 'refuse this payload; fetch from a channel that preserves the attestation' }
    );
  }
  if (attestation.expiry !== undefined && attestation.expiry !== null) {
    const at = new Date(attestation.expiry).getTime();
    if (Number.isNaN(at)) {
      throw new InstallError(`attestation expiry ${JSON.stringify(attestation.expiry)} is not a date`, EXIT.INTEGRITY_MISMATCH, { code: 'ATTESTATION_MALFORMED' });
    }
    if (at < now.getTime()) {
      throw new InstallError(`attestation expired at ${attestation.expiry}`, EXIT.INTEGRITY_MISMATCH, { code: 'ATTESTATION_EXPIRED' });
    }
  }
  const { pem, status } = await fetchPublisherKey(attestation.key_id, { fetchImpl: keyProvider });
  if (!pem) {
    throw new InstallError(`publisher key ${attestation.key_id} not found — cannot verify an attested pack`, EXIT.INTEGRITY_MISMATCH, { code: 'KEY_UNKNOWN' });
  }
  if (status === 'retired' || status === 'revoked') {
    throw new InstallError(
      `publisher key ${attestation.key_id} is ${status} — a revoked key verifies nothing`,
      EXIT.INTEGRITY_MISMATCH,
      { code: 'KEY_REVOKED', fix: 'the publisher must re-sign with a live key; do not install this payload' }
    );
  }
  let ok = false;
  try {
    ok = cryptoVerify(null, attestationBytes(manifest, tree_hash, attestation.expiry ?? null), createPublicKey(pem), Buffer.from(attestation.signature, 'base64'));
  } catch (err) {
    throw new InstallError(`attestation verification errored: ${err?.message ?? err}`, EXIT.INTEGRITY_MISMATCH, { code: 'SIGNATURE_INVALID' });
  }
  if (!ok) {
    throw new InstallError('attestation signature does not verify against the publisher key', EXIT.INTEGRITY_MISMATCH, { code: 'SIGNATURE_INVALID' });
  }
  return { verified: true, key_id: attestation.key_id };
}

// ── staging + landing (T3.2 · FL-SDD HIGH) ────────────────────────────────────
//
// The staging dir lives INSIDE the packs parent (same filesystem — an atomic
// rename cannot EXDEV) with a per-pack lock held across stage → rename. Nothing
// is made executable; overwrites touch only pack-marker-managed targets.

function packsParent(root) {
  return path.resolve(root, process.env.CONSTRUCTS_DIR || '.claude/constructs/packs');
}

async function stageFileList(stagingDir, files) {
  for (const f of files) {
    const target = path.join(stagingDir, f.path);
    // Containment: the resolved target must stay inside the staging dir.
    const resolved = path.resolve(target);
    if (resolved !== stagingDir && !resolved.startsWith(stagingDir + path.sep)) {
      throw new InstallError(`containment: ${JSON.stringify(f.path)} resolves outside the staging dir`, EXIT.INTEGRITY_MISMATCH, { code: 'CONTAINMENT' });
    }
    await mkdir(path.dirname(resolved), { recursive: true });
    await writeFile(resolved, Buffer.from(f.content || '', 'base64')); // default mode: no +x
  }
}

/** The git rung stages via git itself; repo-borne symlinks are rejected after checkout. */
async function assertNoSymlinks(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name === '.git') continue;
    const p = path.join(dir, e.name);
    const info = await lstat(p);
    if (info.isSymbolicLink()) {
      throw new InstallError(`containment: symlink ${p} in pack payload rejected outright`, EXIT.INTEGRITY_MISMATCH, { code: 'CONTAINMENT' });
    }
    if (info.isDirectory()) await assertNoSymlinks(p);
  }
}

async function landPack({ root, slug, stage }) {
  const parent = packsParent(root);
  const target = path.join(parent, slug);

  let replacing = false;
  try {
    await stat(target);
    replacing = true;
  } catch {
    replacing = false; // ENOENT: fresh install
  }

  if (!replacing) {
    await rename(stage, target);
    return target;
  }

  // Overwrite only pack-marker-managed targets: an unmanaged dir is user work.
  try {
    await access(path.join(target, '.construct-meta.json'));
  } catch {
    throw new InstallError(
      `${target} exists but has no .construct-meta.json marker — refusing to overwrite something this tool does not manage`,
      EXIT.REFUSED,
      { fix: 'move the directory aside, or remove it if it is yours to remove' }
    );
  }

  // Replace by SWAP, not by delete-then-rename (T3.2b): the old pack is renamed
  // aside first, so a failure mid-landing restores it. A delete-first replace
  // leaves a window where an interrupted install has destroyed the working pack
  // and installed nothing.
  const backup = path.join(parent, `.backup-${slug}-${process.pid}`);
  await rm(backup, { recursive: true, force: true });
  await rename(target, backup);
  try {
    await rename(stage, target);
  } catch (err) {
    await rename(backup, target).catch(() => {}); // restore what was working
    throw err;
  }
  await rm(backup, { recursive: true, force: true });
  return target;
}

// ── acquisition rungs ─────────────────────────────────────────────────────────

async function acquireApi(slug) {
  const dl = await apiFetch(`/packs/${encodeURIComponent(slug)}/download`, { noCache: true });
  const pack = dl.data?.data?.pack;
  if (!pack?.files) throw new InstallError(`api returned no file-list for ${slug}`, EXIT.TOOL_FAILURE);
  const hashRes = await apiFetch(`/packs/${encodeURIComponent(slug)}/hash`, { noCache: true });
  return {
    rung: 'api',
    files: pack.files,
    manifest: pack.manifest ?? null,
    version: pack.version ?? null,
    license: dl.data?.data?.license ?? null,
    attestation: pack.attestation ?? null,
    declaredHash: hashRes.data?.data?.hash ?? null,
  };
}

async function acquirePayloadFile(payloadFile) {
  const doc = JSON.parse(await readFile(payloadFile, 'utf8'));
  const pack = doc?.data?.pack ?? doc?.pack ?? doc;
  if (!Array.isArray(pack?.files)) {
    throw new InstallError(`${payloadFile} is not a pack payload (no files[])`, EXIT.CALLER_ERROR, { fix: 'save the download response JSON and pass that file' });
  }
  return {
    rung: 'payload-file',
    files: pack.files,
    manifest: pack.manifest ?? null,
    version: pack.version ?? null,
    license: doc?.data?.license ?? null,
    attestation: pack.attestation ?? null,
    declaredHash: null, // offline: the registry anchor is the only truth
  };
}

/**
 * The TOFU anchor store (T3.2b): trust-on-FIRST-use means the first commit is
 * PINNED and every later install must match it. Re-recording whatever HEAD says
 * on each run is not TOFU — it is trust-on-every-use, which is no trust at all.
 * Rotation is an explicit, audited act (--allow-integrity-mismatch --reason).
 */
function tofuAnchorPath(root, slug) {
  return path.join(root, 'grimoires', 'loa', 'territory', 'anchors', `${slug}.json`);
}

async function readTofuAnchor(root, slug) {
  try {
    return JSON.parse(await readFile(tofuAnchorPath(root, slug), 'utf8'));
  } catch {
    return null;
  }
}

async function writeTofuAnchor(root, slug, commit) {
  const file = tofuAnchorPath(root, slug);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify({ slug, commit, first_seen_at: nowIso() }, null, 2)}\n`, 'utf8');
}

async function acquireGit({ slug, anchor, stagingDir, root = '.', allowIntegrityMismatch = false }) {
  if (!anchor?.git_url) {
    throw new InstallError(`registry.yaml has no git_url for ${slug} — the git rung cannot answer`, EXIT.CALLER_ERROR, { fix: 'constructs list --json    # what the registry knows' });
  }
  await run('git', ['clone', '-q', anchor.git_url, stagingDir], { timeoutMs: 120_000 });
  let tofu = null;
  if (anchor.commit) {
    // T3.3: pin to the commit the TRACKED registry records.
    try {
      await run('git', ['-C', stagingDir, 'checkout', '-q', '--detach', anchor.commit], { timeoutMs: 30_000 });
    } catch {
      throw new InstallError(`registry pins ${slug} to ${anchor.commit}, which does not exist in ${anchor.git_url}`, EXIT.INTEGRITY_MISMATCH, { code: 'ANCHOR_MISMATCH' });
    }
  } else {
    const { stdout } = await run('git', ['-C', stagingDir, 'rev-parse', 'HEAD'], { timeoutMs: 15_000 });
    const head = stdout.trim();
    const pinned = await readTofuAnchor(root, slug);
    if (pinned && pinned.commit !== head) {
      if (!allowIntegrityMismatch) {
        throw new InstallError(
          `TOFU anchor mismatch for ${slug}: first-seen ${pinned.commit} (pinned ${pinned.first_seen_at}), remote HEAD is now ${head}. An unpinned construct is trusted on FIRST use; a changed HEAD is a rotation, not a routine update`,
          EXIT.INTEGRITY_MISMATCH,
          { code: 'TOFU_MISMATCH', fix: 'verify the change is legitimate, then rotate knowingly: --allow-integrity-mismatch --reason "<why>"' }
        );
      }
      process.stderr.write(`warning: rotating the TOFU anchor for ${slug}: ${pinned.commit} -> ${head}\n`);
      await run('git', ['-C', stagingDir, 'checkout', '-q', '--detach', head], { timeoutMs: 30_000 });
      await writeTofuAnchor(root, slug, head);
      tofu = head;
    } else if (pinned) {
      // Pinned and matching: check out the pin explicitly, never "whatever HEAD is".
      await run('git', ['-C', stagingDir, 'checkout', '-q', '--detach', pinned.commit], { timeoutMs: 30_000 });
      tofu = pinned.commit;
    } else {
      await writeTofuAnchor(root, slug, head);
      tofu = head;
      process.stderr.write(`notice: registry.yaml records no commit for ${slug} — first fetch is trust-on-first-use; pinned first-seen:${head.slice(0, 12)} (later installs must match it)\n`);
    }
  }
  try {
    await readFile(path.join(stagingDir, 'construct.yaml'), 'utf8');
  } catch {
    throw new InstallError(`${anchor.git_url} has no construct.yaml at its root — not a construct`, EXIT.INTEGRITY_MISMATCH, { code: 'NOT_A_CONSTRUCT' });
  }
  await assertNoSymlinks(stagingDir);
  await rm(path.join(stagingDir, '.git'), { recursive: true, force: true });
  const head = anchor.commit ?? tofu ?? 'unknown';
  return { rung: 'registry-git', head, tofu: tofu !== null };
}

// ── the install flow ──────────────────────────────────────────────────────────

export async function install({
  slug,
  root = '.',
  rung = 'api',
  payloadFile = null,
  dryRun = false,
  allowIntegrityMismatch = false,
  reason = null,
  registryFile = 'registry.yaml',
  keyProvider = null,
} = {}) {
  if (!/^[a-z][a-z0-9-]*$/.test(slug ?? '')) {
    throw new InstallError(`invalid slug ${JSON.stringify(slug)}`, EXIT.CALLER_ERROR, { fix: 'constructs list --json    # what exists' });
  }
  if (allowIntegrityMismatch && (!reason || reason.trim().length < 8)) {
    throw new InstallError('--allow-integrity-mismatch requires --reason <text> (at least 8 chars) — the override is logged with your name on it', EXIT.CALLER_ERROR);
  }

  const anchor = await readRegistryAnchor(slug, path.join(root, registryFile)).catch(() => null);
  const parent = packsParent(root);
  await mkdir(parent, { recursive: true });
  const stagingDir = path.join(parent, `.staging-${slug}-${process.pid}`);

  return withReceiptLock(parent, async () => {
    await rm(stagingDir, { recursive: true, force: true });
    try {
      let acquisition;
      let computedHash = null;
      let gitInfo = null;
      let anchorLabel = 'none';
      let outcome = 'verified';
      let keyId = null;

      if (rung === 'git' || rung === 'registry-git') {
        await mkdir(stagingDir, { recursive: true });
        const packStage = path.join(stagingDir, 'pack');
        gitInfo = await acquireGit({ slug, anchor, stagingDir: packStage, root, allowIntegrityMismatch });
        acquisition = { rung: 'registry-git', files: null, manifest: null, version: null, attestation: null, declaredHash: null };
        if (!dryRun) {
          // The git rung leaves the SAME pack marker as the file-list rung — without
          // it, a git-installed pack is "unmanaged" to its own tool and can never be
          // updated (found by the T3.2b TOFU fixture).
          await writeFile(
            path.join(packStage, '.construct-meta.json'),
            JSON.stringify({ slug, version: null, source_type: 'git', commit: gitInfo.head, installed_at: nowIso() }, null, 2)
          );
        }
      } else {
        acquisition = rung === 'payload' || payloadFile ? await acquirePayloadFile(payloadFile) : await acquireApi(slug);

        // T3.2: containment BEFORE any byte reaches disk.
        const { problems } = validateFileList(acquisition.files);
        if (problems.length) {
          throw new InstallError(`payload containment failed (${problems.length} problem${problems.length > 1 ? 's' : ''})`, EXIT.INTEGRITY_MISMATCH, { code: 'CONTAINMENT', details: problems });
        }

        // T3.1: integrity against the registry anchor (falls back to the API's
        // declared hash, which shares the download's origin — stated in SDD §5).
        computedHash = treeHash(acquisition.files);
        const expected = anchor?.tree_hash ?? acquisition.declaredHash;
        anchorLabel = anchor?.tree_hash ? `registry:${anchor.tree_hash}` : acquisition.declaredHash ? 'declared-hash:api' : 'none';
        if (expected && expected !== computedHash) {
          if (!allowIntegrityMismatch) {
            throw new InstallError(
              `content hash mismatch for ${slug}: computed ${computedHash}, anchor expects ${expected}`,
              EXIT.INTEGRITY_MISMATCH,
              { code: 'HASH_MISMATCH', fix: 'refuse, or knowingly bypass the HASH CHECK ONLY: --allow-integrity-mismatch --reason "<why>"' }
            );
          }
          outcome = 'hash-overridden';
        } else if (!expected) {
          // No anchor anywhere: nothing to verify against. Refuse rather than pretend.
          throw new InstallError(
            `no integrity anchor for ${slug}: registry.yaml declares no tree_hash and the api offered no hash`,
            EXIT.INTEGRITY_MISMATCH,
            { code: 'NO_ANCHOR', fix: 'add a tree_hash for this construct to registry.yaml, or install --rung git' }
          );
        }

        // T3.1: attestation. The REGISTRY decides whether this pack is attested;
        // the payload cannot talk its way out of it. The override flag never
        // reaches this branch — signature checks have no bypass.
        if (anchor?.attested) {
          const att = await verifyAttestation({ manifest: acquisition.manifest, tree_hash: computedHash, attestation: acquisition.attestation, keyProvider });
          keyId = att.key_id;
          if (outcome !== 'hash-overridden') outcome = 'attested-verified';
        }

        if (!dryRun) {
          const packStage = path.join(stagingDir, 'pack');
          await mkdir(packStage, { recursive: true });
          await stageFileList(packStage, acquisition.files);
          if (acquisition.license) {
            await writeFile(path.join(packStage, '.license.json'), JSON.stringify(acquisition.license, null, 2));
          }
          await writeFile(
            path.join(packStage, '.construct-meta.json'),
            JSON.stringify({ slug, version: acquisition.version, source_type: 'registry', tree_hash: computedHash, installed_at: nowIso() }, null, 2)
          );
        }
      }

      const receiptPayload = {
        record_version: '1.0',
        kind: 'install',
        ts: nowIso(),
        actor: os.userInfo().username,
        construct: slug,
        ...(acquisition.version ? { version: String(acquisition.version) } : {}),
        install: {
          rung: acquisition.rung,
          tree_hash: computedHash ?? `sha256:${'0'.repeat(64)}`,
          outcome,
          anchor: gitInfo
            ? gitInfo.tofu
              ? `first-seen:${gitInfo.head}`
              : `registry-commit:${gitInfo.head}`
            : anchorLabel,
          ...(allowIntegrityMismatch && outcome === 'hash-overridden' ? { override_reason: reason.trim() } : {}),
          ...(typeof keyId === 'string' ? { key_id: keyId } : {}),
        },
      };

      const schema = await installReceiptSchema();
      const { valid, errors } = validateSchema(schema, receiptPayload);
      if (!valid) throw new InstallError(`install receipt failed its own schema: ${errors.join('; ')}`, EXIT.TOOL_FAILURE);

      if (dryRun) {
        return { mode: 'dry-run', slug, payload: receiptPayload };
      }

      const landed = await landPack({ root, slug, stage: path.join(stagingDir, 'pack') });

      const receiptsDir = path.join(root, 'grimoires', 'loa', 'territory', 'receipts');
      await mkdir(receiptsDir, { recursive: true });
      const record = await writeRecordUnlocked(receiptsDir, receiptPayload);

      return { mode: 'installed', slug, path: landed, receipt_path: record.receipt_path, payload: receiptPayload };
    } finally {
      await rm(stagingDir, { recursive: true, force: true });
    }
  });
}

function nowIso() {
  const epoch = process.env.SOURCE_DATE_EPOCH;
  const d = epoch !== undefined && /^[0-9]{1,12}$/.test(epoch) ? new Date(Number(epoch) * 1000) : new Date();
  return d.toISOString().replace(/\.[0-9]{3}Z$/, 'Z');
}

export default { install, validateFileList, treeHash, verifyAttestation, attestationBytes, readRegistryAnchor, BUDGETS, InstallError };
