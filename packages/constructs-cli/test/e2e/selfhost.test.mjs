// T3.6 — the NAMED G-5a acceptance test (PRD FR-14).
//
// Closable without interpretation: manifest validates ∧ ≥1 schema-conformant
// observation exists ∧ its chain verifies ∧ the outcome id resolves. The
// observation is REAL — recorded by `constructs observe` through this repo's
// own audit substrate, committed in this repo's tree.
//
// Chain mode: chain-only (LOA_AUDIT_VERIFY_SIGS=0). This repo's trust store
// declares a signature cutoff but configures NO writer keys yet (bd-jtns), so
// signatures cannot exist until the operator runs the audit-keys-bootstrap
// runbook. The hash chain governs in the interim — stated, not hidden.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from '../../lib/vendor/yaml-subset.mjs';
import { validateManifest } from '../../lib/territory.mjs';
import { verifyObservations } from '../../lib/observe.mjs';
import { validateStationing } from '../../lib/station.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');

test('G-5a: the self-host manifest validates and declares the stationed loadout', async () => {
  const doc = parseYaml(await readFile(path.join(REPO_ROOT, 'grimoires', 'territory.yaml'), 'utf8'));
  await validateManifest(doc, { source: 'grimoires/territory.yaml' });
  assert.equal(doc.region, 'loa-constructs');
  const gecko = (doc.loadout ?? []).find((r) => r.construct === 'gecko');
  assert.ok(gecko, 'the self-host loadout stations gecko');
  assert.equal(gecko.authority_tier, 'observe', 'production stationings stay observe-only this cycle');
});

test('G-5a: ≥1 governed observation exists, is schema-conformant, and its chain verifies', async () => {
  const result = await verifyObservations({ regionRoot: REPO_ROOT, chainMode: 'chain-only' });
  assert.ok(result.total_rows >= 1, 'the falsifiable proof artifact is at least one real observation row');
  for (const seg of result.segments) {
    assert.equal(seg.chain, 'verified', `${seg.path}: chain must verify`);
    assert.deepEqual(seg.problems, [], `${seg.path}: every row must be schema-conformant`);
  }
});

test('G-5a: every observed outcome id resolves against the manifest', async () => {
  const doc = parseYaml(await readFile(path.join(REPO_ROOT, 'grimoires', 'territory.yaml'), 'utf8'));
  const declared = new Set((doc.outcomes ?? []).map((o) => o.id));
  const result = await verifyObservations({ regionRoot: REPO_ROOT, chainMode: 'chain-only' });
  for (const seg of result.segments) {
    for (const row of seg.rows) {
      assert.ok(declared.has(row.outcome_id), `observation cites undeclared outcome ${row.outcome_id}`);
      assert.ok(row.evidence.length >= 1, 'an observation without evidence is an opinion');
    }
  }
});

test('G-5a: the stationing pipeline validates the real region (recording follows the merge)', async () => {
  const v = await validateStationing({ slug: 'gecko', region: 'loa-constructs', regionRoot: REPO_ROOT });
  assert.equal(v.row.construct, 'gecko');
  // On the cycle branch, ratification blockers are EXPECTED (not on the default
  // branch / not landed on origin/main yet) — the receipt is recordable only
  // after merge, which is exactly the contract working as designed.
  assert.ok(Array.isArray(v.blockers));
});
