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

import { createHash, createPublicKey, randomUUID, verify as cryptoVerify } from 'node:crypto';
import { readFile, writeFile, mkdir, rename, rm, stat, lstat, readdir, access, chmod, mkdtemp } from 'node:fs/promises';
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
  // Conservative relative-name envelope shared by payload and git rungs.
  // Bytes, not JS code units: destination filesystems enforce encoded names.
  max_path_component_bytes: 255,
  max_path_bytes: 1024,
});

const CONTROL_BYTES_RE = /[\x00-\x1f\x7f]/; // C0 + DEL in a file NAME are never legitimate
const GIT_OBJECT_ID_RE = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/;
// Root namespaces owned by the installer. Source payloads may not provide or
// nest beneath them because the installer adds these bytes after acquisition
// verification; accepting collisions would let the receipt attest bytes that
// are overwritten before the pack lands.
const INSTALLER_OWNED_ROOTS = new Set(['.construct-meta.json', '.license.json', '.git']);

function canonicalBase64ByteLength(value) {
  if (typeof value !== 'string') return null;
  if (value === '') return 0;
  if (value.length % 4 !== 0) return null;
  let padding = 0;
  if (value.endsWith('=')) padding++;
  if (value.endsWith('==')) padding++;
  let lastValue = 0;
  for (let i = 0; i < value.length - padding; i++) {
    const code = value.charCodeAt(i);
    if (code >= 0x41 && code <= 0x5a) lastValue = code - 0x41;
    else if (code >= 0x61 && code <= 0x7a) lastValue = code - 0x61 + 26;
    else if (code >= 0x30 && code <= 0x39) lastValue = code - 0x30 + 52;
    else if (code === 0x2b) lastValue = 62;
    else if (code === 0x2f) lastValue = 63;
    else return null;
  }
  if (padding > 2 || value.slice(0, -padding || undefined).includes('=')) return null;
  // Canonical padding has zeroed unused bits. Checking them directly avoids
  // allocating a decoded buffer before the size budget has accepted the entry.
  if ((padding === 2 && (lastValue & 0x0f) !== 0) || (padding === 1 && (lastValue & 0x03) !== 0)) return null;
  return (value.length / 4) * 3 - padding;
}

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
  // Win32 additionally STRIPS trailing dots and spaces from each segment, so
  // `a` and `a.` and `a ` are one file there (review pass 1). Fold that in.
  return p
    .normalize('NFC')
    .toLowerCase()
    .split('/')
    .map((seg) => seg.replace(/[. ]+$/, ''))
    .join('/');
}

