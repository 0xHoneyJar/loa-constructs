// Stationing: validate + record, NEVER grant (T2.5–T2.8).
//
// The gate is the region's git permissions. A stationing exists when the ratified
// manifest edit is committed on the region's DEFAULT branch — writability is not
// ratification (FL-SDD CRITICAL). This module verifies that fact, snapshots every
// authorization input it verified, re-verifies ALL of them immediately before the
// write (TOCTOU), and records one content-addressed receipt file into the region's
// own tree. It holds no keys and grants no authority.
//
// Record model — one file per record (the L6 pattern, FL-SPRINT CRITICAL ×2):
// each receipt is its own file named by the SHA-256 of its canonical payload.
// No shared JSONL, no cross-record chain — two divergent clones adding receipts
// merge conflict-free at the filesystem level, and a same-content collision is
// idempotent by construction. Ordering is the ts field, never chain position.

import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, rename, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { readManifest } from './territory.mjs';
import { run } from './exec.mjs';
import { validate as validateSchema } from './vendor/schema-subset.mjs';
import { EXIT } from './contract.mjs';
import {
  gitFacts as inspectGitFacts,
  ratificationBlockers,
  TERRITORY_MANIFEST_REL,
} from './ratification.mjs';

export class StationError extends Error {
  constructor(message, exitCode = EXIT.REFUSED, { details = [], fix = null } = {}) {
    super(message);
    this.name = 'StationError';
    this.exitCode = exitCode;
    this.details = details;
    this.fix = fix;
  }
}

let cachedReceiptSchema = null;
async function receiptSchema() {
  if (cachedReceiptSchema) return cachedReceiptSchema;
  const file = new URL('../schemas/receipt.schema.json', import.meta.url);
  cachedReceiptSchema = JSON.parse(await readFile(file, 'utf8'));
  return cachedReceiptSchema;
}

let cachedInstallReceiptSchema = null;
export async function installReceiptSchema() {
  if (cachedInstallReceiptSchema) return cachedInstallReceiptSchema;
  const file = new URL('../schemas/install-receipt.schema.json', import.meta.url);
  cachedInstallReceiptSchema = JSON.parse(await readFile(file, 'utf8'));
  return cachedInstallReceiptSchema;
}

// ── canonical bytes ───────────────────────────────────────────────────────────
//
// The receipt's address is the hash of these bytes, so they must be identical on
// every machine that ever re-derives them: keys sorted recursively, no whitespace,
// integers only (floats canonicalize differently across serializers — refuse them).

function sortValue(value, at = '$') {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isInteger(value)) {
      throw new StationError(`canonicalize: non-integer number at ${at} — floats are not canonical-safe`, EXIT.TOOL_FAILURE);
    }
    return value;
  }
  if (Array.isArray(value)) return value.map((v, i) => sortValue(v, `${at}[${i}]`));
  if (typeof value === 'object') {
    const sorted = {};
    for (const key of Object.keys(value).sort()) {
      if (value[key] === undefined) continue;
      sorted[key] = sortValue(value[key], `${at}.${key}`);
    }
    return sorted;
  }
  throw new StationError(`canonicalize: unsupported value type ${typeof value} at ${at}`, EXIT.TOOL_FAILURE);
}

export function canonicalize(payload) {
  return JSON.stringify(sortValue(payload));
}

