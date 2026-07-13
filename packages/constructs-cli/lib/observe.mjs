// The afferent nerve (T3.5 · PRD FR-14 · SDD §2.6).
//
// A governed observation is the falsifiable G-5a artifact: schema-conformant,
// evidence-citing, referencing a DECLARED outcome, appended to a per-actor JSONL
// segment in the REGION's own tree — one writer per file, so appends are always
// local and cross-clone merges always clean (the T2.6 record model).
//
// The envelope write is SHELLED to the region's own audit lib, never
// reimplemented. primitive_id rides L5 with event_type territory.observe: the
// envelope schema's enum has no TERRITORY primitive yet (filed upstream,
// bd-jtns); L5 (cross-repo status) is the nearest honest neighbor and
// verify-chain governs the segment either way.

import { readFile, mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { readManifest } from './territory.mjs';
import { probeLoaMount, assertMounted, observationsSegmentPath, StationError } from './station.mjs';
import { validate as validateSchema } from './vendor/schema-subset.mjs';
import { run } from './exec.mjs';
import { EXIT } from './contract.mjs';

let cachedSchema = null;
export async function observationSchema() {
  if (cachedSchema) return cachedSchema;
  const file = new URL('../schemas/observation.schema.json', import.meta.url);
  cachedSchema = JSON.parse(await readFile(file, 'utf8'));
  return cachedSchema;
}

export async function observe({
  region,
  outcome,
  construct,
  evidence = [],
  body,
  confidence = 0.5,
  regionRoot = '.',
  dryRun = false,
} = {}) {
  // The door (BB DR-002): governed records flow through the region's audit substrate.
  assertMounted(await probeLoaMount(regionRoot), regionRoot);

  const manifest = await readManifest(regionRoot);
  if (!manifest) {
    throw new StationError(
      `region at ${regionRoot} has no territory manifest — there are no declared outcomes to observe against`,
      EXIT.CALLER_ERROR,
      { fix: 'author grimoires/territory.yaml first (constructs robot-docs guide)' }
    );
  }
  if (manifest.region !== region) {
    throw new StationError(
      `the manifest in this tree belongs to ${JSON.stringify(manifest.region)}, not ${JSON.stringify(region)} — an observation is recorded in the region's OWN tree`,
      EXIT.REFUSED,
      { fix: `run this inside the ${region} clone` }
    );
  }
  const declared = (manifest.outcomes ?? []).map((o) => o.id);
  if (!declared.includes(outcome)) {
    throw new StationError(
      `outcome ${JSON.stringify(outcome)} is not declared by ${region} — an observation about an undeclared outcome answers to nothing`,
      EXIT.CALLER_ERROR,
      { fix: `declared outcomes: ${declared.join(', ') || '(none)'}` }
    );
  }

  const actor = os.userInfo().username;
  const payload = {
    region,
    outcome_id: outcome,
    construct,
    evidence: Array.isArray(evidence) ? evidence : [evidence],
    body,
    confidence: Number(confidence),
    actor,
  };
  const schema = await observationSchema();
  const { valid, errors } = validateSchema(schema, payload);
  if (!valid) {
    throw new StationError(`observation payload is invalid`, EXIT.CALLER_ERROR, { details: errors });
  }

  const segment = observationsSegmentPath(regionRoot, actor);
  if (dryRun) return { mode: 'dry-run', segment, payload };

  await mkdir(path.dirname(segment), { recursive: true });
  const script = path.join(regionRoot, '.claude', 'scripts', 'audit-envelope.sh');
  const res = await run('bash', [script, 'emit', 'L5', 'territory.observe', JSON.stringify(payload), segment], {
    cwd: regionRoot,
    timeoutMs: 30_000,
    allowNonZero: true,
  });
  if (res.exitCode !== 0) {
    throw new StationError(
      `the audit substrate refused the observation: ${res.stderr.trim().slice(0, 300)}`,
      EXIT.TOOL_FAILURE,
      { fix: 'the envelope write goes through the region\'s own audit-envelope.sh — fix what it reports' }
    );
  }
  return { mode: 'recorded', segment, payload };
}

/**
 * The G-5a acceptance read: verify every observation segment's chain via the
 * region's own validator and schema-validate every payload row.
 * `chainMode: 'chain-only'` maps to LOA_AUDIT_VERIFY_SIGS=0 — for regions whose
 * trust store has a signature cutoff but no writer keys yet (this repo's state;
 * bd-jtns), the hash chain still governs while key bootstrap is pending.
 */
export async function verifyObservations({ regionRoot = '.', chainMode = 'full' } = {}) {
  const dir = path.join(regionRoot, 'grimoires', 'loa', 'territory', 'observations');
  const { readdir } = await import('node:fs/promises');
  let files = [];
  try {
    files = (await readdir(dir)).filter((f) => f.endsWith('.jsonl'));
  } catch {
    return { segments: [], total_rows: 0 };
  }
  const script = path.join(regionRoot, '.claude', 'scripts', 'audit-envelope.sh');
  const schema = await observationSchema();
  const segments = [];
  let totalRows = 0;
  for (const f of files.sort()) {
    const file = path.join(dir, f);
    const env = chainMode === 'chain-only' ? { LOA_AUDIT_VERIFY_SIGS: '0' } : {};
    const res = await run('bash', [script, 'verify-chain', file], { cwd: regionRoot, timeoutMs: 30_000, allowNonZero: true, env });
    const rows = [];
    const problems = [];
    for (const line of (await readFile(file, 'utf8')).split('\n')) {
      const text = line.trim();
      if (!text || text.startsWith('[')) continue;
      let entry;
      try {
        entry = JSON.parse(text);
      } catch {
        problems.push('unparseable row');
        continue;
      }
      const { valid, errors } = validateSchema(schema, entry.payload ?? {});
      if (!valid) problems.push(...errors);
      else rows.push(entry.payload);
    }
    totalRows += rows.length;
    segments.push({ path: file, chain: res.exitCode === 0 ? 'verified' : 'unverified', rows, problems });
  }
  return { segments, total_rows: totalRows };
}

export default { observe, verifyObservations, observationSchema };