// Win32 reserved device basenames — `CON`, `NUL`, `COM1`… alias to devices even
// WITH an extension (`con.txt` opens the console). A pack entry named for one is
// never legitimate.
const WIN32_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i;
const WIN32_FORBIDDEN = /[<>:"|?*]/;

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
    if (INSTALLER_OWNED_ROOTS.has(segments[0])) {
      problems.push(`${where}: path ${JSON.stringify(f.path)} occupies installer-owned root ${JSON.stringify(segments[0])}`);
    }
    const encodedPathBytes = Buffer.byteLength(f.path, 'utf8');
    if (encodedPathBytes > BUDGETS.max_path_bytes) {
      problems.push(`${where}: path is ${encodedPathBytes} bytes, over the portable path budget of ${BUDGETS.max_path_bytes}`);
    }
    if (segments.includes('..') || segments.includes('') || segments.includes('.')) {
      problems.push(`${where}: traversal-shaped path ${JSON.stringify(f.path)} rejected`);
    }
    if (f.path.includes('\\') || CONTROL_BYTES_RE.test(f.path)) {
      problems.push(`${where}: control bytes or backslashes in path rejected`);
    }
    for (const seg of segments) {
      const encodedSegmentBytes = Buffer.byteLength(seg, 'utf8');
      if (encodedSegmentBytes > BUDGETS.max_path_component_bytes) {
        problems.push(`${where}: path component ${JSON.stringify(seg)} is ${encodedSegmentBytes} bytes, over the portable component budget of ${BUDGETS.max_path_component_bytes}`);
      }
      if (WIN32_FORBIDDEN.test(seg)) {
        problems.push(`${where}: ${JSON.stringify(f.path)} contains a character forbidden in Windows filenames (< > : " | ? *)`);
      }
      if (WIN32_RESERVED.test(seg)) {
        problems.push(`${where}: ${JSON.stringify(f.path)} contains the reserved device name ${JSON.stringify(seg)} — it aliases a device on Windows even with an extension`);
      }
      if (/[. ]$/.test(seg)) {
        problems.push(`${where}: ${JSON.stringify(f.path)} has a segment ending in a dot or space — Windows silently strips those, so two entries become one file`);
      }
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

    const bytes = canonicalBase64ByteLength(f.content);
    if (bytes === null) {
      problems.push(`${where}: content must be canonical padded base64`);
    }
    const safeBytes = bytes ?? 0;
    if (safeBytes > BUDGETS.max_single_file_bytes) {
      problems.push(`${where}: ${safeBytes} bytes exceeds the single-file budget of ${BUDGETS.max_single_file_bytes}`);
    }
    totalBytes += safeBytes;
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
  // Absence and failure are DIFFERENT facts (review pass 1 — the same class as
  // sprint-228's HIGH-4, repeated here). An ABSENT registry means "no tracked
  // anchor". An UNREADABLE or malformed one must fail CLOSED: silently treating
  // it as absent would fall back to the same-origin API hash AND drop the
  // registry's `attested` flag — quietly disabling STRIP-ATTACK protection.
  let raw;
  try {
    raw = await readFile(registryFile, 'utf8');
  } catch (err) {
    if (err?.code === 'ENOENT') return null; // genuinely no tracked registry
    throw new InstallError(
      `tracked registry ${registryFile} exists but cannot be read: ${err?.message ?? err}`,
      EXIT.INTEGRITY_MISMATCH,
      { code: 'REGISTRY_UNREADABLE', fix: 'fix the file permissions; an unreadable trust anchor is not a missing one' }
    );
  }
  let doc;
  try {
    doc = parseYaml(raw);
  } catch (err) {
    throw new InstallError(
      `tracked registry ${registryFile} does not parse: ${err?.message ?? err}`,
      EXIT.INTEGRITY_MISMATCH,
      { code: 'REGISTRY_MALFORMED', fix: 'repair registry.yaml; a trust anchor that cannot be read cannot be trusted' }
    );
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
  // Status is part of the trust decision, not optional metadata. A response
  // that omits it must fail closed rather than silently manufacturing active.
  const status = res?.status ?? res?.data?.status ?? null;
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
    // Expiry is an exclusive upper bound: at the named instant the credential
    // is already invalid, matching JWT/OAuth-style temporal semantics.
    if (at <= now.getTime()) {
      throw new InstallError(`attestation expired at ${attestation.expiry}`, EXIT.INTEGRITY_MISMATCH, { code: 'ATTESTATION_EXPIRED' });
    }
  }
  const { pem, status } = await fetchPublisherKey(attestation.key_id, { fetchImpl: keyProvider });
  if (!pem) {
    throw new InstallError(`publisher key ${attestation.key_id} not found — cannot verify an attested pack`, EXIT.INTEGRITY_MISMATCH, { code: 'KEY_UNKNOWN' });
  }
  if (status !== 'active') {
    const reportedStatus = typeof status === 'string' && status.length > 0 ? status : 'missing';
    const revoked = reportedStatus === 'retired' || reportedStatus === 'revoked';
    throw new InstallError(
      `publisher key ${attestation.key_id} is ${reportedStatus}, not active — an inactive key verifies nothing`,
      EXIT.INTEGRITY_MISMATCH,
      {
        code: revoked ? 'KEY_REVOKED' : 'KEY_INACTIVE',
        fix: 'the publisher must re-sign with an explicitly active key; do not install this payload',
      }
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

/**
 * Refuse early if the target exists but is not ours to replace. Called BEFORE any
 * durable write, so an unmanaged directory costs nothing.
 */
async function assertReplaceable(root, slug) {
  const target = path.join(packsParent(root), slug);
  try {
    await stat(target);
  } catch (err) {
    if (err?.code === 'ENOENT') return; // fresh install, nothing to protect
    throw new InstallError(
      `cannot inspect existing install target ${target}: ${err?.message ?? err}`,
      EXIT.TOOL_FAILURE,
      { code: 'FILESYSTEM_LOOKUP_FAILED', fix: 'fix the path or filesystem permissions, then retry' }
    );
  }
  try {
    await access(path.join(target, '.construct-meta.json'));
  } catch (err) {
    if (err?.code !== 'ENOENT') {
      throw new InstallError(
        `cannot inspect ownership marker for ${target}: ${err?.message ?? err}`,
        EXIT.TOOL_FAILURE,
        { code: 'FILESYSTEM_LOOKUP_FAILED', fix: 'fix the path or filesystem permissions, then retry' }
      );
    }
    throw new InstallError(
      `${target} exists but has no .construct-meta.json marker — refusing to overwrite something this tool does not manage`,
      EXIT.REFUSED,
      { fix: 'move the directory aside, or remove it if it is yours to remove' }
    );
  }
}

/**
 * The pack swap — the transaction's filesystem commit point (review pass 2).
 *
 * A prepared receipt is written before this rename. The TOFU anchor and committed
 * receipt are published only after it succeeds. A crash therefore leaves an honest
 * prepared record rather than a false completed install or a prematurely rotated
 * trust anchor. The staged pack carries its own provenance marker, so recovery can
 * always identify what crossed the filesystem commit point.
 */
async function swapPackIn({ root, slug, stage, transactionId }) {
  const parent = packsParent(root);
  const target = path.join(parent, slug);

  let replacing = false;
  try {
    await stat(target);
    replacing = true;
  } catch (err) {
    if (err?.code === 'ENOENT') replacing = false;
    else {
      throw new InstallError(
        `cannot inspect install target ${target} at the commit point: ${err?.message ?? err}`,
        EXIT.TOOL_FAILURE,
        { code: 'FILESYSTEM_LOOKUP_FAILED', fix: 'fix the path or filesystem permissions, then retry' }
      );
    }
  }

  const recoveryPrefix = `.backup-${slug}-`;
  const recoveryState = (await readdir(parent)).filter((name) => name.startsWith(recoveryPrefix));
  if (recoveryState.length > 0) {
    throw new InstallError(
      `recovery state exists for ${slug}: ${recoveryState.join(', ')} — refusing to overwrite or discard an ambiguous prior backup`,
      EXIT.REFUSED,
      { code: 'RECOVERY_STATE_EXISTS', fix: `reconcile or move ${path.join(parent, recoveryState[0])}, then retry` }
    );
  }

  if (!replacing) {
    await rename(stage, target);
    return { target, backup: null };
  }

  const backup = path.join(parent, `${recoveryPrefix}${transactionId.replace(/^sha256:/, '')}`);
  await rename(target, backup);

  // Revalidate the EXACT directory we just moved (review pass 3). assertReplaceable
  // ran before the anchor and receipt writes; a directory substituted in that window
  // would otherwise be replaced without ever being checked. Validating the moved
  // backup closes the window — there is nothing left to substitute.
  try {
    await access(path.join(backup, '.construct-meta.json'));
  } catch (err) {
    let restoreError = null;
    await rename(backup, target).catch((restoreErr) => {
      restoreError = restoreErr;
    });
    if (restoreError) {
      throw new InstallError(
        `ownership revalidation for ${target} failed (${err?.message ?? err}) AND the previous pack could not be restored (${restoreError?.message ?? restoreError})`,
        EXIT.TOOL_FAILURE,
        { code: 'ROLLBACK_FAILED', fix: `your previous pack is intact at ${backup} — move it back to ${target}` }
      );
    }
    if (err?.code !== 'ENOENT') {
      throw new InstallError(
        `cannot inspect ownership marker for ${target} at the commit point: ${err?.message ?? err}`,
        EXIT.TOOL_FAILURE,
        { code: 'FILESYSTEM_LOOKUP_FAILED', fix: 'fix the path or filesystem permissions, then retry' }
      );
    }
    throw new InstallError(
      `${target} changed under us and has no .construct-meta.json marker — refusing to overwrite something this tool does not manage`,
      EXIT.REFUSED,
      { fix: 'move the directory aside, or remove it if it is yours to remove, then retry' }
    );
  }

  try {
    await rename(stage, target);
  } catch (err) {
    // Restoration failure is NEVER silent (review pass 2): the operator is told
    // exactly where the working pack is, so it can be put back by hand.
    try {
      await rename(backup, target);
    } catch (restoreErr) {
      throw new InstallError(
        `landing ${slug} failed (${err?.message ?? err}) AND the previous pack could not be restored (${restoreErr?.message ?? restoreErr})`,
        EXIT.TOOL_FAILURE,
        { code: 'ROLLBACK_FAILED', fix: `your previous pack is intact at ${backup} — move it back to ${target}` }
      );
    }
    throw err;
  }
  // The caller retains the backup until trust + receipt metadata commits. That
  // keeps post-rename failures reversible instead of reporting failure with a
  // different pack already active.
  return { target, backup };
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

/**
 * Absent means "never installed". Malformed or unreadable means the trust state
 * is UNKNOWN — and unknown trust must never read as fresh trust (review pass 1).
 */
async function readTofuAnchor(root, slug) {
  const file = tofuAnchorPath(root, slug);
  let raw;
  try {
    raw = await readFile(file, 'utf8');
  } catch (err) {
    if (err?.code === 'ENOENT') return null; // never installed: first use is next
    throw new InstallError(
      `TOFU anchor ${file} exists but cannot be read: ${err?.message ?? err}`,
      EXIT.INTEGRITY_MISMATCH,
      { code: 'TOFU_UNREADABLE', fix: 'fix permissions, or delete the anchor to knowingly re-establish first-use trust' }
    );
  }
  let doc;
  try {
    doc = JSON.parse(raw);
  } catch {
    throw new InstallError(
      `TOFU anchor ${file} is malformed — the pinned commit is unreadable, so trust state is UNKNOWN`,
      EXIT.INTEGRITY_MISMATCH,
      { code: 'TOFU_MALFORMED', fix: 'delete the anchor to knowingly re-establish first-use trust' }
    );
  }
  if (typeof doc?.commit !== 'string' || !GIT_OBJECT_ID_RE.test(doc.commit)) {
    throw new InstallError(
      `TOFU anchor ${file} has no valid pinned commit`,
      EXIT.INTEGRITY_MISMATCH,
      { code: 'TOFU_MALFORMED', fix: 'delete the anchor to knowingly re-establish first-use trust' }
    );
  }
  const inferredFormat = doc.commit.length === 64 ? 'sha256' : 'sha1';
  if (doc.object_format !== undefined && doc.object_format !== inferredFormat) {
    throw new InstallError(
      `TOFU anchor ${file} declares ${doc.object_format} but its commit is ${inferredFormat}-shaped`,
      EXIT.INTEGRITY_MISMATCH,
      { code: 'TOFU_MALFORMED', fix: 'repair the anchor metadata or delete it to knowingly re-establish first-use trust' }
    );
  }
  return doc;
}

/** Atomic: an interrupted write must not leave a half-anchor that reads as absent. */
async function writeTofuAnchor(root, slug, commit) {
  const file = tofuAnchorPath(root, slug);
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}`;
  const objectFormat = commit.length === 64 ? 'sha256' : 'sha1';
  await writeFile(tmp, `${JSON.stringify({ slug, commit, object_format: objectFormat, first_seen_at: nowIso() }, null, 2)}\n`, 'utf8');
  await rename(tmp, file);
}

function installTransactionPayload(receiptPayload, transactionState, attemptNonce = randomUUID()) {
  const transactionId = `sha256:${createHash('sha256')
    .update(jcsCanonicalize({ receipt: receiptPayload, attempt_nonce: attemptNonce }), 'utf8')
    .digest('hex')}`;
  return {
    ...receiptPayload,
    install: {
      ...receiptPayload.install,
      attempt_nonce: attemptNonce,
      transaction_id: transactionId,
      transaction_state: transactionState,
    },
  };
}

async function stampStageTransaction(stage, transactionId) {
  const marker = path.join(stage, '.construct-meta.json');
  let meta;
  try {
    meta = JSON.parse(await readFile(marker, 'utf8'));
  } catch (err) {
    throw new InstallError(
      `cannot bind staged pack to install transaction ${transactionId}: ${err?.message ?? err}`,
      EXIT.TOOL_FAILURE,
      { code: 'TRANSACTION_MARKER_FAILED' }
    );
  }
  await writeFile(marker, `${JSON.stringify({ ...meta, transaction_id: transactionId }, null, 2)}\n`, 'utf8');
}

async function rollbackPackSwap({ target, backup }, transactionId, onQuarantined = null) {
  // Fast fail for the ordinary stale-writer case: if a newer install or user
  // directory is already visible, leave its canonical path untouched. This is
  // not the destructive safety check—the same marker is revalidated after the
  // atomic rename below—but it preserves availability for replacements that
  // happened before rollback began.
  let observed;
  try {
    observed = JSON.parse(await readFile(path.join(target, '.construct-meta.json'), 'utf8'));
  } catch (err) {
    throw new InstallError(
      `rollback conflict at ${target}: the visible transaction marker cannot be read (${err?.message ?? err}); preserving the current target${backup ? ` and backup ${backup}` : ''}`,
      EXIT.TOOL_FAILURE,
      { code: 'ROLLBACK_CONFLICT' }
    );
  }
  if (observed?.transaction_id !== transactionId) {
    throw new InstallError(
      `rollback conflict at ${target}: expected transaction ${transactionId}, found ${observed?.transaction_id ?? 'no transaction marker'}; preserving the current target${backup ? ` and backup ${backup}` : ''}`,
      EXIT.TOOL_FAILURE,
      { code: 'ROLLBACK_CONFLICT' }
    );
  }

  // Take ownership of one exact filesystem object before inspecting or deleting
  // it. The target path can be replaced by an external actor at any time; an
  // unguessable, transaction-scoped rename keeps all later destructive work on
  // the directory that this rollback actually claimed.
  const quarantine = path.join(
    path.dirname(target),
    `.rollback-${path.basename(target)}-${transactionId.replace(/^sha256:/, '')}-${randomUUID()}`
  );
  try {
    await rename(target, quarantine);
  } catch (err) {
    throw new InstallError(
      `rollback conflict at ${target}: the landed target could not be quarantined (${err?.message ?? err}); preserving the current target${backup ? ` and backup ${backup}` : ''}`,
      EXIT.TOOL_FAILURE,
      { code: 'ROLLBACK_CONFLICT' }
    );
  }

  let current;
  try {
    current = JSON.parse(await readFile(path.join(quarantine, '.construct-meta.json'), 'utf8'));
  } catch (err) {
    throw new InstallError(
      `rollback conflict at ${target}: the quarantined transaction marker cannot be read (${err?.message ?? err}); preserving ${quarantine}${backup ? ` and ${backup}` : ''}`,
      EXIT.TOOL_FAILURE,
      { code: 'ROLLBACK_CONFLICT' }
    );
  }
  if (current?.transaction_id !== transactionId) {
    throw new InstallError(
      `rollback conflict at ${target}: expected transaction ${transactionId}, found ${current?.transaction_id ?? 'no transaction marker'}; preserving ${quarantine}${backup ? ` and ${backup}` : ''}`,
      EXIT.TOOL_FAILURE,
      { code: 'ROLLBACK_CONFLICT' }
    );
  }

  // Fault-injection seam used to prove that a new target created after
  // ownership validation is never deleted. Production callers leave it null.
  if (onQuarantined) await onQuarantined({ target, backup, quarantine, transactionId });

  // Restore the prior pack before deleting the failed landing. If an external
  // actor has already created a new target, rename fails closed and both the
  // backup and quarantined landing remain available for reconciliation.
  if (backup) await rename(backup, target);
  await rm(quarantine, { recursive: true, force: true });
}

async function finishPackSwap({ backup }, slug) {
  if (!backup) return;
  // Backup cleanup happens after the metadata commit point. It cannot change a
  // successful install into a reported failure.
  await rm(backup, { recursive: true, force: true }).catch(() => {
    process.stderr.write(`warning: installed ${slug}, but the old pack's backup could not be removed: ${backup}\n`);
  });
}

async function restoreTofuAnchor(root, slug, priorRaw) {
  const file = tofuAnchorPath(root, slug);
  const tmp = `${file}.tmp-${process.pid}`;
  await rm(tmp, { force: true }).catch(() => {});
  if (priorRaw === null) {
    await rm(file, { force: true });
    return;
  }
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(tmp, priorRaw, 'utf8');
  await rename(tmp, file);
}

/**
 * Commit one install while the caller holds the receipts lock.
 *
 * The prepared receipt is the write-ahead record. The pack rename is the
 * filesystem commit point. Only committed reality may rotate trust or emit the
 * completed receipt. Failed or killed landings are therefore distinguishable
 * from successful installs and converge safely on retry.
 */
export async function commitInstallTransaction({
  root,
  slug,
  stage,
  receiptsDir,
  receiptPayload,
  pendingAnchor = null,
  recordWriter = writeRecordUnlocked,
  rollbackOwnershipHook = null,
}) {
  let priorAnchorRaw = null;
  if (pendingAnchor) {
    try {
      priorAnchorRaw = await readFile(tofuAnchorPath(root, slug), 'utf8');
    } catch (err) {
      if (err?.code !== 'ENOENT') {
        throw new InstallError(
          `cannot snapshot the existing TOFU anchor before install: ${err?.message ?? err}`,
          EXIT.TOOL_FAILURE,
          { code: 'FILESYSTEM_LOOKUP_FAILED', fix: 'fix the anchor path or filesystem permissions, then retry' }
        );
      }
    }
  }

  // Content identity and event identity are different: SOURCE_DATE_EPOCH may
  // deliberately make otherwise-identical receipts reproducible, but every
  // real install attempt still needs its own lifecycle join key.
  const attemptNonce = randomUUID();
  const lifecyclePayload = (state) => installTransactionPayload(receiptPayload, state, attemptNonce);
  const preparedPayload = lifecyclePayload('prepared');
  const preparedRecord = await recordWriter(receiptsDir, preparedPayload);
  const transactionId = preparedPayload.install.transaction_id;
  let swap;
  try {
    await stampStageTransaction(stage, transactionId);
    swap = await swapPackIn({ root, slug, stage, transactionId });
  } catch (err) {
    try {
      await recordWriter(receiptsDir, lifecyclePayload('aborted'));
    } catch (terminalErr) {
      throw new InstallError(
        `install aborted before landing (${err?.message ?? err}) AND its terminal receipt could not be written (${terminalErr?.message ?? terminalErr})`,
        EXIT.TOOL_FAILURE,
        { code: 'ABORT_RECORD_FAILED', fix: `inspect prepared transaction ${transactionId} before retrying` }
      );
    }
    throw err;
  }
  try {
    if (pendingAnchor) await writeTofuAnchor(root, slug, pendingAnchor);

    const committedPayload = lifecyclePayload('committed');
    const committedRecord = await recordWriter(receiptsDir, committedPayload);
    await finishPackSwap(swap, slug);
    return { landed: swap.target, preparedRecord, committedRecord, committedPayload };
  } catch (err) {
    const rollbackErrors = [];
    await rollbackPackSwap(swap, transactionId, rollbackOwnershipHook).catch((rollbackErr) => rollbackErrors.push(`pack: ${rollbackErr?.message ?? rollbackErr}`));
    if (pendingAnchor) {
      await restoreTofuAnchor(root, slug, priorAnchorRaw).catch((rollbackErr) => rollbackErrors.push(`anchor: ${rollbackErr?.message ?? rollbackErr}`));
    }
    const terminalState = rollbackErrors.length > 0 ? 'rollback_failed' : 'rolled_back';
    await recordWriter(receiptsDir, lifecyclePayload(terminalState)).catch((terminalErr) => {
      rollbackErrors.push(`terminal receipt: ${terminalErr?.message ?? terminalErr}`);
    });
    if (rollbackErrors.length > 0) {
      throw new InstallError(
        `install metadata commit failed (${err?.message ?? err}) AND rollback was incomplete (${rollbackErrors.join('; ')})`,
        EXIT.TOOL_FAILURE,
        { code: 'ROLLBACK_FAILED', fix: `inspect ${swap.target}${swap.backup ? ` and ${swap.backup}` : ''} before retrying` }
      );
    }
    throw new InstallError(
      `install metadata commit failed after landing ${slug}; the previous filesystem and trust state were restored: ${err?.message ?? err}`,
      EXIT.TOOL_FAILURE,
      { code: 'METADATA_COMMIT_FAILED', fix: 'fix the receipt or anchor storage failure, then retry' }
    );
  }
}

async function inspectGitTree(stagingDir, ref) {
  const { stdout } = await run('git', ['-C', stagingDir, 'ls-tree', '-r', '-l', '-z', ref], {
    timeoutMs: 30_000,
    encoding: 'buffer',
  });
  return validateGitTreeBytes(stdout);
}

/** Validate the exact NUL-delimited bytes emitted by `git ls-tree -z`. */
export function validateGitTreeBytes(stdout) {
  if (!Buffer.isBuffer(stdout)) {
    throw new InstallError('git tree inspection did not return raw bytes', EXIT.TOOL_FAILURE, { code: 'GIT_TREE_MALFORMED' });
  }

  const records = [];
  let recordStart = 0;
  for (let i = 0; i < stdout.length; i += 1) {
    if (stdout[i] !== 0) continue;
    records.push(stdout.subarray(recordStart, i));
    recordStart = i + 1;
  }
  if (recordStart !== stdout.length) {
    throw new InstallError('git tree output is missing its final NUL delimiter', EXIT.INTEGRITY_MISMATCH, { code: 'GIT_TREE_MALFORMED' });
  }
  if (records.length > BUDGETS.max_entry_count) {
    throw new InstallError(
      `git tree has ${records.length} entries, over the budget of ${BUDGETS.max_entry_count}`,
      EXIT.INTEGRITY_MISMATCH,
      { code: 'GIT_BUDGET_EXCEEDED' }
    );
  }

  const paths = [];
  let totalBytes = 0n;
  for (const record of records) {
    const tab = record.indexOf(0x09);
    if (tab <= 0 || tab === record.length - 1) {
      throw new InstallError(`cannot parse git tree entry bytes ${record.toString('hex').slice(0, 160)}`, EXIT.INTEGRITY_MISMATCH, { code: 'GIT_TREE_MALFORMED' });
    }
    const headerBytes = record.subarray(0, tab);
    if (headerBytes.some((byte) => byte > 0x7f)) {
      throw new InstallError('git tree entry header contains non-ASCII bytes', EXIT.INTEGRITY_MISMATCH, { code: 'GIT_TREE_MALFORMED' });
    }
    const header = headerBytes.toString('ascii');
    const match = /^(\d{6})\s+(\S+)\s+([0-9a-f]+)\s+(-|\d+)$/.exec(header);
    if (!match) {
      throw new InstallError(`cannot parse git tree entry header ${JSON.stringify(header)}`, EXIT.INTEGRITY_MISMATCH, { code: 'GIT_TREE_MALFORMED' });
    }
    const pathBytes = record.subarray(tab + 1);
    let filePath;
    try {
      filePath = new TextDecoder('utf-8', { fatal: true }).decode(pathBytes);
    } catch {
      throw new InstallError(
        `git tree path is not canonical UTF-8 (hex prefix ${pathBytes.toString('hex').slice(0, 80)})`,
        EXIT.INTEGRITY_MISMATCH,
        { code: 'GIT_PATH_ENCODING', fix: 'rename the repository entry to a valid UTF-8 path before installing' }
      );
    }
    if (!Buffer.from(filePath, 'utf8').equals(pathBytes)) {
      throw new InstallError('git tree path does not round-trip as canonical UTF-8', EXIT.INTEGRITY_MISMATCH, { code: 'GIT_PATH_ENCODING' });
    }
    const [, mode, type, , sizeText] = match;
    if (mode === '120000' || type !== 'blob') {
      throw new InstallError(
        `git tree entry ${JSON.stringify(filePath)} has unsupported mode/type ${mode} ${type}`,
        EXIT.INTEGRITY_MISMATCH,
        { code: 'CONTAINMENT' }
      );
    }
    if (sizeText === '-') {
      throw new InstallError(
        `git tree entry ${JSON.stringify(filePath)} has no verifiable blob size`,
        EXIT.INTEGRITY_MISMATCH,
        { code: 'GIT_BUDGET_UNVERIFIABLE' }
      );
    }
    const bytes = BigInt(sizeText);
    if (bytes > BigInt(BUDGETS.max_single_file_bytes)) {
      throw new InstallError(
        `git tree entry ${JSON.stringify(filePath)} is ${bytes} bytes, over the single-file budget of ${BUDGETS.max_single_file_bytes}`,
        EXIT.INTEGRITY_MISMATCH,
        { code: 'GIT_BUDGET_EXCEEDED' }
      );
    }
    totalBytes += bytes;
    paths.push({ path: filePath, content: '' });
  }
  if (totalBytes > BigInt(BUDGETS.max_total_bytes)) {
    throw new InstallError(
      `git tree totals ${totalBytes} bytes, over the budget of ${BUDGETS.max_total_bytes}`,
      EXIT.INTEGRITY_MISMATCH,
      { code: 'GIT_BUDGET_EXCEEDED' }
    );
  }
  const { problems } = validateFileList(paths);
  if (problems.length > 0) {
    throw new InstallError(`git tree containment failed:\n  · ${problems.join('\n  · ')}`, EXIT.INTEGRITY_MISMATCH, { code: 'CONTAINMENT' });
  }
  // Git's own object IDs may be SHA-1 or SHA-256. Receipts use one stable
  // algorithm over the exact inspected tree representation so `tree_hash`
  // always means a computed claim, never a placeholder.
  return `sha256:${createHash('sha256').update(stdout).digest('hex')}`;
}

async function normalizeGitFileModes(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === '.git') continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) await normalizeGitFileModes(file);
    else if (entry.isFile()) await chmod(file, 0o644);
  }
}