function sha256(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function nowIso() {
  const epoch = process.env.SOURCE_DATE_EPOCH;
  const d = epoch !== undefined && /^[0-9]+$/.test(epoch) ? new Date(Number(epoch) * 1000) : new Date();
  return d.toISOString().replace(/\.[0-9]{3}Z$/, 'Z');
}

// ── T2.7 · the Loa-mount precondition ─────────────────────────────────────────
//
// Stationing and observing write governed records THROUGH the region's own audit
// substrate — checked at the door, never discovered at the write (BB DR-002).

const AUDIT_SUBSTRATE = ['.claude/scripts/audit-envelope.sh', 'lib/jcs.sh'];

export async function probeLoaMount(regionRoot = '.') {
  const missing = [];
  for (const rel of AUDIT_SUBSTRATE) {
    try {
      await stat(path.join(regionRoot, rel));
    } catch {
      missing.push(rel);
    }
  }
  return { mounted: missing.length === 0, missing };
}

export function assertMounted(probe, regionRoot) {
  if (probe.mounted) return;
  throw new StationError(
    `region at ${regionRoot} is not Loa-mounted — the audit substrate is missing (${probe.missing.join(', ')}). Stationing records and governed observations flow through that substrate; there is no hand-rolled fallback.`,
    EXIT.REFUSED,
    { fix: 'run mount-loa.sh in the region first (it installs .claude/ and the audit lib), then retry' }
  );
}

// ── git facts ─────────────────────────────────────────────────────────────────

// ── T2.6 · the authorization snapshot ─────────────────────────────────────────
//
// Snapshot the FULL input set at validation — manifest hash, HEAD, resolved default
// branch, L4 ledger tip — and re-verify ALL of them immediately before the write.
// Manifest-hash-only rechecking left HEAD/branch/ledger racing (FL-SPRINT HIGH).

const MANIFEST_REL = TERRITORY_MANIFEST_REL;
const LEDGER_REL = path.join('.run', 'trust-ledger.jsonl');

export async function snapshotAuthInputs(regionRoot = '.', { manifestRaw = null } = {}) {
  // When the caller already parsed the manifest, it passes the EXACT bytes it
  // parsed — hashing a second read could describe different bytes than the
  // loadout row that was validated (HIGH-2, review pass 1).
  const manifestBytes = manifestRaw ?? (await readFile(path.join(regionRoot, MANIFEST_REL), 'utf8'));
  let ledgerTip = 'absent';
  try {
    const ledgerBytes = await readFile(path.join(regionRoot, LEDGER_REL), 'utf8');
    ledgerTip = `sha256:${sha256(ledgerBytes)}`;
  } catch {
    // no ledger yet — 'absent' is itself part of the snapshot
  }
  let facts;
  try {
    facts = await inspectGitFacts(regionRoot, MANIFEST_REL);
  } catch (error) {
    throw new StationError(error.message, error.exitCode ?? EXIT.CALLER_ERROR, { fix: error.fix ?? null });
  }
  return {
    manifest_hash: `sha256:${sha256(manifestBytes)}`,
    head: facts.head,
    default_branch: facts.default_branch,
    l4_ledger_tip: ledgerTip,
    // The anchor is an authorization input like the rest (review pass 2): a
    // remote appearing/disappearing between validate and write must void the
    // validation, and the receipt must never attest an anchor the write-time
    // check did not re-observe.
    anchor: facts.anchor,
    _facts: facts,
  };
}

function snapshotChanged(a, b) {
  const fields = ['manifest_hash', 'head', 'default_branch', 'l4_ledger_tip', 'anchor'];
  return fields.filter((f) => a[f] !== b[f]);
}

// ── T2.5 · validate ───────────────────────────────────────────────────────────

export async function validateStationing({ slug, region, regionRoot = '.' }) {
  // The door, before anything else (T2.7).
  assertMounted(await probeLoaMount(regionRoot), regionRoot);

  const manifest = await readManifest(regionRoot);
  if (!manifest) {
    throw new StationError(
      `region at ${regionRoot} has no territory manifest — nothing declares what this stationing would answer for`,
      EXIT.CALLER_ERROR,
      { fix: `author ${path.join(regionRoot, MANIFEST_REL)} (schema: packages/constructs-cli/schemas/territory.schema.json), commit it, then retry` }
    );
  }

  // Foreign-manifest refusal: this CLI never authors another region's manifest.
  if (manifest.region !== region) {
    throw new StationError(
      `the manifest in this tree belongs to region ${JSON.stringify(manifest.region)}, not ${JSON.stringify(region)} — recording here would be authoring a foreign region's territory`,
      EXIT.REFUSED,
      { fix: `run this inside the ${region} clone, or use --region ${manifest.region} if that is what you meant` }
    );
  }

  const row = (manifest.loadout ?? []).find((r) => r.construct === slug);
  if (!row) {
    throw new StationError(
      `${JSON.stringify(slug)} is not in ${region}'s loadout — there is no ratified manifest edit to record. The CLI records stationings; it never creates them`,
      EXIT.CALLER_ERROR,
      { fix: `add a loadout row for ${slug} to ${MANIFEST_REL}, commit it on the default branch, then retry` }
    );
  }

  const snapshot = await snapshotAuthInputs(regionRoot, { manifestRaw: manifest._raw ?? null });
  const facts = snapshot._facts;

  if (facts.default_branch === null) {
    throw new StationError(
      `cannot resolve ${region}'s default branch (no origin/HEAD, no main, no master) — "committed on the default branch" is unverifiable here`,
      EXIT.CALLER_ERROR,
      { fix: 'git remote set-head origin --auto    # or create a main branch' }
    );
  }

  // Soft blockers: the act is legible but not (yet) ratified. --dry-run reports
  // them; a real write refuses on them.
  const blockers = ratificationBlockers(facts);

  return {
    slug,
    region,
    regionRoot,
    row,
    manifest,
    ratified: blockers.length === 0,
    blockers,
    snapshot,
    actor: os.userInfo().username,
  };
}

// ── T2.6 · record ─────────────────────────────────────────────────────────────

const RECEIPTS_REL = path.join('grimoires', 'loa', 'territory', 'receipts');

// Same-clone concurrency guard (divergent clones need no lock — they write
// different files and union-merge). mkdir is atomic on every platform we run on.
export async function withReceiptLock(receiptsDir, fn) {
  const lockDir = path.join(receiptsDir, '.lock');
  const deadline = Date.now() + 5_000;
  for (;;) {
    try {
      await mkdir(lockDir);
      break;
    } catch {
      try {
        const s = await stat(lockDir);
        if (Date.now() - s.mtimeMs > 30_000) {
          await rm(lockDir, { recursive: true, force: true });
          continue; // stale lock from a dead process — steal it
        }
      } catch {
        continue; // lock vanished between attempts — retry immediately
      }
      if (Date.now() > deadline) {
        throw new StationError(
          `another stationing in this clone holds the receipts lock (${lockDir})`,
          EXIT.TOOL_FAILURE,
          { fix: 'retry in a few seconds; if no other process is running, remove the stale .lock directory' }
        );
      }
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  try {
    return await fn();
  } finally {
    await rm(lockDir, { recursive: true, force: true });
  }
}

/**
 * The content-addressed record writer — shared by stationing and install
 * receipts ("install receipts reuse the stationing receipt writer"). The
 * caller holds the lock and has already re-verified whatever authorized
 * the write; this only turns a payload into its own address.
 */
export async function writeRecordUnlocked(receiptsDir, payload) {
  const canonical = canonicalize(payload);
  const hash = sha256(canonical);
  const file = path.join(receiptsDir, `${hash}.json`);

  try {
    const existing = await readFile(file, 'utf8');
    if (existing === `${canonical}\n`) {
      return { receipt_path: file, receipt_hash: `sha256:${hash}`, payload, idempotent: true };
    }
    throw new StationError(`receipt ${file} exists with different content — refusing to overwrite`, EXIT.INTEGRITY_MISMATCH);
  } catch (err) {
    if (err instanceof StationError) throw err;
    if (err?.code !== 'ENOENT') {
      throw new StationError(
        `cannot inspect receipt ${file}: ${err?.message ?? err}`,
        EXIT.TOOL_FAILURE,
        { fix: 'fix the receipt path or filesystem permissions, then retry' }
      );
    }
    // ENOENT — the normal path: stage in the same directory, land by atomic rename.
  }

  const tmp = path.join(receiptsDir, `.${hash}.tmp`);
  await writeFile(tmp, `${canonical}\n`, 'utf8');
  await rename(tmp, file);
  return { receipt_path: file, receipt_hash: `sha256:${hash}`, payload, idempotent: false };
}

export function buildReceiptPayload(validation, { kind = 'station' } = {}) {
  const { row, region, slug, snapshot, actor } = validation;
  return {
    record_version: '1.0',
    kind,
    ts: nowIso(),
    actor,
    region,
    construct: slug,
    outcomes: [...(row.outcomes ?? [])].sort(),
    // The CEILING at recording time. The earned tier lives in the L4 ledger and is
    // never copied here — a receipt must not fossilize authority (PRD FR-8 r2).
    authority_tier: row.authority_tier ?? 'observe',
    manifest_hash: snapshot.manifest_hash,
    verification: {
      head: snapshot.head,
      default_branch: snapshot.default_branch,
      l4_ledger_tip: snapshot.l4_ledger_tip,
      // 'origin/<branch>' when the act is anchored to (contained in) the remote
      // default branch; 'local-only' ONLY when no origin remote is configured —
      // stated, never silently equated (HIGH-1; equality-checked at write time
      // via the snapshot, review pass 2).
      anchor: snapshot.anchor,
    },
  };
}

export async function recordStationing(validation) {
  if (!validation.ratified) {
    throw new StationError(
      `stationing ${validation.slug} over ${validation.region} is not ratified:\n  · ${validation.blockers.join('\n  · ')}`,
      EXIT.REFUSED,
      { fix: `commit the manifest edit on ${JSON.stringify(validation.snapshot.default_branch ?? 'the default branch')}, or use --dry-run to preview` }
    );
  }

  const payload = buildReceiptPayload(validation);

  // Self-check against our own published schema before anything touches disk.
  const schema = await receiptSchema();
  const { valid, errors } = validateSchema(schema, payload);
  if (!valid) {
    throw new StationError(`receipt payload failed its own schema: ${errors.join('; ')}`, EXIT.TOOL_FAILURE);
  }

  const receiptsDir = path.join(validation.regionRoot, RECEIPTS_REL);
  await mkdir(receiptsDir, { recursive: true });

  return withReceiptLock(receiptsDir, async () => {
    // TOCTOU: every snapshotted authorization input must still hold, not just the
    // manifest hash. A push, a branch flip, or a ledger append between validate and
    // write voids the validation — refuse, never write on stale authority.
    const fresh = await snapshotAuthInputs(validation.regionRoot);
    const changed = snapshotChanged(validation.snapshot, fresh);
    if (changed.length > 0) {
      throw new StationError(
        `authorization inputs changed between validate and write (${changed.join(', ')}) — the validation no longer describes this tree`,
        EXIT.REFUSED,
        { fix: 're-run the command; it will validate against the current state' }
      );
    }
    // And the FULL predicate again, not just the four hashes: a same-commit
    // branch switch leaves every hash identical while un-ratifying the act
    // (HIGH-2, review pass 1).
    const staleBlockers = ratificationBlockers(fresh._facts);
    if (staleBlockers.length > 0) {
      throw new StationError(
        `ratification no longer holds at write time:\n  · ${staleBlockers.join('\n  · ')}`,
        EXIT.REFUSED,
        { fix: 're-run the command from the ratified state (clean manifest, committed on the default branch)' }
      );
    }

    return writeRecordUnlocked(receiptsDir, payload);
  });
}

/** One-shot: validate, then either report (--dry-run) or record. */
export async function station({ slug, region, regionRoot = '.', dryRun = false }) {
  const validation = await validateStationing({ slug, region, regionRoot });
  const authority = await authorityDisplay({
    regionRoot,
    region,
    row: validation.row,
  });

  if (dryRun) {
    const payload = buildReceiptPayload(validation);
    return {
      mode: 'dry-run',
      ratified: validation.ratified,
      blockers: validation.blockers,
      would_write: path.join(regionRoot, RECEIPTS_REL, `${sha256(canonicalize(payload))}.json`),
      payload,
      authority,
    };
  }

  const record = await recordStationing(validation);
  return { mode: 'recorded', ...record, authority };
}

// ── receipt verification ──────────────────────────────────────────────────────

/** A receipt verifies STANDALONE: its address re-derives from its bytes. */
export async function verifyReceipt(filePath) {
  const problems = [];
  let payload = null;
  try {
    const raw = await readFile(filePath, 'utf8');
    payload = JSON.parse(raw);
    const rederived = sha256(canonicalize(payload));
    const claimed = path.basename(filePath, '.json');
    if (rederived !== claimed) {
      problems.push(`content-address mismatch: file is named ${claimed} but its canonical payload hashes to ${rederived}`);
    }
    const schema = payload?.kind === 'install' ? await installReceiptSchema() : await receiptSchema();
    const { valid, errors } = validateSchema(schema, payload);
    if (!valid) problems.push(...errors.map((e) => `schema: ${e}`));
  } catch (err) {
    problems.push(`unreadable receipt: ${err?.message ?? err}`);
  }
  return { valid: problems.length === 0, problems, payload };
}

// ── observations (the T2.6 segmentation rule; the writer lands in T3.5) ───────
//
// One writer per file: observations append to per-actor JSONL segments, so an
// append is always local and a cross-clone union merge is always clean.

export function observationsSegmentPath(regionRoot, actor) {
  const safe = String(actor).replace(/[^A-Za-z0-9._-]/g, '-');
  return path.join(regionRoot, 'grimoires', 'loa', 'territory', 'observations', `${safe}.jsonl`);
}

// ── T2.8 · L4 authority reads: verify-or-observe ──────────────────────────────
//
// The ledger is region-relative and read-only from here — grants stay in the
// graduated-trust skill. The chain is verified BY THE REGION'S OWN audit validator
// before any tier is displayed; an unverifiable chain renders `authority: unknown`
// and every consumer treats unknown as observe (FL-SDD CRITICAL). No verb acts on
// the earned tier beyond display this cycle.

export const TIER_ORDER = Object.freeze({ observe: 0, advise: 1, gate: 2 });

export function effectiveTier(earned, ceiling) {
  const ceil = TIER_ORDER[ceiling] ?? 0;
  const earn = TIER_ORDER[earned] ?? 0; // 'unknown' and anything unrecognized floor to observe
  const eff = Math.min(earn, ceil);
  return Object.keys(TIER_ORDER).find((k) => TIER_ORDER[k] === eff);
}

/** The (scope, capability, actor) convention for stationing grants. */
export function trustTriple(region, construct) {
  return { scope: region, capability: `station/${construct}`, actor: construct };
}

export async function readAuthority({ regionRoot = '.', region, construct }) {
  const ledger = path.join(regionRoot, LEDGER_REL);
  let raw;
  try {
    raw = await readFile(ledger, 'utf8');
  } catch {
    // No ledger is not an unverifiable ledger: nothing was ever granted, so the
    // earned tier is the birth tier.
    return { earned: 'observe', chain: 'absent', in_cooldown_until: null };
  }

  const auditScript = path.join(regionRoot, '.claude', 'scripts', 'audit-envelope.sh');
  let verified = false;
  try {
    const res = await run('bash', [auditScript, 'verify-chain', ledger], {
      cwd: regionRoot,
      timeoutMs: 20_000,
      allowNonZero: true,
    });
    verified = res.exitCode === 0;
  } catch {
    verified = false; // validator unreachable ⇒ chain unverifiable ⇒ observe
  }
  if (!verified) {
    return { earned: 'unknown', chain: 'unverified', in_cooldown_until: null };
  }

  const triple = trustTriple(region, construct);
  let earned = 'observe';
  let cooldown = null;
  for (const line of raw.split('\n')) {
    const text = line.trim();
    if (!text || text.startsWith('[')) continue; // seal markers
    let entry;
    try {
      entry = JSON.parse(text);
    } catch {
      continue; // the verifier accepted the chain; a stray line is not ours to judge
    }
    const p = entry.payload ?? {};
    if (p.scope !== triple.scope || p.capability !== triple.capability || p.actor !== triple.actor) continue;
    if (entry.event_type === 'trust.grant' || entry.event_type === 'trust.force_grant') {
      earned = p.to_tier ?? earned;
      cooldown = null;
    } else if (entry.event_type === 'trust.auto_drop') {
      earned = p.to_tier ?? earned;
      cooldown = p.cooldown_until ?? null;
    }
  }
  return { earned, chain: 'verified', in_cooldown_until: cooldown };
}

/** Ceiling vs earned vs effective, rendered separately — display only this cycle. */
export async function authorityDisplay({ regionRoot = '.', region, row }) {
  const ceiling = row.authority_tier ?? 'observe';
  const l4 = await readAuthority({ regionRoot, region, construct: row.construct });
  return {
    ceiling,
    earned: l4.earned,
    effective: effectiveTier(l4.earned, ceiling),
    chain: l4.chain,
    in_cooldown_until: l4.in_cooldown_until,
  };
}

export default {
  station,
  validateStationing,
  recordStationing,
  verifyReceipt,
  probeLoaMount,
  snapshotAuthInputs,
  readAuthority,
  authorityDisplay,
  effectiveTier,
  trustTriple,
  observationsSegmentPath,
  canonicalize,
  StationError,
  TIER_ORDER,
};