function pinnedObjectDefinitelyMissing(err, commit) {
  const diagnostic = `${err?.stderr ?? ''}\n${err?.message ?? ''}`.toLowerCase();
  // `not our ref <oid>` is the server/upload-pack's positive statement that
  // the requested immutable object is unavailable. Authentication, transport,
  // timeout, local-tool, and repository-access failures prove no such thing.
  return diagnostic.includes(`not our ref ${commit.toLowerCase()}`);
}

async function acquireGit({ slug, anchor, stagingDir, root = '.', allowIntegrityMismatch = false, dryRun = false }) {
  if (!anchor?.git_url) {
    throw new InstallError(`registry.yaml has no git_url for ${slug} — the git rung cannot answer`, EXIT.CALLER_ERROR, { fix: 'constructs list --json    # what the registry knows' });
  }
  const gitUrl = anchor.git_url;
  const supportedUrl =
    typeof gitUrl === 'string' &&
    gitUrl.length > 0 &&
    !gitUrl.startsWith('-') &&
    !CONTROL_BYTES_RE.test(gitUrl) &&
    (path.isAbsolute(gitUrl) ||
      /^[A-Za-z]:[\\/]/.test(gitUrl) ||
      /^(?:https|ssh|git|file):\/\//.test(gitUrl) ||
      /^[A-Za-z0-9._-]+@[A-Za-z0-9.-]+:[^\s]+$/.test(gitUrl));
  if (!supportedUrl) {
    throw new InstallError(
      `registry.yaml has an unsafe or unsupported git_url for ${slug}: ${JSON.stringify(gitUrl)}`,
      EXIT.INTEGRITY_MISMATCH,
      { code: 'UNSAFE_GIT_URL', fix: 'use an absolute local path, https://, ssh://, git://, file://, or user@host:path URL' }
    );
  }
  if (anchor.commit !== null && anchor.commit !== undefined && (typeof anchor.commit !== 'string' || !GIT_OBJECT_ID_RE.test(anchor.commit))) {
    throw new InstallError(
      `registry commit pin for ${slug} is not an immutable full Git object id: ${JSON.stringify(anchor.commit)}`,
      EXIT.INTEGRITY_MISMATCH,
      {
        code: 'ANCHOR_MALFORMED',
        fix: 'pin the registry entry to a lowercase 40-character SHA-1 or 64-character SHA-256 commit id; branches, tags, abbreviations, and uppercase hashes are mutable or ambiguous',
      }
    );
  }
  let head;
  if (anchor.commit) {
    await mkdir(stagingDir, { recursive: true });
    const objectFormat = anchor.commit.length === 64 ? 'sha256' : 'sha1';
    await run('git', ['init', '-q', `--object-format=${objectFormat}`, stagingDir], { timeoutMs: 15_000 });
    try {
      await run('git', ['-C', stagingDir, 'fetch', '-q', '--depth=1', '--filter=blob:none', '--no-tags', gitUrl, anchor.commit], { timeoutMs: 120_000 });
    } catch (err) {
      if (pinnedObjectDefinitelyMissing(err, anchor.commit)) {
        throw new InstallError(`registry pins ${slug} to ${anchor.commit}, which does not exist in ${anchor.git_url}`, EXIT.INTEGRITY_MISMATCH, { code: 'ANCHOR_MISMATCH' });
      }
      throw new InstallError(
        `could not verify registry-pinned commit ${anchor.commit} from ${anchor.git_url}: ${err?.message ?? err}`,
        EXIT.TOOL_FAILURE,
        {
          code: 'GIT_FETCH_FAILED',
          fix: 'restore Git, authentication, network, or repository access, then retry without changing the trust anchor',
        }
      );
    }
    head = anchor.commit;
  } else {
    await run(
      'git',
      ['clone', '-q', '--no-checkout', '--depth=1', '--filter=blob:none', '--no-tags', '--', gitUrl, stagingDir],
      { timeoutMs: 120_000 }
    );
    const resolved = await run('git', ['-C', stagingDir, 'rev-parse', 'HEAD'], { timeoutMs: 15_000 });
    head = resolved.stdout.trim();
  }
  const inspectedTreeHash = await inspectGitTree(stagingDir, head);
  let tofu = null;
  // The anchor a successful landing WOULD persist. A --dry-run must never mutate
  // trust state (review pass 1), so nothing is written from inside acquisition.
  let pendingAnchor = null;
  // Set when an --allow-integrity-mismatch rotated an existing pin. An override
  // that leaves no trace in the receipt is not forensics, it is a rumour (audit).
  let rotatedFrom = null;
  if (anchor.commit) {
    // T3.3: the exact tracked commit was fetched and inspected above.
  } else {
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
      tofu = head;
      pendingAnchor = head; // persisted only on a successful, non-dry-run landing
      rotatedFrom = pinned.commit; // an override happened: the receipt MUST say so (audit)
    } else if (pinned) {
      tofu = pinned.commit;
    } else {
      tofu = head;
      pendingAnchor = head;
      process.stderr.write(
        dryRun
          ? `notice: DRY RUN — ${slug} would be pinned first-seen:${head.slice(0, 12)} (nothing written)\n`
          : `notice: registry.yaml records no commit for ${slug} — first fetch is trust-on-first-use; pinning first-seen:${head.slice(0, 12)} (later installs must match it)\n`
      );
    }
  }
  await run('git', ['-C', stagingDir, 'checkout', '-q', '--detach', head], { timeoutMs: 30_000 });
  try {
    await readFile(path.join(stagingDir, 'construct.yaml'), 'utf8');
  } catch {
    throw new InstallError(`${anchor.git_url} has no construct.yaml at its root — not a construct`, EXIT.INTEGRITY_MISMATCH, { code: 'NOT_A_CONSTRUCT' });
  }
  await assertNoSymlinks(stagingDir);
  await normalizeGitFileModes(stagingDir);
  await rm(path.join(stagingDir, '.git'), { recursive: true, force: true });
  return { rung: 'registry-git', head, treeHash: inspectedTreeHash, tofu: tofu !== null, pendingAnchor, rotatedFrom };
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

  // NOT .catch(() => null): a registry that exists but cannot be validated must
  // fail closed, and readRegistryAnchor throws exactly then (review pass 1).
  const anchor = await readRegistryAnchor(slug, path.join(root, registryFile));
  const dryRunRoot = dryRun ? await mkdtemp(path.join(os.tmpdir(), 'constructs-dry-run-')) : null;
  const parent = dryRunRoot ?? packsParent(root);
  if (!dryRun) await mkdir(parent, { recursive: true });
  const stagingDir = path.join(parent, `.staging-${slug}-${process.pid}`);

  const executeInstall = async () => {
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
        gitInfo = await acquireGit({ slug, anchor, stagingDir: packStage, root, allowIntegrityMismatch, dryRun });
        acquisition = { rung: 'registry-git', files: null, manifest: null, version: null, attestation: null, declaredHash: null };
        computedHash = gitInfo.treeHash;
        // A rotated TOFU pin IS an integrity override — the receipt must say so, and
        // must carry the operator's reason. Recording it as a plain `verified` install
        // would erase the only trace of the act (audit).
        if (gitInfo.rotatedFrom) outcome = 'hash-overridden';
        if (!dryRun) {
          // The git rung leaves the SAME pack marker as the file-list rung — without
          // it, a git-installed pack is "unmanaged" to its own tool and can never be
          // updated (found by the T3.2b TOFU fixture).
          await writeFile(
            path.join(packStage, '.construct-meta.json'),
            JSON.stringify({ slug, version: null, source_type: 'git', commit: gitInfo.head, tree_hash: computedHash, installed_at: nowIso() }, null, 2)
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
          tree_hash: computedHash,
          outcome,
          anchor: gitInfo
            ? gitInfo.rotatedFrom
              ? `first-seen:${gitInfo.head} (rotated from ${gitInfo.rotatedFrom})`
              : gitInfo.tofu
                ? `first-seen:${gitInfo.head}`
                : `registry-commit:${gitInfo.head}`
            : anchorLabel,
          ...(allowIntegrityMismatch && outcome === 'hash-overridden' ? { override_reason: reason.trim() } : {}),
          ...(typeof keyId === 'string' ? { key_id: keyId } : {}),
        },
      };

      const schema = await installReceiptSchema();
      for (const candidate of [
        receiptPayload,
        installTransactionPayload(receiptPayload, 'prepared'),
        installTransactionPayload(receiptPayload, 'committed'),
        installTransactionPayload(receiptPayload, 'aborted'),
        installTransactionPayload(receiptPayload, 'rolled_back'),
        installTransactionPayload(receiptPayload, 'rollback_failed'),
      ]) {
        const { valid, errors } = validateSchema(schema, candidate);
        if (!valid) throw new InstallError(`install receipt failed its own schema: ${errors.join('; ')}`, EXIT.TOOL_FAILURE);
      }

      if (dryRun) {
        return { mode: 'dry-run', slug, payload: receiptPayload };
      }

      // Ordering IS the transaction. Refuse first, write an explicitly prepared
      // receipt, atomically land the pack, then publish the trust anchor and
      // committed receipt. No durable fact claims completion before reality does.
      await assertReplaceable(root, slug);
      const receiptsDir = path.join(root, 'grimoires', 'loa', 'territory', 'receipts');
      await mkdir(receiptsDir, { recursive: true });
      const transaction = await commitInstallTransaction({
        root,
        slug,
        stage: path.join(stagingDir, 'pack'),
        receiptsDir,
        receiptPayload,
        pendingAnchor: gitInfo?.pendingAnchor ?? null,
      });

      return {
        mode: 'installed',
        slug,
        path: transaction.landed,
        receipt_path: transaction.committedRecord.receipt_path,
        prepared_receipt_path: transaction.preparedRecord.receipt_path,
        payload: transaction.committedPayload,
      };
    } finally {
      await rm(stagingDir, { recursive: true, force: true });
    }
  };

  if (dryRun) {
    try {
      return await executeInstall();
    } finally {
      await rm(dryRunRoot, { recursive: true, force: true });
    }
  }
  return withReceiptLock(parent, executeInstall);
}

function nowIso() {
  const epoch = process.env.SOURCE_DATE_EPOCH;
  const d = epoch !== undefined && /^[0-9]{1,12}$/.test(epoch) ? new Date(Number(epoch) * 1000) : new Date();
  return d.toISOString().replace(/\.[0-9]{3}Z$/, 'Z');
}

export default { install, validateFileList, treeHash, verifyAttestation, attestationBytes, readRegistryAnchor, commitInstallTransaction, BUDGETS, InstallError };
